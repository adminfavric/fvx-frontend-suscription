import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError, of, tap } from 'rxjs';
import { APP_CONFIG } from '../config/app-config.token';
import { allowedPathPrefixesForMenu } from '../utils/nav-route.util';
import type { MenuResponse, MenuSectionDto } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;

  /** Sectiones del API; vacío si la petición falla o el API no devuelve secciones. */
  readonly sections = signal<MenuSectionDto[]>([]);
  readonly loadFailed = signal(false);
  /**
   * True cuando el último ``GET /menus/tree/`` terminó (ok o error).
   * Necesario para las guardas (se ejecutan antes de montar el ``Layout``).
   */
  readonly loadAttempted = signal(false);
  private loadInFlight: Promise<MenuResponse | null> | null = null;

  clear(): void {
    this.sections.set([]);
    this.loadFailed.set(false);
    this.loadAttempted.set(false);
    this.loadInFlight = null;
  }

  /**
   * Carga el menú (una sola petición en vuelo; siguientes reutilizan la promesa o no-op si ya terminó).
   * Misma lógica que el sidebar; debe llamar la guarda y opcionalmente el ``Layout`` para prerender.
   */
  ensureLoaded(): Promise<MenuResponse | null> {
    if (this.loadAttempted()) {
      return Promise.resolve(null);
    }
    if (this.loadInFlight) {
      return this.loadInFlight;
    }
    this.loadFailed.set(false);
    this.loadInFlight = firstValueFrom(
      this.http.get<MenuResponse>(`${this.apiUrl}/menus/tree/`).pipe(
        tap(res => this.sections.set(res.sections ?? [])),
        catchError(() => {
          this.sections.set([]);
          this.loadFailed.set(true);
          return of(null);
        }),
      ),
    )
      .then((res) => {
        this.loadAttempted.set(true);
        this.loadInFlight = null;
        return res;
      });
    return this.loadInFlight;
  }

  /** Carga reactiva para el layout (misma lógica que `ensureLoaded`). */
  load(): void {
    void this.ensureLoaded();
  }

  /**
   * Comprueba si un path de app (p. ej. el de ``RouterStateSnapshot``) corresponde a
   * algún `menu_item` (o al mismo fallback del sidebar si el menú aún no está o falló).
   * ``/dashboard`` se permite siempre (home).
   */
  isPathAllowed(absolutePathOrStateUrl: string): boolean {
    const raw = absolutePathOrStateUrl.split('?')[0] || '/';
    const path = (raw.startsWith('/') ? raw : `/${raw}`) || '/';

    // System paths always available inside the authenticated shell, regardless of menu config.
    // El shell autenticado vive bajo /admin (la raíz es el sitio público).
    if (
      path === '/admin/dashboard' ||
      path === '/admin/not-found' ||
      path === '/admin/forbidden' ||
      path === '/admin/server-error'
    ) {
      return true;
    }
    const prefixes = allowedPathPrefixesForMenu(this.sections(), this.loadFailed());
    return prefixes.some(b => path === b || (b.length > 1 && path.startsWith(b + '/')));
  }
}
