# Guards, interceptores HTTP y directivas transversales

Referencia para humanos e IAs: piezas en `src/app/core/` que no son servicios de negocio pero que afectan a **todas** las rutas y llamadas HTTP.

---

## 1. Guards de ruta — `core/guards/`

Todos son `CanActivateFn` standalone (pensadas para usar directamente en `app.routes.ts`).

### 1.1 `authGuard` — `core/guards/auth.guard.ts`

- **Rol:** proteger rutas autenticadas.
- **Regla:** si `AuthService.hasToken()` → `true`; si no, redirige a `/login` y devuelve `false`.

### 1.2 `loginGuard` — `core/guards/auth.guard.ts`

- **Rol:** impedir entrar a `/login` si ya hay token.
- **Regla:** sin token → `true`; con token → redirige a `/` y devuelve `false`.

### 1.3 `roleGuard(minRole)` — `core/guards/role.guard.ts`

- **Rol:** restringir una ruta por **rol jerárquico** (`'VIEWER' < 'EDITOR' < 'ADMIN'`; staff bypass total).
- **Factory:** devuelve `CanActivateFn`; usar **después** de `authGuard`.
- **Falla:** redirige a `/forbidden` (página de sistema con shell del layout).
- **Cuándo usar:** acceso a una página requiere al menos cierto nivel de la jerarquía (ej.: pantallas admin = `ADMIN`, CRUDs operativos = `EDITOR`).

```ts
{
  path: 'audit-log',
  loadComponent: () => import('./features/audit/audit-log.component'),
  canActivate: [authGuard, roleGuard('ADMIN')],
}
```

### 1.4 `permissionGuard(permission)` — `core/guards/role.guard.ts`

- **Rol:** restringir una ruta por **permiso granular** (`feature.action`).
- **Factory:** devuelve `CanActivateFn`; usar después de `authGuard`.
- **Falla:** redirige a `/forbidden`.
- **Cuándo usar:** acceso depende de una capacidad específica que no se mapea limpio a "≥ EDITOR".
- **Implementación actual:** delega en `AuthService.can()`, que hoy consulta el mapa estático `PERMISSION_MIN_ROLE` (`core/auth/permissions.ts`). El día que el backend exponga permisos por usuario (`Profile.permissions` o `user_permissions`), se cambia el cuerpo de `AuthService.can()` y los consumidores quedan intactos.

```ts
{
  path: 'reports/export',
  canActivate: [authGuard, permissionGuard('reports.export')],
}
```

### 1.5 `menuAccessGuard` — `core/guards/menu-access.guard.ts`

- **Rol:** validar que la ruta esté en el menú del usuario (filtrado en backend por rol).
- **Aplicado en:** padre del shell (`canActivateChild`), no en rutas hoja.
- **Complementario a `roleGuard`:** si el admin olvida poner `allowed_roles` en el `MenuItem`, `roleGuard` es la red de seguridad.

> ⚠️ **Regla del template — no duplicar la fuente de verdad de autorización.**
>
> Las rutas que **están en el menú** (`MenuItem`) deben dejar la decisión de "quién entra" al backend vía `allowed_roles`. **No** añadir `roleGuard` / `permissionGuard` a esas rutas: dos checks independientes que pueden contradecirse generan UX confusa (el sidebar muestra el link pero al hacer clic → `/forbidden`).
>
> `roleGuard` / `permissionGuard` se usan **solo en rutas que NO están en el menú**: URLs directas que el sidebar no expone (p. ej. `/settings/system` para superadmin, `/audit` solo accesible vía link copiado, etc.). Ahí sí justifica codificar la regla porque el backend no tiene un `MenuItem` que la gobierne.
>
> Para limitaciones por rol **dentro** de una pantalla (botones, columnas), seguir usando `*appHasMinRole` / `*appCan` (§3.1, §3.2) — esos no interceptan la navegación.

### 1.6 `unsavedChangesGuard` — `core/guards/unsaved-changes.guard.ts`

- **Rol:** avisar al usuario antes de salir de una página con cambios sin guardar.
- **Tipo:** `CanDeactivateFn` (no `CanActivate`); se ejecuta al abandonar la ruta.
- **Opt-in en tres piezas** (todas deben coincidir para que se dispare):
  1. La ruta declara `canDeactivate: [unsavedChangesGuard]`.
  2. El componente `implements HasUnsavedChanges`.
  3. `hasUnsavedChanges()` devuelve `true` (ej. `form.dirty`).
- **Falla:** abre `app-confirm-dialog` con título/mensaje de `unsavedChanges.*`. Si el usuario confirma "Salir", devuelve `true`; si elige "Quedarme", devuelve `false` y la navegación se cancela.
- **Importante — limitación de `CanDeactivate`**: solo cubre **navegación dentro de Angular**. **No** dispara en recarga del navegador, cierre de pestaña, o navegación a URL externa. Para esos casos usa {@link bindBeforeUnloadWarning} (helper en el mismo archivo).

