import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../config/app-config.token';

/**
 * Detector de versión nueva del frontend (solo admin): compara la versión
 * COMPILADA en el bundle (package.json → environment.version) con la del
 * `/version.json` publicado junto al build (generado por scripts/write-version.js
 * en cada `npm run build`; nginx lo sirve con `no-store`). Si difieren, hay un
 * deploy nuevo y el shell ofrece "Actualizar" (recarga con los bundles nuevos).
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  /** Versión nueva detectada en el servidor (`null` = estamos al día). */
  readonly newVersion = signal<string | null>(null);

  private timer?: ReturnType<typeof setInterval>;

  /** Empieza a chequear: una vez al montar el shell y luego cada `intervalMs`. */
  start(intervalMs = 5 * 60_000): void {
    if (this.timer) return;
    void this.check();
    this.timer = setInterval(() => void this.check(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async check(): Promise<void> {
    try {
      const res = await firstValueFrom(
        // `?t=` evita cualquier caché intermedia; mismo origen (nginx / ng serve).
        this.http.get<{ version?: string }>(`/version.json?t=${Date.now()}`),
      );
      const server = (res.version ?? '').trim();
      this.newVersion.set(server && server !== this.config.version ? server : null);
    } catch {
      // Sin red o archivo ausente (p. ej. dev sin build): no molestar.
    }
  }

  /** Recarga la SPA para tomar los bundles del build nuevo. */
  reload(): void {
    location.reload();
  }
}
