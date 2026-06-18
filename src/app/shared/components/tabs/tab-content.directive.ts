import { Directive, Input, TemplateRef } from '@angular/core';

/**
 * Marca un `<ng-template>` como contenido de una tab identificada por `key`.
 *
 * ```html
 * <app-tabs [tabs]="tabs" [(activeKey)]="current">
 *   <ng-template appTabContent="overview">...overview...</ng-template>
 *   <ng-template appTabContent="details">...details...</ng-template>
 * </app-tabs>
 * ```
 */
@Directive({
  selector: '[appTabContent]',
  standalone: true,
})
export class TabContentDirective {
  @Input('appTabContent') key!: string;

  constructor(public template: TemplateRef<unknown>) {}
}
