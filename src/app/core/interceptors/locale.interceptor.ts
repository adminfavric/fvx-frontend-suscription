import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { APP_CONFIG } from '../config/app-config.token';

/**
 * Sends `Accept-Language` on API calls so Django resolves gettext / role labels.
 */
export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  const transloco = inject(TranslocoService);
  const config = inject(APP_CONFIG);
  const lang = transloco.getActiveLang() || 'en';
  if (!req.url.startsWith(config.apiUrl) && !req.url.startsWith(config.authUrl)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};
