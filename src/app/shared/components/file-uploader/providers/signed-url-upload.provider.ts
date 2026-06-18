import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { APP_CONFIG } from '../../../../core/config/app-config.token';
import {
  FileUploadContext,
  FileUploadProgress,
  FileUploadProvider,
  FileUploadResult,
} from './file-upload-provider';

export interface SignedUrlRequestBody {
  filename: string;
  mime_type: string;
  size: number;
  path_prefix?: string;
  metadata?: Record<string, string>;
}

export interface SignedUrlResponse {
  /** URL a la que el front hace `PUT` con el binario. */
  upload_url: string;
  /** Headers que deben acompañar al PUT (firma, content-type, etc.). */
  upload_headers?: Record<string, string>;
  /** Path lógico dentro del bucket. */
  storage_path: string;
  /** URL para mostrar el archivo (puede ser pública o firmada GET). */
  public_url: string;
  /** Metadata adicional que el backend quiera devolver (ej. `file_id`). */
  meta?: Record<string, unknown>;
}

/**
 * Provider agnóstico a GCS / S3 / Django storage:
 *
 * 1. `POST {apiUrl}/uploads/signed-url/` → backend devuelve `upload_url` + `public_url`.
 * 2. El front hace `PUT upload_url` con el archivo y `upload_headers`.
 * 3. Resolvemos con `public_url`.
 *
 * El endpoint por defecto es `/uploads/signed-url/` (`APP_CONFIG.apiUrl`).
 * Puedes sobreescribir con `override` en la provisión si quieres otra ruta.
 *
 * ```ts
 * { provide: FILE_UPLOAD_PROVIDER, useClass: SignedUrlUploadProvider }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class SignedUrlUploadProvider implements FileUploadProvider {
  private http = inject(HttpClient);

  /** Endpoint para pedir la signed URL. Sobreescribir mediante subclase si hace falta. */
  protected signedUrlEndpoint = `${inject(APP_CONFIG).apiUrl}/uploads/signed-url/`;

  upload(
    file: File,
    context?: FileUploadContext,
    onProgress?: (p: FileUploadProgress) => void,
  ): Observable<FileUploadResult> {
    const body: SignedUrlRequestBody = {
      filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      size: file.size,
      path_prefix: context?.pathPrefix,
      metadata: context?.metadata,
    };

    return this.http.post<SignedUrlResponse>(this.signedUrlEndpoint, body).pipe(
      switchMap((signed) => this.putBinary(file, signed, onProgress)),
    );
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(
      `${this.signedUrlEndpoint}?path=${encodeURIComponent(path)}`,
    );
  }

  private putBinary(
    file: File,
    signed: SignedUrlResponse,
    onProgress?: (p: FileUploadProgress) => void,
  ): Observable<FileUploadResult> {
    return new Observable<FileUploadResult>((observer) => {
      const req = new HttpRequest('PUT', signed.upload_url, file, {
        reportProgress: true,
        headers: buildHeaders(signed.upload_headers, file.type || 'application/octet-stream'),
      });

      const sub = this.http.request(req).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total ?? file.size;
            const loaded = event.loaded;
            onProgress?.({
              progress: total ? loaded / total : 0,
              loaded,
              total,
              state: 'running',
            });
          } else if (event.type === HttpEventType.Response) {
            onProgress?.({ progress: 1, loaded: file.size, total: file.size, state: 'success' });
            observer.next({
              url: signed.public_url,
              path: signed.storage_path,
              size: file.size,
              name: file.name,
              mimeType: file.type,
              meta: signed.meta,
            });
            observer.complete();
          }
        },
        error: (err) => {
          onProgress?.({ progress: 0, state: 'error' });
          observer.error(err);
        },
      });

      return () => sub.unsubscribe();
    });
  }
}

function buildHeaders(
  headers: Record<string, string> | undefined,
  fallbackContentType: string,
): HttpHeaders {
  let h = new HttpHeaders({ 'Content-Type': fallbackContentType });
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      h = h.set(k, v);
    }
  }
  return h;
}