```ts
// Componente con form largo en una ruta dedicada
import { HasUnsavedChanges, bindBeforeUnloadWarning } from '../../core/guards/unsaved-changes.guard';

@Component({ /* ... */ })
export class InvoiceEditPage implements HasUnsavedChanges {
  form = this.fb.group({ /* ... */ });

  constructor() {
    // Opcional pero recomendado: también protege F5 / cerrar pestaña.
    bindBeforeUnloadWarning(this, inject(DestroyRef));
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }
}

// app.routes.ts
{
  path: 'invoices/edit/:id',
  loadComponent: () => import('./features/invoices/edit-page').then(m => m.InvoiceEditPage),
  canDeactivate: [unsavedChangesGuard],
}
```

**Cuándo NO usarlo:**
- Listas, dashboards, páginas de solo lectura → no hay nada que perder.
- Filtros / búsqueda → son toggles inmediatos, no "edits" con commit.
- Forms en `MatDialog` (CRUD edit) o `EntityDrawer` (perfil) — no hay navegación de ruta cuando cierras un diálogo/drawer. Usa solo `bindBeforeUnloadWarning` ahí.

**`bindBeforeUnloadWarning(component, destroyRef)`**

Helper para forms en diálogo/drawer (o complemento al guard en rutas). Instala un listener `beforeunload` que avisa al usuario si recarga el navegador, cierra la pestaña o navega fuera del dominio mientras hay cambios pendientes. El navegador muestra su diálogo nativo (no personalizable; cumple su función: parar el clic accidental). Cleanup automático vía `DestroyRef`.

### Uso combinado en `app.routes.ts`

```typescript
import { authGuard, loginGuard } from './core/guards/auth.guard';
import { menuAccessGuard } from './core/guards/menu-access.guard';
import { roleGuard, permissionGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [menuAccessGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component') },
      {
        path: 'users',
        canActivate: [roleGuard('EDITOR')],          // jerárquico
        loadComponent: () => import('./features/users/users.component'),
      },
      {
        path: 'audit-log',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/audit/audit-log.component'),
      },
      {
        path: 'reports/export',
        canActivate: [permissionGuard('reports.export')],  // granular
        loadComponent: () => import('./features/reports/export.component'),
      },
    ],
  },
];
```

### Limitaciones actuales

- `authGuard` valida **presencia de sesión**: `AuthService.hasToken()` devuelve `true` si hay `currentUser` hidratado **o** si la cookie no-HttpOnly `fvx_access_exp` aún no caducó. No autentica nada — el backend hace el check real con la cookie HttpOnly en cada request. Esta función es un proxy UX para el guard y el bootstrap.
- `roleGuard` / `permissionGuard` consultan el rol del usuario en memoria (`AuthService.user()`). Si la app arranca sin haber cargado `/users/me/` todavía, devuelven `false` y redirigen. Asegúrate de que `loadCurrentUser()` haya resuelto antes de navegar a una ruta gated.
- Permisos por usuario (lista del backend) no están implementados; ver nota en §1.4.

---

## 2. Interceptores HTTP — `core/interceptors/`

Registrados en `app.config.ts`. El **orden importa**: cada interceptor se ejecuta en orden ascendente para la request, y en orden descendente para la response.

```typescript
provideHttpClient(withInterceptors([
  errorInterceptor,       // 1. Normaliza errores HTTP → HttpError + toast en 5xx/network
  requestIdInterceptor,   // 2. Añade X-Request-Id (UUID v4) para correlación front/back
  localeInterceptor,      // 3. Accept-Language hacia apiUrl/authUrl
  credentialsInterceptor, // 4. withCredentials: true (envía cookies HttpOnly de auth)
  authInterceptor,        // 5. Refresh + retry en 401
  httpLoggingInterceptor, // 6. Logs de salida y entrada (solo si APP_CONFIG.httpLogging)
]))
```

### 2.1 `errorInterceptor` — normalización de errores

- **Archivo:** `core/interceptors/error.interceptor.ts`
- **Rol:** envuelve cada `HttpErrorResponse` en una clase {@link HttpError} estable (`status`, `kind`, `message`, `fieldErrors`, `code`, `raw`) para que features no parseen DRF/Django en cada subscriber.
- **Toasts globales** automáticos **solo** en errores que el feature no puede recuperar: `status === 0` (red) y 5xx. Los 4xx propagan en silencio para que cada pantalla decida (errores inline en form, dialogs, retries).
- **Excepción auth:** corre **después** de `authInterceptor` en la cadena de respuestas, así que un 401 normaliza solo si el refresh + retry también falló. Si el segundo intento tras refresh funciona, este interceptor no ve el 401 inicial.
- **Patrón de consumo:** subscribers pueden hacer `err instanceof HttpError` y leer `err.fieldErrors` directamente.

