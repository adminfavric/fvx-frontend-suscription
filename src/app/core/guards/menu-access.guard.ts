import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { MenuService } from '../services/menu.service';

/**
 * Asegura que el usuario no entre a URLs de feature por carga directa si su ``menu_item`` no
 * se lo permite (mismo criterio que el sidebar, alimentado por ``GET /menus/tree/`` y fallback).
 * Depende de ``MenuService.ensureLoaded()``, que debe resolverse antes (las guardas corren
 * antes de instanciar ``Layout``).
 */
export const menuAccessGuard: CanActivateFn = async (_route, state): Promise<boolean | UrlTree> => {
  const menu = inject(MenuService);
  const router = inject(Router);
  await menu.ensureLoaded();
  if (menu.isPathAllowed(state.url)) {
    return true;
  }
  // Sin acceso a esta ruta → a la primera página que SÍ puede ver (no al panel,
  // que puede estar restringido para usuarios con acceso limitado).
  return router.createUrlTree([menu.firstAllowedPath()]);
};
