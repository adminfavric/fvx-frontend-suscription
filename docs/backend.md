# Backend (Django) — contexto para el frontend

Resumen para quien trabaja en **`fvx-frontend/`** y necesita ubicar la API, los contratos y la documentación del servidor. El detalle operativo (Docker, scripts, admin) está en el repositorio del backend.

## Dónde está y cómo se documenta

- Código del API: **`fvx-backend/`** (hermano de `fvx-frontend/` dentro de `code-master/`).
- **Índice de documentación del backend:** [`../../fvx-backend/docs/README.md`](../../fvx-backend/docs/README.md).
- Guía larga de instalación y uso: [`../../fvx-backend/README.md`](../../fvx-backend/README.md).

## Cómo se conecta esta app

1. **`src/environments/environment.ts`** (y `environment.prod.ts`): **`apiUrl`** y **`authUrl`** deben apuntar al mismo host/puerto y prefijos que expone Django.
2. **Auth:** JWT vía endpoints bajo `authUrl`; el **`authInterceptor`** adjunta el Bearer a las peticiones a la API.
3. **Idioma:** el **`localeInterceptor`** añade **`Accept-Language`** según Transloco, solo hacia `apiUrl` y `authUrl`, para que respuestas con `gettext` (p. ej. **`role_label`**) vengan en el mismo idioma que la UI.

Relación menú, CORS y convenciones: [`../../fvx-backend/docs/api-and-frontend.md`](../../fvx-backend/docs/api-and-frontend.md).

## Internacionalización

- **Angular:** [`i18n.md`](i18n.md) (Transloco, JSON, interceptor).
- **Django (gettext, choices, `role_label`):** [`../../fvx-backend/docs/i18n.md`](../../fvx-backend/docs/i18n.md).

## Añadir un recurso CRUD

Receta extremo a extremo (modelo Django + pantalla Angular): [`add-crud-model.md`](add-crud-model.md) (el front debe alinearse a [`design-fvx.md`](design-fvx.md) e i18n). La parte servidor implica modelos, serializers, vistas/URLs y permisos en `fvx-backend/api/`.

## Reglas del monorepo

[`../../AGENT.md`](../../AGENT.md) — cambios de núcleo (auth, interceptores globales, contratos de API) requieren coordinación.

---

## Resumen: qué ejecutar con Docker

**Backend** — directorio **`fvx-backend/`** (servicio Django: `web` en `docker-compose.yml`):

```bash
docker compose up -d --build
```

**Tareas Django en contenedor** (ej. gettext tras cambiar traducciones en Python):

```bash
docker compose exec web python manage.py makemessages -l en -l es
docker compose exec web python manage.py compilemessages
```

**Frontend** — directorio **`fvx-frontend/`** (servicio `web`):

```bash
docker compose up --build
```

**Build de producción dentro del contenedor del front:**

```bash
docker compose exec web npm run build
```

Detalle de redes, puertos y scripts: [`../../fvx-backend/README.md`](../../fvx-backend/README.md) y [`../README.md`](../README.md).
