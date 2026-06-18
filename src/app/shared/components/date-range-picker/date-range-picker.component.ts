import { Component, EventEmitter, Injector, Input, Output, afterNextRender, effect, forwardRef, inject, ViewChild } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, ValidationErrors, AbstractControl, ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule, MatDateRangePicker } from '@angular/material/datepicker';
import { FvxDpHeaderComponent } from '../date-picker/date-picker-header.component';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';

export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

export interface DateRangePreset {
  key: string;
  label: string;
  /** Debe devolver fechas JS (sin hora, a medianoche local) o nulls. */
  factory: () => DateRangeValue;
}

/**
 * Range picker con presets (Today, Last 7d, This month, etc.).
 * Compatible con `ngModel` / Reactive Forms (emite `DateRangeValue`).
 *
 * ```html
 * <app-date-range-picker
 *   [(ngModel)]="range"
 *   [presets]="customPresets"
 *   (rangeChange)="applyFilter($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatTooltipModule,
    TranslocoPipe
],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateRangePickerComponent),
      multi: true,
    },
    // Reenvía al control padre los errores nativos del range (parse, min/max,
    // rango cruzado start>end) que viven solo en el FormGroup interno.
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => DateRangePickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="field-wrapper drp__wrap">
      @if (label) {
        <span class="field-label">{{ label }}</span>
      }
      <div class="drp">
        <mat-form-field
          appearance="outline"
          subscriptSizing="dynamic"
          floatLabel="always"
          class="drp__field"
        >
          <mat-date-range-input [formGroup]="range" [rangePicker]="picker" [disabled]="disabled">
            <input matStartDate formControlName="start" placeholder="Start date" inputmode="text" (dateChange)="onInputChange()" (blur)="onTouched()">
            <input matEndDate formControlName="end" placeholder="End date" inputmode="text" (dateChange)="onInputChange()" (blur)="onTouched()">
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-date-range-picker
            #picker
            panelClass="fvx-dp-popup"
            [calendarHeaderComponent]="headerComponent"
            [touchUi]="isMobile()"
            [disabled]="disabled"
            (opened)="onOpened()"
          >
            <!-- Acciones: elegir un rango NO cierra ni emite hasta pulsar Aplicar.
                 Cancelar restaura el rango previo. Así puedes reajustar ambos
                 extremos antes de confirmar (auditoría #4). -->
            <mat-date-range-picker-actions>
              <button mat-button matDateRangePickerCancel (click)="onCancel()">
                {{ 'datePicker.cancel' | transloco }}
              </button>
              <button mat-flat-button color="primary" matDateRangePickerApply (click)="onApply()">
                {{ 'datePicker.apply' | transloco }}
              </button>
            </mat-date-range-picker-actions>
          </mat-date-range-picker>
        </mat-form-field>

        <button
          mat-icon-button
          type="button"
          [matMenuTriggerFor]="menu"
          [disabled]="disabled"
          aria-label="Presets"
          matTooltip="Presets"
        >
          <mat-icon>tune</mat-icon>
        </button>
        <mat-menu #menu="matMenu">
          @for (p of effectivePresets; track p.key) {
            <button mat-menu-item (click)="applyPreset(p)">{{ p.label }}</button>
          }
          <button mat-menu-item (click)="clear()">
            <mat-icon>clear</mat-icon>
            <span>Clear</span>
          </button>
        </mat-menu>
      </div>
    </div>
    `,
  styles: [`
    :host { display: block; }
    .drp { display: flex; align-items: center; gap: 4px; }
    .drp__field { flex: 1; min-width: 220px; }
  `],
})
export class DateRangePickerComponent implements ControlValueAccessor, Validator {
  /** Header custom del popup (mismo del date-picker): barra nativa + footer.
   *  Aquí NO se provee DP_TODAY_HANDLER, así que el footer solo muestra
   *  "Elegir año…" ("Hoy" no aplica a un rango). */
  readonly headerComponent = FvxDpHeaderComponent;

  @ViewChild('picker') picker?: MatDateRangePicker<Date>;

  @Input() label?: string;
  @Input() presets?: DateRangePreset[];

  @Output() rangeChange = new EventEmitter<DateRangeValue>();

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });
  disabled = false;

  private readonly breakpoints = inject(BreakpointObserver);
  private readonly injector = inject(Injector);
  /** En mobile el range picker se abre como modal grande (`touchUi`); para un
   *  rango es aún más necesario que para una sola fecha. Umbral 768px. */
  readonly isMobile = toSignal(
    this.breakpoints
      .observe('(max-width: 768px)')
      .pipe(map((s) => s.matches)),
    { initialValue: this.breakpoints.isMatched('(max-width: 768px)') },
  );

  private onChange: (v: DateRangeValue) => void = () => {};
  /** Público: lo invoca `(blur)` de los inputs (no en cada cambio, para no
   *  marcar `touched` prematuramente). */
  onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    // Material congela `touchUi` al ABRIR; si el viewport cruza 768px con el
    // popup abierto (rotación), posición/backdrop quedan en el modo de apertura
    // (auditoría #7). Cerrar y reabrir lo reconstruye (el valor vive en `range`,
    // así que reabrir no lo pierde).
    //
    // CLAVE: solo en un CAMBIO REAL de breakpoint. El effect corre en su registro
    // y puede re-correr por reflows (el cierre del modal al elegir rango reflowea
    // el viewport); sin `prev !== mobile`, sería un close()+open() espurio → pestañeo.
    let prevMobile = this.isMobile();
    effect(() => {
      const mobile = this.isMobile();
      const changed = mobile !== prevMobile;
      prevMobile = mobile;
      if (!changed) return;
      const p = this.picker;
      if (!p?.opened) return;
      p.close();
      afterNextRender(() => p.open(), { injector: this.injector });
    });
  }

  get effectivePresets(): DateRangePreset[] {
    return this.presets ?? DateRangePickerComponent.defaultPresets;
  }

  static defaultPresets: DateRangePreset[] = [
    { key: 'today', label: 'Today', factory: () => {
      const d = startOfDay(new Date()); return { start: d, end: d };
    }},
    { key: 'yesterday', label: 'Yesterday', factory: () => {
      const d = startOfDay(new Date()); d.setDate(d.getDate() - 1); return { start: d, end: d };
    }},
    { key: 'last7', label: 'Last 7 days', factory: () => {
      const end = startOfDay(new Date()); const start = new Date(end); start.setDate(end.getDate() - 6); return { start, end };
    }},
    { key: 'last30', label: 'Last 30 days', factory: () => {
      const end = startOfDay(new Date()); const start = new Date(end); start.setDate(end.getDate() - 29); return { start, end };
    }},
    { key: 'thisMonth', label: 'This month', factory: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    }},
    { key: 'lastMonth', label: 'Last month', factory: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    }},
  ];

  applyPreset(p: DateRangePreset): void {
    const v = p.factory();
    this.range.setValue({ start: v.start, end: v.end });
    this.emit();
  }

  clear(): void {
    this.range.setValue({ start: null, end: null });
    this.emit();
  }

  /** Snapshot del rango al ABRIR el popup → permite revertir si se cancela. */
  private snapshot: DateRangeValue = { start: null, end: null };

  onOpened(): void {
    this.snapshot = {
      start: this.range.value.start ?? null,
      end: this.range.value.end ?? null,
    };
  }

  /** Teclear directo en los inputs (sin abrir el calendario) SÍ emite: ahí no
   *  hay botón "Aplicar" que confirme. Dentro del popup, en cambio, las
   *  selecciones no emiten hasta `onApply()` (Material las "stagea"). */
  onInputChange(): void {
    if (!this.picker?.opened) this.emit();
  }

  /** "Aplicar": confirma el rango elegido en el popup y lo emite. */
  onApply(): void {
    this.emit();
  }

  /** "Cancelar": Material ya revierte su modelo interno; restauramos el
   *  FormGroup al snapshot de apertura y re-emitimos por si se había tecleado. */
  onCancel(): void {
    this.range.setValue(
      { start: this.snapshot.start, end: this.snapshot.end },
      { emitEvent: false },
    );
    this.emit();
  }

  emit(): void {
    const v: DateRangeValue = {
      start: this.range.value.start ?? null,
      end: this.range.value.end ?? null,
    };
    this.onChange(v);
    // `onTouched()` NO aquí: lo dispara `(blur)` de los inputs. Marcar touched en
    // cada cambio (presets, dateChange) dejaba el control padre tocado de inmediato.
    this.onValidatorChange();
    this.rangeChange.emit(v);
  }

  writeValue(v: DateRangeValue | null | undefined): void {
    this.range.setValue({
      start: v?.start ?? null,
      end: v?.end ?? null,
    }, { emitEvent: false });
  }
  registerOnChange(fn: (v: DateRangeValue) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.range.disable({ emitEvent: false });
      // Cierra el overlay si quedó abierto al deshabilitar (auditoría #10):
      // Material no lo auto-cierra y el usuario podría seguir editándolo.
      this.picker?.close();
    } else {
      this.range.enable({ emitEvent: false });
    }
  }

  // ── Validator: combina los errores nativos de ambos inputs del range
  // (`matStartDate`/`matEndDate` dejan `matDatepickerParse`/`Min`/`Max` y
  // `matEndDateInvalid` cuando end < start) y los reenvía al control padre.
  validate(_control: AbstractControl): ValidationErrors | null {
    const errors: ValidationErrors = {
      ...this.range.controls.start.errors,
      ...this.range.controls.end.errors,
    };
    return Object.keys(errors).length ? errors : null;
  }
  registerOnValidatorChange(fn: () => void): void { this.onValidatorChange = fn; }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
