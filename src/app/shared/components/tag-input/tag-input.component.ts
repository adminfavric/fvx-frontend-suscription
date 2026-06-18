import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';

import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';

/**
 * Input tipo chips para tags/keywords. Compatible con `Reactive Forms` y `ngModel`.
 *
 * ```html
 * <app-tag-input
 *   [(ngModel)]="tags"
 *   placeholder="Add tag..."
 *   [allowDuplicates]="false"
 *   [maxItems]="10"
 * />
 * ```
 */
@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatChipsModule
],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagInputComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="tag-input" subscriptSizing="dynamic">
      @if (label) {
        <mat-label>{{ label }}</mat-label>
      }
      <mat-chip-grid #grid>
        @for (tag of value; track tag; let i = $index) {
          <mat-chip-row (removed)="removeAt(i)">
            {{ tag }}
            <button matChipRemove type="button" aria-label="Remove tag">
              <mat-icon>cancel</mat-icon>
            </button>
          </mat-chip-row>
        }
        <input
          [placeholder]="placeholder"
          [matChipInputFor]="grid"
          [matChipInputSeparatorKeyCodes]="separatorKeyCodes"
          [matChipInputAddOnBlur]="true"
          [disabled]="disabled || isFull"
          (matChipInputTokenEnd)="add($event)"
          >
      </mat-chip-grid>
    </mat-form-field>
    `,
  styles: [`
    :host { display: block; }
    .tag-input { width: 100%; }
  `],
})
export class TagInputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder = 'Add tag...';
  @Input() allowDuplicates = false;
  @Input() maxItems?: number;

  @Output() changes = new EventEmitter<string[]>();

  value: string[] = [];
  disabled = false;
  separatorKeyCodes = [ENTER, COMMA, SPACE];

  private onChange: (v: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  get isFull(): boolean {
    return this.maxItems !== undefined && this.value.length >= this.maxItems;
  }

  add(ev: MatChipInputEvent): void {
    const raw = (ev.value || '').trim();
    ev.chipInput?.clear();
    if (!raw) return;
    if (this.isFull) return;
    if (!this.allowDuplicates && this.value.includes(raw)) return;
    this.value = [...this.value, raw];
    this.emit();
  }

  removeAt(index: number): void {
    this.value = this.value.filter((_, i) => i !== index);
    this.emit();
  }

  writeValue(v: string[] | null | undefined): void {
    this.value = Array.isArray(v) ? [...v] : [];
  }
  registerOnChange(fn: (v: string[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  private emit(): void {
    this.onChange(this.value);
    this.onTouched();
    this.changes.emit(this.value);
  }
}
