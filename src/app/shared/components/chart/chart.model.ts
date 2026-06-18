/** Serie en gráficos cartesianos (línea, barra, área). */
export interface AppChartCartesianSeries {
  name: string;
  data: number[];
}

export type AppChartType = 'line' | 'bar' | 'area' | 'pie' | 'donut';

/** Porción para pastel / donut. */
export interface AppChartPieSlice {
  name: string;
  value: number;
}

/**
 * Sobrescribe tema / CSS para **esta** instancia de ``app-chart`` (modo ``preset``).
 * Cualquier campo omitido sigue viniendo de ``--fvx-*`` / ``--fvx-chart-*`` en el host.
 */
export interface AppChartStyleOptions {
  /** Paleta ECharts en orden (series o porciones). Si hay entradas, sustituye a ``--fvx-chart-color-*``. */
  palette?: string[];
  textPrimary?: string;
  textMuted?: string;
  textSecondary?: string;
  border?: string;
  /** Fondo del tooltip. */
  tooltipBg?: string;
  titleFontSize?: number;
  axisLabelFontSize?: number;
  areaFillOpacity?: number;
  /** Equivale a ``--fvx-chart-surface`` en el ``host``. */
  surface?: string;
  /** Color del borde del ``host`` (``border: 1px solid var(--fvx-chart-container-border)``). */
  containerBorder?: string;
  /** Equivale a ``--fvx-chart-container-radius`` (p. ej. ``8px``). */
  containerRadius?: string;
}
