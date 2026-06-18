# Sistema de Menú dinámico — modelo, API y diseño del mantenedor

Documento de referencia para diseñar un **mantenedor Angular** que reemplace al Django admin a la hora de configurar el menú de navegación del shell. Pensado para que un agente de diseño (ej. Claude Design) entienda el dominio sin tener que leer todo el repo.

---

## 1. Para qué sirve el sistema

El sidebar del admin **no está hardcoded en el front**: se carga desde el backend en cada arranque vía `GET /api/v1/menus/tree/`. Permite a un admin del producto:

- Añadir/quitar items del sidebar sin tocar código.
- Cambiar nombres, iconos, rutas, orden, sección agrupadora.
- Restringir cada item a una lista de roles (`allowed_roles`).
- Tener un menú "default" único que sirve a todos los usuarios autenticados.

Hoy esta configuración se hace **solo desde Django admin** (`/admin/api/menu/`). El objetivo es construir un **mantenedor nativo en Angular** que permita al admin del producto editarlo sin entrar al admin de Django.

### Cómo afecta a la app

| Capa | Efecto |
|---|---|
| **Sidebar** (`LayoutComponent`) | Cada `MenuItem` se renderiza como un link con icono + nombre. Agrupado por `MenuSection`. |
| **`menuAccessGuard`** | Si la ruta a la que navegas NO está en tu menú → te redirige a `/dashboard`. Es la fuente de verdad de "¿puedo entrar a esta página?". |
| **Command palette `⌘K`** | Los comandos de "Navegación" se generan dinámicamente desde el menú. |
| **Roles** | El `allowed_roles` de cada item filtra qué ve cada usuario según su `Profile.role` (`VIEWER`/`EDITOR`/`ADMIN`). |

---

## 2. Modelo de datos (Django backend)

Tres modelos anidados, todos con `created`/`modified` automáticos, `uuid` prefijado (`MNU-`/`SEC-`/`MIT-`) y `slug` único auto-generado del `name`.

### 2.1 `Menu`

Contenedor raíz. Una app puede tener varios menús pero **solo uno marcado como `is_default`** (lo enforzan los `save()` del modelo).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | PK |
| `uuid` | str | `MNU-<uuid4>`, único, read-only |
| `name` | str(255) | Visible, ej. "Default navigation" |
| `slug` | slug(255) | Auto-generado del `name`, único |
| `description` | text (blank) | Opcional |
| `is_default` | bool | Solo uno puede ser `true` (al guardar uno como default, los demás se ponen `false` automáticamente) |
| `is_active` | bool | Soft enable/disable |
| `created`, `modified` | datetime | Auto |

**Reglas de negocio:**
- Al guardar un menú con `is_default=true`, todos los demás se actualizan a `false`.
- `slug` se calcula automáticamente del `name` la primera vez. No editable después (para mantener referencias estables).
- `uuid` es read-only.
- El borrado debe ser cuidadoso: el `MenuItem` y `MenuSection` cascadean (FK con `on_delete=CASCADE`).

### 2.2 `MenuSection`

Agrupador visual dentro de un `Menu`. En el sidebar es el "título de sección" en gris (HOME, ADMINISTRATION, DEV, etc.).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | PK |
| `uuid` | str | `SEC-<uuid4>` |
| `menu` | FK → `Menu` | Padre. `on_delete=CASCADE` |
| `name` | str(255) | Visible, ej. "Administration" |
| `slug` | slug(255) | Auto |
| `description` | text (blank) | Opcional |
| `order` | int (positive) | Para ordenar secciones dentro del menú. Default 0 |
| `is_active` | bool | Soft |
| `created`, `modified` | datetime | Auto |

**Ordenación final del sidebar:** `ORDER BY section.order ASC, section.id ASC`.

### 2.3 `MenuItem`

El link concreto que el usuario ve y clickea.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | PK |
| `uuid` | str | `MIT-<uuid4>` |
| `section` | FK → `MenuSection` | Padre. `on_delete=CASCADE` |
| `name` | str(255) | Visible, ej. "Users" |
| `slug` | slug(255) | Auto |
| `description` | text (blank) | Opcional |
| `route` | str(255) | Path Angular sin dominio, ej. `/users`, `/audit`. Empieza con `/` |
| `icon` | str(80) | Nombre de glifo Material Icons clásico (ligature), ej. `people`, `dashboard`. Vacío → el front muestra un icono `label` |
| `order` | int (positive) | Para ordenar items dentro de la sección. Default 0 |
| `allowed_roles` | JSONField (list) | `["VIEWER", "EDITOR", "ADMIN"]`. **Fail-closed:** lista vacía o `null` = solo staff lo ve (los no-staff NO). **Staff pasa siempre** (bypass) |
| `is_active` | bool | Soft |
| `created`, `modified` | datetime | Auto |

