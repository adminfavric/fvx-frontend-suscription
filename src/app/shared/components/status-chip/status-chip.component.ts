import { Component, Input, computed, signal } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

export type StatusChipVariant =
  | 'success'
  | 'warn'
  | 'danger'
  | 'info'
  | 'muted'
  | 'neutral';

/**
 * Chip tipado para estados (success / warn / danger / info / muted / neutral).
 *
 * Dos modos de uso:
 *
 * 1. **Directo:** `<app-status-chip variant="success" label="Active" />`
 * 2. **Con mapa:** pasa un `value` y un `map`; el componente resuelve la variante y la etiqueta.
 *
 * ```html
 * <app-status-chip
 *   [value]="row.status"
 *   [map]="{
 *     active: { variant: 'success', label: 'Active', icon: 'check_circle' },
 *     pending: { variant: 'warn', label: 'Pending' },
 *     archived: { variant: 'muted', label: 'Archived' }
 *   }"
 * />
 * ```
 */
export interface StatusChipMapEntry {
  variant: StatusChipVariant;
  label?: string;
  icon?: string;
}

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <span class="status-chip" [class]="'status-chip--' + resolvedVariant()">
      @if (resolvedIcon()) {
        <mat-icon class="status-chip__icon">{{ resolvedIcon() }}</mat-icon>
      }
      <span class="status-chip__label">{{ resolvedLabel() }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-block; }
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 22px;
      padding: 0 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .status-chip__icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      line-height: 14px;
    }
    .status-chip--success {
      background: var(--fvx-chip-success-bg, #dcfce7);
      color: var(--fvx-chip-success-fg, #166534);
      border-color: var(--fvx-chip-success-border, #bbf7d0);
    }
    .status-chip--warn {
      background: var(--fvx-chip-warn-bg, #fef3c7);
      color: var(--fvx-chip-warn-fg, #92400e);
      border-color: var(--fvx-chip-warn-border, #fde68a);
    }
    .status-chip--danger {
      background: var(--fvx-chip-danger-bg, #fee2e2);
      color: var(--fvx-chip-danger-fg, #991b1b);
      border-color: var(--fvx-chip-danger-border, #fecaca);
    }
    .status-chip--info {
      background: var(--fvx-chip-info-bg, #dbeafe);
      color: var(--fvx-chip-info-fg, #1e40af);
      border-color: var(--fvx-chip-info-border, #bfdbfe);
    }
    .status-chip--muted {
      background: var(--fvx-chip-muted-bg, #f1f5f9);
      color: var(--fvx-chip-muted-fg, #64748b);
      border-color: var(--fvx-chip-muted-border, #e2e8f0);
    }
    .status-chip--neutral {
      background: var(--fvx-chip-neutral-bg, #e2e8f0);
      color: var(--fvx-chip-neutral-fg, #334155);
      border-color: var(--fvx-chip-neutral-border, #cbd5e1);
    }
  `],
})
export class StatusChipComponent {
  @Input() set variant(v: StatusChipVariant | undefined) { this._variant.set(v); }
  @Input() set label(v: string | undefined) { this._label.set(v); }
  @Input() set icon(v: string | undefined) { this._icon.set(v); }
  @Input() set value(v: unknown) { this._value.set(v); }
  @Input() set map(v: Record<string, StatusChipMapEntry> | undefined) { this._map.set(v); }

  private _variant = signal<StatusChipVariant | undefined>(undefined);
  private _label = signal<string | undefined>(undefined);
  private _icon = signal<string | undefined>(undefined);
  private _value = signal<unknown>(undefined);
  private _map = signal<Record<string, StatusChipMapEntry> | undefined>(undefined);

  private resolveFromMap = computed<StatusChipMapEntry | undefined>(() => {
    const key = this._value();
    const map = this._map();
    if (key === undefined || key === null || !map) return undefined;
    return map[String(key)];
  });

  resolvedVariant = computed<StatusChipVariant>(() => {
    return this._variant() ?? this.resolveFromMap()?.variant ?? 'neutral';
  });

  resolvedLabel = computed<string>(() => {
    return (
      this._label() ??
      this.resolveFromMap()?.label ??
      (this._value() !== undefined && this._value() !== null ? String(this._value()) : '')
    );
  });

  resolvedIcon = computed<string | undefined>(() => {
    return this._icon() ?? this.resolveFromMap()?.icon;
  });
}
