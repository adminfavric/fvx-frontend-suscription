import { Component, DestroyRef, Inject, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { JsonViewerComponent } from '../json-viewer/json-viewer.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

export type FileViewerKind =
  | 'image'
  | 'pdf'
  | 'video'
  | 'audio'
  | 'json'
  | 'text'
  | 'office'
  | 'other';

export interface FileViewerDialogConfig {
  /** URL accesible (signed URL, pública, o endpoint autenticado si el browser puede). */
  url: string;
  /** Nombre mostrado + usado para inferir kind si `mimeType` no viene. */
  filename?: string;
  /** MIME; si lo conoces, mejor (extension-less URLs → kind = 'other'). */
  mimeType?: string;
  /** Forzar un kind concreto si la detección falla. */
  kind?: FileViewerKind;
  /** Mostrar botón "Download". Default `true`. */
  downloadable?: boolean;
  /** Mostrar botón "Open in new tab". Default `true`. */
  openInNewTab?: boolean;
  /** Para `office` (docx/xlsx/pptx) se usa el viewer público de Google Docs.
   *  Solo funciona si la URL es públicamente accesible; lo puedes desactivar aquí. */
  allowGoogleDocsViewer?: boolean;
}

const EXT_TO_KIND: Record<string, FileViewerKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image',
  svg: 'image', bmp: 'image', avif: 'image',
  pdf: 'pdf',
  mp4: 'video', webm: 'video', mov: 'video', ogv: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio',
  json: 'json',
  txt: 'text', log: 'text', md: 'text', csv: 'text', yml: 'text', yaml: 'text',
  doc: 'office', docx: 'office', xls: 'office', xlsx: 'office', ppt: 'office', pptx: 'office',
};

/**
 * Popup que muestra un archivo remoto según su MIME/extensión.
 *
 * ```ts
 * FileViewerDialogComponent.openWith(this.dialog, {
 *   url: 'https://bucket.example.com/doc.pdf',
 *   filename: 'contract.pdf',
 *   mimeType: 'application/pdf',
 * });
 * ```
 *
 * Soporte out-of-the-box:
 * - **Imágenes** (`<img>`) con zoom fit.
 * - **PDF** (`<iframe>` del PDF viewer nativo del navegador).
 * - **Vídeo / audio** (`<video>` / `<audio controls>`).
 * - **JSON** (`app-json-viewer`).
 * - **Texto** (`<pre>` con wrap).
 * - **Office** (docx/xlsx/pptx) vía Google Docs viewer — requiere URL pública.
 * - Fallback: descarga / abrir en nueva pestaña.
 */
