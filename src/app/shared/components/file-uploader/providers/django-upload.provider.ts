import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app-config.token';
import {
  FileUploadContext,
  FileUploadProgress,
  FileUploadProvider,
  FileUploadResult,
} from './file-upload-provider';

interface UploadResponseBody {
  url: string;
  path: string;
  size: number;
  name: string;
  mime_type?: string;
  meta?: Record<string, unknown>;
}

/**
 * Provider por defecto del template. Sube el archivo al endpoint Django
 * (`POST {apiUrl}/uploads/`) como `multipart/form-data`. El servidor delega en
 * `default_storage` y guarda en local FS, S3-compatible o GCS según
 * `STORAGE_BACKEND` (ver `fvx-backend/docs/storage.md`).
 *
 * Pros frente a `SignedUrlUploadProvider`:
 * - Sin CORS del bucket que configurar (mismo dominio que la API).
 * - Cambiar de proveedor = una env var en backend; el front no se entera.
 *
 * Contras:
 * - El binario pasa por gunicorn. Para archivos > ~100 MB conviene subir
 *   `client_max_body_size` en nginx y `--timeout` en gunicorn, o migrar a
 *   `SignedUrlUploadProvider` (uploads directos a bucket).
 *
 * ```ts
 * { provide: FILE_UPLOAD_PROVIDER, useClass: DjangoUploadProvider }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class DjangoUploadProvider implements FileUploadProvider {
  private http = inject(HttpClient);
  protected uploadEndpoint = `${inject(APP_CONFIG).apiUrl}/uploads/`;
  protected deleteEndpoint = `${inject(APP_CONFIG).apiUrl}/uploads/object/`;

  upload(
    file: File,
    context?: FileUploadContext,
    onProgress?: (p: FileUploadProgress) => void,
  ): Observable<FileUploadResult> {
    const form = new FormData();
    form.append('file', file);
    if (context?.pathPrefix) {
      form.append('path_prefix', context.pathPrefix);
    }
    if (context?.metadata && Object.keys(context.metadata).length > 0) {
      // `form-data` no anida bien objetos: el backend lo deserializa con json.loads.
      form.append('metadata', JSON.stringify(context.metadata));
    }

    return this.http
      .post<UploadResponseBody>(this.uploadEndpoint, form, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        filter(
          (event) =>
            event.type === HttpEventType.UploadProgress ||
            event.type === HttpEventType.Response,
        ),
        map((event): FileUploadResult | null => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total ?? file.size;
            const loaded = event.loaded;
            onProgress?.({
              progress: total ? loaded / total : 0,
              loaded,
              total,
              state: 'running',
            });
            return null;
          }
          const body = (event as HttpResponse<UploadResponseBody>).body;
          if (!body) {
            throw new Error('Upload response had no body.');
          }
          onProgress?.({
            progress: 1,
            loaded: file.size,
            total: file.size,
            state: 'success',
          });
          return {
            url: body.url,
            path: body.path,
            size: body.size,
            name: body.name,
            mimeType: body.mime_type,
            meta: body.meta,
          };
        }),
        filter((result): result is FileUploadResult => result !== null),
      );
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(
      `${this.deleteEndpoint}?path=${encodeURIComponent(path)}`,
    );
  }
}
