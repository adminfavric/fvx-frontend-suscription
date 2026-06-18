# Guía de diseño e interfaz FVX

Documento **único** de referencia para diseño visual, componentes reutilizables, formularios, temas, botones y subida de archivos en el front `fvx-frontend`. Sustituye a los antiguos archivos fragmentados (catálogo, formularios, botones, temas, file-uploader) para que **desarrolladores e IAs** tengan una sola fuente al crear vistas.

---

## Cómo debe leerlo una IA (orden recomendado)

1. **Este bloque** (objetivo, i18n, índice).
2. **Sección 1 — Temas** si la tarea afecta colores, `--fvx-*` o `ThemeService`.
3. **Sección 2 — Botones** para CTAs, diálogos y estados `disabled`.
4. **Sección 3 — Formularios** si hay campos, `FieldConfig` o `mat-form-field`.
5. **Sección 4 — File uploader** solo si la feature sube archivos.
6. **Sección 5 — Catálogo** para API de componentes, tablas, pipes y utilidades compartidas (referencia larga: consultar por nombre o saltar a la subsección indicada en el índice).

**Regla:** antes de escribir un control nuevo, **buscar en el catálogo (sección 5)** si ya existe un componente o patrón; respetar tokens `var(--fvx-*)` y clases globales (`.page-container`, `.content-card`, etc. descritas en `custom-site.md` y en el catálogo).

---

## Textos, idiomas (i18n) — obligatorio

- Toda **cadena visible al usuario** debe ir por **Transloco**: claves en `public/assets/i18n/en.json` y `es.json` (mismo árbol de claves en ambos idiomas salvo excepción justificada).
- En plantillas: `{{ 'mi.clave' | transloco }}` o el pipe en atributos; en TypeScript, `TranslocoService.translate('mi.clave')` cuando no sea plantilla.
- `placeholder`, títulos de página, `labelKey` de columnas/filtros, mensajes de error y vacíos: **nunca** literales fijos en español/inglés en el código del feature.

---

*Los documentos que antes estaban en archivos separados (catálogo, formularios, botones, temas, file uploader) están fusionados en este archivo; no existen copias en otros `.md` del repo.*

---

## Índice

