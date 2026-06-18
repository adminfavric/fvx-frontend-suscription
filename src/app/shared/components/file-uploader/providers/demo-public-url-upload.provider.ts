import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

import type {
  FileUploadContext,
  FileUploadProgress,
  FileUploadProvider,
  FileUploadResult,
} from './file-upload-provider';

/**
 * Simula subida y devuelve una **URL https pública** (picsum) para poder
 * guardarla en campos tipo ``URLField`` del backend sin usar ``blob:``.
 *
 * Uso típico: ``providers`` del ``ProfileEditorComponent`` hasta que exista
 * Firebase / signed URL en ``app.config`` o en la ruta.
 */
@Injectable()
export class DemoPublicUrlUploadProvider implements FileUploadProvider {
  upload(
    file: File,
    _context?: FileUploadContext,
    onProgress?: (p: FileUploadProgress) => void,
  ): Observable<FileUploadResult> {
    return new Observable((sub: Subscriber<FileUploadResult>) => {
      const total = Math.max(file.size, 1024);
      let loaded = 0;
      const step = Math.max(total / 12, 256);
      const id = setInterval(() => {
        loaded = Math.min(loaded + step, total);
        const progress = loaded / total;
        onProgress?.({ progress, loaded, total, state: 'running' });
        if (loaded >= total) {
          clearInterval(id);
          const seed = `${file.name}-${file.size}`;
          let h = 0;
          for (let i = 0; i < seed.length; i++) {
            h = (h << 5) - h + seed.charCodeAt(i);
            h |= 0;
          }
          const url = `https://picsum.photos/seed/fvx${Math.abs(h)}/400/400`;
          onProgress?.({ progress: 1, loaded: total, total, state: 'success' });
          sub.next({
            url,
            path: `demo/avatars/${file.name}`,
            size: file.size,
            name: file.name,
            mimeType: file.type,
          });
          sub.complete();
        }
      }, 55);
      return () => clearInterval(id);
    });
  }
}
