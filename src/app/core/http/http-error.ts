import { HttpErrorResponse } from '@angular/common/http';

export type HttpErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'conflict'
  | 'server'
  | 'unknown';

export type FieldErrors = Record<string, string[]>;

/**
 * Normalized error surfaced to features. Wraps a raw `HttpErrorResponse`
 * and extracts a stable shape (status, message, kind, field errors) so
 * callers don't need to re-parse DRF / Django bodies in every subscriber.
 */
export class HttpError {
  constructor(
    readonly status: number,
    readonly kind: HttpErrorKind,
    readonly message: string,
    readonly fieldErrors: FieldErrors,
    readonly code: string | null,
    readonly raw: HttpErrorResponse,
  ) {}

  get isNetwork(): boolean { return this.kind === 'network'; }
  get isAuth(): boolean { return this.kind === 'unauthorized'; }
  get isForbidden(): boolean { return this.kind === 'forbidden'; }
  get isNotFound(): boolean { return this.kind === 'not-found'; }
  get isValidation(): boolean { return this.kind === 'validation'; }
  get isServer(): boolean { return this.kind === 'server'; }

  static from(raw: HttpErrorResponse): HttpError {
    const status = raw.status ?? 0;
    const kind = resolveKind(status);
    const { message, fieldErrors, code } = extractBody(raw, kind);
    return new HttpError(status, kind, message, fieldErrors, code, raw);
  }
}

function resolveKind(status: number): HttpErrorKind {
  if (status === 0) return 'network';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status >= 400 && status < 500) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

function extractBody(
  raw: HttpErrorResponse,
  kind: HttpErrorKind,
): { message: string; fieldErrors: FieldErrors; code: string | null } {
  const body = raw.error;
  const fieldErrors: FieldErrors = {};
  let message = '';
  let code: string | null = null;

  if (typeof body === 'string' && body.trim().length > 0) {
    message = body;
  } else if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') {
      message = body.detail;
    }
    if (typeof body.code === 'string') {
      code = body.code;
    }
    for (const [key, value] of Object.entries(body)) {
      if (key === 'detail' || key === 'code') continue;
      if (Array.isArray(value)) {
        fieldErrors[key] = value.map(String);
      } else if (typeof value === 'string') {
        fieldErrors[key] = [value];
      }
    }
    if (!message) {
      const firstField = Object.values(fieldErrors)[0];
      if (firstField && firstField.length > 0) {
        message = firstField[0];
      }
    }
  }

  if (!message) {
    message = fallbackMessage(kind, raw);
  }

  return { message, fieldErrors, code };
}

function fallbackMessage(kind: HttpErrorKind, raw: HttpErrorResponse): string {
  switch (kind) {
    case 'network':      return 'Could not connect to server.';
    case 'unauthorized': return 'Your session has expired.';
    case 'forbidden':    return 'You do not have permission for this action.';
    case 'not-found':    return 'Resource not found.';
    case 'conflict':     return 'Conflict with current resource state.';
    case 'server':       return 'Server error. Please try again later.';
    default:             return raw.message || 'An unexpected error occurred.';
  }
}

export function isHttpError(value: unknown): value is HttpError {
  return value instanceof HttpError;
}
