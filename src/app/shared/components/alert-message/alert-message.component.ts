import { Component, computed, input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

/** Variantes visuales; cada una tiene borde/fondo/texto propios (tokens `--fvx-chip-*`). */
export type AlertMessageType = 'info' | 'success' | 'warning' | 'error';

/**
 * Mensaje en bloque (alerta inline) para feedback de API, validación o estado.
 *
 * ```html
 * <app-alert-message
 *   type="warning"
 *   message="Tu cuenta está pendiente de validación…"
 * />
 * ```
 */
@Component({
  selector: 'app-alert-message',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="fvx-alert" [class]="'fvx-alert--' + type()" [attr.role]="role()">
      <mat-icon class="fvx-alert__icon" aria-hidden="true">{{ iconName() }}</mat-icon>
      <div class="fvx-alert__body">
        @if (title()) {
          <div class="fvx-alert__title">{{ title() }}</div>
        }
        <div class="fvx-alert__message">{{ message() }}</div>
      </div>
    </div>
  `,
  styleUrl: './alert-message.component.scss',
})
export class AlertMessageComponent {
  /** Tipo visual / semántico (color + icono por defecto). */
  type = input.required<AlertMessageType>();

  /** Texto principal (obligatorio). */
  message = input.required<string>();

  /** Título opcional sobre el mensaje. */
  title = input<string>('');

  /** Rol ARIA (`alert` para errores críticos; `status` para avisos menos urgentes). */
  role = input<'alert' | 'status'>('alert');

  iconName = computed(() => {
    switch (this.type()) {
      case 'info':
        return 'info_outline';
      case 'success':
        return 'check_circle_outline';
      case 'warning':
        return 'warning_amber';
      case 'error':
        return 'error_outline';
      default:
        return 'info_outline';
    }
  });
}
