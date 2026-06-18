import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  StatCardComponent,
  type StatCardIconPosition,
  type StatCardIconSurface,
  type StatCardTone,
  type StatCardVariant,
  type StatCardTrend,
} from '../../shared/components/stat-card/stat-card.component';
import { DashboardStatsService } from '../../core/services/dashboard-stats.service';
import type { DashboardStatItem } from '../../core/models/dashboard-stats.model';

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

/** Ciclo para dashboard demo: fondos de color y split antes que solo borde/minimal. */
const VARIANT_DEMO_CYCLE: readonly StatCardVariant[] = [
  'filled',
  'split-solid',
  'solid',
  'split',
  'filled',
  'outline',
  'minimal',
  'default',
];

/** Tonos vivos para placeholders (rotación). */
const DEMO_ROTATING_TONES: readonly StatCardTone[] = [
  'primary',
  'success',
  'info',
  'warning',
  'danger',
];

const TRENDS: readonly StatCardTrend[] = ['up', 'down', 'neutral'];
const ICON_POSITIONS: readonly StatCardIconPosition[] = ['start', 'end'];
const ICON_SURFACES: readonly StatCardIconSurface[] = ['soft', 'filled', 'muted'];

function variantFromApiOrRotate(item: DashboardStatItem, index: number): StatCardVariant {
  const raw = (item.variant ?? '').trim();
  const v = raw as StatCardVariant;
  // La API suele mandar ``default`` para todas las filas; eso no debe bloquear el demo visual.
  if (raw && raw !== 'default' && VARIANTS.includes(v)) return v;
  return VARIANT_DEMO_CYCLE[index % VARIANT_DEMO_CYCLE.length]!;
}

function iconPositionFromApiOrRotate(item: DashboardStatItem, index: number): StatCardIconPosition {
  const p = (item.icon_position ?? '') as StatCardIconPosition;
  if (ICON_POSITIONS.includes(p)) return p;
  return index % 2 === 0 ? 'start' : 'end';
}

function iconSurfaceFromApiOrRotate(item: DashboardStatItem, index: number): StatCardIconSurface {
  const s = (item.icon_surface ?? '') as StatCardIconSurface;
  if (ICON_SURFACES.includes(s)) return s;
  return ICON_SURFACES[index % ICON_SURFACES.length]!;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, StatCardComponent, TranslocoPipe],
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
          <div class="stat-grid" [attr.aria-busy]="loading()">
            @if (loading()) {
              @for (s of skeletonSlots; track s) {
                <app-stat-card
                  [label]="'dashboard.loadingKpi' | transloco"
                  icon="insights"
                  [loading]="true"
                  [tone]="demoRotatingTones[s % demoRotatingTones.length]"
                  [variant]="statCardDemoVariants[s % statCardDemoVariants.length]"
                  [stretchHeight]="true"
                  [minHeight]="dashboardStatCardMinHeight"
                />
              }
            } @else {
              @for (item of items(); track item.id; let i = $index) {
                <app-stat-card
                  [icon]="item.icon"
                  [label]="labelForItem(item)"
                  [value]="item.value"
                  [description]="item.description"
                  [tone]="toneFor(item, i)"
                  [variant]="variantFor(item, i)"
                  [trend]="trendFor(item)"
                  [trendValue]="item.trend_value"
                  [trendLabel]="item.trend_label"
                  [iconPosition]="iconPositionFor(item, i)"
                  [iconSurface]="iconSurfaceFor(item, i)"
                  [progress]="progressFor(item, i)"
                  [loading]="false"
                  [stretchHeight]="true"
                  [minHeight]="dashboardStatCardMinHeight"
                  [hoverLift]="true"
                />
              } @empty {
                <p class="dashboard-empty">{{ 'dashboard.noStats' | transloco }}</p>
              }
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .page-body { margin-top: 0.5rem; }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      align-items: stretch;
    }
    .stat-grid > app-stat-card {
      min-width: 0;
    }
    .stat-grid__cell { min-width: 0; }
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
  `],
})
export class DashboardComponent implements OnInit {
  /** Placeholders mientras carga el primer ``GET /stats/``. */
  readonly skeletonSlots = [0, 1, 2, 3, 4, 5] as const;

  /**
   * Alto mínimo uniforme de las KPI en grid (la fila estira al mayor contenido;
   * `stretchHeight` en la tarjeta hace que todas alcancen ese alto).
   */
  readonly dashboardStatCardMinHeight = '118px';

  /** Ciclo demo (skeleton y cuando la API manda solo ``variant: default``). */
  readonly statCardDemoVariants = VARIANT_DEMO_CYCLE;

  readonly demoRotatingTones = DEMO_ROTATING_TONES;

  private readonly stats = inject(DashboardStatsService);
  private readonly transloco = inject(TranslocoService);

  readonly items = signal<DashboardStatItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit(): void {
    this.stats.getStats().subscribe({
      next: (res) => {
        this.items.set(res.items ?? []);
        this.loading.set(false);
        this.error.set(false);
      },
      error: () => {
        this.items.set([]);
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

  /**
   * Respeta el tono de la API; si falta o es inválido, rota entre tonos vivos para el demo.
   */
  toneFor(item: DashboardStatItem, index: number): StatCardTone {
    const raw = (item.tone ?? '').trim();
    const t = raw as StatCardTone;
    if (raw && TONES.includes(t)) return t;
    return DEMO_ROTATING_TONES[index % DEMO_ROTATING_TONES.length]!;
  }

  /**
   * Si la API envía un ``variant`` distinto de ``default``, se respeta.
   * Si omite el campo o manda ``default`` (caso habitual del backend plantilla),
   * se usa un ciclo demo con fondos de color (``filled``, ``solid``, ``split-*``, …).
   */
  variantFor(item: DashboardStatItem, index: number): StatCardVariant {
    return variantFromApiOrRotate(item, index);
  }

  trendFor(item: DashboardStatItem): StatCardTrend | undefined {
    if (item.trend == null || item.trend === '') {
      return undefined;
    }
    const tr = item.trend as StatCardTrend;
    return TRENDS.includes(tr) ? tr : undefined;
  }

  iconPositionFor(item: DashboardStatItem, index: number): StatCardIconPosition {
    return iconPositionFromApiOrRotate(item, index);
  }

  iconSurfaceFor(item: DashboardStatItem, index: number): StatCardIconSurface {
    return iconSurfaceFromApiOrRotate(item, index);
  }

  progressFor(item: DashboardStatItem, index: number): number | null | undefined {
    const v = item.progress;
    if (v != null) {
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    }
    const variant = variantFromApiOrRotate(item, index);
    if (variant === 'solid' || variant === 'split-solid') {
      const demos = [78, 62, 88, 52, 94];
      return demos[index % demos.length];
    }
    return undefined;
  }
}
