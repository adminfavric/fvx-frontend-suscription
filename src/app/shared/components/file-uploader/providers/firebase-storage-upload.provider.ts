import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import {
  FileUploadContext,
  FileUploadProgress,
  FileUploadProvider,
  FileUploadResult,
} from './file-upload-provider';

/**
 * Firebase Storage upload provider.
 *
 * **Requisitos previos** (solo si eliges este provider):
 *
 * 1. `npm install firebase`
 * 2. Inicializar Firebase en tu `app.config.ts` (o un initializer propio):
 *    ```ts
 *    import { initializeApp } from 'firebase/app';
 *    import { getStorage } from 'firebase/storage';
 *
 *    const firebaseApp = initializeApp(environment.firebase);
 *    const storage = getStorage(firebaseApp);
 *
 *    providers: [
 *      { provide: FIREBASE_STORAGE, useValue: storage },
 *      { provide: FILE_UPLOAD_PROVIDER, useClass: FirebaseStorageUploadProvider },
 *    ]
 *    ```
 * 3. En `environment.ts`:
 *    ```ts
 *    firebase: {
 *      apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId,
 *    },
 *    ```
 *
 * El provider usa `import()` dinámico, así que si **no** instalas Firebase y tampoco
 * lo provees, puedes seguir usando `SignedUrlUploadProvider` sin incluir este código
 * en el bundle final (tree-shaking por no importarlo).
 */
@Injectable({ providedIn: 'root' })
export class FirebaseStorageUploadProvider implements FileUploadProvider {
  /**
   * Referencia al `Storage` Firebase; puedes inyectarla con `inject(FIREBASE_STORAGE)`
   * o setearla manualmente tras instanciar el servicio. Se deja como `any` para evitar
   * un import estático y poder subir el código aunque `firebase` no esté instalado aún.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any = null;

  upload(
    file: File,
    context?: FileUploadContext,
    onProgress?: (p: FileUploadProgress) => void,
  ): Observable<FileUploadResult> {
    return from(this.uploadAsync(file, context, onProgress));
  }

  delete(path: string): Observable<void> {
    return from(this.deleteAsync(path));
  }

  private async uploadAsync(
    file: File,
    context: FileUploadContext | undefined,
    onProgress?: (p: FileUploadProgress) => void,
  ): Promise<FileUploadResult> {
    if (!this.storage) {
      throw new Error(
        'FirebaseStorageUploadProvider: `storage` no fue inyectado. ' +
        'Provee FIREBASE_STORAGE o asigna `this.storage` manualmente.',
      );
    }
    const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

    const filePath = joinPath(context?.pathPrefix, file.name);
    const storageRef = ref(this.storage, filePath);

    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: context?.metadata,
    });

    return new Promise<FileUploadResult>((resolve, reject) => {
      task.on(
        'state_changed',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (snap: any) => {
          const total = snap.totalBytes || file.size;
          const loaded = snap.bytesTransferred || 0;
          onProgress?.({
            progress: total ? loaded / total : 0,
            loaded,
            total,
            state: mapFirebaseState(snap.state),
          });
        },
        (err) => {
          onProgress?.({ progress: 0, state: 'error' });
          reject(err);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            onProgress?.({ progress: 1, loaded: file.size, total: file.size, state: 'success' });
            resolve({
              url,
              path: filePath,
              size: file.size,
              name: file.name,
              mimeType: file.type,
              meta: { fullPath: task.snapshot.ref.fullPath },
            });
          } catch (err) {
            reject(err);
          }
        },
      );
    });
  }

  private async deleteAsync(path: string): Promise<void> {
    if (!this.storage) throw new Error('FirebaseStorageUploadProvider: `storage` no inyectado.');
    const { ref, deleteObject } = await import('firebase/storage');
    await deleteObject(ref(this.storage, path));
  }
}

function joinPath(prefix: string | undefined, filename: string): string {
  const safe = filename.replace(/^\/+/, '');
  if (!prefix) return safe;
  return `${prefix.replace(/\/+$/, '')}/${safe}`;
}

function mapFirebaseState(state: string): FileUploadProgress['state'] {
  switch (state) {
    case 'running': return 'running';
    case 'paused': return 'paused';
    case 'canceled': return 'canceled';
    case 'error': return 'error';
    case 'success': return 'success';
    default: return 'running';
  }
}
