# Dashboard — métricas y `app-stat-card`

- **GET** `…/api/v1/stats/` (JWT) — consumido por `DashboardComponent` y `DashboardStatsService`.
- Contrato JSON, extensión en Python y frases de ejemplo (“del modelo User quiero…”) están en el backend:  
  **[`../../fvx-backend/docs/dashboard-stats.md`](../../fvx-backend/docs/dashboard-stats.md)**.
- Cada `label_key` de la API debe existir bajo `dashboard.stats.*` en `public/assets/i18n/en.json` y `es.json`.
- `variant` en la API admite los mismos valores que `StatCardVariant` (incl. `split` y `split-solid` para la banda lateral de icono).
