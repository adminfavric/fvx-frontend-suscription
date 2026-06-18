import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-forbidden',
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
        [title]="'errors.forbidden.title' | transloco"
        [subtitle]="'errors.forbidden.subtitle' | transloco"
      />
      <app-empty-state
        icon="lock"
        [title]="'errors.forbidden.heading' | transloco"
        [description]="'errors.forbidden.body' | transloco"
      >
        <button mat-flat-button color="primary" routerLink="/dashboard">
          <mat-icon>arrow_back</mat-icon>
          {{ 'errors.backToHome' | transloco }}
        </button>
      </app-empty-state>
    </div>
  `,
})
export class ForbiddenComponent {}
