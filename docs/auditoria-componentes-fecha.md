# Auditoría de componentes de fecha

> Informe generado por un análisis multi-agente (4 áreas: solidez/CVA, formularios
> reactivos, UX mobile, a11y/i18n) sobre los 3 componentes de fecha compartidos:
> `date-picker`, `date-range-picker` y `calendar` (inline). Es un **backlog de
> mejoras sugeridas** — nada de esto está aplicado todavía. Revísalo y prioriza
> qué tomar; las rutas:línea pueden haberse desplazado levemente con cambios
> posteriores.
>
> Fecha del análisis: 2026-06.

## Resumen ejecutivo

Los tres componentes (`date-picker`, `date-range-picker`, `calendar`) son
funcionalmente sólidos y comparten una base correcta: implementan
`ControlValueAccessor` con `NG_VALUE_ACCESSOR`, usan un `FormControl`/`FormGroup`
interno como fuente de verdad para que el adapter date-fns formatee bien,
escriben desde el padre con `{emitEvent:false}` (sin loops ni doble-emisión) y
respetan el adapter/locale global de `app.config.ts` (no importan
`MatNativeDateModule`). **Para Reactive Forms sirven en el caso feliz** (valor
`Date` ida y vuelta), pero arrastran tres brechas reales: el `calendar` no
implementa `setDisabledState` (un `form.disable()` no lo deshabilita), ningún
componente propaga al control padre los errores nativos del datepicker
(`matDatepickerParse`/`Min`/`Max`, rango cruzado) — `form.valid` puede mentir —,
y el `date-range-picker` dispara `onTouched()` en cada cambio en vez de en blur.
**El estado mobile es el punto más débil**: no hay `touchUi` ni
`BreakpointObserver`, el popup tiene ancho fijo `340px !important` (desborda en
pantallas <360px), las celdas quedan bajo el mínimo táctil de 44px y los inputs
no declaran `inputmode`. A esto se suma una regresión de accesibilidad (el header
custom perdió la live-region de anuncio de mes/año) y textos hardcodeados en
inglés que rompen la regla de Transloco.

## ✅ Lo que ya está bien

- **CVA correcto en `date-picker` y `date-range-picker`**: `NG_VALUE_ACCESSOR` +
  `forwardRef`, `writeValue`/`registerOnChange`/`registerOnTouched`/
  `setDisabledState` con `{emitEvent:false}` al escribir desde el padre — sin
  loop ni doble-emisión.
- **FormControl interno enlazado al `matInput`** para que el adapter date-fns
  formatee `dd-MM-yyyy` en lugar del string crudo — decisión correcta y bien
  documentada (`date-picker.component.ts:218-222`).
- **No se importa `MatNativeDateModule`** en los componentes: evita pisar el
  adapter/locale global.
- **Locale date-fns sincronizado con el idioma** (`es-CL` con miércoles=X) en
  init y en `langChanges$`; el aria-label de las celdas de día sí se localiza.
- **Tematización por tokens `--mat-datepicker-*`** en `_material-overrides.scss`
  — forma robusta de tematizar Material 21 (mejor que pelear por especificidad).
- **A11y nativa del grid intacta**: las celdas (`role=gridcell`, `aria-pressed`,
  `aria-current=date`, tabindex roving) no se reimplementaron; el header extiende
  `MatCalendarHeader` y conserva los aria-label de prev/next.
- **Footer Hoy/Elegir año del header** usa Transloco con claves en ambos idiomas.
- **`date-picker` asocia `<label [for]=inputId>`** con el input y el clear-button
  tiene `type=button` + `stopPropagation`.

## ⚠️ Hallazgos y mejoras

| # | Componente | Severidad | Qué | Sugerencia accionable |
|---|-----------|-----------|-----|----------------------|
| 1 | date-picker / date-range-picker | **Alta** | Los errores nativos (`matDatepickerParse`, `matDatepickerMin/Max`, rango cruzado, `required`) viven solo en el control interno y **nunca llegan al control del padre**; `form.valid` puede ser `true` con texto inválido tecleado. | Implementar `NG_VALIDATORS`: un `validate(control)` que reenvíe `this.dateCtrl.errors` (y los del FormGroup `range`) al control padre + `registerOnValidatorChange`. Documentar que `errorText` es solo override presentacional. |
| 2 | calendar | **Media** | **Falta `setDisabledState`**: con `form.disable()` el `mat-calendar` inline sigue interactivo y `onPick()` escribe en un control que el form cree deshabilitado. | Añadir signal `disabled` + `setDisabledState`; early-return en `onPick()` si `disabled()`, y `[class.app-cal--disabled]` con `pointer-events:none`. Exponer `@Input() disabled`. |
| 3 | date-range-picker | **Media** | `emit()` llama `onTouched()` en **cada cambio** (presets, `dateChange`), no en blur; marca `touched` prematuramente. | `emit()` solo con `onChange(v)`+`rangeChange.emit(v)`; añadir `(blur)="onTouched()"` a `matStartDate`/`matEndDate`. |
| 4 | date-picker / calendar | **Media** | `writeValue` parsea string/number con `new Date(v)` nativo, no con el adapter; un string ISO solo-fecha `'yyyy-MM-dd'` se interpreta como UTC → puede mostrar el día anterior (off-by-one) en husos negativos (Chile). | Inyectar `DateAdapter` y usar `adapter.deserialize(v)`, o documentar que `writeValue` solo acepta `Date`. Como mínimo, evitar `new Date(string-solo-fecha)`. |
| 5 | Los 3 | **Media** | **Sin tests unitarios**: no se cubre `writeValue(null/''/inválido)`, `setDisabledState`, ni la propagación `onChange`/`onTouched`. | Añadir specs mínimos de CVA (ver §11 abajo). |
| 6 | FvxDpHeaderComponent | **Media** | Reimplementa el markup interno de Material (clases `.mat-calendar-controls`…) y escribe `this.calendar.currentView` directo. API pública, pero el markup CSS-class es contrato interno → riesgo en upgrades. | Documentar versión de Material soportada + test de humo del header. Usar `this.calendar?.currentView` con guarda. |
| 7 | date-picker / calendar | **Baja** | `selectToday()` no normaliza a medianoche ni valida contra `minDate/maxDate/dateFilter` — "Hoy" puede seleccionar fecha fuera de las restricciones del calendario. | Normalizar a `startOfDay` y validar antes de seleccionar; deshabilitar "Hoy" si hoy está fuera de rango. |
| 8 | calendar | **Baja** | `readonly today = new Date()` se evalúa una vez en el constructor; tras medianoche el `startAt` por defecto queda en el día anterior. | Convertir `today` en getter o computarlo al bindear `startAt`. |
| 9 | date-range-picker | **Baja** | Inconsistencia de hora (presets a medianoche, tecleadas con hora) y sin guarda `start<=end` para valores escritos por código. | Normalizar a `startOfDay/endOfDay` en `emit()`; clamp `start<=end` en `writeValue`. |
| 10 | calendar / footer | **Media** | El footer de fecha seleccionada no tiene `role=status`/`aria-live`; el SR no anuncia el cambio. Los `mat-icon` decorativos sin `aria-hidden`. | Envolver el footer en `aria-live=polite`; marcar iconos decorativos con `aria-hidden`. |

