import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';

import {
  FILE_UPLOAD_PROVIDER,
  FileUploadContext,
  FileUploadProvider,
  FileUploadResult,
} from './providers/file-upload-provider';
import { SignedUrlUploadProvider } from './providers/signed-url-upload.provider';
import { NotificationService } from '../../../core/services/notification.service';

export type UploadItemStatus = 'queued' | 'uploading' | 'success' | 'error' | 'canceled';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  progress: number;
  error?: string;
  result?: FileUploadResult;
  sub?: Subscription;
}

/**
 * Componente de subida con drop-zone, progreso y validación. Usa el token
 * `FILE_UPLOAD_PROVIDER` para abstraer el destino (Firebase, signed URL, etc.).
 *
 * **Variantes:**
 * - `variant="default"` (por defecto): drop-zone grande, para páginas dedicadas
 *   de subida o secciones de "uploads".
 * - `variant="mini"`: fila compacta con botón + hint + lista densa. Ideal para
 *   embeber en formularios (p. ej. adjuntar un archivo a un registro).
 *
 * ```html
 * <!-- default -->
 * <app-file-uploader
 *   [accept]="'image/*,application/pdf'"
 *   [maxFileSizeMb]="10"
 *   [multiple]="true"
 *   [pathPrefix]="'uploads/avatars'"
 *   (uploaded)="onFiles($event)"
 * />
 *
 * <!-- mini (dentro de un form) -->
 * <app-file-uploader
 *   variant="mini"
 *   buttonLabel="Attach"
 *   hint="PDF, max 5MB"
 *   accept="application/pdf"
 *   [maxFileSizeMb]="5"
 *   [multiple]="false"
 *   (uploaded)="form.patchValue({ fileUrl: $event[0]?.url })"
 * />
 * ```
 *
 * ```ts
 * // app.config.ts
 * providers: [
 *   { provide: FILE_UPLOAD_PROVIDER, useClass: SignedUrlUploadProvider },
 * ]
 * ```
 */