**`allowed_roles` — semántica (fail-closed, ver `api/roles.py::user_can_see_menu_item`):**
- `[]` o `null`: **solo staff** lo ve. Un usuario no-staff NO lo ve. (Esto fuerza a declarar explícitamente quién accede; un item no se "escapa" a producción sin gating consciente.)
- `["VIEWER"]`: staff + viewers (filtrado exclusivo, no inclusivo: si pones solo VIEWER, los EDITOR no lo ven).
- `["EDITOR", "ADMIN"]`: staff + editores y admins.
- Si el usuario es `is_staff=true`, siempre lo ve (bypass del filtro), tenga o no roles el item.

**Iconos válidos:** cualquier ligature de [Google Material Icons clásico](https://fonts.google.com/icons?icon.set=Material+Icons). El frontend carga *Material Icons* + *Material Icons Outlined* (NO *Material Symbols*), así que un glifo que solo exista en Symbols se vería en blanco. Mismo nombre que se pasaría a `<mat-icon>` en Angular. Hay una validación parcial en backend (`MenuItemAdminForm` usa un widget custom con autocomplete) pero no es estricta — cualquier string llega al front, que renderiza `<mat-icon>{{icon}}</mat-icon>`.

### 2.4 Diagrama de relaciones

```
Menu (1)
  ├── MenuSection (N)   ← order asc
  │     ├── MenuItem (N)   ← order asc, filtrado por allowed_roles
  │     ├── MenuItem
  │     └── ...
  ├── MenuSection
  └── ...
```

**Cardinalidad real esperada en producción:**
- 1-2 menús totales (el `is_default` + algún experimento).
- 3-8 secciones por menú.
- 2-10 items por sección.
- Total típico: ~30-60 items.

Esto es relevante para la UX: **no es una lista enorme**, cabe perfectamente en una sola pantalla con expandibles.

---

## 3. API actual (lo que ya existe)

### `GET /api/v1/menus/tree/`

Único endpoint que existe hoy. Devuelve el menú resuelto para el usuario actual (filtrado por sus roles).

**Auth:** JWT (`IsAuthenticated`).

**Query params opcionales:**
- `?menu_uuid=<uuid>` — fuerza un menú específico.
- (Sin query) — devuelve el `is_default`. Si no hay default, el primero alfabéticamente.

**Response shape:**

```jsonc
{
  "menu": {
    "id": 1,
    "uuid": "MNU-00000001-0001-4001-8001-000000000001",
    "name": "Default navigation",
    "slug": "default-navigation",
    "is_default": true
  },
  "sections": [
    {
      "id": 10,
      "uuid": "SEC-...",
      "name": "Administration",
      "slug": "administration",
      "order": 10,
      "items": [
        {
          "id": 100,
          "uuid": "MIT-...",
          "name": "Users",
          "slug": "menu-users",
          "route": "/users",
          "icon": "people",
          "order": 10,
          "allowed_roles": ["EDITOR", "ADMIN"]
        }
        // ...
      ]
    }
    // ...
  ]
}
```

**Importante:** este endpoint ya **filtra por rol del usuario** — los items que el rol del usuario no puede ver no aparecen en la respuesta. Por eso el sidebar muestra exactamente lo que el usuario debe ver. **El mantenedor NO debe usar este endpoint para editar** (devuelve datos filtrados).

### Lo que NO existe en API

| Operación | Estado |
|---|---|
| `GET /menus/` (lista de menús sin filtrar) | ❌ |
| `POST /menus/` (crear menú) | ❌ |
| `PATCH /menus/<id>/` | ❌ |
| `DELETE /menus/<id>/` | ❌ |
| Todos los CRUD de `MenuSection` | ❌ |
| Todos los CRUD de `MenuItem` | ❌ |

Hoy la única forma de editar el menú es **Django admin** (`/admin/api/menu/`).

---

## 4. API que falta para el mantenedor Angular

Para construir el mantenedor hay que crear endpoints CRUD. Patrón estándar DRF.

### 4.1 `/menus/` — gestión de menús (root)

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/v1/menus/` | Lista paginada de menús (sin filtrar — incluye inactivos) |
| `GET` | `/api/v1/menus/<id>/` | Detalle de un menú (incluyendo secciones e items anidados) |
| `POST` | `/api/v1/menus/` | Crear menú |
| `PATCH` | `/api/v1/menus/<id>/` | Actualizar (incluido `is_default`; el modelo gestiona el "solo uno") |
| `DELETE` | `/api/v1/menus/<id>/` | Borrar (cascade a secciones e items) |
| `GET` | `/api/v1/menus/tree/` | (ya existe) — para el sidebar runtime |

### 4.2 `/menu-sections/` — gestión de secciones

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/v1/menu-sections/?menu=<id>` | Lista de secciones de un menú |
| `POST` | `/api/v1/menu-sections/` | Crear sección (body incluye `menu` FK) |
| `PATCH` | `/api/v1/menu-sections/<id>/` | Editar (cambiar nombre, orden, descripción) |
| `DELETE` | `/api/v1/menu-sections/<id>/` | Borrar (cascade a items) |

### 4.3 `/menu-items/` — gestión de items

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/v1/menu-items/?section=<id>` | Lista de items de una sección |
| `POST` | `/api/v1/menu-items/` | Crear item (body con `section`, `name`, `route`, `icon`, `order`, `allowed_roles`) |
| `PATCH` | `/api/v1/menu-items/<id>/` | Editar |
| `DELETE` | `/api/v1/menu-items/<id>/` | Borrar |

### 4.4 Endpoints de utilidad (sugerencia)

| Método | Path | Descripción |
|---|---|---|
| `POST` | `/api/v1/menu-sections/reorder/` | Body: `[{ id: 1, order: 0 }, { id: 2, order: 1 }, ...]`. Actualiza en bulk el campo `order`. Útil para drag-and-drop. |
| `POST` | `/api/v1/menu-items/reorder/` | Idem para items dentro de una sección |
| `GET` | `/api/v1/menu-items/icons/` | (Opcional) Lista paginada/búsqueda de iconos Material Icons clásicos disponibles para autocomplete |

### 4.5 Permisos backend

- Lectura: cualquier usuario autenticado (`IsAuthenticated`).
- Escritura (POST/PATCH/DELETE): solo staff o ADMIN. Usar el `IsAdminOrReadOnly` que ya existe (`api/permissions.py`).
- Los endpoints deben **NO filtrar por rol del usuario** en lectura cuando es admin (a diferencia de `/menus/tree/` que sí filtra). El mantenedor necesita ver TODOS los items para poder editarlos.

### 4.6 Serializers a crear

```python
# api/serializers/menu.py (nuevo)
class MenuSerializer(ModelSerializer):
    class Meta:
        model = Menu
        fields = ['id', 'uuid', 'name', 'slug', 'description',
                  'is_default', 'is_active', 'created', 'modified']
        read_only_fields = ['uuid', 'slug', 'created', 'modified']

class MenuSectionSerializer(ModelSerializer):
    class Meta:
        model = MenuSection
        fields = ['id', 'uuid', 'menu', 'name', 'slug', 'description',
                  'order', 'is_active', 'created', 'modified']
        read_only_fields = ['uuid', 'slug', 'created', 'modified']

class MenuItemSerializer(ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ['id', 'uuid', 'section', 'name', 'slug', 'description',
                  'route', 'icon', 'order', 'allowed_roles',
                  'is_active', 'created', 'modified']
        read_only_fields = ['uuid', 'slug', 'created', 'modified']

class MenuDetailSerializer(MenuSerializer):
    """Versión expandida: incluye secciones e items anidados."""
    sections = MenuSectionSerializer(many=True, read_only=True)
    class Meta(MenuSerializer.Meta):
        fields = MenuSerializer.Meta.fields + ['sections']
```

---

## 5. UX sugerida para el mantenedor

### 5.1 Estructura de páginas

Una sola ruta `/admin/menus` (o `/settings/menus`) con tres niveles visuales en la misma pantalla:

```
┌──────────────────────────────────────────────────────────────────┐
│ Menús                                          [+ Nuevo menú]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ▼ Default navigation    [⭐ default] [activo]    [edit] [del]    │
│  │                                                                │
│  │  ▼ Home (order 0)                              [edit] [del]   │
│  │  │  • Dashboard      /dashboard    dashboard   [edit] [del]   │
│  │  │  [+ Nuevo item]                                            │
│  │  │                                                            │
│  │  ▼ Administration (order 10)                   [edit] [del]   │
│  │  │  • Users          /users        people      [edit] [del]   │
│  │  │  • Groups         /groups       group       [edit] [del]   │
│  │  │  [+ Nuevo item]                                            │
│  │  │                                                            │
│  │  ▼ Dev (order 90)                              [edit] [del]   │
│  │     • Components     /components   widgets     [edit] [del]   │
│  │     [+ Nuevo item]                                            │
│  │  [+ Nueva sección]                                            │
│  │                                                                │
│  ▶ Backup navigation    [inactivo]                [edit] [del]    │
│                                                                   │
│  [+ Nuevo menú]                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Filosofía:**
- Una sola pantalla, todo expandible/colapsable.
- El menú default destaca con un icono ⭐.
- Cada nivel tiene su propio botón de "+ nuevo" inline para añadir hijos sin navegar.
- Drag handles a la izquierda para reordenar secciones (entre sí) e items (dentro de su sección).
- Edición inline o vía `MatDialog` (consistente con el resto del template — `app-entity-form-dialog`).

### 5.2 Formularios

**Crear/editar Menu:**
- `name` (text, required)
- `description` (textarea, opcional)
- `is_default` (toggle — avisar al usuario que activarlo desactiva el actual default)
- `is_active` (toggle)

**Crear/editar Section:**
- `name` (text, required)
- `description` (textarea)
- `order` (number — o gestionar vía drag)
- `is_active` (toggle)
- (FK `menu` se rellena automáticamente del contexto)

**Crear/editar Item:**
- `name` (text, required)
- `route` (text, required, hint: "Path absoluto, ej. `/users`")
- `icon` (text + **picker de Material Icons clásico** — ver §5.4)
- `order` (number — o drag)
- `allowed_roles` (multi-select chips: `VIEWER`, `EDITOR`, `ADMIN`; vacío = solo staff)
- `is_active` (toggle)
- `description` (textarea, opcional)

### 5.3 Selector de roles

Usar `mat-chip-set` con `mat-chip-option` (Material) o `app-segmented-toggle` con `multiSelect` (si lo extendemos del catálogo).

Pantalla:
```
Allowed roles:  [✓ ADMIN]  [✓ EDITOR]  [  VIEWER]
                Vacío significa "solo staff lo ve" (fail-closed)
```

Mostrar hint **"Staff siempre lo ve, sin importar este filtro"**.

### 5.4 Icon picker

Material Icons clásico tiene ~2000 iconos. No mostrar todos. Patrón sugerido:

```
┌─────────────────────────────────────────┐
│ Icon: [people______________] [Buscar 🔍]│
│ Preview: <mat-icon>people</mat-icon>    │
│                                          │
│ Sugerencias (filtradas por búsqueda):    │
│  ⬛ people    ⬛ person   ⬛ group       │
│  ⬛ groups   ⬛ face     ⬛ account_box │
│  Más en Material Icons catalog ↗        │
└─────────────────────────────────────────┘
```

- Input de texto libre (el admin puede escribir cualquier ligature).
- Preview en vivo del icono renderizado.
- Sugerencias autocomplete con los más usados (top 50 — lista hardcoded en el front).
- Link al catálogo oficial para los avanzados.

El backend tiene un widget similar en Django admin (`MenuItemAdminForm.MaterialIconTextInput`); el front puede inspirarse pero rehacerse en Angular.

### 5.5 Estados visuales

| Estado | Indicador |
|---|---|
| `is_active=false` | El item se ve atenuado (opacidad 0.6) + chip "inactivo" |
| `is_default=true` (en Menu) | Estrella ⭐ junto al nombre + chip "default" |
| `allowed_roles=[]` | Chip "Todos los roles" |
| `allowed_roles=['ADMIN']` | Chips por cada rol |
| Item con `route` que NO existe en el front | Idealmente, chip de warning amarillo (requiere validación cliente-side contra `routes` conocidas — opcional, fase 2) |

### 5.6 Confirmaciones

- **Borrar menú** → confirm con mensaje "Se borrarán también N secciones y M items. Esta acción es irreversible." Usar `app-confirm-dialog` con `color: 'warn'`.
- **Activar `is_default`** → confirm "El menú actualmente default ('X') quedará no-default. ¿Continuar?".
- **Borrar sección** → confirm con cuenta de items que también se borran.

### 5.7 Drag-and-drop (opcional, fase 2)

Usar Angular CDK `DragDropModule`:
- Dragear secciones para reordenar entre sí dentro del menú.
- Dragear items para reordenar dentro de su sección.
- **No permitir** mover items entre secciones via drag (requeriría cambiar `section` FK; mejor con un selector explícito en el form).

Tras el drop, llamar `POST /menu-sections/reorder/` o `/menu-items/reorder/` con el nuevo orden.

---

## 6. Patrones del template a reutilizar

El template tiene una base consistente; el mantenedor debe seguirla. Lo más relevante (referencia: `fvx-frontend/docs/design-fvx.md`):

| Patrón / componente | Para qué usarlo en el mantenedor |
|---|---|
| `app-page-header` (§2.17) | Cabecera de la página con título, subtítulo, breadcrumbs, slot para botones |
| `app-section-card` (§2.15) | Cada `Menu` es una card colapsable (`[collapsible]="true"`, two-way `[(expanded)]`). El header del card lleva ⭐ + nombre + acciones |
| `app-entity-form-dialog` (§2.5) | Diálogo de crear/editar para Menu, Section, Item — definir `FieldConfig[]` |
| `app-confirm-dialog` (§2.6) | Confirmaciones de borrado |
| `app-status-chip` (§2.13) | Chips "default", "activo", "inactivo", roles permitidos |
| `app-empty-state` (§2.12) | Cuando un menú no tiene secciones, o una sección no tiene items |
| `app-skeleton` (§2.16a) | Loading state durante el primer fetch |
| `app-data-table` (§2.3) | **NO usar** para esto — la estructura anidada (menu→sección→item) no encaja con tabla plana. Usar cards anidadas. |
| `BaseCrudComponent` (§5.x del catálogo) | **Tampoco encaja directo** — el mantenedor es multi-entidad anidada. Crear un component custom |
| `NotificationService` | Toast `success`/`error` tras cada operación |
| `unsavedChangesGuard` + `bindBeforeUnloadWarning` | Si la edición es inline (sin diálogo), proteger contra cierre con cambios pendientes |
| Tokens `--fvx-*` | Sin colores hardcoded; respetar tema activo |
| Transloco | Todas las cadenas en `en.json` + `es.json` |

### Estructura sugerida en Angular

```
features/admin/menus/
  ├── menus-admin.component.ts        # ruta /settings/menus, página completa
  ├── menus-admin.component.scss
  ├── menu-card.component.ts          # una card por Menu (header + secciones)
  ├── menu-section-row.component.ts   # una sección (header + items)
  ├── menu-item-row.component.ts      # un item (datos + acciones)
  ├── menu-form-dialog.component.ts   # crear/editar Menu
  ├── section-form-dialog.component.ts
  ├── item-form-dialog.component.ts
  ├── icon-picker/                    # subcarpeta para el picker
  │   ├── icon-picker.component.ts
  │   └── material-icons.const.ts     # top 50 iconos sugeridos
  └── menus-admin.service.ts          # CRUD calls vía ApiService
```

### Servicio Angular

```ts
@Injectable({ providedIn: 'root' })
export class MenusAdminService {
  private api = inject(ApiService);

  listMenus(): Observable<PaginatedResponse<MenuDto>>;
  getMenu(id: number): Observable<MenuDetailDto>;
  createMenu(data: Partial<MenuDto>): Observable<MenuDto>;
  updateMenu(id: number, data: Partial<MenuDto>): Observable<MenuDto>;
  deleteMenu(id: number): Observable<void>;

  listSections(menuId: number): Observable<MenuSectionDto[]>;
  createSection(data: Partial<MenuSectionDto>): Observable<MenuSectionDto>;
  // ... etc para items
  
  reorderSections(menuId: number, ordered: { id: number; order: number }[]): Observable<void>;
  reorderItems(sectionId: number, ordered: { id: number; order: number }[]): Observable<void>;
}
```

Tras cada mutación exitosa, **invalidar el menú actual del sidebar** llamando `inject(MenuService).load()` para que el sidebar refleje el cambio sin recargar.

---

## 7. Consideraciones técnicas

### 7.1 Permisos

El mantenedor solo debe ser accesible para admins. Aplicar `roleGuard('ADMIN')` o `permissionGuard('menu.manage')` en la ruta (`menu.manage` ya existe en `PERMISSION_MIN_ROLE`). **OJO**: como esta ruta probablemente **NO esté en el `MenuItem`** (es meta — gestiona el propio menú), aquí sí justifica usar `roleGuard` (ver regla en `core-guards-interceptors.md` §1.5).

### 7.2 Validación

| Campo | Validación |
|---|---|
| `name` (todos) | Required, max 255 |
| `route` (MenuItem) | Required, debe empezar con `/`, sin espacios, regex `^/[a-z0-9-/]*$` |
| `icon` | Opcional, max 80, lowercase + underscore (`account_box`) |
| `allowed_roles` | Array de strings; cada uno debe ser `'VIEWER' \| 'EDITOR' \| 'ADMIN'` |
| `order` | Integer ≥ 0 |
| `is_default` (Menu) | Si se activa, debe confirmar (UI). Backend lo gestiona en `save()` |

### 7.3 Refresco automático del sidebar

Tras guardar cualquier cambio (crear/editar/borrar/reordenar), llamar a `MenuService.clear()` + `MenuService.load()` (en `core/services/menu.service.ts`) para que el sidebar refresque. Sin esto, el admin no ve sus propios cambios reflejados hasta recargar.

### 7.4 Auditoría (cuando se implemente §5.2 del plan)

Cada CRUD sobre `Menu`/`MenuSection`/`MenuItem` debería quedar registrado en el audit log con `actor=request.user`, `action='created|updated|deleted'`, `entity_type='MenuItem'`, `entity_id=...`, `diff=<changes>`. Esto es responsabilidad del backend (signal de `django-auditlog` que ya está en `requirements.txt`).

### 7.5 i18n

Todas las strings del mantenedor en `public/assets/i18n/en.json` + `es.json` bajo namespace `menusAdmin.*`. **Los `name` y `description` de las propias entidades** (los datos editables) NO se traducen automáticamente — son texto libre que el admin escribe en el idioma que prefiera. Si se quiere multi-idioma de los items mismos, sería feature aparte (campos `name_en`, `name_es` o tabla de traducciones).

---

## 8. Referencias en el repo

- **Modelos:** `fvx-backend/api/models/base.py` líneas 177-310 aprox.
- **Admin actual:** `fvx-backend/api/admin.py` líneas 44-100 + `fvx-backend/api/admin_forms/forms.py` (form de allowed_roles + icon picker)
- **Endpoint actual:** `fvx-backend/api/views/menu.py`
- **Consumo en el front:**
  - `fvx-frontend/src/app/core/services/menu.service.ts` — fetch + cache
  - `fvx-frontend/src/app/core/guards/menu-access.guard.ts` — bloqueo por menú
  - `fvx-frontend/src/app/shared/components/layout/layout.component.ts` — render del sidebar
  - `fvx-frontend/src/app/core/models/menu.model.ts` — interfaces TS

---

## 9. Resumen para empezar

Si tomas este doc para diseñar el mantenedor:

1. **Asume que el backend está sin CRUD** (solo `tree/`). Diseña como si fuera a montar viewsets nuevos para `Menu`/`MenuSection`/`MenuItem` siguiendo el patrón DRF estándar.
2. **Una sola ruta**, una sola pantalla: lista de menús + secciones expandibles + items dentro. Diálogos para crear/editar.
3. **Reutiliza el catálogo del template** (`app-section-card`, `app-entity-form-dialog`, `app-status-chip`). No es necesario inventar componentes nuevos salvo el **icon picker** (que es el único custom inevitable).
4. **Refresca el sidebar** tras cada mutación llamando a `MenuService.load()`.
5. **Permisos:** ADMIN solo, vía `roleGuard('ADMIN')` en la ruta.

Sobre **qué falta concretar como decisión de UX:**
- ¿Edición inline (click en el name y se vuelve input) o siempre via diálogo?
- ¿Drag-and-drop ya en MVP o solo input numérico de `order`?
- ¿Vista colapsada por defecto (todo cerrado) o expandida (todo abierto)?
