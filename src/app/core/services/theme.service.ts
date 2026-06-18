import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'fvx-theme-id';

/** `tmp-default`: sin clase en `<html>`; solo variables base en SCSS. */
export type FvxThemeId =
  | 'tmp-default'
  | 'tmp-light'
  | 'tmp-dark'
  | 'tmp-blackandwhite'
  | 'tmp-beige';

const THEME_CLASSES = [
  'theme-tmp-light',
  'theme-tmp-dark',
  'theme-tmp-blackandwhite',
  'theme-tmp-beige',
] as const;

/** Orden en la botonera: ``tmp-default`` primero (shell base / lateral oscuro). */
const ALL_IDS: FvxThemeId[] = [
  'tmp-default',
  'tmp-light',
  'tmp-dark',
  'tmp-blackandwhite',
  'tmp-beige',
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Id efectivo tras `initFromStorage` / `setTheme`. */
  readonly currentId = signal<FvxThemeId>('tmp-default');

  /** Aplica preferencia guardada o deja default (sin clase). */
  initFromStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    const id = raw ? this.normalizeStoredThemeId(raw) : null;
    if (id && this.isValidId(id)) {
      if (raw !== id) {
        localStorage.setItem(STORAGE_KEY, id);
      }
      this.apply(id);
      return;
    }
    this.apply('tmp-default');
  }

  /** Migra ids antiguos guardados (p. ej. API o ``localStorage`` con nombre previo del tema). */
  normalizeStoredThemeId(s: string): string {
    if (s === 'tmp-hybrid') return 'tmp-default';
    return s;
  }

  setTheme(id: FvxThemeId): void {
    this.apply(id);
    localStorage.setItem(STORAGE_KEY, id);
    this.currentId.set(id);
  }

  /** Etiqueta para menús (i18n puede sustituir después). */
  label(id: FvxThemeId): string {
    switch (id) {
      case 'tmp-default':
        return 'Default (base)';
      case 'tmp-light':
        return 'tmp-light';
      case 'tmp-dark':
        return 'tmp-dark';
      case 'tmp-blackandwhite':
        return 'tmp-blackandwhite';
      case 'tmp-beige':
        return 'tmp-beige';
    }
  }

  readonly options: FvxThemeId[] = ALL_IDS;

  /** Para validar `theme_key` desde `GET settings/ui/`. */
  isValidThemeKey(s: string): s is FvxThemeId {
    return (ALL_IDS as string[]).includes(s);
  }

  private isValidId(s: string): s is FvxThemeId {
    return this.isValidThemeKey(s);
  }

  private apply(id: FvxThemeId): void {
    const root = document.documentElement;
    for (const c of THEME_CLASSES) {
      root.classList.remove(c);
    }
    if (id === 'tmp-default') {
      this.currentId.set('tmp-default');
      return;
    }
    root.classList.add(`theme-${id}`);
    this.currentId.set(id);
  }
}
