import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/** Resultado emitido por el provider al terminar la subida. */
export interface FileUploadResult {
  /** URL pública / firmada para mostrar/descargar el archivo. */
  url: string;
  /** Path lógico en el storage (ej. `uploads/2026/04/foo.pdf`). Puede venir vacío. */
  path?: string;
  /** Tamaño en bytes (si el provider lo conoce). */
  size?: number;
  /** Nombre original. */
  name?: string;
  /** MIME. */
  mimeType?: string;
  /** Payload adicional (metadata del backend, downloadToken, etc.). */
  meta?: Record<string, unknown>;
}

/** Evento de progreso durante la subida. */
export interface FileUploadProgress {
  /** 0..1. */
  progress: number;
  /** Bytes subidos. */
  loaded?: number;
  /** Total de bytes (si se conoce). */
  total?: number;
  /** Estado legible (implementación-dependiente). */
  state?: 'running' | 'paused' | 'canceled' | 'error' | 'success';
}

/** Contexto opcional para organizar archivos (p. ej. `users/{id}/avatar`). */
export interface FileUploadContext {
  /** Path/folder base relativo dentro del bucket. */
  pathPrefix?: string;
  /** Metadata custom (Firebase: `customMetadata`; backend: puede ignorar). */
  metadata?: Record<string, string>;
}

/**
 * Contrato genérico para subir archivos. El componente `app-file-uploader`
 * delega en esta interfaz, así las features solo dependen del token
 * `FILE_UPLOAD_PROVIDER` y no de Firebase/GCS directamente.
 */
export interface FileUploadProvider {
  /**
   * Sube un archivo. Debe emitir progreso (0..1) y terminar con `next(FileUploadResult)`
   * **antes** de completar para que el componente obtenga la URL.
   */
  upload(
    file: File,
    context?: FileUploadContext,
    onProgress?: (p: FileUploadProgress) => void,
  ): Observable<FileUploadResult>;

  /** Opcional: borrar archivo subido (por path) para la acción "Remove". */
  delete?(path: string): Observable<void>;
}

/**
 * Inyectar con `inject(FILE_UPLOAD_PROVIDER)`. Provee en `app.config.ts`:
 *
 * ```ts
 * { provide: FILE_UPLOAD_PROVIDER, useClass: FirebaseStorageUploadProvider }
 * // o
 * { provide: FILE_UPLOAD_PROVIDER, useClass: SignedUrlUploadProvider }
 * ```
 */
export const FILE_UPLOAD_PROVIDER = new InjectionToken<FileUploadProvider>('FILE_UPLOAD_PROVIDER');
