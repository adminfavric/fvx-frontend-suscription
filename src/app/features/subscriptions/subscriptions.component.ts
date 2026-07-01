import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
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
 * manual) — espejo local unificado (`GET /api/v1/subscriptions/all/`), con
 * filtro por origen. Solo lectura.
 */
@Component({
  selector: 'app-subscriptions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTableModule, MatPaginatorModule, MatProgressBarModule, MatIconModule, PageHeaderComponent],
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
    } @else if (!loading()) {
      @if (rows().length) {
        <div class="filters">
          <button class="chip-f" [class.chip-f--on]="filter() === 'all'" (click)="setFilter('all')">
            Todas <span class="chip-f__n">{{ rows().length }}</span>
          </button>
          @for (p of providers(); track p.provider) {
            <button class="chip-f" [class.chip-f--on]="filter() === p.provider" (click)="setFilter(p.provider)">
              {{ p.label }} <span class="chip-f__n">{{ p.count }}</span>
            </button>
          }
        </div>
      }

      @if (!rows().length) {
        <div class="state"><mat-icon>subscriptions</mat-icon> Aún no hay suscripciones activas.</div>
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
    .cust__email { font-size: .78rem; color: var(--fvx-text-muted, #6b6478); }
    .origen { display:inline-block; padding:2px 10px; border-radius:999px; font-size:.78rem; background:#f0eaf6; color:#5b3a8a; font-weight:600; }
    .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .78rem; background: #ececf2; color: #555; }
    .chip--ok { background: #e3f6ea; color: #1f7a45; }
    .chip--bad { background: #fdecea; color: #c0392b; }
    .muted { color: var(--fvx-text-muted, #828aa0); }
    .state { display: flex; align-items: center; gap: 8px; padding: 32px; color: var(--fvx-text-muted, #6b6478); justify-content: center; }
    .state--error { color: #c0392b; }
  `],
})
export class SubscriptionsComponent implements OnInit {
  private http = inject(HttpClient);

  cols = ['plan', 'customer', 'origen', 'estado', 'vence', 'id'];
  rows = signal<Subscription[]>([]);
  loading = signal(true);
  error = signal('');
  /** Filtro por origen ('all' o el provider). */
  filter = signal<string>('all');
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

  /** Filas según el filtro de origen seleccionado. */
  filtered = computed(() =>
    this.filter() === 'all' ? this.rows() : this.rows().filter(r => r.provider === this.filter()),
  );

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

  onPage(e: PageEvent): void {
    this.pageSize.set(e.pageSize);
    this.pageIndex.set(e.pageIndex);
  }

  async ngOnInit(): Promise<void> {
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
}
