/**
 * Permisos de la tabla CRUD por rol — funciones PURAS extraídas de
 * `BaseCrudComponent` (antes ~6 métodos privados mezclados con el resto).
 *
 * Reglas (sin cambios respecto al comportamiento histórico):
 *   · `is_staff` → puede todo.
 *   · acciones de EDICIÓN (crear/editar/activar/exportar) → rol ≥ EDITOR.
 *   · acción de BORRADO → rol ≥ ADMIN.
 *   · una `TableAction` puede declarar su propio umbral con `minUiRole`.
 *
 * Reciben el `AuthService` como argumento (no `this`) para ser testeables en
 * aislamiento. El `BaseCrudComponent` solo las orquesta.
 */
import type { AuthService } from '../../core/services/auth.service';
import type { TableAction } from '../../core/models/api.model';
import type { UiRole } from '../../core/models/ui-role';

/** Acciones de editor (crear / editar / activar / exportar): rol ≥ EDITOR. */
export function canDoEditorActions(auth: AuthService): boolean {
  const u = auth.user();
  if (!u) return false;
  if (u.is_staff) return true;
  return auth.minRoleAtLeast('EDITOR');
}

/** Acción de borrado: rol ≥ ADMIN. */
export function canDoDeleteAction(auth: AuthService): boolean {
  const u = auth.user();
  if (!u) return false;
  if (u.is_staff) return true;
  return auth.minRoleAtLeast('ADMIN');
}

/** Umbral efectivo de una acción: el declarado, o el default por tipo de acción. */
function minRoleForAction(action: string, declared?: UiRole): UiRole {
  return declared ?? (action === 'delete' ? 'ADMIN' : 'EDITOR');
}

/** Filtra la botonera de la fila según el rol del usuario actual. */
export function filterActionsByRole(auth: AuthService, all: TableAction[]): TableAction[] {
  return all.filter((a) => {
    const min = minRoleForAction(a.action, a.minUiRole);
    return min === 'ADMIN' ? canDoDeleteAction(auth) : canDoEditorActions(auth);
  });
}

/** ¿Puede el usuario ejecutar `action`? (staff siempre; resto por umbral). */
export function isActionKeyPermitted(
  auth: AuthService,
  actions: TableAction[],
  action: string,
): boolean {
  if (auth.user()?.is_staff) return true;
  const def = actions.find((a) => a.action === action);
  const min = minRoleForAction(action, def?.minUiRole);
  return min === 'ADMIN' ? canDoDeleteAction(auth) : canDoEditorActions(auth);
}
