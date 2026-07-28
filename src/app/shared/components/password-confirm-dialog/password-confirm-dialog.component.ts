import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface PasswordConfirmData {
  title: string;
  message: string;
  confirmText?: string;
  /** Ejecuta la acción con la contraseña ingresada. Debe lanzar (throw) en error
   * — el diálogo muestra el mensaje inline y se mantiene abierto para reintentar. */
  action: (password: string) => Promise<void>;
}

/** Diálogo que confirma una acción sensible pidiendo la contraseña del admin.
 * Ejecuta la acción internamente: si falla (p. ej. 403 contraseña incorrecta),
 * muestra el error inline y NO se cierra; al lograrlo, cierra devolviendo true. */
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
               autocomplete="current-password" [disabled]="loading()"
               (input)="error.set('')" (keydown.enter)="confirm()" />
      </label>
      @if (error()) {
        <p class="err"><mat-icon>error</mat-icon> {{ error() }}</p>
      }
      <div class="actions">
        <button type="button" class="btn btn--ghost" [disabled]="loading()" (click)="ref.close()">Cancelar</button>
        <button type="button" class="btn btn--danger" [disabled]="!password.trim() || loading()" (click)="confirm()">
          {{ loading() ? 'Procesando…' : (data.confirmText || 'Confirmar') }}
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
    .fld input:disabled { opacity:.6; }
    .err { display:flex; align-items:center; gap:6px; margin:12px 0 0; color:#c0392b; font-size:.86rem; font-weight:600; }
    .err mat-icon { font-size:18px; width:18px; height:18px; }
    .actions { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; }
    .btn { border:none; border-radius:999px; padding:10px 18px; font-size:.9rem; font-weight:700; cursor:pointer; }
    .btn:disabled { opacity:.55; cursor:default; }
    .btn--ghost { background:#f1eef6; color:#5b3a8a; }
    .btn--danger { background:#c0392b; color:#fff; }
  `],
})
export class PasswordConfirmDialogComponent {
  password = '';
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(
    public ref: MatDialogRef<PasswordConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PasswordConfirmData,
  ) {}

  async confirm(): Promise<void> {
    const pw = this.password.trim();
    if (!pw || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.data.action(pw);
      this.ref.close(true);
    } catch (e: any) {
      const detail = e?.error?.detail;
      this.error.set(
        e?.status === 403
          ? (detail || 'Contraseña incorrecta.')
          : (detail || 'No se pudo completar la acción. Inténtalo de nuevo.'),
      );
      this.loading.set(false);
    }
  }
}