### 2.2 `requestIdInterceptor` — correlación de logs

- **Archivo:** `core/interceptors/request-id.interceptor.ts`
- **Rol:** genera un UUID v4 por request (`crypto.randomUUID()` o fallback) y lo añade como header **`X-Request-Id`** + lo persiste en el `HttpContext` (token `REQUEST_ID` en `core/http/http-context.ts`).
- **Por qué importa:** el backend loguea el mismo id; cuando el usuario reporta un error podemos pedir el id para encontrar el trace exacto. El `errorInterceptor` lo incluye en el toast cuando aplica.

### 2.3 `localeInterceptor` — `Accept-Language`

- **Archivo:** `core/interceptors/locale.interceptor.ts`
- **Rol:** añade `Accept-Language: <lang activo>` solo a requests cuya URL empieza con `APP_CONFIG.apiUrl` o `APP_CONFIG.authUrl`. Skip a CDNs/Google GSI/etc. para evitar 0 valor + posibles preflights.
- **Lee de:** `TranslocoService.getActiveLang()` (defaultea a `'en'`).

### 2.4 `credentialsInterceptor` — cookies HttpOnly de auth

- **Archivo:** `core/interceptors/credentials.interceptor.ts`
- **Rol:** activa `withCredentials: true` solo en requests al backend propio (`apiUrl`/`authUrl`) para que el browser envíe las cookies HttpOnly de sesión (`fvx_access`, `fvx_refresh`). No aplica a recursos externos — ahí solo generaría errores de CORS innecesarios.
- **Orden:** antes de `authInterceptor` porque el refresh también necesita las cookies viajando.

### 2.5 `authInterceptor` — refresh + retry en 401

- **Archivo:** `core/interceptors/auth.interceptor.ts`
- **Rol:** maneja el ciclo refresh/retry sobre 401. **No inyecta `Authorization: Bearer`** — los JWT viven en cookies HttpOnly que el browser envía solo (gracias a `credentialsInterceptor`).
- **Excepción:** URLs de auth (`/auth/token`, `/auth/social/`, `/auth/logout`) pasan sin retry — un 401 en login significa "credenciales malas", no "token expirado".

**Flujo en 401**

1. Primera 401 → llama a `AuthService.refreshToken()` (POST `/auth/token/refresh/`); la cookie `fvx_refresh` viaja sola. Si el backend renueva, reintenta la request original.
2. 401 concurrentes → esperan al `refreshTokenSubject` (BehaviorSubject) para reintentarse cuando llegue la señal de éxito.
3. Si el refresh devuelve 401/403 → `AuthService.clearLocalSession()` + redirect a `/login`.
4. Si el refresh devuelve 5xx/red → propaga el error sin logout (la sesión puede ser recuperable).

**Consecuencia práctica** — con `ApiService` no hay que manejar 401 ni headers manualmente: el interceptor + cookies hacen todo.

### 2.6 `httpLoggingInterceptor` — diagnóstico

- **Archivo:** `core/interceptors/http-logging.interceptor.ts`
- **Activación:** solo si `APP_CONFIG.httpLogging === true`. En producción **dejarlo `false`**.
- **Qué registra** (con el `X-Request-Id` corto como prefijo):
  - Salida: `[HTTP abcd1234] → METHOD URL` + payload resumido (body JSON o `[FormData: keys…]`, truncado a 12 000 caracteres).
  - Respuesta OK: `[HTTP abcd1234] ← STATUS METHOD URL (Nms)` con cuerpo resumido.
  - Error: `[HTTP abcd1234] ✗ METHOD URL (Nms)` con `err` y `err.error` resumidos.
- No altera el flujo — es puro `tap`.

### 2.7 `HttpError` — el contrato normalizado

Definido en `core/http/http-error.ts`. Forma estable que ven los subscribers después de `errorInterceptor`:

```ts
class HttpError {
  readonly status: number;
  readonly kind: HttpErrorKind;        // 'network' | 'unauthorized' | 'forbidden' | 'not-found' | 'validation' | 'conflict' | 'server' | 'unknown'
  readonly message: string;
  readonly fieldErrors: Record<string, string[]>;
  readonly code: string | null;
  readonly raw: HttpErrorResponse;
  get isNetwork(): boolean; get isAuth(): boolean; get isForbidden(): boolean;
  get isNotFound(): boolean; get isValidation(): boolean; get isServer(): boolean;
}
```

**Uso típico en feature:**

```ts
this.api.create('users', data).subscribe({
  next: u => this.router.navigate(['/users', u.id]),
  error: (err: HttpError) => {
    if (err.isValidation) {
      this.applyFieldErrors(err.fieldErrors);  // mapping directo a FormControl.setErrors
      return;
    }
    // 5xx/network ya tienen toast del errorInterceptor; este branch no hace nada
  },
});
```

