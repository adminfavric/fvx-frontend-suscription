import { Component, Inject } from '@angular/core';

import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  color?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslocoPipe],
  template: `
    <h2 mat-dialog-title class="confirm-dialog__title">
      <!-- Chip semántico (spec): 36x36 con bg *-soft del estado + ícono sólido.
           Reemplaza el header oscuro/coloreado anterior — la jerarquía visual
           del peligro la da el chip + el botón Delete rojo, no el fondo. -->
      <span
        class="confirm-dialog__icon-chip"
        [class.confirm-dialog__icon-chip--danger]="data.color === 'warn'"
        [class.confirm-dialog__icon-chip--info]="data.color !== 'warn'"
      >
        <mat-icon class="confirm-dialog__icon">
          {{ data.color === 'warn' ? 'warning' : 'help_outline' }}
        </mat-icon>
      </span>
      <span class="confirm-dialog__label">{{ data.title }}</span>
    </h2>
    <mat-dialog-content class="confirm-dialog__content">
      <p class="confirm-dialog__message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="confirm-dialog__actions">
      <button mat-button (click)="dialogRef.close(false)">
        {{ data.cancelText || ('entityDialog.cancel' | transloco) }}
      </button>
      <button mat-flat-button [color]="data.color || 'primary'" (click)="dialogRef.close(true)">
        {{ data.confirmText || ('crud.confirm.confirm' | transloco) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .confirm-dialog__title {
      display: flex !important;
      align-items: center;
      gap: 12px;
    }
    /* Icon-chip semántico (spec): 36x36, radio 9, bg *-soft + ícono sólido. */
    .confirm-dialog__icon-chip {
      flex: 0 0 auto;
      width: 36px;
      height: 36px;
      border-radius: var(--fvx-radius, 9px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .confirm-dialog__icon-chip--danger {
      background: var(--fvx-chip-danger-bg, #fbe3e3);
      color: var(--fvx-chip-danger-fg, #d64545);
    }
    .confirm-dialog__icon-chip--info {
      background: var(--fvx-accent-soft, var(--fvx-chip-info-bg, #e7e9fb));
      color: var(--fvx-link, var(--fvx-chip-info-fg, #4f5bd5));
    }
    .confirm-dialog__icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      line-height: 20px;
      color: inherit;
    }
    .confirm-dialog__label {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .confirm-dialog__message {
      margin: 0;
    }
  `],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}
}
