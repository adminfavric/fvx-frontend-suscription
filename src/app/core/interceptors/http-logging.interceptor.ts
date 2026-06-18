import {
  HttpInterceptorFn,
  HttpEventType,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { APP_CONFIG } from '../config/app-config.token';
import { REQUEST_ID } from '../http/http-context';

const TRUNCATE_LEN = 12_000;

// Nombres de campo cuyo VALOR no debe aparecer en consola (login password,
// tokens en respuestas, secrets de API key, etc.).
const SENSITIVE_KEY = /pass|token|secret|auth|api[_-]?key|credential|otp/i;

/** Devuelve una COPIA del valor con los campos sensibles redactados (deep).
 *  Nunca muta el original (es el body real de la request/response). */
function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redactSensitive(v);
    }
    return out;
  }
  return value;
}

function summarizeBody(body: unknown): unknown {
  if (body == null) {
    return null;
  }
  if (body instanceof FormData) {
    const keys: string[] = [];
    body.forEach((_, k) => keys.push(k));
    return `[FormData: ${keys.join(', ') || 'empty'}]`;
  }
  // Redactar claves sensibles en una copia antes de loguear (no tocar el body real).
  const safe = typeof body === 'string' ? body : redactSensitive(body);
  try {
    const s = typeof safe === 'string' ? safe : JSON.stringify(safe);
    if (s.length <= TRUNCATE_LEN) {
      return safe;
    }
    return `${s.slice(0, TRUNCATE_LEN)}…[truncated ${s.length} chars]`;
  } catch {
    return String(safe).slice(0, TRUNCATE_LEN);
  }
}

/**
 * Logs outgoing HTTP calls: method, full URL (with query string), payload,
 * and incoming response status + body (or error). Enable with `httpLogging` in `APP_CONFIG`.
 */
export const httpLoggingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!inject(APP_CONFIG).httpLogging) {
    return next(req);
  }

  const started = performance.now();
  const route = `${req.method} ${req.urlWithParams}`;
  const id = req.context.get(REQUEST_ID);
  const tag = id ? `[HTTP ${id.slice(0, 8)}]` : '[HTTP]';

  console.groupCollapsed(`${tag} → ${route}`);
  console.log('Payload:', summarizeBody(req.body));
  console.groupEnd();

  return next(req).pipe(
    tap({
      next: event => {
        if (event.type !== HttpEventType.Response) {
          return;
        }
        const res = event as HttpResponse<unknown>;
        const ms = Math.round(performance.now() - started);
        console.groupCollapsed(`${tag} ← ${res.status} ${route} (${ms}ms)`);
        console.log('Response:', summarizeBody(res.body));
        console.groupEnd();
      },
      error: err => {
        const ms = Math.round(performance.now() - started);
        console.groupCollapsed(`${tag} ✗ ${route} (${ms}ms)`);
        // NO loguear el `err` crudo: un HttpErrorResponse embebe `err.error` (el
        // body sin redactar) + url/headers, lo que anularía la redacción de
        // `summarizeBody` de abajo. Solo campos seguros; el body va redactado.
        console.log('Error:', err?.status, err?.statusText, err?.url ?? route);
        if (err?.error != null) {
          console.log('Error body:', summarizeBody(err.error));
        }
        console.groupEnd();
      },
    }),
  );
};
