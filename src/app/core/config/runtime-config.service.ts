import { Injectable } from '@angular/core';

/**
 * Forma del archivo `public/assets/config.json` (gitignored). Todos los campos
 * son opcionales: si el archivo no existe o un campo falta, se usa el default.
 *
 * **Para qué sirve:** mantener tokens/secretos del frontend (ej. el token
 * público de Mapbox) **fuera del repositorio git** y **fuera del bundle JS
 * compilado**. El mismo build sirve para dev/staging/prod — solo cambia el
 * `config.json` del deploy. Patrón espejo del `.env` del backend.
 *
 * **Importante:** un token `pk.*` igual termina visible en el navegador
 * (mapbox-gl lo necesita para pedir tiles). "Sacarlo del git" es higiene del
 * repo, NO una barrera de seguridad — la protección real es restringir el
 * token por dominio en el panel de Mapbox.
 */
export interface RuntimeConfig {
  /** Mapbox public access token (`pk.*`). */
  mapboxToken?: string;
}

/**
 * Carga `config.json` UNA vez al arrancar (vía `provideAppInitializer` en
 * `app.config.ts`) y lo expone sincrónicamente al resto de la app.
 *
 * Usa `fetch` directo (no `HttpClient`) a propósito: corre **antes** de que
 * el árbol de DI / interceptores esté listo, así que no debe depender de ellos.
 *
 * Si `config.json` no existe (ej. nadie lo creó desde el `.example`), la carga
 * NO falla — devuelve `{}` y los componentes que necesiten el token muestran
 * su placeholder de "configuración faltante".
 */
@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config: RuntimeConfig = {};

  /** Snapshot del config cargado. Vacío hasta que `load()` resuelve. */
  get snapshot(): Readonly<RuntimeConfig> {
    return this.config;
  }

  /** Token de Mapbox (string vacío si no configurado). */
  get mapboxToken(): string {
    return this.config.mapboxToken ?? '';
  }

  /**
   * Descarga `assets/config.json`. Idempotente-friendly: invocado una sola vez
   * desde el app initializer. Nunca rechaza — un 404/parse error deja el
   * config vacío y loguea un warning.
   */
  async load(): Promise<void> {
    try {
      // ``cache: 'no-cache'`` para que un cambio de token en el deploy se tome
      // sin depender del cache del browser.
      const res = await fetch('assets/config.json', { cache: 'no-cache' });
      if (!res.ok) {
        // 404 esperado si nadie copió el .example → no es error fatal.
        console.warn(
          '[RuntimeConfig] assets/config.json no encontrado (HTTP %s). ' +
            'Copia config.example.json → config.json y rellena los valores. ' +
            'Las features que dependen de tokens mostrarán un placeholder.',
          res.status,
        );
        return;
      }
      this.config = (await res.json()) as RuntimeConfig;
    } catch (err) {
      console.warn('[RuntimeConfig] no se pudo cargar assets/config.json:', err);
    }
  }
}
