import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'fvx-page-content-width';

/** Ancho máximo y estilo shell del bloque ``.page-container`` (preferencia de usuario). */
export type FvxPageContentWidth = 'compact' | 'extended';

@Injectable({ providedIn: 'root' })
export class PageContentWidthService {
  readonly currentMode = signal<FvxPageContentWidth>('compact');

  initFromStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'extended') {
      this.apply('extended');
    } else {
      this.apply('compact');
    }
  }

  setMode(mode: FvxPageContentWidth): void {
    localStorage.setItem(STORAGE_KEY, mode);
    this.apply(mode);
  }

  isValidMode(s: string): s is FvxPageContentWidth {
    return s === 'compact' || s === 'extended';
  }

  private apply(mode: FvxPageContentWidth): void {
    const root = document.documentElement;
    if (mode === 'extended') {
      root.classList.add('fvx-page-width-extended');
    } else {
      root.classList.remove('fvx-page-width-extended');
    }
    this.currentMode.set(mode);
  }
}
