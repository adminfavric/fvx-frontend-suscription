import {
  Component,
  DestroyRef,
  EventEmitter,
  Injector,
  Input,
  Output,
  afterNextRender,
  effect,
  forwardRef,
  inject,
  ViewChild,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';

import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  ValidationErrors,
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule, FloatLabelType } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatDatepickerModule,
  MatDatepicker,
} from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
// NO importar MatNativeDateModule (ver nota en calendar.component): proveería un
// DateAdapter local que anula el global con el locale de la app. Usa el global.
import { FvxDpHeaderComponent, DP_TODAY_HANDLER } from './date-picker-header.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Selector de **fecha única** para formularios — wrapper alrededor de
 * `mat-form-field` + `mat-datepicker`. Compatible con `ngModel` y
 * Reactive Forms mediante `ControlValueAccessor`.
 *
 * > Si necesitas un calendario siempre visible usa `app-calendar`.
 * > Si necesitas un rango usa `app-date-range-picker`.
 *
 * ```html
 * <!-- Básico -->
 * <app-date-picker
 *   [(ngModel)]="birthdate"
 *   label="Birthdate"
 *   placeholder="dd-mm-yyyy"
 * />
 *
 * <!-- Con límites, clearable, required -->
 * <app-date-picker
 *   [(ngModel)]="appointment"
 *   label="Appointment"
 *   [minDate]="today"
 *   [maxDate]="maxYear"
 *   [required]="true"
 *   [clearable]="true"
 *   [dateFilter]="weekdayOnly"
 *   (dateChange)="onPick($event)"
 * />
 *
 * <!-- Solo lectura (pero permite abrir el calendario para ver la fecha) -->
 * <app-date-picker
 *   [(ngModel)]="createdAt"
 *   label="Created"
 *   [readonly]="true"
 * />
 * ```
 *
 * En Reactive Forms:
 *
 * ```ts
 * form = new FormGroup({
 *   startAt: new FormControl<Date | null>(null, Validators.required),
 * });
 * ```
 *
 * ```html
 * <app-date-picker formControlName="startAt" label="Start" />
 * ```
 */
