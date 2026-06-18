import { Component, Inject, OnDestroy, signal } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface SessionTimeoutDialogData {
  secondsLeft: number;
  warningSeconds: number;
}

@Component({
  selector: 'app-session-timeout-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title class="d-flex align-center gap-1">
      <mat-icon class="session-icon">schedule</mat-icon>
      Sesión por expirar
    </h2>

    <mat-dialog-content>
      <p>
        Tu sesión expirará en <strong>{{ secondsLeft() }}</strong> segundos.
        ¿Deseas permanecer en el sitio?
      </p>
      <mat-progress-bar
        mode="determinate"
        [value]="progress()"
        aria-label="Tiempo restante de sesión"></mat-progress-bar>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Salir</button>
      <button mat-flat-button color="primary" (click)="dialogRef.close(true)">Permanecer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .session-icon { opacity: 0.9; }
    mat-dialog-content p { margin: 0 0 12px; }
  `],
})
export class SessionTimeoutDialogComponent implements OnDestroy {
  secondsLeft = signal(0);
  private intervalId: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<SessionTimeoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SessionTimeoutDialogData,
  ) {
    this.secondsLeft.set(Math.max(0, Math.floor(this.data.secondsLeft)));
    this.intervalId = window.setInterval(() => {
      const next = this.secondsLeft() - 1;
      this.secondsLeft.set(Math.max(0, next));
      if (next <= 0) {
        this.dialogRef.close(false);
      }
    }, 1000);
  }

  progress(): number {
    const total = Math.max(1, this.data.warningSeconds);
    const left = Math.min(total, Math.max(0, this.secondsLeft()));
    return (left / total) * 100;
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

