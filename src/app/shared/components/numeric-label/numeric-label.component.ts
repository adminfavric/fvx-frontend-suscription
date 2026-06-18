import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

/** Sign mode for coloring. */
export type NumericLabelColorMode =
  /** No coloring (inherits). */
  | 'none'
  /**
   * Saldos / deuda: rojo SOLO cuando el valor es negativo.
   * Semántica contable ("debe" en rojo).
   */
  | 'negative-red'
  /**
   * Variaciones / deltas: verde sube, rojo baja.
   * **NO** usar en montos absolutos — significa "subió/bajó", no "bueno/malo".
   * Recomendado combinarlo con ``showSignIcon=true`` (↑ / ↓).
   */
  | 'pos-neg';

/** Visual weight. */
export type NumericLabelWeight = 'normal' | 'medium' | 'bold';

/**
 * Etiqueta numérica con formato de miles, decimales, moneda y coloreo
 * condicional. Pensada para **celdas de tabla, resúmenes y formularios
 * read-only** donde mostrar cifras de forma consistente.
 *
 * ### Reglas de uso (spec FVX)
 *
 * - **``tabular-nums`` siempre activo** — los dígitos ocupan el mismo ancho y
 *   las columnas (1.234, 9.876, 12.345…) alinean perfectamente. No depende
 *   de ``monospace``.
 * - En columnas de tabla, alinear a la derecha (``[alignRight]="true"`` o
 *   ``text-align: right`` en el ``<td>``). Los números se comparan por su
 *   unidad/decena/centena.
 * - **Decimales fijos por columna** — no mezclar 2 y 4 decimales en la misma
 *   columna; rompe la alineación visual.
 * - **CLP**: ``decimals=0``. **USD/EUR**: ``decimals=2``.
 * - **``negative-red``** = saldos/deuda. **``pos-neg`` + flecha** = variaciones.
 *   No combinar coloreo con ``color`` custom (ambiguo).
 * - **``notation="compact"`` SOLO en stat-cards / KPIs / gráficos** — en
 *   tablas de detalle siempre el valor completo. El componente auto-genera
 *   tooltip con el valor exacto cuando notation es compact.
 * - **``monospace=true``** se reserva para **IDs / códigos** (rol SII, RUT,
 *   bg-101); en montos basta tabular-nums.
 *
 * ### Ejemplos
 *
 * ```html
 * <!-- Simple en tabla, alineado a la derecha -->
 * <app-numeric-label [value]="1234567.89" [alignRight]="true" />
 *
 * <!-- Moneda CLP — símbolo atenuado, valor sólido -->
 * <app-numeric-label
 *   [value]="48500"
 *   currency="CLP"
 *   [decimals]="0"
 *   locale="es-CL"
 * />
 *
 * <!-- Saldo: rojo solo si es negativo -->
 * <app-numeric-label [value]="-12500" currency="CLP" [decimals]="0" colorMode="negative-red" />
 *
 * <!-- Variación vs mes anterior -->
 * <app-numeric-label [value]="-3.4" suffix=" %" colorMode="pos-neg" [showSignIcon]="true" />
 *
 * <!-- KPI compacto con tooltip automático del valor exacto -->
 * <app-numeric-label [value]="1250000" notation="compact" />
 *
 * <!-- Placeholder para null (≠ cero real) -->
 * <app-numeric-label [value]="null" emptyText="—" />
 * ```
 */
