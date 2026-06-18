import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

/**
 * Pantalla genérica de error de servidor. No la enrutamos automáticamente; los
 * 5xx siguen llegando como toast desde `errorInterceptor`. Esta página existe
 * para casos en los que un feature decide bañar la vista entera (estado roto
 * irrecuperable, etc.) navegando manualmente a `/server-error`.
 */
@Component({
  selector: 'app-server-error',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    TranslocoPipe,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-container">
      <app-page-header
        [title]="'errors.serverError.title' | transloco"
        [subtitle]="'errors.serverError.subtitle' | transloco"
      />
      <app-empty-state
        icon="cloud_off"
        [title]="'errors.serverError.heading' | transloco"
        [description]="'errors.serverError.body' | transloco"
      >
        <button mat-stroked-button (click)="onReport()">
          <mat-icon>bug_report</mat-icon>
          {{ 'errors.serverError.report' | transloco }}
        </button>
        <button mat-stroked-button (click)="onRetry()">
          <mat-icon>refresh</mat-icon>
          {{ 'errors.serverError.retry' | transloco }}
        </button>
        <button mat-flat-button color="primary" routerLink="/dashboard">
          <mat-icon>arrow_back</mat-icon>
          {{ 'errors.backToHome' | transloco }}
        </button>
      </app-empty-state>
    </div>
  `,
})
export class ServerErrorComponent {
  private readonly notify = inject(NotificationService);
  private readonly transloco = inject(TranslocoService);

  onReport(): void {
    // Placeholder: en una iteración futura, abrir un dialog con form de reporte
    // y mandar al backend (`POST /api/v1/error-reports/`).
    this.notify.info(this.transloco.translate('errors.serverError.reportSent'));
  }

  onRetry(): void {
    // Reload del navegador. Para un retry más fino (sin perder estado de signals),
    // el feature concreto puede usar Router.navigateByUrl con `skipLocationChange`.
    window.location.reload();
  }
}
