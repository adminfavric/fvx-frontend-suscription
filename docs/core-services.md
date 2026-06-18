# Catálogo de servicios — `src/app/core/services/`

Referencia para humanos e IAs: cada servicio `providedIn: 'root'` que vive en `core/services/`, su rol y su API pública.

> Convención: rutas relativas a `fvx-frontend/src/app/`.

---

## 1. `ApiService` — cliente REST genérico

- **Archivo:** `core/services/api.service.ts`
- **Base URL:** `environment.apiUrl` (por defecto `http://localhost:8080/api/v1` en dev).
- **Encadenable con:** `BaseCrudComponent`, componentes de feature, `RelationshipDialogComponent`.

| Método | Firma | Notas |
|--------|-------|-------|
| `list<T>(endpoint, params?)` | `Observable<PaginatedResponse<T>>` | DRF paginado (`{ count, next, previous, results }`). |
| `get<T>(endpoint, id)` | `Observable<T>` | Detalle por id. |
| `create<T>(endpoint, data)` | `Observable<T>` | `POST`. |
| `update<T>(endpoint, id, data)` | `Observable<T>` | `PUT`. |
| `patch<T>(endpoint, id, data)` | `Observable<T>` | `PATCH`. |
| `delete(endpoint, id)` | `Observable<void>` | `DELETE`. |
| `customAction<T>(endpoint, id, action)` | `Observable<T>` | `GET {endpoint}/{id}/{action}/` (ideal para `@action(detail=True)`). |

**Formato de `endpoint`:** igual al primer argumento de `router.register(r"...")` (p. ej. `'users'`, `'groups'`), **sin** barra final.

**`QueryParams` (de `core/models/api.model.ts`):** acepta `page`, `page_size`, `search`, `ordering` y cualquier otro filtro string/number/boolean; `undefined`/`null`/`''` se omiten.

---

## 2. `AuthService` — sesión cookie-based + rol efectivo

- **Archivo:** `core/services/auth.service.ts`
- **Depende de:** `MenuService` (lo limpia al logout), `UserUiPreferencesService` (lo hidrata tras login).
- **Modelo de auth:** JWT en **cookies HttpOnly** (`fvx_access`, `fvx_refresh`) que el backend setea en `POST /api/auth/token/`. El frontend **nunca toca los tokens**; el browser los manda automáticamente por `credentialsInterceptor` (`withCredentials: true`). Ver [`security.md`](security.md) para detalles del modelo de seguridad.

**Estado (signals)**

| Signal | Devuelve |
|--------|----------|
| `user` | `Signal<User \| null>` — usuario actual (poblado por `/me/`). |
| `isAuthenticated` | `computed(() => !!user())`. |
| `isAdmin` | `computed(...)` — `true` si `is_staff` o `profile.role === 'ADMIN'`. |

**Autenticación**

| Método | Rol |
|--------|-----|
| `login(username, password)` | `POST {authUrl}/token/` → backend setea cookies; luego `GET /users/me/` para poblar `user`. Body de respuesta es `{detail:'OK'}`, sin tokens. |
| `finishSocialSession('social/google'\|'social/apple', { id_token, user? })` | Login social. Mismo flujo: el backend valida el `id_token` y setea las cookies, luego se carga `/users/me/`. |
| `logout()` | `POST {authUrl}/logout/` (blacklistea refresh + borra cookies server-side), limpia `user` y `MenuService`, redirige a `/login`. Si el backend falla, igual limpia local — el access tiene lifetime corto. |
| `refreshToken()` | `POST {authUrl}/token/refresh/`; la cookie `fvx_refresh` viaja sola. Devuelve `Observable<boolean>`. En 401/403 limpia sesión + redirige; en 5xx/red propaga el error sin logout. Lo usa el `authInterceptor`. |
| `loadCurrentUser()` | `GET /users/me/` para re-hidratar tras refresh de página si la cookie sigue válida. En 401/403 limpia sesión; en 5xx no toca nada. |
| `hasToken()` | `true` si hay `user` hidratado **o** si la cookie no-HttpOnly `fvx_access_exp` (epoch en segundos) está vigente. **No autentica nada** — proxy UX para guards y bootstrap. |

> **Métodos eliminados.** En la migración a cookies HttpOnly se removieron `getAccessToken()` y `getRefreshToken()` (el front no puede leer los JWTs por diseño). El campo público `refreshTokenSubject: BehaviorSubject<boolean | null>` lo consume `authInterceptor` para encolar las 401 paralelas.

