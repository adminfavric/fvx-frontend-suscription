/** Un ítem de navegación del sidebar (resuelto desde el menú API o el fallback). */
export interface NavItem {
  /** Slug único del ``MenuItem`` (track del @for; evita colisiones si ``route`` viene mal). */
  slug: string;
  icon: string;
  /** Texto plano (fallback del backend); usar ``labelKey`` si hay traducción. */
  label?: string;
  /** Clave i18n (Transloco); tiene prioridad sobre ``label``. */
  labelKey?: string;
  route: string;
}
