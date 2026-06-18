# Sitio personalizado y módulo `shared/`

Guía para **otra IA o desarrollador** que deba construir pantallas **fuera del CRUD estándar** reutilizando la plantilla FVX, o extenderla sin romper convenciones.

## Antes de implementar (obligatorio)

1. **Leer** [**`design-fvx.md`**](design-fvx.md) (diseño unificado: temas, botones, formularios, file uploader y **catálogo de componentes**). No añadas controles duplicando Material si ya existe un `app-*` allí.
2. **Idiomas:** toda cadena de UI con **Transloco** y claves en `en.json` / `es.json` (ver sección *Textos, idiomas* en `design-fvx.md` y [`i18n.md`](i18n.md)).

Para **API detallada** de cada componente, pipe, directiva y `api/utils.py`, ver el **catálogo (§ 5)** en [**`design-fvx.md`**](design-fvx.md#diseno-catalogo).

---

## 1. Dónde encaja cada cosa

| Capa | Ubicación | Función |
|------|-----------|---------|
| **Shell** (sidebar, topbar, área de trabajo) | `src/app/shared/components/layout/layout.component.ts` | Rutas autenticadas usan `LayoutComponent`; el `router-outlet` del feature vive dentro de `<main class="main-content">`. |
| **Rutas** | `src/app/app.routes.ts` | Añadir `path` + `loadComponent` como hijos de `LayoutComponent` para páginas dentro del admin. |
| **Página “tipo admin”** | Clases globales en `src/styles.scss` | `.page-container`, `.page-header`, `.content-card`, `.table-container`, `.table-toolbar`, `.empty-state`. |
| **CRUD de lista** | `app-crud-page` + opcional `app-filter-panel` | Encapsula título, botón “Add…”, tabla y filtros. |
| **Tabla reutilizable** | `app-data-table` | Card + búsqueda + `mat-table` + paginador; usable sin `app-crud-page`. |
| **Lógica CRUD + API** | `src/app/shared/base/base-crud.component.ts` | Clase base abstracta; **no** es obligatoria para páginas custom. |
| **Servicios HTTP, auth, menú, tema** | `src/app/core/services/` | No están en `shared/`; inyectarlos desde el componente del feature. |

**Flujo típico:** `AppComponent` → `router-outlet` → (login) **o** `LayoutComponent` → `main.main-content` → **tu componente**.

Para una página **100% libre** (sin caja de 1440px), puedes omitir `.page-container` y controlar padding tú mismo; para **consistencia visual** con Users/Groups, envuelve en `.page-container` y, si aplica, `.page-header`.

> **Regla obligatoria:** toda ruta nueva añadida a `app.routes.ts` bajo `LayoutComponent` **debe** usar la estructura canónica descrita en [§ 2.4](#24-estructura-canónica-de-una-página-nueva-obligatoria): `app-page-header` con `[breadcrumbs]` + `.page-container` + `app-section-card` + controles del [catálogo (§ 5, `design-fvx.md`)](design-fvx.md#diseno-catalogo). No está permitido un `<h1>` suelto ni armar a mano la cabecera.

---

## 2. Plantillas visuales y variables

### 2.1 Clases globales (`src/styles.scss`)

Úsalas en el template de tu componente standalone (no hace falta un “template” Angular aparte: son clases CSS).

| Clase | Uso |
|-------|-----|
| `.page-container` | Padding lateral/vertical, `max-width: 1440px`, centrado. Base recomendada para cualquier pantalla dentro del layout. |
| `.page-header` | Flex: título `h1` + acciones (botones). |
| `.page-body` | Definida en `crud-page` para flex tabla + filtros; en páginas custom puedes definir tu propio grid/flex. |
| `.page-table` | Junto con `app-data-table`, activa reglas de ancho de `.content-card` (ver `styles.scss`). |
| `.content-card` | Fondo de card, borde, sombra, `border-radius`; envuelve bloques de contenido o la tabla. |
| `.table-toolbar` | Barra sticky sobre la tabla (búsqueda, iconos). Estilizada globalmente. |
| `.table-container` | `overflow-x: auto` alrededor de `mat-table`. |
| `.empty-state` | Estado sin filas (también usado dentro de `data-table`). |
| Utilidades | `.d-flex`, `.gap-2`, `.w-full`, `.spacer`, etc. (mismo archivo). |

**Ejemplo mínimo (solo CSS, sin componentes):** útil para prototipos rápidos o pantallas de sistema sin router (login, 404). **No usar este patrón** para páginas que se añadan al `app.routes.ts` — usar siempre la estructura de [§ 2.4](#24-estructura-canónica-de-una-página-nueva-obligatoria).

```html
<div class="page-container">
  <div class="page-header">
    <h1>Mi módulo</h1>
    <button mat-flat-button color="primary">Acción</button>
  </div>
  <div class="content-card p-3">
    <!-- prototipo: formularios, steps, dashboard, etc. -->
  </div>
</div>
```

Importa los módulos Material que necesites en el `imports: []` del `@Component`.

### 2.2 Tokens SCSS (`src/styles/_variables.scss`)

En estilos de componente con `@use 'variables' as v;` puedes usar, entre otros:

- Espaciado: `v.$spacing-sm` … `v.$spacing-2xl`
- Radios: `v.$radius-md`, `v.$radius-xl`, …
- Tipografía: `v.$font-size-*`, `v.$font-weight-*`
- Colores fijos de marca: `v.$color-primary`, `v.$color-warn`, …

Sirven para **coherencia**; el aspecto “shell” que cambia con el tema suele ir por **variables CSS** (siguiente apartado).

### 2.3 Temas y variables CSS `--fvx-*`

- **Servicio:** `ThemeService` (`src/app/core/services/theme.service.ts`): ids `tmp-default`, `tmp-light`, `tmp-dark`, `tmp-blackandwhite`, `tmp-beige`; persistencia `localStorage` (`fvx-theme-id`). El valor antiguo `tmp-hybrid` se normaliza a `tmp-default`.
- **Clase en `<html>`:** el servicio aplica `theme-tmp-*` según el id (excepto default, que deja sin clase extra según configuración actual).
- **Definición de paletas:** `src/styles/_theme-palettes.scss` — mixins `fvx-palette-default`, `fvx-palette-tmp-light`, etc.

Variables CSS habituales (usar en `color`, `background`, `border-color`):

- **Contenido:** `--fvx-bg-page`, `--fvx-bg-card`, `--fvx-bg-main`, `--fvx-bg-topbar`
- **Texto:** `--fvx-text-primary`, `--fvx-text-secondary`, `--fvx-text-muted`
- **Bordes / enlaces:** `--fvx-border`, `--fvx-link`
- **Sidebar / nav:** `--fvx-sidebar-bg`, `--fvx-nav-item-text`, `--fvx-nav-item-active-bg`, …
- **Diálogos (cabecera):** `--fvx-dialog-header-bg`, `--fvx-dialog-header-fg`, …

**Regla para IAs:** en componentes nuevos, preferir `var(--fvx-text-primary)` y `var(--fvx-bg-card)` antes que colores hex sueltos, para que el modo claro/oscuro no rompa el contraste.

**API (parcial):** `UiSettingsService.bootstrapFromApi()` puede aplicar `theme_key` remoto si el endpoint responde; ver detalle en [§ 1 — Temas, en `design-fvx.md`](design-fvx.md#diseno-temas).

### 2.4 Estructura canónica de una página nueva (obligatoria)

**Cuando** añades una entrada a `app.routes.ts` bajo `LayoutComponent`, la página **debe** respetar estas 4 reglas:

1. **Cabecera:** usar `app-page-header` con `[breadcrumbs]`. Nunca `<h1>` suelto ni cabecera casera.
2. **Contenedor raíz:** envolver todo en `.page-container` (o `.page-container--narrow` para formularios de una columna).
3. **Bloques:** agrupar el contenido con `app-section-card`; un grupo visual = un `section-card`. No usar divs con borde/sombra ad-hoc.
4. **Controles:** **antes de escribir** un componente nuevo, buscar en el [catálogo (§ 5) en `design-fvx.md`](design-fvx.md#diseno-catalogo). Si existe uno que cubra el caso, **hay que usarlo** — ver tabla de mapeo más abajo.

#### Plantilla canónica — copiar y adaptar

```html
<div class="page-container">
  <app-page-header
    title="Reports"
    subtitle="Financial summary per organization"
    [breadcrumbs]="[
      { label: 'Home', link: '/' },
      { label: 'Finance', link: '/finance' },
      { label: 'Reports' }
    ]"
  >
    <ng-container actions>
      <button mat-stroked-button (click)="export()">
        <mat-icon>download</mat-icon>
        Export
      </button>
      <button mat-flat-button color="primary" (click)="create()">
        <mat-icon>add</mat-icon>
        New
      </button>
    </ng-container>
  </app-page-header>

  <app-section-card title="Overview" icon="insights">
    <!-- KPIs, resumen, gráficos, etc. -->
  </app-section-card>

  <app-section-card title="Transactions" icon="list">
    <!-- Tabla, lista, etc. -->
    <app-data-table
      [columns]="columns"
      [data]="rows"
      [isLoading]="loading()"
    />
  </app-section-card>
</div>
```

```ts
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    SectionCardComponent,
    DataTableComponent,
  ],
  templateUrl: './reports.component.html',
})
export class ReportsComponent { /* ... */ }
```

#### Reglas del breadcrumb

- **Último item** nunca lleva `link` — representa la página actual.
- **Primer item** suele ser `Home` (`link: '/'`) o el módulo padre (`Admin`, `Finance`, …).
- Mantener **2 a 4 niveles**; más de cuatro indica que la IA debería descomponer la página.
- Los `label` **deben coincidir** con los `MenuItem.label` del backend para que el usuario reconozca la navegación.
- En páginas de detalle, el penúltimo breadcrumb debe linkear al listado: `{ label: 'Users', link: '/users' }` → `{ label: user.name }`.
- Para rutas dinámicas, construir los breadcrumbs en el `ngOnInit` con los datos resueltos:
  ```ts
  this.breadcrumbs = [
    { label: 'Home', link: '/' },
    { label: 'Users', link: '/users' },
    { label: user.full_name },
  ];
  ```

#### Qué control reutilizar para cada caso

| Necesidad | Control | Carpeta |
|-----------|---------|---------|
| Cabecera + breadcrumb + acciones | `app-page-header` | `shared/components/page-header/` |
| Agrupar un bloque de contenido | `app-section-card` | `shared/components/section-card/` |
| Tabla paginada con búsqueda | `app-data-table` | `shared/components/data-table/` |
| CRUD completo (tabla + form + filtros) | `app-crud-page` + `BaseCrudComponent` | `shared/components/crud-page/` |
| Panel lateral de filtros | `app-filter-panel` | `shared/components/filter-panel/` |
| Formulario dinámico en diálogo | `app-entity-form-dialog` | `shared/components/entity-form-dialog/` |
| Confirmación Sí/No | `app-confirm-dialog` | `shared/components/confirm-dialog/` |
| Diálogo con cualquier componente embebido | `app-content-dialog` | `shared/components/content-dialog/` |
| Visor de archivo (PDF, imagen, video) | `app-file-viewer-dialog` | `shared/components/file-viewer-dialog/` |
| Subida de archivos (Firebase / signed URL) | `app-file-uploader` | `shared/components/file-uploader/` |
| Estado vacío (“no data”) | `app-empty-state` | `shared/components/empty-state/` |
| Chip de estado (`active`, `pending`, …) | `app-status-chip` | `shared/components/status-chip/` |
| Botón copiar al portapapeles | `app-copy-button` | `shared/components/copy-button/` |
| Overlay de carga sobre un bloque | `app-loading-overlay` | `shared/components/loading-overlay/` |
| Visor JSON colapsable | `app-json-viewer` | `shared/components/json-viewer/` |
| Buscador con debounce | `app-search-input` | `shared/components/search-input/` |
| Input de etiquetas (chips editables) | `app-tag-input` | `shared/components/tag-input/` |
| Fecha única (formulario) | `app-date-picker` | `shared/components/date-picker/` |
| Rango de fechas | `app-date-range-picker` | `shared/components/date-range-picker/` |
| Tabs declarativos | `app-tabs` + `*appTabContent` | `shared/components/tabs/` |
| Wizard/stepper (horizontal o vertical) | `app-workflow` + `*appWorkflowStep` | `shared/components/workflow/` |
| Calendario mensual | `app-calendar` | `shared/components/calendar/` |
| Calculadora embebida | `app-calculator` | `shared/components/calculator/` |
| Drawer lateral embebiendo un componente | `EntityDrawerService.open({ embedComponent, embedInputs })` | `core/services/entity-drawer.service.ts` |
| Editor de la ficha del usuario autenticado | `app-profile-editor` (embed en `EntityDrawer`; el menú del header ya lo abre via `LayoutComponent.openProfile()`) | `shared/components/profile-editor/` |
| Avatar por nombre o imagen | `app-avatar` / pipe `avatar` | `shared/components/avatar/` |
| Select grande con autocomplete | `app-smart-select` | `shared/components/smart-select/` |
| Buscador de direcciones (Mapbox) | `app-place-search` | `shared/components/place-search/` |
| Mapa interactivo (Mapbox) | `app-map` | `shared/components/map/` |

> **Regla:** Si ninguno cubre el caso, crea el componente nuevo bajo `shared/components/<nombre>/` (si es reutilizable) o `features/<feature>/components/<nombre>/` (si es específico de esa página). **Nunca** duplicar lógica de los existentes.

#### Anatomía visual

```
┌────────────────────────────────────────────────────────┐
│ .page-container  (max-width 1440px, padding, centrado) │
│ ┌────────────────────────────────────────────────────┐ │
│ │ app-page-header                                    │ │
│ │  · breadcrumbs (Home › Finance › Reports)          │ │
│ │  · h1 title + subtitle    [actions slot]           │ │
│ └────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────┐ │
│ │ app-section-card "Overview"  (icon, title, body)   │ │
│ │  · KPIs, resumen, gráficos…                        │ │
│ └────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────┐ │
│ │ app-section-card "Transactions"                    │ │
│ │  · app-data-table / app-workflow / app-calendar /… │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

#### Variantes válidas

- **Página estrecha (form único):** usar `.page-container--narrow` (definido en `styles.scss`) y un solo `app-section-card`.
- **Dashboard con columnas:** dentro del `.page-container`, añadir un grid CSS (`display: grid; grid-template-columns: 2fr 1fr;`) y colocar varios `app-section-card` como hijos.
- **Página 100% libre (kiosk, pantalla completa):** omitir `.page-container` y `app-page-header` **solo si la ruta no cuelga de `LayoutComponent`** (por ejemplo, páginas públicas). Dentro del layout admin, las 4 reglas anteriores son obligatorias.

#### Demo en vivo

La ruta `/components` (ver `features/components-showcase/`) es la **referencia visual** de todos los controles del catálogo. Si otra IA duda de cómo se ve un control, puede abrir esa página localmente.

---

## 3. Inventario — `src/app/shared/`

Rutas relativas a `src/app/shared/`. Todos los componentes listados son **standalone**: impórtalos en el array `imports` de tu feature.

### 3.1 Componentes — `components/`

| Selector | Archivo | Resumen |
|----------|---------|---------|
| `app-layout` | `components/layout/layout.component.ts` | Shell completo; ya referenciado en rutas. |
| `app-crud-page` | `components/crud-page/crud-page.component.ts` | **Inputs:** `title`, `entityName`, `columns`, `actions`, `filters`, `data`, `totalCount`, `pageSize`, `pageIndex`, `loading`. **Outputs:** `createClick`, `pageChange`, `sortChange`, `searchChange`, `filterChange`, `actionClick`, `rowClick`, `refreshClick`, `exportClick`. Envuelve `app-data-table` y opcional `app-filter-panel`. |
| `app-data-table` | `components/data-table/data-table.component.ts` | Tabla Material genérica. **Inputs:** `columns`, `actions`, `data`, `totalCount`, `pageSize`, `pageIndex`, `isLoading`, `searchPlaceholder`. **Outputs:** mismos eventos de paginación/búsqueda/acciones que consume `crud-page`. **Proyección:** `<ng-content select="[tableActions]"></ng-content>` dentro de la toolbar para botones extra. `ViewEncapsulation.None` (estilos globales de tabla aplican). |
| `app-filter-panel` | `components/filter-panel/filter-panel.component.ts` | **Input:** `filters: FilterConfig[]` (`core/models/api.model`). **Output:** `filterChange` → `Record<string, any>`. Panel lateral/colapsable. |
| `app-entity-form-dialog` | `components/entity-form-dialog/entity-form-dialog.component.ts` | Diálogo de formulario generado desde `FieldConfig[]`. Abrir con `MatDialog` y `EntityFormDialogData`: `title`, `fields`, `entity?`, `mode: 'create' \| 'edit'`. Usa `app-smart-select` internamente para tipo `select`. |
| `app-confirm-dialog` | `components/confirm-dialog/confirm-dialog.component.ts` | **Data:** `ConfirmDialogData`: `title`, `message`, `confirmText?`, `cancelText?`, `color?: 'primary' \| 'warn'`. `MatDialogRef` cierra con `true` / `false`. |
| `app-relationship-dialog` | `components/relationship-dialog/relationship-dialog.component.ts` | Gestión de relaciones N a M vía API. **Data:** `RelationshipDialogData`: `config: RelationshipConfig`, `entityId`, `entityName`. Depende de `ApiService` y convenciones del backend. |
| `app-entity-drawer` | `components/entity-drawer/entity-drawer.component.ts` | Drawer global (instancia en `AppComponent`). **`EntityDrawerService.open()`** acepta unión de configs en `entity-drawer.service.ts`: (1) **API user** — `entityType: 'user'` + `entityId` → `GET users/:id` y `app-user-detail`; (2) **embed** — `embedComponent` (clase standalone) + `embedInputs` opcional → `NgComponentOutlet` sin fetch en el shell (el hijo gestiona datos y puede inyectar el mismo servicio para `close()`). |
| `app-user-detail` | `components/entity-drawer/details/user-detail.component.ts` | Vista de detalle de usuario para el drawer. **Input:** `data`. |
| `app-avatar` | `components/avatar/avatar.component.ts` | **Inputs:** `name`, `imageUrl?`, `size` (px, default 80). Iniciales o imagen; tamaño vía CSS `--avatar-size`. |
| `app-smart-select` | `components/smart-select/smart-select.component.ts` | `ControlValueAccessor`. **Inputs:** `options: { value; label }[]`, `placeholder`, `showNone`. Si hay más de 10 opciones usa autocomplete filtrable; si no, `mat-select`. |
| `app-page-header` | `components/page-header/page-header.component.ts` | **Cabecera obligatoria de toda página nueva.** **Inputs:** `title`, `subtitle?`, `breadcrumbs?: PageBreadcrumb[]` (`{ label, link? }`). **Slot:** `[actions]` para botones a la derecha. Renderiza breadcrumbs como `<nav>` semántico con el último item marcado como "actual" (sin link). |
| `app-section-card` | `components/section-card/section-card.component.ts` | Contenedor estándar para agrupar bloques dentro de una página. **Inputs:** `title?`, `subtitle?`, `icon?`, `flat?`, `noPadding?`. Usa `var(--fvx-bg-card)` y `var(--fvx-border)` para respetar temas. |
| Otros reutilizables | `components/*` | Ver [catálogo en **`design-fvx.md`**](design-fvx.md#diseno-catalogo) para API completa y ejemplos. La lista actual (sin contar los ya descritos arriba): `alert-message`, `calculator`, `calendar`, `command-palette`, `composition-card`, `config-user`, `content-dialog`, `copy-button`, `date-picker`, `date-range-picker`, `empty-state`, `file-uploader`, `file-viewer-dialog`, `help-shortcuts`, `json-viewer`, `loading-overlay`, `map`, `numeric-label`, `place-search`, `preview-export`, `profile-editor`, `search-input`, `section-card`, `segmented-toggle`, `skeleton`, `stat-card`, `status-chip`, `tabs`, `tag-input`, `workflow`. |

### 3.2 Base reutilizable — `base/`

| Símbolo | Archivo | Uso |
|---------|---------|-----|
| `BaseCrudComponent<T>` | `base/base-crud.component.ts` | `@Directive()` abstracta. Extiende con `class MyComponent extends BaseCrudComponent<MyModel>`. Define `endpoint`, `entityName`, `columns`, `formFields`; opcional `drawerEntityType: 'user'` (abre drawer por fila vía API user), `filterConfigs`, `relationshipConfigs`, `exportColumns`. Otros drawers (embed u otros recursos) se abren llamando **`EntityDrawerService.open(...)`** desde tu feature. **No usar** `BaseCrudComponent` si la pantalla no es listado DRF paginado con el mismo contrato de query params. |

### 3.3 Directivas — `directives/`

| Selector | Archivo | Uso |
|----------|---------|-----|
| `[appTruncateTooltip]` | `directives/truncate-tooltip.directive.ts` | Combinar con `MatTooltip` en celdas: activa el tooltip solo si el texto está truncado (útil en tablas). |

### 3.4 Pipes — `pipes/`

| Nombre | Archivo | Uso |
|--------|---------|-----|
| `dateFormat` | `pipes/date-format.pipe.ts` | `value \| dateFormat` — opcional segundo y tercer argumento: formato moment, timezone (default `America/Santiago`). |
| `timeAgo` | `pipes/time-ago.pipe.ts` | Formato relativo (`"hace 12 min"`, `"ayer"`) basado en `Intl.RelativeTimeFormat`; > 30 días cae a `dateFormat`. `pure: false`. |

Para truncar texto: usar la directiva `appTruncateTooltip` (combina con `MatTooltip` para activar el tooltip solo si el texto se corta). Para avatar SVG/iniciales: usar el componente `app-avatar` o el helper estático `AvatarUtil.generateAvatarSvg(name, size)` directamente desde TS.

### 3.5 Utilidades — `utils/`

| Archivo | Uso |
|---------|-----|
| `utils/avatar.util.ts` | Iniciales, color consistente, SVG; usado por `AvatarComponent` y `avatar` pipe. |

---

## 4. Servicios “no están en `shared/`”

Para API, JWT, menú lateral, drawer, notificaciones, export Excel, etc., usar **`src/app/core/services/`** (por ejemplo `ApiService`, `AuthService`, `MenuService`, `EntityDrawerService`, `NotificationService`, `ExcelExportService`). Los tipos de columnas, filtros y campos de formulario están en **`src/app/core/models/api.model.ts`**.

---

## 5. Checklist para una página nueva (custom)

> Pensado para que una IA pueda autoauditar su propia PR antes de marcarla como lista.

1. **Ruta:** añadir `path` + `loadComponent` en `app.routes.ts` bajo `LayoutComponent` (con `canActivate: [authGuard]` heredado).
2. **Carpeta:** crear feature en `src/app/features/<nombre>/` con componente **standalone**.
3. **Cabecera (OBLIGATORIO):** usar `app-page-header` con `[breadcrumbs]` con al menos 2 niveles (p. ej. `Home › <módulo>`). **No** un `<h1>` suelto, **no** una cabecera casera.
4. **Contenedor:** todo el contenido dentro de `.page-container` (o `.page-container--narrow` para forms de una columna).
5. **Bloques:** cada grupo lógico dentro de un `app-section-card`. Nada de `<div>` con `border`/`box-shadow` a mano.
6. **Reutilización:** antes de escribir cualquier control nuevo, consultar la tabla de mapeo en [§ 2.4](#24-estructura-canónica-de-una-página-nueva-obligatoria) y el [catálogo en `design-fvx.md`](design-fvx.md#diseno-catalogo). Si no existe, crearlo en `shared/components/` (si es reutilizable) o `features/<feature>/components/` (si es específico).
7. **CRUD estándar DRF:** copiar patrón `features/users/` y extender `BaseCrudComponent`; ver [add-crud-model.md](add-crud-model.md).
8. **Tabla sin CRUD:** `app-data-table` directamente, pasando `ColumnConfig[]` desde `core/models/api.model`.
9. **Formularios en diálogo:** `app-entity-form-dialog` si se describen con `FieldConfig[]`; si no, `app-content-dialog` embebiendo tu componente.
10. **Confirmaciones:** `app-confirm-dialog` (no abrir `MatDialog` ad-hoc para Sí/No).
11. **Notificaciones:** `NotificationService` de `core/services/` (no crear `MatSnackBar` directo).
12. **Permisos:** envolver elementos restringidos con `*appHasMinRole="'admin'"` cuando aplique (ver [core-guards-interceptors.md](core-guards-interceptors.md)).
13. **Estilos:** `var(--fvx-*)` para color/fondo/borde y `@use 'variables' as v` para espaciado, radios y tipografía. **Prohibido** hex sueltos en componentes.
14. **Menú:** si la página debe aparecer en la sidebar, alinear el `route` de `MenuItem` en backend con el `path` Angular. El layout normaliza la barra inicial (`users` → `/users`), pero no fixea typos — apuntar bien desde el inicio.
15. **Tema oscuro:** abrir con `tmp-dark` y verificar contraste; si algo se rompe, falta una `var(--fvx-*)`.
16. **Demo de referencia:** si aparece un control nuevo al catálogo, añadir su bloque al `features/components-showcase/`.

---

## 6. Referencias de código en el repo

- **Layout y contenedores:** `shared/components/layout/layout.component.ts`
- **Cabecera + breadcrumbs:** `shared/components/page-header/page-header.component.ts`
- **Section card:** `shared/components/section-card/section-card.component.ts`
- **Contenedor CRUD:** `shared/components/crud-page/crud-page.component.ts`
- **Tabla reutilizable:** `shared/components/data-table/data-table.component.ts`
- **Drawer (API user + embed):** `shared/components/entity-drawer/entity-drawer.component.ts`, `core/services/entity-drawer.service.ts`
- **Diseño y catálogo de controles:** [**`design-fvx.md`**](design-fvx.md#diseno-catalogo)
- **Demo en vivo de todos los controles:** ruta `/components` · `features/components-showcase/`
- **Estilos globales de página y tabla:** `src/styles.scss`
- **Temas (`tmp-*`, `--fvx-*`):** [§ 1 en **`design-fvx.md`**](design-fvx.md#diseno-temas) · `src/styles/_theme-palettes.scss`, `src/styles/_variables.scss`
- **Guards, interceptors, directivas transversales:** [**core-guards-interceptors.md**](core-guards-interceptors.md)
- **Servicios de `core/`:** [**core-services.md**](core-services.md)
