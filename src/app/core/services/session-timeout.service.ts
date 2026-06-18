import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter, take } from 'rxjs';

import { AuthService } from './auth.service';
import { SessionTimeoutDialogComponent } from '../components/session-timeout-dialog/session-timeout-dialog.component';

@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  /** Segundos antes de `exp` en los que se intenta un refresh **silencioso** (sin diálogo). */
  private readonly proactiveSeconds = 60;
  /** Segundos antes de `exp` en los que, si el refresh proactivo falló, se abre el diálogo de aviso. */
  private readonly warningSeconds = 30;
  private readonly pollMs = 1000;

  private started = false;
  private intervalId: number | null = null;
  private dialogOpen = false;
  /** Marca temporal del exp para el que ya intentamos refresh proactivo (evita reintentar en bucle si falla). */
  private proactiveTriedForExp: number | null = null;
  private refreshing = false;

  init(): void {
    if (this.started) return;
    this.started = true;

    this.intervalId = window.setInterval(() => this.tick(), this.pollMs);
    this.tick();
  }

  private tick(): void {
    // Token Bearer en localStorage: la expiración sale del propio access token
    // (decodificado en AuthService), no de una cookie.
    const expMs = this.readAccessExpMs();
    if (!expMs) return;

    const msLeft = expMs - Date.now();
    const secondsLeft = Math.floor(msLeft / 1000);

    if (secondsLeft <= 0) {
      if (!this.dialogOpen) this.auth.logout();
      return;
    }

    // ── 1. Refresh proactivo silencioso (60s..30s antes de exp) ────────────────
    // No abre diálogo. Si falla, dejamos que el flujo "warning" haga su trabajo
    // cuando lleguemos a `warningSeconds`.
    if (
      secondsLeft <= this.proactiveSeconds &&
      secondsLeft > this.warningSeconds &&
      !this.refreshing &&
      !this.dialogOpen &&
      this.proactiveTriedForExp !== expMs &&
      this.auth.isAuthenticated()
    ) {
      this.proactiveTriedForExp = expMs;
      this.refreshing = true;
      this.auth
        .refreshToken()
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.refreshing = false;
            // El próximo tick lee el exp nuevo de la cookie y resetea el ciclo.
          },
          error: () => {
            this.refreshing = false;
            // Silencioso: si falla, se abrirá el diálogo cuando secondsLeft <= warningSeconds.
          },
        });
      return;
    }

    // ── 2. Diálogo de aviso (último cartucho antes de logout) ─────────────────
    if (secondsLeft <= this.warningSeconds && !this.dialogOpen) {
      if (!this.auth.isAuthenticated()) return;
      this.openWarning(secondsLeft);
    }
  }

  /** Expiración del access token (ms), o null si no hay sesión. */
  private readAccessExpMs(): number | null {
    return this.auth.accessTokenExpMs();
  }

  private openWarning(secondsLeft: number): void {
    this.dialogOpen = true;

    const ref = this.dialog.open(SessionTimeoutDialogComponent, {
      width: '420px',
      disableClose: true,
      data: { secondsLeft, warningSeconds: this.warningSeconds },
    });

    ref
      .afterClosed()
      .pipe(
        take(1),
        filter(result => result === true || result === false),
      )
      .subscribe({
        next: keepAlive => {
          this.dialogOpen = false;
          if (keepAlive) {
            this.auth.refreshToken().pipe(take(1)).subscribe({
              // tokens get stored by AuthService
              next: () => {},
              error: () => {},
            });
          } else {
            this.auth.logout();
          }
        },
        error: () => {
          this.dialogOpen = false;
        },
      });
  }

}

