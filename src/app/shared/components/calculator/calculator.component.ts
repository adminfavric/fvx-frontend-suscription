import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export type CalculatorOp = '+' | '-' | '*' | '/';

export interface CalculatorChange {
  display: string;
  value: number | null;
}

/**
 * Calculadora standalone con teclado (AC, ±, ÷, ×, -, +, =, ., back).
 *
 * - Emite `valueChange` en cada operación con la representación actual.
 * - Emite `result` al pulsar `=` (o Enter) con el valor numérico final.
 * - Soporta entrada por teclado (números, operadores, Enter, Backspace, Escape).
 *
 * ```html
 * <app-calculator
 *   [initial]="100"
 *   (valueChange)="onChange($event)"
 *   (result)="onResult($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="calc" [class.calc--compact]="compact" tabindex="0">
      <div class="calc__display">
        @if (history()) {
          <div class="calc__history">{{ history() }}</div>
        }
        <div class="calc__current">{{ display() }}</div>
      </div>

      <div class="calc__keys">
        <button mat-stroked-button class="calc__key calc__key--fn" type="button" (click)="allClear()" matTooltip="All clear">
          AC
        </button>
        <button mat-stroked-button class="calc__key calc__key--fn" type="button" (click)="toggleSign()" matTooltip="Toggle sign">
          ±
        </button>
        <button mat-stroked-button class="calc__key calc__key--fn" type="button" (click)="percent()" matTooltip="Percent">
          %
        </button>
        <button mat-flat-button color="accent" class="calc__key calc__key--op" type="button" (click)="setOp('/')" [class.calc__key--active]="op() === '/'">
          ÷
        </button>

        <button mat-stroked-button class="calc__key" type="button" (click)="inputDigit('7')">7</button>
        <button mat-stroked-button class="calc__key" type="button" (click)="inputDigit('8')">8</button>
        <button mat-stroked-button class="calc__key" type="button" (click)="inputDigit('9')">9</button>
        <button mat-flat-button color="accent" class="calc__key calc__key--op" type="button" (click)="setOp('*')" [class.calc__key--active]="op() === '*'">
          ×
        </button>

        <button mat-stroked-button class="calc__key" type="button" (click)="inputDigit('4')">4</button>
        <button mat-stroked-button class="calc__key" type="button" (click)="inputDigit('5')">5</button>
        <button mat-stroked-button class="calc__key" type="button" (click)="inputDigit('6')">6</button>
        <button mat-flat-button color="accent" class="calc__key calc__key--op" type="button" (click)="setOp('-')" [class.calc__key--active]="op() === '-'">
          −
        </button>

        <button mat-stroked-button class="calc__key" type="button" (click)="inputDigit('1')">1</button>
        <button mat-stroked-button class="calc__key" type="button" (click)="inputDigit('2')">2</button>
        <button mat-stroked-button class="calc__key" type="button" (click)="inputDigit('3')">3</button>
        <button mat-flat-button color="accent" class="calc__key calc__key--op" type="button" (click)="setOp('+')" [class.calc__key--active]="op() === '+'">
          +
        </button>

        <button mat-stroked-button class="calc__key calc__key--zero" type="button" (click)="inputDigit('0')">0</button>
        <button mat-stroked-button class="calc__key" type="button" (click)="inputDecimal()">.</button>
        <button mat-flat-button color="primary" class="calc__key calc__key--eq" type="button" (click)="equals()">
          =
        </button>
      </div>

      <div class="calc__footer">
        <button
          mat-icon-button
          type="button"
          (click)="backspace()"
          matTooltip="Backspace"
          aria-label="Backspace"
        >
          <mat-icon>backspace</mat-icon>
        </button>
        @if (showCopy) {
          <button
            mat-icon-button
            type="button"
            (click)="copy()"
            matTooltip="Copy result"
            aria-label="Copy"
          >
            <mat-icon>content_copy</mat-icon>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .calc {
      width: 260px;
      padding: 10px;
      border: 1px solid var(--fvx-border, #e2e8f0);
      border-radius: 10px;
      background: var(--fvx-bg-card, #fff);
      outline: none;
    }
    .calc:focus-within {
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
    }
    .calc--compact { width: 220px; padding: 8px; }

    .calc__display {
      /* Texto con --fvx-text-primary para que contraste con --fvx-bg-page en temas claros y oscuros */
      background: color-mix(in srgb, var(--fvx-bg-page, #f1f5f9) 90%, var(--fvx-border, #e2e8f0));
      color: var(--fvx-text-primary, #1e293b);
      padding: 10px 12px;
      border-radius: 6px;
      min-height: 54px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 8px;
      border: 1px solid var(--fvx-border, #e2e8f0);
    }
    .calc__history {
      font-size: 0.75rem;
      color: var(--fvx-text-muted, #64748b);
      opacity: 1;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .calc__current {
      font-size: 1.5rem;
      font-weight: 600;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .calc__keys {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .calc__key {
      min-width: 0 !important;
      padding: 0 !important;
      height: 40px;
      line-height: 40px;
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .calc__key--fn { color: var(--fvx-text-secondary, #475569); }
    .calc__key--op.calc__key--active {
      outline: 2px solid color-mix(in srgb, var(--fvx-text-primary, #1e293b) 35%, transparent);
      outline-offset: -3px;
    }
    .calc__key--zero { grid-column: span 2; }
    .calc__key--eq { font-weight: 700; }

    .calc__footer {
      margin-top: 6px;
      display: flex;
      justify-content: flex-end;
      gap: 4px;
    }
  `],
})
export class CalculatorComponent {
  @Input() set initial(v: number | string | null | undefined) {
    if (v === null || v === undefined || v === '') return;
    const n = Number(v);
    if (!Number.isNaN(n)) {
      this.display.set(this.formatDisplay(n));
      this.accumulator.set(n);
    }
  }
  @Input() compact = false;
  @Input() showCopy = true;
  @Input() maxIntegerDigits = 12;

  @Output() valueChange = new EventEmitter<CalculatorChange>();
  @Output() result = new EventEmitter<number>();

  readonly display = signal<string>('0');
  readonly op = signal<CalculatorOp | null>(null);
  readonly accumulator = signal<number | null>(null);
  readonly history = signal<string>('');
  private waitingForOperand = signal<boolean>(false);

  readonly currentValue = computed<number | null>(() => {
    const n = Number(this.display());
    return Number.isNaN(n) ? null : n;
  });

  @HostListener('keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    const k = ev.key;
    if (/^\d$/.test(k)) { this.inputDigit(k); ev.preventDefault(); return; }
    switch (k) {
      case '.':
      case ',':
        this.inputDecimal(); break;
      case '+': case '-':
        this.setOp(k as CalculatorOp); break;
      case '*': case 'x': case 'X':
        this.setOp('*'); break;
      case '/':
        this.setOp('/'); break;
      case '=': case 'Enter':
        this.equals(); break;
      case 'Backspace':
        this.backspace(); break;
      case 'Escape':
        this.allClear(); break;
      case '%':
        this.percent(); break;
      default:
        return;
    }
    ev.preventDefault();
  }

  inputDigit(d: string): void {
    if (this.waitingForOperand()) {
      this.display.set(d);
      this.waitingForOperand.set(false);
    } else {
      const cur = this.display();
      if (cur === '0' && d !== '.') {
        this.display.set(d);
      } else {
        const digits = cur.replace('-', '').replace('.', '').length;
        if (digits >= this.maxIntegerDigits) return;
        this.display.set(cur + d);
      }
    }
    this.emit();
  }

  inputDecimal(): void {
    if (this.waitingForOperand()) {
      this.display.set('0.');
      this.waitingForOperand.set(false);
      this.emit();
      return;
    }
    if (!this.display().includes('.')) {
      this.display.set(this.display() + '.');
      this.emit();
    }
  }

  setOp(next: CalculatorOp): void {
    const currentStr = this.display();
    const current = Number(currentStr);
    const prev = this.accumulator();
    const existing = this.op();

    if (prev === null) {
      this.accumulator.set(current);
    } else if (existing && !this.waitingForOperand()) {
      const res = this.compute(prev, current, existing);
      this.accumulator.set(res);
      this.display.set(this.formatDisplay(res));
    }

    this.op.set(next);
    this.waitingForOperand.set(true);
    this.history.set(`${this.formatDisplay(this.accumulator() ?? 0)} ${this.symbol(next)}`);
    this.emit();
  }

  equals(): void {
    const prev = this.accumulator();
    const current = Number(this.display());
    const op = this.op();
    if (prev === null || op === null) {
      this.emitResult(current);
      return;
    }
    const res = this.compute(prev, current, op);
    this.history.set(`${this.formatDisplay(prev)} ${this.symbol(op)} ${this.formatDisplay(current)} =`);
    this.display.set(this.formatDisplay(res));
    this.accumulator.set(null);
    this.op.set(null);
    this.waitingForOperand.set(true);
    this.emit();
    this.emitResult(res);
  }

  toggleSign(): void {
    const n = Number(this.display());
    if (Number.isNaN(n) || n === 0) return;
    this.display.set(this.formatDisplay(-n));
    this.emit();
  }

  percent(): void {
    const n = Number(this.display());
    if (Number.isNaN(n)) return;
    this.display.set(this.formatDisplay(n / 100));
    this.emit();
  }

  backspace(): void {
    if (this.waitingForOperand()) return;
    const cur = this.display();
    if (cur.length <= 1 || (cur.length === 2 && cur.startsWith('-'))) {
      this.display.set('0');
    } else {
      this.display.set(cur.slice(0, -1));
    }
    this.emit();
  }

  allClear(): void {
    this.display.set('0');
    this.accumulator.set(null);
    this.op.set(null);
    this.history.set('');
    this.waitingForOperand.set(false);
    this.emit();
  }

  copy(): void {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(this.display()).catch(() => {});
  }

  // ── internals ──
  private compute(a: number, b: number, op: CalculatorOp): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? NaN : a / b;
    }
  }

  private symbol(op: CalculatorOp): string {
    return op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : '+';
  }

  private formatDisplay(n: number): string {
    if (!Number.isFinite(n)) return 'Error';
    const fixed = Math.abs(n) >= 1e12
      ? n.toExponential(6)
      : Number(n.toFixed(10)).toString();
    return fixed;
  }

  private emit(): void {
    const value = this.currentValue();
    this.valueChange.emit({ display: this.display(), value });
  }

  private emitResult(v: number): void {
    if (!Number.isFinite(v)) return;
    this.result.emit(v);
  }
}
