import { HttpContextToken } from '@angular/common/http';

/**
 * Per-request correlation id (UUID v4). Set by `requestIdInterceptor` and read
 * by other interceptors (error notifications, HTTP logging) and by features
 * that want to surface it for support / debugging.
 *
 * `HttpContext` is shared across clones of the same request, so an interceptor
 * sitting *before* `requestIdInterceptor` in the response chain can still read
 * the id after the request fires.
 */
export const REQUEST_ID = new HttpContextToken<string | null>(() => null);
