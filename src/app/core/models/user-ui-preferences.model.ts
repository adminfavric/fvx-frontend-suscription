/** Densidad (alto de fila) de las tablas de datos. Global del usuario. */
export type TableDensity = 'compact' | 'normal';

/** Contrato con ``GET/PATCH /api/v1/me/ui-preferences/`` (snake_case). */
export interface UserUiPreferencesPayload {
  theme_id?: string | null;
  page_content_width?: 'compact' | 'extended';
  ui_lang?: 'en' | 'es';
  appearance_section_expanded?: boolean;
  /** Alto de fila de las tablas; el front arranca en 'compact' si falta. */
  table_density?: TableDensity;
  /**
   * Hasta 5 slugs de ``MenuItem`` favoritos. La posición en el array es el
   * orden visual en la sección "Favoritos" del sidebar. Validado backend en
   * ``api/shell/ui_preferences.py``.
   */
  favorite_menu_items?: string[];
}

/** Tope de favoritos (espejo de ``ALLOWED_FAVORITES_MAX`` en backend). */
export const MAX_FAVORITE_MENU_ITEMS = 5;