@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslocoPipe
],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
    // Validación: reenvía al control padre los errores nativos del datepicker
    // (matDatepickerParse / Min / Max) que viven solo en el control interno.
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
    // "Hoy" del header del calendario (que vive en el overlay) delega aquí.
    {
      provide: DP_TODAY_HANDLER,
      useFactory: () => {
        const cmp = inject(DatePickerComponent);
        return () => cmp.selectToday();
      },
    },
  ],
  host: { '[attr.title]': 'null' },
  template: `
    <div class="field-wrapper dp__wrap">
      @if (label) {
        <label class="field-label" [for]="inputId">
          {{ label }}@if (required) {<span class="required">*</span>}
        </label>
      }
      <div class="dp__row" [class.dp__row--with-time]="withTime">
      <mat-form-field
        appearance="outline"
        subscriptSizing="dynamic"
        floatLabel="always"
        class="dp__field"
        [class.dp__field--dense]="dense"
      >
        <input
          [id]="inputId"
          matInput
          inputmode="text"
          [matDatepicker]="picker"
          [formControl]="dateCtrl"
          [min]="minDate ?? null"
          [max]="maxDate ?? null"
          [matDatepickerFilter]="dateFilter"
          [placeholder]="placeholder"
          [readonly]="readonly"
          [required]="required"
          (blur)="onTouched()"
        />
        @if (clearable && value() && !disabled && !readonly) {
          <button
            mat-icon-button
            matSuffix
            type="button"
            class="dp__clear"
            aria-label="Clear date"
            matTooltip="Clear"
            (click)="clear(); $event.stopPropagation()"
          >
            <mat-icon>close</mat-icon>
          </button>
        }
        <mat-datepicker-toggle matIconSuffix [for]="picker" [disabled]="disabled"></mat-datepicker-toggle>
        <mat-datepicker
          #picker
          panelClass="fvx-dp-popup"
          [calendarHeaderComponent]="headerComponent"
          [startAt]="startAt ?? value() ?? null"
          [startView]="startView"
          [touchUi]="isMobile()"
          [disabled]="disabled"
        ></mat-datepicker>
        @if (hint && !errorText) {
          <mat-hint>{{ hint }}</mat-hint>
        }
        @if (errorText) {
          <mat-error>{{ errorText }}</mat-error>
        }
      </mat-form-field>

      <!-- Campo de HORA opcional ([withTime]). mat-timepicker nativo (Material 21)
           sobre un FormControl propio; al cambiar fecha u hora recombinamos en un
           único Date (combine()). Usa el mismo DateAdapter/locale global. -->
      @if (withTime) {
        <mat-form-field
          appearance="outline"
          subscriptSizing="dynamic"
          floatLabel="always"
          class="dp__time"
          [class.dp__field--dense]="dense"
        >
          <mat-label>{{ 'datePicker.time' | transloco }}</mat-label>
          <!-- matTimepickerOpenOnClick=false + sin (focus): en mobile, tocar el
               campo solo levanta el teclado para teclear HH:mm; el panel de horas
               se abre por el toggle. Antes el (focus)=open() + openOnClick (true por
               defecto) hacían competir teclado y panel (auditoría #8). -->
          <input
            matInput
            [matTimepicker]="timePicker"
            [matTimepickerOpenOnClick]="false"
            [formControl]="timeCtrl"
            [matTimepickerMin]="minTime ?? null"
            [matTimepickerMax]="maxTime ?? null"
            [placeholder]="timePlaceholder"
            inputmode="text"
            (blur)="onTouched()"
          />
          <mat-timepicker-toggle matIconSuffix [for]="timePicker" [disabled]="disabled"></mat-timepicker-toggle>
          <mat-timepicker #timePicker [interval]="timeInterval"></mat-timepicker>
        </mat-form-field>
      }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 100%;
      container-type: inline-size;
    }
    .dp__row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .dp__field {
      width: 100%;
      flex: 1 1 auto;
      min-width: 0;
    }
    /* Con hora: en fila SOLO si hay ancho de sobra (≥360px); el campo de hora no
       crece. En contenedores estrechos (grids, columnas) se apila debajo para que
       SIEMPRE quepa y se vea — antes en una celda de 220px no aparecía. */
    .dp__row--with-time {
      flex-wrap: wrap;
    }
    .dp__row--with-time .dp__time {
      flex: 1 1 130px;
      min-width: 120px;
    }
    @container (min-width: 360px) {
      .dp__row--with-time .dp__time {
        flex: 0 0 130px;
      }
    }
    /* Densa: solo reduce un poco el tamaño de fuente; el infix y padding los hereda
       del patrón global outline (igual que cualquier <mat-form-field appearance="outline">). */
    .dp__field--dense {
      font-size: 0.8125rem;
    }
    :host ::ng-deep .dp__clear .mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      line-height: 18px;
    }
  `],
})
export class DatePickerComponent implements ControlValueAccessor, Validator {
  @ViewChild('picker') picker?: MatDatepicker<Date>;

  @Input() label?: string;
  @Input() placeholder = '';
  @Input() hint?: string;
  @Input() errorText?: string;

  @Input() minDate?: Date | null;
  @Input() maxDate?: Date | null;
  @Input() startAt?: Date | null;
  @Input() startView: 'month' | 'year' | 'multi-year' = 'month';

  /** Muestra un campo de HORA junto a la fecha; el valor emitido es un único
   *  `Date` con fecha+hora combinadas. Si es false, la hora queda a medianoche. */
  @Input() withTime = false;
  /** Granularidad del timepicker (p. ej. '30min', '1h', '15min'). */
  @Input() timeInterval = '30min';
  @Input() timePlaceholder = '--:--';
  /** Límites de hora (Date; solo se usa su hora/minuto). */
  @Input() minTime?: Date | null;
  @Input() maxTime?: Date | null;

  /** Predicado para deshabilitar fechas (ej. solo días hábiles). */
  @Input() dateFilter: (d: Date | null) => boolean = () => true;

  @Input() required = false;
  @Input() readonly = false;
  @Input() clearable = true;
  @Input() disabled = false;

