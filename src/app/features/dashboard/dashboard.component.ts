import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  StatCardComponent,
  type StatCardIconSurface,
  type StatCardTone,
  type StatCardVariant,
  type StatCardTrend,
} from '../../shared/components/stat-card/stat-card.component';
import { SectionCardComponent } from '../../shared/components/section-card/section-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import {
  StatusChipComponent,
  type StatusChipVariant,
} from '../../shared/components/status-chip/status-chip.component';
import type { AppChartPieSlice } from '../../shared/components/chart/chart.model';
import { DashboardStatsService } from '../../core/services/dashboard-stats.service';
import type {
  DashboardBreakdownEntry,
  DashboardPlanRow,
  DashboardStatItem,
} from '../../core/models/dashboard-stats.model';

const TONES: readonly StatCardTone[] = [
  'neutral',
  'primary',
  'success',
  'warning',
  'danger',
  'info',
];
const VARIANTS: readonly StatCardVariant[] = [
  'default',
  'filled',
  'outline',
  'minimal',
  'solid',
  'split',
  'split-solid',
];
const TRENDS: readonly StatCardTrend[] = ['up', 'down', 'neutral'];
const ICON_SURFACES: readonly StatCardIconSurface[] = ['soft', 'filled', 'muted'];

/** Tonos vivos para placeholders mientras carga. */
const SKELETON_TONES: readonly StatCardTone[] = ['primary', 'success', 'warning', 'info'];

