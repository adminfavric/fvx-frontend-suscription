import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-not-found',
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
        [title]="'errors.notFound.title' | transloco"
        [subtitle]="'errors.notFound.subtitle' | transloco"
      />
      <app-empty-state
        icon="search_off"
        [title]="'errors.notFound.heading' | transloco"
        [description]="'errors.notFound.body' | transloco"
      >
        <button mat-flat-button color="primary" routerLink="/dashboard">
          <mat-icon>arrow_back</mat-icon>
          {{ 'errors.backToHome' | transloco }}
        </button>
      </app-empty-state>
    </div>
  `,
})
export class NotFoundComponent {}
