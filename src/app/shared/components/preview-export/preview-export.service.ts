import { Injectable, Type, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import {
  ContentDialogComponent,
} from '../content-dialog/content-dialog.component';
import { PreviewExportHostComponent } from './preview-export-host.component';
import { PreviewExportOptions } from './preview-export.types';

/**
 * Servicio para abrir un preview con un componente arbitrario dentro de un
 * `ContentDialogComponent` (popup base de la app) que muestra una "hoja"
 * tamaño carta con toolbar de exportación (PDF, PNG, Print).
 *
 * Uso:
 * ```ts
 * constructor(private previewExport: PreviewExportService) {}
 *
 * openResumen() {
 *   this.previewExport.open(ResumenComponent, {
 *     title: 'Resumen mensual',
 *     filename: 'resumen-2026-05',
 *     data: { mes: 5, anio: 2026 },
 *   });
 * }
 * ```
 *
 * El componente pasado se monta dentro de la hoja; los keys de `data` se
 * setean por nombre como `@Input()`s. El popup base es `ContentDialog` —
 * cerrar por la X del header (no se duplica el botón internamente).
 */
@Injectable({ providedIn: 'root' })
export class PreviewExportService {
  private readonly dialog = inject(MatDialog);

  open<T>(
    component: Type<T>,
    options: PreviewExportOptions = {},
  ): MatDialogRef<ContentDialogComponent> {
    return ContentDialogComponent.openWith(
      this.dialog,
      {
        title: options.title ?? 'Preview',
        titleIcon: 'description',
        component: PreviewExportHostComponent,
        // ContentDialog → NgComponentOutlet inputs: estos se mapean por nombre
        // a los @Input()s de PreviewExportHostComponent.
        inputs: {
          component,
          data: options.data,
          filename: options.filename ?? 'preview',
          actions: options.actions ?? ['print', 'pdf', 'png'],
          pageSize: options.pageSize ?? 'A4',
          orientation: options.orientation ?? 'portrait',
        },
        size: 'lg',                // 880px (match con el ancho de la hoja)
        hideClose: true,           // sin footer "Close" — la X del header alcanza
        actions: [],
      },
      {
        // Sin `height` fijo: el dialog se ajusta al contenido (hoja carta +
        // toolbar + header de ContentDialog). `maxHeight: 88vh` evita que se
        // salga del viewport si el documento es más alto que la pantalla.
        maxHeight: '88vh',
        panelClass: ['content-dialog-panel--lg', 'preview-export-pane'],
      },
    );
  }
}
