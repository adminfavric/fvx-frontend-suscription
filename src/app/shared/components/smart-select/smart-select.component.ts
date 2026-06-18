import { Component, DestroyRef, Input, OnInit, signal, computed, forwardRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormControl, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@jsverse/transloco';

export interface SelectOption {
  value: any;
  label: string;
}

const AUTOCOMPLETE_THRESHOLD = 10;

@Component({
  selector: 'app-smart-select',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatInputModule,
    MatIconModule,
    TranslocoModule
],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SmartSelectComponent),
      multi: true,
    },
  ],
  template: `
    @if (useAutocomplete()) {
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="smart-select-field">
        <input matInput
               [formControl]="searchControl"
               [matAutocomplete]="auto"
               [placeholder]="placeholder"
               (blur)="onBlur()">
        <mat-icon matSuffix class="dropdown-icon">arrow_drop_down</mat-icon>
        <mat-autocomplete #auto="matAutocomplete"
                          [displayWith]="displayFn"
                          (optionSelected)="onOptionSelected($event)">
          @if (showNone) {
            <mat-option [value]="null">{{ 'common.none' | transloco }}</mat-option>
          }
          @for (opt of filteredOptions(); track opt.value) {
            <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>
    } @else {
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="smart-select-field">
        <mat-select [formControl]="selectControl" [placeholder]="placeholder">
          @if (showNone) {
            <mat-option [value]="null">{{ 'common.none' | transloco }}</mat-option>
          }
          @for (opt of options; track opt.value) {
            <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .smart-select-field {
      width: 100%;
    }

    .dropdown-icon {
      color: rgba(0, 0, 0, 0.54);
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
    }
  `],
})
export class SmartSelectComponent implements OnInit, ControlValueAccessor {
  private readonly destroyRef = inject(DestroyRef);
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Select...';
  @Input() showNone = true;

  searchControl = new FormControl('');
  selectControl = new FormControl(null);

  useAutocomplete = computed(() => this.options.length > AUTOCOMPLETE_THRESHOLD);

  private searchText = signal('');
  filteredOptions = computed(() => {
    const text = this.searchText().toLowerCase();
    if (!text) return this.options;
    return this.options.filter(opt => opt.label.toLowerCase().includes(text));
  });

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    // takeUntilDestroyed reemplaza el array manual de Subscription + ngOnDestroy
    // (patrón de place-search): se limpian solas al destruir el componente.
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        if (typeof val === 'string') {
          this.searchText.set(val);
        }
      });

    this.selectControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        this.onChange(val);
        this.onTouched();
      });
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    if (this.useAutocomplete()) {
      // Setear el VALUE (no el label). El input tiene [matAutocomplete] con
      // [displayWith]=displayFn, así que MatAutocompleteTrigger es el CVA del
      // control: al escribir el VALUE, displayFn lo traduce al LABEL visible.
      // (Antes seteábamos el label; displayFn(label) no encontraba opción
      //  —busca o.value === value— y el input quedaba EN BLANCO al editar un FK
      //  o restaurar un filtro con >10 opciones.)
      this.searchControl.setValue(value, { emitEvent: false });
    } else {
      this.selectControl.setValue(value, { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.searchControl.disable();
      this.selectControl.disable();
    } else {
      this.searchControl.enable();
      this.selectControl.enable();
    }
  }

  // Display function for autocomplete
  displayFn = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    const opt = this.options.find(o => o.value === value);
    return opt ? opt.label : '';
  };

  onOptionSelected(event: any): void {
    const value = event.option.value;
    this.onChange(value);
    this.onTouched();
    this.searchText.set('');
  }

  onBlur(): void {
    this.onTouched();
    // If the text doesn't match any option, reset to empty
    const currentText = this.searchControl.value;
    if (typeof currentText === 'string') {
      const match = this.options.find(o => o.label.toLowerCase() === currentText.toLowerCase());
      if (!match) {
        this.searchControl.setValue(null, { emitEvent: false });
        this.onChange(null);
      }
    }
  }
}
