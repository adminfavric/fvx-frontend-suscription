# Seguridad aplicada — `fvx-frontend`

Resumen del modelo de seguridad implementado **hoy** en el front Angular y cómo se acopla al backend Django. Sirve para auditar el shell, integrar nuevas features sin abrir agujeros, y onboarding rápido de quien recibe el código.

> **Detalle servidor** (cookies, JWT, refresh, social, CORS): [`../../fvx-backend/docs/`](../../fvx-backend/docs/) — específicamente `architecture.md`, `social-login-setup.md` y el `.env.example` del backend.

---

## 1. Resumen ejecutivo

| Vector | Estado |
|---|---|
| Tokens accesibles vía JS | **No** — JWT en cookies HttpOnly (`fvx_access`, `fvx_refresh`). Sólo el browser los toca. |
| `localStorage` con secretos | **No**. Cleanup one-shot en `AuthService.constructor` borra entradas pre-cookies. |
| CSRF en API JSON | **No requerido** — la API DRF usa `SessionAuthentication` solo para Django Admin (`/admin/`), no para `/api/v1/*`. Para `/api/v1/*` la auth es el JWT cookie y CORS limita el origen. Ver §6. |
| Refresh de token | Cookie HttpOnly + interceptor que encola 401 paralelas. Refresh proactivo silencioso 60s antes de `exp`. |
| Logout | Server-side blacklist + clear cookies; fallback local si el backend falla. |
| Permisos UI | 3-tier `VIEWER < EDITOR < ADMIN` + permisos granulares `feature.action` (mapeo estático hoy). |
| Rutas privadas | `authGuard` (presencia) + `menuAccessGuard` (sourced from backend) + opcional `roleGuard` / `permissionGuard`. |
| Headers de correlación | `X-Request-Id` (UUID v4) en cada request — front y back loguean con el mismo id. |
| Errores HTTP | `errorInterceptor` normaliza a `HttpError`; toast global SOLO en 5xx/red. 4xx propagan en silencio. |
| Logs sensibles | `httpLoggingInterceptor` truncado a 12 000 chars, off por default; activarlo es opt-in con `APP_CONFIG.httpLogging`. |

---

## 2. Modelo de autenticación: JWT en cookies HttpOnly

### 2.1 Por qué cookies y no `localStorage`

Modelo elegido: **JWT en cookies HttpOnly** (`fvx_access`, `fvx_refresh`) que el backend setea en `POST /api/auth/token/`. Razones:

1. **XSS no extrae el token.** Sin acceso desde `document.cookie` ni `localStorage`, un script inyectado no puede exfiltrar la sesión a un servidor externo.
2. **Sin código de adjunto del header.** El browser envía la cookie automáticamente con `withCredentials: true`. El frontend deja de gestionar `Authorization: Bearer`.
3. **Logout server-side real.** El backend borra la cookie + blacklistea el refresh; no depende del cliente borrar nada localmente.

**Trade-off aceptado:** la cookie viaja en cada request al backend, por eso `credentialsInterceptor` la limita al `apiUrl`/`authUrl` propio (no a CDNs/Google GSI/etc.) y hace falta política CORS estricta — ver §6.

### 2.2 Las 3 cookies en juego

| Cookie | HttpOnly | Lectura JS | Lifetime | Para qué |
|---|---|---|---|---|
| `fvx_access` | ✅ | ❌ | corto (~60 min — `JWT_ACCESS_TOKEN_LIFETIME`) | autoriza cada request a `/api/v1/*` |
| `fvx_refresh` | ✅ | ❌ | largo (~60 min en dev, días en prod) | refresca `fvx_access` sin reloguear |
| `fvx_access_exp` | ❌ | ✅ (epoch en segundos) | espejo del `exp` del access | proxy UX para que el front decida cuándo refrescar / mostrar warning |

> `fvx_access_exp` **NO autentica nada**. Es solo un epoch para que `SessionTimeoutService` y `AuthService.hasToken()` sepan cuánto queda sin tener que leer el JWT (lo cual sería imposible al ser HttpOnly). El backend siempre valida el JWT real en cada request.

### 2.3 Atributos de las cookies — política por entorno

Configurados en backend vía `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_DOMAIN` (ver `.env.example`):

