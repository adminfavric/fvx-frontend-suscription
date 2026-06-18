import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  Observable,
  tap,
  catchError,
  throwError,
  BehaviorSubject,
  switchMap,
  map,
  of,
} from 'rxjs';
import { APP_CONFIG } from '../config/app-config.token';
import { PERMISSION_MIN_ROLE, type Permission } from '../auth/permissions';
import type { UiRole } from '../models/ui-role';
import { User } from '../models/user.model';
import { MenuService } from './menu.service';
import { UserUiPreferencesService } from './user-ui-preferences.service';

const ROLE_ORDER: Record<UiRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

/**
 * AuthService — gestión de sesión con JWT por **token Bearer** (localStorage).
 *
 * El backend (`POST /api/auth/token/`) devuelve `{access, refresh}` en el body;
 * los guardamos en localStorage y el `authInterceptor` los manda en
 * `Authorization: Bearer <access>`. Patrón necesario para front y API en
 * dominios raíz distintos (ej. front `.com` + API `.cl`): ahí la cookie
 * HttpOnly de terceros queda bloqueada por el navegador, así que no sirve.
 *
 * Seguridad (mitigaciones ante XSS, ya que el token es legible por JS):
 * access de vida corta (60min), **rotación de refresh** + **blacklist** del
 * viejo en cada refresh (backend `ROTATE_REFRESH_TOKENS`/`BLACKLIST_AFTER_ROTATION`),
 * y CSP. Si front+API comparten dominio raíz, lo ideal es volver a cookies
 * HttpOnly (más seguro) — ver `AUTH_COOKIE_DOMAIN` en el backend.
 *
 * El estado de sesión se deriva de `currentUser` (poblado por `GET /me/`).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(APP_CONFIG);
  private readonly AUTH_URL = this.config.authUrl;
  private readonly API_URL = this.config.apiUrl;

  /** Claves de localStorage para los tokens JWT. */
  private static readonly ACCESS_KEY = 'fvx_access';
  private static readonly REFRESH_KEY = 'fvx_refresh';

  private currentUser = signal<User | null>(null);
  private _isRefreshing = false;
  /** Notifica a peticiones encoladas tras un refresh: `true` = ok, `false` = falló. */
  refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

  /** ¿Hay un refresh de token en curso? Lo consulta el `authInterceptor` para
   *  decidir si dispara un refresh nuevo o encola la petición. API pública
   *  tipada — antes el interceptor accedía al campo privado con `as any`. */
  get isRefreshing(): boolean {
    return this._isRefreshing;
  }
  /** Marca el inicio/fin de un refresh en curso (lo usa el interceptor). */
  setRefreshing(value: boolean): void {
    this._isRefreshing = value;
  }

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => {
    const u = this.currentUser();
    return u?.is_staff || u?.role === 'ADMIN';
  });

  constructor(
    private http: HttpClient,
    private router: Router,
    private menu: MenuService,
    private uiPreferences: UserUiPreferencesService,
  ) {}

  // ─── Token storage (localStorage) ──────────────────────────────────────────

  /** Access token actual (o null). Lo lee el `authInterceptor` para el header. */
  get accessToken(): string | null {
    try { return localStorage.getItem(AuthService.ACCESS_KEY); } catch { return null; }
  }

  private get refreshTokenValue(): string | null {
    try { return localStorage.getItem(AuthService.REFRESH_KEY); } catch { return null; }
  }

  private storeTokens(access: string | null, refresh: string | null): void {
    try {
      if (access) localStorage.setItem(AuthService.ACCESS_KEY, access);
      // El refresh puede no rotar; solo lo sobreescribimos si vino uno nuevo.
      if (refresh) localStorage.setItem(AuthService.REFRESH_KEY, refresh);
    } catch { /* sandboxed / disabled */ }
  }

  private clearTokens(): void {
    try {
      localStorage.removeItem(AuthService.ACCESS_KEY);
      localStorage.removeItem(AuthService.REFRESH_KEY);
    } catch { /* sandboxed / disabled */ }
  }

  /** `exp` (epoch ms) del access token guardado, o null si no hay/ inválido.
   *  Lo usan `SessionTimeoutService` y `UserUiPreferencesService`. */
  accessTokenExpMs(): number | null {
    const exp = this.accessExp();
    return exp > 0 ? exp : null;
  }

  /** `exp` (epoch ms) del access token guardado, o 0 si no hay/ inválido. */
  private accessExp(): number {
    const token = this.accessToken;
    if (!token) return 0;
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Login con usuario y contraseña. El backend devuelve `{access, refresh}`
   * en el body; los guardamos y luego cargamos `/users/me/` para poblar
   * `currentUser` (ya autenticado vía Bearer).
   */
  login(username: string, password: string): Observable<User> {
    return this.http
      .post<{ access: string; refresh: string }>(`${this.AUTH_URL}/token/`, { username, password })
      .pipe(
        tap(res => this.storeTokens(res.access, res.refresh)),
        switchMap(() => this.http.get<User>(`${this.API_URL}/users/me/`)),
        tap(user => {
          this.currentUser.set(user);
          this.uiPreferences.hydrateFromApi();
        }),
        catchError(err => {
          this.clearLocalSession();
          return throwError(() => err);
        }),
      );
  }

  /** Login social (Google/Apple): mismo flujo, guarda tokens si vienen en body. */
  finishSocialSession(
    urlPath: 'social/google' | 'social/apple' | 'social/microsoft',
    body: { id_token: string; user?: unknown },
  ): Observable<User> {
    return this.http
      .post<{ access?: string; refresh?: string }>(`${this.AUTH_URL}/${urlPath}/`, {
        id_token: body.id_token,
        ...(body.user !== undefined ? { user: body.user } : {}),
      })
      .pipe(
        tap(res => { if (res?.access) this.storeTokens(res.access, res.refresh ?? null); }),
        switchMap(() => this.http.get<User>(`${this.API_URL}/users/me/`)),
        tap(user => {
          this.currentUser.set(user);
          this.uiPreferences.hydrateFromApi();
        }),
        catchError(err => {
          this.clearLocalSession();
          return throwError(() => err);
        }),
      );
  }

  /**
   * Cierra sesión: llama al backend para blacklistear el refresh + borrar
   * cookies, luego limpia estado local y redirige a `/login`. Si el backend
   * falla (server down, network), igual limpia local y redirige — la sesión
   * server-side morirá cuando expire el access (lifetime corto).
   */
  logout(): void {
    this.http.post(`${this.AUTH_URL}/logout/`, {}).subscribe({
      next: () => this.finalizeLogout(),
      error: () => this.finalizeLogout(),
    });
  }

  /** Effective ``user.role`` from API vs minimum role (staff always true). */
  minRoleAtLeast(min: UiRole): boolean {
    const u = this.currentUser();
    if (!u) return false;
    if (u.is_staff) return true;
    const r = (u.role ?? 'VIEWER') as UiRole;
    const score = r in ROLE_ORDER ? ROLE_ORDER[r] : -1;
    return score >= ROLE_ORDER[min];
  }

  /**
   * Checks a granular permission (`feature.action`). Today the check is derived
   * from the role hierarchy via {@link PERMISSION_MIN_ROLE}; swap the body when
   * the backend ships a per-user permission list and consumers stay untouched.
   */
  can(permission: Permission): boolean {
    const min = PERMISSION_MIN_ROLE[permission];
    return this.minRoleAtLeast(min);
  }

  /**
   * Refresh token: mandamos el refresh guardado en el body y guardamos el
   * nuevo `{access, refresh}` (el refresh rota y el viejo queda blacklisteado).
   * Devuelve `true` si renovó OK; el interceptor reintenta tras esa señal.
   */
  refreshToken(): Observable<boolean> {
    const refresh = this.refreshTokenValue;
    if (!refresh) {
      // Sin refresh guardado no hay nada que renovar → sesión muerta.
      this.clearLocalSession();
      this.router.navigate(['/login']);
      return of(false);
    }
    return this.http
      .post<{ access: string; refresh: string }>(`${this.AUTH_URL}/token/refresh/`, { refresh })
      .pipe(
        tap(res => this.storeTokens(res.access, res.refresh)),
        map(() => true),
        catchError(err => {
          // 401/403 = refresh expirado o inválido. Cualquier otro error (5xx,
          // network) lo propagamos para que la lógica retry de la app actúe.
          if (err?.status === 401 || err?.status === 403) {
            this.clearLocalSession();
            this.router.navigate(['/login']);
            return of(false);
          }
          return throwError(() => err);
        }),
      );
  }

  /**
   * Re-hidrata `currentUser` llamando `/users/me/`. Útil al bootstrap de la
   * app: si la cookie sigue válida desde la sesión anterior, restauramos la
   * UI sin pedir login.
   */
  loadCurrentUser(): void {
    this.http.get<User>(`${this.API_URL}/users/me/`).subscribe({
      next: user => {
        this.currentUser.set(user);
        this.uiPreferences.hydrateFromApi();
      },
      error: err => {
        const status = err?.status;
        // 401/403: la cookie no es válida → estado limpio y al login.
        if (status === 401 || status === 403) {
          this.clearLocalSession();
        }
        // 5xx / red: no tocamos nada; el usuario puede reintentar.
      },
    });
  }

  /**
   * Indica si hay sesión activa en el browser. Devuelve `true` si:
   * - El usuario ya está hidratado vía `/me/`, **o**
   * - Hay un access token guardado y aún no expiró, **o**
   * - El access expiró pero hay un refresh guardado (el interceptor renovará
   *   ante el primer 401 — relevante en el bootstrap/F5).
   *
   * No autentica nada: el backend hace el check real con el token en cada
   * request. Esto es solo un proxy UX para guards y bootstrap.
   */
  hasToken(): boolean {
    if (this.currentUser()) return true;
    if (this.accessExp() > Date.now()) return true;
    // Access vencido pero con refresh disponible → la sesión puede revivir.
    return !!this.refreshTokenValue;
  }

  /** Limpia estado en memoria y los tokens guardados. Llamar cuando la
   *  sesión ya no es válida (logout, refresh fallido, 401 definitivo). */
  private clearLocalSession(): void {
    this.currentUser.set(null);
    this.menu.clear();
    this.clearTokens();
  }

  private finalizeLogout(): void {
    this.clearLocalSession();
    this.router.navigate(['/login']);
  }
}