@Component({
  selector: 'app-file-viewer-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    JsonViewerComponent,
    EmptyStateComponent
],
  template: `
    <div class="fv">
      <header class="fv__header">
        <div class="fv__title-wrap">
          <mat-icon class="fv__icon">{{ iconForKind() }}</mat-icon>
          <div>
            <h2 class="fv__title">{{ data.filename || 'File' }}</h2>
            <p class="fv__subtitle">{{ resolvedMime() || 'unknown' }}</p>
          </div>
        </div>
        <div class="fv__actions">
          @if (data.openInNewTab !== false) {
            <a mat-icon-button [href]="data.url" target="_blank" rel="noopener" matTooltip="Open in new tab">
              <mat-icon>open_in_new</mat-icon>
            </a>
          }
          @if (data.downloadable !== false) {
            <a mat-icon-button [href]="data.url" [download]="data.filename || ''" matTooltip="Download">
              <mat-icon>download</mat-icon>
            </a>
          }
          <button mat-icon-button type="button" aria-label="Close" (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </header>

      <div class="fv__body">
        @switch (kind()) {
          @case ('image') {
            <img class="fv__img" [src]="data.url" [alt]="data.filename || 'image'">
          }
          @case ('pdf') {
            <iframe
              class="fv__iframe"
              [src]="safeUrl()"
              loading="lazy"
              title="PDF viewer"
            ></iframe>
          }
          @case ('video') {
            <video class="fv__media" [src]="data.url" controls playsinline></video>
          }
          @case ('audio') {
            <audio class="fv__media" [src]="data.url" controls></audio>
          }
          @case ('json') {
            @if (loading()) {
              <div class="fv__loading"><mat-spinner diameter="28"></mat-spinner></div>
            } @else if (textContent() !== null) {
              <app-json-viewer [data]="parsedJson()" [copyable]="true" />
            } @else {
              <app-empty-state icon="error_outline" title="Could not load JSON" [description]="error() || ''" />
            }
          }
          @case ('text') {
            @if (loading()) {
              <div class="fv__loading"><mat-spinner diameter="28"></mat-spinner></div>
            } @else if (textContent() !== null) {
              <pre class="fv__pre">{{ textContent() }}</pre>
            } @else {
              <app-empty-state icon="error_outline" title="Could not load text" [description]="error() || ''" />
            }
          }
          @case ('office') {
            @if (data.allowGoogleDocsViewer !== false) {
              <iframe
                class="fv__iframe"
                [src]="officeEmbedUrl()"
                loading="lazy"
                title="Office viewer"
              ></iframe>
            } @else {
              <app-empty-state
                icon="description"
                title="Preview not available"
                description="Office preview disabled. Use Download / Open in new tab."
              />
            }
          }
          @default {
            <app-empty-state
              icon="insert_drive_file"
              [title]="'Preview not available'"
              description="Use the Download or Open buttons above."
            />
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .fv {
      display: flex;
      flex-direction: column;
      min-height: 60vh;
      max-height: 92vh;
    }
    .fv__header {
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; padding: 10px 14px;
      border-bottom: 1px solid var(--fvx-border, #e2e8f0);
    }
    .fv__title-wrap { display: flex; gap: 10px; align-items: center; min-width: 0; }
    .fv__icon { color: var(--fvx-text-secondary, #475569); }
    .fv__title {
      margin: 0; font-size: 0.9375rem; font-weight: 600;
      color: var(--fvx-text-primary, #1e293b);
      max-width: 60vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .fv__subtitle { margin: 2px 0 0; font-size: 0.75rem; color: var(--fvx-text-muted, #94a3b8); }
    .fv__actions { display: flex; gap: 2px; }

    .fv__body {
      flex: 1;
      display: flex; align-items: center; justify-content: center;
      background: #0f172a;
      overflow: auto;
    }
    .fv__img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .fv__iframe { width: 100%; height: 100%; min-height: 60vh; border: 0; background: #fff; }
    .fv__media { max-width: 100%; max-height: 80vh; }
    .fv__pre {
      margin: 0; padding: 16px;
      width: 100%; max-height: 80vh; overflow: auto;
      background: #0f172a; color: #e2e8f0;
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-size: 0.8125rem;
      white-space: pre-wrap; word-break: break-word;
    }
    .fv__loading { color: #fff; padding: 24px; }
  `],
})
export class FileViewerDialogComponent {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  dialogRef = inject(MatDialogRef<FileViewerDialogComponent>);

  loading = signal(false);
  textContent = signal<string | null>(null);
  error = signal<string | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) public data: FileViewerDialogConfig) {
    if (this.kind() === 'json' || this.kind() === 'text') {
      this.fetchText();
    }
  }

  static openWith(
    dialog: MatDialog,
    config: FileViewerDialogConfig,
    overrides?: MatDialogConfig<FileViewerDialogConfig>,
  ): MatDialogRef<FileViewerDialogComponent> {
    return dialog.open(FileViewerDialogComponent, {
      data: config,
      width: '90vw',
      maxWidth: '1200px',
      height: 'auto',
      maxHeight: '92vh',
      panelClass: 'file-viewer-dialog-panel',
      ...overrides,
    });
  }

  kind = computed<FileViewerKind>(() => {
    if (this.data.kind) return this.data.kind;
    const mime = (this.data.mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/json') return 'json';
    if (mime.startsWith('text/')) return 'text';
    if (mime.includes('word') || mime.includes('excel') || mime.includes('spreadsheet') ||
        mime.includes('presentation') || mime.includes('officedocument')) return 'office';
    const ext = inferExtension(this.data.filename || this.data.url).toLowerCase();
    return EXT_TO_KIND[ext] || 'other';
  });

  resolvedMime = computed<string>(() => this.data.mimeType || inferExtension(this.data.filename || this.data.url));

  iconForKind = computed<string>(() => {
    switch (this.kind()) {
      case 'image': return 'image';
      case 'pdf': return 'picture_as_pdf';
      case 'video': return 'movie';
      case 'audio': return 'audiotrack';
      case 'json': return 'data_object';
      case 'text': return 'description';
      case 'office': return 'article';
      default: return 'insert_drive_file';
    }
  });

  safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.data.url);
  }

  officeEmbedUrl(): SafeResourceUrl {
    const embed = `https://docs.google.com/gview?url=${encodeURIComponent(this.data.url)}&embedded=true`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  parsedJson = computed<unknown>(() => {
    const raw = this.textContent();
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  });

  private fetchText(): void {
    this.loading.set(true);
    // takeUntilDestroyed: si el usuario cierra el diálogo mientras carga, la
    // suscripción se cancela y no hace signal.set() sobre un componente muerto.
    this.http.get(this.data.url, { responseType: 'text' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (text) => {
        this.textContent.set(text);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Request failed');
        this.textContent.set(null);
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}

function inferExtension(name: string): string {
  const clean = name.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1) : '';
}
