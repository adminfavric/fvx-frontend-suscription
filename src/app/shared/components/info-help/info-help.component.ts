import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  Overlay,
  OverlayRef,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { HelpContentService } from './help-content.service';

type HelpPhase = 'idle' | 'thinking' | 'typing' | 'done';

/**
 * Asistente contextual: un icono `?` que abre un popover anclado donde la
 * explicación de un término **aparece escribiéndose como si la respondiera una
 * IA** (fase «pensando» → streaming palabra por palabra con cursor → ejemplo →
 * feedback). Un solo componente reutilizable: cada uso declara su `topic`; el
 * contenido (texto) vive en i18n bajo `help.<topic>.*` y el registro de temas
 * en `HelpContentService`.
 *
 * El efecto «IA escribiendo» es PRESENTACIÓN: el texto está pre-curado y se
 * revela con un timer (sin llamadas a un modelo, sin latencia ni alucinación).
 *
 * ```html
 * <label class="opt-label">
 *   Rol del usuario
 *   <app-info-help topic="role" />
 * </label>
 *
 * <app-info-help topic="staff" [instant]="true" />   <!-- sin efecto -->
 * ```
 */
@Component({
  selector: 'app-info-help',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, TranslocoModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // None: el popover se renderiza en un CDK Overlay (fuera del árbol del
  // componente), así que sus estilos deben ser globales. Todo el CSS va
  // prefijado con `ih-` para evitar colisiones.
  encapsulation: ViewEncapsulation.None,
  template: `
    <button
      #trigger
      type="button"
      class="ih-trigger"
      [class.ih-trigger--open]="open()"
      [attr.aria-label]="('infoHelp.ariaTrigger' | transloco) + ' ' + (titleKey() | transloco)"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      <mat-icon>help_outline</mat-icon>
    </button>

    <ng-template #popover>
      <div
        class="ih-pop"
        role="dialog"
        [attr.aria-label]="titleKey() | transloco"
        (keydown.escape)="close()"
      >
        <div class="ih-head">
          <span class="ih-avatar"><mat-icon>auto_awesome</mat-icon></span>
          <div class="ih-id">
            <div class="ih-name">{{ label || ('infoHelp.assistant' | transloco) }}</div>
            <div class="ih-topic">{{ titleKey() | transloco }}</div>
          </div>
          <button #closeBtn type="button" class="ih-close" (click)="close()"
                  [attr.aria-label]="'infoHelp.close' | transloco">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="ih-body">
          @if (phase() === 'thinking') {
            <div class="ih-thinking" aria-hidden="true"><span></span><span></span><span></span></div>
          } @else {
            <div class="ih-text">
              <span [innerHTML]="richText()"></span>
              @if (phase() === 'typing') {
                <span class="ih-caret" aria-hidden="true"></span>
              }
            </div>
          }

          @if (phase() === 'done' && hasExample()) {
            <div class="ih-example">
              <div class="ih-ex-label">
                <mat-icon>lightbulb</mat-icon> {{ 'infoHelp.example' | transloco }}
              </div>
              {{ exampleKey() | transloco }}
            </div>
          }
        </div>

        @if (phase() === 'done') {
          <div class="ih-foot">
            @if (feedback() === null) {
              <span class="ih-q">{{ 'infoHelp.useful' | transloco }}</span>
              <button type="button" class="ih-fb ih-fb--up" (click)="rate(true)"
                      [attr.aria-label]="'infoHelp.yes' | transloco">
                <mat-icon>thumb_up</mat-icon>
              </button>
              <button type="button" class="ih-fb ih-fb--down" (click)="rate(false)"
                      [attr.aria-label]="'infoHelp.no' | transloco">
                <mat-icon>thumb_down</mat-icon>
              </button>
            } @else {
              <span class="ih-thanks"><mat-icon>check_circle</mat-icon> {{ 'infoHelp.thanks' | transloco }}</span>
            }
          </div>
        }
      </div>
    </ng-template>
  `,
  styleUrl: './info-help.component.scss',
})
export class InfoHelpComponent implements OnDestroy {
  /** Clave del contenido en el registro / i18n (`role`, `staff`, …). */
  @Input({ required: true }) topic!: string;
  /** `true` salta el efecto: muestra el texto completo de inmediato. */
  @Input() instant = false;
  /** Rótulo del encabezado del popover (default: «Asistente …» i18n). */
  @Input() label?: string;

  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly transloco = inject(TranslocoService);
  private readonly content = inject(HelpContentService);

  @ViewChild('trigger', { static: true }) private trigger!: ElementRef<HTMLButtonElement>;
  @ViewChild('popover', { static: true }) private popover!: TemplateRef<unknown>;
  @ViewChild('closeBtn') private closeBtn?: ElementRef<HTMLButtonElement>;

  readonly open = signal(false);
  readonly phase = signal<HelpPhase>('idle');
  readonly feedback = signal<boolean | null>(null);
  /** Texto revelado hasta ahora (streaming). */
  private readonly shown = signal('');

  /** Claves i18n derivadas del topic. */
  readonly titleKey = computed(() => this.content.get(this.topic).titleKey);
  readonly exampleKey = computed(() => this.content.get(this.topic).exampleKey ?? '');
  readonly hasExample = computed(() => !!this.content.get(this.topic).exampleKey);

  /** Texto visible con `**negritas**` → `<b>`, saneado. */
  readonly richText = computed<SafeHtml>(() => {
    const escaped = this.escapeHtml(this.shown());
    const withBold = escaped.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return this.sanitizer.bypassSecurityTrustHtml(withBold);
  });

  private overlayRef?: OverlayRef;
  private timer?: ReturnType<typeof setTimeout>;
  // El estado "reduce" se respeta también en TS: saltamos a `done` directo.
  private readonly prefersReducedMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openPopover();
    }
  }

  private openPopover(): void {
    const positions: ConnectedPosition[] = [
      { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 10 },
      { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -10 },
    ];
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.trigger)
      .withPositions(positions)
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      panelClass: 'ih-overlay-panel',
    });
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.attach(new TemplatePortal(this.popover, this.vcr));

    this.open.set(true);
    this.feedback.set(null);
    this.shown.set('');

    if (this.instant || this.prefersReducedMotion) {
      this.shown.set(this.bodyText());
      this.phase.set('done');
    } else {
      this.phase.set('thinking');
      this.timer = setTimeout(() => this.stream(), 380);
    }

    // Mover el foco al botón cerrar (tras render del overlay).
    queueMicrotask(() => this.closeBtn?.nativeElement.focus());
  }

  /** Revela el cuerpo palabra por palabra con un timer encadenado. */
  private stream(): void {
    const tokens = this.bodyText().split(/(\s+)/).filter(t => t.length);
    let i = 0;
    let acc = '';
    this.phase.set('typing');
    const tick = (): void => {
      acc += tokens[i++];
      this.shown.set(acc);
      if (i < tokens.length) {
        // ~26ms por palabra, ~8ms por espacio.
        this.timer = setTimeout(tick, /\s/.test(tokens[i - 1]) ? 8 : 26);
      } else {
        this.phase.set('done');
      }
    };
    tick();
  }

  close(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.open.set(false);
    this.phase.set('idle');
    // Devolver el foco al gatillo.
    this.trigger.nativeElement.focus();
  }

  rate(useful: boolean): void {
    this.feedback.set(useful);
    // Gancho para analítica si se desea: aquí solo se registra en el estado.
  }

  private bodyText(): string {
    return this.transloco.translate(this.content.get(this.topic).bodyKey);
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.overlayRef?.dispose();
  }
}