@Component({
  selector: 'app-numeric-label',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.title]': 'null' },
  template: `
    <span
      class="num"
      [class.num--bold]="weight === 'bold'"
      [class.num--medium]="weight === 'medium'"
      [class.num--mono]="monospace"
      [class.num--right]="alignRight"
      [style.color]="effectiveColor"
      [attr.title]="effectiveTooltip"
    >
      @if (showSignIcon && valueState !== 'empty') {
        <mat-icon class="num__sign" aria-hidden="true">
          {{ valueState === 'pos' ? 'arrow_upward' : valueState === 'neg' ? 'arrow_downward' : 'remove' }}
        </mat-icon>
      }
      @if (parts.length > 0) {
        @for (p of parts; track $index) {
          <span [class]="partClass(p.type)">{{ p.value }}</span>
        }
      } @else {
        <!-- Fallback: valor empty (—) o error de Intl. -->
        <span class="num__text">{{ formattedFallback }}</span>
      }
      @if (suffix) {
        <span class="num__suffix">{{ suffix }}</span>
      }
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: baseline;
    }
    :host(.num--align-right),
    .num--right {
      justify-content: flex-end;
    }
    .num {
      display: inline-flex;
      align-items: center;
      gap: 0;
      color: inherit;
      line-height: 1.2;
      /* Spec FVX: tabular-nums SIEMPRE — los dígitos ocupan el mismo
         ancho aunque la fuente sea Inter/Geist (no solo en monospace). */
      font-variant-numeric: tabular-nums;
      /* El número nunca se parte en 2 líneas (rompe lectura financiera). */
      white-space: nowrap;
    }
    .num--medium { font-weight: 500; }
    .num--bold { font-weight: 700; }
    .num--mono {
      font-family: var(--fvx-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    }
    .num__sign {
      font-size: 14px;
      width: 14px;
      height: 14px;
      line-height: 14px;
      margin-right: 2px;
    }
    /* Partes del número (split via Intl.NumberFormat.formatToParts).
       Patrón fintech: símbolo de moneda atenuado + valor sólido. */
    .num__currency {
      color: var(--fvx-text-muted, var(--fvx-text-secondary));
      font-weight: 500;
      margin-right: 1px;
    }
    .num__value,
    .num__integer,
    .num__decimal,
    .num__fraction,
    .num__group,
    .num__plusSign,
    .num__minusSign {
      color: inherit;
    }
    .num__literal {
      /* Espacios/separadores que Intl inserta entre partes. */
      color: inherit;
    }
    .num__percentSign,
    .num__suffix {
      color: var(--fvx-text-muted, var(--fvx-text-secondary));
      font-size: 0.85em;
      margin-left: 2px;
    }
    .num__compact,
    .num__exponentSeparator,
    .num__exponentInteger {
      color: var(--fvx-text-secondary);
      font-size: 0.9em;
    }
    /* Texto plano (emptyText o fallback de error). */
    .num__text { color: inherit; }
  `],
})
export class NumericLabelComponent {
  /** Valor numérico. `null` / `undefined` / `NaN` → se muestra `emptyText`. */
  @Input() value: number | string | null | undefined = null;

  /** Locale para el formato (ej. 'es-CL', 'en-US'). Default: navegador. */
  @Input() locale?: string;

  /** Cantidad fija de decimales (minimum + maximum). */
  @Input() decimals?: number;

  /** Decimales mínimos (si no se usa `decimals`). */
  @Input() minDecimals?: number;

  /** Decimales máximos (si no se usa `decimals`). */
  @Input() maxDecimals?: number;

  /**
   * Código ISO 4217 (USD, CLP, EUR, …). Si está presente, usa formato de moneda.
   * Se recomienda usar en conjunto con `locale` para que aparezca el símbolo correcto.
   */
  @Input() currency?: string;

  /** 'symbol' | 'narrowSymbol' | 'code' | 'name'. Default `symbol`. */
  @Input() currencyDisplay: 'symbol' | 'narrowSymbol' | 'code' | 'name' = 'symbol';

  /**
   * Notación: `'standard'` para tablas de detalle, `'compact'` solo para
   * KPIs/gráficos. En compact el componente genera un tooltip automático
   * con el valor exacto si no se pasa uno explícito.
   */
  @Input() notation: 'standard' | 'scientific' | 'engineering' | 'compact' = 'standard';

  /** Prefijo custom (se concatena antes del número; se ignora si hay `currency`). */
  @Input() prefix?: string;

  /** Sufijo custom (se concatena después del número, estilo atenuado + 0.85em). */
  @Input() suffix?: string;

  /** Texto a mostrar si `value` es null/NaN/undefined. Default '—'. */
  @Input() emptyText = '—';

  /** Muestra un icono de flecha según signo (↑ / ↓ / —). */
  @Input() showSignIcon = false;

  /** Modo de coloreo automático según signo. */
  @Input() colorMode: NumericLabelColorMode = 'none';

  /**
   * Color fijo que sobrescribe `colorMode`. Cualquier valor CSS válido
   * — preferir tokens del tema (`var(--fvx-link)`, `var(--fvx-chip-warn-fg)`)
   * sobre hex sueltos para que el contraste se mantenga en claro/oscuro.
   */
  @Input() color?: string;

  /** Peso tipográfico. */
  @Input() weight: NumericLabelWeight = 'normal';

  /**
   * Fuente monoespaciada con cifras tabulares. **Reservar para IDs/códigos**
   * (rol SII, RUT, bg-101). En montos basta `tabular-nums` (siempre activo).
   */
  @Input() monospace = false;

