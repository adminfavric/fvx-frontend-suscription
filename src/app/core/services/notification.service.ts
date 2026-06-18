import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';

import { HttpError, isHttpError } from '../http/http-error';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  success(message: string): void {
    this.snackBar.open(message, this.closeLabel(), {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  error(message: string): void {
    this.snackBar.open(message, this.closeLabel(), {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  info(message: string): void {
    this.snackBar.open(message, this.closeLabel(), {
      duration: 3000,
      panelClass: ['info-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  /**
   * Notificación intermedia (ámbar): sesión por expirar, operación lenta, etc.
   * Más visible que `info` sin la urgencia de `error`. Duración 5s.
   */
  warn(message: string): void {
    this.snackBar.open(message, this.closeLabel(), {
      duration: 5000,
      panelClass: ['warning-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  /**
   * Surfaces a user-friendly error toast.
   *
   * Accepts a normalized {@link HttpError} (produced by `errorInterceptor`), a raw
   * `HttpErrorResponse` (legacy callers / non-HTTP code paths), or any other value.
   * Network and 5xx errors are already auto-notified by the interceptor — calling
   * this in a subscriber after that is harmless but redundant.
   */
  handleError(error: unknown): void {
    if (isHttpError(error)) {
      this.error(error.message);
      return;
    }
    if (error instanceof HttpErrorResponse) {
      this.error(HttpError.from(error).message);
      return;
    }
    this.error(this.translateOrFallback('errors.unexpected', 'An unexpected error occurred'));
  }

  private closeLabel(): string {
    return this.translateOrFallback('common.close', 'Close');
  }

  private translateOrFallback(key: string, fallback: string): string {
    const translated = this.transloco.translate(key);
    return translated && translated !== key ? translated : fallback;
  }
}
