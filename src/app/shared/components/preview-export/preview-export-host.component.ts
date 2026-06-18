import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  ElementRef,
  Input,
  OnDestroy,
  Type,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PreviewExportAction } from './preview-export.types';

/**
 * Host interno que `PreviewExportService` embebe en el body del
 * `ContentDialogComponent`. Aquí vive el toolbar (Print / PDF / PNG) y la
 * "hoja" simulada tamaño carta donde se monta el componente del usuario.
 *
 * Se carga vía `NgComponentOutlet` desde ContentDialog → los `@Input()`s
 * llegan por el bag de `inputs` que arma el servicio.
 *
 * **NO** instanciar manualmente. El cierre del dialog lo provee la X del
 * propio ContentDialog (botón en el header) — no duplicamos esa acción aquí.
 */
@Component({
  selector: 'app-preview-export-host',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, TranslocoModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="pe-host">
      <!-- Toolbar compacta: meta a la izquierda, acciones icon-only a la derecha. -->
      <div class="pe-host__toolbar" role="toolbar" aria-label="Export tools">
        <span class="pe-host__meta">
          {{ pageSize }}{{ orientation === 'landscape' ? ' · horizontal' : '' }}
        </span>

        @if (busy()) {
          <span class="pe-host__busy" aria-live="polite">
            <mat-icon class="pe-host__busy-spin">progress_activity</mat-icon>
          </span>
        }

        <div class="pe-host__actions">
          @if (hasAction('print')) {
            <button mat-icon-button type="button"
                    class="pe-host__btn"
                    [matTooltip]="'previewExport.print' | transloco"
                    [disabled]="busy()"
                    (click)="onPrint()">
              <mat-icon>print</mat-icon>
            </button>
          }
          @if (hasAction('png')) {
            <button mat-icon-button type="button"
                    class="pe-host__btn"
                    [matTooltip]="'previewExport.downloadPng' | transloco"
                    [disabled]="busy()"
                    (click)="onExportPng()">
              <mat-icon>image</mat-icon>
            </button>
          }
          @if (hasAction('pdf')) {
            <button mat-icon-button type="button"
                    class="pe-host__btn pe-host__btn--primary"
                    [matTooltip]="'previewExport.downloadPdf' | transloco"
                    [disabled]="busy()"
                    (click)="onExportPdf()">
              <mat-icon>picture_as_pdf</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Zona de scroll con la hoja centrada. -->
      <div class="pe-host__scroll">
        <article #previewSheet class="pe-sheet" [class.pe-sheet--busy]="busy()">
          <ng-container #host></ng-container>
        </article>
      </div>
    </div>
  `,
  styles: [`
    /* Host dentro del body de ContentDialog: matamos el padding del body para
       que toolbar+scroll ocupen el 100% del area útil. */
    .content-dialog__body:has(> app-preview-export-host) {
      padding: 0 !important;
    }
    app-preview-export-host { display: block; height: 100%; min-height: 0; }

    .pe-host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: var(--fvx-bg-page);
    }

    /* ── Toolbar compacta ─────────────────────────────────────────────── */
    .pe-host__toolbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      background: var(--fvx-bg-card);
      border-bottom: 1px solid var(--fvx-border);
      min-height: 38px;
    }
    .pe-host__meta {
      font-size: 0.75rem;
      color: var(--fvx-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 500;
      flex: 1 1 auto;
      min-width: 0;
    }
    .pe-host__busy {
      display: inline-flex;
      align-items: center;
      color: var(--fvx-text-secondary);
    }
    .pe-host__busy-spin {
      animation: pe-spin 1s linear infinite;
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
    }
    @keyframes pe-spin { to { transform: rotate(360deg); } }

    .pe-host__actions {
      display: inline-flex;
      align-items: center;
      gap: 0;
    }
    /* Icon-buttons compactos 30x30 (más densos que el default 32x32). */
    .pe-host__btn.mat-mdc-icon-button {
      width: 30px !important;
      height: 30px !important;
      padding: 5px !important;
      --mat-icon-button-state-layer-size: 30px;
      --mat-icon-button-icon-color: var(--fvx-text-secondary);
    }
    .pe-host__btn.mat-mdc-icon-button .mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      line-height: 18px !important;
    }
    .pe-host__btn.mat-mdc-icon-button .mat-mdc-button-touch-target {
      width: 30px !important;
      height: 30px !important;
    }
    .pe-host__btn:hover {
      --mat-icon-button-icon-color: var(--fvx-text-primary);
    }
    /* PDF destacado en color primario (sin background fill, solo color). */
    .pe-host__btn--primary {
      --mat-icon-button-icon-color: var(--fvx-link) !important;
    }
    .pe-host__btn--primary:hover {
      --mat-icon-button-icon-color: var(--fvx-link) !important;
      background: color-mix(in srgb, var(--fvx-link) 10%, transparent) !important;
    }

    /* ── Scroll + hoja ──────────────────────────────────────────────── */
    .pe-host__scroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 14px 14px 20px;
    }

    /* Hoja tamaño carta (no se toca: 8.5"×11"). */
    .pe-sheet {
      background: #ffffff;
      color: #1f2937;
      width: 816px;
      min-height: 1056px;
      max-width: 100%;
      box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.06),
        0 6px 24px rgba(0, 0, 0, 0.18);
      border-radius: 4px;
      padding: 48px 56px;
      box-sizing: border-box;
      transition: opacity 0.15s ease;
    }
    .pe-sheet--busy { pointer-events: none; opacity: 0.6; }

    html:not(.theme-tmp-dark):not(.theme-tmp-blackandwhite) app-preview-export-host .pe-sheet {
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(0, 0, 0, 0.08);
    }

    /* Print. */
    @media print {
      body * { visibility: hidden !important; }
      app-preview-export-host .pe-sheet,
      app-preview-export-host .pe-sheet * { visibility: visible !important; }
      app-preview-export-host .pe-sheet {
        position: absolute !important;
        inset: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        max-width: none !important;
        min-height: auto !important;
        padding: 0 !important;
      }
      app-preview-export-host .pe-host__toolbar { display: none !important; }
    }
  `],
})
export class PreviewExportHostComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { read: ViewContainerRef, static: true }) hostVcr!: ViewContainerRef;
  @ViewChild('previewSheet', { static: true }) sheetRef!: ElementRef<HTMLElement>;

  /** Componente del usuario a montar dentro de la hoja. */
  @Input({ required: true }) component!: Type<unknown>;
  /** Bag de `@Input()`s que se mapean por nombre al componente. */
  @Input() data?: Record<string, unknown>;
  /** Nombre base para los archivos exportados (sin extensión). */
  @Input() filename = 'preview';
  /** Acciones habilitadas en el toolbar (default: print + pdf + png). */
  @Input() actions: PreviewExportAction[] = ['print', 'pdf', 'png'];
  /** Tamaño de página para el PDF generado (default 'A4'). */
  @Input() pageSize: 'A4' | 'letter' = 'A4';
  /** Orientación del PDF (default 'portrait'). */
  @Input() orientation: 'portrait' | 'landscape' = 'portrait';

  readonly busy = signal(false);
  private childRef?: ComponentRef<unknown>;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.childRef = this.hostVcr.createComponent(this.component);
    if (this.data && this.childRef) {
      for (const [k, v] of Object.entries(this.data)) {
        (this.childRef.instance as Record<string, unknown>)[k] = v;
      }
    }
    this.childRef?.changeDetectorRef.markForCheck();
    this.cdr.detectChanges();
  }

  hasAction(a: PreviewExportAction): boolean {
    return this.actions.includes(a);
  }

  onPrint(): void {
    window.print();
  }

  async onExportPng(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const canvas = await this.renderToCanvas();
      this.triggerDownload(canvas.toDataURL('image/png'), `${this.safeName()}.png`);
    } finally {
      this.busy.set(false);
    }
  }

  async onExportPdf(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const canvas = await this.renderToCanvas();
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: this.orientation,
        unit: 'pt',
        format: this.pageSize,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      // Multi-página: si la imagen excede el alto de página, recortamos
      // verticalmente desplazándola y agregando páginas nuevas.
      let remaining = imgHeight;
      let offset = 0;
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, -offset, imgWidth, imgHeight);
        remaining -= pageHeight;
        offset += pageHeight;
        if (remaining > 0) pdf.addPage();
      }
      pdf.save(`${this.safeName()}.pdf`);
    } finally {
      this.busy.set(false);
    }
  }

  private async renderToCanvas(): Promise<HTMLCanvasElement> {
    const { default: html2canvas } = await import('html2canvas');
    const node = this.sheetRef.nativeElement;
    return html2canvas(node, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
  }

  private safeName(): string {
    return (this.filename || 'preview').replace(/[^\w-]+/g, '_');
  }

  private triggerDownload(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  ngOnDestroy(): void {
    this.childRef?.destroy();
  }
}
