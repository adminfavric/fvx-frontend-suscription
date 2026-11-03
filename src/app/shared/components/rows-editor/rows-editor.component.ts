import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RowColumn } from '../../../core/models/api.model';

type Row = Record<string, string | boolean>;
type RowsValue = Row[] | string[];

/**
 * Editor de filas para campos JSON tipo lista (p. ej. el programa de un evento),
 * para que el equipo no tenga que escribir JSON. Con `columns` cada fila es un
 * objeto; sin `columns`, una lista de textos. Compatible con Reactive Forms.
 */
@Component({
  selector: 'app-rows-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatTooltipModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RowsEditorComponent), multi: true }],
  templateUrl: './rows-editor.component.html',
  styleUrl: './rows-editor.component.scss',
})
export class RowsEditorComponent implements ControlValueAccessor {
  private cdr = inject(ChangeDetectorRef);

  /** Columnas de cada fila; vacío = lista de textos. */
  @Input() columns: RowColumn[] = [];
  @Input() addLabel = 'Agregar fila';
  @Input() placeholder = '';

  rows: Row[] = [];
  disabled = false;
  private onChange: (v: RowsValue) => void = () => {};
  private onTouched: () => void = () => {};

  /** Ancho relativo con base mínima: si no caben, las columnas bajan a otra línea en vez de apretarse. */
  flexOf(col: RowColumn): string {
    const grow = col.flex ?? 1;
    return `${grow} 1 ${grow * 80}px`;
  }

  get isTextList(): boolean {
    return !this.columns.length;
  }

  add(): void {
    this.rows = [...this.rows, this.emptyRow()];
    this.emit();
  }

  remove(index: number): void {
    this.rows = this.rows.filter((_, i) => i !== index);
    this.emit();
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.rows.length) return;
    const rows = [...this.rows];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    this.rows = rows;
    this.emit();
  }

  update(index: number, key: string, value: string | boolean): void {
    this.rows = this.rows.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    this.emit();
  }

  writeValue(value: RowsValue | null | undefined): void {
    const list = Array.isArray(value) ? value : [];
    this.rows = list.map((item) => (typeof item === 'string' ? { text: item } : { ...item }));
    this.cdr.markForCheck();
  }
  registerOnChange(fn: (v: RowsValue) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  private emptyRow(): Row {
    if (this.isTextList) return { text: '' };
    return Object.fromEntries(this.columns.map((c) => [c.key, c.type === 'boolean' ? false : '']));
  }

  private emit(): void {
    const value = this.isTextList ? this.rows.map((r) => String(r['text'] ?? '')) : this.rows;
    this.onChange(value);
    this.onTouched();
  }
}
