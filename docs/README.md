# Documentación — `fvx-frontend`

Material de referencia para humanos y para agentes de IA que trabajan sobre la plantilla Angular en `code-master/fvx-frontend`.

**Reglas globales del repo (IAs y contribuidores):** [`../../AGENT.md`](../../AGENT.md) en la raíz de `code-master/`.

**Backend (Django) en el mismo monorepo:** [`../../fvx-backend/docs/README.md`](../../fvx-backend/docs/README.md) — resumen y enlaces para quien solo mira el front: [`backend.md`](backend.md). **OAuth Google / Apple:** [`../../fvx-backend/docs/social-login-setup.md`](../../fvx-backend/docs/social-login-setup.md).

---

## Guía de diseño (leer primero al crear o cambiar UI)

| Documento | Contenido |
|-----------|-----------|
| [**`design-fvx.md`**](design-fvx.md) | **Documento único** de diseño: temas (`--fvx-*`), botones, formularios, `app-file-uploader` y **catálogo** de `shared/`, pipes y `api/utils.py`. Incluye reglas de **i18n** (Transloco). |

---

**Orden sugerido de lectura** (después de `design-fvx.md` cuando la tarea sea UI)

1. [`backend.md`](backend.md) — dónde está la API, `environment`, auth e i18n vistos desde el front (enlace a `fvx-backend/docs/`).
2. [`custom-site.md`](custom-site.md) — layout, estructura canónica de página, clases en `styles.scss`, flujos custom.
3. [`i18n.md`](i18n.md) — Transloco, JSON, `Accept-Language`, `role_label`; gettext en [`../../fvx-backend/docs/i18n.md`](../../fvx-backend/docs/i18n.md).
4. [`add-crud-model.md`](add-crud-model.md) — modelo Django + pantalla Angular CRUD.
5. [`core-services.md`](core-services.md) — servicios de `core/services/`.
6. [`core-guards-interceptors.md`](core-guards-interceptors.md) — guards, interceptores, directivas transversales.
7. [`security.md`](security.md) — modelo de seguridad aplicado (cookies HttpOnly, CSRF, CORS, permisos).

**Índice (resto)**

| Documento | Contenido |
|-----------|-----------|
| [**backend.md**](backend.md) | API Django: rutas de docs, `environment`, JWT, i18n. |
| [**custom-site.md**](custom-site.md) | Páginas bajo el layout, `.page-container`, `app-page-header`, reutilización. |
| [**add-crud-model.md**](add-crud-model.md) | Recurso nuevo de extremo a extremo (Django + Angular). |
| [**core-services.md**](core-services.md) | API, auth, menú, tema, notificaciones, export, drawer, etc. |
| [**core-guards-interceptors.md**](core-guards-interceptors.md) | `authGuard`, `localeInterceptor`, `appHasMinRole`, etc. |
| [**security.md**](security.md) | Modelo de auth (JWT cookies), CSRF/CORS, refresh, sanitización, defensas XSS. |
| [**i18n.md**](i18n.md) | Multi-idioma en Angular; contrato con backend. |
| [**menu-system.md**](menu-system.md) | Modelo de datos + spec de UI para el mantenedor de menú (CRUD pendiente). |
| [**dashboard-stats.md**](dashboard-stats.md) | Contrato `GET /api/v1/stats/` y `app-stat-card`. |

## Página interactiva

En ejecución, visita **`/components`**. Showcase con demos y snippets de piezas reutilizables. Código: `src/app/features/components-showcase/`.

Guía de ejecución Docker y temas: [`../README.md`](../README.md).

---

## Resumen: qué ejecutar con Docker

En **`fvx-frontend/`**, con la red `fvx_shared` y el backend alineado con `environment.ts`:

```bash
docker compose up --build
```

**Build de comprobación** (servicio `web`):

```bash
docker compose exec web npm run build
```

**API Django** (`fvx-backend/`):

```bash
docker compose up -d --build
```

Mantenimiento gettext en el backend: [../../fvx-backend/docs/i18n.md](../../fvx-backend/docs/i18n.md) (`makemessages` / `compilemessages`).
