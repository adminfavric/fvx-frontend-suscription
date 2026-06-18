import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ElementRef, forwardRef } from '@angular/core';

import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * Input de búsqueda con icono, clear button y debounce configurable.
 * También lo usa **`app-data-table`** en la barra de herramientas (CRUD genérico).
 *
 * Compatible con dos patrones de uso (retro-compat):
 *
 * 1. **Standalone** (toolbars, filtros sueltos) — escuchas el `(searchChange)`:
 *    ```html
 *    <app-search-input
 *      placeholder="Search invoices..."
 *      [debounceMs]="400"
 *      (searchChange)="onSearch($event)"
 *    />
 *    ```
 *
 * 2. **Dentro de un Reactive Form** — implementa `ControlValueAccessor`:
 *    ```ts
 *    form = new FormGroup({ q: new FormControl('') });
 *    ```
 *    ```html
 *    <app-search-input formControlName="q" placeholder="Buscar…" />
 *    ```
 *    El `(searchChange)` sigue disponible si quieres escuchar el debounce en paralelo.
 */
@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchInputComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="search-input" subscriptSizing="dynamic">
      <mat-icon matPrefix class="search-input__icon">search</mat-icon>
      <input
        matInput
        #inputEl
        type="text"
        role="searchbox"
        [attr.aria-label]="placeholder"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [(ngModel)]="value"
        (ngModelChange)="onInputChange($event)"
        (blur)="onTouched()"
      >
      @if (value && !disabled) {
        <button
          matSuffix
          mat-icon-button
          type="button"
          aria-label="Clear"
          (click)="clear()"
        >
          <mat-icon>close</mat-icon>
        </button>
      }
    </mat-form-field>
  `,
  styles: [`
    :host { display: inline-block; width: 100%; max-width: 340px; }
    .search-input { width: 100%; }
    .search-input__icon { color: var(--fvx-text-muted, #94a3b8); }
  `],
})
export class SearchInputComponent implements OnInit, ControlValueAccessor, OnDestroy {
  @Input() placeholder = 'Search...';
  @Input() debounceMs = 400;
  /** @deprecated usa `[(ngModel)]` o `formControlName` para el valor inicial. */
  @Input() initialValue = '';

  @Output() searchChange = new EventEmitter<string>();

  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  value = '';
  disabled = false;
  private raw$ = new Subject<string>();

  // ── ControlValueAccessor ─────────────────────────────────────────────
  private cvaChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  ngOnInit(): void {
    // El pipeline se arma en ngOnInit (no en el constructor): así `debounceMs`
    // ya tiene el valor del @Input. En el constructor el binding aún no corrió,
    // por lo que toda instancia quedaba fijada en el default (400ms).
    this.raw$
      .pipe(debounceTime(this.debounceMs), distinctUntilChanged())
      .subscribe((v) => {
        const trimmed = v.trim();
        this.cvaChange(trimmed);          // → FormControl recibe el valor (con debounce)
        this.searchChange.emit(trimmed);  // → consumidores sin form siguen escuchando
      });
    if (this.initialValue) {
      this.value = this.initialValue;
    }
  }

  ngOnDestroy(): void {
    this.raw$.complete();
  }

  onInputChange(v: string): void {
    this.raw$.next(v ?? '');
  }

  clear(): void {
    this.value = '';
    this.cvaChange('');
    this.searchChange.emit('');
    this.inputEl?.nativeElement.focus();
  }

  focus(): void {
    this.inputEl?.nativeElement.focus();
  }

  writeValue(v: string | null | undefined): void {
    // Llega desde FormControl / ngModel sin re-disparar el debounce ni el emit.
    this.value = v ?? '';
  }
  registerOnChange(fn: (v: string) => void): void { this.cvaChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }
}
