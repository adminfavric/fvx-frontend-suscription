import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { RuntimeConfigService } from '../config/runtime-config.service';
import type { FvxThemeId } from './theme.service';
import { MAP_LAYER_MATCHERS, mapThemeFor } from '../utils/map-theme.util';

/**
 * Resultado normalizado de búsqueda Mapbox Geocoding v6. Una sola sugerencia.
 *
 * Pensado como contrato estable hacia componentes/formularios. Si alguien
 * necesita el feature crudo de Mapbox (para casos avanzados — routing,
 * isócronas, etc.) lo expone bajo ``raw``.
 */
export interface MapboxPlace {
  /** ID de Mapbox (útil para retrieve API si extendemos). */
  id: string;
  /** Texto completo formateado, listo para mostrar en un input. */
  fullAddress: string;
  /** Sólo el nombre/etiqueta principal (calle + número, POI, etc.). */
  name: string;
  /** Calle (sin número), si pudo extraerse. */
  street?: string;
  /** Número de calle o portal. */
  houseNumber?: string;
  /** Ciudad / localidad. */
  city?: string;
  /** Región / estado / provincia. */
  region?: string;
  /** Código postal. */
  postalCode?: string;
  /** País legible. */
  country?: string;
  /** Código ISO-3166 alpha-2 del país (``"cl"``, ``"us"``). */
  countryCode?: string;
  /** Categoría / tipo de feature (``"address"``, ``"poi"``, etc.). */
  featureType?: string;
  /** Coordenadas WGS84. ``[lng, lat]`` (el orden de Mapbox; cuidado con invertirlo). */
  coordinates: { lng: number; lat: number };
  /** Feature original de Mapbox por si el consumidor necesita campos extra. */
  raw?: unknown;
}

/**
 * Opciones de búsqueda forward para la Geocoding API v6.
 * Pensado para que el componente padre las pueda inyectar sin saber del SDK.
 *
 * Doc: https://docs.mapbox.com/api/search/geocoding/#forward-geocoding-with-search-text-input
 */
export interface MapboxSearchOptions {
  /** Limita a 1+ países (ISO-3166 alpha-2). Ej. ``['cl', 'ar']``. */
  countries?: readonly string[];
  /** Limita resultados a estos tipos. Ej. ``['address', 'poi']``. */
  types?: readonly string[];
  /** Idioma de los nombres devueltos. Ej. ``'es'`` / ``'en'``. */
  language?: string;
  /** Máximo de sugerencias (1-10). Default 5. */
  limit?: number;
  /**
   * Sesgar resultados hacia esta proximidad (mejora relevancia en autocompletes
   * locales). Si no se pasa, Mapbox usa la IP del cliente.
   */
  proximity?: { lng: number; lat: number };
}

/**
 * Wrapper único alrededor de la API de Mapbox.
 *
 * - **Geocoding API** (forward search) → ``search()``: usado por
 *   ``app-place-search`` para autocomplete de direcciones.
 * - **mapbox-gl JS** → ``loadGl()``: usado por ``app-map`` para renderizar
 *   un mapa interactivo. Se importa **lazy** (~200 kB minified) para no
 *   inflar el bundle inicial de la app cuando ninguna pantalla activa
 *   muestra un mapa.
 *
 * El token vive en ``config.json`` (runtime, gitignored) y lo expone
 * ``RuntimeConfigService`` — fuera del git y del bundle compilado. Si falta,
 * ``isConfigured()`` devuelve ``false`` y los componentes muestran un
 * placeholder en vez de romper la app. Ver ``security.md §8b``.
 */
@Injectable({ providedIn: 'root' })
export class MapboxService {
  private readonly http = inject(HttpClient);
  // El token vive en config.json (runtime, fuera del git) — lo carga
  // RuntimeConfigService en el app initializer, antes de que cualquier mapa
  // (lazy) se monte. No usamos APP_CONFIG para esto justamente para mantener
  // el secreto fuera del bundle compilado.
  private readonly runtimeConfig = inject(RuntimeConfigService);

  /** Cache de la importación lazy de mapbox-gl. Resuelve a su módulo default. */
  private mapboxGlPromise: Promise<typeof import('mapbox-gl')> | null = null;

  /** ¿Hay un token configurado? Útil para mostrar placeholders. */
  isConfigured(): boolean {
    const token = this.runtimeConfig.mapboxToken;
    return typeof token === 'string' && token.startsWith('pk.');
  }

