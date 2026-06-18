import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import type {
  StatCardConfig,
  StatCardDensity,
  StatCardIconPosition,
  StatCardIconSurface,
  StatCardTone,
  StatCardTrend,
  StatCardVariant,
} from './stat-card.model';

export type {
  StatCardConfig,
  StatCardDensity,
  StatCardIconPosition,
  StatCardIconSurface,
  StatCardTone,
  StatCardTrend,
  StatCardVariant,
} from './stat-card.model';

/**
 * Tarjeta de KPI (métrica). Diseñada para dashboards y encabezados de
 * páginas tipo admin. Respeta los tokens `--fvx-*` para funcionar en claro
 * y oscuro sin ajustes.
 *
 * Configuración: usa `@Input()` sueltos y/o un objeto `[card]` (`StatCardConfig`);
 * los inputs explícitos tienen prioridad cuando están definidos (no `undefined`).
 *
 * ```html
 * <!-- Básico -->
 * <app-stat-card icon="attach_money" value="44.51" label="Current price (€)" />
 *
 * <!-- Con objeto (recomendado para listas/API) -->
 * <app-stat-card [card]="kpi" />
 *
 * <!-- Dos tonos: banda lateral (ref. dashboards tipo Metronic) -->
 * <app-stat-card icon="edit" label="New posts" value="278" variant="split" tone="info" />
 * <app-stat-card icon="payments" label="Revenue" variant="split-solid" tone="success" />
 *
 * <!-- Sólida + barra -->
 * <app-stat-card icon="speed" label="CPU" value="72" suffix="%" variant="solid"
 *   tone="primary" [progress]="72" iconPosition="end" />
 *
 * <!-- Compact: fila compacta, baja altura (resumen junto a tabla) -->
 * <app-stat-card icon="groups" label="Users" value="128" density="compact" tone="primary" />
 *
 * <!-- Spinner de carga: color opcional (si no, sigue tone / variante) -->
 * <app-stat-card icon="groups" label="Users" value="—" [loading]="true" loadingSpinnerColor="#64748b" />
 * ```
 *
 * **Combinar en grid** — envolver varias en:
 *
 * ```html
 * <div class="stat-grid">
 *   <app-stat-card ... />
 * </div>
 * ```
 *
 * Donde `.stat-grid` puede definirse en tu componente como:
 * `display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;`
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.title]': 'null' },
  template: `
    <div
      class="stat"
      [class.stat--clickable]="m.clickable"
      [class.stat--compact]="densityResolved === 'compact'"
      [class.stat--hover-lift]="hoverLiftEffective"
      [class.stat--filled]="m.variant === 'filled'"
      [class.stat--outline]="m.variant === 'outline'"
      [class.stat--minimal]="m.variant === 'minimal'"
      [class.stat--solid]="m.variant === 'solid'"
      [class.stat--split]="m.variant === 'split'"
      [class.stat--split-solid]="m.variant === 'split-solid'"
      [class.stat--icon-end]="m.iconPosition === 'end'"
      [class.stat--loading]="m.loading"
      [attr.data-tone]="m.tone"
    >
      @if (m.icon && isBandVariant(m.variant)) {
        <div class="stat__band" aria-hidden="true">
          <mat-icon>{{ m.icon }}</mat-icon>
        </div>
      } @else if (m.icon) {
        <div
          class="stat__icon"
          [class.stat__icon--surface-soft]="m.iconSurface === 'soft'"
          [class.stat__icon--surface-filled]="m.iconSurface === 'filled'"
          [class.stat__icon--surface-muted]="m.iconSurface === 'muted'"
        >
          <mat-icon aria-hidden="true">{{ m.icon }}</mat-icon>
        </div>
      }

      <div class="stat__body">
        @if (m.loading) {
          <div class="stat__label stat__label--loading">
            <app-skeleton width="60%" height="11px" />
          </div>
          <div class="stat__value stat__value--loading">
            <app-skeleton width="70%" height="28px" rounded="sm" />
          </div>
        } @else {
          <div class="stat__label">{{ m.label }}</div>
          <div class="stat__value" [attr.title]="m.valueTitle || m.value">
            <span class="stat__prefix">{{ m.prefix }}</span
            ><span>{{ m.value }}</span
            ><span class="stat__suffix">{{ m.suffix }}</span>
          </div>
        }

        @if (m.trend && !m.loading) {
          <div
            class="stat__trend"
            [class.stat__trend--up]="m.trend === 'up'"
            [class.stat__trend--down]="m.trend === 'down'"
            [class.stat__trend--neutral]="m.trend === 'neutral'"
          >
            <mat-icon>
              {{
                m.trend === 'up' ? 'arrow_upward'
                : m.trend === 'down' ? 'arrow_downward'
                : 'remove'
              }}
            </mat-icon>
            <span>{{ m.trendValue }}</span>
            @if (m.trendLabel) {
              <span class="stat__trend-label">{{ m.trendLabel }}</span>
            }
          </div>
        }

        @if (progressPct !== null && !m.loading) {
          <div
            class="stat__progress"
            role="progressbar"
            [attr.aria-valuenow]="progressPct"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="stat__progress-track">
              <div class="stat__progress-fill" [style.width.%]="progressPct"></div>
            </div>
          </div>
        }

        @if (m.description && !m.loading) {
          <div class="stat__desc">{{ m.description }}</div>
        }
      </div>

      @if (m.clickable) {
        <mat-icon class="stat__chevron" aria-hidden="true">chevron_right</mat-icon>
      }
    </div>
  `,
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  /** Configuración agrupada; los `@Input()` sueltos la sobrescriben campo a campo. */
  @Input() card?: Partial<StatCardConfig>;

  @Input() icon?: string;
  @Input() label?: string;
  @Input() value?: string | number;
  @Input() prefix?: string;
  @Input() suffix?: string;
  @Input() description?: string;

  @Input() trend?: StatCardTrend;
  @Input() trendValue?: string | number;
  @Input() trendLabel?: string;

  @Input() variant?: StatCardVariant;
  @Input() tone?: StatCardTone;
  @Input() loading?: boolean;
  /** Pisa el color del spinner cuando `loading`; si omites, usa acento (`tone`) o blanco en solid/split-solid. */
  @Input() loadingSpinnerColor?: string;

  @Input() clickable?: boolean;
  @Input() valueTitle?: string;

  @Input() iconPosition?: StatCardIconPosition;
  @Input() iconSurface?: StatCardIconSurface;
  @Input() progress?: number | null;

  /** Altura mínima del host (CSS), p. ej. `118px`. */
  @Input() minHeight?: string;
  /** Altura máxima del host; desbordamiento con scroll en `.stat`. */
  @Input() maxHeight?: string;
  /**
   * Ocupa el 100% del alto disponible (celda de grid / flex).
   * En dashboards con `align-items: stretch`, iguala alturas entre tarjetas de la misma fila.
   */
  @Input() stretchHeight?: boolean;

  /**
   * Animación al hover (elevación / sombra). Si omites el valor, queda activa solo si la tarjeta es `clickable`.
   */
  @Input() hoverLift?: boolean;

  /** `compact`: fila horizontal compacta y poca altura; mismo comportamiento que `normal`. Prioridad sobre `card.density`. */
  @Input() density?: StatCardDensity;

  @Output() activate = new EventEmitter<void>();

  get densityResolved(): StatCardDensity {
    return this.density ?? this.card?.density ?? 'normal';
  }

  get spinnerDiameter(): number {
    return this.densityResolved === 'compact' ? 16 : 22;
  }

  /** Override CSS del indicador circular Material; `null` deja los estilos por defecto del componente. */
  get loadingSpinnerColorCss(): string | null {
    const raw = this.loadingSpinnerColor ?? this.card?.loadingSpinnerColor;
    if (raw === undefined || raw === null) return null;
    const v = String(raw).trim();
    return v.length > 0 ? v : null;
  }

  /** Valores efectivos (inputs + `card`). */
  get m(): Required<
    Pick<
      StatCardConfig,
      | 'label'
      | 'value'
      | 'prefix'
      | 'suffix'
      | 'variant'
      | 'tone'
      | 'loading'
      | 'clickable'
      | 'iconPosition'
      | 'iconSurface'
    >
  > &
    Pick<
      StatCardConfig,
      | 'icon'
      | 'description'
      | 'trend'
      | 'trendValue'
      | 'trendLabel'
      | 'valueTitle'
      | 'progress'
    > {
    const c = this.card;
    return {
      icon: this.icon ?? c?.icon,
      label: this.label ?? c?.label ?? '',
      value: this.value ?? c?.value ?? '',
      prefix: this.prefix ?? c?.prefix ?? '',
      suffix: this.suffix ?? c?.suffix ?? '',
      description: this.description ?? c?.description,
      trend: this.trend ?? c?.trend,
      trendValue: this.trendValue ?? c?.trendValue,
      trendLabel: this.trendLabel ?? c?.trendLabel,
      variant: this.variant ?? c?.variant ?? 'default',
      tone: this.tone ?? c?.tone ?? 'primary',
      loading: this.loading ?? c?.loading ?? false,
      clickable: this.clickable ?? c?.clickable ?? false,
      valueTitle: this.valueTitle ?? c?.valueTitle,
      iconPosition: this.iconPosition ?? c?.iconPosition ?? 'start',
      iconSurface: this.iconSurface ?? c?.iconSurface ?? 'soft',
      progress: this.progress ?? c?.progress,
    };
  }

  /** Porcentaje 0–100 para la barra, o `null` si no aplica. */
  get progressPct(): number | null {
    const p = this.m.progress;
    if (p == null) return null;
    const n = Number(p);
    if (Number.isNaN(n)) return null;
    return Math.max(0, Math.min(100, n));
  }

  /**
   * Animación hover en `.stat--hover-lift`. Prioridad: `@Input()` / `card` → si no, igual que `clickable`.
   * Desactivada mientras `loading` para no distraer del spinner.
   */
  get hoverLiftEffective(): boolean {
    if (this.m.loading) return false;
    if (this.hoverLift !== undefined) return this.hoverLift;
    if (this.card?.hoverLift !== undefined) return this.card.hoverLift;
    return this.m.clickable;
  }
  get hostMinHeight(): string | null {
    const v = (this.minHeight ?? this.card?.minHeight)?.trim();
    return v || null;
  }

  @HostBinding('style.max-height')
  get hostMaxHeight(): string | null {
    const v = (this.maxHeight ?? this.card?.maxHeight)?.trim();
    return v || null;
  }

  @HostBinding('class.stat-card--compact')
  get hostCompact(): boolean {
    return this.densityResolved === 'compact';
  }

  @HostBinding('class.stat-card--stretch')
  get hostStretch(): boolean {
    return this.stretchHeight ?? this.card?.stretchHeight ?? false;
  }

  @HostBinding('class.stat-card--max-height')
  get hostMaxHeightClass(): boolean {
    return !!this.hostMaxHeight;
  }

  @HostBinding('attr.role') get role() {
    return this.m.clickable ? 'button' : null;
  }
  @HostBinding('attr.tabindex') get tab() {
    return this.m.clickable ? 0 : null;
  }

  @HostListener('click')
  onHostClick(): void {
    if (this.m.clickable && !this.m.loading) this.activate.emit();
  }

  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  onHostKey(e: Event): void {
    if (this.m.clickable && !this.m.loading) {
      e.preventDefault();
      this.activate.emit();
    }
  }

  /** Variantes con banda vertical de icono (`split` / `split-solid`). */
  isBandVariant(variant: StatCardVariant): boolean {
    return variant === 'split' || variant === 'split-solid';
  }
}
