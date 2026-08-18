import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  PasswordConfirmDialogComponent,
  type PasswordConfirmData,
} from '../../shared/components/password-confirm-dialog/password-confirm-dialog.component';
import { NotificationService } from '../../core/services/notification.service';
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
  /** 'subscribed' | 'failed' (cancelada / terminada en la pasarela). */
  status?: string;
  /** Bitácora: quién canceló, cuándo y si fue al final del período. */
  cancellation?: Cancellation | null;
  created: string;
  /** Pagos agrupados de esta persona+plan (renovaciones / pagos repetidos). */
  count?: number;
  history?: {
    id: number;
    provider_label: string;
    access_until: string | null;
    is_active: boolean;
    status?: string;
    cancellation?: Cancellation | null;
    created: string;
    subscription_id: string;
  }[];
}

/** Registro de cancelación de una suscripción recurrente. */
interface Cancellation {
  actor: 'member' | 'admin' | 'gateway';
  actor_label: string;
  actor_detail: string;
  at_period_end: boolean;
  reason: string;
  created: string;
}

/** Cobro (factura) de una suscripción Flow. */
interface FlowInvoice {
  period_start: string;
  period_end: string;
  amount: number | null;
  currency: string | null;
  status: string;
  created: string;
}

/**
 * Suscripciones activas de TODAS las pasarelas (Flow, PayPal, link de pago,
 * manual) — espejo local unificado (`GET /api/v1/subscriptions/all/`), con
 * filtro por origen. Solo lectura.
 */