| Entorno | `Secure` | `SameSite` | `Domain` |
|---|---|---|---|
| **Dev** (DEBUG=True) | `False` | `Lax` | vacío (host-only) |
| **Prod misma raíz** (`api.x.com` + `app.x.com`) | `True` | `Strict` | `.x.com` |
| **Prod cross-site** (cliente con dominio propio → tu API) | `True` | `None` | vacío |

Regla de validación en `settings.py`: si `DEBUG=False` y `AUTH_COOKIE_SAMESITE=None` sin `Secure=True`, **el startup falla** (regla obligatoria de browsers modernos).

### 2.4 Por qué este diseño protege de CSRF en la API JSON

CSRF clásico exige un token impredecible en el body/header porque el browser **envía cookies con cualquier request del usuario** desde un dominio externo. El attack surface tradicional es `<form>` + `<img>` + `XHR` `application/x-www-form-urlencoded` desde un sitio attacker.

En este modelo, las defensas son **tres capas**:

1. **`SameSite=Strict`** (prod misma raíz) o **`SameSite=Lax`** (dev): el browser no manda la cookie en navegación cross-site, lo que invalida la mayor parte del CSRF clásico.
2. **CORS estricto en el backend** (`CORS_ALLOWED_ORIGINS` + `CORS_ALLOW_CREDENTIALS=True`): un attacker en otro origen no puede leer la respuesta — DRF rechaza la preflight `OPTIONS` si el origen no está whitelisteado.
3. **`Content-Type: application/json`** en todas las peticiones de la API: el browser dispara una **preflight CORS** para Content-Type no-simples, y el backend la rechaza si el origen no está en la whitelist. Esto bloquea el patrón de `fetch('https://api.x.com/...', { method: 'POST', body: JSON.stringify(...), credentials: 'include' })` desde un sitio attacker.

Para `SameSite=None` (cross-site legítimo), las defensas 2 y 3 son las únicas que aplican — pero siguen siendo suficientes con CORS bien configurado.

### 2.5 CSRF en `/admin/` Django

El **Django Admin** sí usa `SessionAuthentication` y cookies de sesión propias (no las JWT del API). Para él se mantiene el `CsrfViewMiddleware` + `csrf_token` en los forms, y `CSRF_COOKIE_SECURE=True` + `CSRF_TRUSTED_ORIGINS` en prod. Esto **no afecta al front Angular** porque no consume el admin.

---

## 3. Flujo de auth — paso a paso

### 3.1 Login (credenciales)

```
[Front] POST /api/auth/token/ { username, password }
        ↓  credentialsInterceptor → withCredentials: true
[Back]  valida + emite JWT access + refresh
        Set-Cookie: fvx_access=<jwt>; HttpOnly; Secure; SameSite=…
        Set-Cookie: fvx_refresh=<jwt>; HttpOnly; Secure; SameSite=…
        Set-Cookie: fvx_access_exp=<epoch>; SameSite=…  (lectura JS)
        Response: { detail: 'OK' }   ← sin tokens en el body

[Front] GET /api/v1/users/me/        ← cookie viaja sola
        → AuthService.currentUser.set(user)
        → UserUiPreferencesService.hydrateFromApi() (tema/idioma/ancho)
        → router.navigate(['/dashboard'])
```

### 3.2 Login social (Google / Apple)

Mismo flujo, con un paso extra: el front recibe el `id_token` del proveedor (Google GSI client / Apple JS) y lo manda al backend, que lo valida contra el `aud` esperado (`GOOGLE_OAUTH_CLIENT_ID` / `APPLE_CLIENT_ID`) antes de emitir el par JWT.

```
[Front] AuthService.finishSocialSession('social/google', { id_token })
        → POST /api/auth/social/google/ { id_token }
[Back]  valida id_token con Google (RS256 + iat/exp/aud) → emite JWT cookies
[Front] GET /api/v1/users/me/  ← idéntico al login local
```

**Habilitación:** `SOCIAL_AUTH_GOOGLE_ENABLED=True` + `GOOGLE_OAUTH_CLIENT_ID` en el `.env` del backend. Si está deshabilitado, el POST devuelve **403** y el botón social del login se oculta.