  /** Lectura segura del token (string vacío si no configurado). */
  get token(): string {
    return this.runtimeConfig.mapboxToken;
  }

  /**
   * Búsqueda de lugares (forward geocoding). Devuelve los matches de Mapbox
   * normalizados a {@link MapboxPlace}. Si el query es vacío o no hay token,
   * devuelve un array vacío sin hacer llamada HTTP.
   */
  search(query: string, options: MapboxSearchOptions = {}): Observable<MapboxPlace[]> {
    const q = query?.trim();
    if (!q || !this.isConfigured()) {
      return of([]);
    }

    const url = 'https://api.mapbox.com/search/geocode/v6/forward';
    let params = new HttpParams()
      .set('q', q)
      .set('access_token', this.token)
      .set('limit', String(options.limit ?? 5))
      .set('language', options.language ?? 'es');

    if (options.countries?.length) {
      params = params.set('country', options.countries.join(','));
    }
    if (options.types?.length) {
      // Geocoding v6 solo acepta estos types. ``poi`` (de la API v5) provoca
      // 422 Unprocessable Content si se envía. Filtramos los inválidos en
      // vez de fallar — un type desconocido simplemente se ignora.
      const valid = options.types.filter((t) => GEOCODE_V6_TYPES.has(t));
      if (valid.length) {
        params = params.set('types', valid.join(','));
      }
    }
    if (options.proximity) {
      params = params.set('proximity', `${options.proximity.lng},${options.proximity.lat}`);
    }

    return this.http
      .get<MapboxGeocodeResponse>(url, { params, withCredentials: false })
      .pipe(map((res) => (res.features ?? []).map((f) => this.normalize(f))));
  }

  /**
   * Carga lazy de ``mapbox-gl``. Devuelve la misma promise en sucesivas
   * llamadas (cacheada) para que múltiples mapas en pantalla no descarguen
   * el bundle más de una vez.
   */
  async loadGl(): Promise<typeof import('mapbox-gl')> {
    if (!this.mapboxGlPromise) {
      this.mapboxGlPromise = import('mapbox-gl').then((mod) => {
        // mapbox-gl@3 expone el SDK como default export. ``accessToken`` es
        // una property del namespace; tipamos via unknown para evitar fricción
        // con los tipos generados del SDK (que lo exponen via setter).
        const m = (mod as unknown as { default?: typeof import('mapbox-gl') }).default ?? mod;
        (m as unknown as { accessToken: string }).accessToken = this.token;
        return m;
      });
    }
    return this.mapboxGlPromise;
  }

  /** URL del style base de Mapbox para un tema (light-v11 / dark-v11). */
  styleForTheme(themeId: FvxThemeId): string {
    return mapThemeFor(themeId).styleUrl;
  }

  /**
   * Re-pinta las capas del mapa según el tema FVX activo. Recorre las capas
   * del style cargado y, para cada una cuyo id matchee un rol conocido
   * (background / water / park / building / road / label), le aplica el color
   * del token correspondiente vía ``setPaintProperty``.
   *
   * Idempotente y barato: se puede llamar en cada cambio de tema sin recargar
   * el style. Si el style aún no terminó de cargar (``isStyleLoaded() === false``)
   * el caller debe esperar al evento ``style.load`` / ``idle`` antes de invocar.
   *
   * ``map`` se tipa ``unknown`` para no acoplar la firma pública al SDK lazy.
   */
  applyThemeToMap(map: unknown, themeId: FvxThemeId): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map as any;
    if (!m || typeof m.getStyle !== 'function') return;

    const tokens = mapThemeFor(themeId);
    const style = m.getStyle();
    const layers: { id: string; type: string }[] = style?.layers ?? [];