  @Input() appearance: 'fill' | 'outline' = 'outline';
  @Input() floatLabel: FloatLabelType = 'auto';
  /** Campo "denso" (menor altura) — útil en filas de filtros o tablas. */
  @Input() dense = false;

  @Output() dateChange = new EventEmitter<Date | null>();

  /** FormControl interno enlazado al `matInput`+`matDatepicker`. Es la pieza
   *  CLAVE: solo así el `MatDatepickerInput` formatea el valor con el
   *  DateAdapter (date-fns → dd-MM-yyyy). Con `[value]` directo, el input
   *  bypassa el adapter y muestra el string crudo. */
  readonly dateCtrl = new FormControl<Date | null>(null);
  /** FormControl de la HORA (solo activo con [withTime]). Mantiene un Date cuya
   *  hora/minuto se combina con la fecha de dateCtrl. */
  readonly timeCtrl = new FormControl<Date | null>(null);
  /** Espejo del valor para el template (clearable, startAt). */
  readonly value = signal<Date | null>(null);
  /** Id estable para vincular el `<label class="field-label" [for]>` con el input. */
  readonly inputId = `dp-${Math.random().toString(36).slice(2, 9)}`;

  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly injector = inject(Injector);
  /** En mobile el datepicker se abre como modal grande (`touchUi`) en vez de
   *  dropdown chico anclado al input. Umbral 768px (consistente con el resto
   *  de los media-queries mobile de la plantilla). */
  readonly isMobile = toSignal(
    this.breakpoints
      .observe('(max-width: 768px)')
      .pipe(map((s) => s.matches)),
    { initialValue: this.breakpoints.isMatched('(max-width: 768px)') },
  );

  private onChange: (v: Date | null) => void = () => {};
  onTouched: () => void = () => {};
  /** Callback de Angular para notificar que la validez cambió (NG_VALIDATORS). */
  private onValidatorChange: () => void = () => {};