Setup detallado: [`../../fvx-backend/docs/social-login-setup.md`](../../fvx-backend/docs/social-login-setup.md).

### 3.3 Refresh — proactivo + reactivo

Dos caminos. Ambos llaman a `POST /api/auth/token/refresh/` con `fvx_refresh` viajando como cookie HttpOnly.

#### Proactivo (silencioso, sin interrumpir al usuario)

`SessionTimeoutService` cada segundo lee `fvx_access_exp`:

```
60s … 30s antes de exp  →  AuthService.refreshToken()  ← silencioso
                            ↓
                           Backend renueva fvx_access (+ a veces rotate refresh)
                            ↓
                           Próxima request al API ya usa el access nuevo
```

Si el refresh proactivo falla (5xx / red), no se hace logout — el usuario ve el aviso reactivo (siguiente sección) cuando llegue.

#### Reactivo (en respuesta a un 401)

`authInterceptor` capta 401 en cualquier request al `apiUrl`/`authUrl`:

```
Request A → 401 → authInterceptor.handleTokenRefresh
                  ↓
                  ¿ya hay refresh en vuelo?
                  ├─ No: llama AuthService.refreshToken(), pone isRefreshing=true
                  │   Refresh OK   → retry Request A + emite true en refreshTokenSubject
                  │   Refresh fail → AuthService.clearLocalSession() + redirect /login
                  └─ Sí: encola → espera refreshTokenSubject.next(true) → retry
```

Esto evita "thundering herd" cuando el dashboard dispara N requests simultáneos y todas devuelven 401 a la vez — solo el primero llama al backend, los demás esperan en el `BehaviorSubject`.

#### Diálogo de aviso (último recurso)

Si el refresh proactivo falló y queda < 30s para `exp`, se abre `SessionTimeoutDialogComponent` con cuenta regresiva. Acepta → `refreshToken()`; cancela o expira → `logout()`.

### 3.4 Logout

```
[Front] AuthService.logout()
        → POST /api/auth/logout/  ← blacklistea fvx_refresh + Set-Cookie con Max-Age=0
        → AuthService.clearLocalSession() — borra currentUser, llama MenuService.clear() e InboxService.stop()
        → router.navigate(['/login'])
```

Si el backend falla (server down, network), `finalizeLogout()` ejecuta igualmente la limpieza local + redirect. El access tiene lifetime corto, así que la "sesión zombi" del backend (refresh aún en BD) muere por sí sola.

---

## 4. Autorización — capas defensivas

Tres niveles, cada uno con su rol. **Los tres se complementan, no se sustituyen.**

### 4.1 Backend — `MenuItem.allowed_roles`

Fuente de verdad operativa. Cada item del sidebar declara qué roles lo ven (`["EDITOR", "ADMIN"]`). El backend filtra el árbol antes de servirlo en `GET /api/v1/menus/tree/`.

### 4.2 Frontend — `menuAccessGuard` (canActivateChild en el shell)

Si la ruta a la que navegas NO está en tu árbol filtrado → redirect a `/dashboard`. Es **la primera línea**, baratísima.

### 4.3 Frontend — `roleGuard` / `permissionGuard` (rutas fuera del menú)

Para rutas que el `MenuItem` no expone (`/settings/system`, `/audit-log`, URLs directas), aplicar `roleGuard('ADMIN')` o `permissionGuard('feature.action')`.

> **Regla de oro** ([`core-guards-interceptors.md` §1.5](core-guards-interceptors.md)): no duplicar la fuente de verdad. Rutas en el menú → backend decide. Rutas fuera → guards frontend deciden. Mezclarlos genera UX inconsistente.

### 4.4 Frontend — gating intra-pantalla (`*appHasMinRole` / `*appCan`)

Botones, columnas o controles **dentro** de una pantalla accesible se ocultan con directivas estructurales:

```html
<button mat-button *appHasMinRole="'ADMIN'" (click)="onDelete()">Delete</button>
<button mat-icon-button *appCan="'users.delete'" (click)="onDelete()">…</button>
```

Esto reduce ruido visual pero **no es seguridad real** — un usuario malicioso puede borrar el `if` con DevTools y disparar la acción. La verdadera enforcement está en el backend (DRF permissions + `Profile.role` + `IsAdminOrReadOnly`).

