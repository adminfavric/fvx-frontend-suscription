import { DestroyRef, inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * Interfaz que el componente implementa para opt-in al guard.
 *
 * `hasUnsavedChanges()` se llama cada vez que el usuario intenta abandonar la
 * ruta. Si devuelve `true`, el guard muestra un diálogo de confirmación.
 */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Guard `CanDeactivate` opt-in.
 *
 * Aplicación: añadir `canDeactivate: [unsavedChangesGuard]` en la ruta y que
 * el componente `implements HasUnsavedChanges`. Sin ambas piezas, el guard es
 * inerte (devuelve `true`).
 *
 * Para forms en `MatDialog` (CRUD edit) o en el `EntityDrawer` (perfil): este
 * guard no aplica porque no hay navegación de ruta; usa
 * {@link bindBeforeUnloadWarning} para protección contra recarga/cierre del
 * navegador.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = async (
  component,
) => {
  if (!component || typeof component.hasUnsavedChanges !== 'function') {
    return true;
  }
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  const dialog = inject(MatDialog);
  const transloco = inject(TranslocoService);

  const ref = dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean | undefined>(
    ConfirmDialogComponent,
    {
      data: {
        title: transloco.translate('unsavedChanges.title'),
        message: transloco.translate('unsavedChanges.message'),
        confirmText: transloco.translate('unsavedChanges.leave'),
        cancelText: transloco.translate('unsavedChanges.stay'),
        color: 'warn',
      },
    },
  );

  const result = await firstValueFrom(ref.afterClosed());
  return result === true;
};

/**
 * Vincula al ciclo de vida del componente un listener `beforeunload` que
 * avisa al usuario si intenta **recargar el navegador, cerrar la pestaña o
 * salir del dominio** mientras hay cambios pendientes. Complementa al
 * {@link unsavedChangesGuard} (que solo cubre navegación dentro de Angular).
 *
 * El navegador muestra su propio diálogo nativo (no personalizable). Solo se
 * dispara si `component.hasUnsavedChanges()` devuelve `true` en el momento
 * del evento.
 *
 * @example
 * ```ts
 * export class MyEditor implements HasUnsavedChanges {
 *   constructor() {
 *     bindBeforeUnloadWarning(this, inject(DestroyRef));
 *   }
 *   hasUnsavedChanges() { return this.form.dirty; }
 * }
 * ```
 */
export function bindBeforeUnloadWarning(
  component: HasUnsavedChanges,
  destroyRef: DestroyRef,
): void {
  const handler = (event: BeforeUnloadEvent): void => {
    if (component.hasUnsavedChanges()) {
      event.preventDefault();
      // Required by legacy spec (no se muestra al usuario; el navegador usa su mensaje propio).
      event.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handler);
  destroyRef.onDestroy(() => {
    window.removeEventListener('beforeunload', handler);
  });
}
