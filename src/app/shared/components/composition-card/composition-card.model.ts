import type { StatCardTone } from '../stat-card/stat-card.model';

/** Una fila: etiqueta, barra proporcional y bloque de valores a la derecha. */
export interface CompositionCardRow {
  label: string;
  /** 0–100: ancho relativo del relleno de la barra (se recorta al rango). */
  percent: number;
  /** Texto principal alineado a la derecha (ej. importe formateado). */
  value: string;
  /** Línea inferior (ej. `32%`); si omites, se muestra el porcentaje redondeado. */
  percentLabel?: string;
  /** Color CSS del relleno de la barra; si omites, se usa `--fvx-chart-color-1`…`6` en rotación. */
  barColor?: string;
}

/**
 * Objeto opcional `[card]` (misma idea que `StatCardConfig`): listas, API o constantes.
 * Los `@Input()` explícitos tienen prioridad cuando están definidos (`!== undefined`).
 */
export interface CompositionCardConfig {
  title: string;
  subtitle?: string;
  rows: CompositionCardRow[];
  /** Acento visual de la tarjeta (misma escala semántica que `app-stat-card`). */
  tone?: StatCardTone;
  /** Ancho máximo del host (ej. `480px`, `min(100%, 520px)`). */
  maxWidth?: string;
  /** Altura máxima del host; si las filas no caben, solo el cuerpo lista hace scroll. */
  maxHeight?: string;
  minHeight?: string;
}