### 4.5 Permisos granulares (`Permission`)

Mapa estático en `core/auth/permissions.ts`:

```ts
export type Permission =
  | 'users.read' | 'users.create' | 'users.update' | 'users.delete' | 'users.export'
  | 'groups.read' | 'groups.create' | 'groups.update' | 'groups.delete'
  | 'menu.manage' | 'settings.manage';

export const PERMISSION_MIN_ROLE: Record<Permission, UiRole> = {
  'users.delete': 'ADMIN',
  // …
};
```

Hoy `AuthService.can(perm)` deriva del mapa. El día que el backend exponga lista por usuario, solo cambia el cuerpo de `can()` y los consumidores quedan intactos.

---

## 5. HTTP — defensas en el cliente

### 5.1 Interceptores y orden

```
errorInterceptor → requestIdInterceptor → localeInterceptor →
credentialsInterceptor → authInterceptor → httpLoggingInterceptor
```

Detalle en [`core-guards-interceptors.md` §2](core-guards-interceptors.md). Lo relevante para seguridad:

- **`credentialsInterceptor`** limita `withCredentials: true` al backend propio. Sin esto, cualquier llamada a un dominio tercero también enviaría las cookies HttpOnly (que técnicamente no irían, pero hubo navegadores que dispararon preflights innecesarias).
- **`requestIdInterceptor`** añade `X-Request-Id` (UUID v4) — correlación segura entre logs front y back para soporte/audit.
- **`errorInterceptor`** normaliza errores. **Toasts globales solo en 5xx/network** (el usuario no puede recuperarlos); 4xx propagan en silencio para que el feature decida (errores inline, redirects, etc.). Esto evita ruido y, más importante, evita filtrar detalles internos por defecto.

### 5.2 `HttpError` — contrato estable

Después del `errorInterceptor`, todos los subscribers ven `HttpError` (no `HttpErrorResponse`):

```ts
class HttpError {
  status: number;
  kind: 'network' | 'unauthorized' | 'forbidden' | 'not-found'
      | 'validation' | 'conflict' | 'server' | 'unknown';
  message: string;
  fieldErrors: Record<string, string[]>;
  code: string | null;
  raw: HttpErrorResponse;  // por si hace falta inspeccionar
}
```

Patrón seguro de consumo:

```ts
this.api.create('users', data).subscribe({
  error: (err: HttpError) => {
    if (err.isValidation) this.applyFieldErrors(err.fieldErrors);
    // 5xx/red ya tienen toast del errorInterceptor; no hacer nada más
  },
});
```

No imprimir `err.raw` ni `err.message` directo al usuario en producción — usar las claves i18n `errors.*` o el `code` semántico.

### 5.3 Logging diagnóstico

`httpLoggingInterceptor` está **off por default** (`APP_CONFIG.httpLogging=false` en prod). Cuando se enciende:

- Bodies truncados a **12 000 caracteres** para no llenar la consola.
- `FormData` se loguea como `[FormData: keys…]` sin valores (passwords, files, etc. no se imprimen).
- Cada línea incluye los primeros 8 chars del `X-Request-Id` para correlacionar con el backend.

**No activar `httpLogging` en producción** — los bodies pueden contener PII / datos sensibles.

---

## 6. CORS — qué exige el frontend

El backend declara en `settings.py`:

- `CORS_ALLOWED_ORIGINS` (dev: `localhost:4200`, `localhost:3000`; prod: dominios reales del front).
- `CORS_ALLOW_CREDENTIALS = True` (obligatorio para que el browser envíe cookies en cross-origin).
- `CORS_ALLOW_ALL_ORIGINS = False` en producción (el front DEBE estar en la whitelist; sin esto las cookies no viajan).

**Implicaciones para devs:**

1. Al levantar un nuevo dominio del front, agregarlo a `DJANGO_CSRF_TRUSTED_ORIGINS` (para `/admin/`) y `CORS_ALLOWED_ORIGINS` (para `/api/v1/*`). Si la API responde correcto pero la cookie no se setea en el browser → revisar CORS.
2. Al cambiar `apiUrl`/`authUrl` en `environment.ts`, sincronizar con la whitelist del backend.
3. **No usar `*` en `CORS_ALLOWED_ORIGINS`** con `CORS_ALLOW_CREDENTIALS=True`: los browsers rechazan esa combinación (no envían cookies).

