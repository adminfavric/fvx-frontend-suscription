/**
 * User interface aligned with the custom User model on the backend.
 *
 * After the custom-user refactor, fields previously nested under ``profile``
 * (role, phone, photo_url, verified, ui_preferences) live directly on the
 * User. Read them as ``user.role`` / ``user.phone`` / ``user.photo_url``.
 */
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  /** Si el serializer lo expone; si no, componer desde ``first_name`` / ``last_name`` o ``username``. */
  full_name?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser?: boolean;
  date_joined: string;
  last_login?: string | null;

  // Campos absorbidos del antiguo Profile
  role: string;
  /** Etiqueta traducida del rol (derivada por el serializer). */
  role_label?: string;
  phone: string;
  photo_url: string;
  verified: boolean;
  /** Preferencias de shell (tema, ancho, idioma, panel); ver ``GET/PATCH me/ui-preferences/``. */
  ui_preferences?: Record<string, unknown>;
}

export const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VIEWER', label: 'Viewer' },
];
