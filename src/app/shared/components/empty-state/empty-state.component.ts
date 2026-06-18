import { Component, Input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

export type EmptyStateTone = 'neutral' | 'positive';

/**
 * Placeholder consistente para listas/tablas/drawers vacíos.
 *
 * - `tone="neutral"` (default): icono gris + textos secundarios.
 *   Para "no hay X todavía" o "0 resultados con tu filtro".
 * - `tone="positive"`: icono verde + título resaltado. Para casos donde
 *   **0 es bueno** ("Ningún usuario inactivo. ¡Bien!"). Si no pasas `icon`,
 *   el default cambia a `check_circle` en lugar de `inbox`.
 *
 * ```html
 * <app-empty-state
 *   icon="inbox"
 *   title="No items yet"
 *   description="Create the first item to get started."
 * >
 *   <button mat-flat-button color="primary" (click)="openForm()">
 *     Create item
 *   </button>
 * </app-empty-state>
 *
 * <!-- "0 = bueno" -->
 * <app-empty-state
 *   tone="positive"
 *   title="No inactive users"
 *   description="Everyone has logged in within 90 days."
 * />
 * ```
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div
      class="empty-state"
      [class.empty-state--compact]="compact"
      [class.empty-state--positive]="tone === 'positive'">
      <mat-icon class="empty-state__icon">{{ resolvedIcon() }}</mat-icon>
      @if (title) {
        <h3 class="empty-state__title">{{ title }}</h3>
      }
      @if (description) {
        <p class="empty-state__description">{{ description }}</p>
      }
      <div class="empty-state__actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 48px 24px;
      color: var(--fvx-text-secondary, #475569);
      text-align: center;
    }
    .empty-state--compact { padding: 24px 16px; }
    .empty-state__icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--fvx-text-muted, #94a3b8);
      margin-bottom: 4px;
    }
    .empty-state--compact .empty-state__icon {
      font-size: 36px; width: 36px; height: 36px;
    }
    .empty-state__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--fvx-text-primary, #1e293b);
    }
    .empty-state__description {
      margin: 0;
      font-size: 0.875rem;
      max-width: 420px;
    }
    .empty-state__actions:not(:empty) { margin-top: 12px; }

    /* tone="positive": icono verde + título en color de estado OK. */
    .empty-state--positive .empty-state__icon {
      color: var(--fvx-chip-success-fg, #16a34a);
    }
    .empty-state--positive .empty-state__title {
      color: var(--fvx-chip-success-fg, #16a34a);
    }
  `],
})
export class EmptyStateComponent {
  @Input() icon?: string;
  @Input() title?: string;
  @Input() description?: string;
  @Input() compact = false;
  @Input() tone: EmptyStateTone = 'neutral';

  resolvedIcon(): string {
    if (this.icon) return this.icon;
    return this.tone === 'positive' ? 'check_circle' : 'inbox';
  }
}