---

## 7. Defensas anti-XSS

### 7.1 Angular templates

Angular **escapa todo el binding `{{ }}`** por defecto. Los únicos riesgos vivos son:

- `innerHTML` con `bypassSecurityTrust*`: **prohibido salvo confirmación explícita** con DomSanitizer y origen confiable (markdown del propio backend, no input de usuario).
- `[href]` con `javascript:` URIs: Angular bloquea esto automáticamente.

Cuando una feature necesite renderizar HTML del backend (audit log, notificaciones con formato), usar **`DomSanitizer.sanitize(SecurityContext.HTML, value)`** y nunca `bypassSecurityTrustHtml` sobre input que no haya pasado por una purga server-side.

### 7.2 Inbox / notificaciones

`InboxService` consume `/api/v1/notifications/` cuyo body se renderiza como **texto plano** en `app-inbox` (no `innerHTML`). Si en algún momento el backend empieza a emitir HTML enriquecido, hay que pasarlo por un sanitizer antes de bindearlo.

### 7.3 Command palette

Los items vienen del menú del backend (texto + icon ligature) y de `CommandRegistry` (registrados en el código del front). Sin `[innerHTML]`. Seguro.

---

## 8. Datos en el cliente

| Almacén | Qué guarda hoy | Sensibilidad |
|---|---|---|
| Cookies HttpOnly | `fvx_access`, `fvx_refresh` | Alta — pero inaccesibles desde JS. |
| Cookie JS | `fvx_access_exp` (epoch) | Nula — no autentica nada. |
| `localStorage` | `fvx_lang`, `fvx-theme-id`, `fvx-page-content-width`, `fvx-appearance-section-expanded` | Nula — preferencias de UI. |
| `sessionStorage` | — | (no se usa) |
| `assets/config.json` | tokens públicos del front (ej. `mapboxToken`) | Baja — gitignored; ver §8b. |
| Signals en memoria | `AuthService.currentUser`, `InboxService.items`, `MenuService.sections` | Mediana — son los datos del usuario, vivos hasta refresh. |

**Cleanup post-migración:** `AuthService.constructor` ejecuta `localStorage.removeItem('access_token' / 'refresh_token')` para borrar restos de la era pre-cookies. Una vez que todos los usuarios hayan refrescado al menos una vez, ese bloque se puede borrar (ver comentario en el código).

---

## 8b. Tokens públicos del frontend — patrón `config.json` runtime

Para API keys que el frontend **necesita exponer al browser** (Mapbox `pk.*`, Google Maps key, Stripe publishable key, Sentry DSN del front…), el patrón canónico es **runtime config**, no hardcodear en `environment.ts`.

**Por qué.** Angular compila el frontend estáticamente: cualquier valor en `environment.ts` queda (1) en el **historial de git** y (2) en el **bundle JS** que descarga el browser. El patrón `config.json` saca el valor de ambos:

```
EN GIT (versionado)                    GITIGNORED (por deploy)
├── config.example.json  → ""          └── public/assets/config.json → "pk.real…"
├── environment.ts → sin token
└── .gitignore → /public/assets/config.json
```

**Cómo funciona.** `RuntimeConfigService` (`core/config/runtime-config.service.ts`) hace `fetch('assets/config.json')` en el **app initializer** (`provideAppInitializer` en `app.config.ts`), **antes** del bootstrap. Los consumidores (ej. `MapboxService`) leen el valor de ese service, no de `APP_CONFIG`. Usa `fetch` directo (no `HttpClient`) porque corre antes de que el árbol de DI / interceptores esté listo.

**Verdad incómoda.** Un token que pinta algo visible (mapa, captcha) **siempre** termina en el browser — es inevitable. "Sacarlo del git" es **higiene del repo** (no queda en el historial, cada ambiente usa el suyo, el mismo build sirve para todos), **NO una barrera de seguridad**. La protección real es **restringir el token por dominio/referrer** en el panel del proveedor (Mapbox → URL restrictions, etc.).

