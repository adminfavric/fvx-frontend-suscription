/** Fila de ``GET {apiUrl}/stats/`` → array ``items`` (alineada a `api/shell/dashboard_stats.py` + `app-stat-card`). */
export interface DashboardStatItem {
  id: string;
  value: number;
  label: string;
  label_key: string;
  icon?: string;
  /** Valores: see ``StatCardComponent`` (`neutral` | `primary` | …). */
  tone?: string;
  variant?: string;
  description?: string;
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

export interface DashboardStatsResponse {
  items: DashboardStatItem[];
  generated_at: string;
}
