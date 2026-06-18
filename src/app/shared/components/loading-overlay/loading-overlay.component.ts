import { Component, Input } from '@angular/core';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Overlay con spinner sobre cualquier contenedor con `position: relative`.
 *
 * ```html
 * <section class="container">
 *   <app-loading-overlay [show]="isLoading()" message="Loading data..." />
 *   <!-- contenido -->
 * </section>
 * ```
 *
 * El host aplica `position: absolute; inset: 0`, por lo que el padre debe ser
 * `position: relative` (o `relative`-like).
 */
@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    @if (show) {
      <div class="loading-overlay" [class.loading-overlay--transparent]="transparent">
        <mat-spinner [diameter]="diameter"></mat-spinner>
        @if (message) {
          <p class="loading-overlay__message">{{ message }}</p>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
    }
    .loading-overlay {
      pointer-events: auto;
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(1px);
    }
    .loading-overlay--transparent {
      background: transparent;
      backdrop-filter: none;
    }
    .loading-overlay__message {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--fvx-text-secondary, #475569);
    }
  `],
})
export class LoadingOverlayComponent {
  @Input() show = false;
  @Input() message?: string;
  @Input() diameter = 36;
  @Input() transparent = false;
}
