import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateAdapter } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  ValidationErrors,
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
// NO importar MatNativeDateModule aquí: provee un DateAdapter LOCAL que anula el
// global de app.config.ts (provideNativeDateAdapter) y, con él, el locale
// sincronizado con el idioma de la app → el calendario salía en inglés. El
// adapter global ya está disponible por DI.

/**
 * Calendario expandido (no datepicker flotante). Wrapper de `mat-calendar` con
 * header opcional y presets laterales. Compatible con `ngModel` y Reactive Forms.
 *
 * ```html
 * <app-calendar
 *   [(ngModel)]="date"
 *   [minDate]="minDate"
 *   [maxDate]="maxDate"
 *   (selectedChange)="onSelect($event)"
 * />
 * ```
 *
 * Para rangos de fechas usa `app-date-range-picker`.
 */
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    TranslocoPipe,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CalendarComponent),
      multi: true,
    },
    // Reenvía al control padre los errores nativos del timepicker (con [withTime]
    // + minTime/maxTime); sin esto una hora fuera de rango se guardaría como
    // válida (auditoría #4, alineado con date-picker/date-range-picker).
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => CalendarComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="app-cal"
      [class.app-cal--no-header]="!showHeader"
      [class.app-cal--disabled]="disabledSig()"
    >
      @if (showHeader) {
        <header class="app-cal__header">
          @if (title) {
            <h3 class="app-cal__title">{{ title }}</h3>
          }
          <div class="app-cal__shortcuts">
            <button mat-stroked-button type="button" [disabled]="disabledSig()" (click)="selectToday()">
              <mat-icon>today</mat-icon>
              Today
            </button>
            @if (clearable) {
              <button mat-button type="button" [disabled]="disabledSig()" (click)="clear()">
                Clear
              </button>
            }
          </div>
        </header>
      }

      <!-- class fvx-dp-popup: REUTILIZA el look del date-picker (cajas de meses/
           años, celdas, mes/año actual). NO usa headerComponent ni footer del
           date-picker porque app-calendar ya tiene su propio header (Today/Clear)
           y footer; el glass solo afecta al popup (mat-datepicker-content), no
           al calendario inline. -->
      <mat-calendar
        class="app-cal__grid fvx-dp-popup"
        [selected]="selected()"
        [minDate]="minDate ?? null"
        [maxDate]="maxDate ?? null"
        [dateFilter]="dateFilter"
        [startAt]="startAt ?? selected() ?? today"
        (selectedChange)="onPick($event)"
      />

      <!-- Campo de HORA opcional ([withTime]): combina con la fecha elegida en un
           único Date. Mismo mat-timepicker nativo que el app-date-picker. -->
      @if (withTime) {
        <div class="app-cal__time">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" floatLabel="always" class="app-cal__time-field">
            <mat-label>{{ 'datePicker.time' | transloco }}</mat-label>
            <!-- NO [disabled] aquí: el FormControl se deshabilita vía
                 setDisabledState (timeCtrl.disable()); el binding [disabled] sobre
                 un control reactivo dispara el warning de Angular. -->
            <!-- matTimepickerOpenOnClick=false + sin (focus): en mobile, tocar el
                 campo solo teclea HH:mm; el panel se abre por el toggle (auditoría
                 #8). inputmode=text para tener ':' en el teclado virtual (#9). -->
            <input
              matInput
              [matTimepicker]="calTimePicker"
              [matTimepickerOpenOnClick]="false"
              [formControl]="timeCtrl"
              [matTimepickerMin]="minTime ?? null"
              [matTimepickerMax]="maxTime ?? null"
              placeholder="--:--"
              inputmode="text"
            />
            <mat-timepicker-toggle matIconSuffix [for]="calTimePicker" [disabled]="disabledSig()"></mat-timepicker-toggle>
            <mat-timepicker #calTimePicker [interval]="timeInterval"></mat-timepicker>
          </mat-form-field>
        </div>
      }

      @if (selected()) {
        <footer class="app-cal__footer">
          <span class="app-cal__selected">
            <mat-icon>event</mat-icon>
            {{ selectedLabel() }}
          </span>
        </footer>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .app-cal {
      background: var(--fvx-bg-card, #fff);
      border: 1px solid var(--fvx-border, #e2e8f0);
      border-radius: 8px;
      overflow: hidden;
      max-width: 320px;
    }
    /* Deshabilitado (form.disable()): bloquea TODA interacción del grid y los
       atajos, y lo atenúa. El early-return en onPick() es la defensa real; esto
       es el feedback visual + el escudo de eventos. */
    .app-cal--disabled {
      opacity: 0.6;
      pointer-events: none;
    }
    .app-cal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--fvx-border, #e2e8f0);
      flex-wrap: wrap;
    }
    .app-cal__title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--fvx-text-primary, #1e293b);
    }
    .app-cal__shortcuts {
      display: flex;
      gap: 4px;
    }
    .app-cal__grid {
      padding: 4px;
    }
    /* Campo de hora bajo el grid (solo con [withTime]). Más aire arriba para que
       el label flotante "Hora" no quede pegado al border-top, y laterales
       consistentes con header/footer (12px). */
    .app-cal__time {
      padding: 12px 12px 6px;
      border-top: 1px solid var(--fvx-border, #e2e8f0);
    }
    .app-cal__time-field {
      width: 100%;
    }
    .app-cal__footer {
      padding: 8px 12px;
      border-top: 1px solid var(--fvx-border, #e2e8f0);
      font-size: 0.8125rem;
      color: var(--fvx-text-secondary, #475569);
    }
    .app-cal__selected {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .app-cal__selected mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* ─── Theming del mat-calendar para respetar var(--fvx-*) ───
       El mat-calendar tiene sus propios colores Material que no
       reaccionan a las paletas --fvx-* del shell. Aquí forzamos que
       use los tokens del tema para que el modo oscuro tenga contraste. */
    :host ::ng-deep .mat-calendar {
      color: var(--fvx-text-primary, #1e293b);
      background: transparent;
    }
    :host ::ng-deep .mat-calendar-body-cell-content,
    :host ::ng-deep .mat-calendar-body-label {
      color: var(--fvx-text-primary, #1e293b);
    }
    :host ::ng-deep .mat-calendar-table-header th,
    :host ::ng-deep .mat-calendar-period-button {
      color: var(--fvx-text-secondary, #475569);
    }
    :host ::ng-deep .mat-calendar-arrow {
      fill: var(--fvx-text-primary, #1e293b);
    }
    :host ::ng-deep .mat-calendar-previous-button,
    :host ::ng-deep .mat-calendar-next-button {
      color: var(--fvx-text-primary, #1e293b);
    }
    :host ::ng-deep .mat-calendar-body-disabled .mat-calendar-body-cell-content {
      color: var(--fvx-text-muted, #94a3b8);
    }
    :host ::ng-deep .mat-calendar-body-cell:not(.mat-calendar-body-disabled):hover
      .mat-calendar-body-cell-content {
      background: var(--fvx-hover-bg, rgba(148, 163, 184, 0.15));
    }
    :host ::ng-deep .mat-calendar-body-today:not(.mat-calendar-body-selected)
      .mat-calendar-body-cell-content {
      border-color: var(--fvx-link, #2563eb);
    }
    :host ::ng-deep .mat-calendar-body-selected {
      background: var(--fvx-link, #2563eb) !important;
      color: #fff !important;
    }
    :host ::ng-deep .mat-calendar-body-cell-preview {
      border-color: var(--fvx-link, #2563eb);
    }

    /* ── Compacto en DESKTOP (≥769px) ──
       Solo apretamos el chrome PROPIO del componente (header, atajos, footer).
       El grid del mat-calendar lo compacta la densidad oficial de Material
       (density:-2 global + mat.datepicker-density); NO tocamos su padding/ancho
       (rompe la alineación). Solo ocultamos el texto de la label de mes. */
    @media (min-width: 769px) {
      .app-cal { max-width: 296px; }
      .app-cal__header { padding: 7px 10px; }
      .app-cal__title { font-size: 0.75rem; }
      .app-cal__shortcuts button {
        font-size: 0.75rem;
        line-height: 30px;
        min-height: 30px;
        padding: 0 8px;
      }
      .app-cal__shortcuts mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      .app-cal__footer { padding: 6px 10px; font-size: 0.75rem; }
    }

    /* Mismo fix que los popups (ver _material-overrides):
       - la fila-label de mes ("JUN") es un <tr aria-hidden> aparte → se oculta
         entera sin descuadrar los días (genera el hueco bajo la cabecera);
       - el alto de fila es paddingTop/Bottom inline cuadrado → se comprime. */
    :host ::ng-deep .mat-calendar { height: auto !important; }
    :host ::ng-deep .mat-calendar-body-label {
      padding: 0 !important;
      height: 0 !important;
      color: transparent !important;
    }
    :host ::ng-deep .mat-calendar-body-cell-container {
      padding-top: 4% !important;
      padding-bottom: 4% !important;
    }

    /* ── Mobile (≤768px) — auditoría §📱.5 ──
       En el teléfono el calendario inline no debe quedar capado a 296/320px:
       ocupa el ancho disponible, revierte la compactación de los atajos/footer y
       da targets ≥44px (WCAG 2.5.5). El grid de días respira más alto. */
    @media (max-width: 768px) {
      .app-cal { max-width: 100%; width: 100%; }
      .app-cal__header { padding: 10px 12px; }
      .app-cal__title { font-size: 0.8125rem; }
      .app-cal__shortcuts button {
        font-size: 0.875rem;
        min-height: 44px;
        line-height: 44px;
        padding: 0 14px;
      }
      .app-cal__footer { padding: 10px 12px; font-size: 0.8125rem; }
      :host ::ng-deep .mat-calendar-body-cell-container {
        padding-top: 7% !important;
        padding-bottom: 7% !important;
      }
      :host ::ng-deep .mat-calendar-body-cell-content { font-size: 0.95rem !important; }
    }
  `],
})
export class CalendarComponent implements ControlValueAccessor, Validator {
  @Input() title?: string;
  @Input() showHeader = true;
  @Input() clearable = true;
  @Input() minDate?: Date | null;
  @Input() maxDate?: Date | null;
  @Input() startAt?: Date | null;
  /** Formato del footer (tokens date-fns; localizado por el DateAdapter). Por
   *  defecto `PPP` → "13 de junio de 2026" (es) / "June 13th, 2026" (en). */
  @Input() dateFormat = 'PPP';
  @Input() dateFilter: (d: Date | null) => boolean = () => true;

  /** Muestra un campo de HORA bajo el grid; el valor emitido es un único Date
   *  con fecha+hora combinadas. Si es false, la hora queda a medianoche. */
  @Input() withTime = false;
  /** Granularidad del timepicker (p. ej. '30min', '1h', '15min'). */
  @Input() timeInterval = '30min';
  /** Límites de hora (Date; solo se usa su hora/minuto). Acotan el listado de
   *  opciones — p. ej. minTime=07:00, maxTime=17:00 → solo 07:00…17:00. */
  @Input() minTime?: Date | null;
  @Input() maxTime?: Date | null;
  /** Formato del footer cuando withTime (tokens date-fns; localizado). `PPp` →
   *  "13 de junio de 2026, 14:30" (es). */
  @Input() dateTimeFormat = 'PPp';

  /** Deshabilitado por `form.disable()` (CVA) o por `[disabled]` directo. */
  @Input()
  set disabled(value: boolean) {
    this.disabledSig.set(value);
  }
  get disabled(): boolean {
    return this.disabledSig();
  }

  @Output() selectedChange = new EventEmitter<Date | null>();

  readonly today = new Date();
  readonly selected = signal<Date | null>(null);
  /** Hora elegida (solo activa con [withTime]). Se combina con `selected`. */
  readonly timeCtrl = new FormControl<Date | null>(null);
  /** Signal interno para reaccionar en el template (`[class.app-cal--disabled]`,
   *  `[disabled]` de los atajos). El getter/setter `disabled` lo envuelve. */
  protected readonly disabledSig = signal(false);

  private onChange: (v: Date | null) => void = () => {};
  private onTouched: () => void = () => {};
  /** Callback de Angular para notificar que la validez cambió (NG_VALIDATORS). */
  private onValidatorChange: () => void = () => {};

  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  private readonly destroyRef = inject(DestroyRef);
  /** Tick que se incrementa al cambiar el locale del adapter (idioma de la app).
   *  Hace que `selectedLabel` se recompute y el footer reaccione SIN recargar. */
  private readonly localeTick = signal(0);

  /** Texto del footer formateado con el DateAdapter (date-fns) — sigue el
   *  idioma de la app en runtime, a diferencia del DatePipe (LOCALE_ID estático
   *  en-US, que mostraba "Saturday, June 13" aun en español). */
  readonly selectedLabel = computed(() => {
    this.localeTick(); // dependencia: recomputar al cambiar idioma
    const d = this.selected();
    if (!d || isNaN(d.getTime())) return '';
    return this.dateAdapter.format(d, this.withTime ? this.dateTimeFormat : this.dateFormat);
  });

  constructor() {
    // Cambiar la hora recombina con la fecha ya seleccionada y propaga.
    this.timeCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Re-evalúa la validez del padre ANTES del early-return: una hora fuera
        // de minTime/maxTime debe reflejarse aunque no haya día seleccionado
        // (auditoría #4).
        this.onValidatorChange();
        if (this.disabledSig()) return;
        // Si se fija una hora válida sin haber elegido día, asumimos HOY (con
        // [withTime]): así "solo poner la hora" guarda fecha+hora y no queda vacío.
        if (!this.selected() && this.withTime && this.timeCtrl.value && !isNaN(this.timeCtrl.value.getTime())) {
          this.selected.set(new Date());
        }
        if (!this.selected()) return;
        this.emit();
      });
    // El locale del adapter lo sincroniza app.config con el idioma (langChanges$).
    // Escuchamos su cambio para recomputar el label del footer.
    this.dateAdapter.localeChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.localeTick.update((n) => n + 1));
  }

  /** Día elegido en el grid. La fecha (medianoche) entra al signal; la hora la
   *  aporta el timeCtrl al combinar. */
  onPick(d: Date | null): void {
    // Si el form está deshabilitado, NO escribir: el mat-calendar inline sigue
    // emitiendo selectedChange aunque el contenedor esté bloqueado, y sin esto
    // el control padre (que se cree deshabilitado) recibiría el valor.
    if (this.disabledSig()) return;
    this.selected.set(d);
    this.emit();
  }

  /** Combina fecha (selected) + hora (timeCtrl, si withTime) y propaga el Date. */
  private emit(): void {
    const out = this.combine();
    this.selected.set(out);
    this.onChange(out);
    this.onTouched();
    this.selectedChange.emit(out);
  }

  private combine(): Date | null {
    const date = this.selected();
    if (!date) return null;
    const out = new Date(date);
    // Guarda contra una hora inválida del timepicker (mientras se teclea o si
    // falla el parse): sin esto, setHours(NaN, …) deja un Date inválido que
    // rompe el formato del footer y el toISOString al guardar.
    if (this.withTime && this.timeCtrl.value && !isNaN(this.timeCtrl.value.getTime())) {
      const t = this.timeCtrl.value;
      out.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
    } else if (!this.withTime) {
      // Sin hora → medianoche, cumpliendo la doc del @Input y unificando con el
      // date-picker (auditoría #5). Antes selectToday con withTime=false dejaba
      // la hora de pared actual en el Date emitido.
      out.setHours(0, 0, 0, 0);
    }
    return out;
  }

  /** ¿Es seleccionable la fecha `d`? Respeta minDate/maxDate/dateFilter (mismo
   *  contrato que las celdas del grid). Usado por selectToday (auditoría #6). */
  private isSelectable(d: Date): boolean {
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    if (this.minDate) {
      const m = new Date(this.minDate); m.setHours(0, 0, 0, 0);
      if (day < m) return false;
    }
    if (this.maxDate) {
      const m = new Date(this.maxDate); m.setHours(0, 0, 0, 0);
      if (day > m) return false;
    }
    return this.dateFilter(day);
  }

  selectToday(): void {
    const now = new Date();
    // No-op si hoy está fuera de minDate/maxDate/dateFilter: el botón "Today" no
    // debe seleccionar una fecha que el grid pinta deshabilitada (auditoría #6).
    if (this.disabledSig() || !this.isSelectable(now)) return;
    if (this.withTime) this.timeCtrl.setValue(now, { emitEvent: false });
    this.onPick(now);
  }

  clear(): void {
    this.timeCtrl.setValue(null, { emitEvent: false });
    this.selected.set(null);
    if (this.disabledSig()) return;
    this.onChange(null);
    this.onTouched();
    this.selectedChange.emit(null);
  }

  writeValue(v: Date | string | null | undefined): void {
    if (v == null) {
      this.selected.set(null);
      this.timeCtrl.setValue(null, { emitEvent: false });
      return;
    }
    const d = v instanceof Date ? v : new Date(v);
    const valid = isNaN(d.getTime()) ? null : d;
    this.selected.set(valid);
    // Con withTime, el mismo Date alimenta la hora.
    this.timeCtrl.setValue(this.withTime ? valid : null, { emitEvent: false });
  }

  registerOnChange(fn: (v: Date | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  /** `form.disable()`/`enable()` ahora SÍ afectan al calendario inline (antes
   *  seguía interactivo y onPick escribía en un control que el form creía
   *  deshabilitado). También deshabilita el campo de hora. */
  setDisabledState(isDisabled: boolean): void {
    this.disabledSig.set(isDisabled);
    if (isDisabled) {
      this.timeCtrl.disable({ emitEvent: false });
    } else {
      this.timeCtrl.enable({ emitEvent: false });
    }
  }

  // ── Validator: con [withTime] reenvía al control padre los errores nativos del
  // timepicker (`matTimepickerParse`/`Min`/`Max`); sin esto una hora fuera de
  // minTime/maxTime se guardaría como válida (auditoría #4). Sin withTime no hay
  // campo de hora → null (la validez de la fecha la maneja el grid + min/max).
  validate(_control: AbstractControl): ValidationErrors | null {
    return this.withTime ? this.timeCtrl.errors : null;
  }
  registerOnValidatorChange(fn: () => void): void { this.onValidatorChange = fn; }
}
