import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, throwError } from 'rxjs';

import { HttpError } from '../http/http-error';
import { REQUEST_ID } from '../http/http-context';
import { NotificationService } from '../services/notification.service';

/**
 * Normalizes every HTTP failure to {@link HttpError} before reaching subscribers.
 *
 * Global toast notifications fire **only** for errors features cannot meaningfully
 * recover from in their own subscriber: network failures (`status === 0`) and 5xx.
 * 4xx errors propagate silently so features keep their own UX (inline form errors,
 * confirm dialogs, retry prompts, etc.).
 *
 * Auth (401 + token refresh) stays in `auth.interceptor.ts` — this interceptor must
 * run AFTER it so refreshed retries are not converted on the first attempt.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);
  const transloco = inject(TranslocoService);

  return next(req).pipe(
    catchError((raw: unknown) => {
      if (!(raw instanceof HttpErrorResponse)) {
        return throwError(() => raw);
      }
      const err = HttpError.from(raw);
      if (shouldAutoNotify(err)) {
        const id = req.context.get(REQUEST_ID);
        notify.error(buildGlobalMessage(transloco, err, id));
      }
      return throwError(() => err);
    }),
  );
};

function shouldAutoNotify(err: HttpError): boolean {
  return err.isNetwork || err.isServer;
}

function buildGlobalMessage(
  transloco: TranslocoService,
  err: HttpError,
  id: string | null,
): string {
  const key = err.isNetwork ? 'errors.network' : 'errors.server';
  const translated = transloco.translate(key);
  const message = translated && translated !== key ? translated : err.message;
  if (!id) {
    return message;
  }
  const refLabel = transloco.translate('errors.refPrefix');
  const label = refLabel && refLabel !== 'errors.refPrefix' ? refLabel : 'Ref:';
  return `${message} (${label} ${id.slice(0, 8)})`;
}
