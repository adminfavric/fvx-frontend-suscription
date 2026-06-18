import type { FvxThemeId } from '../services/theme.service';

/**
 * Paleta de colores del mapa por template FVX.
 *
 * **Por qué en JS y no en CSS vars:** Mapbox GL pinta sus capas via
 * ``map.setPaintProperty(layer, prop, color)`` en runtime — necesita los
 * valores como strings JS, no como ``var(--fvx-*)``. Así que replicamos aquí
 * los colores clave de cada tema (alineados con ``_theme-palettes.scss``).
 *
 * **Estrategia:** un único style base de Mapbox (``light-v11`` para temas
 * claros, ``dark-v11`` para oscuro) y luego repintamos las capas relevantes
 * con estos tokens. No requiere Mapbox Studio ni styles custom en la cuenta —
 * el "branding" del mapa vive en el código junto al resto del design system.
 *
 * Si en el futuro se diseñan styles propios en Studio (``mapbox://styles/...``),
 * basta cambiar ``styleUrl`` por tema y dejar ``paint`` vacío.
 */
export interface MapThemeTokens {
  /** Style base de Mapbox sobre el que se repinta. */
  styleUrl: string;
  /** Si la base ya es oscura (para no forzar contraste de texto claro sobre fondo claro). */
  dark: boolean;
  /** Colores por rol de capa. Alineados con los tokens ``--fvx-*`` del tema. */
  colors: {
    /** Fondo general del mapa / tierra. */
    background: string;
    /** Agua (ríos, mar, lagos). */
    water: string;
    /** Relleno de parques / áreas verdes. */
    park: string;
    /** Relleno de edificios. */
    building: string;
    /** Trazo de calles principales (autopistas, primarias). */
    roadPrimary: string;
    /** Trazo de calles secundarias / menores. */
    roadSecondary: string;
    /** Color del texto de etiquetas (calles, lugares). */
    label: string;
    /** Halo (contorno) del texto para legibilidad sobre cualquier fondo. */
    labelHalo: string;
  };
}

/**
 * Tokens por tema. Los valores coinciden con ``_theme-palettes.scss`` para que
 * el mapa "se sienta" parte del mismo sistema visual.
 */
const MAP_THEMES: Record<FvxThemeId, MapThemeTokens> = {
  // ── Off-white (default): calles gris-azuladas sutiles, no índigo saturado ──
  'tmp-default': {
    styleUrl: 'mapbox://styles/mapbox/light-v11',
    dark: false,
    colors: {
      background: '#f5f6fb',
      water: '#dfe3f5',
      park: '#e4eee7',
      building: '#e7e9fb',
      // No el acento #4f5bd5 (saturaba la trama vial); gris-azulado medio.
      roadPrimary: '#b9c0db',
      roadSecondary: '#dde1ee',
      label: '#565d72',
      labelHalo: '#ffffff',
    },
  },

  // ── Sidebar/clean light: mismo criterio sutil ──
  'tmp-light': {
    styleUrl: 'mapbox://styles/mapbox/light-v11',
    dark: false,
    colors: {
      background: '#f5f6fb',
      water: '#dfe3f5',
      park: '#e4eee7',
      building: '#eef0f7',
      roadPrimary: '#b9c0db',
      roadSecondary: '#dde1ee',
      label: '#565d72',
      labelHalo: '#ffffff',
    },
  },

  // ── Navy oscuro: calles sutiles (NO acento puro: saturaba toda la ciudad) ──
  'tmp-dark': {
    styleUrl: 'mapbox://styles/mapbox/dark-v11',
    dark: true,
    colors: {
      background: '#0e1018',
      water: '#161d33',
      park: '#16241f',
      building: '#1e2333',
      // Calle primaria = gris-azulado tenue (un paso sobre el fondo), no el
      // índigo de acento #6d7cf6, que pintaba toda la trama vial de Santiago.
      roadPrimary: '#3a4262',
      roadSecondary: '#262c3d',
      label: '#9aa1b8',
      labelHalo: '#0a0c13',
    },
  },

  // ── Alto contraste B&W: calles gris oscuro (negro puro saturaba la trama) ──
  'tmp-blackandwhite': {
    styleUrl: 'mapbox://styles/mapbox/light-v11',
    dark: false,
    colors: {
      background: '#f5f5f5',
      water: '#e0e0e0',
      park: '#ebebeb',
      building: '#e5e5e5',
      roadPrimary: '#9a9a9a',
      roadSecondary: '#cccccc',
      label: '#262626',
      labelHalo: '#ffffff',
    },
  },

  // ── ERP beige + verde bosque: calles verde-grisáceas tenues (no verde saturado) ──
  'tmp-beige': {
    styleUrl: 'mapbox://styles/mapbox/light-v11',
    dark: false,
    colors: {
      background: '#fbfaf6',
      water: '#dde8e4',
      park: '#e8f2ea',
      building: '#f4f3f0',
      roadPrimary: '#b6c4be',
      roadSecondary: '#dcdcd6',
      label: '#404040',
      labelHalo: '#fbfaf6',
    },
  },
};

/** Devuelve los tokens de mapa para un tema (fallback a default). */
export function mapThemeFor(themeId: FvxThemeId): MapThemeTokens {
  return MAP_THEMES[themeId] ?? MAP_THEMES['tmp-default'];
}

/**
 * Patrones de id de capa de los styles base de Mapbox (light-v11 / dark-v11)
 * agrupados por rol. Se usan con ``includes`` porque Mapbox versiona los ids
 * de capa (``road-primary``, ``road-primary-navigation``, etc.) y queremos
 * cubrir todas las variantes sin hardcodear nombres exactos que cambian entre
 * versiones del style.
 *
 * Si Mapbox renombra capas en una versión futura, basta ampliar estos arrays.
 */
export const MAP_LAYER_MATCHERS = {
  background: ['background', 'land'],
  water: ['water'],
  park: ['park', 'landuse', 'national-park', 'pitch', 'grass'],
  building: ['building'],
  roadPrimary: ['road-primary', 'road-trunk', 'road-motorway', 'road-secondary'],
  roadSecondary: ['road-street', 'road-minor', 'road-path', 'tunnel', 'bridge'],
  label: ['label', 'place', 'poi', 'road-label', 'settlement'],
} as const;
