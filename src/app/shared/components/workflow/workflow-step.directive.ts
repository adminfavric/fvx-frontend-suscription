import { Directive, Input, TemplateRef } from '@angular/core';

/**
 * Marca un `<ng-template>` como contenido de un step del `app-workflow`.
 *
 * ```html
 * <app-workflow [steps]="steps" ...>
 *   <ng-template appWorkflowStep="customer">...form...</ng-template>
 *   <ng-template appWorkflowStep="payment">...form...</ng-template>
 * </app-workflow>
 * ```
 */
@Directive({
  selector: '[appWorkflowStep]',
  standalone: true,
})
export class WorkflowStepDirective {
  @Input('appWorkflowStep') key!: string;

  constructor(public template: TemplateRef<unknown>) {}
}
