import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, filter, take, throwError } from 'rxjs';
import { APP_CONFIG } from '../config/app-config.token';
import { AuthService } from '../services/auth.service';

/** Rutas de login (JWT, social, logout) que no deben disparar refresh en 401. */
function isUnauthenticatedAuthPath(url: string): boolean {
  return (
    url.includes('/auth/token') ||
    url.includes('/auth/social/') ||
    url.includes('/auth/logout')
  );
}

/** Añade `Authorization: Bearer <access>` a requests de NUESTRA API si hay token. */
function withBearer(
  req: HttpRequest<unknown>,
  auth: AuthService,
  apiUrl: string,
  authUrl: string,
): HttpRequest<unknown> {
  const isOwnApi = req.url.startsWith(apiUrl) || req.url.startsWith(authUrl);
  const token = auth.accessToken;
  if (!isOwnApi || !token) {
    return req;
  }
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * authInterceptor — versión token Bearer (localStorage).
 *
 * Adjunta `Authorization: Bearer <access>` a las requests de nuestra API y
 * maneja el **refresh + retry**: ante 401, llama a `/api/auth/token/refresh/`
 * (mandando el refresh guardado), reintenta la request original **con el token
 * nuevo** y propaga el resultado. Si el refresh también falla, `AuthService`
 * redirige al login.
 *
 * Se encola correctamente cuando llegan varias 401 en paralelo (típico al
 * cargar el dashboard que dispara N requests): solo el primero llama a
 * refresh, los demás esperan en `refreshTokenSubject`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const config = inject(APP_CONFIG);
  const authReq = withBearer(req, auth, config.apiUrl, config.authUrl);

  // En endpoints de auth dejamos pasar sin retry (un 401 en login = credenciales malas).
  if (isUnauthenticatedAuthPath(req.url)) {
    return next(authReq);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handleTokenRefresh(auth, req, next, config.apiUrl, config.authUrl);
      }
      return throwError(() => error);
    }),
  );
};

function handleTokenRefresh(
  auth: AuthService,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  apiUrl: string,
  authUrl: string,
) {
  if (!auth.isRefreshing) {
    auth.setRefreshing(true);
    auth.refreshTokenSubject.next(null);

    return auth.refreshToken().pipe(
      switchMap(ok => {
        auth.setRefreshing(false);
        auth.refreshTokenSubject.next(ok);
        if (!ok) {
          // refreshToken() ya navegó a /login; propagamos error original.
          return throwError(() => new HttpErrorResponse({ status: 401 }));
        }
        // Token nuevo guardado → reintentamos la request con el Bearer fresco.
        return next(withBearer(req, auth, apiUrl, authUrl));
      }),
      catchError(err => {
        auth.setRefreshing(false);
        return throwError(() => err);
      }),
    );
  }

  // Hay refresh en curso: encolar hasta que termine.
  return auth.refreshTokenSubject.pipe(
    filter(value => value !== null),
    take(1),
    switchMap(ok => {
      if (!ok) return throwError(() => new HttpErrorResponse({ status: 401 }));
      return next(withBearer(req, auth, apiUrl, authUrl));
    }),
  );
}
