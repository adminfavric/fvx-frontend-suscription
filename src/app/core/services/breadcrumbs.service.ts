import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import type { MenuItemDto, MenuSectionDto } from '../models/menu.model';
import { MenuService } from './menu.service';

/**
 * Modelo de un crumb. Replicamos la interfaz local en vez de importar
 * `PageBreadcrumb` para no acoplar este servicio core a un componente shared.
 */
export interface Breadcrumb {
  /** Texto fijo; usa `labelKey` si quieres traducción automática. */
  label?: string;
  labelKey?: string;
  /** Si se define, el crumb se renderiza como link clickable (`routerLink`). */
  link?: string;
}

/**
 * Auto-deriva las migas (breadcrumbs) a partir de la URL actual y el árbol
 * de menú que entrega el backend (`MenuService.sections()`).
 *
 * Reglas:
 * 1. Siempre arranca con `Home → /dashboard`.
 * 2. Si la URL corresponde 1:1 a un `MenuItem.route` → agrega el nombre del
 *    item como último crumb (página actual, no clickable).
 * 3. Si la URL es subruta (ej. `/users/42`) y el prefijo coincide con un
 *    `MenuItem.route` → agrega el nombre del item como link (padre).
 * 4. Páginas que NO viven en el menú (forbidden, server-error, /me/profile,
 *    etc.) caen al fallback "pretty URL segment" salvo que la página llame
 *    `override([...])` con su trail explícito.
 *
 * Para páginas de detalle, después de cargar el dato:
 * ```ts
 * this.breadcrumbs.append({ label: user.full_name });
 * ```
 * El append se limpia automáticamente en la siguiente navegación.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbsService {
  private readonly router = inject(Router);
  private readonly menu = inject(MenuService);

  /** Crumb extra al final del trail (ej. nombre del registro en una vista detalle). */
  private readonly tail = signal<Breadcrumb | null>(null);
  /** Override completo del trail (pisa la auto-derivación; útil para system pages). */
  private readonly override = signal<Breadcrumb[] | null>(null);
  /** URL actual sin querystring; refrescado por NavigationEnd. */
  private readonly currentUrl = signal<string>(this.normalizeUrl(this.router.url));

  /**
   * Trail final que consume el topbar. Computado a partir de `currentUrl`,
   * `menu.sections()`, `tail` y `override`. Reactivo: cualquier cambio en
   * los inputs re-emite automáticamente.
   */
  readonly trail = computed<Breadcrumb[]>(() => {
    const manual = this.override();
    if (manual) return manual;

    const url = this.currentUrl();
    const out: Breadcrumb[] = [
      { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    ];

    const located = this.locateInMenu(url);
    if (located) {
      const isExactMatch = located.item.route === url;
      out.push({
        label: located.item.name,
        // Si es match exacto → último crumb (no link). Si es subruta → link al padre.
        link: isExactMatch ? undefined : located.item.route,
      });
    } else if (url && url !== '/admin/dashboard') {
      // Fallback: el último segmento de la URL en formato legible.
      out.push({ label: this.prettifyUrlSegment(url) });
    }

    const t = this.tail();
    if (t) out.push(t);
    return out;
  });

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        // Al navegar limpiamos tail+override y refrescamos URL.
        this.tail.set(null);
        this.override.set(null);
        this.currentUrl.set(this.normalizeUrl((e as NavigationEnd).urlAfterRedirects));
      });
  }

  /**
   * Agrega un crumb extra al final del trail. Pensado para vistas detalle:
   * después de cargar el dato del registro, llamar con el nombre/título.
   * Se limpia en la siguiente navegación.
   */
  append(crumb: Breadcrumb): void {
    this.tail.set(crumb);
  }

  /**
   * Sobrescribe el trail completo. Útil para system pages no presentes en el
   * menú (forbidden, server-error, /me/profile). Se limpia al navegar.
   */
  setOverride(trail: Breadcrumb[] | null): void {
    this.override.set(trail);
  }

  private locateInMenu(
    url: string,
  ): { section: MenuSectionDto; item: MenuItemDto } | null {
    let best: { section: MenuSectionDto; item: MenuItemDto; len: number } | null = null;
    for (const section of this.menu.sections() ?? []) {
      for (const item of section.items ?? []) {
        if (!item.route) continue;
        if (item.route === url || url.startsWith(item.route + '/')) {
          // Match más largo gana (importante para rutas anidadas tipo /a y /a/b).
          if (!best || item.route.length > best.len) {
            best = { section, item, len: item.route.length };
          }
        }
      }
    }
    return best && { section: best.section, item: best.item };
  }

  private normalizeUrl(url: string): string {
    return (url.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  }

  private prettifyUrlSegment(url: string): string {
    const segments = url.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    if (!last) return '';
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/[-_]+/g, ' ');
  }
}
