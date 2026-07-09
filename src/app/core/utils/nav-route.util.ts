import type { MenuSectionDto } from '../models/menu.model';

/**
 * Rutas permitidas en UI cuando el menú API falla o viene vacío (mismo criterio que
 * el fallback de ``LayoutComponent`` y sus grupos `DEFAULT_NAV_GROUPS`).
 */
export const FALLBACK_MENU_PATHS: readonly string[] = [
  '/admin/plans',
  '/admin/customers',
  '/admin/subscriptions',
  '/admin/content',
  '/admin/programacion',
  '/admin/events',
  '/admin/messages',
  '/admin/components',
];

/**
 * Alinea rutas del menú con ``app.routes.ts`` (API puede traer singular, sin ``/``, etc.).
 * Duplicada desde layout para reutilizar en `MenuService` (guard) y en el propio layout.
 *
 * El panel de administración vive bajo ``/admin`` (la raíz es el sitio público),
 * por eso toda ruta de menú se prefija con ``/admin`` salvo que ya lo traiga.
 */
export function normalizeNavRoute(route: string | null | undefined): string | null {
  const raw = (route ?? '').trim();
  if (!raw) {
    return null;
  }
  let path = raw.startsWith('/') ? raw : `/${raw}`;
  if (!path.startsWith('/admin')) {
    path = `/admin${path}`;
  }
  return path;
}

export function collectMenuRoutesFromSections(sections: MenuSectionDto[]): string[] {
  const out: string[] = [];
  for (const s of sections) {
    for (const it of s.items) {
      const r = normalizeNavRoute(it.route);
      if (r) {
        out.push(r);
      }
    }
  }
  return out;
}

/**
 * Construye el conjunto de “bases” de ruta permitidas según el mismo criterio que el sidebar.
 */
export function allowedPathPrefixesForMenu(sections: MenuSectionDto[], loadFailed: boolean): string[] {
  if (loadFailed || sections.length === 0) {
    return [...FALLBACK_MENU_PATHS];
  }
  return collectMenuRoutesFromSections(sections);
}
