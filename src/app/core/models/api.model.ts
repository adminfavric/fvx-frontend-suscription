export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface QueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface FieldConfig {
  key: string;
  /** i18n key (Transloco); if set, overrides `label` in UI. */
  labelKey?: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'multiselect' | 'textarea' | 'boolean' | 'date' | 'datetime' | 'password' | 'autocomplete' | 'image' | 'file';
  /** Para type 'file'/'image': filtro de tipos aceptados (atributo accept del input). */
  accept?: string;
  /**
   * Valor inicial desde la entidad por ruta con puntos (p. ej. `profile.profile_role`).
   * Si no se define, se usa `entity[key]`.
   */
  initialFrom?: string;
  /** Si no hay valor en la entidad / path, usar esto (p. ej. rol por defecto en altas). */
  defaultValue?: unknown;
  /** Si es true, el control se crea deshabilitado (el valor sigue saliendo en `getRawValue()` al guardar). */
  disabled?: boolean;
  required?: boolean;
  options?: { value: any; label: string }[];
  validators?: any[];
  hint?: string;
  /** Texto de ayuda mostrado en un ícono de info (tooltip) junto a la etiqueta. */
  info?: string;
  placeholder?: string;
  colspan?: number;
}

export interface ColumnConfig {
  key: string;
  labelKey?: string;
  label: string;
  type?: 'text' | 'boolean' | 'date' | 'chip' | 'link';
  chipMap?: Record<string, string>;
  format?: string;
  sortable?: boolean;
  render?: (row: any) => string;
}

/**
 * Clave de acción de fila. Las built-in del CRUD autocompletan y evitan typos
 * en las comunes; ``(string & {})`` deja seguir usando claves propias del
 * proyecto (custom actions) sin romper el tipo.
 */
export type TableActionKey = 'edit' | 'delete' | 'toggle_active' | 'view' | (string & {});

export interface TableAction {
  icon: string;
  labelKey?: string;
  label: string;
  color?: string;
  action: TableActionKey;
  condition?: (row: any) => boolean;
  /** Si existe, sustituye `icon` según la fila (p. ej. toggle_on / toggle_off). */
  iconForRow?: (row: any) => string;
  /** Si existe, sustituye el tooltip (`label` / `labelKey` como respaldo). */
  tooltipForRow?: (row: any) => string;
  /** i18n para fila con `is_active` (p. ej. desactivar vs activar). */
  tooltipKeyWhenActive?: string;
  tooltipKeyWhenInactive?: string;
  /** i18n del tooltip; si no hay `tooltipForRow` ni claves de toggle, se usa. */
  tooltipKey?: string;
  /** Si existe, sustituye el `color` del mat-icon-button por fila. */
  colorForRow?: (row: any) => 'primary' | 'accent' | 'warn' | undefined;
  /**
   * Rol mínimo de ``profile.role`` para mostrar el botón (``is_staff`` en Django pasa siempre).
   * Omisión: `delete` → `ADMIN`; el resto (``edit``, ``toggle_active``, …) → `EDITOR`.
   */
  minUiRole?: 'EDITOR' | 'ADMIN';
  /**
   * Si `true`, la acción se renderiza como botón visible inline en la columna Acciones
   * (texto + icono). Las acciones sin este flag van a un menú kebab (`⋮`).
   *
   * Convención por defecto: si **ninguna** acción del array tiene `primary: true`,
   * la primera de la lista pasa a ser primaria automáticamente (las demás al kebab).
   * Para forzar "todas en kebab", marcar `primary: false` explícito en todas.
   */
  primary?: boolean;
}

export interface FilterConfig {
  key: string;
  labelKey?: string;
  label: string;
  type: 'select' | 'boolean' | 'text';
  options?: { value: any; label: string; labelKey?: string }[];
  paramName?: string; // API query param name, defaults to key
}

export interface RelationshipConfig {
  label: string;              // Etiqueta del vínculo (p. ej. "Sitios vinculados")
  icon: string;               // Icono Material del botón de acción
  endpoint: string;           // Recurso pivot DRF, p. ej. 'memberships'
  localKey: string;           // FK hacia esta entidad, p. ej. 'user_id'
  remoteKey: string;          // FK hacia la entidad remota, p. ej. 'site_id'
  remoteEndpoint: string;     // Listado/búsqueda del remoto, p. ej. 'sites'
  remoteDisplayField: string; // Campo mostrado, p. ej. 'site_name'
  remoteDetailKey?: string;   // Detalle anidado opcional, p. ej. 'site_detail'
  extraFields?: FieldConfig[];// Extra fields on the pivot table: relationship_type, employment_type, etc.
  filters?: Record<string, any>; // Extra default filters: { is_current: true }
}
