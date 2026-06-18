import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

import type { FvxUiLang } from '../i18n/locale-storage';
import { AuthService } from '../services/auth.service';
import { MenuService } from '../services/menu.service';
import { ThemeService, type FvxThemeId } from '../services/theme.service';
import {
  keywordsForNavItem,
  labelKeyForMenuItem,
} from '../utils/nav-i18n.util';
import { normalizeNavRoute } from '../utils/nav-route.util';
import { COMMAND_SOURCES, type CommandItem, type CommandSource } from './command-item';

/**
 * Agrega comandos built-in (navegación basada en el menú API + acciones del shell)
 * con los registrados por features vía {@link provideCommands}. La paleta
 * (`CommandPaletteComponent`) llama a `list()` cada vez que abre.
 */
@Injectable({ providedIn: 'root' })
export class CommandRegistry {
  private readonly menu = inject(MenuService);
  private readonly theme = inject(ThemeService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly externalSources: CommandSource[] =
    inject(COMMAND_SOURCES, { optional: true }) ?? [];

  list(): CommandItem[] {
    const all = [
      ...this.navigationCommands(),
      ...this.actionCommands(),
      ...this.externalSources.flatMap((src) => {
        try {
          return src();
        } catch {
          // Una fuente rota no debe tumbar el palette completo.
          return [];
        }
      }),
    ];
    return all.filter((cmd) => cmd.canShow?.() ?? true);
  }

  // ── Navegación: derivada del menú de la API; con fallback estático ───────────
  //
  // Resolución del label + keywords delegada a ``core/utils/nav-i18n.util.ts``
  // — la MISMA función que usa ``layout.component.ts`` para el sidebar. Así
  // sidebar y palette están garantizados de mostrar el mismo texto traducido
  // sin posibilidad de drift.
  private navigationCommands(): CommandItem[] {
    const sections = this.menu.sections();
    if (sections.length === 0) {
      // Fallback (mismo set que el sidebar cuando el menú API falla / aún no carga).
      return [
        this.navItem('menu-dashboard', '/admin/dashboard', 'dashboard'),
        this.navItem('menu-users', '/admin/users', 'people'),
        this.navItem('menu-groups', '/admin/groups', 'group'),
        this.navItem('menu-components', '/admin/components', 'widgets'),
      ];
    }
    return sections.flatMap((section) =>
      section.items.map<CommandItem>((item) => ({
        id: `nav:${item.slug || item.route}`,
        group: 'navigation',
        label: this.translateNavLabel(item.route, item.slug, item.name),
        hint: section.name,
        icon: item.icon || 'arrow_forward',
        keywords: this.navKeywordsFor(item.slug, item.name),
        run: () => {
          this.router.navigateByUrl(normalizeNavRoute(item.route) ?? item.route);
        },
      })),
    );
  }

  /**
   * Resuelve el label: busca clave i18n por route/slug (mismo util que el
   * sidebar); si no hay match traduce → cae al ``name`` raw del backend.
   */
  private translateNavLabel(route: string, slug: string | undefined, fallbackName: string): string {
    const key = labelKeyForMenuItem(route, slug);
    if (!key) return fallbackName;
    const tr = this.transloco.translate(key);
    // Transloco devuelve la clave literal si no encuentra traducción → fallback al raw.
    return tr === key ? fallbackName : tr;
  }

  /**
   * Aliases para la búsqueda + el ``name`` original como red de seguridad
   * (si el slug no está en el mapa, el usuario al menos matchea con el
   * texto visible).
   */
  private navKeywordsFor(slug: string | undefined, fallbackName: string): string[] {
    return [...keywordsForNavItem(slug), fallbackName];
  }

  /** Helper para el fallback estático cuando el menú API aún no respondió. */
  private navItem(slug: string, route: string, icon: string): CommandItem {
    return {
      id: `nav:${slug}`,
      group: 'navigation',
      label: this.translateNavLabel(route, slug, slug),
      icon,
      keywords: this.navKeywordsFor(slug, slug),
      run: () => {
        this.router.navigateByUrl(route);
      },
    };
  }

  // ── Acciones: tema, idioma, ayuda, sign out ─────────────────────────────────
  private actionCommands(): CommandItem[] {
    return [
      {
        id: 'action:next-theme',
        group: 'actions',
        label: this.transloco.translate('layout.commandPalette.actions.nextTheme'),
        icon: 'palette',
        run: () => this.theme.setTheme(this.nextThemeId()),
      },
      {
        id: 'action:toggle-lang',
        group: 'actions',
        label: this.transloco.translate('layout.commandPalette.actions.toggleLang'),
        icon: 'language',
        run: () => {
          const current = (this.transloco.getActiveLang() as FvxUiLang) || 'en';
          this.transloco.setActiveLang(current === 'es' ? 'en' : 'es');
        },
      },
      {
        id: 'action:signout',
        group: 'actions',
        label: this.transloco.translate('layout.signOut'),
        icon: 'logout',
        canShow: () => this.auth.isAuthenticated(),
        run: () => this.auth.logout(),
      },
    ];
  }

  private nextThemeId(): FvxThemeId {
    const ids = this.theme.options;
    const idx = ids.indexOf(this.theme.currentId());
    return ids[(idx + 1) % ids.length];
  }
}
