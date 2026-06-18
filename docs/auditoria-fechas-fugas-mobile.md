# Auditoría 2 — componentes de fecha: fugas, mobile y casos límite

> Generado por un workflow multi-agente (análisis por dimensiones → verificación
> adversarial de cada hallazgo → síntesis). 19 hallazgos analizados: **10
> confirmados** (reales tras releer el código), **9 descartados** (falsos
> positivos). Es un **backlog de mejoras**, no está aplicado.
>
> Fecha del análisis: 2026-06 · Las rutas:línea pueden desplazarse con cambios posteriores.

## Veredicto general

El módulo está **bien construido en su núcleo**: CVA correcto, suscripciones de
componente limpiadas con `takeUntilDestroyed`, **sin fugas de memoria reales**.
Los riesgos confirmados son de **correctness** (no fugas), y la mayoría nacen de
una **asimetría entre `date-picker` (Validator completo, `combine()` normaliza a
medianoche) y `calendar` (sin Validator, `combine()` sin esa rama)**. Unificar la
lógica de ambos cierra de golpe varios hallazgos. Hay además un hueco táctil real:
el panel del `mat-timepicker` no tiene tratamiento mobile (<44px).

## 🔴 Hallazgos confirmados (priorizados)

| # | Sev. | Dim. | Qué | Fix |
|---|------|------|-----|-----|
| 1 | **alta** | mobile | Panel del `mat-timepicker` mantiene filas de 32px en mobile (`_material-overrides.scss:1488`); el `@media (max-width:768px)` no lo toca → targets <44px (WCAG 2.5.5). | Dentro del `@media`, bloque GLOBAL (no anidado): `.mat-timepicker-panel { max-height:50vh !important; .mat-mdc-option { min-height:44px !important } }`. `!important` obligatorio (vence al 32px de :1488). |
| 2 | **alta** | casos | `[withTime]`: la hora se pierde silenciosamente si no hay fecha, y queda residual al borrar la fecha por teclado (`date-picker.ts:341-363`). | En `propagate()`: `if (!this.dateCtrl.value && this.timeCtrl.value) this.timeCtrl.setValue(null, {emitEvent:false})`. |
| 3 | media | casos | `date-picker.validate()` solo reenvía `dateCtrl.errors`; una hora fuera de `minTime/maxTime` tecleada queda **válida** y se emite Date fuera de rango (`date-picker.ts:422-424`). | Fusionar: `{ ...dateCtrl.errors, ...(withTime ? timeCtrl.errors : null) }`, null si vacío. Patrón ya usado en `date-range-picker.ts:279-285`. |
| 4 | media | casos | `CalendarComponent` NO implementa `NG_VALIDATORS` (`calendar.ts:314,64-70`); expone `minTime/maxTime` pero el error de hora nunca llega al padre y el valor corrupto se emite. | Implementar `Validator` (registrar NG_VALIDATORS, `validate()` → `timeCtrl.errors` si withTime, `onValidatorChange()` en el subscribe del timeCtrl antes del early-return). |
| 5 | media | casos | `calendar.combine()` no normaliza a medianoche con `withTime=false` (`calendar.ts:412-421`); `selectToday()` emite hora residual, contra la doc (`:327`). Asimetría con date-picker. | Añadir `else if (!this.withTime) { out.setHours(0,0,0,0); }`. |
| 6 | media | casos | `selectToday()` selecciona HOY aunque esté fuera de `minDate/maxDate/dateFilter` (`date-picker.ts:382-389`, `calendar.ts:423-427`). En calendar emite valor que el grid pinta deshabilitado, sin feedback. | Predicado `isSelectable(d)` compartido; no-op en `selectToday` si hoy no es seleccionable; en calendar además `[disabled]` del botón Today con computed. |
| 7 | media | mobile | `touchUi` se evalúa solo al abrir: rotar/redimensionar cruzando 768px con el popup ABIERTO no recrea el overlay (posición/backdrop quedan anclados al modo de apertura). Solo pickers, no calendar. | `effect()` por picker que observe `isMobile()`; si `picker?.opened`, `close()` y reabrir en el siguiente tick (`afterNextRender`/`setTimeout`, NO síncrono). O documentar que el modo se fija al abrir. |
| 8 | media | mobile | `(focus)="picker.open()"` en el input de hora hace competir teclado virtual y panel del timepicker en mobile (`date-picker.ts:206`, `calendar.ts:128`). Quitar solo `(focus)` NO basta: `openOnClick` es true por defecto. | Quitar `(focus)` + fijar `[matTimepickerOpenOnClick]="false"` (panel solo por el toggle). Replicar target ≥44px en `mat-timepicker-toggle`. |
| 9 | baja | mobile | `inputmode="numeric"` en inputs de fecha/hora no ofrece `-` ni `:` (formato `dd-MM-yyyy`/`HH:mm`) → teclear manualmente puede fallar el parse. Atenuado (en mobile el camino es el picker). | Evaluar `inputmode="text"` en los inputs que aceptan tecleo con separadores. **Verificar en iOS/Android real antes de cambiar.** |
| 10 | baja | casos | `setDisabledState` no cierra el overlay abierto (`date-picker.ts:406-415`, `date-range-picker.ts:267-274`); el range ni siquiera tiene `[disabled]` en el `<mat-date-range-picker>`. Valor se aplica al re-habilitar. | `if (d) this.picker?.close()` (idempotente) en ambos. Añadir `[disabled]="disabled"` al `<mat-date-range-picker>`. Calendar inline NO aplica (pointer-events:none ya es escudo real). |

## ✅ Quick wins (bajo riesgo, alto valor)

1. `calendar.combine()` — añadir `else if (!withTime) { out.setHours(0,0,0,0); }` (#5, una línea).
2. `date-picker.validate()` — fusionar `timeCtrl.errors` (#3).
3. `date-picker.propagate()` — limpiar `timeCtrl` con `{emitEvent:false}` cuando no hay fecha (#2).
4. `_material-overrides.scss` — bloque mobile `.mat-timepicker-panel` con `min-height:44px` (#1).
5. `setDisabledState` — `this.picker?.close()` en ambos pickers (#10).
6. `<mat-date-range-picker>` — añadir `[disabled]="disabled"` (#10).
7. `(focus)` → `[matTimepickerOpenOnClick]="false"` en los inputs de hora (#8).

## 🟢 Falsos positivos descartados (lo que está BIEN)

- **Sin fugas reales**: suscripciones de componente (`dateCtrl`/`timeCtrl`/`localeChanges`) usan `takeUntilDestroyed` correctamente.
- `date-range-picker` NO suscribe `range.valueChanges` (propaga por callbacks de template) → nada que limpiar.
- `app.config:135` `langChanges$.subscribe(setLocale)` sin unsubscribe → corre en `provideAppInitializer`; publisher y sink viven lo mismo que la app. No es fuga.
- `calendar today=new Date()` capturado en init → solo alimenta `[startAt]`; el resaltado de hoy y el footer no dependen de él.
- `writeValue` con string ISO off-by-one → el comportamiento JS es real pero **el trigger no ocurre** (los forms no hidratan desde string; ISO es solo serialización de salida). Hardening preventivo, no bug activo.
- `onCancel()` sin `onOpened` previo → imposible (Cancel solo existe con popup abierto, `(opened)` emite antes).
- Combinar fecha+hora en DST → `setHours` opera sobre el mismo día calendario sin rollover. Verificado en TZ Chile.