@Component({
  selector: 'app-subscriptions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, MatTableModule, MatPaginatorModule, MatProgressBarModule, MatIconModule, PageHeaderComponent],
  template: `
   <div class="page-container">
    <app-page-header
      title="Suscripciones"
      subtitle="Suscripciones de todos los medios de pago (Flow, PayPal, link de pago y manual). Activa 'Mostrar canceladas' para ver quién y cuándo canceló."
      [breadcrumbs]="breadcrumbs">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (error()) {
      <div class="state state--error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (!loading()) {
      @if (rows().length) {
        <div class="search-bar">
          <mat-icon>search</mat-icon>
          <input type="text" [value]="search()" (input)="onSearch($any($event.target).value)"
                 placeholder="Buscar por nombre, correo, plan o ID…" />
          @if (search()) {
            <button class="search-clear" (click)="onSearch('')" aria-label="Limpiar búsqueda"><mat-icon>close</mat-icon></button>
          }
          @if (search()) { <span class="search-count">{{ filtered().length }} resultado(s)</span> }
        </div>
        <div class="filters">
          <button class="chip-f" [class.chip-f--on]="filter() === 'all'" (click)="setFilter('all')">
            Todas <span class="chip-f__n">{{ rows().length }}</span>
          </button>
          @for (p of providers(); track p.provider) {
            <button class="chip-f" [class.chip-f--on]="filter() === p.provider" (click)="setFilter(p.provider)">
              {{ p.label }} <span class="chip-f__n">{{ p.count }}</span>
            </button>
          }
          <label class="toggle-inactive">
            <input type="checkbox" [checked]="showInactive()" (change)="toggleInactive($any($event.target).checked)" />
            Mostrar canceladas
            @if (showInactive()) { <span class="chip-f__n">{{ inactiveCount() }}</span> }
          </label>
        </div>
      }

      @if (!rows().length) {
        <div class="state"><mat-icon>subscriptions</mat-icon> Aún no hay suscripciones activas.</div>
      } @else if (!filtered().length) {
        <div class="state"><mat-icon>search_off</mat-icon> Sin resultados para "{{ search() }}".</div>
      } @else {
        <div class="table-wrap">
          <table mat-table [dataSource]="paged()">
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
                  <button type="button" class="pagos-chip" (click)="toggleHistory(s.id)">
                    {{ (s.count || 1) }} pago{{ (s.count || 1) === 1 ? '' : 's' }}
                    <mat-icon>{{ expanded().has(s.id) ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </button>
                  @if (expanded().has(s.id)) {
                    <ul class="hist">
                      <li>
                        <strong>{{ s.created | date: 'dd-MM-yyyy' }}</strong>
                        · {{ s.provider_label }} <span class="hist__tag">actual</span>
                        <code class="hist__id">{{ s.subscription_id || ('#' + s.id) }}</code>
                        @if (!s.is_period && s.subscription_id) {
                          <button type="button" class="link-btn" (click)="loadInvoices(s.subscription_id)">Ver cobros</button>
                        }
                      </li>
                      @if (!s.is_period && s.subscription_id && invoices()[s.subscription_id]; as inv) {
                        <li class="inv-wrap">
                          @if (inv === 'loading') { <span class="muted">Cargando cobros…</span> }
                          @else if (inv.length) {
                            <ul class="inv">
                              @for (i of inv; track $index) {
                                <li>{{ i.period_start }} → {{ i.period_end }} · {{ i.currency }} {{ i.amount | number: '1.0-0' }} <span class="inv__st">{{ i.status }}</span></li>
                              }
                            </ul>
                          } @else { <span class="muted">Sin cobros registrados en Flow.</span> }
                        </li>
                      }
                      @for (h of s.history; track h.id) {
                        <li>
                          {{ h.created | date: 'dd-MM-yyyy' }} · {{ h.provider_label }}
                          <code class="hist__id">{{ h.subscription_id || ('#' + h.id) }}</code>
                          @if (h.cancellation; as hc) {
                            <span class="hist__canc" [title]="cancelTitle(hc)">cancelada · {{ cancelWho(hc) }} · {{ hc.created | date: 'dd-MM-yyyy' }}</span>
                          } @else if (h.status === 'failed') {
                            <span class="hist__canc">cancelada</span>
                          }
                        </li>
                      }
                    </ul>
                  }
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
                  {{ statusLabel(s) }}
                </span>
                @if (s.cancellation; as c) {
                  <div class="canc" [title]="cancelTitle(c)">
                    <mat-icon>{{ cancelIcon(c) }}</mat-icon>
                    <span>{{ cancelWho(c) }} · {{ c.created | date: 'dd-MM-yyyy HH:mm' }}</span>
                  </div>
                  @if (c.at_period_end && !s.is_period) { <div class="canc__sub">al final del período</div> }
                  @if (c.reason) { <div class="canc__sub">"{{ c.reason }}"</div> }
                }
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
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let s">
                @if (!s.is_period && s.subscription_id && s.status !== 'failed') {
                  <button type="button" class="cancel-mini" (click)="cancelSub(s.subscription_id, s.name || s.email)">
                    <mat-icon>block</mat-icon> Cancelar
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
          <mat-paginator
            [length]="filtered().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 20, 50, 100]"
            (page)="onPage($event)"
            aria-label="Paginación de suscripciones">
          </mat-paginator>
        </div>
      }
    }
   </div>
  `,
  styles: [`
    :host { display: block; }
    .search-bar {
      display:flex; align-items:center; gap:8px; margin:0 0 12px; padding:8px 14px;
      background:#fff; border:1px solid var(--fvx-border,#e0dbe9); border-radius:12px; max-width:520px;
    }
    .search-bar > mat-icon { color:var(--fvx-text-muted,#8a8398); font-size:20px; width:20px; height:20px; flex:0 0 auto; }
    .search-bar input { flex:1; border:none; outline:none; background:transparent; font-size:.95rem; color:var(--fvx-text-primary,#2a2333); }
    .search-clear { border:none; background:transparent; cursor:pointer; display:grid; place-items:center; color:var(--fvx-text-muted,#8a8398); padding:0; }
    .search-clear mat-icon { font-size:18px; width:18px; height:18px; }
    .search-count { color:var(--fvx-text-muted,#8a8398); font-size:.8rem; white-space:nowrap; }
    .filters { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 14px; }
    .chip-f { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--fvx-border,#e0d6ec); background:#fff; color: var(--fvx-primary,#5b3a8a); border-radius:999px; padding:6px 14px; font-size:.85rem; font-weight:600; cursor:pointer; }
    .chip-f--on { background: var(--fvx-primary,#5b3a8a); color:#fff; border-color: var(--fvx-primary,#5b3a8a); }
    .chip-f__n { background: rgba(0,0,0,.08); border-radius:999px; padding:0 7px; font-size:.72rem; }
    .chip-f--on .chip-f__n { background: rgba(255,255,255,.25); }
    .table-wrap { overflow-x: auto; background: var(--fvx-surface, #fff); border: 1px solid var(--fvx-border, #e6e6ef); border-radius: 12px; }
    table { width: 100%; }
    code { font-size: .82rem; color: var(--fvx-text-muted, #6b6478); }
    .cust { display: flex; flex-direction: column; line-height: 1.25; }
    .cust__name { font-weight: 600; color: var(--fvx-text-primary, #2a2333); }
    .pagos-chip { display:inline-flex; align-items:center; gap:2px; margin-top:4px; width:fit-content; border:1px solid var(--fvx-border,#e0dbe9); background:#f6f2fb; color:var(--fvx-primary,#5b3a8a); border-radius:999px; padding:2px 8px; font-size:.72rem; font-weight:700; cursor:pointer; }
    .pagos-chip mat-icon { font-size:15px; width:15px; height:15px; }
    .hist { list-style:none; margin:6px 0 0; padding:6px 0 0 2px; border-top:1px dashed var(--fvx-border,#e6e6ef); }
    .hist li { font-size:.78rem; color:var(--fvx-text-muted,#6b6478); padding:2px 0; }
    .hist__tag { background:rgba(63,164,106,.15); color:#2f8a59; border-radius:999px; padding:0 6px; font-size:.68rem; font-weight:700; }
    .hist__id { font-size:.7rem; color:#9a93a8; margin:0 6px; }
    .cancel-mini { display:inline-flex; align-items:center; gap:4px; border:1px solid #e0b4b0; background:#fff; color:#c0392b; border-radius:999px; padding:4px 12px; font-size:.78rem; font-weight:600; cursor:pointer; white-space:nowrap; }
    .cancel-mini:hover { background:#fdecea; }
    .cancel-mini mat-icon { font-size:16px; width:16px; height:16px; }
    .cancel-mini--sm { padding:1px 6px; }
    .link-btn { border:none; background:none; color:var(--fvx-primary,#5b3a8a); font-size:.75rem; font-weight:700; cursor:pointer; text-decoration:underline; padding:0 4px; }
    .inv-wrap { padding:4px 0 4px 6px !important; }
    .inv { list-style:none; margin:0; padding:0; }
    .inv li { font-size:.76rem; color:#4a4459; padding:1px 0; }
    .inv__st { background:#f0eaf6; color:#5b3a8a; border-radius:999px; padding:0 6px; font-size:.66rem; font-weight:700; margin-left:4px; }
    .cust__email { font-size: .78rem; color: var(--fvx-text-muted, #6b6478); }
    .origen { display:inline-block; padding:2px 10px; border-radius:999px; font-size:.78rem; background:#f0eaf6; color:#5b3a8a; font-weight:600; }
    .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .78rem; background: #ececf2; color: #555; }
    .chip--ok { background: #e3f6ea; color: #1f7a45; }
    .chip--bad { background: #fdecea; color: #c0392b; }
    .toggle-inactive { display:inline-flex; align-items:center; gap:6px; margin-left:auto; font-size:.82rem; color:var(--fvx-text-secondary,#4a4459); cursor:pointer; user-select:none; }
    .toggle-inactive input { accent-color: var(--fvx-primary,#5b3a8a); }
    .canc { display:flex; align-items:center; gap:4px; margin-top:4px; font-size:.74rem; color:var(--fvx-text-secondary,#4a4459); white-space:nowrap; }
    .canc mat-icon { font-size:15px; width:15px; height:15px; color:#c0392b; }
    .canc__sub { font-size:.7rem; color:var(--fvx-text-muted,#8a8398); padding-left:19px; }
    .hist__canc { background:#fdecea; color:#c0392b; border-radius:999px; padding:0 6px; font-size:.66rem; font-weight:700; margin-left:4px; }
    .muted { color: var(--fvx-text-muted, #828aa0); }
    .state { display: flex; align-items: center; gap: 8px; padding: 32px; color: var(--fvx-text-muted, #6b6478); justify-content: center; }
    .state--error { color: #c0392b; }
  `],
})
export class SubscriptionsComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);

  cols = ['plan', 'customer', 'origen', 'estado', 'vence', 'id', 'acciones'];
  rows = signal<Subscription[]>([]);
  loading = signal(true);
  error = signal('');
  /** Filtro por origen ('all' o el provider). */
  filter = signal<string>('all');
  /** Búsqueda de texto (nombre, correo, plan, ID) — filtra al instante. */
  search = signal<string>('');
  /** Filas con el historial de pagos desplegado (por id de la fila principal). */
  expanded = signal<Set<number>>(new Set());
  /** Cobros reales de Flow por subscription_id: 'loading' o el array de facturas. */
  invoices = signal<Record<string, 'loading' | FlowInvoice[]>>({});
  /** Incluir suscripciones canceladas/terminadas (con su bitácora). */
  showInactive = signal(false);
  inactiveCount = computed(() => this.rows().filter(r => r.status === 'failed').length);

  toggleInactive(on: boolean): void {
    this.showInactive.set(on);
    this.pageIndex.set(0);
    void this.load();
  }

  statusLabel(s: Subscription): string {
    if (s.status === 'failed') return 'Cancelada';
    return s.is_active ? 'Activa' : 'Vencida';
  }

  /** Quién canceló, en palabras: la clienta / admin (correo) / la pasarela. */
  cancelWho(c: Cancellation): string {
    switch (c.actor) {
      case 'member': return 'la clienta (Mi suscripción)';
      case 'admin': return c.actor_detail ? `admin (${c.actor_detail})` : 'admin';
      default: return 'la pasarela';
    }
  }

  cancelIcon(c: Cancellation): string {
    return c.actor === 'member' ? 'person' : c.actor === 'admin' ? 'admin_panel_settings' : 'sync_problem';
  }

  cancelTitle(c: Cancellation): string {
    const parts = [`Cancelada por ${this.cancelWho(c)}`];
    if (c.actor === 'gateway' && c.actor_detail) parts.push(c.actor_detail);
    parts.push(c.at_period_end ? 'al final del período' : 'de inmediato');
    if (c.reason) parts.push(`motivo: ${c.reason}`);
    return parts.join(' · ');
  }

  toggleHistory(id: number): void {
    const next = new Set(this.expanded());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expanded.set(next);
  }

  /** Trae de Flow el historial de cobros (facturas) de una suscripción. */
  async loadInvoices(subId: string): Promise<void> {
    if (!subId || this.invoices()[subId]) return;
    this.invoices.set({ ...this.invoices(), [subId]: 'loading' });
    try {
      const res = await firstValueFrom(
        this.http.get<{ invoices: FlowInvoice[] }>(`${environment.apiUrl}/subscriptions/invoices/`, {
          params: { subscription_id: subId },
        }),
      );
      this.invoices.set({ ...this.invoices(), [subId]: res?.invoices ?? [] });
    } catch {
      this.invoices.set({ ...this.invoices(), [subId]: [] });
      this.notify.error('No se pudieron traer los cobros de Flow.');
    }
  }
  /** Paginación client-side (los datos llegan completos en una sola carga). */
  pageSize = signal(20);
  pageIndex = signal(0);
  breadcrumbs = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Suscripciones' },
  ];

  /** Orígenes presentes con su conteo, para los chips de filtro. */
  providers = computed(() => {
    const map = new Map<string, { provider: string; label: string; count: number }>();
    for (const r of this.rows()) {
      const cur = map.get(r.provider);
      if (cur) cur.count++;
      else map.set(r.provider, { provider: r.provider, label: r.provider_label, count: 1 });
    }
    return [...map.values()];
  });

  /** Filas según el filtro de origen + la búsqueda de texto. */
  filtered = computed(() => {
    const byProvider =
      this.filter() === 'all' ? this.rows() : this.rows().filter(r => r.provider === this.filter());
    const q = this.search().trim().toLowerCase();
    if (!q) return byProvider;
    return byProvider.filter(r =>
      `${r.name} ${r.email} ${r.plan_name} ${r.provider_label} ${r.subscription_id}`
        .toLowerCase()
        .includes(q),
    );
  });

  /** Página actual de las filas filtradas (paginación client-side). */
  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  /** Cambia el filtro y vuelve a la primera página (evita quedar fuera de rango). */
  setFilter(provider: string): void {
    this.filter.set(provider);
    this.pageIndex.set(0);
  }

  /** Actualiza la búsqueda y vuelve a la primera página. */
  onSearch(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
  }

  onPage(e: PageEvent): void {
    this.pageSize.set(e.pageSize);
    this.pageIndex.set(e.pageIndex);
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: Subscription[] }>(`${environment.apiUrl}/subscriptions/all/`, {
          params: this.showInactive() ? { include_inactive: '1' } : {},
        }),
      );
      this.rows.set(res?.data ?? []);
      this.error.set('');
    } catch {
      this.error.set('No se pudieron cargar las suscripciones.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Cancela una suscripción recurrente (Flow/PayPal) pidiendo la contraseña del
   * admin. Los pagos por período (link de pago) no se cancelan (vencen solos). */
  cancelSub(subscriptionId: string, who: string): void {
    if (!subscriptionId) {
      this.notify.error('Esta suscripción es por período (link de pago): no cobra sola, vence. No hay nada que cancelar.');
      return;
    }
    const ref = this.dialog.open(PasswordConfirmDialogComponent, {
      data: {
        title: 'Cancelar suscripción',
        message: `Vas a cancelar la suscripción de ${who}. Dejará de cobrarse automáticamente. Esta acción no se puede deshacer.`,
        confirmText: 'Cancelar suscripción',
        action: (password: string) =>
          firstValueFrom(
            this.http.post(`${environment.apiUrl}/subscriptions/admin-cancel/`, {
              subscription_id: subscriptionId,
              password,
            }),
          ).then(() => undefined),
      } as PasswordConfirmData,
      width: '440px',
      maxWidth: '94vw',
    });
    ref.afterClosed().subscribe(async (ok?: boolean) => {
      if (!ok) return; // cerró sin confirmar o hubo error (ya mostrado inline)
      this.notify.success('Suscripción cancelada.');
      await this.load();
    });
  }
}
