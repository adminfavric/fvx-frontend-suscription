/**
 * Opciones de apertura para `PreviewExportService.open(...)`.
 *
 * `data` son los inputs que se setean por nombre en el componente contenido
 * (igual que `MatDialogRef.componentInstance`). Si quieres pasar más control,
 * usa `componentInputs` que admite cualquier shape.
 */
export interface PreviewExportOptions<TData = Record<string, unknown>> {
  /** Título mostrado en el toolbar del dialog. */
  title?: string;
  /**
   * Nombre base usado para los archivos exportados (sin extensión).
   * Default: `'preview'`. La extensión la agrega cada export (`.pdf` / `.png`).
   */
  filename?: string;
  /** Datos para mapear a `@Input()`s del componente contenido. */
  data?: TData;
  /** Acciones habilitadas en el toolbar (default: las cuatro). */
  actions?: PreviewExportAction[];
  /**
   * Tamaño de página para PDF (default 'A4'). 'letter' = 8.5x11in.
   * Solo afecta el PDF; la imagen y el print usan el DOM tal cual.
   */
  pageSize?: 'A4' | 'letter';
  /**
   * Orientación del PDF (default 'portrait'). El alto del componente decide
   * cuántas páginas se generan; en horizontal típicamente entra en una.
   */
  orientation?: 'portrait' | 'landscape';
}

/**
 * Acciones disponibles en el toolbar interno del preview.
 *
 * El cierre del popup NO va aquí: lo provee la X del `ContentDialogComponent`
 * que envuelve al preview, así no duplicamos botones.
 */
export type PreviewExportAction = 'print' | 'pdf' | 'png';