1. [Sistema de estilos y temas](#diseno-temas)
2. [Botones y barras de acción](#diseno-botones)
3. [Formularios: estándar FVX (campos, layout, responsividad)](#diseno-formularios)
4. [app-file-uploader: subida de archivos](#diseno-file-uploader)
5. [Catálogo de piezas reutilizables (front shared, back api utils)](#diseno-catalogo)

---


<a id="diseno-temas"></a>

## 1. Sistema de estilos y temas

Este documento describe **cómo está armada la capa visual** del front plantilla: tokens SCSS, variables CSS por tema, archivos en `src/styles/`, y cómo las enlaza **`ThemeService`** (y opcionalmente el API vía **`UiSettingsService`**).

---

### 1. Dos capas: SCSS “fijo” vs CSS “por tema”

| Capa | Archivos / mecanismo | Uso recomendado |
|------|----------------------|-----------------|
| **Tokens SCSS** (`$variable`) | `_variables.scss` | Espaciado, radios, tipografía, colores de marca que **no** cambian con el tema del usuario (o que Material aún consume en SCSS). En componentes: `@use 'variables' as v;` |
| **Variables CSS** (`--fvx-*`) | `_theme-palettes.scss` aplicadas en `html` | Colores de shell, texto, sidebar, tablas, diálogos, etc. **Deben** usarse en estilos que deban seguir el tema claro/oscuro/híbrido. Ej.: `color: var(--fvx-text-primary);` |

**Regla práctica:** en UI nueva, preferir `var(--fvx-*)` para superficies y texto; usar `v.$*` para medidas y detalles que no son “skin”.

Los tokens **`--fvx-button-caution-*`** (botón ámbar de advertencia) viven en las paletas y se usan con la clase **`.fvx-btn-caution`**; la semántica de botones (primary **índigo** como acento de acción, warn rojo, caution ámbar, limpiar, etc.) está en [§ 2 — Botones (este documento)](design-fvx.md#diseno-botones). 
---

### 2. Árbol de archivos en `src/styles/`

| Ruta | Rol |
|------|-----|
| **`_variables.scss`** | Design tokens en tiempo de compilación (colores base, spacing, font sizes, shadows…). |
| **`_theme-palettes.scss`** | Mixins que asignan **`--fvx-*`** en un selector (p. ej. `html` o `html.theme-tmp-dark`). Es la **fuente de verdad** de las paletas. |
| **`_theme-css-vars.scss`** | Aplica la paleta **default** en `html { @include palettes.fvx-palette-default; }` (sin clase extra). |
| **`themes/_tmp-light.scss`** | `html.theme-tmp-light { @include fvx-palette-tmp-light; }` |
| **`themes/_tmp-dark.scss`** | `html.theme-tmp-dark { … }` |
| **`themes/_tmp-beige.scss`** | `html.theme-tmp-beige { … }` — shell y sidebar beige/cálidos, acento verde bosque (#00443D), gráficos alineados a composición contable. |
| **`themes/_tmp-blackandwhite.scss`** | Paleta alto contraste B/N. |
| **`_material-overrides.scss`** | Overrides globales de Angular Material; mezcla `v.$` y, donde aplica, `var(--fvx-*)` para tablas/dialogs acoplados al tema. |

La hoja global **`src/styles.scss`** (en la raíz de `src/`) **importa en orden** Material, variables, `theme-css-vars`, cada `themes/_tmp-*.scss`, y `material-overrides`. Ese orden importa: primero variables CSS base, luego las variantes por clase, después los overrides de componentes.

---

### 3. Tema “default” vs temas `tmp-*`

- **`tmp-default`**: no se añade ninguna clase `theme-tmp-*` en `<html>`. Solo aplican las reglas de `_theme-css-vars.scss` (mixin `fvx-palette-default` en `html`).
- **Resto** (`tmp-light`, `tmp-dark`, `tmp-blackandwhite`, `tmp-beige`): `ThemeService` añade en `<html>` la clase `theme-{id}` (p. ej. `theme-tmp-dark`). Cada archivo bajo `themes/` redefine los `--fvx-*` para ese selector. El id histórico **`tmp-hybrid`** se normaliza a **`tmp-default`** (misma apariencia que default).

Los ids válidos están centralizados en **`ThemeService`** (`FvxThemeId`, arrays `THEME_CLASSES` y `ALL_IDS`).

---

### 4. Runtime: `ThemeService` y persistencia

- Archivo: `src/app/core/services/theme.service.ts`.
- **`initFromStorage()`** (llamado desde `app.config.ts` en `provideAppInitializer`): lee `localStorage` bajo la clave `fvx-theme-id`; si el valor es un id válido, aplica esa clase en `document.documentElement`; si no, aplica **`tmp-default`** (quita todas las `theme-tmp-*`).
- **`setTheme(id)`**: quita clases anteriores, añade la que corresponde (salvo `tmp-default`), guarda en `localStorage` y actualiza el signal `currentId`.
- **`isValidThemeKey()`**: valida `theme_key` que viene del backend vía `GET /settings/ui/`.

El componente **`app-config-user`** (`config-user.component.ts`) en el pie del sidebar expone el selector de tema (y ancho/idioma); llama a `ThemeService.setTheme`.

#### 4.1 Ancho del contenido (`.page-container`)

- Servicio: **`PageContentWidthService`** (`src/app/core/services/page-content-width.service.ts`). La UI del selector vive en **`app-config-user`**.
- **`initFromStorage()`** en `app.config.ts` (junto al tema): clave `localStorage` **`fvx-page-content-width`** (`compact` \| `extended`).
- **Compacto** (por defecto): variable global `--fvx-page-container-max-width: 1440px` en `html` (`styles.scss`).
- **Extendido**: se añade la clase **`fvx-page-width-extended`** en `<html>` → el mismo token pasa a **`100%`** del viewport (ancho completo del área de contenido).
- Cualquier bloque con clase **`.page-container`** (dashboard, CRUD, showcase, etc.) usa `max-width: var(--fvx-page-container-max-width)`.

**Otros initializers relacionados**

- `app.config.ts` también llama a `UiSettingsService.bootstrapFromApi()` tras `initFromStorage()` — ver §5.
- `AppComponent.ngOnInit()` invoca `SessionTimeoutService.init()` (vigila la expiración del JWT y abre un diálogo de aviso). No toca el tema, pero convive con estos arranques: si cierra la sesión, el tema se queda como esté en `localStorage` hasta el próximo login.

---

### 5. API: `UiSettingsService` y `theme_key`

- Archivo: `src/app/core/services/ui-settings.service.ts`.
- Tras `ThemeService.initFromStorage()`, el initializer también ejecuta **`UiSettingsService.bootstrapFromApi()`**.
- `GET {apiUrl}/settings/ui/` lee el modelo singleton `UiSettings` en Django (editable desde el Admin). Si responde con un `theme_key` reconocido por `ThemeService.isValidThemeKey()`, se llama **`setTheme(theme_key)`** y **sustituye** el tema que hubiera en localStorage (comportamiento “marca manda”).

Si el endpoint falla, la app sigue solo con tema local.

#### 5.1 Jerarquía de 3 capas (tema)

El tema puede venir de tres fuentes; el orden de arranque define cuál prevalece:

| Prioridad | Fuente | Aplica en | Quién gana |
|-----------|--------|-----------|------------|
| 3 (máxima) | `Profile.ui_preferences.theme_id` | `UserUiPreferencesService.hydrateFromApi()` tras login | **Usuario autenticado** siempre |
| 2 | `UiSettings.theme_key` (backend) | `UiSettingsService.bootstrapFromApi()` en arranque | **Marca** sobre anónimos |
| 1 (mínima) | `localStorage` (`fvx-theme-id`) | `ThemeService.initFromStorage()` al bootstrap | Fallback para sesiones sin login |

**Nota:** si un usuario logueado tiene `theme_id` distinto al `theme_key` de marca, verá un flash intencional (marca → preferencia personal) al iniciar sesión. No es un bug; es la jerarquía funcionando.

---

### 6. Angular Material global

En `styles.scss`, el bloque `@include mat.theme(...)` define el **tema Material** (paleta primary/tertiary, tipografía, density). Los skins `tmp-*` actúan principalmente sobre **variables propias `--fvx-*`** y layout; parte del look de Material sigue ligado a ese `mat.theme` hasta que se amplíen overrides en `_material-overrides.scss` (como indica el plan en `PLAN_TEMPLATE.md`).

---

### 7. Cómo añadir un tema nuevo

1. En **`_theme-palettes.scss`**, crear un mixin `@mixin fvx-palette-tmp-mi-tema { … }` que defina todos los `--fvx-*` necesarios (puedes partir copiando `fvx-palette-tmp-light` o `default` y ajustar).
2. Crear **`src/styles/themes/_tmp-mi-tema.scss`** con:
   ```scss
   @use '../theme-palettes' as palettes;
   html.theme-tmp-mi-tema {
     @include palettes.fvx-palette-tmp-mi-tema;
   }
   ```
3. En **`src/styles.scss`**, añadir `@use 'styles/themes/tmp-mi-tema';` junto al resto de `themes/`.
4. En **`theme.service.ts`**: añadir el id a `FvxThemeId`, a `THEME_CLASSES` (`theme-tmp-mi-tema`), y a `ALL_IDS`; actualizar `label()` si hace falta.
5. El backend ya envía `theme_key` desde el modelo `UiSettings` (Django Admin); asegurarse de que el string coincida con `FvxThemeId`.

---

### 8. Referencias cruzadas

- Resumen en el README del front: sección **Temas (`tmp-*`)**.
- Botones y barras de acción (variantes Material, disabled, tokens): [§ 2 — Botones (este documento)](design-fvx.md#diseno-botones).
- Plan maestro: `code-master/PLAN_TEMPLATE.md` (§2.5 temas, `UiSettings.theme_key` cableado al 100 %).

<a id="diseno-botones"></a>

## 2. Botones y barras de acción

Guía para reutilizar el **mismo lenguaje** que los diálogos CRUD y los overrides de Angular Material en `src/styles/_material-overrides.scss` (comentario *BUTTONS* al inicio de la sección). No redefinir colores por componente salvo casos excepcionales.

---

### 1. Variantes Angular Material (M3)

| Necesidad | Directiva | Uso en la plantilla |
|-----------|-----------|---------------------|
| Cancelar, descartar, utilidades en cabecera (volver arriba, ayuda) | `mat-button` | Texto secundario, sin borde; no compite con el CTA principal. Ej. **Top** en `/components`. |
| **Limpiar** filtros o reset suave (sin borrar datos críticos) | `mat-button` + icono (`clear_all`, `restart_alt`, …) | Misma jerarquía que cancelar: acción reversible y poco ruidosa. Si necesitas más énfasis, valorar `mat-stroked-button` sin `color`. |
| Acción secundaria con borde neutro | `mat-stroked-button` | Outline con `var(--fvx-border)` en temas oscuros (ver overrides). |
| Secundaria con **acento de marca** (borde + primary) | `mat-stroked-button color="primary"` | El borde y el texto siguen `--fvx-link` (**índigo** en default/light/dark, verde bosque en beige, negro en B&W — tokenizado vía paletas). En `[disabled]`, en todas las paletas, borde/texto atenuados vía `--fvx-border` / `--fvx-text-muted` (prefijo `html` en `_material-overrides.scss`). |
| CTA principal (guardar, crear, confirmar) | `mat-flat-button color="primary"` | El relleno usa **`--fvx-link`** + texto `--fvx-accent-text` con contraste calibrado por tema (`#ffffff` en light, `#0a0c13` en dark). Hover aplica `--fvx-shadow-primary` (glow índigo sutil). |
| **Peligro** / eliminar / destruir | `mat-flat-button color="warn"` | Rojo de plantilla (`v.$color-warn` en SCSS); en `theme-tmp-dark` el relleno warn se fuerza explícitamente a rojo en `_material-overrides.scss`. **No** uses `warn` para “advertencias suaves”. |
| Advertencia / revisión / “publicar con riesgos” | `mat-flat-button` + clase **`fvx-btn-caution`** | Ámbar vía tokens `--fvx-button-caution-bg`, `--fvx-button-caution-fg`, `--fvx-button-caution-bg-hover` en `_theme-palettes.scss`. No existe `color="caution"` en Material. |

**Evitar** `--mdc-filled-button-container-color` o `!important` locales en primarios: desincroniza temas.

---

### 2. Tema oscuro (`theme-tmp-dark`)

Definido en **`html.theme-tmp-dark`** dentro de `_material-overrides.scss`:

- **Primary relleno** (`mat-flat-button` / `mat-raised-button` / `color="primary"`): fondo `var(--fvx-link)` (índigo `#6d7cf6`), hover usa `var(--fvx-accent-hover)` + `var(--fvx-shadow-primary)` (glow). Disabled con mezcla sobre `--fvx-bg-card` y texto muted.
- **Warn relleno**: rojo explícito; hover y disabled acordes al panel oscuro.
- **`mat-stroked-button color="primary"` deshabilitado**: borde y texto atenuados para que **se lea claramente como deshabilitado**.
- **`mat-mini-fab color="primary"`** y **`mat-icon-button color="primary"`**: alineados al acento índigo.

Todos los temas usan **`--fvx-link`** como primario tokenizado, por lo que el CTA toma automáticamente el acento de cada paleta (índigo en default/light/dark, verde bosque en beige, negro en B&W). La uniformidad la garantiza el override base en `_material-overrides.scss`; cada tema solo refina contraste (texto oscuro vs claro) en su propio bloque.

---

### 3. Deshabilitado (`[disabled]`)

- `[disabled]="condición"` en el `<button>`.
- Estilos **por paleta** usando variables `--fvx-*` en `html`: texto (`mat-button`), outlined (neutro y `color="primary"`), relleno primary/warn, `mat-icon-button` / `mat-mini-fab` primary. Así default y tmp-light se leen igual de claros que tmp-dark (este último y tmp-blackandwhite refinan con selectores `html.theme-tmp-*` más específicos).
- Spinner dentro del botón relleno primary: `--mdc-circular-progress-active-indicator-color: currentColor` en el mismo archivo.

---

### 4. Campos solo lectura vs botones

- Identidad inmutable: `mat-form-field` + `matInput` `disabled` + icono `lock` (ver perfil).
- **No** simular lectura con un botón que parezda habilitado.

---

### 5. Variables CSS (`--fvx-*`)

| Variable | Uso |
|----------|-----|
| `--fvx-link` | Acento principal del shell; en **tmp-dark** es también el color de **botones primary rellenos** y de **stroked primary**. |
| `--fvx-button-caution-bg` / `--fvx-button-caution-fg` / `--fvx-button-caution-bg-hover` | Solo para **`.fvx-btn-caution`**; definidas por paleta en `_theme-palettes.scss`. |

Más contexto de capas: [§ 1 — Temas (este documento)](design-fvx.md#diseno-temas). Drawer: `--entity-drawer-content-padding` en `app-entity-drawer`.

---

### 6. Referencias en código

- CRUD: `shared/components/entity-form-dialog/entity-form-dialog.component.ts`.
- Perfil: `shared/components/profile-editor/profile-editor.component.ts`.
- Galería interactiva: `features/components-showcase/components-showcase.component.ts` (`/components`).

<a id="diseno-formularios"></a>

## 3. Formularios: estándar FVX (campos, layout, responsividad)

Guía para **humanos e IAs** que implementan formularios (diálogos CRUD, páginas propias o embeds). Alinea el markup con lo que ya hace **`app-entity-form-dialog`** en create/edit y con los **overrides globales** de Angular Material (`src/styles/_material-overrides.scss`).

---

### 1. Principios

1. **Mismo lenguaje visual** que el resto del admin: `mat-form-field` con **`appearance="outline"`** y **`subscriptSizing="dynamic"`** para hints/errores compactos.
2. **Siempre pensar en móvil**: el formulario debe **leerse y usarse en viewport estrecho** (una columna, anchos fluidos, acciones apilables si aplica).
3. **Etiquetas explícitas** encima del control (patrón del CRUD), no solo flotantes de Material, para consistencia y accesibilidad.
4. **Reactive Forms** en flujos con API (`FormGroup` / `formControlName`), como en el diálogo de entidad.

---

### 2. Referencia de implementación: create/edit CRUD

El flujo **New … / Edit** de los CRUD genéricos abre **`EntityFormDialogComponent`** (`shared/components/entity-form-dialog/entity-form-dialog.component.ts`). Ahí está el **HTML de referencia** que debes imitar o extender.

#### 2.1 Contenedor del formulario

- El `<form>` lleva la clase **`dialog-form`** y un **grid**:
  - **Escritorio** (ancho > 768 px): dos columnas `1fr 1fr`, separación horizontal/vertical, `min-width` razonable para el diálogo.
  - **Móvil** (≤ 768 px): **una sola columna** (`1fr`), `min-width: 0`, `width: 100%` para evitar desbordes.

En **`styles.scss`** existe una base global para `.dialog-form` (grid 2 columnas, `min-width` / `max-width`, y **media query** `@media (max-width: 768px)` → una columna). El componente del diálogo además aplica estilos inline según `isMobile` para título, contenido y botonera en pantallas pequeñas.

**Regla:** cualquier formulario nuevo (página o diálogo) debe definir **layout en grid o flex** con **ruptura ≤ 768 px** (o el breakpoint que use el proyecto) y **no** depender de anchos fijos grandes sin `min-width: 0` en celdas flex/grid.

#### 2.2 Bloque de campo estándar (texto, número, email, etc.)

Patrón **`field-wrapper`** + etiqueta + `mat-form-field` outline:

```html
<div class="field-wrapper" [style.grid-column]="isMobile ? '' : (field.colspan ? 'span ' + field.colspan : '')">
  <label class="field-label">
    {{ field.label }}
    @if (field.required) { <span class="required">*</span> }
  </label>
  <mat-form-field appearance="outline" subscriptSizing="dynamic">
    <input matInput [type]="field.type" [formControlName]="field.key" [placeholder]="field.placeholder || ''" />
  </mat-form-field>
  @if (field.hint) {
    <span class="field-hint">{{ field.hint }}</span>
  }
</div>
```

- **`field-label`**: texto secundario, peso medio, asterisco **`required`** en color de advertencia.
- **`field-hint`**: texto auxiliar bajo el campo (no sustituye al `hint` de Material si usas `mat-hint` dentro del field; aquí es línea extra opcional del modelo `FieldConfig`).
- **`grid-column`**: en desktop, **`FieldConfig.colspan`** puede hacer que el campo ocupe las dos columnas (`span 2`).

#### 2.3 `textarea`

Misma envoltura; dentro del `mat-form-field`:

```html
<textarea matInput [formControlName]="field.key" rows="3" [placeholder]="field.placeholder || ''"></textarea>
```

#### 2.4 `date`

`mat-form-field` outline + `input` + `mat-datepicker-toggle` **suffix** + `mat-datepicker` (ver template del componente).

#### 2.5 `select`

No uses solo `mat-select` en el CRUD estándar: se usa **`app-smart-select`** con `formControlName` y `options` desde `FieldConfig`.

#### 2.6 `boolean`

Fila **`checkbox-field`** con **`mat-checkbox`** y el texto en el label del checkbox (sin duplicar `field-wrapper` completo).

```html
<div class="checkbox-field">
  <mat-checkbox [formControlName]="field.key">{{ field.label }}</mat-checkbox>
</div>
```

#### 2.7 Acciones del diálogo

- **Desktop:** acciones alineadas al final (`mat-dialog-actions`).
- **Móvil:** botones a **ancho completo**, columna, separación y borde superior (ver `mobileStyles` en el componente).
- **Variantes y `[disabled]`:** [§ 2 — Botones (este documento)](design-fvx.md#diseno-botones) (alineado a `_material-overrides.scss`, sin duplicar colores por componente).

---

### 3. Estilos globales que afectan a los campos

Las clases **`field-wrapper`**, **`field-label`**, **`field-hint`** y el modificador **`dialog-form--embed`** (grid sin `min-width` fijo del diálogo CRUD) están en **`src/styles.scss`** junto a **`.dialog-form`**, para reutilizarlas en login, perfil embebido y cualquier página que replique el patrón del §2.

Los **`mat-form-field` outline** heredan bordes, foco, error, label, placeholder, autofill, etc. desde **`src/styles/_material-overrides.scss`** (sección *FORM FIELDS* y, en temas oscuros, el bloque `html.theme-tmp-dark` / `theme-tmp-blackandwhite`).

Resumen útil:

- No luches contra el sistema sin motivo: usa **`appearance="outline"`** y variables **`--fvx-*`** donde el catálogo lo indique.
- **Autofill** del navegador está compensado a nivel global (`input`/`textarea`/`select`); si un campo se ve raro, revisa primero overrides antes de añadir hacks locales.

Más contexto: **[§ 1 — Temas (este documento)](design-fvx.md#diseno-temas)**.

---

### 4. Checklist para un formulario nuevo

| # | Comprobar |
|---|------------|
| 1 | ¿Grid/flex con **una columna** en ≤768 px (o breakpoint acordado)? |
| 2 | ¿`min-width: 0` / `width: 100%` donde haya riesgo de overflow en grid? |
| 3 | ¿Campos outline con **`subscriptSizing="dynamic"`** si hay hint/error? |
| 4 | ¿Etiqueta visible + **required** coherente con validadores del `FormGroup`? |
| 5 | ¿Selects grandes usando **`app-smart-select`** cuando aplique? |
| 6 | ¿Fechas con datepicker Material alineado al patrón CRUD? |
| 7 | ¿Botones principales/secundarios claros en móvil (full width si el patrón es diálogo fullscreen/móvil)? |

---

### 5. Dónde mirar en código

| Qué | Dónde |
|-----|--------|
| Template HTML create/edit | `shared/components/entity-form-dialog/entity-form-dialog.component.ts` (inline `template`) |
| Definición de campos por pantalla | Features `users`, `groups` → arrays `formFields` / `FieldConfig` |
| Contrato `FieldConfig` | `core/models/api.model.ts` |
| Grid global `.dialog-form` + `field-wrapper` / `field-label` | `src/styles.scss` |
| Overrides Material (formulario) | `src/styles/_material-overrides.scss` |
| Catálogo del diálogo | `docs/design-fvx.md` (§ 5) → **§2.5 `app-entity-form-dialog`** |

---

### 6. Formularios fuera del diálogo CRUD

Si el formulario vive en una **página** (no en `MatDialog`), replica el **mismo patrón visual** (wrappers, labels, `outline`, responsividad). Puedes reutilizar la clase **`.dialog-form`** como grid de página o definir una clase hermana (por ejemplo `.page-form`) copiando las mismas reglas de grid y media query para no duplicar lógica de forma divergente.

Lo importante es **una sola idea**: escritorio en columnas razonables, móvil en **una columna** y controles que **no se salgan del viewport**.

<a id="diseno-file-uploader"></a>

## 4. app-file-uploader: subida de archivos

Componente standalone + sistema de *providers* para subir archivos a **cualquier** backend (Firebase Storage, Google Cloud Storage, Amazon S3, un endpoint propio, Django Storage, etc.) sin que tu feature dependa de un SDK concreto.

**Archivos involucrados**

| Archivo | Rol |
|---------|-----|
| `shared/components/file-uploader/file-uploader.component.ts` | UI: drop-zone, lista de items, progreso, validación. |
| `shared/components/file-uploader/providers/file-upload-provider.ts` | Interfaz `FileUploadProvider` + token `FILE_UPLOAD_PROVIDER`. |
| `shared/components/file-uploader/providers/signed-url-upload.provider.ts` | Provider genérico: pide URL firmada al backend y hace `PUT` del binario (sirve para **GCS**, **S3**, Django Storage). |
| `shared/components/file-uploader/providers/firebase-storage-upload.provider.ts` | Provider que usa el SDK de Firebase Storage. |

---

### 1. Arquitectura

```
feature.component   →   FileUploaderComponent   →   FileUploadProvider (token)
                                                        ├── DjangoUploadProvider           ⭐ default del template
                                                        ├── SignedUrlUploadProvider        (uploads directos a bucket — alta escala)
                                                        ├── FirebaseStorageUploadProvider  (opcional, Firebase Storage SDK)
                                                        └── MyCustomProvider               (tu implementación)
```

El componente **no sabe** si sube a Django, Firebase, GCS o S3. Delega en el token `FILE_UPLOAD_PROVIDER`, así puedes:

- **Cambiar de backend** moviendo una línea en `app.config.ts`.
- **Mezclar providers** por ruta si hace falta (usando `providers: [...]` en la ruta).
- **Escribir tests** inyectando un provider fake.

**Cuál usar:**
- **`DjangoUploadProvider`** (recomendado por defecto): multipart `POST /api/v1/uploads/`. Django guarda en local FS / S3-compatible / GCS según `STORAGE_BACKEND` en `.env`. Sin CORS de bucket que configurar; cambiar de cloud = 1 env var. Progreso `%` funciona vía `HttpClient.reportProgress`. Cubre archivos < ~100 MB sin tunear nada. Doc: `fvx-backend/docs/storage.md`.
- **`SignedUrlUploadProvider`**: el front pide al backend una URL firmada y sube **directo al bucket**, saltándose Django. Recomendado para archivos enormes o alta concurrencia (Django no levanta el binario en memoria). Requiere endpoint que firme URLs y CORS del bucket — no incluido por defecto en el template.
- **`FirebaseStorageUploadProvider`**: si tu app ya depende de Firebase y prefieres usar las Security Rules del bucket en lugar de un backend.

#### Contrato del provider

```ts
interface FileUploadProvider {
  upload(
    file: File,
    context?: FileUploadContext,
    onProgress?: (p: FileUploadProgress) => void,
  ): Observable<FileUploadResult>;

  delete?(path: string): Observable<void>;
}

interface FileUploadResult {
  url: string;              // URL para mostrar/descargar
  path?: string;            // path dentro del bucket
  size?: number;
  name?: string;
  mimeType?: string;
  meta?: Record<string, unknown>;
}
```

---

### 2. Uso del componente

```html
<app-file-uploader
  [accept]="'image/*,application/pdf'"
  [multiple]="true"
  [maxFileSizeMb]="10"
  [maxFiles]="5"
  [pathPrefix]="'uploads/invoices/' + invoice.id"
  [metadata]="{ invoiceId: invoice.id.toString() }"
  (uploaded)="onUploaded($event)"
  (errored)="onError($event)"
/>
```

```ts
import { FileUploaderComponent } from '../../shared/components/file-uploader/file-uploader.component';
import { FileUploadResult } from '../../shared/components/file-uploader/providers/file-upload-provider';

@Component({
  standalone: true,
  imports: [FileUploaderComponent],
  // …
})
export class MyPageComponent {
  onUploaded(items: FileUploadResult[]) {
    // items es el ACUMULADO de todos los archivos subidos con éxito en este componente.
    // La lista se reemite cada vez que un archivo termina.
    this.files.set(items);
  }

  onError(e: { item: UploadItem; error: unknown }) {
    console.error(e);
  }
}
```

#### Inputs principales

| Input | Default | Descripción |
|-------|---------|-------------|
| `accept` | — | Igual que `<input accept>`: `image/*`, `.pdf`, `application/pdf`, etc. (CSV). |
| `multiple` | `true` | Permite seleccionar varios archivos. |
| `maxFileSizeMb` | — | Rechaza archivos mayores al tamaño indicado. |
| `maxFiles` | — | Cupo total de archivos que la instancia acepta. |
| `pathPrefix` | — | Se pasa al provider como `context.pathPrefix`. |
| `metadata` | — | Se pasa al provider como `context.metadata`. |
| `autoUpload` | `true` | Si `false`, los items quedan `queued` hasta llamar `uploaderRef.uploadAll()`. |
| `disabled` | `false` | Bloquea drop + selector. |

#### Outputs

| Output | Emite |
|--------|-------|
| `uploaded` | `FileUploadResult[]` acumulados (éxito). |
| `itemUploaded` | `FileUploadResult` cada vez que un archivo termina. |
| `errored` | `{ item, error }` por cada fallo. |
| `removed` | `UploadItem` al quitar un item. |

---

### 3. Provider — `DjangoUploadProvider` (default del template) ⭐

Sube vía `POST {apiUrl}/uploads/` (multipart). Django guarda con `default_storage`. El switch entre local FS, S3-compatible o GCS es **una env var** en backend (`STORAGE_BACKEND`). El front no se entera del cambio.

#### 3.1 Flujo

1. Front → `POST {apiUrl}/uploads/` con `multipart/form-data` `{ file, path_prefix?, metadata? }`.
2. Django guarda con `default_storage.save(...)` y responde:
   ```json
   {
     "url": "https://bucket.s3.amazonaws.com/profiles/avatars/foo.png",
     "path": "profiles/avatars/foo.png",
     "size": 12345,
     "name": "foo.png",
     "mime_type": "image/png",
     "meta": { "lo_que_pasaste_en_metadata": "..." }
   }
   ```
3. El provider devuelve `{ url, path, size, name, mimeType, meta }` ya mapeado a `FileUploadResult`.

#### 3.2 Configuración

```ts
// app.config.ts
import { FILE_UPLOAD_PROVIDER } from './shared/components/file-uploader/providers/file-upload-provider';
import { DjangoUploadProvider } from './shared/components/file-uploader/providers/django-upload.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    { provide: FILE_UPLOAD_PROVIDER, useClass: DjangoUploadProvider },
  ],
};
```

#### 3.3 Backend storage — cambiar de cloud con `.env`

| Cloud | `STORAGE_BACKEND` | Variables clave |
|---|---|---|
| Local FS (dev) | `local` | `MEDIA_URL`, `MEDIA_ROOT` (ya configurados) |
| AWS S3 | `s3` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME` |
| **Backblaze B2** | `s3` | igual + `AWS_S3_ENDPOINT_URL=https://s3.us-west-002.backblazeb2.com` |
| DO Spaces / Wasabi / R2 / MinIO | `s3` | igual + `AWS_S3_ENDPOINT_URL` del proveedor |
| Google Cloud Storage | `gcs` | `GS_BUCKET_NAME`, `GOOGLE_APPLICATION_CREDENTIALS` |

Doc completo: [`fvx-backend/docs/storage.md`](../../fvx-backend/docs/storage.md).

#### 3.4 Por qué no usa "URL firmada directa al bucket"

Para uploads < 100 MB no se nota la diferencia y este patrón es **mucho más simple**:
- Sin CORS de bucket por proveedor.
- Sin libs distintas por provider en el front.
- Mismo provider front cualquiera sea el cloud.
- Auth ya gestionado por el `authInterceptor` (JWT).

Para uploads enormes (vídeos 4K, backups, etc.) sí conviene migrar a `SignedUrlUploadProvider` (siguiente sección).

---

### 4. Provider — `SignedUrlUploadProvider` (alta escala)

Funciona para **cualquier backend** (GCS, S3, Django Storage, servidor propio) porque el front nunca conoce el bucket: solo pide una URL firmada y sube.

#### 3.1 Flujo

1. Front → `POST {apiUrl}/uploads/signed-url/` con `{ filename, mime_type, size, path_prefix?, metadata? }`.
2. Backend responde:
   ```json
   {
     "upload_url": "https://storage.googleapis.com/.../signed?X-Goog-Signature=...",
     "upload_headers": { "Content-Type": "application/pdf" },
     "storage_path": "uploads/2026/04/file.pdf",
     "public_url": "https://cdn.my-app.com/uploads/2026/04/file.pdf",
     "meta": { "file_id": 1234 }
   }
   ```
3. Front → `PUT upload_url` con el binario + `upload_headers`.
4. El provider devuelve `{ url: public_url, path: storage_path, ... }`.

#### 3.2 Configuración

```ts
// app.config.ts
import { FILE_UPLOAD_PROVIDER } from './shared/components/file-uploader/providers/file-upload-provider';
import { SignedUrlUploadProvider } from './shared/components/file-uploader/providers/signed-url-upload.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    // …
    { provide: FILE_UPLOAD_PROVIDER, useClass: SignedUrlUploadProvider },
  ]
};
```

El endpoint por defecto es `{environment.apiUrl}/uploads/signed-url/`. Si quieres otro, hereda del provider:

```ts
@Injectable({ providedIn: 'root' })
export class MySignedUrlProvider extends SignedUrlUploadProvider {
  protected override signedUrlEndpoint = `${environment.apiUrl}/custom/signed/`;
}
```

#### 3.3 Endpoint Django (GCS)

Ejemplo mínimo usando `google-cloud-storage` + `google-auth`:

```python
# api/views.py
import datetime
from google.cloud import storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class SignedUrlView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        body = request.data
        filename = body["filename"]
        mime = body["mime_type"]
        prefix = body.get("path_prefix") or "uploads"

        path = f"{prefix}/{datetime.datetime.utcnow().strftime('%Y/%m')}/{filename}"

        client = storage.Client()
        bucket = client.bucket(settings.GCS_BUCKET)
        blob = bucket.blob(path)

        url = blob.generate_signed_url(
            expiration=datetime.timedelta(minutes=10),
            method="PUT",
            content_type=mime,
            version="v4",
        )

        return Response({
            "upload_url": url,
            "upload_headers": {"Content-Type": mime},
            "storage_path": path,
            "public_url": f"https://storage.googleapis.com/{settings.GCS_BUCKET}/{path}",
            "meta": {},
        })
```

Rutas:

```python
# api/urls.py
path("uploads/signed-url/", SignedUrlView.as_view()),
```

Permite CORS desde tu dominio para el bucket (`gsutil cors set …`).

#### 3.4 S3 (mismo esquema)

Sustituye `google-cloud-storage` por `boto3`:

```python
s3 = boto3.client("s3")
url = s3.generate_presigned_url(
    "put_object",
    Params={"Bucket": "my-bucket", "Key": path, "ContentType": mime},
    ExpiresIn=600,
)
return Response({
    "upload_url": url,
    "upload_headers": {"Content-Type": mime},
    "storage_path": path,
    "public_url": f"https://my-bucket.s3.amazonaws.com/{path}",
})
```

---

### 5. Provider — `FirebaseStorageUploadProvider`

Úsalo cuando tu proyecto ya dependa de Firebase (auth, firestore, etc.) y prefieras subir desde el front sin tocar backend.

#### 5.1 Instalación

```bash
npm install firebase
```

#### 5.2 Initialization

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { environment } from '../environments/environment';
import { FILE_UPLOAD_PROVIDER } from './shared/components/file-uploader/providers/file-upload-provider';
import { FirebaseStorageUploadProvider } from './shared/components/file-uploader/providers/firebase-storage-upload.provider';

const firebaseApp = initializeApp(environment.firebase);
const firebaseStorage = getStorage(firebaseApp);

export const appConfig: ApplicationConfig = {
  providers: [
    // …
    {
      provide: FILE_UPLOAD_PROVIDER,
      useFactory: () => {
        const p = new FirebaseStorageUploadProvider();
        p.storage = firebaseStorage;
        return p;
      },
    },
  ],
};
```

#### 5.3 `environment.ts`

```ts
export const environment = {
  // …
  firebase: {
    apiKey: '…',
    authDomain: '…',
    projectId: '…',
    storageBucket: '…',
    messagingSenderId: '…',
    appId: '…',
  },
};
```

#### 5.4 Reglas

Ajusta `storage.rules` para permitir escritura autenticada:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

#### 5.5 Notas

- El provider importa el SDK con `await import('firebase/storage')`, por lo que si **no** lo provees, Webpack no incluye Firebase en el bundle (tree-shaking por no referenciar la clase).
- Si quieres autenticación con el propio usuario Firebase, inicialízala por separado (`firebase/auth`).

---

### 6. Construir tu propio provider

```ts
@Injectable({ providedIn: 'root' })
export class MyCustomProvider implements FileUploadProvider {
  private http = inject(HttpClient);

  upload(file, context, onProgress) {
    const form = new FormData();
    form.append('file', file);
    if (context?.pathPrefix) form.append('path_prefix', context.pathPrefix);

    return this.http
      .post<{ url: string; path: string }>(
        `${environment.apiUrl}/my-upload/`,
        form,
        { reportProgress: true, observe: 'events' },
      )
      .pipe(
        filter(e => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
        map(e => {
          if (e.type === HttpEventType.UploadProgress) {
            onProgress?.({ progress: e.total ? e.loaded / e.total : 0, loaded: e.loaded, total: e.total });
            return null;
          }
          const res = (e as HttpResponse<any>).body;
          return { url: res.url, path: res.path, name: file.name, size: file.size, mimeType: file.type };
        }),
        filter((r): r is FileUploadResult => r !== null),
      );
  }
}
```

Luego:

```ts
{ provide: FILE_UPLOAD_PROVIDER, useClass: MyCustomProvider }
```

---

### 7. Testing rápido con un provider fake

```ts
const fakeProvider: FileUploadProvider = {
  upload: (file, ctx, onProgress) => new Observable(sub => {
    setTimeout(() => { onProgress?.({ progress: 0.5 }); }, 50);
    setTimeout(() => {
      onProgress?.({ progress: 1, state: 'success' });
      sub.next({ url: `blob:${file.name}`, path: `fake/${file.name}`, name: file.name, size: file.size });
      sub.complete();
    }, 100);
  }),
};

TestBed.configureTestingModule({
  imports: [FileUploaderComponent],
  providers: [{ provide: FILE_UPLOAD_PROVIDER, useValue: fakeProvider }],
});
```

---

### 8. Integraciones sugeridas

- **Avatar uploader** → `accept="image/*"`, `maxFileSizeMb=2`, tras `uploaded` guardar `user.profile.avatar_url`.
- **Attach en form** → `autoUpload=false`, al hacer submit del formulario llamar `uploaderRef.uploadAll()` y esperar `uploaded`.
- **Import CSV** → combinar con un `content-dialog` que tenga un stepper (ver roadmap en `custom-site.md`).

<a id="diseno-catalogo"></a>

## 5. Catálogo de piezas reutilizables (front shared, back api utils)

Documentación para **humanos e IAs** que construyen features sobre la plantilla `code-master`: qué componentes, pipes, directivas y utilidades Python existen, cómo importarlos y qué contratos (`@Input` / `@Output` / datos de diálogo) respetan.

**Tipos compartidos (Angular):** `src/app/core/models/api.model.ts` — `ColumnConfig`, `TableAction`, `FilterConfig`, `FieldConfig`, `RelationshipConfig`, `QueryParams`, `PaginatedResponse`, etc.

---

### 1. Convenciones Angular

- Todo en `shared/` listado aquí es **standalone**: añade el símbolo al array `imports: []` de tu componente o ruta.
- Rutas de archivo: relativas a `fvx-frontend/src/app/`.
- Los gráficos (`app-chart`) viven en **`shared/components/chart/`** como el resto; ver **§2.29b `app-chart`**.

---

### 2. Componentes — `shared/components/`

#### 2.1 `app-layout`

| | |
|--|--|
| **Archivo** | `shared/components/layout/layout.component.ts` |
| **Rol** | Shell admin: sidebar, menú (`MenuService` + fallback), topbar (usuario), pie de sidebar con **`app-config-user`** (preferencias colapsables: tema, ancho, idioma), `<main class="main-content"><router-outlet/></main>`. |
| **Uso** | Ya configurado en `app.routes.ts` como padre de rutas autenticadas; no suele importarse en features. |

---

#### 2.1a `app-config-user`

| | |
|--|--|
| **Archivo** | `shared/components/config-user/config-user.component.ts` |
| **Imports** | `ConfigUserComponent` |

Bloque **colapsable** vía **`app-section-card`** (`[collapsible]="true"`, `expanded` + `expandedChange` ligados a un `signal` interno) con tema, ancho de página e idioma (`app-segmented-toggle` + `ThemeService`, `PageContentWidthService`, Transloco). **Abierto por defecto**; el usuario puede plegar el cuerpo con el chevron del section-card.

**Input:** `narrow` (`boolean`) — `true` cuando el sidebar está en modo raíl (colapsado en escritorio): cabecera del panel muestra solo ícono `tune` y los segmentos van en vertical.

**Uso:** desde `app-layout`: `<app-config-user [narrow]="collapsed() && !isMobile()" />`.

---

#### 2.2 `app-crud-page`

| | |
|--|--|
| **Archivo** | `shared/components/crud-page/crud-page.component.ts` |
| **Imports** | `CrudPageComponent` |

**Inputs**

| Nombre | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `title` | `string` | `''` | Título principal (`app-page-header`). |
| `entityName` | `string` | `''` | Nombre de entidad para el botón “Add …” / “Añadir …” (`crud.addItem`). |
| `subtitle` | `string?` | — | Subtítulo bajo el título. |
| `breadcrumbs` | `PageBreadcrumb[]?` | — | Migas (`PageBreadcrumb`: `label`, `link?`); vacío = sin franja de migas. |
| `columns` | `ColumnConfig[]` | `[]` | Columnas de la tabla. |
| `actions` | `TableAction[]` | `[]` | Iconos de fila; si vacío, no hay columna Actions. |
| `filters` | `FilterConfig[]` | `[]` | Filtros declarativos; si length > 0 se renderizan según `filterMode`. |
| `filterMode` | `'panel' \| 'dropdown' \| 'inline'` | `'dropdown'` | Cómo se muestran los filtros: **`'dropdown'`** botón `filter_list` con badge en el toolbar de la tabla; **`'panel'`** panel lateral fijo a la derecha; **`'inline'`** barra de `app-smart-select` (uno por filtro) sobre la tabla. **Responsive:** `'inline'` cae automáticamente a `'dropdown'` en mobile (≤768px) — una fila de selectores no cabe en pantalla angosta; así dejas `'inline'` y obtienes selectores en desktop + desplegable en mobile sin configurar por pantalla. |
| `data` | `any[]` | `[]` | Filas actuales. |
| `totalCount` | `number` | `0` | Total para el paginador (DRF). |
| `pageSize` | `number` | `20` | |
| `pageIndex` | `number` | `0` | Índice 0-based. |
| `loading` | `boolean` | `false` | Pasa a `app-data-table` como `isLoading`. |

**Outputs**

`createClick`, `pageChange` (`PageEvent`), `sortChange` (`Sort`), `searchChange` (`string`), `filterChange` (`Record<string, any>`), `actionClick` (`{ action, row }`), `rowClick` (`row`), `refreshClick`, `exportClick`.

**Notas** — Cabecera con **`app-page-header`** (acción “New …” en el slot `actions`). Contenedor `.page-container` y cuerpo `.page-body` / `.page-table` (ver `src/styles.scss`). Sin lógica de API; delega en el padre (p. ej. `BaseCrudComponent`).

---

#### 2.3 `app-data-table`

| | |
|--|--|
| **Archivo** | `shared/components/data-table/data-table.component.ts` |
| **Imports** | `DataTableComponent` |
| **Encapsulation** | `ViewEncapsulation.None` (afecta estilos globales de tabla). |

**Inputs**

| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `columns` | `ColumnConfig[]` | setter reordena `name` / `code` si hace falta. |
| `actions` | `TableAction[]` | |
| `data` | `any[]` | Origen del `mat-table` (no usa `MatTableDataSource` en template, array directo). |
| `totalCount` | `number` | |
| `pageSize` | `number` | |
| `pageIndex` | `number` | |
| `isLoading` | `boolean` | Barra de progreso superior. |
| `searchPlaceholder` | `string` | Default `'Search...'`; `crud-page` arma `'Search ' + title + '...'`. |
| `emptyIcon` | `string` | Default `'inbox'`. Ícono del empty cuando no hay datos. |
| `emptyTitle` | `string` | Default `'No records found'`. |
| `emptyDescription` | `string?` | Texto opcional bajo el título. |
| `emptyFilteredIcon` | `string` | Default `'search_off'`. Ícono cuando hay búsqueda activa pero 0 resultados. |
| `emptyFilteredTitle` | `string` | Default `'No results match your filter'`. |
| `emptyFilteredDescription` | `string?` | |

**Outputs**

`pageChange`, `sortChange`, `searchChange` (debounce **400 ms**), `actionClick`, `rowClick`, `refreshClick`, `exportClick`.

**Proyección de contenido**

```html
<app-data-table ...>
  <div tableActions>
    <button mat-icon-button>...</button>
  </div>

  <!-- Slot del empty-state cuando NO hay búsqueda activa -->
  <ng-container emptyActions>
    <button mat-flat-button color="primary" (click)="openCreate()">
      <mat-icon>add</mat-icon>
      Add your first record
    </button>
  </ng-container>

  <!-- Slot adicional cuando el empty se dispara por filtro -->
  <ng-container emptyFilteredActions>
    <button mat-stroked-button (click)="resetAdvancedFilters()">Reset filters</button>
  </ng-container>
</app-data-table>
```

Atributos del hijo directo:

| Slot | Cuándo aparece | Botón "Clear search" incluido |
|------|----------------|------------------------------|
| `tableActions` | Siempre, en la toolbar junto a refresh/export. | n/a |
| `emptyActions` | Cuando `data.length === 0` y **no** hay búsqueda activa. | no |
| `emptyFilteredActions` | Cuando `data.length === 0` y **sí** hay texto en el buscador. | sí, automático |

**Toolbar** — búsqueda con **`app-search-input`** (misma semántica: `searchChange` con debounce **400 ms**). Misma apariencia `mat-form-field` outline que en el resto de la app (barra en `.table-toolbar` / `.search-field`; ver `styles.scss` solo para layout, no para variantes de borde distintas al componente).

**Empty state** — **`app-empty-state`** (compact) con dos variantes: (a) dataset vacío, (b) filtro sin resultados (botón *Clear search* que vacía el buscador y reemite). Los chips `boolean` / `chip` usan `app-status-chip` y el tema `--fvx-*`.

**Tipos de columna (`ColumnConfig.type`)**

| `type` | Comportamiento |
|--------|----------------|
| *(omitido)* / `'text'` | Texto; si `col.render(row)` existe, se usa su string; si `key` es `code` o termina en `_code` o contiene `code`, estilo `code-chip`. |
| `'boolean'` | Chips Yes / No. |
| `'chip'` | `chipMap[row[key]]` o valor crudo; clases CSS según valor (`getChipClass`). |
| `'date'` | Pipe `dateFormat` (timezone Chile por defecto). |

**Ordenación** — `sortable !== false` expone `mat-sort-header` con `col.key`. El padre debe mapear `Sort` → query `ordering` DRF.

**Columna Acciones — patrón "primary + kebab"**

La última columna `actions` se renderiza con dos zonas:

1. **Acción primaria visible** (botón de texto con icono, sin caja Material — sutil, 28 px de alto). Convención:
   - Si **alguna** acción tiene `primary: true` → esas son primarias.
   - Si **ninguna** tiene el flag → la **primera** del array pasa a primaria automáticamente.
   - Si marcas **todas** con `primary: false` explícito → todo va al kebab.
2. **Kebab `⋮`** (`mat-icon-button` 28 px) que abre `mat-menu` con las acciones secundarias. Items con `color: 'warn'` se renderizan en rojo (clase `.danger` aplicada al `mat-menu-item` vía `panelClass="fvx-kebab-menu"`).

```ts
override actions: TableAction[] = [
  // Edit es la primera → automáticamente visible inline.
  { action: 'edit', labelKey: 'crud.actions.edit', icon: 'edit', color: 'primary' },
  // El resto va al kebab.
  { action: 'toggle_active', labelKey: 'crud.actions.toggleActive', icon: 'toggle_on' },
  // Delete con color:'warn' → en el menú aparece en rojo.
  { action: 'delete', labelKey: 'crud.actions.delete', icon: 'delete', color: 'warn' },
];
```

**Detalles visuales (implementados en `data-table.component.ts`):**

- Columna sticky a la derecha (`stickyEnd`), ancho fijo **130 px**.
- **Zebra striping** sobre `tbody tr:nth-child(even)`: tinte 6% del texto primario sobre `--fvx-bg-card`. Funciona sin código en cualquier tema.
- **Gradiente fade** de 28 px pegado al borde izquierdo del sticky para reemplazar el "corte" duro del scroll horizontal.
- **Línea divisoria interna** del sticky a 10 px arriba/abajo, `opacity: 0.5`, en lugar de borde a todo lo alto.
- **Hover** tinta toda la fila incluida la sticky con `--fvx-link` al 8%.

Estilos en `data-table.component.ts` (sección "Zebra" + "Gradiente fade"); estilos del menú kebab en `styles.scss` (`.mat-mdc-menu-panel.fvx-kebab-menu`).

---

#### 2.4 `app-filter-panel`

| | |
|--|--|
| **Archivo** | `shared/components/filter-panel/filter-panel.component.ts` |
| **Imports** | `FilterPanelComponent` |

**Inputs** — `filters: FilterConfig[]`

**Outputs** — `filterChange: EventEmitter<Record<string, any>>` — objeto de query params acumulados; clave = `filter.paramName || filter.key`. Valores boolean en string `'true'` / `'false'` cuando usa `getBooleanOptions()`. Para `type: 'text'`, el valor es el string tecleado (ya trimeado); si queda vacío, la clave se omite.

**UI** — Por cada filtro:
- `type: 'text'` → **input nativo de texto** con debounce **400 ms** (misma cadencia que `app-search-input`). El valor se mantiene local mientras el usuario teclea; tras la pausa se emite `filterChange`.
- `type: 'boolean'` / `type: 'select'` → enlace "All" + lista de `filter.options` o, si no hay `options`, `getBooleanOptions()` (Yes/No).

El tipo influye también en el icono del grupo (`boolean` → `toggle_on`, `select` → `tune`, `text` → `label`).

**Móvil** — `< 769px` inicia colapsado.

**Control desde `app-crud-page`** — `@Input() showFilterPanel?: boolean`. `undefined` (default) mantiene el comportamiento histórico: muestra el panel si `filters.length > 0`. `true` lo fuerza visible; `false` lo oculta aunque haya filtros configurados.

---

#### 2.5 `app-entity-form-dialog` (MatDialog)

| | |
|--|--|
| **Archivo** | `shared/components/entity-form-dialog/entity-form-dialog.component.ts` |
| **Apertura** | `MatDialog.open(EntityFormDialogComponent, { data: EntityFormDialogData, ... })` |

**`EntityFormDialogData`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | `string` | Título del diálogo. |
| `fields` | `FieldConfig[]` | Definición de campos. |
| `entity` | `any?` | Valores iniciales en edición (`entity[field.key]`). |
| `mode` | `'create' \| 'edit'` | |

**`FieldConfig.type` soportado en template**

| `type` | Widget |
|--------|--------|
| `'select'` | `app-smart-select` + `FormControlName` |
| `'boolean'` | `mat-checkbox` |
| `'textarea'` | `textarea` outline |
| `'date'` | `mat-datepicker` |
| `'text'`, `'number'`, `'email'`, `'password'` | `@default` → `input` con `[type]="field.type"` |

**No implementado en template:** `'autocomplete'` (cae en `@default` como input; no usar así en producción sin ampliar el diálogo).

**Cierre** — `dialogRef.close(undefined)` cancelar; éxito: objeto plano con valores; fechas → `YYYY-MM-DD`; `''` en select/number → `null`.

---

#### 2.6 `app-confirm-dialog` (MatDialog)

| | |
|--|--|
| **Archivo** | `shared/components/confirm-dialog/confirm-dialog.component.ts` |

**`ConfirmDialogData`:** `title`, `message`, `confirmText?`, `cancelText?`, `color?: 'primary' \| 'warn'`

**Resultado** — `afterClosed()`: `true` / `false`.

---

#### 2.7 `app-relationship-dialog` (MatDialog)

| | |
|--|--|
| **Archivo** | `shared/components/relationship-dialog/relationship-dialog.component.ts` |

**`RelationshipDialogData`:** `config: RelationshipConfig`, `entityId: number`, `entityName: string`

**Contrato de API esperado**

1. **`api.list(config.endpoint, { [localKey]: entityId, page_size: 100, ...filters })`** — relaciones existentes (objetos con `id` para borrar).
2. **`api.list(config.remoteEndpoint, { search, page_size: 20, is_active: true })`** — búsqueda de entidades remotas.
3. **`api.create(config.endpoint, payload)`** — payload incluye `localKey`, `remoteKey` y campos extra del formulario.
4. **`api.delete(config.endpoint, relId)`** — quitar vínculo.

**`RelationshipConfig`** (ver `api.model.ts`): `label`, `icon`, `endpoint`, `localKey`, `remoteKey`, `remoteEndpoint`, `remoteDisplayField`, `remoteDetailKey?`, `extraFields?`, `filters?`.

**Extra fields en diálogo** — `select`, `date`, u otros como `input` nativo.

---

#### 2.8 `app-entity-drawer`

| | |
|--|--|
| **Archivo** | `shared/components/entity-drawer/entity-drawer.component.ts` |
| **Instancia** | Una sola en `AppComponent`; estado global vía `EntityDrawerService`. |

**Modos (`EntityDrawerConfig` en `core/services/entity-drawer.service.ts`)**

1. **API usuario** — `{ entityType: 'user', entityId, title? }` → `GET users/:id`, vista `app-user-detail`.
2. **Embed** — `{ embedComponent: Type<unknown>, embedInputs?, title? }` → `NgComponentOutlet`; el hijo debe ser **standalone**; datos y API van dentro del hijo; puede inyectar `EntityDrawerService` para `close()`.

**Validación** — `EntityDrawerService.open(config)` descarta con `console.warn` si el config no cumple uno de los dos modos (función interna `isValidDrawerConfig`). No lanza excepción; simplemente no abre.

**Shell del drawer** — Fondo/borde/título usan variables `--fvx-*` (temas `tmp-*`).

---

#### 2.9 `app-user-detail`

| | |
|--|--|
| **Archivo** | `shared/components/entity-drawer/details/user-detail.component.ts` |
| **Inputs** | `data: any` — forma esperada: usuario DRF + `profile`, etc. |
| **Uso** | Solo embebido desde `app-entity-drawer` en modo user; reutilizable como referencia de layout de ficha. |

---

#### 2.10 `app-avatar`

| | |
|--|--|
| **Archivo** | `shared/components/avatar/avatar.component.ts` |

**Inputs:** `name: string`, `imageUrl?: string | null`, `size: number` (default 80 px, expuesto como `--avatar-size` en `:host`).

**Comportamiento** — Muestra imagen o iniciales con color derivado (`AvatarUtil`).

---

#### 2.11 `app-smart-select`

| | |
|--|--|
| **Archivo** | `shared/components/smart-select/smart-select.component.ts` |
| **Imports** | `SmartSelectComponent` |

**`ControlValueAccessor`** — usar con `formControlName` / `[formControl]`.

**Inputs:** `options: { value; label }[]`, `placeholder`, `showNone` (default true → opción “— None —”).

**Lógica** — Si `options.length > 10` → **autocomplete** filtrable; si no → **`mat-select`**.

---

#### 2.11a `app-segmented-toggle`

| | |
|--|--|
| **Archivo** | `shared/components/segmented-toggle/segmented-toggle.component.ts` |
| **Imports** | `SegmentedToggleComponent`, tipo `SegmentedToggleItem` |

Grupo **segmentado** (un valor seleccionado): envuelve `mat-button-toggle-group` con dos apariencias alineadas al shell.

**Inputs**

| Nombre | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `items` | `readonly SegmentedToggleItem[]` | `[]` | Cada ítem: `value`, y opcionalmente `label`, `icon`, `tooltip`, `ariaLabel`. |
| `value` | `string \| null` | `null` | Valor seleccionado (debe coincidir con un `item.value`). |
| `appearance` | `'toolbar' \| 'sidebar'` | `'toolbar'` | **toolbar** = estilo topbar (texto, borde `--fvx-border`). **sidebar** = pie del menú: segmentos **ancho auto**, grupo y `:host` en `fit-content` (no ocupan todo el ancho del sidebar). |
| `vertical` | `boolean` | `false` | Apila segmentos (p. ej. sidebar colapsada). |
| `ariaLabel` | `string` | `''` | `aria-label` del grupo. |
| `hideSingleSelectionIndicator` | `boolean` | `true` | Se pasa al toggle group de Material. |
| `tooltipPosition` | posición Material | `'right'` | Solo aplica si el ítem tiene `tooltip`. |

**Output:** `valueChange` → `string`.

**Uso en plantilla**

```html
<app-segmented-toggle
  appearance="toolbar"
  [items]="[{ value: 'en', label: 'EN' }, { value: 'es', label: 'ES' }]"
  [value]="currentLang"
  (valueChange)="onLang($event)"
  [ariaLabel]="'Idioma' | transloco"
/>

<app-segmented-toggle
  appearance="sidebar"
  [vertical]="collapsed"
  [items]="themeItems"
  [value]="themeId"
  (valueChange)="applyTheme($event)"
  [ariaLabel]="'Tema' | transloco"
/>
```

**Referencia** — `app-layout` vía `app-config-user` (sidebar, `appearance="sidebar"`).

---

#### 2.12 `app-empty-state`

| | |
|--|--|
| **Archivo** | `shared/components/empty-state/empty-state.component.ts` |

**Inputs:** `icon?`, `title?`, `description?`, `compact?` (padding reducido), `tone?: 'neutral' \| 'positive'` (default `'neutral'`). Slot por `<ng-content>` para el botón de acción (ej. "Create first item").

**`tone="positive"`** — para casos donde **0 es bueno** ("Ningún usuario inactivo"). El icono y el título usan `--fvx-chip-success-fg` (verde del tema). Si no pasas `icon`, el default cambia a `check_circle` en lugar de `inbox`.

```html
<!-- caso neutral (default): 0 = falta crear -->
<app-empty-state title="No users yet" description="Create the first one.">
  <button mat-flat-button color="primary">Create user</button>
</app-empty-state>

<!-- caso positivo: 0 = bueno -->
<app-empty-state
  tone="positive"
  title="No inactive users"
  description="Everyone has logged in within 90 days."
/>
```

---

#### 2.12a `app-alert-message`

| | |
|--|--|
| **Archivo** | `shared/components/alert-message/alert-message.component.ts` |

**Inputs:** `type` (`info` \| `success` \| `warning` \| `error`) — define color de fondo/borde/texto e icono por defecto; `message` (texto principal); `title?`; `role?` (`alert` \| `status`, por defecto `alert`). Los colores reutilizan los mismos tokens que **`app-status-chip`** (`--fvx-chip-info-*`, `--fvx-chip-success-*`, `--fvx-chip-warn-*`, `--fvx-chip-danger-*`).

**Uso típico:** feedback de API en formularios (login social: `type="warning"` para alta pendiente de validación; `type="error"` para cuenta inactiva). En `/components` hay demo de las cuatro variantes.

```html
<app-alert-message
  type="warning"
  role="status"
  message="Tu cuenta está pendiente de validación…"
/>
```

---

#### 2.13 `app-status-chip`

| | |
|--|--|
| **Archivo** | `shared/components/status-chip/status-chip.component.ts` |

**Uso directo:** `<app-status-chip variant="success" label="Active" icon="check_circle" />`.

**Uso con mapa:**

```html
<app-status-chip
  [value]="row.status"
  [map]="{
    active:   { variant: 'success', label: 'Active' },
    pending:  { variant: 'warn',    label: 'Pending' },
    archived: { variant: 'muted',   label: 'Archived' }
  }"
/>
```

**Variantes:** `success | warn | danger | info | muted | neutral`. Colores derivados de tokens SCSS; la forma pill sigue `--fvx-border`.

---

#### 2.14 `app-copy-button`

| | |
|--|--|
| **Archivo** | `shared/components/copy-button/copy-button.component.ts` |

**Inputs:** `value`, `tooltip?`, `copiedText?` (default “Copied!”), `notify?` (snackbar vía `NotificationService`), `notifyMessage?`.

**Outputs:** `copied: EventEmitter<string>`.

Usa `navigator.clipboard.writeText` con fallback a `document.execCommand('copy')` en contextos no seguros.

---

#### 2.15 `app-section-card`

| | |
|--|--|
| **Archivo** | `shared/components/section-card/section-card.component.ts` |

**Inputs:**

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `title?` | `string` | — | Título del card. |
| `subtitle?` | `string` | — | Línea secundaria en header. |
| `icon?` | `string` | — | Material icon en el header. |
| `flat` | `boolean` | `false` | Sin borde. |
| `noPadding` | `boolean` | `false` | Cuerpo pegado al borde (útil para tablas). |
| `collapsible` | `boolean` | `false` | Muestra chevron y permite plegar el body. |
| `expanded` | `boolean` | `true` | Estado del body. Compatible con `[(expanded)]`. |
| `expandLabel` | `string` | `'Expand'` | ARIA/tooltip cuando está plegado. |
| `collapseLabel` | `string` | `'Collapse'` | ARIA/tooltip cuando está abierto. |

**Output:** `expandedChange: EventEmitter<boolean>` (habilita two-way `[(expanded)]`).

**Slots:** `[actions]` para botones del header; `<ng-content>` para el cuerpo.

**Accesibilidad del modo colapsable:** el header recibe `role="button"`, `tabindex="0"`, `aria-expanded` y `aria-controls`; responde a click, `Enter` y `Space`. Click en `[actions]` no dispara el toggle (propagación detenida), de modo que los botones del header siguen funcionando con normalidad.

**Ejemplos:**

```html
<!-- Estándar -->
<app-section-card title="Profile" icon="person">
  <ng-container actions>
    <button mat-icon-button><mat-icon>edit</mat-icon></button>
  </ng-container>
  <p>Contenido...</p>
</app-section-card>

<!-- Colapsable (inicia plegado) -->
<app-section-card title="Advanced filters" icon="tune" [collapsible]="true" [expanded]="false">
  <!-- filtros avanzados -->
</app-section-card>

<!-- Controlado: sincroniza con una variable del padre -->
<app-section-card title="Logs" [collapsible]="true" [(expanded)]="showLogs">
  <app-json-viewer [data]="logs" />
</app-section-card>
```

Equivalente en componente a la clase global `.content-card`.

---

#### 2.16 `app-loading-overlay`

| | |
|--|--|
| **Archivo** | `shared/components/loading-overlay/loading-overlay.component.ts` |

**Inputs:** `show`, `message?`, `diameter?` (default 36), `transparent?`.

Requiere que el contenedor padre sea `position: relative`. El host aplica `position: absolute; inset: 0`.

---

#### 2.16a `app-skeleton`

| | |
|--|--|
| **Archivo** | `shared/components/skeleton/skeleton.component.ts` |
| **Imports** | `SkeletonComponent`, opcional `SkeletonAnimation`, `SkeletonRounded` |

Placeholder animado para estados de carga. Misma dimensión aproximada que el contenido final evita layout shift. Usado por defecto en `app-data-table` (filas iniciales con data vacía) y en `app-stat-card` (label + valor cuando `loading=true`).

**Inputs**

| Input | Tipo | Default | Descripción |
|---|---|---|---|
| `width` | `string` | `'100%'` (o igual a `height` si `circle`) | CSS válido |
| `height` | `string` | `'14px'` (o `'32px'` si `circle` sin width) | CSS válido |
| `circle` | `boolean` | `false` | Borde 50% para avatares/iconos |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'pill'` | `'md'` | Ignorado si `circle` |
| `animation` | `'pulse' \| 'wave' \| 'none'` | `'pulse'` | `wave` añade brillo deslizante; `none` desactiva (listas largas) |

**Respeta `prefers-reduced-motion`** — la animación se desactiva automáticamente para usuarios con esa preferencia activada.

**Color base:** `var(--fvx-skeleton-bg, color-mix(... var(--fvx-text-primary) 10% ...))`. Sigue el tema activo.

```html
<!-- Texto / línea -->
<app-skeleton width="120px" height="14px" />

<!-- Avatar circular -->
<app-skeleton [circle]="true" width="32px" />

<!-- Bloque pill (chip skeleton) -->
<app-skeleton width="60px" height="20px" rounded="pill" />

<!-- Wave para áreas grandes (cards de dashboard) -->
<app-skeleton width="100%" height="120px" rounded="lg" animation="wave" />
```

**Cuándo usarlo:** componentes propios que muestren su contenido tras un fetch. Para tablas y stat-cards ya está integrado.

---

#### 2.17 `app-page-header`

| | |
|--|--|
| **Archivo** | `shared/components/page-header/page-header.component.ts` |

**Inputs:** `title`, `subtitle?`, `breadcrumbs?: { label, link? }[]`. Slot `[actions]` a la derecha.

Úsalo para páginas personalizadas (no CRUD). En páginas CRUD sigue usando `app-crud-page`.

---

#### 2.18 `app-json-viewer`

| | |
|--|--|
| **Archivo** | `shared/components/json-viewer/json-viewer.component.ts` |

**Inputs:** `data`, `copyable?` (default true), `wrap?` (default true).

Syntax highlight propio (sin deps extra). Fondo oscuro fijo (legible sobre cualquier tema).

---

#### 2.19 `app-search-input`

| | |
|--|--|
| **Archivo** | `shared/components/search-input/search-input.component.ts` |

**Inputs:** `placeholder?`, `debounceMs?` (default 400), `initialValue?`.

**Output:** `searchChange: EventEmitter<string>`.

En páginas custom; **`app-data-table`** integra este control en la barra de búsqueda de la tabla.

---

#### 2.20 `app-tag-input`

| | |
|--|--|
| **Archivo** | `shared/components/tag-input/tag-input.component.ts` |
| **ControlValueAccessor** | sí (`ngModel` / `formControlName`). |

**Inputs:** `label?`, `placeholder?`, `allowDuplicates?` (default `false`), `maxItems?`.

Separadores: `Enter`, coma, espacio. Eliminar con `×` del chip.

---

#### 2.21 `app-date-range-picker`

| | |
|--|--|
| **Archivo** | `shared/components/date-range-picker/date-range-picker.component.ts` |
| **ControlValueAccessor** | sí. |
| **Validator** | sí (`NG_VALIDATORS`): fusiona y reenvía los errores nativos de ambos extremos (`matStartDate`/`matEndDate`: parse, min/max, y rango cruzado `end < start`). |

**Inputs:** `label?`, `presets?: DateRangePreset[]` (por defecto Today / Yesterday / Last 7d / Last 30d / This month / Last month).

**Output:** `rangeChange: EventEmitter<{ start: Date \| null; end: Date \| null }>`.

> **Comportamiento del popup:** trae botones **Aplicar / Cancelar** (`mat-datepicker-actions`). Elegir un rango **no cierra ni emite** hasta pulsar *Aplicar* — puedes reajustar ambos extremos antes de confirmar; *Cancelar* restaura el rango previo. Teclear directo en los inputs sí emite. En mobile se abre como modal grande (`touchUi`).

---

#### 2.21a `app-date-picker`

| | |
|--|--|
| **Archivo** | `shared/components/date-picker/date-picker.component.ts` |
| **ControlValueAccessor** | sí (`ngModel` / Reactive Forms). |
| **Validator** | sí (`NG_VALIDATORS`): reenvía al control padre los errores nativos de fecha (`matDatepickerParse/Min/Max`) y, con `[withTime]`, también los de hora (`matTimepickerParse/Min/Max`). Sin esto el form podría considerarse válido con texto/hora fuera de rango. `errorText` es solo presentacional. |

Selector de **fecha única** para formularios — wrapper de `mat-form-field` + `mat-datepicker`. Para rangos → `app-date-range-picker`. Para calendario siempre visible → `app-calendar`.

**Inputs principales:**

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `label?` | `string` | — | Etiqueta flotante. |
| `placeholder` | `string` | `''` | Texto cuando está vacío. |
| `hint?` | `string` | — | Texto bajo el campo. |
| `errorText?` | `string` | — | Mensaje de error (reemplaza al hint). |
| `minDate?` / `maxDate?` | `Date \| null` | `null` | Límites. |
| `startAt?` | `Date \| null` | `null` | Fecha inicial al abrir. |
| `startView` | `'month' \| 'year' \| 'multi-year'` | `'month'` | Vista inicial. |
| `dateFilter` | `(d: Date\|null) => boolean` | siempre `true` | Predicado para deshabilitar fechas (ej. solo días hábiles). |
| `required` | `boolean` | `false` | Marca `*` y `required` en el input. |
| `readonly` | `boolean` | `false` | No permite abrir el calendario. |
| `clearable` | `boolean` | `true` | Muestra botón `×` para limpiar. |
| `disabled` | `boolean` | `false` | Se propaga desde el form. |
| `appearance` | `'fill' \| 'outline'` | `'outline'` | Mismo que `mat-form-field`. |
| `floatLabel` | `FloatLabelType` | `'auto'` | Mismo que `mat-form-field`. |
| `dense` | `boolean` | `false` | Altura compacta (ideal para filtros/tablas). |
| `withTime` | `boolean` | `false` | Muestra un campo de **hora** junto a la fecha (`mat-timepicker` nativo de Material 21). El valor emitido es un único `Date` con fecha+hora combinadas; sin `withTime` la hora queda a medianoche. |
| `timeInterval` | `string` | `'30min'` | Granularidad del listado de horas (`'15min'`, `'30min'`, `'1h'`, `'2h'`…). |
| `minTime?` / `maxTime?` | `Date \| null` | `null` | Límites de hora (solo se usa la hora/minuto). Acotan el listado — p. ej. `07:00`–`17:00`. |

> **Mobile:** el calendario se abre como modal grande (`touchUi` vía `BreakpointObserver`); el campo de hora se apila bajo la fecha; targets ≥44px. El popup y el panel de horas reaccionan al cruce del breakpoint 768px.

**Output:** `dateChange: EventEmitter<Date \| null>`.

**Método público:** `open()` — abre el calendario programáticamente.

**Uso:**

```html
<!-- Básico con ngModel -->
<app-date-picker [(ngModel)]="birthdate" label="Birthdate" placeholder="yyyy-mm-dd" hint="Elige una fecha" />

<!-- Con filtro de días hábiles y required -->
<app-date-picker
  [(ngModel)]="appointment"
  label="Appointment"
  [minDate]="today"
  [dateFilter]="isWeekday"
  [required]="true"
  (dateChange)="onPick($event)"
/>

<!-- Denso (filas de filtros) -->
<app-date-picker [(ngModel)]="from" [dense]="true" placeholder="From" />
```

```ts
today = new Date();
isWeekday = (d: Date | null) => !!d && d.getDay() !== 0 && d.getDay() !== 6;

// Reactive Forms:
form = new FormGroup({
  startAt: new FormControl<Date | null>(null, Validators.required),
});
// <app-date-picker formControlName="startAt" label="Start" />
```

---

#### 2.22 `app-content-dialog`

| | |
|--|--|
| **Archivo** | `shared/components/content-dialog/content-dialog.component.ts` |
| **Apertura** | `ContentDialogComponent.openWith(dialog, config, overrides?)` |

**`ContentDialogConfig`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | `string` | Cabecera. |
| `component` | `Type<unknown>` | Componente standalone a embeber (`NgComponentOutlet`). |
| `inputs` | `Record<string, unknown>?` | `@Input()` del hijo. |
| `actions` | `ContentDialogAction[]?` | Botones al pie (ver abajo). |
| `size` | `'sm'\|'md'\|'lg'\|'xl'\|'fullscreen'` | Ancho preajustado. |
| `hideClose` | `boolean?` | Oculta el botón “Close”. |
| `hideCloseIcon` | `boolean?` | Oculta la X de la cabecera. |
| `disableClose` | `boolean?` | Bloquea ESC/overlay. |

**`ContentDialogAction`** — `{ label, color?, variant?: 'flat'\|'stroked'\|'basic', resultKey?, disabled?, closes?, handler? }`. `closes: false` ejecuta el `handler` sin cerrar (útil para confirmación en dos pasos).

Complementa a `ConfirmDialog` (ese es para sí/no) y al modo *embed* de `EntityDrawer` (el drawer es lateral, no modal).

---

#### 2.23 `app-file-viewer-dialog`

| | |
|--|--|
| **Archivo** | `shared/components/file-viewer-dialog/file-viewer-dialog.component.ts` |
| **Apertura** | `FileViewerDialogComponent.openWith(dialog, config)` |

**Soporta:** imágenes, PDF (iframe nativo), vídeo, audio, JSON (`app-json-viewer`), texto plano, **Office** vía Google Docs viewer (requiere URL pública), fallback con botones Download / Open in new tab.

**Detección:** usa `mimeType` si viene; si no, infiere por extensión de `filename` o `url`. Puedes forzar `kind`.

---

#### 2.24 `app-file-uploader`

| | |
|--|--|
| **Archivo** | `shared/components/file-uploader/file-uploader.component.ts` |
| **Guía completa** | [§ 4 — app-file-uploader (este documento)](design-fvx.md#diseno-file-uploader) |

Drop-zone + lista de items con progreso + validación (`accept`, `maxFileSizeMb`, `maxFiles`). Delega en el token `FILE_UPLOAD_PROVIDER` (Firebase, GCS/S3 vía signed URL, o propio).

**Variantes (`variant`):**
- `'default'` (por defecto): drop-zone grande con icono. Ideal para una página dedicada de subida.
- `'mini'`: versión compacta (botón + hint en línea + lista densa). Ideal para **formularios** que necesiten un campo "adjuntar archivo".

**Inputs clave:** `variant` (`'default' | 'mini'`), `buttonLabel`, `title`, `hint`, `accept`, `multiple`, `maxFileSizeMb`, `maxFiles`, `pathPrefix`, `metadata`, `autoUpload`, `disabled`.

**Outputs:** `uploaded` (acumulado), `itemUploaded`, `errored`, `removed`.

**Uso mini en un form:**

```html
<app-file-uploader
  variant="mini"
  buttonLabel="Attach"
  hint="PDF, max 5MB"
  accept="application/pdf"
  [multiple]="false"
  [maxFileSizeMb]="5"
  (uploaded)="form.patchValue({ fileUrl: $event[0]?.url })"
/>
```

**Providers incluidos**

| Provider | Módulo | Para |
|----------|--------|------|
| `SignedUrlUploadProvider` | `providers/signed-url-upload.provider` | GCS / S3 / Django Storage (backend emite URL firmada). |
| `FirebaseStorageUploadProvider` | `providers/firebase-storage-upload.provider` | Firebase Storage (requiere `firebase`). |

---

#### 2.25 `app-tabs`

| | |
|--|--|
| **Archivo** | `shared/components/tabs/tabs.component.ts` + `tab-content.directive.ts` |
| **Inputs** | `tabs: TabItem[]`, `activeKey`, `stretch`, `align`, `dynamicHeight`, `animationDuration` |
| **Output** | `activeKeyChange` |

Wrapper de `mat-tab-group` con API declarativa: defines las tabs como data (`{ key, label, icon?, badge?, disabled? }`) y cada contenido vive en un `<ng-template appTabContent="key">`. Las tabs exponen badge opcional (número o texto).

```html
<app-tabs [tabs]="tabs" [(activeKey)]="current" [stretch]="true">
  <ng-template appTabContent="overview">...</ng-template>
  <ng-template appTabContent="details">...</ng-template>
</app-tabs>
```

**Cuándo usarlo:** tabs dentro de detalle de entidad, paneles con sub-vistas, o `content-dialog` con múltiples secciones.

---

#### 2.26 `app-workflow`

| | |
|--|--|
| **Archivo** | `shared/components/workflow/workflow.component.ts` + `workflow-step.directive.ts` |
| **Inputs** | `steps: WorkflowStep[]`, `orientation: 'horizontal' \| 'vertical'`, `linear`, `showActions`, `activeIndex`, `prevLabel`, `nextLabel`, `finishLabel` |
| **Outputs** | `activeIndexChange`, `workflow` (`next \| previous \| reset \| complete`), `finish` |
| **Métodos públicos** | `markCompleted(key, value?)`, `reset()` |

Wrapper de `mat-stepper` (horizontal/vertical) con botonera Previous/Next/Finish integrada. Steps declarativos con `{ key, label, hint?, icon?, editable?, completed? }` y contenido via `<ng-template appWorkflowStep="key">`.

```html
<app-workflow
  #wf
  [steps]="steps"
  orientation="horizontal"
  [linear]="true"
  (workflow)="log($event)"
  (finish)="submit()"
>
  <ng-template appWorkflowStep="customer">
    ... form ...
    <button (click)="wf.markCompleted('customer')">Validate</button>
  </ng-template>
  <ng-template appWorkflowStep="payment">...</ng-template>
  <ng-template appWorkflowStep="confirm">...</ng-template>
</app-workflow>
```

- `linear=true`: el botón *Next* se habilita solo cuando el step está marcado como completado (`markCompleted(key)` o `step.completed=true`).
- `linear=false`: navegación libre entre steps; útil para checklists o wizards donde el orden no importa.
- `showActions=false`: oculta la botonera interna (usa `matStepperNext` / `matStepperPrevious` propios o control por `activeIndex`).

**Cuándo usarlo:** creación multi-paso (onboarding, import, compra), formularios largos, flujos guiados.

---

#### 2.27 `app-calendar`

| | |
|--|--|
| **Archivo** | `shared/components/calendar/calendar.component.ts` |
| **Inputs** | `title`, `showHeader`, `clearable`, `minDate`, `maxDate`, `startAt`, `dateFilter`, `dateFormat`, `disabled`, `withTime` (+ `timeInterval`, `minTime`, `maxTime`, `dateTimeFormat`) |
| **Output** | `selectedChange` |
| **Forms** | `ControlValueAccessor` + `Validator` (`NG_VALIDATORS`): con `[withTime]` reenvía los errores del timepicker al control padre. `setDisabledState` deshabilita de verdad el grid y el campo de hora. |

Calendario **expandido** (no flotante como el `MatDatepicker`). Útil cuando necesitas mostrar el grid siempre visible (reservas, agendas, pickers inline). Para rangos → `app-date-range-picker`.

Misma API de hora que `app-date-picker`: `[withTime]="true"` añade un campo de hora bajo el grid y emite un `Date` combinado; `timeInterval`/`minTime`/`maxTime` configuran el listado. El footer formatea con el `DateAdapter` (date-fns), así que respeta el idioma de la app en runtime.

```html
<app-calendar
  title="Pick a date"
  [(ngModel)]="date"
  [minDate]="min"
  [maxDate]="max"
  [dateFilter]="disableWeekends"
  (selectedChange)="apply($event)"
/>
```

Incluye atajos *Today* y *Clear* en el header (desactivables con `showHeader=false`).

---

#### 2.28 `app-calculator`

| | |
|--|--|
| **Archivo** | `shared/components/calculator/calculator.component.ts` |
| **Inputs** | `initial`, `compact`, `showCopy`, `maxIntegerDigits` |
| **Outputs** | `valueChange: CalculatorChange` (en cada operación), `result: number` (al pulsar `=`) |

Calculadora standalone con teclado (AC, ±, %, ÷, ×, −, +, =, ., back, copy). Soporta entrada por teclado físico cuando tiene focus (`0-9 . , + - * / = Enter Backspace Escape %`).

```html
<app-calculator
  [initial]="invoice.total"
  (valueChange)="preview($event.value)"
  (result)="applyTotal($event)"
/>
```

**Cuándo usarlo:** cotizaciones rápidas, ajustes de stock/precio, calculadoras embebidas en dialogs (`app-content-dialog` + `app-calculator`).

---

#### 2.29 `app-stat-card`

| | |
|--|--|
| **Archivo** | `shared/components/stat-card/stat-card.component.ts` |
| **Modelo / tipos** | `shared/components/stat-card/stat-card.model.ts` — `StatCardConfig`, `StatCardDensity`, `StatCardVariant`, `StatCardIconPosition`, `StatCardIconSurface`, etc. |
| **Imports** | `StatCardComponent`; opcional `StatCardConfig` desde el `.model` para filas de API o constantes. |

Tarjeta de KPI para dashboards y encabezados de página. Respeta tokens `--fvx-*`. Incluye variantes **split** (fondo tarjeta + banda vertical de color con icono y texto en color acento) y **split-solid** (fondo completo en acento + banda más oscura), además de **solid**, **filled**, etc. Trend (↑/↓), barra de progreso opcional (0–100), posición del icono (`start` / `end`), tile del icono en variantes no-split (`soft` / `filled` / `muted`), descripción, loading y modo clicable (`(activate)`).

**Densidad (`density`):** `normal` (por defecto) es la presentación estándar de dashboard. **`compact`** reduce tipografía y padding, mantiene el **contenido en fila** (icono + texto en horizontal) y una **altura baja**; sirve para **resúmenes junto a tablas**, pies de página de listados o filas compactas sin cambiar la API del componente (mismos inputs y variantes).

**Radio:** el borde de la tarjeta y detalles afines usan **`--fvx-stat-card-radius`** (definido en `_theme-palettes.scss` por plantilla; típicamente `4px`).

**Configuración recomendada:** además de inputs sueltos, se puede pasar un objeto **`[card]="row"`** (`Partial<StatCardConfig>`). Para cada campo, si el `@Input()` correspondiente está definido (`!== undefined`), **gana el input**; si no, se usa el valor de `card`.

**Inputs principales**

| Nombre | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `card` | `Partial<StatCardConfig>` | — | KPI agrupado (listas, mocks, API). |
| `icon` | `string` | — | Material icon (opcional). |
| `label` | `string` | `''` | Etiqueta (pequeña, uppercase). |
| `value` | `string \| number` | `''` | Valor principal. |
| `prefix` / `suffix` | `string` | `''` | Texto antes/después del valor. |
| `description` | `string` | — | Segunda línea opcional. |
| `trend` | `'up' \| 'down' \| 'neutral'` | — | Chip de tendencia. |
| `trendValue` | `string \| number` | — | Valor del chip (p. ej. `+12.4%`). |
| `trendLabel` | `string` | — | Subtítulo del chip (p. ej. `vs last month`). |
| `variant` | `'default' \| 'filled' \| 'outline' \| 'minimal' \| 'solid' \| 'split' \| 'split-solid'` | `'default'` | `split`: tarjeta `--fvx-bg-card` + banda `--tone`; valor y etiqueta tienden al acento. `split-solid`: tarjeta acento + banda más oscura; texto claro. |
| `tone` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | `'primary'` | Color de acento / icono / barra. |
| `iconPosition` | `'start' \| 'end'` | `'start'` | Icono a la izquierda o derecha (LTR). |
| `iconSurface` | `'soft' \| 'filled' \| 'muted'` | `'soft'` | Estilo del contenedor del icono cuando **no** es variante `split` / `split-solid` (en esas, el icono va en la banda). |
| `progress` | `number \| null` | — | Si es un número, muestra barra 0–100 (valores fuera de rango se recortan). |
| `density` | `'normal' \| 'compact'` | `'normal'` | Tarjeta **más baja** y compacta, contenido en **fila horizontal** (`compact`); puede venir en `card` o sobrescribirse con el `@Input()` homónimo. |
| `loading` | `boolean` | `false` | Muestra spinner en lugar del valor. |
| `loadingSpinnerColor` | `string` | — | Color del arco del spinner (cualquier color CSS). Sin definir: acento según `tone`, o blanco en `solid` / `split-solid`. |
| `clickable` | `boolean` | `false` | Rol `button`, tabindex, chevron y emite `(activate)`. |
| `valueTitle` | `string` | — | Tooltip nativo del valor (truncamiento). |

**Output:** `activate: EventEmitter<void>` — solo cuando `clickable=true`.

```html
<div class="stat-grid">
  <app-stat-card icon="payments" label="Price" value="44.51" tone="primary" />
  <app-stat-card
    icon="dns" label="Capacity" value="64" suffix="%"
    variant="solid" tone="info" [progress]="64"
    iconPosition="end" iconSurface="filled"
  />
  <app-stat-card [card]="kpiFromApi" />
  <app-stat-card
    icon="shopping_cart" label="Orders" value="1,204"
    variant="split" tone="primary"
    trend="up" trendValue="+8.2%"
  />
  <app-stat-card
    icon="payments" label="Revenue" prefix="$" value="18,420"
    variant="split-solid" tone="success"
    iconPosition="end"
  />
  <app-stat-card icon="groups" label="Users" [loading]="true" />
  <!-- Resumen compacto (p. ej. bajo una tabla): -->
  <app-stat-card icon="payments" label="Total" value="12.4k" density="compact" tone="primary" />
</div>

<!-- CSS del grid (en tu componente o global) -->
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-grid--compact {
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}
```

---

#### 2.29b `app-chart` (ECharts)

| | |
|--|--|
| **Archivo** | `shared/components/chart/chart.component.ts` |
| **Registro ECharts** | `shared/components/chart/echarts-register.ts` — importa solo los módulos necesarios (línea, barra, pastel, canvas, etc.) y exporta `echarts` para `ngx-echarts`. |
| **Imports en feature** | `ChartComponent` |
| **Bootstrap** | En `app.config.ts`: `provideEchartsCore({ echarts })` con `echarts` importado desde `./shared/components/chart/echarts-register`. |

Envoltorio **centralizado** sobre **ngx-echarts** + **ECharts**: en modo **`preset`** arma `options` desde inputs alineados al tema (`--fvx-*` vía `ThemeService`); en modo **`raw`** la fuente de verdad es solo `extraOption` (objeto ECharts completo).

**Tokens por plantilla (`--fvx-chart-*`)** — definidos en `src/styles/_theme-palettes.scss` dentro de cada `@mixin fvx-palette-*` (un solo sitio para retocar tema). El componente los lee en `buildPresetOption()`; texto de ejes / leyenda sigue usando `--fvx-text-*` y `--fvx-border` como hasta ahora.

| Variable | Uso |
|----------|-----|
| `--fvx-chart-color-1` … `--fvx-chart-color-6` | Paleta categórica (líneas, barras, pastel / donut). |
| `--fvx-chart-surface` | Fondo del `:host` del gráfico. |
| `--fvx-chart-container-border` | Borde del `:host` (p. ej. `transparent` en UIs claras). |
| `--fvx-chart-container-radius` | `border-radius` del contenedor. |
| `--fvx-chart-title-font-size` | Tamaño del título ECharts (px). |
| `--fvx-chart-axis-label-size` | Ejes X/Y, leyenda y etiquetas de pastel. |
| `--fvx-chart-area-fill-opacity` | Opacidad del relleno en `chartType="area"`. |

**Un solo gráfico distinto al tema:** (1) `[styleOptions]="{ palette: ['#0ea5e9','#64748b'], textMuted: '#475569', surface: 'transparent' }"` — solo los campos que pases sustituyen al tema; (2) o un `div` padre con variables CSS (`--fvx-chart-*`, etc.) heredadas al `host`. Para otro layout/series distinto del preset, `mode="raw"` y `extraOption`.

**Dependencias npm:** `echarts`, `ngx-echarts` (versión acorde al major de Angular del repo).

**Inputs**

| Nombre | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `chartType` | `'line' \| 'bar' \| 'area' \| 'pie' \| 'donut'` | `'line'` | Solo en modo `preset`. |
| `title` | `string` | `''` | Título opcional. |
| `height` | `number` | `280` | Altura del contenedor en px. |
| `labels` | `string[]` | `[]` | Eje X (cartesianos). |
| `series` | `AppChartCartesianSeries[]` | `[]` | `{ name, data: number[] }[]` (cartesianos). |
| `pieSlices` | `AppChartPieSlice[]` | `[]` | `{ name, value }[]` para `pie` / `donut`. |
| `legend` | `boolean` | `true` | Leyenda. |
| `grid` | `boolean` | `true` | Rejilla / split lines cartesianas. |
| `loading` | `boolean` | (vía setter) | Spinner de carga de ECharts. |
| `mode` | `'preset' \| 'raw'` | `'preset'` | `raw` → solo `extraOption`. |
| `extraOption` | `EChartsOption \| null` | `null` | En `preset`, se hace spread superficial al final; en `raw`, es la opción completa. |
| `styleOptions` | `AppChartStyleOptions \| null` | `null` | Solo `preset`. Pisa por instancia paleta, textos, ejes, tooltip, opacidad de área y variables de contenedor (`surface`, `containerBorder`, `containerRadius`). Ver `AppChartStyleOptions` en `chart.model.ts`. |

**Tipos** — `shared/components/chart/chart.model.ts`: `AppChartType`, `AppChartCartesianSeries`, `AppChartPieSlice`, `AppChartStyleOptions`.

**Método:** `refreshFromTheme()` — fuerza reconstrucción del preset tras cambios raros de CSS.

```html
<app-chart chartType="line" title="Serie" [height]="300" [labels]="months" [series]="series" />

<app-chart chartType="donut" [height]="260" [pieSlices]="slices" />

<app-chart mode="raw" [height]="320" [extraOption]="customEchartsOption" />
```

**Docker (dev)** — `docker-compose` monta un volumen nombrado corto `node_modules_cache` sobre `node_modules` (nombre real en Docker: `<COMPOSE_PROJECT_NAME>_node_modules_cache`, p. ej. `fvx_community_frontend_node_modules_cache`). Si el volumen quedó de antes de instalar `echarts`, aparecen errores **TS2307** (`Cannot find module 'echarts'` / `'ngx-echarts'`). El `docker-entrypoint-dev.sh` ejecuta **`npm ci`** cuando `package-lock.json` no coincide con la copia de referencia dentro del volumen. Reset manual: `docker volume ls`, identifica el volumen `*_node_modules_cache`, `docker volume rm <nombre>` y `docker compose up --build`.

**Ejemplos en vivo:** ruta `/components`, ancla `#chart`.

---

#### 2.29c `app-composition-card`

| | |
|--|--|
| **Archivo** | `shared/components/composition-card/composition-card.component.ts` |
| **Modelo / tipos** | `composition-card.model.ts` — `CompositionCardConfig`, `CompositionCardRow`; `tone` reutiliza `StatCardTone` de `stat-card.model.ts`. |
| **Imports** | `CompositionCardComponent` |

Tarjeta para **composición o reparto** (p. ej. activos, mix de cartera): cabecera con **título** y **subtítulo**, y una lista de filas con **etiqueta**, **barra horizontal proporcional** (`percent` 0–100) y bloque **valor + porcentaje** alineado a la derecha.

**Colores:** opcional **`barColor`** por fila (cualquier CSS). Si no se define, el relleno rota **`--fvx-chart-color-1`** … **`6`** (misma familia que gráficos). **`tone`** actúa como en `app-stat-card` (borde superior de acento en la cabecera).

**Dimensiones:** **`maxWidth`** y **`maxHeight`** en el `:host` (strings CSS, igual que patrones ya usados en KPI). Con **`maxHeight`**, si las filas no caben, solo la zona de lista hace **scroll vertical**; la cabecera permanece fija.

**Configuración:** objeto opcional **`[card]`** (`Partial<CompositionCardConfig>`); los `@Input()` explícitos ganan cuando están definidos (`!== undefined`).

**Inputs principales**

| Nombre | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `card` | `Partial<CompositionCardConfig>` | — | Agrupa título, subtítulo, filas, tone y límites. |
| `title` | `string` | `''` | Título de la tarjeta. |
| `subtitle` | `string` | — | Segunda línea bajo el título. |
| `rows` | `CompositionCardRow[]` | `[]` | Filas: `label`, `percent`, `value`, opcional `percentLabel`, `barColor`. |
| `tone` | `StatCardTone` | `'primary'` | Acento de cabecera (misma escala que stat-card). |
| `maxWidth` | `string` | — | `max-width` del host. |
| `maxHeight` | `string` | — | `max-height` del host; scroll interno en la lista. |
| `minHeight` | `string` | — | `min-height` aplicada al panel interior. |

```html
<app-composition-card
  title="Composición de activos"
  subtitle="Bs 26.315.000 al 23 abr"
  tone="success"
  maxWidth="560px"
  maxHeight="320px"
  [rows]="rowsFromApi"
/>

<app-composition-card [card]="compositionPayload" />
```

**Ejemplos en vivo:** ruta `/components`, ancla `#composition-card`.

---

#### 2.30 `app-numeric-label`

| | |
|--|--|
| **Archivo** | `shared/components/numeric-label/numeric-label.component.ts` |
| **Imports** | `NumericLabelComponent` |

Etiqueta numérica con formato (miles, decimales, moneda, notación compacta) y coloreo condicional. Pensada para celdas de tabla, resúmenes y formularios read-only.

**Inputs principales**

| Nombre | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `value` | `number \| string \| null` | `null` | Valor numérico (null/NaN → `emptyText`). |
| `locale` | `string` | navegador | Locale BCP-47 (`es-CL`, `en-US`, …). |
| `decimals` | `number` | — | Decimales fijos (min+max). |
| `minDecimals` / `maxDecimals` | `number` | — | Alternativa a `decimals`. |
| `currency` | `string` | — | ISO 4217 (`CLP`, `USD`, `EUR`). Activa formato de moneda. |
| `currencyDisplay` | `'symbol' \| 'narrowSymbol' \| 'code' \| 'name'` | `'symbol'` | — |
| `notation` | `'standard' \| 'compact' \| 'scientific' \| 'engineering'` | `'standard'` | `compact` → `1.3M`. |
| `prefix` / `suffix` | `string` | — | Se ignora `prefix` si hay `currency`. |
| `emptyText` | `string` | `'—'` | Qué mostrar cuando no hay valor. |
| `showSignIcon` | `boolean` | `false` | Flecha ↑/↓/— según signo. |
| `colorMode` | `'none' \| 'negative-red' \| 'pos-neg'` | `'none'` | Coloreo automático. |
| `color` | `string` | — | Color CSS que **sobrescribe** `colorMode`. |
| `weight` | `'normal' \| 'medium' \| 'bold'` | `'normal'` | — |
| `monospace` | `boolean` | `false` | Fuente mono + `tabular-nums` (tablas). |
| `tooltip` | `string` | — | `title` nativo opcional. |

```html
<!-- Moneda CLP -->
<app-numeric-label [value]="row.total" currency="CLP" locale="es-CL" [decimals]="0" />

<!-- Negativos en rojo -->
<app-numeric-label
  [value]="row.delta"
  currency="USD"
  colorMode="negative-red"
  [monospace]="true"
/>

<!-- Positivo verde / negativo rojo + flecha (KPI) -->
<app-numeric-label
  [value]="change"
  suffix="%"
  colorMode="pos-neg"
  [showSignIcon]="true"
/>

<!-- KPI compact -->
<app-numeric-label [value]="1250000" notation="compact" />  <!-- 1.3M -->
```

**Cuándo usarlo:** columnas numéricas de `app-data-table` (en `ColumnConfig.render` o en un template custom), campos de resumen en detalles, balances/montos que requieran color por signo.

---

#### 2.31 `app-profile-editor`

| | |
|--|--|
| **Archivo** | `shared/components/profile-editor/profile-editor.component.ts` |
| **Selector** | `app-profile-editor` |
| **Imports** | `ProfileEditorComponent` |
| **Uso habitual** | Embebido en `app-entity-drawer` desde el menú de usuario del header (`LayoutComponent.openProfile()`). |

**Qué hace**

Muestra y permite editar la **ficha del usuario autenticado**. Consume `GET /users/me/` para hidratarse y `PATCH /users/me/` al guardar. El backend permite actualizar únicamente los campos seguros (ver tabla); el resto aparece en la UI como *read-only* con icono `lock`.

| Campo | Estado |
|-------|--------|
| `first_name`, `last_name`, `phone`, `photo_url` | **Editables** |
| `username`, `email`, `is_active`, `is_staff`, `profile.role`, `date_joined`, `last_login` | **Solo lectura** (bloqueados por `MeSerializer` en backend) |

**Dependencias internas** — `AvatarComponent`, `SectionCardComponent`, `StatusChipComponent`, `AuthService`, `EntityDrawerService`, `NotificationService`.

**Apertura estándar**

```ts
import { EntityDrawerService } from 'core/services/entity-drawer.service';
import { ProfileEditorComponent } from 'shared/components/profile-editor/profile-editor.component';

constructor(private drawer: EntityDrawerService) {}

openProfile() {
  this.drawer.open({
    title: 'Mi perfil',
    embedComponent: ProfileEditorComponent,
  });
}
```

**Contrato HTTP (backend)**

- `GET /users/me/` → `UserDetailSerializer`.
- `PATCH /users/me/` → `MeSerializer` (solo `first_name`, `last_name`, `profile.phone`, `profile.photo_url`). Cualquier otro campo en el payload es ignorado por el serializer (`read_only_fields`).

**Cuándo usarlo:** cualquier escenario donde el usuario autenticado deba editar su propia ficha sin entrar al CRUD admin de `/users` (barra superior, onboarding, "completar perfil" tras login, etc.). No reemplaza a `app-entity-form-dialog` — ese es el que usa un admin para editar **otros** usuarios.

---

#### 2.32 `app-command-palette` (paleta `⌘K`)

| | |
|--|--|
| **Archivo** | `shared/components/command-palette/command-palette.component.ts` |
| **Selector** | `app-command-palette` |
| **Apertura** | Vía `CommandPaletteService` (en `core/commands/`), atajo `⌘K` / `Ctrl+K` o click en `.topbar-search`. |

Paleta tipo Spotlight para acciones rápidas: navegación al menú dinámico (`MenuService`), cambio de tema/idioma, acciones registradas por features. Filtrado por substring, navegación con `↑/↓/Enter/Esc`. Resultados agrupados por `CommandGroup`. No instanciar directamente — abrir con el servicio.

**Extensión:** registrar comandos extra en `CommandRegistry` (`core/commands/command-registry.service.ts`) — el componente los expone sin cambios.

---

#### 2.33 `app-help-shortcuts`

| | |
|--|--|
| **Archivo** | `shared/components/help-shortcuts/help-shortcuts.component.ts` |
| **Selector** | `app-help-shortcuts` |
| **Apertura** | Vía `ContentDialogComponent.openWith(HelpShortcutsComponent, …)` desde el icono `?` del topbar. |

Modal informativa con la lista de **atajos de teclado** activos en el shell (paleta `⌘K`, navegación, etc.) más una sección "próximamente" para los que aún no funcionan. Sin estado propio; solo lectura.

---

#### 2.34 `app-preview-export-host` + `PreviewExportService`

| | |
|--|--|
| **Archivos** | `shared/components/preview-export/preview-export-host.component.ts`, `preview-export.service.ts`, `preview-export.types.ts` |
| **Apertura** | `inject(PreviewExportService).open(MyContentComponent, { inputs, actions, paper: 'letter' })` |

Diálogo de **previsualización + export** (Print / PDF / PNG) sobre cualquier componente standalone embebido en una "hoja" simulada tamaño carta. El servicio monta el componente del usuario dentro de `PreviewExportHostComponent` (que aporta el toolbar) y eso a su vez vive dentro de `ContentDialogComponent` (chrome de modal estándar — header con título + X).

**Cuándo usarlo:** comprobantes, facturas, cotizaciones, reportes A4 que el usuario necesita imprimir o exportar como PDF/PNG. **Nunca** instanciar `PreviewExportHostComponent` manualmente — usar el servicio.

---

#### 2.35 `app-place-search` (Mapbox Geocoding)

| | |
|--|--|
| **Archivo** | `shared/components/place-search/place-search.component.ts` |
| **Selector** | `app-place-search` |
| **Imports** | `PlaceSearchComponent` |
| **Servicio** | `MapboxService` (Geocoding API v6) |
| **Requiere** | token Mapbox público (`pk.*`) en `config.json` runtime (vía `RuntimeConfigService`). Sin token → placeholder de "configuración faltante". |

Buscador inteligente de direcciones con autocomplete. **Doble interfaz simultánea**:

1. **Reactive Forms / template-driven** — es un `ControlValueAccessor`, funciona con `formControlName`, `[formControl]` o `[(ngModel)]`. El valor del control es el `MapboxPlace` seleccionado (o `null`).
2. **Emit puro** — `(placeSelected)` entrega el `MapboxPlace` sin necesidad de form.

**Inputs**

| Nombre | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `placeholder` | `string` | `'Buscar dirección'` | Texto del input. |
| `debounceMs` | `number` | `350` | Espera tras teclear antes de pegarle al API. |
| `minChars` | `number` | `3` | Mínimo de caracteres para disparar búsqueda. |
| `countries` | `readonly string[]?` | — | ISO-3166 alpha-2. Ej. `['cl', 'ar']`. |
| `types` | `readonly string[]` | `['address']` | Tipos de feature. Ej. `['address', 'poi']`. |
| `language` | `string` | `'es'` | Idioma de resultados. |
| `limit` | `number` | `5` | Máximo de sugerencias. |
| `proximity` | `{ lng; lat }?` | — | Sesgo geográfico (mejora relevancia local). |

**Outputs** — `placeSelected: EventEmitter<MapboxPlace>`.

**`MapboxPlace`** (de `core/services/mapbox.service.ts`):

```ts
interface MapboxPlace {
  id: string;
  fullAddress: string;          // texto completo listo para mostrar
  name: string;                 // nombre/etiqueta principal
  street?: string;
  houseNumber?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;         // 'cl', 'us', …
  featureType?: string;         // 'address', 'poi', …
  coordinates: { lng: number; lat: number };  // ⚠ orden Mapbox: [lng, lat]
  raw?: unknown;                // feature original por si hace falta
}
```

**Ejemplo**

```html
<!-- Con reactive form -->
<app-place-search formControlName="address" [countries]="['cl']" [types]="['address', 'poi']" />

<!-- Con emit, sin form -->
<app-place-search placeholder="Buscar" (placeSelected)="onAddressPicked($event)" />
```

Navegación por teclado (`↑↓ Enter Esc`), spinner durante búsqueda, botón limpiar, ARIA combobox/listbox.

---

#### 2.36 `app-map` (mapbox-gl)

| | |
|--|--|
| **Archivo** | `shared/components/map/map.component.ts` |
| **Selector** | `app-map` |
| **Imports** | `MapComponent` |
| **Servicio** | `MapboxService` (carga **lazy** de mapbox-gl ~200 kB) |
| **Requiere** | token Mapbox público en `config.json` runtime (vía `RuntimeConfigService`). Sin token → placeholder. |

Mapa interactivo. El padre controla **todo** declarativamente vía `[options]` — cambios se aplican incrementalmente sin recrear el mapa (salvo cambio de `style`).

**Branding por tema:** con `[themed]="true"` (default) el mapa toma su style base (`light-v11` / `dark-v11`) y los colores de capas (agua, calles, edificios, parques, texto) del **template FVX activo**, y se re-pinta automáticamente al cambiar de tema (vía `ThemeService.currentId`). Colores por tema en `core/utils/map-theme.util.ts`. Pasá `[themed]="false"` para controlar el `style` manualmente.

**Inputs**

| Nombre | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `options` | `MapOptions` | `{}` | Configuración declarativa (ver abajo). |
| `themed` | `boolean` | `true` | Toma colores del template FVX y re-pinta al cambiar tema. |
| `ariaLabel` | `string` | `'Interactive map'` | Etiqueta accesible. |

**`MapOptions`**

```ts
interface MapOptions {
  style?: string;          // default según tema (themed) o streets-v12
  center?: [number, number];  // [lng, lat] — default Santiago
  zoom?: number;           // default 12
  pitch?: number; bearing?: number;
  controls?: {             // navigation default true; resto false
    navigation?: boolean; geolocate?: boolean;
    fullscreen?: boolean; scale?: boolean;
  };
  interactions?: {         // todas default true
    scrollZoom?: boolean; dragPan?: boolean; dragRotate?: boolean;
    boxZoom?: boolean; doubleClickZoom?: boolean;
    keyboard?: boolean; touchZoomRotate?: boolean;
  };
  markers?: MapMarker[];   // diff por id (agrega/quita/mueve)
}

interface MapMarker {
  id: string;              // único — track + remoción quirúrgica
  coord: [number, number]; // [lng, lat]
  color?: string;          // default --fvx-link
  popupHtml?: string;      // popup al click
  draggable?: boolean;
}
```

**Outputs**

| Nombre | Payload | Cuándo |
|--------|---------|--------|
| `mapClick` | `[lng, lat]` | Click en el mapa (no en un marker). |
| `markerClick` | `MapMarker` | Click sobre un pin. |
| `markerDragEnd` | `MapMarker` | Marker arrastrable soltado en nueva coord. |
| `viewportChange` | `{ center, zoom, pitch, bearing }` | Al terminar pan/zoom. |
| `mapLoaded` | `void` | Style + sources cargados. |

**Ejemplo**

```html
<app-map
  [options]="{
    center: [-70.65, -33.45],
    zoom: 14,
    controls: { navigation: true, geolocate: true, scale: true },
    markers: [{ id: 'home', coord: [-70.65, -33.45], popupHtml: '<b>Casa</b>' }]
  }"
  (mapClick)="onMapClick($event)"
  (markerClick)="onMarkerClick($event)"
  style="height: 360px; display: block;"
/>
```

**Setup global** (una vez): token en `public/assets/config.json` (gitignored; copiar de `config.example.json`) cargado por `RuntimeConfigService` en el app initializer; CSS de mapbox-gl en `styles.scss`; CSP de `index.html` autoriza `api.mapbox.com` / `events.mapbox.com` / `blob:`; `mapbox-gl` pineado a `3.6.0`. Detalle del patrón de tokens: `security.md §8b`. Demo en vivo combinando ambos componentes: `/components` → sección "Mapbox".

---

### 3. Directivas — `shared/directives/`

#### `appTruncateTooltip`

| | |
|--|--|
| **Archivo** | `shared/directives/truncate-tooltip.directive.ts` |
| **Selector** | `[appTruncateTooltip]` |
| **Imports** | `TruncateTooltipDirective` |

**Uso** — En el mismo elemento que `matTooltip`: en `mouseenter` habilita el tooltip solo si el texto está truncado (`scrollWidth > clientWidth`). Requiere `MatTooltip` en el elemento (como en `app-data-table` celdas).

---

### 4. Pipes — `shared/pipes/`

#### `dateFormat`

| | |
|--|--|
| **Archivo** | `pipes/date-format.pipe.ts` |
| **Nombre** | `dateFormat` |

```html
{{ valor | dateFormat }}
{{ valor | dateFormat:'DD/MM/YYYY' }}
{{ valor | dateFormat:'LLL':'America/Santiago' }}
```

**Firma** — `(value, format = 'DD/MM/YYYY HH:mm', timezone?)` — default timezone `America/Santiago` (moment-timezone).

---

#### `timeAgo`

| | |
|--|--|
| **Archivo** | `pipes/time-ago.pipe.ts` |
| **Nombre** | `timeAgo` |

```html
<span [matTooltip]="row.last_login | dateFormat">
  {{ row.last_login | timeAgo }}
</span>
```

Formato relativo (`"hace 12 min"`, `"ayer"`, `"hace 3 días"`) basado en `Intl.RelativeTimeFormat` con el idioma activo de Transloco. Para fechas > 30 días cae a formato absoluto `dd/mm/yyyy`. Valores `null`/inválidos devuelven `'common.never'` (con fallback `'—'`).

**Firma** — `(value: Date | string | number | null | undefined)`. Pipe `pure: false` para reflejar el paso del tiempo.

---

> **Pipes documentadas históricamente y removidas.** `truncate` y `avatar` no existen como pipes en `shared/pipes/`. Para truncar, usar la directiva `appTruncateTooltip` (que combina con `MatTooltip`) o el helper `AvatarUtil.generateAvatarSvg()` directamente desde TS.

---

### 5. Utilidades — `shared/utils/`

#### `avatar.util.ts`

Funciones estáticas: `getInitials(name)`, `getColorFromString(str)`, `getGradientFromString(str)`, `generateAvatarSvg(name, size)` — usadas por `AvatarComponent` y `avatar` pipe.

---

### 6. Backend — `fvx-backend/api/utils.py`

Funciones puras Django reutilizables en views, serializers o services.

| Función | Descripción |
|---------|-------------|
| **`get_active_queryset(queryset)`** | Si el modelo tiene `is_removed` (soft delete django-model-utils), filtra `is_removed=False`; si no, devuelve el queryset sin cambiar. |
| **`soft_delete_instance(instance)`** | Si tiene `is_removed`: pone `is_removed=True`, opcionalmente `is_active=False`, `save()`, retorna `True`; si no aplica, retorna `False`. |
| **`get_client_ip(request)`** | IP desde `HTTP_X_FORWARDED_FOR` (primera) o `REMOTE_ADDR`. |
| **`get_user_agent(request)`** | Cabecera `HTTP_USER_AGENT` o `''`. |

**Importación típica**

```python
from api.utils import get_active_queryset, soft_delete_instance, get_client_ip
```

---

### 7. Flujos que ya combinan piezas

| Flujo | Dónde verlo |
|-------|-------------|
| CRUD + tabla + filtros + drawer fila user | `BaseCrudComponent` + features `users`, etc. |
| Formulario crear/editar + PATCH/POST | `openFormDialog` en `base-crud.component.ts` |
| Confirmar borrado | `ConfirmDialogComponent` + `api.delete` |
| Relaciones N–M | `RelationshipDialogComponent` + `RelationshipConfig` |
| Perfil del usuario autenticado | `LayoutComponent.openProfile()` → `EntityDrawer` + `ProfileEditorComponent` → `GET/PATCH /users/me/` |

---

### 8. Documentos relacionados

- [custom-site.md](custom-site.md) — Layout, clases CSS globales, lista resumida `shared/`.
- [§ 1 — Temas](design-fvx.md#diseno-temas) — Variables `--fvx-*` y temas.
- [add-crud-model.md](add-crud-model.md) — Flujo Django + Angular CRUD.


---

## Referencias fuera de este documento

- Páginas, layout, estructura canónica, CRUD: [`custom-site.md`](custom-site.md), [`add-crud-model.md`](add-crud-model.md)
- Servicios core, guards: [`core-services.md`](core-services.md), [`core-guards-interceptors.md`](core-guards-interceptors.md)
- API backend: [`backend.md`](backend.md)