  constructor() {
    // dateCtrl/timeCtrl son la fuente de verdad de cada input; al cambiar
    // cualquiera (teclado o picker) recombinamos fecha+hora y propagamos.
    this.dateCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.propagate());
    this.timeCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.propagate());

    // Material congela `touchUi` al ABRIR el overlay; si el viewport cruza 768px
    // (rotación) con el popup abierto, posición/backdrop quedan en el modo de
    // apertura (auditoría #7). Lo reconstruimos cerrando y reabriendo.
    //
    // CLAVE: solo actuar en un CAMBIO REAL de breakpoint. El effect se ejecuta
    // también en su registro inicial y puede re-correr por reflows del layout
    // (p. ej. el cierre del modal al elegir fecha reflowea el viewport); sin el
    // guard `prev !== mobile`, dispararía un close()+open() espurio → pestañeo.
    let prevMobile = this.isMobile();
    effect(() => {
      const mobile = this.isMobile();
      const changed = mobile !== prevMobile;
      prevMobile = mobile;
      if (!changed) return;            // no es transición de breakpoint → no tocar
      const p = this.picker;
      if (!p?.opened) return;          // solo si el popup está abierto
      p.close();
      afterNextRender(() => p.open(), { injector: this.injector });
    });
  }

  /** Combina la fecha (dateCtrl) con la hora (timeCtrl, solo si withTime) en un
   *  único Date y propaga al signal, al CVA, al validador y al @Output. */
  private propagate(): void {
    // Sin fecha no hay valor: evita que el input de hora muestre una hora
    // huérfana (modelo null pero hora visible) al elegir hora antes que fecha o
    // al borrar la fecha por teclado (auditoría #2). emitEvent:false → no
    // re-dispara la suscripción de timeCtrl (evita bucle).
    if (!this.dateCtrl.value && this.timeCtrl.value) {
      this.timeCtrl.setValue(null, { emitEvent: false });
    }
    const d = this.combine();
    this.value.set(d);
    this.onChange(d);
    // Re-evalúa el control padre: un texto inválido tecleado deja el control
    // interno con `matDatepickerParse` y ese error debe llegar al padre.
    this.onValidatorChange();
    this.dateChange.emit(d);
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

  /** Fecha base + hora del timeCtrl (si withTime). Sin withTime → medianoche. */
  private combine(): Date | null {
    const date = this.dateCtrl.value;
    if (!date) return null;
    const out = new Date(date);
    if (this.withTime && this.timeCtrl.value) {
      const t = this.timeCtrl.value;
      out.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
    } else if (!this.withTime) {
      out.setHours(0, 0, 0, 0);
    }
    return out;
  }

  clear(): void {
    this.dateCtrl.setValue(null);
    this.timeCtrl.setValue(null, { emitEvent: false });
    this.onTouched();
  }

  /** Abre el datepicker programáticamente. */
  open(): void {
    if (!this.disabled && !this.readonly) this.picker?.open();
  }

  /** Header custom del popup (barra nativa + footer Hoy / Elegir año). */
  readonly headerComponent = FvxDpHeaderComponent;

  /** "Hoy": selecciona HOY y cierra, idéntico a un clic en un día. Lo invoca el
   *  header del calendario vía DP_TODAY_HANDLER. setValue → CVA → el modelo del
   *  datepicker refleja la celda; close() es el mismo cierre del clic directo. */
  selectToday(): void {
    const now = new Date();
    // No-op si hoy está fuera de minDate/maxDate/dateFilter: el botón "Hoy" no
    // debe poder seleccionar una fecha que el grid pinta deshabilitada
    // (auditoría #6). Cierra el popup igual para no dejarlo abierto.
    if (!this.isSelectable(now)) {
      this.picker?.close();
      return;
    }
    this.dateCtrl.setValue(now);
    // Con hora: precargamos la hora actual en el timeCtrl (sin re-emitir aquí;
    // dateCtrl.valueChanges ya dispara propagate, que lee timeCtrl).
    if (this.withTime) this.timeCtrl.setValue(now, { emitEvent: false });
    this.picker?.close();
  }

  writeValue(v: Date | string | number | null | undefined): void {
    let d: Date | null = null;
    if (v !== null && v !== undefined && v !== '') {
      const parsed = v instanceof Date ? v : new Date(v);
      d = isNaN(parsed.getTime()) ? null : parsed;
    }
    this.value.set(d);
    // emitEvent:false → escribir desde el form padre no re-dispara onChange.
    // Con withTime, el mismo Date alimenta ambos controles (fecha y hora).
    this.dateCtrl.setValue(d, { emitEvent: false });
    this.timeCtrl.setValue(this.withTime ? d : null, { emitEvent: false });
  }

  registerOnChange(fn: (v: Date | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void {
    this.disabled = d;
    if (d) {
      this.dateCtrl.disable({ emitEvent: false });
      this.timeCtrl.disable({ emitEvent: false });
      // Cierra el overlay si quedó abierto al deshabilitar (auditoría #10):
      // Material no lo auto-cierra y el usuario podría seguir editándolo.
      this.picker?.close();
    } else {
      this.dateCtrl.enable({ emitEvent: false });
      this.timeCtrl.enable({ emitEvent: false });
    }
  }

  // ── Validator: reenvía al control padre los errores nativos de fecha Y hora.
  // `MatDatepickerInput` deja en `dateCtrl` errores que el padre nunca vería
  // (texto sin parsear → `matDatepickerParse`; fuera de `[min]`/`[max]` →
  // `matDatepickerMin`/`matDatepickerMax`). Con [withTime], `MatTimepickerInput`
  // deja en `timeCtrl` sus propios errores (`matTimepickerParse`/`Min`/`Max`):
  // hay que fusionarlos o una hora fuera de rango se guardaría como válida
  // (auditoría #3). `errorText` es solo override presentacional.
  validate(_control: AbstractControl): ValidationErrors | null {
    const errors: ValidationErrors = {
      ...this.dateCtrl.errors,
      ...(this.withTime ? this.timeCtrl.errors : null),
    };
    return Object.keys(errors).length ? errors : null;
  }
  registerOnValidatorChange(fn: () => void): void { this.onValidatorChange = fn; }
}
