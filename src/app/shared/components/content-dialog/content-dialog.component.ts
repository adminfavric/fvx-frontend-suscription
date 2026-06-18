import { Component, Inject, Signal, Type, inject } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type ContentDialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

export interface ContentDialogAction {
  /** Texto del botón. */
  label: string;
  /** Color Material. */
  color?: 'primary' | 'accent' | 'warn';
  /** Estilo del botón. */
  variant?: 'flat' | 'stroked' | 'basic';
  /** Valor devuelto por `afterClosed()` al hacer click. */
  resultKey?: unknown;
  /** Deshabilitado condicionalmente (puede ser `Signal<boolean>`). */
  disabled?: boolean | Signal<boolean>;
  /** Si `false`, no cierra el diálogo; útil para confirmaciones en 2 pasos. */
  closes?: boolean;
  /** Callback opcional que corre antes de cerrar; recibe el `dialogRef`. */
  handler?: (dialogRef: MatDialogRef<ContentDialogComponent>) => void;
}

export interface ContentDialogConfig {
  title: string;
  component: Type<unknown>;
  /** Inputs `@Input()` inyectados en el componente embebido (via `NgComponentOutlet`). */
  inputs?: Record<string, unknown>;
  /** Botonera al pie. Si vacío y `hideClose=false`, muestra un solo "Close". */
  actions?: ContentDialogAction[];
  size?: ContentDialogSize;
  hideClose?: boolean;
  /** Ocultar botón "X" de la esquina. */
  hideCloseIcon?: boolean;
  /** Deshabilitar cierre por ESC u overlay. */
  disableClose?: boolean;
  /** `aria-label` del botón cerrar (cabecera); si no, «Close». */
  closeIconAriaLabel?: string;
  /** Ligature de Material Icons junto al título (p. ej. `calculate`). */
  titleIcon?: string;
}

const SIZE_WIDTHS: Record<ContentDialogSize, string> = {
  sm: '420px',
  md: '640px',
  lg: '880px',
  xl: '1100px',
  fullscreen: '100vw',
};

/**
 * Popup genérico Material que embebe cualquier componente standalone y expone una
 * botonera configurable. Complemento de `ConfirmDialogComponent` (ese es para Sí/No)
 * y del modo *embed* de `EntityDrawerComponent` (ese abre de lado, no modal).
 *
 * Apertura preferida: `ContentDialogComponent.openWith(dialog, config)`.
 */
@Component({
  selector: 'app-content-dialog',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="content-dialog">
      <header class="content-dialog__header">
        <div class="content-dialog__title-wrap">
          @if (data.titleIcon) {
            <mat-icon class="content-dialog__title-icon" aria-hidden="true">{{ data.titleIcon }}</mat-icon>
          }
          <h2 class="content-dialog__title">{{ data.title }}</h2>
        </div>
        @if (!data.hideCloseIcon) {
          <button
            mat-icon-button
            type="button"
            class="content-dialog__close"
            [attr.aria-label]="data.closeIconAriaLabel || 'Close'"
            (click)="close()"
          >
            <mat-icon>close</mat-icon>
          </button>
        }
      </header>

      <div class="content-dialog__body" mat-dialog-content>
        <ng-container *ngComponentOutlet="data.component; inputs: data.inputs"></ng-container>
      </div>

      @if (actions.length || !data.hideClose) {
        <footer class="content-dialog__footer" mat-dialog-actions align="end">
          @if (!data.hideClose) {
            <button mat-button type="button" (click)="close()">Close</button>
          }
          @for (a of actions; track a.label) {
            @switch (a.variant || 'flat') {
              @case ('stroked') {
                <button mat-stroked-button type="button"
                  [color]="a.color || 'primary'"
                  [disabled]="isDisabled(a)"
                  (click)="runAction(a)">{{ a.label }}</button>
              }
              @case ('basic') {
                <button mat-button type="button"
                  [color]="a.color || 'primary'"
                  [disabled]="isDisabled(a)"
                  (click)="runAction(a)">{{ a.label }}</button>
              }
              @default {
                <button mat-flat-button type="button"
                  [color]="a.color || 'primary'"
                  [disabled]="isDisabled(a)"
                  (click)="runAction(a)">{{ a.label }}</button>
              }
            }
          }
        </footer>
      }
    </div>
  `,
  styles: [`
    .content-dialog {
      display: flex;
      flex-direction: column;
      max-height: 100%;
    }
    .content-dialog__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--fvx-border, #e2e8f0);
    }
    .content-dialog__title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }
    .content-dialog__title-icon {
      flex-shrink: 0;
      font-size: 22px;
      width: 22px;
      height: 22px;
      line-height: 22px;
      color: var(--fvx-dialog-header-icon, var(--fvx-text-secondary));
    }
    .content-dialog__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--fvx-text-primary, #1e293b);
      flex: 1;
      min-width: 0;
    }
    .content-dialog__close { width: 32px; height: 32px; line-height: 32px; }
    .content-dialog__body {
      padding: 20px;
      overflow: auto;
      flex: 1;
    }
    .content-dialog__footer {
      border-top: 1px solid var(--fvx-border, #e2e8f0);
      padding: 10px 16px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  `],
})
export class ContentDialogComponent {
  dialogRef = inject(MatDialogRef<ContentDialogComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: ContentDialogConfig) {}

  get actions(): ContentDialogAction[] {
    return this.data.actions ?? [];
  }

  /**
   * Atajo estático para abrir el diálogo con el tamaño traducido a Material.
   * ```ts
   * ContentDialogComponent.openWith(this.dialog, { title: '...', component: FooComponent });
   * ```
   */
  static openWith<T = unknown>(
    dialog: MatDialog,
    config: ContentDialogConfig,
    overrides?: MatDialogConfig<ContentDialogConfig>,
  ): MatDialogRef<ContentDialogComponent, T> {
    const size = config.size ?? 'md';
    const width = SIZE_WIDTHS[size];
    const isFs = size === 'fullscreen';
    const basePanel = `content-dialog-panel--${size}`;
    const { panelClass: extraPanel, ...restOverrides } = overrides ?? {};
    const panelClass =
      extraPanel === undefined
        ? basePanel
        : [basePanel, ...(Array.isArray(extraPanel) ? extraPanel : [extraPanel])];
    return dialog.open<ContentDialogComponent, ContentDialogConfig, T>(
      ContentDialogComponent,
      {
        data: config,
        width: isFs ? undefined : width,
        maxWidth: isFs ? '100vw' : '96vw',
        height: isFs ? '100vh' : undefined,
        maxHeight: isFs ? '100vh' : '90vh',
        panelClass,
        disableClose: config.disableClose ?? false,
        autoFocus: 'first-tabbable',
        ...restOverrides,
      },
    );
  }

  isDisabled(a: ContentDialogAction): boolean {
    if (typeof a.disabled === 'function') {
      try { return (a.disabled as Signal<boolean>)(); } catch { return false; }
    }
    return !!a.disabled;
  }

  runAction(a: ContentDialogAction): void {
    if (a.handler) {
      a.handler(this.dialogRef);
      if (a.closes === false) return;
    }
    if (a.closes === false) return;
    this.dialogRef.close(a.resultKey);
  }

  close(): void {
    this.dialogRef.close();
  }
}
