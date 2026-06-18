import { InjectionToken, Provider } from '@angular/core';

export type CommandGroup = 'actions' | 'navigation' | 'entities';

export interface CommandItem {
  /** Identificador único (`'nav:users'`, `'action:signout'`, etc.). */
  id: string;
  group: CommandGroup;
  /** Texto visible (ya traducido por quien construye el comando). */
  label: string;
  /** Texto auxiliar a la derecha (ej. "Usuario", "Sección Administration"). */
  hint?: string;
  /** Material icon ligature. */
  icon?: string;
  /** Etiqueta de teclado mostrada a la derecha (sin acción asociada). */
  shortcut?: string;
  /**
   * Aliases para que la búsqueda matchee aunque el usuario escriba en otro
   * idioma o sinónimos. Ej. `['users', 'people', 'cuentas']` permite encontrar
   * "Usuarios" tanto escribiendo "users" como "cuentas". La búsqueda normaliza
   * mayúsculas + diacríticos antes de comparar (ver CommandPaletteComponent).
   */
  keywords?: string[];
  /** Predicado opcional; si devuelve `false`, se oculta. Útil para items por rol. */
  canShow?: () => boolean;
  /** Acción al elegir el comando (Enter o click). El palette se cierra antes de ejecutar. */
  run: () => void;
}

/**
 * Función que produce comandos. Se llama cada vez que el palette se abre,
 * de modo que el set puede ser reactivo (depender de signals como menú o auth).
 */
export type CommandSource = () => CommandItem[];

/**
 * Multi-token: features registran fuentes adicionales con {@link provideCommands}.
 * Tipo `CommandSource[]` porque Angular agrega todos los `multi: true` en un array.
 */
export const COMMAND_SOURCES = new InjectionToken<CommandSource[]>('COMMAND_SOURCES');

/**
 * Helper para registrar comandos desde `app.config.ts` o desde `providers:` de una ruta lazy.
 *
 * ```ts
 * providers: [
 *   provideCommands(() => [
 *     { id: 'invoice:new', group: 'actions', label: 'New invoice', icon: 'add',
 *       run: () => router.navigate(['/invoices/new']) },
 *   ]),
 * ]
 * ```
 */
export function provideCommands(source: CommandSource): Provider {
  return { provide: COMMAND_SOURCES, useValue: source, multi: true };
}
