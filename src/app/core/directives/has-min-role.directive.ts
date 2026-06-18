import { Directive, TemplateRef, ViewContainerRef, inject, effect, input } from '@angular/core';
import { AuthService } from '../services/auth.service';
import type { UiRole } from '../models/ui-role';

/**
 * Structural directive: renders the template when the current user's effective
 * ``profile.role`` (from API) is at least ``appHasMinRole`` (staff always passes).
 *
 * @example
 * ```html
 * <button *appHasMinRole="'ADMIN'">Delete</button>
 * ```
 */
@Directive({
  selector: '[appHasMinRole]',
  standalone: true,
})
export class HasMinRoleDirective {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  appHasMinRole = input.required<UiRole>();

  constructor() {
    effect(() => {
      this.auth.user();
      const min = this.appHasMinRole();
      this.vcr.clear();
      if (this.auth.minRoleAtLeast(min)) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
