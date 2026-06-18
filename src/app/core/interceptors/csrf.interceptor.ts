import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { APP_CONFIG } from '../config/app-config.token';

/**
 * csrfInterceptor — defensa CSRF para la autenticación por cookie.
 *
 * Con el JWT en cookies HttpOnly, el browser adjunta la credencial sola en
 * cada request → un sitio tercero podría forjar POST/PATCH/DELETE. El backend
 * (`JWTCookieAuthentication`) exige, en requests autenticadas POR COOKIE, un
 * header `X-CSRFToken` que coincida con la cookie `csrftoken` (double-submit;
 * el patrón nativo de Django). Un atacante cross-site puede hacer que la cookie
 * viaje, pero NO puede leer su valor para copiarlo al header.
 *
 * Angular trae `withXsrfConfiguration`, pero su interceptor solo adjunta el
 * header en requests **same-origin** — en dev el SPA (:4200) y la API (:8080)
 * son orígenes distintos, así que no serviría. Este interceptor lo adjunta a
 * toda request mutante dirigida a NUESTRA API/auth (mismo criterio de scope
 * que `credentialsInterceptor`), funcionando en dev cross-port, prod
 * mismo-origen y despliegues cross-domain por igual.
 */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE = 'csrftoken';
const CSRF_HEADER = 'X-CSRFToken';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next(req);
  }
  const config = inject(APP_CONFIG);
  const isOwnApi = req.url.startsWith(config.apiUrl) || req.url.startsWith(config.authUrl);
  if (!isOwnApi) {
    return next(req);
  }
  const token = readCookie(CSRF_COOKIE);
  if (!token || req.headers.has(CSRF_HEADER)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { [CSRF_HEADER]: token } }));
};
