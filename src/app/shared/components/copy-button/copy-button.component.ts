import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Botón-icono que copia un texto al portapapeles con feedback visual.
 *
 * ```html
 * <app-copy-button [value]="row.uuid" tooltip="Copy UUID" />
 * <app-copy-button [value]="signedUrl" [notify]="true" tooltip="Copy link" />
 * ```
 *
 * - Con `notify=true` muestra snackbar (usa `NotificationService`).
 * - Siempre emite `copied` con el texto copiado.
 */
@Component({
  selector: 'app-copy-button',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      type="button"
      class="copy-button"
      [matTooltip]="justCopied() ? copiedText : (tooltip || 'Copy')"
      [disabled]="!value"
      (click)="onCopy($event)"
    >
      <mat-icon>{{ justCopied() ? 'check' : 'content_copy' }}</mat-icon>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }
    .copy-button { width: 32px; height: 32px; line-height: 32px; }
    .copy-button mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
})
export class CopyButtonComponent {
  private notifier = inject(NotificationService);

  @Input() value?: string | null;
  @Input() tooltip?: string;
  @Input() copiedText = 'Copied!';
  @Input() notify = false;
  @Input() notifyMessage = 'Copied to clipboard';

  @Output() copied = new EventEmitter<string>();

  justCopied = signal(false);

  async onCopy(ev: Event): Promise<void> {
    ev.stopPropagation();
    if (!this.value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.value);
      } else {
        this.fallbackCopy(this.value);
      }
      this.justCopied.set(true);
      this.copied.emit(this.value);
      if (this.notify) this.notifier.success(this.notifyMessage);
      setTimeout(() => this.justCopied.set(false), 1500);
    } catch {
      if (this.notify) this.notifier.error('Could not copy');
    }
  }

  private fallbackCopy(text: string): void {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(area);
    }
  }
}
