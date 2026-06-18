/** `localStorage` key for active UI language (must match initializer + layout toggle). */
export const FVX_LANG_STORAGE_KEY = 'fvx_lang';

export type FvxUiLang = 'en' | 'es';

export function readStoredLang(): FvxUiLang | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const v = localStorage.getItem(FVX_LANG_STORAGE_KEY);
  return v === 'en' || v === 'es' ? v : null;
}

export function persistLang(lang: FvxUiLang): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(FVX_LANG_STORAGE_KEY, lang);
}

/**
 * Mapea la lista de idiomas del navegador (`navigator.languages` / `navigator.language`)
 * al primer código soportado por la app (`en` o `es`). Equivale a usar la preferencia
 * del usuario que en HTTP va en `Accept-Language`, sin necesidad de una petición.
 */
export function browserPreferredUiLang(): FvxUiLang | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const list: string[] = [];
  if (Array.isArray(navigator.languages) && navigator.languages.length) {
    list.push(...navigator.languages);
  }
  if (navigator.language) {
    list.push(navigator.language);
  }
  const seen = new Set<string>();
  for (const raw of list) {
    if (!raw || seen.has(raw)) {
      continue;
    }
    seen.add(raw);
    const base = raw.split('-')[0]?.toLowerCase() ?? '';
    if (base === 'es') {
      return 'es';
    }
    if (base === 'en') {
      return 'en';
    }
  }
  return null;
}

/**
 * Idioma al arrancar: `localStorage` si existe; si no, primer match del navegador; si no, `en`.
 */
export function resolveInitialUiLang(): FvxUiLang {
  return readStoredLang() ?? browserPreferredUiLang() ?? 'en';
}