## 📱 Mejoras de UX mobile (foco principal, priorizado)

> Confirmado por grep en `src/`: **cero ocurrencias de `touchUi`,
> `BreakpointObserver` ni `inputmode`**. En un teléfono, hoy los calendarios
> aparecen como el mismo dropdown chico anclado al input que en escritorio.

1. **[ALTA] Activar `touchUi` en mobile — mejora #1 de impacto.** Bindear
   `[touchUi]="isMobile()"` (vía `BreakpointObserver` `(max-width:768px)`) en
   `<mat-datepicker>` y `<mat-date-range-picker>`. Abre el calendario como modal
   grande en vez de dropdown anclado. Para el range es aún más necesario.
2. **[ALTA] El ancho fijo `340px !important` desborda en <360px.** Dentro del
   `@media (max-width:768px)`: `width: min(340px, calc(100vw - 24px)) !important`.
   Reducir/quitar el `backdrop-filter: blur(22px)` en mobile (jank de GPU).
3. **[ALTA] Targets táctiles bajo 44px (WCAG 2.5.5).** La compactación de
   escritorio aplica también en mobile. En el `@media`: revertir la compactación
   dentro de `.fvx-dp-popup` (font-size de celdas ~0.9rem, más padding) y dar
   `min-height:44px` a los botones del footer.
4. **[MEDIA] Inputs sin teclado numérico.** Añadir `inputmode="numeric"` a los
   inputs de fecha (NO `type="number"`). Bajo riesgo, alta ganancia.
5. **[MEDIA] Calendario inline capado a 320/296px.** En `@media (max-width:768px)`:
   `.app-cal { max-width:100%; width:100% }`, revertir paddings compactos, botones
   Today/Clear ≥44px.
6. **[MEDIA] Layout del range estrecho en mobile.** Permitir `flex-wrap` o campo
   al 100% con el botón de presets debajo; hacer los presets prominentes (camino
   mobile preferente).

## 🎯 Recomendaciones priorizadas

**Primero — alto impacto, bajo riesgo (mobile, foco del usuario):**
1. `[touchUi]="isMobile()"` vía `BreakpointObserver` en `date-picker` y
   `date-range-picker`.
2. Media query mobile del popup: `width: min(340px, calc(100vw - 24px))` +
   reducir blur.
3. Targets ≥44px (revertir compactación en `@media`) + `inputmode="numeric"`.

**Segundo — solidez en Reactive Forms:**
4. `setDisabledState` en `calendar`.
5. Separar `onTouched` del `onChange` en `date-range-picker` (`(blur)`).
6. `NG_VALIDATORS` en `date-picker` y `date-range-picker`.

**Tercero — a11y e i18n (regla Transloco):**
7. Reañadir la live-region `aria-live=polite` en el header custom + `aria-describedby`.
8. Subclase de `MatDatepickerIntl` alimentada por Transloco (labels de navegación
   hoy en inglés), con `changes.next()` en `langChanges$`.
9. Mover a Transloco los literales hardcodeados: presets del range
   (`Today/Yesterday/Last 7 days…`), `Start date`/`End date`, `Presets`, `Clear`,
   y `Today`/`Clear` del inline.
10. Restaurar `matTooltip` en las flechas prev/next del header.

**Cuarto — deuda estructural:**
11. Tests unitarios de CVA para los 3 + test de humo del header contra upgrades.
12. Helper compartido `shared/util/date-serialize.ts` (`toApiDate`/`parseApiDate`
    con date-fns `format(d,'yyyy-MM-dd')`, no `toISOString`) para evitar
    off-by-one por timezone.
13. Normalizar a `startOfDay` en `writeValue`/`selectToday` y extraer las reglas
    SCSS comunes de celda/header a un mixin compartido (eliminar la duplicación
    entre `_material-overrides.scss` y `calendar.component.ts`).
