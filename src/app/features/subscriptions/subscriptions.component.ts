import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../environments/environment';

/** Suscripción genérica (cualquier pasarela), desde el espejo local unificado. */
interface Subscription {
  id: number;
  provider: string;
  provider_label: string;
  plan_name: string;
  name: string;
  email: string;
  subscription_id: string;
  is_period: boolean;
  access_until: string | null;
  is_active: boolean;
  created: string;
}

/**
 * Suscripciones activas de TODAS las pasarelas (Flow, PayPal, link de pago,
 * manual) — espejo local unificado (`GET /api/v1/subscriptions/all/`). Las
 * acciones de cancelar/reactivar aplican solo a las recurrentes de Flow.
 */
@Component({
  selector: 'app-subscriptions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTableModule, MatProgressBarModule, MatIconModule, PageHeaderComponent],
  template: `
   <div class="page-container">
    <app-page-header
      title="Suscripciones"
      subtitle="Suscripciones activas de todos los medios de pago (Flow, PayPal, link de pago y manual)."
      [breadcrumbs]="breadcrumbs">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (error()) {
      <div class="state state--error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (!loading() && rows().length === 0) {
      <div class="state"><mat-icon>subscriptions</mat-icon> Aún no hay suscripciones activas.</div>
    } @else {
      <div class="table-wrap">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="plan">
            <th mat-header-cell *matHeaderCellDef>Plan</th>
            <td mat-cell *matCellDef="let s">{{ s.plan_name || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="customer">
            <th mat-header-cell *matHeaderCellDef>Cliente</th>
            <td mat-cell *matCellDef="let s">
              <div class="cust">
                <span class="cust__name">{{ s.name || s.email }}</span>
                @if (s.name && s.email) { <span class="cust__email">{{ s.email }}</span> }
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="origen">
            <th mat-header-cell *matHeaderCellDef>Origen</th>
            <td mat-cell *matCellDef="let s"><span class="origen">{{ s.provider_label }}</span></td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let s">
              <span class="chip" [class.chip--ok]="s.is_active" [class.chip--bad]="!s.is_active">
                {{ s.is_active ? 'Activa' : 'Vencida' }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="vence">
            <th mat-header-cell *matHeaderCellDef>Vence / Cobro</th>
            <td mat-cell *matCellDef="let s">
              @if (s.is_period) {
                {{ s.access_until ? (s.access_until | date: 'dd-MM-yyyy') : '—' }}
              } @else {
                <span class="muted">Cobro automático</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let s"><code>{{ s.subscription_id || ('#' + s.id) }}</code></td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let s">
              @if (s.provider === 'flow' && s.subscription_id) {
                @if (s.is_active) {
                  <button class="act act--cancel" (click)="cancel(s)" [disabled]="busy()">Cancelar</button>
                } @else {
                  <button class="act act--reactivate" (click)="reactivate(s)" [disabled]="busy()">Reactivar</button>
                }
              } @else {
                <span class="muted">—</span>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </div>
    }
   </div>
  `,
  styles: [`
    :host { display: block; }
    .table-wrap { overflow-x: auto; background: var(--fvx-surface, #fff); border: 1px solid var(--fvx-border, #e6e6ef); border-radius: 12px; }
    table { width: 100%; }
    code { font-size: .82rem; color: var(--fvx-text-muted, #6b6478); }
    .cust { display: flex; flex-direction: column; line-height: 1.25; }
    .cust__name { font-weight: 600; color: var(--fvx-text-primary, #2a2333); }
    .cust__email { font-size: .78rem; color: var(--fvx-text-muted, #6b6478); }
    .origen { display:inline-block; padding:2px 10px; border-radius:999px; font-size:.78rem; background:#f0eaf6; color:#5b3a8a; font-weight:600; }
    .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .78rem; background: #ececf2; color: #555; }
    .chip--ok { background: #e3f6ea; color: #1f7a45; }
    .chip--bad { background: #fdecea; color: #c0392b; }
    .muted { color: var(--fvx-text-muted, #828aa0); }
    .act { border-radius: 999px; padding: 5px 12px; font-size: .8rem; cursor: pointer; border: 1px solid transparent; }
    .act:disabled { opacity: .6; cursor: default; }
    .act--cancel { background: none; border-color: #e0b4b0; color: #c0392b; }
    .act--cancel:hover:not(:disabled) { background: #fdecea; }
    .act--reactivate { background: none; border-color: #b6dcc4; color: #1f7a45; }
    .act--reactivate:hover:not(:disabled) { background: #e3f6ea; }
    .state { display: flex; align-items: center; gap: 8px; padding: 32px; color: var(--fvx-text-muted, #6b6478); justify-content: center; }
    .state--error { color: #c0392b; }
  `],
})
export class SubscriptionsComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);

  private async ask(title: string, message: string, confirmText: string, color: 'primary' | 'warn' = 'warn'): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title, message, confirmText, color },
      panelClass: 'fvx-crud-dialog', width: '460px', maxWidth: '92vw',
    });
    return !!(await firstValueFrom(ref.afterClosed()));
  }

  cols = ['plan', 'customer', 'origen', 'estado', 'vence', 'id', 'actions'];
  rows = signal<Subscription[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  breadcrumbs = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Suscripciones' },
  ];

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: Subscription[] }>(`${environment.apiUrl}/subscriptions/all/`),
      );
      this.rows.set(res?.data ?? []);
      this.error.set('');
    } catch {
      this.error.set('No se pudieron cargar las suscripciones.');
    } finally {
      this.loading.set(false);
    }
  }

  async cancel(s: Subscription): Promise<void> {
    const ok = await this.ask(
      'Cancelar suscripción',
      `¿Cancelar la suscripción de ${s.plan_name}? El cliente conserva acceso hasta el fin del período pagado.`,
      'Cancelar suscripción',
    );
    if (!ok) return;
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/subscriptions/cancel/`, { subscription_id: s.subscription_id, at_period_end: true }),
      );
      await this.load();
    } catch {
      this.error.set('No se pudo cancelar la suscripción.');
    } finally {
      this.busy.set(false);
    }
  }

  async reactivate(s: Subscription): Promise<void> {
    const ok = await this.ask(
      'Reactivar suscripción',
      `¿Reactivar la suscripción de ${s.plan_name}? Se creará una nueva suscripción usando la tarjeta registrada del cliente.`,
      'Reactivar',
      'primary',
    );
    if (!ok) return;
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/subscriptions/reactivate/`, { subscription_id: s.subscription_id }),
      );
      await this.load();
    } catch {
      this.error.set('No se pudo reactivar la suscripción.');
    } finally {
      this.busy.set(false);
    }
  }
}
