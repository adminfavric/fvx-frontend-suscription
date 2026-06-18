# Agregar un CRUD nuevo a partir de un modelo Django

Guía para desarrolladores (o para otra IA) que debe incorporar un recurso **desde el modelo en Django hasta la pantalla Angular** con el patrón actual del proyecto (`code-master/fvx-backend` + `code-master/fvx-frontend`).

> ⚠️ **Disposición de archivos del backend — usa la de [`../../AI_HANDBOOK.md`](../../AI_HANDBOOK.md) §7.** Las rutas que esta guía menciona en plano (`api/serializers.py`, `api/views.py`, `api/models/local.py`) **ya no existen**: hoy son **paquetes** — `api/serializers/<x>.py`, `api/views/<x>.py`, `api/models/<x>.py`, cada uno reexportado en su `__init__.py`. El flujo conceptual de esta guía sigue siendo válido; para las rutas exactas manda el handbook §7.

---

## Antes de tocar código (obligatorio)

1. **Leer** [`design-fvx.md`](design-fvx.md) — al menos la sección del **catálogo (§ 5)** y, si la pantalla tendrá formularios o tablas, **formularios (§ 3)** y **botones (§ 2)**. Ahí están los `app-*` permitidos, tokens `--fvx-*` y patrones de campos.
2. **Idiomas:** toda etiqueta, título, `placeholder`, columna y mensaje visible debe ir por **Transloco** con claves en `public/assets/i18n/en.json` y `es.json` (mismo árbol en ambos). Detalle operativo: [`i18n.md`](i18n.md).
3. Luego seguir esta guía (Django → menú → Angular).

---

## Convenciones que debe respetar la IA

| Concepto | Convención en este proyecto |
|----------|-----------------------------|
| **URL del router DRF** | Plural en *kebab-case* si hace falta: `router.register(r"users", ...)` → prefijo URL `/api/v1/users/`. |
| **`basename` del ViewSet** | Singular: `basename="user"`. |
| **`endpoint` en Angular** | Mismo string que el primer segmento del `register` **sin** barra final: `'users'`. |
| **Ruta Angular** | Suele ser `/<plural>` en minúsculas, alineado con `route` del menú: `/users`. |
| **Carpeta feature** | `features/<plural-kebab>/` o plural simple: `features/users/`. |
| **Componente** | `UsersComponent` → selector `app-users`. |

Si el modelo se llama `Invoice`, un patrón típico sería: URL `invoices`, basename `invoice`, ruta Angular `/invoices`, carpeta `features/invoices/`, clase `InvoicesComponent`.

**Recursos canónicos vivos en el repo** (úsalos como referencia): `users` y `groups`. Ambos están en producción, extienden `BaseCrudComponent` y siguen todas las convenciones de este doc.

---

## Parte 1 — Backend (Django)

### 1.1 Modelo, migración y datos

1. Definir el modelo dentro del paquete `api/models/` — en la plantilla los modelos viven en **`api/models/local.py`** (o `base.py` para los genéricos). Si prefieres un archivo dedicado, crea `api/models/<custom>.py` y **expórtalo** desde `api/models/__init__.py` (p. ej. `from .custom import MyModel`); en caso contrario Django no lo descubrirá al ejecutar `makemigrations`.
2. Crear y aplicar migraciones: `makemigrations` / `migrate` (dentro del contenedor backend, p. ej. `bash update.sh` o los comandos `manage.py` equivalentes).

### 1.2 Serializer

- En `api/serializers.py`, crear un `ModelSerializer` con los campos expuestos al API (incluidos `read_only_fields` si aplica).

### 1.3 ViewSet y registro en el router

1. En `api/views.py`, crear un `ModelViewSet` (o el mix que use el proyecto) con `serializer_class` y `get_queryset()` acorde a reglas de negocio (p. ej. solo objetos no borrados).
2. En `api/urls.py`:
   - Importar el ViewSet.
   - Registrarlo en el `DefaultRouter`:

```python
router.register(r"users", UserViewSet, basename="user")
```

El primer argumento es el **segmento de URL** que consumirá el front: `GET/POST /api/v1/users/`, `GET/PUT/PATCH/DELETE /api/v1/users/{id}/`.

### 1.4 Permisos y pruebas

- Ajustar permisos en el ViewSet si no hereda el comportamiento deseado.
- Probar con el navegador o `curl` que listado y detalle respondan con el JSON esperado (incluye claves anidadas si el serializer las expone).

---

## Parte 2 — Menú lateral (primera tarea explícita del desarrollador)

El menú se arma desde la API (`GET /api/v1/menus/tree/`). Los ítems viven en BD (`MenuItem`: `name`, `slug`, **`route`**, `icon`, `order`, sección, etc.).

### Opción A — Django Admin

- Crear o editar un **Menu item** en la sección correcta (p. ej. *Administration*).
- **`route`**: debe coincidir con la ruta Angular, con barra inicial: `/users`.
- **`slug`**: único (convención `menu-<recurso>`).
- **`icon`**: ligature Material Icons (p. ej. `business`).

### Opción B — Seed SQL (plantilla)

Referencia en `fvx-backend/sql/03_nav_menu.sql`: bloques `INSERT INTO api_menuitem` con `route`, `icon`, `order`, `section_id` resuelto por subconsulta al menú y sección *default*.

Tras cambiar SQL, ejecutar el flujo de seeds que use el proyecto (o insertar vía Admin en entornos sin re-seed).

### Comprobación en el front

- La ruta del menú debe existir en `app.routes.ts` (ver Parte 3); si no, el ítem aparece pero la navegación no carga la pantalla correcta.
- Opcional: añadir el mismo ítem en `DEFAULT_NAV_GROUPS` del `LayoutComponent` como **fallback** si el menú API falla (solo desarrollo/resiliencia).

