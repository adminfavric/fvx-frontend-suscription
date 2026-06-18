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

interface FlowSubscription {
  subscriptionId: string;
  planName?: string;
  planId?: string;
  customerId?: string;
  customer?: { email?: string; name?: string } | null;
  status: number;
  created?: string;
  period_end?: string | null;
  next_invoice_date?: string | null;
}

const STATUS_LABEL: Record<number, string> = {
  0: 'En prueba',
  1: 'Activa',
  2: 'En proceso',
  3: 'Impaga',
  4: 'Cancelada',
};

/**
 * Suscripciones desde Flow (espejo de solo lectura). El backend agrega las
 * suscripciones de todos los planes de Flow (`GET /api/v1/subscriptions/`).
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
      subtitle="Suscripciones registradas en Flow (solo lectura)."
      [breadcrumbs]="breadcrumbs">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (error()) {
      <div class="state state--error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (!loading() && rows().length === 0) {
      <div class="state"><mat-icon>subscriptions</mat-icon> Aún no hay suscripciones en Flow.</div>
    } @else {
      <div class="table-wrap">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="plan">
            <th mat-header-cell *matHeaderCellDef>Plan</th>
            <td mat-cell *matCellDef="let s">{{ s.planName || s.planId || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="customer">
            <th mat-header-cell *matHeaderCellDef>Cliente</th>
            <td mat-cell *matCellDef="let s">
              @if (s.customer?.name || s.customer?.email) {
                <div class="cust">
                  <span class="cust__name">{{ s.customer?.name || s.customer?.email }}</span>
                  @if (s.customer?.name && s.customer?.email) { <span class="cust__email">{{ s.customer?.email }}</span> }
                </div>
              } @else { {{ s.customerId || '—' }} }
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let s">
              <span class="chip" [class.chip--ok]="s.status === 1" [class.chip--bad]="s.status === 4 || s.status === 3">
                {{ statusLabel(s.status) }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="next">
            <th mat-header-cell *matHeaderCellDef>Próximo cobro</th>
            <td mat-cell *matCellDef="let s">{{ (s.next_invoice_date || s.period_end) ? ((s.next_invoice_date || s.period_end) | date: 'dd-MM-yyyy') : '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Inicio</th>
            <td mat-cell *matCellDef="let s">{{ s.created ? (s.created | date: 'dd-MM-yyyy') : '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="subscriptionId">
            <th mat-header-cell *matHeaderCellDef>ID Flow</th>
            <td mat-cell *matCellDef="let s"><code>{{ s.subscriptionId }}</code></td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let s">
              @if (s.status === 1) {
                <button class="act act--cancel" (click)="cancel(s)" [disabled]="busy()">Cancelar</button>
              } @else {
                <button class="act act--reactivate" (click)="reactivate(s)" [disabled]="busy()">Reactivar</button>
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
    .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .78rem; background: #ececf2; color: #555; }
    .chip--ok { background: #e3f6ea; color: #1f7a45; }
    .chip--bad { background: #fdecea; color: #c0392b; }
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

  cols = ['plan', 'customer', 'status', 'next', 'created', 'subscriptionId', 'actions'];
  rows = signal<FlowSubscription[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  breadcrumbs = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Suscripciones' },
  ];

  statusLabel(s: number): string {
    return STATUS_LABEL[s] ?? `Estado ${s}`;
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: FlowSubscription[] }>(`${environment.apiUrl}/subscriptions/`),
      );
      this.rows.set(res?.data ?? []);
      this.error.set('');
    } catch {
      this.error.set('No se pudieron cargar las suscripciones desde Flow.');
    } finally {
      this.loading.set(false);
    }
  }

  async cancel(s: FlowSubscription): Promise<void> {
    const ok = await this.ask(
      'Cancelar suscripción',
      `¿Cancelar la suscripción de ${s.planName || s.planId}? El cliente conserva acceso hasta el fin del período pagado.`,
      'Cancelar suscripción',
    );
    if (!ok) return;
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/subscriptions/cancel/`, { subscription_id: s.subscriptionId, at_period_end: true }),
      );
      await this.load();
    } catch {
      this.error.set('No se pudo cancelar la suscripción.');
    } finally {
      this.busy.set(false);
    }
  }

  async reactivate(s: FlowSubscription): Promise<void> {
    const ok = await this.ask(
      'Reactivar suscripción',
      `¿Reactivar la suscripción de ${s.planName || s.planId}? Se creará una nueva suscripción usando la tarjeta registrada del cliente.`,
      'Reactivar',
      'primary',
    );
    if (!ok) return;
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/subscriptions/reactivate/`, { subscription_id: s.subscriptionId }),
      );
      await this.load();
    } catch {
      this.error.set('No se pudo reactivar la suscripción.');
    } finally {
      this.busy.set(false);
    }
  }
}
