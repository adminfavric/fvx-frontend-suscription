import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { Subject, EMPTY, catchError, debounceTime, exhaustMap } from 'rxjs';

import { APP_CONFIG } from '../config/app-config.token';
import { persistLang, type FvxUiLang } from '../i18n/locale-storage';
import {
  MAX_FAVORITE_MENU_ITEMS,
  type TableDensity,
  type UserUiPreferencesPayload,
} from '../models/user-ui-preferences.model';
import { PageContentWidthService } from './page-content-width.service';
import { ThemeService, type FvxThemeId } from './theme.service';

const STORAGE_APPEARANCE = 'fvx-appearance-section-expanded';

@Injectable({ providedIn: 'root' })
export class UserUiPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly theme = inject(ThemeService);
  private readonly pageWidth = inject(PageContentWidthService);
  private readonly transloco = inject(TranslocoService);
  private readonly url = `${inject(APP_CONFIG).apiUrl}/me/ui-preferences/`;

  /** Panel «Apariencia» del sidebar (section-card colapsable). */
  readonly appearanceSectionExpanded = signal(true);

  /**
   * Densidad (alto de fila) de las tablas de datos, global del usuario.
   * Arranca en 'compact' (tablas con mucho contenido); el toggle del header de
   * la tabla la alterna y se persiste en ``User.ui_preferences.table_density``.
   */
  readonly tableDensity = signal<TableDensity>('compact');

  /**
   * Slugs de ``MenuItem`` favoritos (orden = posición en el sidebar).
   * Vacío por defecto. Persistido en ``User.ui_preferences.favorite_menu_items``.
   */
  readonly favoriteMenuItems = signal<string[]>([]);

  /** Tope de favoritos (espejo del backend). */
  readonly maxFavorites = MAX_FAVORITE_MENU_ITEMS;

  private readonly save$ = new Subject<void>();

  constructor() {
    this.save$
      .pipe(
        debounceTime(450),
        exhaustMap(() => {
          if (!this.hasSession()) {
            return EMPTY;
          }
          const body = this.buildPayload();
          // `catchError` DENTRO del exhaustMap: si un guardado falla (403/red),
          // tragamos el error AQUÍ para que NO termine el stream externo. Sin
          // esto, el primer error mataría `save$` y ningún guardado posterior
          // de la sesión se enviaría (cambios "perdidos" hasta recargar).
          return this.http
            .patch<UserUiPreferencesPayload>(this.url, body)
            .pipe(catchError(() => EMPTY));
        }),
      )
      .subscribe();
  }

  /** Antes de login: solo estado del colapsable desde ``localStorage``. */
  initAppearanceFromLocalStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const raw = localStorage.getItem(STORAGE_APPEARANCE);
    this.appearanceSectionExpanded.set(raw !== 'false');
  }

  setAppearanceExpanded(expanded: boolean): void {
    this.patchAppearanceLocal(expanded);
    this.requestSave();
  }

  /** Cambia la densidad global de las tablas y la persiste. */
  setTableDensity(density: TableDensity): void {
    if (this.tableDensity() === density) return;
    this.tableDensity.set(density);
    this.requestSave();
  }

  /** Marca o desmarca un item del menú como favorito (max ``maxFavorites``). */
  toggleFavorite(slug: string): void {
    if (!slug) return;
    const current = this.favoriteMenuItems();
    if (current.includes(slug)) {
      this.favoriteMenuItems.set(current.filter(s => s !== slug));
    } else {
      if (current.length >= this.maxFavorites) {
        return;
      }
      this.favoriteMenuItems.set([...current, slug]);
    }
    this.requestSave();
  }

  isFavorite(slug: string): boolean {
    return this.favoriteMenuItems().includes(slug);
  }

  canAddMoreFavorites(): boolean {
    return this.favoriteMenuItems().length < this.maxFavorites;
  }

  /**
   * Reordena la lista. Recibe el nuevo orden completo (no índices); filtra
   * cualquier slug que no esté en la lista actual para evitar inyectar
   * favoritos por drag-and-drop.
   */
  reorderFavorites(newOrder: readonly string[]): void {
    const currentSet = new Set(this.favoriteMenuItems());
    const filtered = newOrder.filter(s => currentSet.has(s));
    if (filtered.length !== currentSet.size) {
      return;
    }
    this.favoriteMenuItems.set(filtered);
    this.requestSave();
  }

  private patchAppearanceLocal(expanded: boolean): void {
    this.appearanceSectionExpanded.set(expanded);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_APPEARANCE, expanded ? 'true' : 'false');
    }
  }

  /**
   * Tras ``GET /users/me/`` o login: aplica preferencias del servidor y sincroniza ``localStorage`` locales.
   *
   * **Jerarquía de tema:** este método tiene la última palabra. Si el usuario tiene
   * `theme_id` guardado en `Profile.ui_preferences`, sobrescribe tanto `localStorage`
   * como el tema de marca (`UiSettings.theme_key`). Esto significa que un usuario
   * autenticado siempre ve su preferencia personal, incluso si el admin cambió el
   * tema global. El posible flash (marca → personal) es intencional.
   */
  hydrateFromApi(): void {
    if (!this.hasSession()) {
      return;
    }
    this.http.get<UserUiPreferencesPayload>(this.url).subscribe({
      next: (data) => this.applyFromServer(data),
      error: () => {},
    });
  }

  /** Encola guardado (debounce); llamar tras tema, ancho, idioma o colapsable. */
  requestSave(): void {
    this.save$.next();
  }

  private buildPayload(): UserUiPreferencesPayload {
    return {
      theme_id: this.theme.currentId(),
      page_content_width: this.pageWidth.currentMode(),
      ui_lang: this.transloco.getActiveLang() as 'en' | 'es',
      appearance_section_expanded: this.appearanceSectionExpanded(),
      favorite_menu_items: this.favoriteMenuItems(),
      table_density: this.tableDensity(),
    };
  }

  private applyFromServer(data: UserUiPreferencesPayload): void {
    if (data.theme_id != null) {
      const tid = this.theme.normalizeStoredThemeId(String(data.theme_id));
      if (this.theme.isValidThemeKey(tid)) {
        this.theme.setTheme(tid as FvxThemeId);
      }
    }
    if (data.page_content_width && this.pageWidth.isValidMode(data.page_content_width)) {
      this.pageWidth.setMode(data.page_content_width);
    }
    if (data.ui_lang === 'en' || data.ui_lang === 'es') {
      const lang = data.ui_lang as FvxUiLang;
      this.transloco.setActiveLang(lang);
      persistLang(lang);
    }
    if (typeof data.appearance_section_expanded === 'boolean') {
      this.patchAppearanceLocal(data.appearance_section_expanded);
    }
    if (data.table_density === 'compact' || data.table_density === 'normal') {
      this.tableDensity.set(data.table_density);
    }
    if (Array.isArray(data.favorite_menu_items)) {
      // Defense: filtramos strings no vacíos y cortamos al máximo, por si
      // un cliente antiguo dejó un valor inválido en BD.
      const cleaned = data.favorite_menu_items
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .slice(0, this.maxFavorites);
      this.favoriteMenuItems.set(cleaned);
    }
  }

  /**
   * ¿Hay sesión en el browser? Con auth por token Bearer el access vive en
   * `localStorage['fvx_access']`; decodificamos su `exp`. Evitamos inyectar
   * `AuthService` aquí porque él ya inyecta este servicio → ciclo DI, así que
   * leemos y decodificamos el token directamente (misma clave que `AuthService`).
   */
  private hasSession(): boolean {
    let token: string | null = null;
    try { token = localStorage.getItem('fvx_access'); } catch { return false; }
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
