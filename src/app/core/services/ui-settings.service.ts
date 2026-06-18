import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { APP_CONFIG } from '../config/app-config.token';
import { UiSettingsResponse } from '../models/ui-settings.model';
import { ThemeService } from './theme.service';

/**
 * Cliente para `settings/ui/`. Si el endpoint no existe aún, el error se traga y la app sigue.
 * Cuando exista `UiSettings` en Django, el mismo contrato aplicará tema y (fase 2) branding.
 */
@Injectable({ providedIn: 'root' })
export class UiSettingsService {
  private readonly http = inject(HttpClient);
  private readonly theme = inject(ThemeService);

  /** Última respuesta exitosa; el layout lee `appTitle()` / `logoUrl()` derivados de aquí. */
  readonly remoteSettings = signal<UiSettingsResponse | null>(null);

  /** Título de marca remoto (trimeado, `null` si vacío/ausente). El layout cae a `'layout.brandName'` i18n. */
  readonly appTitle = computed(() => {
    const v = this.remoteSettings()?.app_title?.trim();
    return v || null;
  });

  /** URL del logo remoto (trimeado, `null` si vacío/ausente). El layout cae a `<mat-icon>layers</mat-icon>`. */
  readonly logoUrl = computed(() => {
    const v = this.remoteSettings()?.logo_url?.trim();
    return v || null;
  });

  private readonly url = `${inject(APP_CONFIG).apiUrl}/settings/ui/`;

  fetchUiSettings(): Observable<UiSettingsResponse | null> {
    return this.http.get<UiSettingsResponse>(this.url).pipe(
      tap((body) => this.remoteSettings.set(body)),
      catchError(() => {
        this.remoteSettings.set(null);
        return of(null);
      })
    );
  }

  /**
   * Aplica los efectos colaterales de la marca remota: tema, título del navegador.
   * El logo se consume vía signal `logoUrl()` desde el layout (no requiere side effect
   * aquí). `theme_overrides` queda pendiente para una iteración futura.
   *
   * Jerarquía de fuentes de tema (3 capas):
   *   1. `Profile.ui_preferences.theme_id` — usuario autenticado (gana siempre; aplica
   *      `UserUiPreferencesService.hydrateFromApi()` post-login).
   *   2. `UiSettings.theme_key` (este método) — marca global desde backend (gana sobre
   *      localStorage anónimo).
   *   3. `localStorage` (`fvx-theme-id`) — fallback para usuarios sin sesión.
   *
   * Nota: si el usuario está logueado, el tema puede ser sobrescrito inmediatamente por
   * `hydrateFromApi()` cuando `AuthService` recibe el perfil. Ese flash es intencional
   * (marca default → preferencia personal del usuario).
   */
  applyRemoteBranding(body: UiSettingsResponse | null): void {
    if (body?.theme_key && this.theme.isValidThemeKey(body.theme_key)) {
      this.theme.setTheme(body.theme_key);
    }
    const title = body?.app_title?.trim();
    if (title) {
      document.title = title;
    }
  }

  /**
   * Llamar tras `ThemeService.initFromStorage()`.
   * Si el servidor responde con `theme_key`, **sustituye** el tema local (comportamiento típico “marca desde BD”).
   * Para respetar siempre `localStorage`, se puede condicionar más adelante.
   *
   * Orden de arranque (ver `app.config.ts`):
   *   1. `initFromStorage()` → carga tema de localStorage (fallback).
   *   2. `bootstrapFromApi()` → sobrescribe con tema de marca (`UiSettings.theme_key`).
   *   3. Tras login, `hydrateFromApi()` → sobrescribe con preferencia personal del usuario.
   */
  bootstrapFromApi(): void {
    this.fetchUiSettings().subscribe((body) => this.applyRemoteBranding(body));
  }
}
