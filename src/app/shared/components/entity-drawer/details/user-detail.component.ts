import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { DateFormatPipe } from '../../../pipes/date-format.pipe';
import { AvatarComponent } from '../../avatar/avatar.component';
import { StatusChipComponent } from '../../status-chip/status-chip.component';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    TranslocoPipe,
    DateFormatPipe,
    AvatarComponent,
    StatusChipComponent,
  ],
  template: `
    <div class="detail-card">
      <div class="avatar-section">
        <app-avatar
          [name]="displayName()"
          [imageUrl]="data.photo_url"
          [size]="80"
        ></app-avatar>
        <div class="avatar-info">
          <h3>{{ displayName() }}</h3>
          <p class="subtitle">{{ data.username }}</p>
          @if (data.role_label || data.role) {
            <p class="role">{{ data.role_label || data.role }}</p>
          }
          <div class="chips">
            <app-status-chip
              [variant]="data.is_active ? 'success' : 'danger'"
              [label]="(data.is_active ? 'userDetail.active' : 'userDetail.inactive') | transloco"
            />
            @if (data.is_staff) {
              <app-status-chip variant="info" [label]="'userDetail.staff' | transloco" />
            }
            @if (data.verified) {
              <app-status-chip variant="success" [label]="'userDetail.verified' | transloco" />
            }
          </div>
        </div>
      </div>

      <div class="info-section">
        <h4><mat-icon>badge</mat-icon> {{ 'userDetail.personalInfo' | transloco }}</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-item__label">{{ 'userDetail.email' | transloco }}</span>
            <span>{{ data.email || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-item__label">{{ 'userDetail.firstName' | transloco }}</span>
            <span>{{ data.first_name || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-item__label">{{ 'userDetail.lastName' | transloco }}</span>
            <span>{{ data.last_name || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-item__label">{{ 'userDetail.phone' | transloco }}</span>
            <span>{{ data.phone || '—' }}</span>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h4><mat-icon>info</mat-icon> {{ 'userDetail.systemInfo' | transloco }}</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-item__label">{{ 'userDetail.registeredAt' | transloco }}</span>
            <span>{{ data.date_joined | dateFormat }}</span>
          </div>
          <div class="info-item">
            <span class="info-item__label">{{ 'userDetail.lastAccess' | transloco }}</span>
            <span>{{ data.last_login ? (data.last_login | dateFormat) : ('userDetail.never' | transloco) }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'variables' as v;

    :host {
      display: block;
      color: var(--fvx-text-primary);
    }

    .detail-card {
      display: flex;
      flex-direction: column;
      gap: v.$spacing-xl;
    }

    /* ────── Card (reutiliza los tokens del tema) ────── */
    .avatar-section,
    .info-section {
      background: var(--fvx-bg-card);
      border: 1px solid var(--fvx-border);
      border-radius: v.$radius-lg;
      color: var(--fvx-text-primary);
    }

    .avatar-section {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: v.$spacing-lg;
      padding: v.$spacing-lg;
    }

    .avatar-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: v.$spacing-xs;
      min-width: 0;
    }

    .avatar-section h3 {
      margin: 0;
      font-size: v.$font-size-lg;
      font-weight: v.$font-weight-semibold;
      color: var(--fvx-text-primary);
    }

    .avatar-section .subtitle {
      margin: 0;
      font-size: v.$font-size-sm;
      color: var(--fvx-text-secondary);
    }

    .avatar-section .role {
      margin: 0;
      font-size: v.$font-size-xs;
      color: var(--fvx-text-muted);
      text-transform: uppercase;
      font-weight: v.$font-weight-medium;
    }

    .chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: v.$spacing-sm;
    }

    @media (max-width: 768px) {
      .avatar-section {
        flex-direction: column;
        text-align: center;
      }
      .avatar-info {
        align-items: center;
      }
    }

    /* ────── Secciones (info / sistema) ────── */
    .info-section { padding: v.$spacing-lg; }
    .info-section h4 {
      display: flex;
      align-items: center;
      gap: v.$spacing-sm;
      margin: 0 0 v.$spacing-lg 0;
      font-size: v.$font-size-md;
      font-weight: v.$font-weight-semibold;
      color: var(--fvx-text-primary);
    }
    .info-section h4 mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--fvx-link);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: v.$spacing-lg;
    }
    .info-item { display: flex; flex-direction: column; gap: v.$spacing-xs; }
    .info-item__label {
      font-size: v.$font-size-xs;
      font-weight: v.$font-weight-medium;
      color: var(--fvx-text-muted);
      text-transform: uppercase;
    }
    .info-item span:not(.info-item__label) {
      font-size: v.$font-size-md;
      color: var(--fvx-text-primary);
    }

    @media (max-width: 768px) {
      .info-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class UserDetailComponent {
  @Input() data: any;

  /** Nombre para avatar / cabecera: API puede no enviar ``full_name``. */
  displayName(): string {
    const d = this.data;
    if (!d) return '';
    const fn = typeof d.full_name === 'string' ? d.full_name.trim() : '';
    if (fn) return fn;
    const fromParts = [d.first_name, d.last_name].filter(Boolean).join(' ').trim();
    if (fromParts) return fromParts;
    if (typeof d.username === 'string' && d.username.trim()) return d.username.trim();
    if (typeof d.email === 'string' && d.email.trim()) return d.email.trim();
    return '';
  }
}
