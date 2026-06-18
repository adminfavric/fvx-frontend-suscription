import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Card genérica con slots ``header`` / ``actions`` / contenido por `<ng-content>`.
 * Equivalente en componente a la clase global `.content-card`, con aria y estructura consistente.
 *
 * ```html
 * <app-section-card title="Profile" icon="person">
 *   <ng-container actions>
 *     <button mat-button>Edit</button>
 *   </ng-container>
 *   <app-user-detail [data]="user" />
 * </app-section-card>
 * ```
 *
 * ### Colapsable
 *
 * Activa `[collapsible]="true"` para mostrar un botón chevron en el header que
 * pliega / despliega el cuerpo. Puedes controlar el estado desde fuera con
 * `[(expanded)]`. Requiere `title` o `icon` (el header es el disparador).
 *
 * ```html
 * <app-section-card title="Advanced filters" icon="tune" [collapsible]="true" [expanded]="false">
 *   <!-- filtros avanzados -->
 * </app-section-card>
 *
 * <!-- Controlado -->
 * <app-section-card title="Logs" [collapsible]="true" [(expanded)]="showLogs">
 *   <app-json-viewer [data]="logs" />
 * </app-section-card>
 * ```
 */
@Component({
  selector: 'app-section-card',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.title]': 'null' },
  template: `
    <section
      class="section-card"
      [class.section-card--flat]="flat"
      [class.section-card--collapsed]="collapsible && !isExpanded()"
    >
      @if (title || icon || collapsible) {
        <header
          class="section-card__header"
          [class.section-card__header--clickable]="collapsible"
          [attr.role]="collapsible ? 'button' : null"
          [attr.tabindex]="collapsible ? 0 : null"
          [attr.aria-expanded]="collapsible ? isExpanded() : null"
          [attr.aria-controls]="collapsible ? bodyId : null"
          (click)="collapsible && toggle()"
          (keydown.enter)="collapsible && toggle($event)"
          (keydown.space)="collapsible && toggle($event)"
        >
          <div class="section-card__title-wrap">
            @if (icon) {
              <mat-icon class="section-card__icon">{{ icon }}</mat-icon>
            }
            <div>
              @if (title) {
                <h3 class="section-card__title">{{ title }}</h3>
              }
              @if (subtitle) {
                <p class="section-card__subtitle">{{ subtitle }}</p>
              }
            </div>
          </div>
          <!-- Contenedor de acciones proyectadas: el (click) solo frena la
               propagación para no disparar el toggle de la cabecera colapsable.
               No es un control; las acciones internas ya son accesibles. -->
          <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
          <div class="section-card__actions" (click)="$event.stopPropagation()">
            <ng-content select="[actions]"></ng-content>
            @if (collapsible) {
              <button
                mat-icon-button
                type="button"
                class="section-card__toggle"
                [attr.aria-label]="isExpanded() ? collapseLabel : expandLabel"
                [matTooltip]="isExpanded() ? collapseLabel : expandLabel"
                (click)="toggle($event)"
              >
                <mat-icon class="section-card__chevron">
                  {{ isExpanded() ? 'expand_less' : 'expand_more' }}
                </mat-icon>
              </button>
            }
          </div>
        </header>
      }
      @if (!collapsible || isExpanded()) {
        <div
          class="section-card__body"
          [class.section-card__body--no-pad]="noPadding"
          [id]="bodyId"
        >
          <ng-content></ng-content>
        </div>
      }
    </section>
  `,
  styles: [`
    /*
     * Spec card FVX (ver custom-site.md / design-fvx.md):
     *  · Reposo: border + bg-card, SIN sombra (en admin denso la sombra es ruido).
     *  · Radio: --fvx-radius-lg (13px) — contenedor grande.
     *  · Header: 14px 18px, title 14/600, ícono en --fvx-link (acento del tema).
     *  · Body: 18px.
     *  · Subtitle: 12px en text-muted (text-3, "casi se desvanece").
     */
    :host { display: block; }
    .section-card {
      background: var(--fvx-bg-card, #fff);
      border: 1px solid var(--fvx-border, #e2e8f0);
      border-radius: var(--fvx-radius-lg, 13px);
      overflow: hidden;
    }
    .section-card--flat { border: none; }
    .section-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--fvx-border, #e2e8f0);
    }
    .section-card--collapsed .section-card__header {
      border-bottom: none;
    }
    .section-card__header--clickable {
      cursor: pointer;
      user-select: none;
      transition: background var(--fvx-motion-fast, 120ms) var(--fvx-motion-easing, ease);
    }
    .section-card__header--clickable:hover {
      background: var(--fvx-hover-bg, rgba(148, 163, 184, 0.08));
    }
    .section-card__header--clickable:focus-visible {
      outline: 2px solid var(--fvx-link, #2563eb);
      outline-offset: -2px;
    }
    .section-card__title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .section-card__icon {
      /* Ícono del título en acento: único punto de color en el header, ancla visual. */
      color: var(--fvx-link, var(--fvx-accent, #2563eb));
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .section-card__title {
      margin: 0;
      /* Spec FVX: título de card / section = 15px / 600 / line-height 1.3 */
      font-size: var(--fvx-text-md);   /* 15px (escala FVX) */
      font-weight: 600;
      color: var(--fvx-text-primary, #1e293b);
      line-height: 1.3;
    }
    .section-card__subtitle {
      margin: 2px 0 0;
      /* Spec FVX: subtítulo / descripción = 13px / 400 / line-height 1.45 */
      font-size: var(--fvx-text-compact);  /* 13px (escala FVX) */
      font-weight: 400;
      color: var(--fvx-text-secondary, #94a3b8);
      line-height: 1.45;
    }
    .section-card__actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
    }
    .section-card__toggle .mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      line-height: 22px;
      color: var(--fvx-text-secondary, #475569);
      transition: transform 0.2s ease;
    }
    .section-card__body { padding: 18px; }
    .section-card__body--no-pad { padding: 0; }
  `],
})
export class SectionCardComponent {
  private static _uid = 0;
  readonly bodyId = `section-card-body-${++SectionCardComponent._uid}`;

  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() flat = false;
  @Input() noPadding = false;

  /** Si `true`, el header muestra un chevron y el body se pliega/despliega. */
  @Input() collapsible = false;

  /** Texto ARIA/tooltip para el botón cuando está expandido. */
  @Input() collapseLabel = 'Collapse';
  /** Texto ARIA/tooltip para el botón cuando está colapsado. */
  @Input() expandLabel = 'Expand';

  @Input()
  set expanded(value: boolean) {
    this.isExpanded.set(!!value);
  }
  get expanded(): boolean {
    return this.isExpanded();
  }

  /** Emite cuando cambia el estado expandido/colapsado (soporta `[(expanded)]`). */
  @Output() expandedChange = new EventEmitter<boolean>();

  /** Estado interno reactivo. */
  readonly isExpanded = signal(true);

  toggle(event?: Event): void {
    if (!this.collapsible) return;
    event?.preventDefault();
    event?.stopPropagation();
    const next = !this.isExpanded();
    this.isExpanded.set(next);
    this.expandedChange.emit(next);
  }
}
