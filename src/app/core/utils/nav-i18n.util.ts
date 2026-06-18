/**
 * Fuente única de mapeo i18n para el menú de navegación.
 *
 * Antes había dos diccionarios duplicados (uno en ``layout.component.ts`` y
 * otro en ``command-registry.service.ts``) que se desincronizaban — el
 * sidebar mostraba "Componentes" pero la paleta de comandos mostraba
 * "Components" porque cada uno consultaba con una lookup key distinta
 * (route vs slug exacto).
 *
 * Este util es la **fuente de verdad** y resuelve por **3 lookup keys** en
 * orden de prioridad:
 *
 *   1. **`route` exacta** (`/users`, `/components`)
 *   2. **`slug` exacto** del backend (`menu-users`, `menu-components`)
 *   3. **`slug` "corto"** sin prefijo `menu-` (`users`, `components`)
 *
 * Para agregar un nav item nuevo basta con:
 *   - Sumar entradas a {@link NAV_ITEM_ROUTE_I18N} y/o {@link NAV_ITEM_SLUG_I18N}
 *   - Sumar la traducción en `en.json` / `es.json` bajo `layout.nav.fallback.*`
 *   - (Opcional) Sumar aliases en {@link NAV_ITEM_KEYWORDS} para que la
 *     búsqueda del palette matchee sinónimos en otro idioma
 */

/** Clave i18n por route absoluta (sin barra inicial cuenta como sin match). */
export const NAV_ITEM_ROUTE_I18N: Readonly<Record<string, string>> = {
  '/dashboard': 'layout.nav.fallback.dashboard',
  '/users': 'layout.nav.fallback.users',
  '/groups': 'layout.nav.fallback.groups',
  '/plans': 'layout.nav.fallback.plans',
  '/customers': 'layout.nav.fallback.customers',
  '/subscriptions': 'layout.nav.fallback.subscriptions',
  '/content': 'layout.nav.fallback.content',
  '/programacion': 'layout.nav.fallback.programacion',
  '/events': 'layout.nav.fallback.events',
  '/messages': 'layout.nav.fallback.messages',
  '/components': 'layout.nav.fallback.components',
};

/**
 * Clave i18n por slug. Incluye tanto el slug "corto" (sin prefijo) como el
 * slug del backend con prefijo `menu-`. Ambos apuntan a la misma clave i18n
 * para tolerar variantes de seed.
 */
export const NAV_ITEM_SLUG_I18N: Readonly<Record<string, string>> = {
  // forma corta (slug interno / fallback estático)
  dashboard: 'layout.nav.fallback.dashboard',
  users: 'layout.nav.fallback.users',
  groups: 'layout.nav.fallback.groups',
  plans: 'layout.nav.fallback.plans',
  customers: 'layout.nav.fallback.customers',
  subscriptions: 'layout.nav.fallback.subscriptions',
  content: 'layout.nav.fallback.content',
  programacion: 'layout.nav.fallback.programacion',
  events: 'layout.nav.fallback.events',
  messages: 'layout.nav.fallback.messages',
  components: 'layout.nav.fallback.components',
  // forma del backend (slug con prefijo menu-)
  'menu-dashboard': 'layout.nav.fallback.dashboard',
  'menu-users': 'layout.nav.fallback.users',
  'menu-groups': 'layout.nav.fallback.groups',
  'menu-plans': 'layout.nav.fallback.plans',
  'menu-customers': 'layout.nav.fallback.customers',
  'menu-subscriptions': 'layout.nav.fallback.subscriptions',
  'menu-content': 'layout.nav.fallback.content',
  'menu-programacion': 'layout.nav.fallback.programacion',
  'menu-events': 'layout.nav.fallback.events',
  'menu-messages': 'layout.nav.fallback.messages',
  'menu-components': 'layout.nav.fallback.components',
};

/** Clave i18n por slug de sección. */
export const NAV_SECTION_SLUG_I18N: Readonly<Record<string, string>> = {
  administration: 'layout.nav.fallback.groupAdministration',
  dev: 'layout.nav.fallback.groupDev',
};

/** Clave i18n por nombre de sección (en lowercase). */
export const NAV_SECTION_NAME_I18N: Readonly<Record<string, string>> = {
  administration: 'layout.nav.fallback.groupAdministration',
  dev: 'layout.nav.fallback.groupDev',
  development: 'layout.nav.fallback.groupDev',
};

