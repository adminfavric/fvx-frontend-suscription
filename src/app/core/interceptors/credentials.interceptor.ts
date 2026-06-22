import { HttpInterceptorFn } from '@angular/common/http';

/**
 * credentialsInterceptor — NO envía cookies al backend (auth por Bearer).
 *
 * El admin se sirve desde `experienciaslitadonoso.com` y la API desde
 * `*.favric.cl`: dominios raíz DISTINTOS. La auth por cookie HttpOnly no funciona
 * cross-domain — el navegador no puede leer la cookie `csrftoken` de otro dominio
 * para satisfacer el double-submit CSRF, y toda escritura (PATCH/POST/DELETE)
 * terminaba en 403.
 *
 * Solución: usar el token Bearer que ya guarda `AuthService` en localStorage y
 * adjunta `authInterceptor`. Al NO mandar la cookie `fvx_access`, el backend cae
 * al camino por header `Authorization: Bearer` (ver `JWTCookieAuthentication`),
 * que NO exige CSRF. El header custom es de por sí a prueba de CSRF: un sitio
 * malicioso no puede setearlo sin pasar el preflight CORS que controla la API.
 *
 * Si algún día el admin se sirve desde un subdominio de `favric.cl` (same-site
 * con la API), se puede volver a `withCredentials: true` para recuperar la
 * cookie HttpOnly y su protección anti-XSS.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => next(req);
