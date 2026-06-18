import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

import type { Permission } from '../auth/permissions';
import { AuthService } from '../services/auth.service';

/**
 * Structural directive: renders the template when the current user holds the
 * given granular permission (`feature.action`). Use this when the check is a
 * capability — for jerárquico checks ("at least EDITOR"), `*appHasMinRole`
 * remains the right tool.
 *
 * @example
 * ```html
 * <button mat-icon-button *appCan="'users.delete'">Delete</button>
 * ```
 */
@Directive({
  selector: '[appCan]',
  standalone: true,
})
export class CanDirective {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  appCan = input.required<Permission>();

  constructor() {
    effect(() => {
      this.auth.user();
      const permission = this.appCan();
      this.vcr.clear();
      if (this.auth.can(permission)) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
