import type { UiRole } from '../models/ui-role';

/**
 * Granular permission keys consumed by `AuthService.can()`, the `*appCan`
 * directive and `permissionGuard()`. The naming convention is `feature.action`.
 *
 * Add new keys here as the template grows; concrete apps may extend the union
 * via TypeScript module augmentation if they need their own permissions.
 */
export type Permission =
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'users.export'
  | 'groups.read'
  | 'groups.create'
  | 'groups.update'
  | 'groups.delete'
  | 'plans.read'
  | 'plans.create'
  | 'plans.update'
  | 'plans.delete'
  | 'menu.manage'
  | 'settings.manage';

/**
 * Static map permission → minimum UI role. While the backend does not expose a
 * per-user permission list (`user_permissions` / `Profile.permissions`), this
 * mapping is the single source of truth for `AuthService.can()`.
 *
 * When the backend starts shipping permissions per user, swap the body of
 * `AuthService.can()` to read that list and leave this map in place as a
 * fallback / documentation of intent.
 */
export const PERMISSION_MIN_ROLE: Record<Permission, UiRole> = {
  'users.read':         'VIEWER',
  'users.create':       'EDITOR',
  'users.update':       'EDITOR',
  'users.delete':       'ADMIN',
  'users.export':       'EDITOR',
  'groups.read':        'VIEWER',
  'groups.create':      'EDITOR',
  'groups.update':      'EDITOR',
  'groups.delete':      'ADMIN',
  'plans.read':         'VIEWER',
  'plans.create':       'EDITOR',
  'plans.update':       'EDITOR',
  'plans.delete':       'ADMIN',
  'menu.manage':        'ADMIN',
  'settings.manage':    'ADMIN',
};
