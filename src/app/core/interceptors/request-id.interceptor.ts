import { HttpInterceptorFn } from '@angular/common/http';

import { REQUEST_ID } from '../http/http-context';

const HEADER = 'X-Request-Id';

/**
 * Tags every outgoing HTTP request with a fresh `X-Request-Id` (UUID v4) and
 * stores it on the request context so other interceptors and the failing
 * subscriber can correlate front/back logs and quote the id to support.
 *
 * Place this interceptor BEFORE auth / logging so they share the same id; the
 * `errorInterceptor` reads it via the shared `HttpContext` (mutating
 * `req.context` is visible to every clone of the request, including the
 * upstream interceptor's original reference).
 */
export const requestIdInterceptor: HttpInterceptorFn = (req, next) => {
  const id = generateRequestId();
  req.context.set(REQUEST_ID, id);
  return next(req.clone({ setHeaders: { [HEADER]: id } }));
};

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback; Math.random is not cryptographically strong but the
  // id is for correlation only, not authentication.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
