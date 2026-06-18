import { Injectable, signal, Type } from '@angular/core';

/**
 * Ancho del cajón. Cualquier valor CSS válido (`'400px'`, `'50vw'`, `'80%'`, etc.).
 * Si se omite, el drawer usa el ancho por defecto del template (ver
 * `--fvx-drawer-width` en `entity-drawer.component.ts`).
 */
type DrawerWidth = string;

/** Detalle vía API (plantilla: solo usuario). */
export interface EntityDrawerUserApiConfig {
  title?: string;
  /** Ver {@link DrawerWidth}. */
  width?: DrawerWidth;
  entityType: 'user';
  entityId: number;
  embedComponent?: never;
  embedInputs?: never;
}

/**
 * Drawer con cualquier componente standalone: sin `GET users` automático;
 * el componente recibe solo los `@Input()` que pases en `embedInputs`.
 */
export interface EntityDrawerEmbedConfig {
  title?: string;
  /** Ver {@link DrawerWidth}. */
  width?: DrawerWidth;
  embedComponent: Type<unknown>;
  embedInputs?: Record<string, unknown>;
  entityType?: never;
  entityId?: never;
}

export type EntityDrawerConfig = EntityDrawerUserApiConfig | EntityDrawerEmbedConfig;

function isValidDrawerConfig(c: EntityDrawerConfig): boolean {
  if (c.embedComponent) {
    return true;
  }
  return c.entityType === 'user' && typeof c.entityId === 'number' && !Number.isNaN(c.entityId);
}

@Injectable({
  providedIn: 'root'
})
export class EntityDrawerService {
  isOpen = signal(false);
  config = signal<EntityDrawerConfig | null>(null);

  open(config: EntityDrawerConfig): void {
    if (!isValidDrawerConfig(config)) {
      console.warn('EntityDrawerService.open: se requiere embedComponent o bien entityType "user" + entityId.');
      return;
    }
    this.config.set(config);
    this.isOpen.set(true);
    // Lock body scroll
    document.body.classList.add('drawer-open-no-scroll');
  }

  close(): void {
    this.isOpen.set(false);
    this.config.set(null);
    // Unlock body scroll
    document.body.classList.remove('drawer-open-no-scroll');
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
