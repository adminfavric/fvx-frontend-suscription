import { ChangeDetectionStrategy, Component, InjectionToken, inject } from '@angular/core';
import { MatCalendarHeader } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Callback que el `app-date-picker` provee para el botón "Hoy": selecciona la
 * fecha de hoy y cierra el popup (igual que un clic en un día). Se resuelve por
 * DI desde el header del calendario (que vive en el overlay).
 */
export const DP_TODAY_HANDLER = new InjectionToken<() => void>('DP_TODAY_HANDLER');

/**
 * Header custom del `mat-datepicker` (look del prototipo): reusa la barra nativa
 * (mes/año + flechas, heredada de `MatCalendarHeader`) y añade un FOOTER con dos
 * botones — "Hoy" y "Elegir año…". El footer se empuja al pie con CSS (`order`,
 * ver styles.scss `.fvx-dp-popup`).
 *
 * Clave: NO usa `mat-datepicker-actions` (que rompería el clic-directo en día),
 * sino el `calendarHeaderComponent`. El clic en un día sigue seleccionando y
 * cerrando directo. "Elegir año" usa la API pública `MatCalendar.currentView`.
 */
@Component({
  selector: 'app-dp-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, TranslocoPipe],
  template: `
    <!-- Barra nativa: período (ENE 2024) + flechas. Lógica heredada de MatCalendarHeader. -->
    <div class="mat-calendar-header">
      <div class="mat-calendar-controls">
        <button mat-button type="button" class="mat-calendar-period-button"
                (click)="togglePeriod()" [attr.aria-label]="periodButtonLabel">
          <span aria-hidden="true">{{ periodButtonText }}</span>
          <svg class="mat-calendar-arrow" [class.mat-calendar-invert]="calendar.currentView !== 'month'"
               viewBox="0 0 10 5" focusable="false" aria-hidden="true"><polygon points="0,0 5,5 10,0"/></svg>
        </button>
        <div class="mat-calendar-spacer"></div>
        <button mat-icon-button type="button" class="mat-calendar-previous-button"
                [disabled]="!previousEnabled()" (click)="previousClicked()" [attr.aria-label]="prevButtonLabel">
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <button mat-icon-button type="button" class="mat-calendar-next-button"
                [disabled]="!nextEnabled()" (click)="nextClicked()" [attr.aria-label]="nextButtonLabel">
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>
    </div>

    <!-- Footer: el CSS (.fvx-dp-popup) lo empuja al fondo con order.
         "Hoy" solo si hay handler (selección de fecha única); en el range-picker
         no se provee → solo "Elegir año". -->
    <div class="fvx-dp-footer">
      @if (hasToday) {
        <button mat-button type="button" (click)="today()">{{ 'datePicker.today' | transloco }}</button>
      }
      <button mat-button type="button" (click)="chooseYear()">{{ 'datePicker.chooseYear' | transloco }}</button>
    </div>
  `,
})
export class FvxDpHeaderComponent<D> extends MatCalendarHeader<D> {
  // `calendar` ya lo inyecta MatCalendarHeader (lo usamos en el template y aquí).
  private readonly todayHandler = inject(DP_TODAY_HANDLER, { optional: true });
  /** ¿Mostrar "Hoy"? Solo cuando el padre proveyó el handler (fecha única). */
  protected readonly hasToday = !!this.todayHandler;

  /** Tocar "JUN 2026": abre la grilla de AÑOS (multi-year). Desde ahí, elegir un
   *  año lleva a MESES y elegir un mes a DÍAS — ese flujo descendente lo maneja
   *  Material internamente (yearSelected → 'year', monthSelected → 'month').
   *
   *  Antes hacíamos un toggle de 3 niveles seteando `currentView` a pelo
   *  (month→year→multi-year→month). Eso rompía el flujo: al elegir un año, la
   *  vista volvía a DÍAS en vez de a meses, y el estado quedaba desincronizado.
   *  Replicamos el `currentPeriodClicked()` nativo (month ↔ multi-year), que es
   *  el contrato que MatCalendar espera. Para ir a fechas pasadas/lejanas, las
   *  flechas ‹ › paginan de a ~24 años en la vista multi-year. */
  togglePeriod(): void {
    this.calendar.currentView =
      this.calendar.currentView === 'month' ? 'multi-year' : 'month';
  }

  /** "Elegir año…": abre la grilla de años (atajo para fechas lejanas). Idéntico
   *  a tocar el botón de período desde la vista de días. */
  chooseYear(): void {
    this.calendar.currentView = 'multi-year';
  }

  /** "Hoy": delega al padre (setValue(hoy) + close) = idéntico a un clic en día. */
  today(): void {
    this.todayHandler?.();
  }
}