/** Mapea el ``tone`` del backend al ``variant`` de ``app-status-chip``. */
const STATUS_CHIP_BY_TONE: Record<string, StatusChipVariant> = {
  success: 'success',
  warning: 'warn',
  danger: 'danger',
  info: 'info',
  neutral: 'neutral',
  primary: 'info',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    StatCardComponent,
    SectionCardComponent,
    ChartComponent,
    StatusChipComponent,
    TranslocoPipe,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        [title]="'dashboard.title' | transloco"
        [subtitle]="'dashboard.subtitle' | transloco"
        [breadcrumbs]="[
          { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
          { labelKey: 'dashboard.breadcrumb' },
        ]"
      />
      <section class="page-body">
        @if (error()) {
          <p class="dashboard-error" role="alert">{{ 'dashboard.statsLoadError' | transloco }}</p>
        } @else {
          <!-- ── KPIs ─────────────────────────────────────────────────── -->
          <div class="stat-grid" [attr.aria-busy]="loading()">
            @if (loading()) {
              @for (s of skeletonSlots; track s) {
                <app-stat-card
                  [label]="'dashboard.loadingKpi' | transloco"
                  icon="insights"
                  [loading]="true"
                  [tone]="skeletonTones[s % skeletonTones.length]"
                  [stretchHeight]="true"
                  [minHeight]="kpiMinHeight"
                />
              }
            } @else {
              @for (item of items(); track item.id; let i = $index) {
                <app-stat-card
                  [icon]="item.icon"
                  [label]="labelForItem(item)"
                  [value]="displayValue(item)"
                  [prefix]="item.prefix"
                  [suffix]="item.suffix"
                  [description]="item.description"
                  [tone]="toneFor(item, i)"
                  [variant]="variantFor(item)"
                  [trend]="trendFor(item)"
                  [trendValue]="item.trend_value"
                  [trendLabel]="item.trend_label"
                  [iconSurface]="iconSurfaceFor(item, i)"
                  [loading]="false"
                  [stretchHeight]="true"
                  [minHeight]="kpiMinHeight"
                  [hoverLift]="true"
                />
              } @empty {
                <p class="dashboard-empty">{{ 'dashboard.noStats' | transloco }}</p>
              }
            }
          </div>

          @if (!loading()) {
            <!-- ── Gráfico + estado de pagos ──────────────────────────── -->
            <div class="dashboard-split">
              <app-section-card
                class="dashboard-split__main"
                [title]="'dashboard.sections.membersByPlan' | transloco"
                icon="donut_large"
              >
                @if (planSlices().length) {
                  <app-chart
                    chartType="donut"
                    [pieSlices]="planSlices()"
                    [height]="300"
                  />
                } @else {
                  <p class="dashboard-empty">{{ 'dashboard.sections.noMembers' | transloco }}</p>
                }
              </app-section-card>

              <app-section-card
                class="dashboard-split__aside"
                [title]="'dashboard.sections.paymentStatus' | transloco"
                icon="receipt_long"
              >
                <ul class="breakdown-list">
                  @for (row of byStatus(); track row.key) {
                    <li class="breakdown-row">
                      <app-status-chip [variant]="chipVariant(row)" [label]="row.label" />
                      <span class="breakdown-row__value">{{ formatNumber(row.value) }}</span>
                    </li>
                  } @empty {
                    <li class="dashboard-empty">{{ 'dashboard.sections.noPayments' | transloco }}</li>
                  }
                </ul>

                @if (byProvider().length) {
                  <h4 class="breakdown-subtitle">{{ 'dashboard.sections.byProvider' | transloco }}</h4>
                  <ul class="breakdown-list">
                    @for (row of byProvider(); track row.key) {
                      <li class="breakdown-row breakdown-row--plain">
                        <span class="breakdown-row__label">{{ row.label }}</span>
                        <span class="breakdown-row__value">{{ formatNumber(row.value) }}</span>
                      </li>
                    }
                  </ul>
                }
              </app-section-card>
            </div>

            <!-- ── Tabla de planes ────────────────────────────────────── -->
            <app-section-card
              [title]="'dashboard.sections.plansTitle' | transloco"
              [subtitle]="'dashboard.sections.plansSubtitle' | transloco"
              icon="workspace_premium"
              [noPadding]="true"
            >
              @if (plans().length) {
                <div class="plans-table-wrap">
                  <table class="plans-table">
                    <thead>
                      <tr>
                        <th>{{ 'dashboard.table.plan' | transloco }}</th>
                        <th>{{ 'dashboard.table.price' | transloco }}</th>
                        <th>{{ 'dashboard.table.interval' | transloco }}</th>
                        <th class="num">{{ 'dashboard.table.members' | transloco }}</th>
                        <th class="num">{{ 'dashboard.table.pending' | transloco }}</th>
                        <th>{{ 'dashboard.table.status' | transloco }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (plan of plans(); track plan.id) {
                        <tr>
                          <td class="plans-table__name">{{ plan.name }}</td>
                          <td>{{ formatMoney(plan.amount, plan.currency) }}</td>
                          <td>{{ plan.interval_label || '—' }}</td>
                          <td class="num">{{ formatNumber(plan.subscribers) }}</td>
                          <td class="num">
                            @if (plan.pending > 0) {
                              <span class="pending-badge">{{ formatNumber(plan.pending) }}</span>
                            } @else {
                              <span class="muted">0</span>
                            }
                          </td>
                          <td>
                            <app-status-chip
                              [variant]="plan.is_active ? 'success' : 'muted'"
                              [label]="(plan.is_active ? 'dashboard.table.active' : 'dashboard.table.inactive') | transloco"
                            />
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <p class="dashboard-empty dashboard-empty--padded">
                  {{ 'dashboard.sections.noPlans' | transloco }}
                </p>
              }
            </app-section-card>
          }
        }
      </section>
    </div>
  `,
  styles: [`
    .page-body {
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
      align-items: stretch;
    }
    .stat-grid > app-stat-card { min-width: 0; }

    .dashboard-split {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .dashboard-split { grid-template-columns: 1fr; }
    }
    .dashboard-split__main,
    .dashboard-split__aside { min-width: 0; }

    .breakdown-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .breakdown-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .breakdown-row--plain {
      padding: 6px 0;
      border-bottom: 1px solid var(--fvx-border, #e4e6f0);
    }
    .breakdown-row--plain:last-child { border-bottom: 0; }
    .breakdown-row__label { color: var(--fvx-text-secondary, #565d72); font-size: 0.9375rem; }
    .breakdown-row__value {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--fvx-text-primary, #171a26);
    }
    .breakdown-subtitle {
      margin: 18px 0 10px;
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--fvx-text-muted, #828aa0);
    }

    .plans-table-wrap { width: 100%; overflow-x: auto; }
    .plans-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9375rem;
    }
    .plans-table th,
    .plans-table td {
      padding: 12px 16px;
      text-align: left;
      white-space: nowrap;
    }
    .plans-table th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--fvx-text-muted, #828aa0);
      background: var(--fvx-bg-surface-2, #eef0f7);
      border-bottom: 1px solid var(--fvx-border, #e4e6f0);
    }
    .plans-table tbody tr { border-bottom: 1px solid var(--fvx-border, #e4e6f0); }
    .plans-table tbody tr:last-child { border-bottom: 0; }
    .plans-table tbody tr:hover { background: var(--fvx-hover-bg, rgba(40, 50, 120, 0.045)); }
    .plans-table td { color: var(--fvx-text-secondary, #565d72); }
    .plans-table__name { font-weight: 600; color: var(--fvx-text-primary, #171a26); }
    .plans-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .muted { color: var(--fvx-text-muted, #828aa0); }
    .pending-badge {
      display: inline-block;
      min-width: 22px;
      padding: 1px 8px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.8125rem;
      color: var(--fvx-chip-warn-fg, #dd9512);
      background: var(--fvx-chip-warn-bg, #fbf0d8);
      border: 1px solid var(--fvx-chip-warn-border, #f0dba4);
    }

    .dashboard-error {
      margin: 0;
      color: var(--fvx-states-error, #b91c1c);
      font-size: 0.9375rem;
    }
    .dashboard-empty {
      margin: 0;
      color: var(--fvx-text-secondary, #475569);
      font-size: 0.9375rem;
    }
    .dashboard-empty--padded { padding: 16px; }
  `],
})
export class DashboardComponent implements OnInit {
  /** Placeholders mientras carga el primer ``GET /stats/``. */
  readonly skeletonSlots = [0, 1, 2, 3, 4, 5, 6] as const;
  readonly skeletonTones = SKELETON_TONES;

  /** Alto mínimo uniforme de las KPI en grid. */
  readonly kpiMinHeight = '118px';

  private readonly stats = inject(DashboardStatsService);
  private readonly transloco = inject(TranslocoService);

  readonly items = signal<DashboardStatItem[]>([]);
  readonly plans = signal<DashboardPlanRow[]>([]);
  readonly byStatus = signal<DashboardBreakdownEntry[]>([]);
  readonly byProvider = signal<DashboardBreakdownEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  /** Porciones del donut: solo planes con miembros activos. */
  readonly planSlices = computed<AppChartPieSlice[]>(() =>
    this.plans()
      .filter((p) => p.subscribers > 0)
      .map((p) => ({ name: p.name, value: p.subscribers })),
  );

  private readonly numberFmt = new Intl.NumberFormat('es-CL');

  ngOnInit(): void {
    this.stats.getStats().subscribe({
      next: (res) => {
        this.items.set(res.items ?? []);
        this.plans.set(res.plans ?? []);
        this.byStatus.set(res.by_status ?? []);
        this.byProvider.set(res.by_provider ?? []);
        this.loading.set(false);
        this.error.set(false);
      },
      error: () => {
        this.items.set([]);
        this.plans.set([]);
        this.byStatus.set([]);
        this.byProvider.set([]);
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  labelForItem(item: DashboardStatItem): string {
    if (!item.label_key) {
      return item.label;
    }
    const t = this.transloco.translate(item.label_key);
    if (!t || t === item.label_key) {
      return item.label;
    }
    return t;
  }

  /** Formatea valores numéricos con separador de miles; deja strings tal cual. */
  displayValue(item: DashboardStatItem): string {
    return typeof item.value === 'number' ? this.numberFmt.format(item.value) : String(item.value);
  }

  formatNumber(value: number): string {
    return this.numberFmt.format(value);
  }

  formatMoney(amount: number | null, currency: string): string {
    if (amount == null) {
      return '—';
    }
    return `$${this.numberFmt.format(amount)} ${currency || 'CLP'}`;
  }

  toneFor(item: DashboardStatItem, index: number): StatCardTone {
    const raw = (item.tone ?? '').trim() as StatCardTone;
    if (raw && TONES.includes(raw)) return raw;
    return SKELETON_TONES[index % SKELETON_TONES.length]!;
  }

  variantFor(item: DashboardStatItem): StatCardVariant {
    const raw = (item.variant ?? '').trim() as StatCardVariant;
    return raw && VARIANTS.includes(raw) ? raw : 'default';
  }

  trendFor(item: DashboardStatItem): StatCardTrend | undefined {
    if (item.trend == null || item.trend === '') {
      return undefined;
    }
    const tr = item.trend as StatCardTrend;
    return TRENDS.includes(tr) ? tr : undefined;
  }

  iconSurfaceFor(item: DashboardStatItem, index: number): StatCardIconSurface {
    const s = (item.icon_surface ?? '') as StatCardIconSurface;
    if (ICON_SURFACES.includes(s)) return s;
    return ICON_SURFACES[index % ICON_SURFACES.length]!;
  }

  chipVariant(row: DashboardBreakdownEntry): StatusChipVariant {
    return STATUS_CHIP_BY_TONE[row.tone ?? ''] ?? 'neutral';
  }
}