**Rol mínimo + permisos granulares**

- `minRoleAtLeast(min: 'VIEWER' | 'EDITOR' | 'ADMIN'): boolean` — orden `VIEWER < EDITOR < ADMIN`; `is_staff` siempre pasa.
- `can(permission: Permission): boolean` — permiso granular `feature.action` (ver `core/auth/permissions.ts`). Hoy deriva del `PERMISSION_MIN_ROLE`; cuando el backend exponga permisos por usuario se cambia el cuerpo de este método y los consumidores quedan intactos.
- Consumidores: directivas `*appHasMinRole` / `*appCan`, guards `roleGuard` / `permissionGuard` (ver `core-guards-interceptors.md`).

**Uso típico**

```typescript
const auth = inject(AuthService);
if (!auth.hasToken()) router.navigate(['/login']);
if (auth.minRoleAtLeast('ADMIN')) { /* acción privilegiada */ }
if (auth.can('users.delete')) { /* botón eliminar */ }
```

---

## 3. `MenuService` — menú lateral dinámico

- **Archivo:** `core/services/menu.service.ts`
- **Endpoint:** `GET {apiUrl}/menus/tree/` → `{ menu, sections: MenuSectionDto[] }`.

| Miembro | Rol |
|---------|-----|
| `sections: Signal<MenuSectionDto[]>` | Fuente de verdad para el sidebar. |
| `loadFailed: Signal<boolean>` | `true` si la carga falló (el layout puede usar un `DEFAULT_NAV_GROUPS` como fallback). |
| `load()` | Trae secciones; nunca lanza error (lo traga). |
| `clear()` | Vacía secciones; lo llama `AuthService.logout()`. |

**Cuándo llamar `load()`** — típicamente tras un login exitoso o al entrar al layout autenticado.

---

## 4. `ThemeService` — temas `tmp-*`

