import { HttpInterceptorFn } from '@angular/common/http';

import { APP_CONFIG } from '../config/app-config.token';
import { inject } from '@angular/core';

/**
 * credentialsInterceptor — agrega `withCredentials: true` a las requests
 * que van al backend, para que el browser envíe las cookies HttpOnly de
 * autenticación (`fvx_access`, `fvx_refresh`).
 *
 * Solo aplica a requests al `apiUrl`/`authUrl` configurado, NO a recursos
 * externos (Google GSI client, fonts, etc.) — ahí no se envían cookies y
 * encima genera errores de CORS innecesarios.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(APP_CONFIG);
  const isOwnApi = req.url.startsWith(config.apiUrl) || req.url.startsWith(config.authUrl);
  if (!isOwnApi || req.withCredentials) {
    return next(req);
  }
  return next(req.clone({ withCredentials: true }));
};
