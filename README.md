# fvx-frontend

Plantilla Angular derivada de `fvx/frontend`, recortada a **Users** y **Groups**. Ver [`../INVENTORY.md`](../INVENTORY.md).

## Temas (`tmp-*`)

| Id | Comportamiento |
|----|----------------|
| **tmp-default** | Sin clase en `<html>`: shell base — **barra lateral oscura + contenido claro** (`_theme-css-vars.scss` + paleta default). |
| **tmp-light** | Sidebar y shell claros. |
| **tmp-dark** | Shell y sidebar oscuros. |
| **tmp-blackandwhite** | Contenido claro + sidebar negro; alto contraste en navegación. |
| **tmp-beige** | ERP beige: lateral `#F4F3F0`, contenido `#FBFAF6`; cards con borde y texto principal **negros** (`#000`); cabecera de tabla sobre **blanco**; menú activo **bloque blanco** sin contorno; filas separadas por líneas grises finas. |

*(El id antiguo `tmp-hybrid` se normaliza a `tmp-default` en cliente y API.)*

- SCSS: `src/styles/_theme-palettes.scss`, `src/styles/themes/_tmp-*.scss`.
- Runtime: `ThemeService` (`localStorage` `fvx-theme-id`), menú **paleta** en la barra superior.
- Próximo paso plan: `GET settings/ui/` → `theme.setTheme(...)`.

## Menú lateral (API + fallback)

- **`MenuService`** (`src/app/core/services/menu.service.ts`) llama a **`{apiUrl}/menus/tree/`** (JWT vía interceptor; query opcional `menu_uuid` o `organization_uuid`).
- Si la petición **falla** o la API devuelve **`sections` vacío**, el layout usa el nav por defecto (**Users** + **Groups**), mismo criterio que el seed inicial del backend.
- Los ítems se filtran en **servidor** según rol efectivo (`Profile` + `UserOrganization`); en cliente, **`AuthService.minRoleAtLeast('VIEWER' | 'EDITOR' | 'ADMIN')`** y la directiva estructural **`*appHasMinRole`** (`src/app/core/directives/has-min-role.directive.ts`) alinean UI opcional con `profile.role` devuelto por `GET /users/me/` (rol efectivo).

## Desarrollo sin contenedor

```bash
npm install
npx ng serve --port 4201
```

Configurar `src/environments/environment.ts` (`apiUrl`, `authUrl`) y `proxy.conf.json` si aplica para apuntar al backend.

**Proxy opcional** en dev: `proxy.conf.docker.json` hacia `http://fvx_suscription_backend_web:8080` si quieres rutar la API por el dev server.

## Deploy del contenedor (Docker)

Todo se hace desde el directorio **`fvx-frontend/`** (donde están `Dockerfile`, `docker-compose.yml` y los scripts).

### Prerrequisitos

- **Docker** y plugin **Compose** (`docker compose`).
- Red externa compartida con el backend (mismo nombre que en `fvx-backend`):

  ```bash
  docker network create fvx_suscription_shared
  ```

  Solo hace falta crearla una vez en el host.

- **Backend** levantado en la misma red, con contenedor **`fvx_suscription_backend_web`** (puerto interno **8080**), tal como define el `docker-compose.yml` de `fvx-backend`. El `nginx` del front proxifica `/api/` y `/api/auth/` hacia ese hostname.

### Primera puesta en marcha

1. Asegura la red `fvx_suscription_shared` y el backend (ver arriba).
2. En `fvx-frontend/`, elige modo **local** (Angular dev server) o **prod** (build estático + nginx):

   ```bash
   ./start.sh local    # http://localhost:4201 — API por defecto en el host :8080 (environment.ts)
   ./start.sh prod     # http://localhost:8081 — rutas relativas /api → fvx_suscription_backend_web
   ```

   Sin scripts, equivalente:

   ```bash
   docker compose up --build -d web                    # solo local
   docker compose --profile prod up --build -d nginx   # solo prod
   ```

### Modos: `local` vs `prod`

| Aspecto | **local** (`web`, target `dev` del Dockerfile) | **prod** (`nginx`, perfil `prod`, target `prod`) |
|---------|--------------------------------------------------|-----------------------------------------------------|
| Puerto en el host | **4201** | **8081** |
| Qué corre | `ng serve` en el contenedor (código montado con volumen) | **nginx** sirve `dist/fvx-frontend/browser` |
| API desde el navegador | `environment.ts` → suele ser **http://localhost:8080** | `environment.prod.ts` → **`/api/v1`** y **`/api/auth`** relativos al mismo origen; nginx reenvía a `fvx_suscription_backend_web:8080` |

### Actualización y redeploy

Tras cambiar código o dependencias, reconstruir sin caché y volver a levantar:

```bash
./update.sh local
./update.sh prod
```

Si `ng serve` en Docker falla con **TS2307** (`echarts` / `ngx-echarts`), el volumen de `node_modules` suele estar desactualizado: el entrypoint alinea con `package-lock.json`; si hace falta, borra el volumen nombrado del stack (p. ej. `docker volume ls` → busca `*_node_modules_cache`) y vuelve a levantar (detalle en `docs/design-fvx.md` — catálogo, `app-chart` / ECharts).

Para un reinicio rápido sin rebuild (misma imagen):

```bash
./restart.sh local
./restart.sh prod
```

### Operación habitual

| Tarea | Comando útil |
|-------|----------------|
| Ver logs | `docker compose logs -f web` o `docker compose --profile prod logs -f nginx` |
| Parar | `docker compose stop web` o `docker compose --profile prod stop nginx` |

El modo por defecto de los scripts es **`local`** si no pasas argumento.

### Detalle del build en producción

El **`Dockerfile`** es multi-stage: `dev` → `build` (`ng build --configuration=production`) → **`prod`** (nginx + `nginx.conf`). Las peticiones del navegador van al mismo host **:8081**; nginx hace `proxy_pass` de **`/api/`** y **`/api/auth/`** hacia **`http://fvx_suscription_backend_web:8080`**, y **`/media/`** al mismo backend.

## Build (artefacto local)

```bash
npx ng build --project fvx-frontend
```

Salida: `dist/fvx-frontend/`.
