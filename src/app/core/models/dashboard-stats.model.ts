/** Fila de ``GET {apiUrl}/stats/`` → array ``items`` (alineada a `api/shell/dashboard_stats.py` + `app-stat-card`). */
export interface DashboardStatItem {
  id: string;
  value: number | string;
  label: string;
  label_key: string;
  icon?: string;
  /** Valores: see ``StatCardComponent`` (`neutral` | `primary` | …). */
  tone?: string;
  variant?: string;
  description?: string;
  /** Texto antes del valor (p. ej. ``$``). */
  prefix?: string;
  /** Texto tras el valor (p. ej. `` CLP`` o ``%``). */
  suffix?: string;
  trend?: string;
  trend_value?: string;
  trend_label?: string;
  /** `start` | `end` — alineación del icono (ver `StatCardIconPosition`). */
  icon_position?: string;
  /** `soft` | `filled` | `muted` — estilo del tile del icono. */
  icon_surface?: string;
  /** 0–100; muestra barra de progreso en la tarjeta. */
  progress?: number | null;
}

/** Fila de la tabla de planes del panel (`get_dashboard_breakdowns().plans`). */
export interface DashboardPlanRow {
  id: number | string;
  name: string;
  amount: number | null;
  currency: string;
  interval_label: string;
  is_active: boolean;
  subscribers: number;
  pending: number;
}

/** Entrada de desglose (estado de pagos / proveedor). */
export interface DashboardBreakdownEntry {
  key: string;
  label: string;
  value: number;
  /** Tono opcional para mapear a `app-status-chip` (`success` | `warning` | `danger`…). */
  tone?: string;
}

export interface DashboardStatsResponse {
  items: DashboardStatItem[];
  plans?: DashboardPlanRow[];
  by_status?: DashboardBreakdownEntry[];
  by_provider?: DashboardBreakdownEntry[];
  generated_at: string;
}
