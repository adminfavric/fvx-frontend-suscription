import { ChangeDetectionStrategy, Component, Input } from '@angular/core';


export type SkeletonAnimation = 'pulse' | 'wave' | 'none';
export type SkeletonRounded = 'none' | 'sm' | 'md' | 'lg' | 'pill';

/**
 * Placeholder animado para estados de carga. Usar mientras los datos llegan;
 * mismo tamaño aproximado que el contenido final para evitar layout shift.
 *
 * Variantes:
 * - **Texto** (default): rectángulo bajo, alto reducido.
 * - **`circle`**: cuadrado con borde 50% (avatares, badges).
 * - **`width`/`height`** CSS libres si se necesita un tamaño concreto.
 *
 * Animación por defecto `pulse` (opacidad); `wave` añade un brillo deslizante;
 * `none` desactiva para listas largas donde el flicker satura.
 *
 * @example
 * ```html
 * <app-skeleton width="120px" height="14px" />
 * <app-skeleton [circle]="true" width="32px" />
 * <app-skeleton width="100%" height="40px" rounded="lg" animation="wave" />
 * ```
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="skel"
    [class.skel--circle]="circle"
    [class.skel--pulse]="animation === 'pulse'"
    [class.skel--wave]="animation === 'wave'"
    [class.skel--rounded-none]="rounded === 'none'"
    [class.skel--rounded-sm]="rounded === 'sm' && !circle"
    [class.skel--rounded-lg]="rounded === 'lg' && !circle"
    [class.skel--rounded-pill]="rounded === 'pill' && !circle"
    [style.width]="resolvedWidth()"
    [style.height]="resolvedHeight()"
    [attr.aria-hidden]="'true'"
  ></span>`,
  styleUrls: ['./skeleton.component.scss'],
})
export class SkeletonComponent {
  /** Ancho CSS (default `100%`; con `circle` se iguala a la altura). */
  @Input() width?: string;
  /** Alto CSS (default `14px` texto, `32px` si `circle` sin ancho). */
  @Input() height?: string;
  /** Si `true`, rectangulo redondo (avatares, iconos). */
  @Input() circle = false;
  @Input() rounded: SkeletonRounded = 'md';
  @Input() animation: SkeletonAnimation = 'pulse';

  resolvedWidth(): string {
    if (this.width) return this.width;
    if (this.circle && this.height) return this.height;
    return '100%';
  }

  resolvedHeight(): string {
    if (this.height) return this.height;
    if (this.circle) return this.width ?? '32px';
    return '14px';
  }
}