@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslocoModule,
  ],
  template: `
    <div class="fu" [class.fu--mini]="variant === 'mini'">
      @if (variant === 'mini') {
        <div
          class="fu__mini"
          [class.fu__mini--active]="isDragging()"
          [class.fu__mini--disabled]="disabled"
        >
          <button
            type="button"
            mat-stroked-button
            color="primary"
            [disabled]="disabled"
            (click)="openPicker()"
          >
            <mat-icon>attach_file</mat-icon>
            {{ buttonLabel ?? ('fileUploader.selectFiles' | transloco) }}
          </button>
          <span class="fu__mini-hint">
            @if (items().length) {
              {{ 'fileUploader.fileCount' | transloco: { count: items().length, bytes: (totalBytes() | number:'1.0-0') } }}
            } @else {
              {{ hint || defaultHint || ('fileUploader.noFiles' | transloco) }}
            }
          </span>
          <input
            #fileInput
            type="file"
            hidden
            [accept]="accept"
            [multiple]="multiple"
            (change)="onFileSelected($event)"
          />
        </div>
      } @else {
        <!-- La zona entera es clickable por comodidad (mouse), pero contiene un
             <button> "Seleccionar archivos" que YA es enfocable y operable por
             teclado; no duplicamos tabindex en el div (sería un tab-stop extra
             redundante). El (click) del div es solo un atajo de ratón. -->
        <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
        <div
          class="fu__dropzone"
          [class.fu__dropzone--active]="isDragging()"
          [class.fu__dropzone--disabled]="disabled"
          (click)="openPicker()"
        >
          <mat-icon class="fu__dropzone-icon">cloud_upload</mat-icon>
          <p class="fu__dropzone-title">{{ title ?? ('fileUploader.dropHint' | transloco) }}</p>
          <p class="fu__dropzone-hint">
            {{ hint || defaultHint }}
          </p>
          <button
            type="button"
            mat-stroked-button
            color="primary"
            [disabled]="disabled"
            (click)="$event.stopPropagation(); openPicker()"
          >
            <mat-icon>attach_file</mat-icon>
            {{ buttonLabel ?? ('fileUploader.selectFiles' | transloco) }}
          </button>
          <input
            #fileInput
            type="file"
            hidden
            [accept]="accept"
            [multiple]="multiple"
            (change)="onFileSelected($event)"
          />
        </div>
      }

      @if (items().length) {
        <ul class="fu__list" [class.fu__list--dense]="variant === 'mini'">
          @for (it of items(); track it.id) {
            <li class="fu__item" [class]="'fu__item--' + it.status">
              <mat-icon class="fu__item-icon">{{ iconFor(it) }}</mat-icon>
              <div class="fu__item-main">
                <div class="fu__item-top">
                  <span class="fu__item-name" [matTooltip]="it.file.name">{{ it.file.name }}</span>
                  <span class="fu__item-meta">
                    {{ formatBytes(it.file.size) }}
                    @if (it.status === 'uploading') {
                      · {{ (it.progress * 100) | number:'1.0-0' }}%
                    }
                  </span>
                </div>
                @if (it.status === 'uploading' || it.status === 'queued') {
                  <mat-progress-bar
                    [mode]="it.status === 'queued' ? 'buffer' : 'determinate'"
                    [value]="it.progress * 100"
                  ></mat-progress-bar>
                }
                @if (it.status === 'error') {
                  <p class="fu__item-error">{{ it.error || ('fileUploader.uploadFailed' | transloco) }}</p>
                }
                @if (it.status === 'success' && it.result?.url) {
                  <a class="fu__item-link" [href]="it.result!.url" target="_blank" rel="noopener">
                    {{ 'fileUploader.viewFile' | transloco }}
                  </a>
                }
              </div>
              <div class="fu__item-actions">
                @if (it.status === 'uploading' || it.status === 'queued') {
                  <button mat-icon-button type="button" (click)="cancel(it)" [attr.aria-label]="'fileUploader.cancel' | transloco">
                    <mat-icon>close</mat-icon>
                  </button>
                } @else {
                  <button mat-icon-button type="button" (click)="remove(it)" [attr.aria-label]="'fileUploader.remove' | transloco">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .fu__dropzone {
      border: 1.5px dashed var(--fvx-border, #cbd5e1);
      border-radius: 8px;
      padding: 28px 16px;
      background: var(--fvx-bg-card, #fff);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .fu__dropzone:hover { border-color: var(--fvx-link, #2563eb); }
    .fu__dropzone--active {
      border-color: var(--fvx-link, #2563eb);
      background: rgba(37, 99, 235, 0.06);
    }
    .fu__dropzone--disabled { opacity: 0.6; cursor: not-allowed; }
    .fu__dropzone-icon {
      font-size: 40px; width: 40px; height: 40px;
      color: var(--fvx-text-muted, #94a3b8);
    }
    .fu__dropzone-title {
      margin: 0; font-size: 0.9375rem; font-weight: 600;
      color: var(--fvx-text-primary, #1e293b);
    }
    .fu__dropzone-hint {
      margin: 0; font-size: 0.75rem; color: var(--fvx-text-muted, #94a3b8);
    }

    /* ── Mini variant (for forms) ── */
    .fu__mini {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px 6px 8px;
      border: 1px dashed var(--fvx-border, #cbd5e1);
      border-radius: 8px;
      background: var(--fvx-bg-card, #fff);
      flex-wrap: wrap;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .fu__mini--active {
      border-color: var(--fvx-link, #2563eb);
      background: color-mix(in srgb, var(--fvx-link, #2563eb) 6%, transparent);
    }
    .fu__mini--disabled { opacity: 0.6; }
    .fu__mini-hint {
      font-size: 0.75rem;
      color: var(--fvx-text-muted, #94a3b8);
      flex: 1;
      min-width: 120px;
    }

    .fu__list {
      list-style: none; margin: 12px 0 0; padding: 0;
      display: flex; flex-direction: column; gap: 6px;
    }
    .fu__list--dense { margin-top: 8px; gap: 4px; }
    .fu__list--dense .fu__item { padding: 4px 6px; }
    .fu__list--dense .fu__item-icon { font-size: 18px; width: 18px; height: 18px; }
    .fu__item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px;
      background: var(--fvx-bg-card, #fff);
      border: 1px solid var(--fvx-border, #e2e8f0);
      border-radius: 6px;
    }
    .fu__item--error { border-color: #fecaca; }
    .fu__item--success { border-color: #bbf7d0; }
    .fu__item-icon { color: var(--fvx-text-secondary, #475569); }
    .fu__item-main { flex: 1; min-width: 0; }
    .fu__item-top { display: flex; justify-content: space-between; gap: 8px; }
    .fu__item-name {
      font-size: 0.8125rem; font-weight: 500;
      color: var(--fvx-text-primary, #1e293b);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .fu__item-meta { font-size: 0.75rem; color: var(--fvx-text-muted, #94a3b8); }
    .fu__item-error { margin: 4px 0 0; font-size: 0.75rem; color: #991b1b; }
    .fu__item-link {
      font-size: 0.75rem; color: var(--fvx-link, #2563eb);
      text-decoration: none;
    }
    .fu__item-link:hover { text-decoration: underline; }
  `],
})
export class FileUploaderComponent implements OnDestroy {
  private provider = inject<FileUploadProvider | null>(FILE_UPLOAD_PROVIDER, { optional: true });
  /** Provider de subida DIRECTA al bucket (presigned PUT) para archivos grandes
   * (videos): no pasan por el backend. Se usa cuando `[direct]="true"`. */
  private directProvider = inject(SignedUrlUploadProvider);

