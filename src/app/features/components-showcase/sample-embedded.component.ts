import { Component, Input, inject } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { EntityDrawerService } from '../../core/services/entity-drawer.service';

/**
 * Componente de ejemplo para mostrar `content-dialog` y el modo `embed` del
 * `entity-drawer`. Se inyecta dinámicamente con `NgComponentOutlet`.
 */
@Component({
  selector: 'app-sample-embedded',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="sample">
      <mat-icon class="sample__icon">auto_awesome</mat-icon>
      <p class="sample__hello">
        Hello, <strong>{{ name || 'world' }}</strong>!
      </p>
      <p class="sample__desc">
        Este es un componente Angular standalone embebido dinámicamente.
        Puedes pasar cualquier <code>{{ inputDecoratorText }}</code> desde el host
        via <code>inputs: {{ inputsExample }}</code>.
      </p>
      @if (dismissible) {
        <button mat-stroked-button type="button" (click)="closeDrawer()">
          Close drawer
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sample {
      display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
      padding: 4px 0;
    }
    .sample__icon { color: var(--fvx-link, #2563eb); }
    .sample__hello {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--fvx-text-primary, #1e293b);
    }
    .sample__desc {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--fvx-text-secondary, #475569);
    }
    code {
      background: rgba(148, 163, 184, 0.18);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.8125rem;
    }
  `],
})
export class SampleEmbeddedComponent {
  @Input() name?: string;
  @Input() dismissible = false;

  readonly inputDecoratorText = '@Input()';
  readonly inputsExample = '{ name: "Ada" }';

  private drawer = inject(EntityDrawerService, { optional: true });

  closeDrawer(): void {
    this.drawer?.close();
  }
}
