import {
  AfterContentInit,
  Component,
  ContentChildren,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { WorkflowStepDirective } from './workflow-step.directive';

export interface WorkflowStep {
  /** Clave estable (matchea `appWorkflowStep="..."`). */
  key: string;
  label: string;
  icon?: string;
  /** Marca el step como completado (visual tick). */
  completed?: boolean;
  /** Si `false`, no se puede volver a editar (solo lectura). */
  editable?: boolean;
  /** Tag opcional bajo el label. */
  hint?: string;
}

export type WorkflowEvent =
  | { type: 'next'; fromIndex: number; toIndex: number; key: string }
  | { type: 'previous'; fromIndex: number; toIndex: number; key: string }
  | { type: 'reset' }
  | { type: 'complete' };

/**
 * Wrapper de `mat-stepper` (horizontal/vertical) con API declarativa y botonera
 * integrada (Previous / Next / Finish). Cada step expone su contenido via
 * `<ng-template appWorkflowStep="key">`.
 *
 * ```html
 * <app-workflow
 *   [steps]="steps"
 *   orientation="horizontal"
 *   [activeIndex]="idx()"
 *   (activeIndexChange)="idx.set($event)"
 *   (workflow)="onWorkflow($event)"
 *   (finished)="onFinish()"
 * >
 *   <ng-template appWorkflowStep="customer">
 *     <app-section-card title="Customer">...</app-section-card>
 *   </ng-template>
 *   <ng-template appWorkflowStep="payment">...</ng-template>
 *   <ng-template appWorkflowStep="confirm">...</ng-template>
 * </app-workflow>
 * ```
 *
 * Dos modos:
 *
 * - **`linear=true`** (default): solo puede avanzar si `steps[i].completed === true`
 *   o si el botón Next es presionado tras `markCompleted(i)` externo. Usa el
 *   método público `markCompleted(key)` para marcar steps en tiempo real.
 * - **`linear=false`**: el usuario puede saltar entre steps libremente.
 */
@Component({
  selector: 'app-workflow',
  standalone: true,
  imports: [
    CommonModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <mat-stepper
      #stepper
      class="app-wf"
      [orientation]="orientation"
      [linear]="linear"
      [selectedIndex]="activeIndex"
      (selectionChange)="onSelectionChange($event)"
    >
      @for (s of steps; track s.key; let i = $index) {
        <mat-step
          [label]="s.label"
          [editable]="s.editable !== false"
          [completed]="completedMap()[s.key] === true || s.completed === true"
        >
          @if (s.hint) {
            <ng-template matStepLabel>
              <div class="app-wf__label">
                <span>{{ s.label }}</span>
                <small class="app-wf__hint">{{ s.hint }}</small>
              </div>
            </ng-template>
          }

          <div class="app-wf__body">
            @if (templateFor(s.key); as tpl) {
              <ng-container *ngTemplateOutlet="tpl"></ng-container>
            }
          </div>

          @if (showActions) {
            <div class="app-wf__actions">
              @if (i > 0) {
                <button mat-stroked-button type="button" matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  {{ prevLabel }}
                </button>
              }
              @if (i < steps.length - 1) {
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  matStepperNext
                  [disabled]="linear && !(completedMap()[s.key] === true || s.completed === true)"
                >
                  {{ nextLabel }}
                  <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              } @else {
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  [disabled]="linear && !(completedMap()[s.key] === true || s.completed === true)"
                  (click)="finishWorkflow()"
                >
                  <mat-icon>check</mat-icon>
                  {{ finishLabel }}
                </button>
              }
            </div>
          }
        </mat-step>
      }
    </mat-stepper>
  `,
  styles: [`
    :host { display: block; }
    .app-wf { background: transparent; }
    .app-wf__body { padding: 8px 0 4px; }
    .app-wf__actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .app-wf__label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .app-wf__hint {
      font-size: 0.6875rem;
      color: var(--fvx-text-muted, #94a3b8);
      font-weight: 400;
    }
  `],
})
export class WorkflowComponent implements AfterContentInit {
  @Input() steps: WorkflowStep[] = [];
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input() linear = true;
  @Input() showActions = true;
  @Input() activeIndex = 0;
  @Input() prevLabel = 'Back';
  @Input() nextLabel = 'Next';
  @Input() finishLabel = 'Finish';

  @Output() activeIndexChange = new EventEmitter<number>();
  @Output() workflow = new EventEmitter<WorkflowEvent>();
  // `finished` y no `finish`: `finish` choca con el evento DOM nativo del mismo
  // nombre (no-output-native) y Angular podría confundir el binding.
  @Output() finished = new EventEmitter<void>();

  @ContentChildren(WorkflowStepDirective) contents!: QueryList<WorkflowStepDirective>;
  @ViewChild('stepper') stepper?: MatStepper;

  private readonly destroyRef = inject(DestroyRef);
  private readonly templatesMap = signal<Record<string, TemplateRef<unknown>>>({});
  /** Mapa interno de completados que sobrescribe `step.completed` cuando se llama a `markCompleted()`. */
  readonly completedMap = signal<Record<string, boolean>>({});

  activeKey = computed<string | undefined>(() => this.steps[this.activeIndex]?.key);

  ngAfterContentInit(): void {
    this.buildTemplates();
    // QueryList.changes emite indefinidamente → takeUntilDestroyed evita la fuga.
    this.contents.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.buildTemplates());
  }

  templateFor(key: string): TemplateRef<unknown> | null {
    return this.templatesMap()[key] ?? null;
  }

  onSelectionChange(ev: { selectedIndex: number; previouslySelectedIndex: number }): void {
    this.activeIndex = ev.selectedIndex;
    this.activeIndexChange.emit(ev.selectedIndex);
    const fromKey = this.steps[ev.previouslySelectedIndex]?.key ?? '';
    const toKey = this.steps[ev.selectedIndex]?.key ?? '';
    if (ev.selectedIndex > ev.previouslySelectedIndex) {
      this.workflow.emit({ type: 'next', fromIndex: ev.previouslySelectedIndex, toIndex: ev.selectedIndex, key: toKey });
    } else if (ev.selectedIndex < ev.previouslySelectedIndex) {
      this.workflow.emit({ type: 'previous', fromIndex: ev.previouslySelectedIndex, toIndex: ev.selectedIndex, key: fromKey });
    }
  }

  /** Marca como completado el step con la `key` indicada. Útil en modo `linear`. */
  markCompleted(key: string, value = true): void {
    this.completedMap.update((m) => ({ ...m, [key]: value }));
  }

  /** Reset del wizard (vuelve al primer step). */
  reset(): void {
    this.stepper?.reset();
    this.completedMap.set({});
    this.activeIndex = 0;
    this.activeIndexChange.emit(0);
    this.workflow.emit({ type: 'reset' });
  }

  finishWorkflow(): void {
    this.workflow.emit({ type: 'complete' });
    this.finished.emit();
  }

  private buildTemplates(): void {
    const map: Record<string, TemplateRef<unknown>> = {};
    this.contents?.forEach((d) => {
      if (d.key) map[d.key] = d.template;
    });
    this.templatesMap.set(map);
  }
}
