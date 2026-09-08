import { ColumnChip, ColumnChipVariant } from './api.model';

/**
 * Catálogo único de los tipos de una pieza de contenido (`ContentItem.kind` en
 * el backend). Vive aquí, y no repetido en cada pantalla, para que la etiqueta,
 * el color y el icono de "Video" sean los mismos en la biblioteca, en la
 * programación y en los formularios.
 *
 * Los colores están escogidos para distinguirse entre sí, no para significar un
 * estado: rojo en "PDF" no es un error, es la convención de Acrobat.
 */
export interface ContentKindMeta {
  value: string;
  /** Etiqueta corta, la que va en la tabla y en el chip. */
  label: string;
  /** Etiqueta larga para los desplegables del formulario. */
  formLabel?: string;
  variant: ColumnChipVariant;
  icon: string;
}

export const CONTENT_KINDS: ContentKindMeta[] = [
  { value: 'video', label: 'Video', variant: 'info', icon: 'movie' },
  { value: 'audio', label: 'Audio', variant: 'warn', icon: 'headphones' },
  { value: 'pdf', label: 'PDF', formLabel: 'PDF / documento', variant: 'danger', icon: 'picture_as_pdf' },
  { value: 'text', label: 'Texto', variant: 'muted', icon: 'notes' },
  { value: 'image', label: 'Imagen', variant: 'accent', icon: 'image' },
  { value: 'zoom', label: 'Zoom', formLabel: 'Sesión Zoom (en vivo)', variant: 'success', icon: 'videocam' },
  { value: 'link', label: 'Enlace', variant: 'teal', icon: 'link' },
];

const BY_VALUE = new Map(CONTENT_KINDS.map(k => [k.value, k]));

export function contentKind(value: string | undefined | null): ContentKindMeta | undefined {
  return value ? BY_VALUE.get(value) : undefined;
}

/** Etiqueta del tipo; si es uno desconocido, devuelve el valor crudo. */
export function contentKindLabel(value: string | undefined | null): string {
  return contentKind(value)?.label ?? (value || '—');
}

/** Chip de color del tipo, listo para una columna `type: 'chips'`. */
export function contentKindChips(value: string | undefined | null): ColumnChip[] {
  const meta = contentKind(value);
  if (!meta) return value ? [{ label: value, variant: 'neutral' }] : [];
  return [{ label: meta.label, variant: meta.variant, icon: meta.icon }];
}

/** Opciones para un filtro `select` de la tabla. */
export const CONTENT_KIND_FILTER_OPTIONS = CONTENT_KINDS.map(k => ({ value: k.value, label: k.label }));

/** Opciones para el desplegable "Tipo" de los formularios (etiqueta larga). */
export const CONTENT_KIND_FORM_OPTIONS = CONTENT_KINDS.map(k => ({ value: k.value, label: k.formLabel ?? k.label }));
