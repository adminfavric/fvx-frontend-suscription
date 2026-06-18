import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnChanges,
  SimpleChanges,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

import { ThemeService } from '../../../core/services/theme.service';
import type {
  AppChartCartesianSeries,
  AppChartPieSlice,
  AppChartStyleOptions,
  AppChartType,
} from './chart.model';

/**
 * Lee una variable CSS probando el elemento de contexto (p. ej. el host de
 * `app-chart`), luego `document.documentElement` y `body`, donde suelen
 * resolverse `--fvx-*` del tema. Así ECharts recibe un color concreto (p. ej.
 * `--fvx-text-primary` claro en tmp-dark) y no cae a un fallback pensado
 * para tema claro.
 */
function readCssVarFrom(contextEl: Element, name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  for (const el of [contextEl, document.documentElement, document.body]) {
    if (!el) {
      continue;
    }
    try {
      const v = getComputedStyle(el).getPropertyValue(name).trim();
      if (v) {
        return v;
      }
    } catch {
      /* host puede no ser Element válido en tests */
    }
  }
  return fallback;
}

/** Último recurso si no se resuelve el tema: gris legible en fondos claros y oscuros. */
const CHART_TEXT_FALLBACK = '#94a3b8';
const CHART_MUTED_FALLBACK = '#94a3b8';
function readCssNumberFrom(root: Element, name: string, fallback: number): number {
  const raw = readCssVarFrom(root, name, String(fallback));
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Gráfico ECharts con tema alineado a ``--fvx-*`` y tokens de gráfico ``--fvx-chart-*``
 * (paleta, contenedor, tamaños) definidos por plantilla en ``_theme-palettes.scss``.
 *
 * **Cartesianos** (`line`, `bar`, `area`): usar `labels` + `series`.
 * **Circular** (`pie`, `donut`): usar `pieSlices` (ignora `labels`/`series`).
 *
 * **Estilo por instancia:** ``[styleOptions]`` (objeto ``AppChartStyleOptions``) o
 * variables CSS en un ancestro (heredan al ``host``). Para un gráfico totalmente
 * distinto del preset, ``mode="raw"``.
 *
 * **Avanzado:** `extraOption` se fusiona al final (deep merge superficial de
 * `series`/`xAxis` no soportado: para casos extremos, pasar `mode="raw"` y
 * solo `extraOption`).
 *
 * ```html
 * <app-chart
 *   chartType="line"
 *   title="Ventas"
 *   [labels]="['Ene','Feb','Mar']"
 *   [series]="[{ name: '2025', data: [12, 18, 9] }]"
 *   [height]="320"
 *   [styleOptions]="{ palette: ['#0ea5e9', '#64748b'], surface: 'transparent' }"
 * />
 * ```
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [NgxEchartsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="app-chart"
      echarts
      [options]="options()"
      [loading]="loadingState()"
      [initOpts]="{ renderer: 'canvas' }"
      [style.height.px]="height"
    ></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
      background: var(--fvx-chart-surface);
      border: 1px solid var(--fvx-chart-container-border);
      border-radius: var(--fvx-chart-container-radius);
    }
    .app-chart {
      width: 100%;
      min-height: 120px;
    }
  `],
})
export class ChartComponent implements OnChanges {
  private readonly themeSvc = inject(ThemeService);
  private readonly host = inject(ElementRef<HTMLElement>);

  /**
   * Colores / tipografía / contenedor para este gráfico; pisa el tema solo donde
   * se definan campos (ver ``AppChartStyleOptions`` en ``chart.model.ts``).
   */
  @Input() styleOptions: AppChartStyleOptions | null = null;

  @HostBinding('style.--fvx-chart-surface')
  private get hostSurface(): string | undefined {
    return this.styleOptions?.surface;
  }

  @HostBinding('style.--fvx-chart-container-border')
  private get hostContainerBorder(): string | undefined {
    return this.styleOptions?.containerBorder;
  }

  @HostBinding('style.--fvx-chart-container-radius')
  private get hostContainerRadius(): string | undefined {
    return this.styleOptions?.containerRadius;
  }

  /** Tipo de gráfico (preset). */
  @Input() chartType: AppChartType = 'line';

  /** Título opcional (ECharts `title.text`). */
  @Input() title = '';

  /** Altura en px del contenedor. */
  @Input() height = 280;

  /** Eje X / etiquetas de categoría (modo cartesiano). */
  @Input() labels: string[] = [];

  /** Series numéricas (modo cartesiano). */
  @Input() series: AppChartCartesianSeries[] = [];

  /** Datos para `pie` / `donut`. */
  @Input() pieSlices: AppChartPieSlice[] = [];

  /** Muestra leyenda (cartesianos). */
  @Input() legend = true;

  /** Mostrar rejilla en lectura suave. */
  @Input() grid = true;

  /** Estado de carga (spinner ECharts); enlazar con `[loading]="..."`. */
  readonly loadingState = signal(false);

  @Input() set loading(v: boolean) {
    this.loadingState.set(!!v);
  }

  /**
   * Modo `preset` (por defecto): construye `option` desde inputs.
   * Modo `raw`: ignora preset; solo usa `extraOption` como `options`.
   */
  @Input() mode: 'preset' | 'raw' = 'preset';

  /** Fusión final o única fuente en modo `raw`. */
  @Input() extraOption: EChartsOption | null = null;

  readonly options = signal<EChartsOption | null>(null);

  constructor() {
    effect(() => {
      this.themeSvc.currentId();
      if (this.mode === 'preset') {
        this.options.set(this.buildPresetOption());
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.mode === 'raw') {
      this.options.set(this.extraOption ?? null);
      return;
    }
    if (
      changes['chartType'] ||
      changes['title'] ||
      changes['labels'] ||
      changes['series'] ||
      changes['pieSlices'] ||
      changes['legend'] ||
      changes['grid'] ||
      changes['extraOption'] ||
      changes['mode'] ||
      changes['styleOptions']
    ) {
      this.options.set(this.buildPresetOption());
    }
  }

  /** Por si el padre necesita forzar lectura de CSS (poco habitual). */
  refreshFromTheme(): void {
    if (this.mode === 'preset') {
      this.options.set(this.buildPresetOption());
    }
  }

  private buildPresetOption(): EChartsOption {
    const root = this.host.nativeElement;
    const o = this.styleOptions;
    const text =
      o?.textPrimary ?? readCssVarFrom(root, '--fvx-text-primary', CHART_TEXT_FALLBACK);
    const muted = o?.textMuted ?? readCssVarFrom(root, '--fvx-text-muted', CHART_MUTED_FALLBACK);
    const border = o?.border ?? readCssVarFrom(root, '--fvx-border', '#e2e8f0');
    const card = o?.tooltipBg ?? readCssVarFrom(root, '--fvx-bg-card', '#ffffff');
    const titleFs = o?.titleFontSize ?? readCssNumberFrom(root, '--fvx-chart-title-font-size', 14);
    const axisLabelFs =
      o?.axisLabelFontSize ?? readCssNumberFrom(root, '--fvx-chart-axis-label-size', 11);
    const areaOpacity =
      o?.areaFillOpacity ?? readCssNumberFrom(root, '--fvx-chart-area-fill-opacity', 0.12);

    const baseTitle: EChartsOption['title'] = this.title
      ? {
          text: this.title,
          left: 'center',
          top: 8,
          textStyle: { color: text, fontSize: titleFs, fontWeight: 600 },
        }
      : undefined;

    const baseTooltip: EChartsOption['tooltip'] = {
      trigger: this.chartType === 'pie' || this.chartType === 'donut' ? 'item' : 'axis',
      backgroundColor: card,
      borderColor: border,
      textStyle: { color: text },
    };

    /** Alineada a temas claros (default, light, b&n): paleta analytics azul + gris. */
    const paletteDefaultFallback = [
      '#3498db',
      '#34495e',
      '#5dade2',
      '#2980b9',
      '#7f8c8d',
      '#bdc3c7',
    ] as const;
    const paletteFromCss = [
      readCssVarFrom(root, '--fvx-chart-color-1', paletteDefaultFallback[0]),
      readCssVarFrom(root, '--fvx-chart-color-2', paletteDefaultFallback[1]),
      readCssVarFrom(root, '--fvx-chart-color-3', paletteDefaultFallback[2]),
      readCssVarFrom(root, '--fvx-chart-color-4', paletteDefaultFallback[3]),
      readCssVarFrom(root, '--fvx-chart-color-5', paletteDefaultFallback[4]),
      readCssVarFrom(root, '--fvx-chart-color-6', paletteDefaultFallback[5]),
    ];
    const palette =
      o?.palette && o.palette.length > 0 ? [...o.palette] : paletteFromCss;

    if (this.chartType === 'pie' || this.chartType === 'donut') {
      const isDonut = this.chartType === 'donut';
      const data = (this.pieSlices ?? []).map((s) => ({ name: s.name, value: s.value }));
      const pie: EChartsOption = {
        color: palette,
        title: baseTitle,
        tooltip: { ...baseTooltip, trigger: 'item' },
        legend: this.legend
          ? { bottom: 8, textStyle: { color: muted, fontSize: axisLabelFs } }
          : undefined,
        series: [
          {
            type: 'pie',
            radius: isDonut ? ['42%', '68%'] : '68%',
            center: ['50%', '52%'],
            data,
            label: { color: text, fontSize: axisLabelFs },
            emphasis: {
              itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' },
            },
          },
        ],
      };
      return { ...pie, ...(this.extraOption ?? {}) } as EChartsOption;
    }

    const isArea = this.chartType === 'area';
    const seriesType = isArea ? 'line' : this.chartType === 'bar' ? 'bar' : 'line';

    const builtSeries = (this.series ?? []).map((s) => ({
      name: s.name,
      type: seriesType as 'line' | 'bar',
      smooth: true,
      showSymbol: true,
      areaStyle: isArea ? { opacity: areaOpacity } : undefined,
      emphasis: { focus: 'series' as const },
      data: s.data,
    }));

    const cart: EChartsOption = {
      color: palette,
      title: baseTitle,
      tooltip: baseTooltip,
      legend: this.legend
        ? { type: 'scroll', bottom: 4, textStyle: { color: muted, fontSize: axisLabelFs } }
        : undefined,
      grid: this.grid
        ? {
            left: '3%',
            right: '4%',
            bottom: this.legend ? 48 : 24,
            top: this.title ? 52 : 36,
            // ECharts 6 deprecó ``containLabel`` (requería ``use(LegacyGridContainLabel)``).
            // Reemplazo equivalente exacto según la doc de ECharts 6:
            //   containLabel: true  ≡  { outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' }
            // El grid respeta left/right/top/bottom como límite exterior y se
            // contrae lo necesario para que las etiquetas de eje no se corten.
            outerBoundsMode: 'same',
            outerBoundsContain: 'axisLabel',
          }
        : undefined,
      xAxis: {
        type: 'category',
        boundaryGap: this.chartType === 'bar',
        data: this.labels ?? [],
        axisLine: { lineStyle: { color: border } },
        axisLabel: { color: muted, fontSize: axisLabelFs },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: muted, fontSize: axisLabelFs },
        splitLine: this.grid
          ? { lineStyle: { color: border, opacity: 0.45 } }
          : undefined,
      },
      series: builtSeries,
    };
    return { ...cart, ...(this.extraOption ?? {}) } as EChartsOption;
  }
}