  ngOnDestroy(): void {
    // Cancela las suscripciones de upload en curso (clear() hace
    // it.sub?.unsubscribe()); sin esto, un upload activo seguía vivo tras
    // destruir el componente (fuga + posible state-update post-destroy).
    this.clear();
  }
  private notifier = inject(NotificationService);
  private transloco = inject(TranslocoService);

  /** Título de la drop-zone. Si no se pasa, usa `fileUploader.dropHint` (i18n). */
  @Input() title?: string;
  @Input() hint?: string;
  @Input() accept?: string;
  @Input() multiple = true;
  @Input() maxFileSizeMb?: number;
  @Input() maxFiles?: number;
  @Input() disabled = false;
  /** Context que se pasa al provider. */
  @Input() pathPrefix?: string;
  @Input() metadata?: Record<string, string>;
  /** Si `true`, auto-inicia upload al seleccionar/soltar; si `false` solo encola. */
  @Input() autoUpload = true;

  /** Si `true`, sube DIRECTO al bucket (presigned PUT) sin pasar por el backend.
   * Ideal para archivos grandes (videos). Si `false`, usa el provider global. */
  @Input() direct = false;

  /**
   * Modo de render.
   * - `default`: drop-zone grande con icono (para páginas dedicadas).
   * - `mini`: botón compacto + hint + lista densa (para inputs de formulario).
   */
  @Input() variant: 'default' | 'mini' = 'default';

  /** Texto del botón de selección (ambos modos). Si no se pasa, usa
   *  `fileUploader.selectFiles` (i18n). */
  @Input() buttonLabel?: string;

  @Output() uploaded = new EventEmitter<FileUploadResult[]>();
  @Output() itemUploaded = new EventEmitter<FileUploadResult>();
  @Output() removed = new EventEmitter<UploadItem>();
  @Output() errored = new EventEmitter<{ item: UploadItem; error: unknown }>();

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  items = signal<UploadItem[]>([]);
  isDragging = signal(false);

  @HostBinding('class.fu-host') hostClass = true;

  get defaultHint(): string {
    const parts: string[] = [];
    if (this.accept) parts.push(this.transloco.translate('fileUploader.accepted', { types: this.accept }));
    if (this.maxFileSizeMb) parts.push(this.transloco.translate('fileUploader.maxSize', { mb: this.maxFileSizeMb }));
    return parts.join(' · ');
  }

  @HostListener('dragover', ['$event'])
  onDragOver(ev: DragEvent): void {
    if (this.disabled) return;
    ev.preventDefault();
    this.isDragging.set(true);
  }

  @HostListener('dragleave')
  onDragLeave(): void {
    this.isDragging.set(false);
  }

  @HostListener('drop', ['$event'])
  onDrop(ev: DragEvent): void {
    if (this.disabled) return;
    ev.preventDefault();
    this.isDragging.set(false);
    const files = Array.from(ev.dataTransfer?.files ?? []);
    this.addFiles(files);
  }

  openPicker(): void {
    if (this.disabled) return;
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.addFiles(files);
  }

