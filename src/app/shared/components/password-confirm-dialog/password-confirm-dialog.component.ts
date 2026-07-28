import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface PasswordConfirmData {
  title: string;
  message: string;
  confirmText?: string;
}

/** Diálogo que confirma una acción sensible pidiendo la contraseña del admin.
 * Devuelve la contraseña ingresada al cerrar (o undefined si se cancela). */
@Component({
  selector: 'app-password-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatIconModule],
  template: `
    <div class="pcd">
      <h2><mat-icon>lock</mat-icon> {{ data.title }}</h2>
      <p class="msg">{{ data.message }}</p>
      <label class="fld">
        <span>Confirma con tu contraseña de administrador</span>
        <input type="password" [(ngModel)]="password" placeholder="Tu contraseña"
               autocomplete="current-password" (keydown.enter)="confirm()" />
      </label>
      <div class="actions">
        <button type="button" class="btn btn--ghost" (click)="ref.close()">Cancelar</button>
        <button type="button" class="btn btn--danger" [disabled]="!password.trim()" (click)="confirm()">
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pcd { padding:22px 24px; max-width:420px; }
    .pcd h2 { display:flex; align-items:center; gap:8px; margin:0 0 8px; font-size:1.2rem; color:#2a2333; }
    .pcd h2 mat-icon { color:#c0392b; }
    .msg { margin:0 0 16px; color:#6b6478; font-size:.92rem; line-height:1.5; }
    .fld { display:flex; flex-direction:column; gap:6px; }
    .fld span { font-size:.82rem; color:#6b6478; font-weight:600; }
    .fld input { border:1px solid #d9d3e4; border-radius:9px; padding:10px 12px; font-size:.95rem; }
    .actions { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; }
    .btn { border:none; border-radius:999px; padding:10px 18px; font-size:.9rem; font-weight:700; cursor:pointer; }
    .btn:disabled { opacity:.55; cursor:default; }
    .btn--ghost { background:#f1eef6; color:#5b3a8a; }
    .btn--danger { background:#c0392b; color:#fff; }
  `],
})
export class PasswordConfirmDialogComponent {
  password = '';
  constructor(
    public ref: MatDialogRef<PasswordConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PasswordConfirmData,
  ) {}

  confirm(): void {
    const pw = this.password.trim();
    if (pw) this.ref.close(pw);
  }
}
