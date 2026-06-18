import { InjectionToken, Provider } from '@angular/core';

/**
 * Ambiente lógico de la app. Distinto del flag `production` (boolean) porque
 * permite distinguir `staging` (build prod pero no producción real) y mostrar
 * un chip de aviso en el topbar para evitar errores de operación.
 */
export type AppStage = 'production' | 'staging' | 'dev';

export interface AppConfig {
  production: boolean;
  apiUrl: string;
  authUrl: string;
  httpLogging: boolean;
  /** Versión del build (string libre — coloca aquí lo que tenga sentido para tu deploy). */
  version: string;
  /**
   * Ambiente lógico. Si se omite en la fuente, se deriva: `production: true` →
   * `'production'`; en caso contrario `'dev'`.
   */
  stage: AppStage;
  /**
   * Intervalo (ms) del polling del inbox de notificaciones del topbar. Por
   * defecto 3 min; baja a 60 s en pruebas / sube para reducir tráfico.
   */
  inboxPollMs: number;
}

// Nota: el token de Mapbox NO está en AppConfig (que se compila al bundle).
// Vive en ``config.json`` (runtime, gitignored) y lo expone
// ``RuntimeConfigService``. Ver ``core/config/runtime-config.service.ts``.

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export function provideAppConfig(config: AppConfig): Provider {
  return { provide: APP_CONFIG, useValue: config };
}
