import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import type { Permission } from '../auth/permissions';
import type { UiRole } from '../models/ui-role';
import { AuthService } from '../services/auth.service';

/**
 * Route-level role check. Use AFTER `authGuard` so we know the user is logged
 * in; if the user's effective role is below `minRole`, redirects to
 * `/forbidden` (the layout-aware system page set up in Tanda 2).
 *
 * ```ts
 * { path: 'audit-log', canActivate: [authGuard, roleGuard('ADMIN')], ... }
 * ```
 */
export function roleGuard(minRole: UiRole): CanActivateFn {
  return (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.minRoleAtLeast(minRole) ? true : router.createUrlTree(['/forbidden']);
  };
}

/**
 * Route-level granular permission check. Same redirect target as
 * {@link roleGuard}. Prefer this over `roleGuard` when the access criterion is
 * a specific capability rather than a level in the role hierarchy.
 *
 * ```ts
 * { path: 'reports/export', canActivate: [authGuard, permissionGuard('reports.export')] }
 * ```
 */
export function permissionGuard(permission: Permission): CanActivateFn {
  return (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.can(permission) ? true : router.createUrlTree(['/forbidden']);
  };
}