    for (const layer of layers) {
      const id = layer.id.toLowerCase();
      const role = this.roleForLayer(id, layer.type);
      if (!role) continue;

      try {
        switch (role) {
          case 'background':
            this.setColor(m, layer, tokens.colors.background);
            break;
          case 'water':
            this.setColor(m, layer, tokens.colors.water);
            break;
          case 'park':
            this.setColor(m, layer, tokens.colors.park);
            break;
          case 'building':
            this.setColor(m, layer, tokens.colors.building);
            break;
          case 'roadPrimary':
            this.setColor(m, layer, tokens.colors.roadPrimary);
            break;
          case 'roadSecondary':
            this.setColor(m, layer, tokens.colors.roadSecondary);
            break;
          case 'label':
            // Texto: color del glifo + halo para legibilidad.
            if (layer.type === 'symbol') {
              m.setPaintProperty(layer.id, 'text-color', tokens.colors.label);
              m.setPaintProperty(layer.id, 'text-halo-color', tokens.colors.labelHalo);
            }
            break;
        }
      } catch {
        // Una capa que no acepte el paint prop (ej. raster) no debe romper el resto.
      }
    }
  }

  /** Aplica color a la prop de paint correcta según el tipo de capa. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setColor(m: any, layer: { id: string; type: string }, color: string): void {
    switch (layer.type) {
      case 'fill':
        m.setPaintProperty(layer.id, 'fill-color', color);
        break;
      case 'line':
        m.setPaintProperty(layer.id, 'line-color', color);
        break;
      case 'background':
        m.setPaintProperty(layer.id, 'background-color', color);
        break;
      case 'fill-extrusion':
        m.setPaintProperty(layer.id, 'fill-extrusion-color', color);
        break;
    }
  }

  /** Determina el rol de una capa por su id (matchers en map-theme.util). */
  private roleForLayer(
    layerId: string,
    layerType: string,
  ): keyof typeof MAP_LAYER_MATCHERS | null {
    // El orden importa: building/road antes que el genérico "label" para que
    // road-label no caiga en building. label se evalúa último.
    const order: (keyof typeof MAP_LAYER_MATCHERS)[] = [
      'water',
      'park',
      'building',
      'roadPrimary',
      'roadSecondary',
      'background',
      'label',
    ];
    for (const role of order) {
      // ``label`` solo aplica a capas symbol (texto); el resto a fill/line/bg.
      if (role === 'label' && layerType !== 'symbol') continue;
      if (role !== 'label' && layerType === 'symbol') continue;
      if (MAP_LAYER_MATCHERS[role].some((pat) => layerId.includes(pat))) {
        return role;
      }
    }
    return null;
  }

  /**
   * Convierte un feature de Mapbox Geocoding v6 a {@link MapboxPlace}. Centraliza
   * el ruido del shape de Mapbox (context array, properties anidadas, etc.).
   */
  private normalize(feature: MapboxFeature): MapboxPlace {
    const props = feature.properties ?? {};
    const ctx = props.context ?? {};

    const get = <T = string>(ctxKey: keyof MapboxContextMap, field = 'name'): T | undefined => {
      const node = ctx[ctxKey];
      if (!node) return undefined;
      return (node as Record<string, unknown>)[field] as T | undefined;
    };

    return {
      id: feature.id,
      fullAddress: props.full_address ?? props.place_formatted ?? props.name ?? '',
      name: props.name ?? '',
      street: get('street'),
      houseNumber: props.address_number,
      city: get('place'),
      region: get('region'),
      postalCode: get('postcode'),
      country: get('country'),
      countryCode: get<string>('country', 'country_code')?.toLowerCase(),
      featureType: props.feature_type,
      coordinates: {
        lng: feature.geometry?.coordinates?.[0] ?? 0,
        lat: feature.geometry?.coordinates?.[1] ?? 0,
      },
      raw: feature,
    };
  }
}

/**
 * Types válidos de la Geocoding API **v6**. Nota: ``poi`` NO está (era de v5;
 * para POIs hay que usar la Search Box API, no el geocoder). Enviar un type
 * fuera de esta lista produce 422.
 * Doc: https://docs.mapbox.com/api/search/geocoding/#data-types
 */
const GEOCODE_V6_TYPES = new Set<string>([
  'country',
  'region',
  'postcode',
  'district',
  'place',
  'locality',
  'neighborhood',
  'street',
  'address',
]);

// ── Shape mínima de la respuesta de Geocoding v6 (no exhaustiva). ─────────────
// Doc: https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object

interface MapboxGeocodeResponse {
  type: 'FeatureCollection';
  features: MapboxFeature[];
}

interface MapboxFeature {
  id: string;
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: MapboxFeatureProperties;
}

interface MapboxFeatureProperties {
  name?: string;
  full_address?: string;
  place_formatted?: string;
  address_number?: string;
  feature_type?: string;
  context?: Partial<MapboxContextMap>;
}

interface MapboxContextMap {
  address: { name?: string };
  street: { name?: string };
  neighborhood: { name?: string };
  postcode: { name?: string };
  place: { name?: string };
  district: { name?: string };
  region: { name?: string; region_code?: string };
  country: { name?: string; country_code?: string };
}