/**
 * Aliases / sinónimos por slug. Permiten que la búsqueda del command palette
 * matchee independientemente del idioma de la UI. Ej.: con UI en español,
 * escribir "users" igual encuentra "Usuarios".
 *
 * Se indexan por slug corto (sin prefijo `menu-`) — `keywordsForNavItem`
 * normaliza ambas formas antes de consultar.
 */
export const NAV_ITEM_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  dashboard: ['dashboard', 'panel', 'inicio', 'home', 'kpi', 'metricas'],
  users: ['users', 'usuarios', 'people', 'personas', 'gente', 'cuentas', 'directorio', 'admins'],
  groups: ['groups', 'grupos', 'roles', 'permisos', 'permissions', 'equipos', 'teams'],
  plans: ['plans', 'planes', 'membresias', 'memberships', 'precios', 'pricing', 'flow'],
  customers: ['customers', 'clientes', 'customer', 'cliente', 'flow', 'personas', 'suscriptores'],
  subscriptions: ['subscriptions', 'suscripciones', 'subscription', 'suscripcion', 'flow', 'cobros', 'recurrente'],
  components: ['components', 'componentes', 'widgets', 'showcase', 'controles', 'patrones', 'design'],
};

/**
 * Devuelve la clave i18n para un item del menú.
 *
 * **Identidad por SLUG, no por route.** El slug en Django es único por
 * MenuItem (auto-generado del name). La route en cambio puede compartirse
 * entre items (caso degenerado, pero permitido por el schema). Si
 * priorizáramos route, un MenuItem nuevo con route ``/components`` pero
 * name distinto ("Prueba") recibiría el label canónico "Components" —
 * hijacking accidental.
 *
 * Lookup en orden:
 *
 *   1. **slug exacto** del backend (`menu-users`, `menu-components`)
 *   2. **slug "corto"** sin prefijo `menu-` (`users`, `components`)
 *      — útil para items del fallback estático que usan slug corto
 *   3. **route** como red de seguridad cuando no hay slug
 *      (poco común, pero blinda el caso de items sin slug definido)
 *
 * Si nada matchea, retorna `undefined` y el caller usa el `name` raw del
 * backend (que es exactamente lo que quiere un MenuItem custom).
 */
export function labelKeyForMenuItem(
  route: string,
  slug: string | undefined | null,
): string | undefined {
  if (slug) {
    const slugLower = slug.toLowerCase();
    const fromSlug = NAV_ITEM_SLUG_I18N[slugLower];
    if (fromSlug) return fromSlug;

    // Slug con prefijo "menu-" → probar la versión corta
    if (slugLower.startsWith('menu-')) {
      const fromShort = NAV_ITEM_SLUG_I18N[slugLower.slice(5)];
      if (fromShort) return fromShort;
    }
    // Si hay slug pero no matcheó ningún canónico, NO consultamos por route:
    // significa que es un MenuItem nuevo del admin y debe respetar su ``name``.
    return undefined;
  }

  // Solo cuando el item no tiene slug, intentamos por route como último recurso.
  return NAV_ITEM_ROUTE_I18N[route];
}

/** Devuelve la clave i18n para una sección, por slug o por nombre. */
export function labelKeyForMenuSection(
  slug: string | undefined | null,
  name: string | undefined | null,
): string | undefined {
  if (slug) {
    const fromSlug = NAV_SECTION_SLUG_I18N[slug.toLowerCase()];
    if (fromSlug) return fromSlug;
  }
  const n = name?.trim().toLowerCase();
  if (n) return NAV_SECTION_NAME_I18N[n];
  return undefined;
}

/**
 * Devuelve los aliases de búsqueda para un item, normalizando el slug a su
 * forma corta. Si el slug no está en el mapa de keywords, retorna un array
 * vacío (el caller suele agregar el `name` raw como fallback para que el
 * usuario al menos pueda matchear con el texto visible).
 */
export function keywordsForNavItem(slug: string | undefined | null): readonly string[] {
  if (!slug) return [];
  const s = slug.toLowerCase();
  const direct = NAV_ITEM_KEYWORDS[s];
  if (direct) return direct;
  if (s.startsWith('menu-')) {
    return NAV_ITEM_KEYWORDS[s.slice(5)] ?? [];
  }
  return [];
}
