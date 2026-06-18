import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';

import type { StatCardTone } from '../stat-card/stat-card.model';
import type { CompositionCardConfig, CompositionCardRow } from './composition-card.model';

export type { CompositionCardConfig, CompositionCardRow } from './composition-card.model';

/**
 * Tarjeta de **composición / reparto**: cabecera (título + subtítulo) y filas con
 * etiqueta, barra horizontal y valores (importe + porcentaje).
 *
 * Tokens `--fvx-*`, radio `--fvx-stat-card-radius`. Colores de barra por fila (`barColor`)
 * o paleta de gráficos (`--fvx-chart-color-*`). `tone` alinea la tarjeta con la escala de
 * `app-stat-card` (borde superior de acento).
 *
 * ```html
 * <app-composition-card
 *   title="Composición de activos"
 *   subtitle="Bs 26.315.000 al 23 abr"
 *   [rows]="breakdown"
 *   tone="primary"
 *   maxWidth="520px"
 *   maxHeight="280px"
 * />
 * ```
 */
@Component({
  selector: 'app-composition-card',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="composition-card"
      [attr.data-tone]="toneResolved"
      [style.min-height]="hostMinHeight"
    >
      <header class="composition-card__head">
        <h3 class="composition-card__title">{{ titleResolved }}</h3>
        @if (subtitleResolved) {
          <p class="composition-card__subtitle">{{ subtitleResolved }}</p>
        }
      </header>
      <div class="composition-card__scroll">
        <ul class="composition-card__list" role="list">
          @for (row of rowsResolved; track $index) {
            <li class="composition-card__row" role="listitem">
              <span class="composition-card__label">{{ row.label }}</span>
              <div class="composition-card__bar-cell">
                <div
                  class="composition-card__track"
                  role="progressbar"
                  [attr.aria-valuenow]="barWidth(row.percent)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  [attr.aria-label]="row.label"
                >
                  <div
                    class="composition-card__fill"
                    [style.width.%]="barWidth(row.percent)"
                    [style.background]="barFill(row, $index)"
                  ></div>
                </div>
              </div>
              <div class="composition-card__values">
                <span class="composition-card__value">{{ row.value }}</span>
                <span class="composition-card__pct">{{ percentLabel(row) }}</span>
              </div>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      box-sizing: border-box;
      width: 100%;
    }

    :host.composition-card-host--scroll {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    :host.composition-card-host--scroll .composition-card {
      flex: 1 1 auto;
      min-height: 0;
      max-height: 100%;
      overflow: hidden;
    }

    .composition-card {
      --composition-accent: var(--fvx-link, #2563eb);
      box-sizing: border-box;
      background: var(--fvx-bg-card, #fff);
      border: 1px solid var(--fvx-border, #e2e8f0);
      border-radius: var(--fvx-stat-card-radius, 6px);
      box-shadow:
        0 1px 2px color-mix(in srgb, var(--fvx-text-primary, #0f172a) 4%, transparent),
        0 1px 3px color-mix(in srgb, var(--fvx-text-primary, #0f172a) 6%, transparent);
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .composition-card[data-tone='primary'] { --composition-accent: var(--fvx-link, #2563eb); }
    .composition-card[data-tone='success'] { --composition-accent: #16a34a; }
    .composition-card[data-tone='warning'] { --composition-accent: #d97706; }
    .composition-card[data-tone='danger'] { --composition-accent: #dc2626; }
    .composition-card[data-tone='info'] { --composition-accent: #0891b2; }
    .composition-card[data-tone='neutral'] { --composition-accent: var(--fvx-text-muted, #94a3b8); }

    .composition-card__head {
      flex-shrink: 0;
      padding: 16px 18px 14px;
      border-bottom: 1px solid var(--fvx-border, #e2e8f0);
      box-shadow: inset 0 3px 0 0 var(--composition-accent);
    }

    .composition-card__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.3;
      color: var(--fvx-text-primary, #1e293b);
    }

    .composition-card__subtitle {
      margin: 6px 0 0;
      font-size: 0.8125rem;
      line-height: 1.35;
      color: var(--fvx-text-secondary, #64748b);
    }

    .composition-card__scroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 0 18px 16px;
    }

    .composition-card__list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .composition-card__row {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(72px, 1.4fr) auto;
      gap: 12px 14px;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--fvx-border, #e2e8f0);
    }

    .composition-card__row:last-child {
      border-bottom: none;
      padding-bottom: 4px;
    }

    .composition-card__label {
      font-size: 0.8125rem;
      line-height: 1.35;
      color: var(--fvx-text-primary, #1e293b);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .composition-card__bar-cell {
      min-width: 0;
      display: flex;
      align-items: center;
    }

    .composition-card__track {
      width: 100%;
      height: 8px;
      border-radius: 9999px;
      background: var(--fvx-hover-bg, rgba(148, 163, 184, 0.22));
      overflow: hidden;
    }

    .composition-card__fill {
      height: 100%;
      border-radius: inherit;
      min-width: 0;
      transition: width 0.35s ease;
    }

    .composition-card__values {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      text-align: right;
      flex-shrink: 0;
      padding-left: 4px;
    }

    .composition-card__value {
      font-size: 0.875rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--fvx-text-primary, #1e293b);
      line-height: 1.2;
    }

    .composition-card__pct {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--fvx-text-muted, #94a3b8);
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 520px) {
      .composition-card__row {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .composition-card__label {
        white-space: normal;
        overflow: visible;
        text-overflow: unset;
      }
      .composition-card__values {
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
        width: 100%;
        text-align: left;
        padding-left: 0;
      }
    }
  `],
})
export class CompositionCardComponent {
  @Input() card?: Partial<CompositionCardConfig>;

  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() rows?: CompositionCardRow[];
  @Input() tone?: StatCardTone;

  @Input() maxWidth?: string;
  @Input() maxHeight?: string;
  @Input() minHeight?: string;

  @HostBinding('style.max-width')
  get hostMaxWidth(): string | null {
    const v = (this.maxWidth ?? this.card?.maxWidth)?.trim();
    return v || null;
  }

  @HostBinding('style.max-height')
  get hostMaxHeight(): string | null {
    const v = (this.maxHeight ?? this.card?.maxHeight)?.trim();
    return v || null;
  }

  @HostBinding('class.composition-card-host--scroll')
  get hostScrollClass(): boolean {
    return !!this.hostMaxHeight;
  }

  get hostMinHeight(): string | null {
    const v = (this.minHeight ?? this.card?.minHeight)?.trim();
    return v || null;
  }

  get titleResolved(): string {
    return this.title ?? this.card?.title ?? '';
  }

  get subtitleResolved(): string | undefined {
    const s = this.subtitle ?? this.card?.subtitle;
    const t = typeof s === 'string' ? s.trim() : '';
    return t.length ? t : undefined;
  }

  get rowsResolved(): CompositionCardRow[] {
    return this.rows ?? this.card?.rows ?? [];
  }

  get toneResolved(): StatCardTone {
    return this.tone ?? this.card?.tone ?? 'primary';
  }

  barWidth(p: number): number {
    const n = Number(p);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  percentLabel(row: CompositionCardRow): string {
    const custom = row.percentLabel?.trim();
    if (custom) return custom;
    return `${Math.round(this.barWidth(row.percent))}%`;
  }

  barFill(row: CompositionCardRow, index: number): string {
    const c = row.barColor?.trim();
    if (c) return c;
    const i = (index % 6) + 1;
    return `var(--fvx-chart-color-${i})`;
  }
}