  addFiles(files: File[]): void {
    if (!files.length) return;

    let remaining = files;
    if (!this.multiple) remaining = remaining.slice(0, 1);
    if (this.maxFiles !== undefined) {
      const free = Math.max(0, this.maxFiles - this.items().length);
      remaining = remaining.slice(0, free);
    }

    const newItems: UploadItem[] = [];
    for (const f of remaining) {
      const err = this.validate(f);
      const it: UploadItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        file: f,
        status: err ? 'error' : 'queued',
        progress: 0,
        error: err,
      };
      newItems.push(it);
    }
    this.items.update((cur) => [...cur, ...newItems]);

    if (this.autoUpload) {
      for (const it of newItems) {
        if (it.status === 'queued') this.startUpload(it);
      }
    }
  }

  startUpload(it: UploadItem): void {
    // `direct` → subida directa al bucket (presigned); si no, provider global.
    const provider = this.direct ? this.directProvider : this.provider;
    if (!provider) {
      it.status = 'error';
      it.error = this.transloco.translate('fileUploader.noProvider');
      this.notifier.error(this.transloco.translate('fileUploader.noProviderDetail'));
      this.refresh();
      return;
    }
    it.status = 'uploading';
    this.refresh();

    const ctx: FileUploadContext = {
      pathPrefix: this.pathPrefix,
      metadata: this.metadata,
    };

    it.sub = provider
      .upload(it.file, ctx, (p) => {
        it.progress = p.progress;
        this.refresh();
      })
      .subscribe({
        next: (res) => {
          it.status = 'success';
          it.progress = 1;
          it.result = res;
          this.refresh();
          this.itemUploaded.emit(res);
          this.emitUploaded();
        },
        error: (err) => {
          it.status = 'error';
          it.error = err?.message || this.transloco.translate('fileUploader.uploadFailed');
          this.refresh();
          this.errored.emit({ item: it, error: err });
          this.notifier.error(it.error!);
        },
      });
  }

  cancel(it: UploadItem): void {
    it.sub?.unsubscribe();
    it.status = 'canceled';
    this.refresh();
  }

  remove(it: UploadItem): void {
    this.items.update((cur) => cur.filter((x) => x.id !== it.id));
    this.removed.emit(it);
  }

  /** Borra todos los items (sin llamar al backend). */
  clear(): void {
    for (const it of this.items()) it.sub?.unsubscribe();
    this.items.set([]);
  }

  /** Lanza el upload de items `queued` pendientes (útil cuando `autoUpload=false`). */
  uploadAll(): void {
    for (const it of this.items()) {
      if (it.status === 'queued') this.startUpload(it);
    }
  }

  iconFor(it: UploadItem): string {
    if (it.status === 'error') return 'error_outline';
    if (it.status === 'success') return 'check_circle';
    const t = it.file.type || '';
    if (t.startsWith('image/')) return 'image';
    if (t === 'application/pdf') return 'picture_as_pdf';
    if (t.startsWith('video/')) return 'movie';
    if (t.startsWith('audio/')) return 'audiotrack';
    if (t.startsWith('text/')) return 'description';
    return 'insert_drive_file';
  }

  totalBytes(): number {
    return this.items().reduce((acc, it) => acc + (it.file?.size || 0), 0);
  }

  formatBytes(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024; i++;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  private validate(f: File): string | undefined {
    if (this.maxFileSizeMb && f.size > this.maxFileSizeMb * 1024 * 1024) {
      return this.transloco.translate('fileUploader.errorTooLarge', { mb: this.maxFileSizeMb });
    }
    if (this.accept) {
      const accepted = this.accept.split(',').map((s) => s.trim()).filter(Boolean);
      const matches = accepted.some((a) => matchesAccept(f, a));
      if (!matches) return this.transloco.translate('fileUploader.errorType');
    }
    return undefined;
  }

  private refresh(): void {
    this.items.update((cur) => [...cur]);
  }

  private emitUploaded(): void {
    const results = this.items()
      .filter((x) => x.status === 'success' && x.result)
      .map((x) => x.result!) as FileUploadResult[];
    this.uploaded.emit(results);
  }
}

function matchesAccept(file: File, accept: string): boolean {
  if (accept.startsWith('.')) {
    return file.name.toLowerCase().endsWith(accept.toLowerCase());
  }
  if (accept.endsWith('/*')) {
    const prefix = accept.slice(0, -1);
    return file.type.startsWith(prefix);
  }
  return file.type === accept;
}
