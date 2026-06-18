export type StatCardTrend = 'up' | 'down' | 'neutral';

export type StatCardVariant =
  | 'default'
  | 'filled'
  | 'outline'
  | 'minimal'
  | 'solid'
  /** Fondo tarjeta claro + banda vertical de color con icono (referencia Metronic-style). */
  | 'split'
  /** Fondo completo en color acento + banda más oscura para el icono (dos tonos sobre color). */
  | 'split-solid';

export type StatCardTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

/** Icono al inicio (lectura LTR) o al final de la fila. */
export type StatCardIconPosition = 'start' | 'end';

/**
 * Estilo del tile del icono:
 * - `soft`: fondo suave con acento (por defecto).
 * - `filled`: fondo en color acento sólido e icono claro (en tarjetas claras).
 * - `muted`: fondo neutro atenuado.
 */
export type StatCardIconSurface = 'soft' | 'filled' | 'muted';

/** Presentación: ``normal`` (dashboard) o ``compact`` (fila horizontal compacta y baja altura; resúmenes junto a tablas). */
export type StatCardDensity = 'normal' | 'compact';

/**
 * Objeto único recomendado para KPIs vía API, `*ngFor` o constantes compartidas.
 * Los `@Input()` homónimos del componente tienen prioridad cuando están definidos.
 */
export interface StatCardConfig {
  icon?: string;
  label?: string;
  value?: string | number;
  prefix?: string;
  suffix?: string;
  description?: string;
  trend?: StatCardTrend;
  trendValue?: string | number;
  trendLabel?: string;
  variant?: StatCardVariant;
  tone?: StatCardTone;
  loading?: boolean;
  /** Color del arco del spinner (`loading`); p. ej. `#64748b`, `var(--fvx-link)`. Si omites, sigue `tone` / variante. */
  loadingSpinnerColor?: string;
  clickable?: boolean;
  valueTitle?: string;
  iconPosition?: StatCardIconPosition;
  iconSurface?: StatCardIconSurface;
  /** 0–100 (se recorta); `null`/`undefined` oculta la barra. */
  progress?: number | null;
  /** Altura mínima del host (p. ej. `112px`, `7rem`). */
  minHeight?: string;
  /** Altura máxima del host; si el contenido crece, la tarjeta hace scroll interno. */
  maxHeight?: string;
  /** Si es true, el host ocupa el 100% del alto de la celda (grid/flex); conviene con `minHeight`. */
  stretchHeight?: boolean;
  /**
   * Elevación al pasar el ratón (`translateY` + sombra).
   * Si omites el valor, coincide con `clickable` (retrocompatibilidad).
   */
  hoverLift?: boolean;
  /** Compacto (menos alto), contenido en fila; mismo comportamiento que ``normal``. */
  density?: StatCardDensity;
}
