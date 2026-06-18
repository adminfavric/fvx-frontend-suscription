/**
 * Sincronización del estado de tabla (paginación / búsqueda / orden / filtros)
 * con los query-params del URL — extraída de `BaseCrudComponent`.
 *
 * Funciones PURAS (sin signals ni Router): el componente lee/escribe sus signals
 * y llama al router; aquí solo se PARSEA el URL → estado y se CONSTRUYE el objeto
 * de query-params → URL. Testeable en aislamiento.
 */
import type { Params } from '@angular/router';
import type { FilterConfig } from '../../core/models/api.model';

/** Estado de tabla persistible en el URL. */
export interface CrudUrlState {
  pageIndex: number;
  pageSize: number;
  search: string;
  ordering: string;
  filters: Record<string, unknown>;
}

const RESERVED = new Set(['page', 'page_size', 'search', 'ordering']);

/** Nombres de query-param de los filtros conocidos (paramName ?? key). */
function filterKeys(filterConfigs: FilterConfig[]): Set<string> {
  return new Set(filterConfigs.map((f) => f.paramName || f.key));
}

/**
 * Parsea los query-params del URL a estado parcial. Solo devuelve las claves
 * presentes/válidas; el llamador aplica cada una a su signal (deja intactas las
 * ausentes). El default de pageSize (20) y los valores vacíos no se fuerzan aquí.
 */
export function readUrlState(
  params: Params,
  filterConfigs: FilterConfig[],
): Partial<CrudUrlState> {
  const out: Partial<CrudUrlState> = {};

  const pageRaw = params['page'];
  if (pageRaw != null && pageRaw !== '') {
    const n = Number(pageRaw);
    if (Number.isInteger(n) && n >= 1) out.pageIndex = n - 1;
  }

  const sizeRaw = params['page_size'];
  if (sizeRaw != null && sizeRaw !== '') {
    const n = Number(sizeRaw);
    if (Number.isInteger(n) && n > 0 && n <= 200) out.pageSize = n;
  }

  if (typeof params['search'] === 'string' && params['search']) out.search = params['search'];
  if (typeof params['ordering'] === 'string' && params['ordering']) out.ordering = params['ordering'];

  const known = filterKeys(filterConfigs);
  const fromUrl: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (RESERVED.has(key) || !known.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    fromUrl[key] = value;
  }
  if (Object.keys(fromUrl).length > 0) out.filters = fromUrl;

  return out;
}

/**
 * Construye el objeto de query-params para `router.navigate`. Omite los valores
 * por defecto (página 1, pageSize 20, búsqueda/orden vacíos) poniéndolos a `null`
 * para no ensuciar el URL. `null` indica a Angular que quite la clave.
 */
export function buildUrlQueryParams(
  state: CrudUrlState,
  filterConfigs: FilterConfig[],
): Record<string, string | null> {
  const qp: Record<string, string | null> = {
    page: state.pageIndex > 0 ? String(state.pageIndex + 1) : null,
    page_size: state.pageSize !== 20 ? String(state.pageSize) : null,
    search: state.search || null,
    ordering: state.ordering || null,
  };
  for (const key of filterKeys(filterConfigs)) {
    if (RESERVED.has(key)) continue;
    const value = state.filters[key];
    qp[key] = value === undefined || value === null || value === '' ? null : String(value);
  }
  return qp;
}