  /**
   * Alinea el componente a la derecha cuando vive en un contenedor con
   * width definido (común en tablas, KPIs). Equivalente a `text-align: right`
   * en el `<td>` padre.
   */
  @Input() alignRight = false;

  /**
   * Tooltip explícito. Si no se pasa y `notation="compact"`, se genera uno
   * automático con el valor en formato estándar (recomendado para KPIs).
   */
  @Input() tooltip?: string;

  @HostBinding('class.numeric-label-host') hostClass = true;

  /** Estado derivado del valor: 'pos' | 'neg' | 'zero' | 'empty'. */
  get valueState(): 'pos' | 'neg' | 'zero' | 'empty' {
    const n = this.parsed;
    if (n === null) return 'empty';
    if (n > 0) return 'pos';
    if (n < 0) return 'neg';
    return 'zero';
  }

  /**
   * Partes del número formateado (Intl.NumberFormat.formatToParts).
   * Cada parte se renderiza en su propio `<span>` con clase semántica
   * (`num__currency`, `num__integer`, etc.) para permitir estilado fino
   * (símbolo atenuado, valor sólido, sufijo más chico).
   */
  get parts(): readonly { type: string; value: string }[] {
    const n = this.parsed;
    if (n === null) return [];

    const options = this.buildIntlOptions();
    try {
      const result = new Intl.NumberFormat(this.locale, options).formatToParts(n);
      // Si hay prefijo custom y NO es moneda, inyectarlo como parte literal al inicio.
      if (!this.currency && this.prefix) {
        return [{ type: 'literal', value: this.prefix }, ...result];
      }
      return result;
    } catch {
      return [];
    }
  }

  /**
   * Fallback de texto plano cuando `parts` está vacío:
   * - `value` es null/NaN → `emptyText`
   * - Intl falló → toString del valor parseado
   */
  get formattedFallback(): string {
    const n = this.parsed;
    if (n === null) return this.emptyText;
    return String(n);
  }

  /**
   * Tooltip efectivo. Si el usuario pasó uno explícito, ese. Si la notación
   * es compact y hay valor, auto-genera con el formato estándar (sin compact)
   * para que el usuario vea "1.234.567" al pasar el mouse sobre "1.3M".
   */
  get effectiveTooltip(): string | null {
    if (this.tooltip !== undefined && this.tooltip !== null) return this.tooltip;
    if (this.notation !== 'compact') return null;
    const n = this.parsed;
    if (n === null) return null;
    const opts = this.buildIntlOptions();
    opts.notation = 'standard';
    try {
      return new Intl.NumberFormat(this.locale, opts).format(n);
    } catch {
      return String(n);
    }
  }

  /**
   * Color efectivo según `color` custom o `colorMode`.
   * Usa tokens `--fvx-chip-{danger,success}-fg` calibrados por tema (AA
   * en claro/oscuro/beige/byn) en vez de hex puros — los del spec
   * (`#f06969`/`#34d399`) viven en las paletas tmp-dark.
   */
  get effectiveColor(): string | null {
    if (this.color) return this.color;
    const s = this.valueState;
    if (this.colorMode === 'negative-red' && s === 'neg') {
      return 'var(--fvx-chip-danger-fg, #d64545)';
    }
    if (this.colorMode === 'pos-neg') {
      if (s === 'pos') return 'var(--fvx-chip-success-fg, #12996b)';
      if (s === 'neg') return 'var(--fvx-chip-danger-fg, #d64545)';
    }
    return null;
  }

  /** Mapea el tipo de parte de Intl a la clase CSS correspondiente. */
  partClass(type: string): string {
    return `num__${type}`;
  }

  private buildIntlOptions(): Intl.NumberFormatOptions {
    const options: Intl.NumberFormatOptions = {
      notation: this.notation,
    };
    if (this.currency) {
      options.style = 'currency';
      options.currency = this.currency;
      options.currencyDisplay = this.currencyDisplay;
    }
    if (this.decimals !== undefined) {
      options.minimumFractionDigits = this.decimals;
      options.maximumFractionDigits = this.decimals;
    } else {
      if (this.minDecimals !== undefined) options.minimumFractionDigits = this.minDecimals;
      if (this.maxDecimals !== undefined) options.maximumFractionDigits = this.maxDecimals;
    }
    return options;
  }

  private get parsed(): number | null {
    const v = this.value;
    if (v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isNaN(n) || !Number.isFinite(n)) return null;
    return n;
  }
}