---

## Parte 3 — Frontend (Angular)

Ruta del código: `fvx-frontend/src/app/`.

### 3.1 Interface del modelo (TypeScript)

- Crear `core/models/<recurso>.model.ts` con una `interface` que refleje **lo que devuelve el listado/detalle** del serializer (tipos realistas: `string`, `number`, `boolean`, `null`, fechas como `string` ISO).

Ejemplos vivos: `core/models/user.model.ts`, `core/models/group.model.ts`.

### 3.2 Feature component (CRUD)

1. Carpeta: `features/<nombre-plural>/`.
2. Componente standalone que **extienda** `BaseCrudComponent<MiTipo>` (ver `features/users/users.component.ts` o `features/groups/groups.component.ts`).
3. Definir obligatoriamente:
   - `endpoint`: igual al string de `router.register` (p. ej. `'users'`).
   - `entityName`: nombre legible para mensajes (p. ej. `'User'`).
   - `columns`: `ColumnConfig[]` alineadas a las claves del JSON (`key` = campo plano o coherente con lo que devuelve la API).
   - `formFields`: para el diálogo crear/editar (`EntityFormDialogComponent`).
4. Opcional: `filterConfigs`, `actions`, `exportColumns` (ver `ExcelExportService.columnsExport` en `core/services/excel-export.service.ts`), `drawerEntityType`, etc.
5. Plantilla: usar `app-crud-page` y cablear `(refreshClick)`, `(exportClick)`, filtros, etc. según necesidad. Para los filtros, opcional `[filterMode]` (`'panel' | 'dropdown' | 'inline'`, default `'dropdown'`; `'inline'` cae a `'dropdown'` en mobile ≤768px — ver `design-fvx.md` §2.2).

`ApiService` ya expone `list/create/update/patch/delete` sobre `environment.apiUrl` + `endpoint` (p. ej. `http://localhost:8080/api/v1/users/`).

### 3.3 Rutas Angular

En `app/app.routes.ts`, bajo `LayoutComponent` → `children`:

```typescript
{
  path: 'invoices',
  loadComponent: () =>
    import('./features/invoices/invoices.component').then(m => m.InvoicesComponent),
},
```

- `path`: sin barra inicial; suele ser el plural en minúsculas.
- Debe coincidir con el **`route`** del menú (`/invoices` → segmento `invoices`).

### 3.4 Wildcard y redirección

- La ruta comodín `{ path: '**', redirectTo: 'dashboard' }` redirige lo desconocido; cualquier `path` nuevo debe estar **antes** de `**`.

---

## Checklist rápido (copiar para la IA)

Sustituir `<recurso>` según el caso.

**Django**

- [ ] Modelo + migración
- [ ] Serializer
- [ ] ViewSet + `queryset` / permisos
- [ ] `router.register(r"<plural>", <ViewSet>, basename="<singular>")` en `api/urls.py`
- [ ] Probar `GET /api/v1/<plural>/`

**Menú**

- [ ] MenuItem (Admin o SQL): `route` = `/<plural>`, `slug` único, `icon`, orden
- [ ] (Opcional) Fallback en `layout.component.ts` → `DEFAULT_NAV_GROUPS`

**Angular**

- [ ] `core/models/<recurso>.model.ts`
- [ ] `features/<plural>/<plural>.component.ts` extendiendo `BaseCrudComponent`
- [ ] `endpoint`, `entityName`, `columns`, `formFields` (+ export/filtros si aplica)
- [ ] `app.routes.ts`: `path` + `loadComponent`
- [ ] Probar navegación desde el menú y CRUD básico

---

## Ejemplo de referencia: `users`

| Capa | Ubicación |
|------|-----------|
| Router Django | `api/urls.py` → `r"users"`, `UserViewSet`, `basename="user"` |
| Vista / serializer | `api/views.py`, `api/serializers.py` |
| Modelo TS | `src/app/core/models/user.model.ts` |
| Feature | `src/app/features/users/users.component.ts` |
| Rutas | `src/app/app.routes.ts` → `path: 'users'` |

Un segundo ejemplo análogo: `groups` (`features/groups/groups.component.ts`).

---

## Prompt sugerido para otra IA

> Agrega el CRUD del modelo **`<NombreModelo>`** siguiendo `fvx-frontend/docs/add-crud-model.md` **después** de leer `fvx-frontend/docs/design-fvx.md` (diseño + catálogo) y añadiendo cadenas i18n en `en.json` / `es.json`.  
> - Backend: modelo, serializer, ViewSet y `router.register(r"<plural-kebab>", ..., basename="<singular>")` en `api/urls.py`.  
> - Menú: ítem con `route` `/<plural>` coherente con Angular.  
> - Frontend: interface en `core/models/`, componente en `features/<plural>/` extendiendo `BaseCrudComponent`, `endpoint` = `'<plural>'`, y ruta lazy en `app.routes.ts`.  
> Usa `users` (o `groups`) como referencia de estructura y convenciones.

Ajusta `<plural-kebab>` si el nombre compuesto lo requiere (p. ej. `cost-centers`).

---

## Notas adicionales

- **Versión API**: el front usa `environment.apiUrl` (p. ej. `.../api/v1`); no hace falta tocar `ApiService` si el recurso sigue el patrón REST estándar del router.
- **Exportación Excel**: opcional; en el componente definir `exportColumns` (p. ej. con `ExcelExportService.columnsExport(...)`) y en la plantilla `(exportClick)="onExport()"` en `app-crud-page`.
- **Errores de menú sin ruta**: el layout normaliza rutas y omite ítems sin `route`; conviene que el seed y Angular usen el **mismo** path (con barra inicial vs sin barra: el layout corrige `users` → `/users`).