**Agregar una key nueva:**
1. Campo en `RuntimeConfig` (interface del service) + en `config.example.json` (con `""`).
2. El dev/deploy copia `config.example.json` → `config.json` y rellena.
3. El consumidor lee `inject(RuntimeConfigService).<campo>`.

> **Secretos de verdad** (sin los que un atacante haría daño: `sk.*` de Stripe, AWS secret keys, `DJANGO_SECRET_KEY`) **NUNCA** van al frontend — ni en `config.json` ni en ningún lado del cliente. Viven en el backend (`.env`) y, si el front los necesita indirectamente, se proxean server-side.

---

## 9. Política frente a errores y secretos

- **Nunca imprimir un token en logs** — con cookies HttpOnly esto es estructural, pero la regla aplica a los archivos `.env*` y a cualquier debug.
- **`environment(.prod).ts`** no lleva tokens ni secretos — los **tokens públicos del front** van a `config.json` (runtime, gitignored — ver §8b); los **secretos reales** viven solo en el backend (`.env`).
- **`GOOGLE_OAUTH_CLIENT_ID`** y **`mapboxToken`** son públicos (el browser los ve igual). Pero **`AWS_SES_SECRET_ACCESS_KEY`** y `DJANGO_SECRET_KEY` viven solo en el backend y nunca cruzan al front.
- **Errores 5xx** llegan al usuario con `code` semántico, no con stack traces (`HttpError.message` se sanea en `errorInterceptor.buildGlobalMessage`).

---

## 10. Checklist para una feature nueva

- [ ] **Ruta nueva:** si va al menú, declarar `allowed_roles` en `MenuItem` del backend. Si no, agregar `roleGuard` / `permissionGuard` en `app.routes.ts`.
- [ ] **API call:** usar `ApiService` (hereda los 6 interceptores) — no inyectar `HttpClient` directo a menos que sea para recursos externos.
- [ ] **Botones sensibles:** envolverlos con `*appHasMinRole` / `*appCan` para UX, pero validar también en backend (DRF permissions). Nunca confiar solo en el guard del frontend.
- [ ] **Forms:** mapear `HttpError.fieldErrors` a `FormControl.setErrors`; no exponer `err.raw` al usuario.
- [ ] **Datos sensibles en UI:** PII, números de cuenta, etc. → usar `appTruncateTooltip` o pipes de máscara según el caso; nunca renderizar HTML del backend con `[innerHTML]` sin sanitizar.
- [ ] **i18n:** mensajes de error con claves `errors.*` o `<feature>.errors.*`, no hardcoded.
- [ ] **`httpLogging`:** dejarlo en `false` para entornos staging/prod. Si lo activas para debug, asegurarte de no commitear `environment.ts` con `httpLogging: true`.
- [ ] **Si la feature persiste preferencias del usuario:** usar `UserUiPreferencesService` (PATCH a `/me/ui-preferences/`), no `localStorage` directo, para que la preferencia siga al usuario entre devices.
- [ ] **Si la feature necesita una API key pública** (mapa, captcha, etc.): NO hardcodear en `environment.ts` → agregarla a `RuntimeConfig` + `config.example.json` y leerla de `RuntimeConfigService` (§8b). Restringir la key por dominio en el panel del proveedor. Secretos reales (`sk.*`, etc.) → solo backend.

---

## 11. Referencias cruzadas

- [`core-guards-interceptors.md`](core-guards-interceptors.md) — guards, interceptores, directivas con detalle de API.
- [`core-services.md`](core-services.md) — `AuthService`, `SessionTimeoutService`, `UserUiPreferencesService`.
- [`i18n.md`](i18n.md) — `Accept-Language` automático en interceptor, `role_label` traducido por backend.
- [`../../fvx-backend/docs/architecture.md`](../../fvx-backend/docs/architecture.md) — modelo completo de JWT cookies, refresh, blacklist en backend.
- [`../../fvx-backend/docs/social-login-setup.md`](../../fvx-backend/docs/social-login-setup.md) — configuración Google / Apple con FedCM.
- [`../../AGENT.md`](../../AGENT.md) — reglas globales del monorepo: cambios al núcleo de auth requieren coordinación cross-team.