---

## 3. Directivas transversales

### 3.1 `*appHasMinRole` — gating en plantilla por rol

- **Archivo:** `core/directives/has-min-role.directive.ts`
- **Selector:** `[appHasMinRole]` — directiva **estructural** (usar con `*`).
- **Standalone:** sí — importar `HasMinRoleDirective` en el `imports` del componente anfitrión.
- **Input:** `appHasMinRole: 'VIEWER' | 'EDITOR' | 'ADMIN'` (requerido).

**Regla** — renderiza el template si `AuthService.minRoleAtLeast(role)` devuelve `true` (staff siempre). Reacciona a cambios del signal `auth.user` (no hace polling).

**Ejemplo**

```html
<button mat-button *appHasMinRole="'ADMIN'" (click)="onDelete()">
  Delete
</button>
```

```typescript
import { HasMinRoleDirective } from '../../core/directives/has-min-role.directive';

@Component({
  standalone: true,
  imports: [HasMinRoleDirective, /* … */],
  // template: …
})
export class MyPageComponent {}
```

**Complementario al guard** — los guards restringen la **ruta**, la directiva oculta **elementos concretos** (botones, columnas) dentro de una página accesible.

### 3.2 `*appCan` — gating en plantilla por permiso granular

- **Archivo:** `core/directives/can.directive.ts`
- **Selector:** `[appCan]` — directiva **estructural** (usar con `*`).
- **Standalone:** sí — importar `CanDirective` en el `imports` del componente anfitrión.
- **Input:** `appCan: Permission` (requerido). El union `Permission` vive en `core/auth/permissions.ts`.

**Regla** — renderiza el template si `AuthService.can(permission)` devuelve `true`. Reacciona al signal `auth.user`.

**Ejemplo**

```html
<button mat-icon-button *appCan="'users.delete'" (click)="onDelete()">
  <mat-icon>delete</mat-icon>
</button>

<button mat-stroked-button *appCan="'reports.export'" (click)="onExport()">
  Export
</button>
```

```typescript
import { CanDirective } from '../../core/directives/can.directive';

@Component({
  standalone: true,
  imports: [CanDirective, /* … */],
})
export class MyPageComponent {}
```

**Diferencia con `*appHasMinRole`:**
- `*appHasMinRole="'EDITOR'"` → jerarquía (≥ EDITOR pasa). Útil cuando la regla es "este botón requiere al menos cierto nivel".
- `*appCan="'users.delete'"` → permiso por nombre. Útil cuando los permisos no son perfectamente jerárquicos o cuando el día de mañana el backend exponga permisos por usuario.

Hoy `*appCan` deriva de `PERMISSION_MIN_ROLE` (mapa estático en `core/auth/permissions.ts`), así que es funcionalmente equivalente a un `*appHasMinRole` con el mínimo correspondiente; la ventaja es **legibilidad** y **portabilidad** para el día que cambie la fuente de permisos.

### 3.3 `truncateTooltip` — ver `design-fvx.md` (catálogo, directiva `appTruncateTooltip`)

Directiva de `shared/directives/`, no va aquí porque no es transversal al core.

---

## 4. Checklist para una nueva ruta protegida

- [ ] Ruta bajo `LayoutComponent` (hereda `authGuard` + `menuAccessGuard`).
- [ ] Decidir capa de gating:
  - Solo autenticación → nada extra.
  - Mínimo de rol → `canActivate: [roleGuard('EDITOR')]` (o `'ADMIN'`).
  - Permiso específico → `canActivate: [permissionGuard('feature.action')]` (y declarar la `Permission` en `core/auth/permissions.ts`).
- [ ] Asegurar coherencia con backend: si `roleGuard('EDITOR')` está aplicado, el `MenuItem` correspondiente debería tener `allowed_roles=['EDITOR','ADMIN']`. Las dos capas se complementan.
- [ ] Si la vista expone acciones sensibles, envolverlas con `*appHasMinRole="'…'"` o `*appCan="'…'"` para esconder botones por usuario.
- [ ] En el feature component, inyectar `NotificationService` para feedback, `ApiService` para llamadas.
- [ ] No intentar manejar 401/refresh manualmente — lo hace `authInterceptor`.

---

## Relacionado

- [`core-services.md`](core-services.md) — `AuthService.minRoleAtLeast`, `refreshToken`, `loadCurrentUser` que consume esto.
- [`security.md`](security.md) — cookies HttpOnly, CSRF, refresh proactivo, política de logout.
- [`add-crud-model.md`](add-crud-model.md) — pasos para montar una ruta nueva; usa estos guards.
- [`custom-site.md`](custom-site.md) — patrones de página donde aplicar gating fino.