- **Archivo:** `core/services/theme.service.ts`
- **Detalle completo:** [§ 1 — Temas en `design-fvx.md`](design-fvx.md#diseno-temas).

**Resumen**

| Miembro | Rol |
|---------|-----|
| `currentId: Signal<FvxThemeId>` | Id activo (`'tmp-default' \| 'tmp-light' \| 'tmp-dark' \| 'tmp-blackandwhite' \| 'tmp-beige'`). |
| `options: FvxThemeId[]` | Lista para un selector UI. |
| `initFromStorage()` | Aplica el tema guardado en `localStorage` (`fvx-theme-id`) o `tmp-default`. Invocado desde `app.config.ts`. |
| `setTheme(id)` | Aplica clase en `<html>`, persiste, actualiza signal. |
| `isValidThemeKey(s)` | Validación de `theme_key` remoto. |
| `label(id)` | Texto para menús. |

---

## 5. `UiSettingsService` — branding remoto (opcional)

- **Archivo:** `core/services/ui-settings.service.ts`
- **Endpoint (aún opcional):** `GET {apiUrl}/settings/ui/` → `UiSettingsResponse` (`theme_key`, `app_title`, `logo_url`, `theme_overrides`).

| Miembro | Rol |
|---------|-----|
| `remoteSettings: Signal<UiSettingsResponse \| null>` | Última respuesta exitosa (útil para logo/título si se cablean). |
| `fetchUiSettings()` | GET que traga errores (404/500 → `null`). |
| `applyRemoteBranding(body)` | Si `theme_key` es válido, `ThemeService.setTheme(theme_key)`. |
| `bootstrapFromApi()` | Suscribe `fetchUiSettings().subscribe(applyRemoteBranding)`. Llamado desde `app.config.ts` tras `ThemeService.initFromStorage()`. |

**Comportamiento actual** — si el API responde con tema válido, **sustituye** el tema local (“la marca manda”). El plan maestro prevé refinarlo en fase siguiente.

---

## 6. `SessionTimeoutService` — refresh proactivo + aviso de expiración

- **Archivo:** `core/services/session-timeout.service.ts`
- **Inicializado en:** `AppComponent.ngOnInit()` (`init()` es idempotente).

**Qué hace** — vigila la expiración del access token (vía cookie no-HttpOnly `fvx_access_exp`) y actúa en dos fases:

1. **Refresh proactivo silencioso** (60s..30s antes de `exp`): si hay sesión y aún no se intentó, llama a `AuthService.refreshToken()` sin abrir diálogo. Si funciona, el ciclo continúa transparente; si falla, deja que la fase 2 actúe.
2. **Aviso al usuario** (≤30s antes de `exp`): si el refresh proactivo no renovó la sesión, abre `SessionTimeoutDialogComponent` con cuenta regresiva. Acepta → `refreshToken()`; cancela o expira → `logout()`.
3. Si `exp` ya pasó y no hay diálogo abierto → `logout()` directo.

**Importante:** con cookies HttpOnly el frontend **no puede leer el JWT**; depende exclusivamente de `fvx_access_exp` (epoch en segundos, NO HttpOnly) que el backend setea junto a la cookie de auth. Ese valor no autentica nada — el backend valida el JWT en cada request.

**API**

| Método | Rol |
|--------|-----|
| `init()` | Arranca el `setInterval` (`pollMs = 1000`). |

No expone signals; es fire-and-forget.

---

## 7. `NotificationService` — snackbars de Angular Material

- **Archivo:** `core/services/notification.service.ts`

| Método | Duración | Clase panel |
|--------|----------|-------------|
| `success(msg)` | 3 s | `success-snackbar` |
| `error(msg)` | 5 s | `error-snackbar` |
| `info(msg)` | 3 s | `info-snackbar` |
| `handleError(err)` | — | Resuelve un mensaje desde un `HttpErrorResponse` (`err.error.detail`, primer campo del body, o genéricos por `status` 0/403/404) y llama `error()`. |

**Posicionamiento** — top-right (`horizontalPosition: 'end'`, `verticalPosition: 'top'`).

**Estilos de los snackbars** — definidos en `styles.scss` / material overrides (clases globales, no forman parte de este servicio).

---

## 8. `ExcelExportService` — export XLSX con paths anidados

- **Archivo:** `core/services/excel-export.service.ts`
- **Depende de:** `xlsx`.

**Tipos**

```typescript
interface ExportColumn { key: string; label: string; }
```

`key` admite **ruta con puntos** (`profile.role`, `profile.user_details.email`).

**API**

| Miembro | Rol |
|---------|-----|
| `ExcelExportService.columnsExport(...specs)` *(static)* | Crea `ExportColumn[]` desde strings `'path'` o `'path\|Header'`. |
| `expandColumnsUnderPrefix(rows, 'profile')` | Genera una columna por cada clave de primer nivel bajo `prefix` (muestra la primera fila). Objeto anidado → JSON. |
| `normalizeRows(data)` | Acepta array directo, `{ results: [] }` (DRF) o un objeto → `Record<string, unknown>[]`. |
| `getNestedValue(obj, 'a.b.c')` | Helper para resolver un path. |
| `exportToExcel(data, columns, filename)` | Escribe `{filename}_{YYYY-MM-DD}.xlsx`. Fechas ISO → `YYYY-MM-DD HH:mm:ss`; booleans → `Yes/No`; objetos → JSON; numeros finitos → numero; otros → string. |

**Patrón recomendado**

```typescript
const cols = ExcelExportService.columnsExport(
  'username',
  'email',
  'profile.role|Role',
  'profile.organization.name|Organization',
);
this.excel.exportToExcel(this.rows, cols, 'users');
```

---

## 9. `EntityDrawerService` — drawer lateral global

- **Archivo:** `core/services/entity-drawer.service.ts`
- **Componente asociado:** `<app-entity-drawer>` (instancia única en `AppComponent`; ver `design-fvx.md` § 5 — `app-entity-drawer`).

**Estado**

| Signal | Tipo |
|--------|------|
| `isOpen` | `Signal<boolean>` |
| `config` | `Signal<EntityDrawerConfig \| null>` |

**Tipos de configuración (unión discriminada)**

```typescript
// Modo 1: detalle vía API (solo usuario por ahora)
interface EntityDrawerUserApiConfig {
  title?: string;
  entityType: 'user';
  entityId: number;
}

// Modo 2: embeber un componente standalone arbitrario
interface EntityDrawerEmbedConfig {
  title?: string;
  embedComponent: Type<unknown>;
  embedInputs?: Record<string, unknown>;
}

type EntityDrawerConfig = EntityDrawerUserApiConfig | EntityDrawerEmbedConfig;
```

**Métodos**

| Método | Rol |
|--------|-----|
| `open(config)` | Valida (`isValidDrawerConfig`); si OK setea state y bloquea scroll con `.drawer-open-no-scroll` en `<body>`. Inválido → `console.warn` y no abre. |
| `close()` | Limpia state y quita bloqueo. |
| `toggle()` | Si está abierto, cierra (nada más). |

**Uso típico**

```typescript
// Detalle de usuario
drawer.open({ entityType: 'user', entityId: row.id, title: row.name });

// Empotrar componente custom (ej. panel de auditoría)
drawer.open({
  embedComponent: AuditNotesPanelComponent,
  embedInputs: { recordId: row.id },
  title: 'Notas',
});
```

---

## 10. `UserUiPreferencesService` — preferencias UI del usuario (persistidas en backend)

- **Archivo:** `core/services/user-ui-preferences.service.ts`
- **Endpoint:** `GET/PATCH {apiUrl}/me/ui-preferences/` — el backend persiste `theme_id`, `lang`, `page_width` y otros campos por usuario.
- **Depende de:** `ThemeService`, `PageContentWidthService`, `TranslocoService`.

| Miembro | Rol |
|---------|-----|
| `appearanceSectionExpanded: Signal<boolean>` | Estado del section-card "Apariencia" del sidebar (persistido en `localStorage`). |
| `hydrateFromApi()` | GET de preferencias y aplica tema/idioma/ancho. Lo invoca `AuthService.login()` y `AuthService.loadCurrentUser()`. |
| `saveDebounced()` | PATCH con `debounceTime(450ms)` + `exhaustMap` — varios cambios consecutivos producen un solo PATCH. |

**Jerarquía con `UiSettingsService`** — la preferencia del usuario autenticado **gana** sobre el `theme_key` de marca; ver §1 de `design-fvx.md` para la matriz completa.

---

## 11. `PageContentWidthService` — ancho del lienzo

- **Archivo:** `core/services/page-content-width.service.ts`
- **Persistencia:** `localStorage['fvx-page-content-width']` (`'compact' | 'extended'`).

| Miembro | Rol |
|---------|-----|
| `currentMode: Signal<FvxPageContentWidth>` | Modo activo. |
| `initFromStorage()` | Lee y aplica. Invocado en `app.config.ts` al bootstrap. |
| `setMode(mode)` | Persiste + añade/quita clase `fvx-page-width-extended` en `<html>`. |

**Compacto** (default) — `--fvx-page-container-max-width: 1440px`. **Extendido** — `100%` del viewport. La UI del selector vive en `app-config-user`.

---

## 12. `BreadcrumbsService` — migas auto-derivadas del menú

- **Archivo:** `core/services/breadcrumbs.service.ts`
- **Depende de:** `MenuService`, `Router`.

| Miembro | Rol |
|---------|-----|
| `breadcrumbs: Signal<Breadcrumb[]>` | Lista actual. Se recalcula en cada `NavigationEnd`. |

**Reglas**

1. Siempre arranca con `Home → /dashboard`.
2. Si la URL corresponde 1:1 a un `MenuItem.route` → agrega el `name` del item como último crumb (no clickable).
3. Si la URL es subruta (`/users/42`) y el prefijo coincide con un `MenuItem.route` → agrega el `name` como link (padre).
4. Páginas que NO están en el menú (`/forbidden`, `/server-error`, `/me/profile`, …) usan un mapeo manual interno.

Las migas las consume `LayoutComponent` para renderlas en la topbar.

---

## 13. `InboxService` — notificaciones (panel campana)

- **Archivo:** `core/services/inbox.service.ts`
- **Endpoint:** `GET {apiUrl}/notifications/`.

| Miembro | Rol |
|---------|-----|
| `items: Signal<InboxNotification[]>` | Lista actual. |
| `loading: Signal<boolean>` | Estado del refresh. |
| `unreadCount: Signal<number>` | `computed` — items con `read_at === null`. |
| `start(pollMs?)` | Idempotente; refresca inmediato + `setInterval`. Default `APP_CONFIG.inboxPollMs` (3 min). |
| `stop()` | Cancela el polling. Lo llama `AuthService.logout()`. |
| `refresh()` | One-shot GET. |
| `markRead(id)` / `markAllRead()` | PATCH. |

**Distinto de `NotificationService`** — el inbox es la campana persistente del topbar (notificaciones del backend); `NotificationService` son toasts efímeros del shell.

---

## 14. `DashboardStatsService` — KPIs del dashboard

- **Archivo:** `core/services/dashboard-stats.service.ts`
- **Endpoint:** `GET {apiUrl}/stats/`.

| Método | Rol |
|--------|-----|
| `getStats(): Observable<DashboardStatsResponse>` | Único método. JWT viaja vía cookie HttpOnly. |

Contrato JSON y configuración Django: ver `docs/dashboard-stats.md` y el doc del backend equivalente.

---

## 15. `MatDialogDragService` — diálogos draggables

- **Archivo:** `core/services/mat-dialog-drag.service.ts`
- **Activación:** auto-inyectado en `AppComponent`; se suscribe a `MatDialog.afterOpened`.

Hace arrastrables **todos** los `MatDialog` desde la cabecera (título o `content-dialog__header`), con indicador visual `⋯` arriba del título. Botones y enlaces dentro del header **no** inician arrastre.

No expone API pública — es fire-and-forget.

---

## 16. `MapboxService` — geocoding + mapas

- **Archivo:** `core/services/mapbox.service.ts`
- **Token:** `RuntimeConfigService.mapboxToken` (cargado de `public/assets/config.json` gitignored, público `pk.*`). Si falta, `isConfigured()` devuelve `false` y los componentes muestran placeholder.
- **Consumido por:** `app-place-search` (Geocoding) y `app-map` (mapbox-gl).

| Miembro | Rol |
|---------|-----|
| `isConfigured()` | `true` si hay token `pk.*` válido. |
| `token` | Lectura del token (string vacío si no configurado). |
| `search(query, options?)` | `Observable<MapboxPlace[]>` — forward geocoding (Geocoding API v6). Query vacío o sin token → array vacío sin HTTP. |
| `loadGl()` | `Promise<typeof mapbox-gl>` — import **lazy** del SDK (cacheado; setea el `accessToken`). |
| `styleForTheme(themeId)` | URL del style base (`light-v11` / `dark-v11`) según el template FVX. |
| `applyThemeToMap(map, themeId)` | Re-pinta las capas del mapa con los colores del tema (`setPaintProperty`). Idempotente. |

**`MapboxSearchOptions`** — `countries`, `types`, `language`, `limit`, `proximity`.
**`MapboxPlace`** — `id`, `fullAddress`, `name`, `street`, `houseNumber`, `city`, `region`, `postalCode`, `country`, `countryCode`, `featureType`, `coordinates {lng,lat}`, `raw`.

**Colores de mapa por tema** — `core/utils/map-theme.util.ts` (`MapThemeTokens` por `FvxThemeId`, alineados con `_theme-palettes.scss`). Detalle de los componentes en [`design-fvx.md` §2.35–2.36](design-fvx.md#diseno-catalogo).

**Setup global** — token en `public/assets/config.json` (gitignored; plantilla en `config.example.json`) cargado por `RuntimeConfigService` en el app initializer; CSS de mapbox-gl en `styles.scss`; CSP de `index.html` autoriza `api.mapbox.com` / `events.mapbox.com` / `blob:`. `mapbox-gl` pineado a `3.6.0` (3.7+ rompe con esbuild). Ver `security.md §8b`.

---

## Diagrama rápido de dependencias

```
AuthService ─── MenuService
     │       ├── UserUiPreferencesService ─── ThemeService, PageContentWidthService, TranslocoService
     │       └── HttpClient (cookies HttpOnly vía credentialsInterceptor)
     │
     ├── UiSettingsService ─── ThemeService
     │
     └── SessionTimeoutService ─── MatDialog (SessionTimeoutDialogComponent)

ApiService ─── HttpClient
NotificationService ─── MatSnackBar
ExcelExportService ─── xlsx
EntityDrawerService (state + signals)
BreadcrumbsService ─── Router + MenuService
InboxService ─── HttpClient + AuthService (polling)
DashboardStatsService ─── HttpClient
MatDialogDragService ─── MatDialog (auto-subscribe)
MapboxService ─── HttpClient (geocoding) + import() lazy de mapbox-gl
```

---

## Relacionado

- [`core-guards-interceptors.md`](core-guards-interceptors.md) — guards que consumen `AuthService`, interceptores HTTP, directivas.
- [`security.md`](security.md) — cookies HttpOnly, CSRF, refresh proactivo, política de logout.
- [`design-fvx.md` (catálogo § 5)](design-fvx.md#diseno-catalogo) — componentes de `shared/` que consumen estos servicios.
- [`design-fvx.md` (temas § 1)](design-fvx.md#diseno-temas) — pipeline de `ThemeService` + `UiSettingsService` + `UserUiPreferencesService`.
