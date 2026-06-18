import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Un segmento: ``label`` y/o ``icon``; ``value`` identifica la selección. */
export interface SegmentedToggleItem {
  value: string;
  label?: string;
  icon?: string;
  tooltip?: string;
  /** Nombre accesible si el segmento es solo icono. */
  ariaLabel?: string;
}

/**
 * Grupo segmentado (un valor activo): mismo patrón que tema / ancho / idioma en sidebar
 * Envuelve ``mat-button-toggle-group`` con estilos ``--fvx-*``.
 */
@Component({
  selector: 'app-segmented-toggle',
  standalone: true,
  imports: [MatButtonToggleModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!--
      Estructura: mat-button-toggle-group con clases por appearance (toolbar | sidebar) y vertical (columna en sidebar).
      Cada mat-button-toggle envuelve .fvx-segmented-toggle__content (icono y/o etiqueta).
    -->
    <mat-button-toggle-group
      class="fvx-segmented-toggle"
      [class.fvx-segmented-toggle--toolbar]="appearance === 'toolbar'"
      [class.fvx-segmented-toggle--sidebar]="appearance === 'sidebar'"
      [class.fvx-segmented-toggle--vertical]="vertical"
      [value]="value"
      (change)="onChange($event.value)"
      [hideSingleSelectionIndicator]="hideSingleSelectionIndicator"
      [vertical]="vertical"
      [attr.aria-label]="ariaLabel || null">
      @for (it of items; track it.value) {
        <mat-button-toggle
          [value]="it.value"
          [matTooltip]="it.tooltip ?? ''"
          [matTooltipDisabled]="!it.tooltip"
          [matTooltipPosition]="tooltipPosition"
          [attr.aria-label]="it.ariaLabel || it.label || null">
          <!-- Contenido del segmento: ver regla .fvx-segmented-toggle__content en estilos -->
          <span class="fvx-segmented-toggle__content">
            @if (it.icon) {
              <mat-icon class="fvx-segmented-toggle__icon">{{ it.icon }}</mat-icon>
            }
            @if (it.label) {
              <span class="fvx-segmented-toggle__label">{{ it.label }}</span>
            }
          </span>
        </mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
  styles: [`
    /* ─── Host: ancho; en sidebar el host encoge al grupo (HostBinding hostSidebarShrink) ─── */
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    :host.fvx-segmented-toggle-host--sidebar {
      width: fit-content;
      max-width: 100%;
    }

    /* ─── Grupo Material: sin borde/sombra por defecto (cada variante redefine lo suyo) ─── */
    .fvx-segmented-toggle.mat-button-toggle-group {
      border: none;
      box-shadow: none;
    }

    /* Contenido interno común (icono + texto); igual en toolbar y sidebar. */
    .fvx-segmented-toggle .fvx-segmented-toggle__content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       Variante TOOLBAR — grupo en topbar (texto / filtros).
       Template: clase fvx-segmented-toggle--toolbar en mat-button-toggle-group.
       ═══════════════════════════════════════════════════════════════════════════ */
    .fvx-segmented-toggle--toolbar.mat-button-toggle-group {
      margin-right: 4px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--fvx-border);
      overflow: hidden;
      background: var(--fvx-bg-topbar, var(--fvx-bg-card));
      --mat-button-toggle-height: 30px;
    }

    .fvx-segmented-toggle--toolbar .mat-button-toggle {
      min-width: 40px;
      height: 30px;
      padding: 0 6px;
      color: var(--fvx-text-secondary);
      border: none;
      background: transparent;
    }

    .fvx-segmented-toggle--toolbar .fvx-segmented-toggle__label {
      font-size: var(--fvx-text-xs);
      font-weight: 600;
      line-height: 1;
    }

    .fvx-segmented-toggle--toolbar .mat-button-toggle.mat-button-toggle-appearance-standard .mat-button-toggle-label-content {
      line-height: 30px;
      padding: 0 4px;
    }

    .fvx-segmented-toggle--toolbar .mat-button-toggle-checked {
      color: var(--fvx-text-primary);
      background: color-mix(in srgb, var(--fvx-text-primary) 8%, var(--fvx-bg-topbar, var(--fvx-bg-card)));
    }

    .fvx-segmented-toggle--toolbar .fvx-segmented-toggle__icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       Variante SIDEBAR — pie de menú (íconos / EN-ES); input vertical = rail estrecho.
       Template: fvx-segmented-toggle--sidebar (+ fvx-segmented-toggle--vertical si aplica).
       ═══════════════════════════════════════════════════════════════════════════ */

    /* Grupo: fila compacta, gap entre segmentos, marco sidebar. */
    .fvx-segmented-toggle--sidebar.mat-button-toggle-group {
      width: fit-content;
      max-width: 100%;
      height: auto !important;
      min-height: 0;
      display: inline-flex;
      flex-direction: row;
      flex-wrap: nowrap;
      gap: 3px;
      padding: 3px;
      border: 1px solid var(--fvx-sidebar-footer-border);
      border-radius: 6px;
      background: var(
        --fvx-segmented-toggle-group-bg,
        color-mix(in srgb, var(--fvx-sidebar-bg) 92%, #000 8%)
      );
      overflow: hidden;
      --mat-button-toggle-height: 28px;
    }

    /* Cada segmento: sin borde Material, color nav, transición hover/checked. */
    .fvx-segmented-toggle--sidebar .mat-button-toggle {
      flex: 0 0 auto;
      width: auto;
      min-width: 0;
      border: none;
      background: transparent;
      color: var(--fvx-nav-item-text);
      border-radius: 4px;
      opacity: 0.7;
      transition: background 0.15s ease, opacity 0.15s ease,
                  box-shadow 0.15s ease, color 0.15s ease;
    }

    .fvx-segmented-toggle--sidebar .mat-button-toggle .mat-button-toggle-button {
      width: auto;
      height: 100%;
      padding: 0;
    }

    .fvx-segmented-toggle--sidebar .mat-button-toggle.mat-button-toggle-appearance-standard .mat-button-toggle-label-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: auto;
      min-width: 20px;
      min-height: 0;
      height: auto;
      padding: 0 4px;
      box-sizing: border-box;
      line-height: 1;
    }

    .fvx-segmented-toggle--sidebar .mat-button-toggle:not(.mat-button-toggle-checked):hover {
      opacity: 1;
      background: var(--fvx-nav-item-hover-bg);
      color: var(--fvx-nav-item-hover-text);
    }

    .fvx-segmented-toggle--sidebar .mat-button-toggle-checked {
      opacity: 1;
      background: var(--fvx-segmented-toggle-checked-bg, var(--fvx-nav-item-active-bg));
      color: var(--fvx-segmented-toggle-checked-fg, var(--fvx-nav-item-active-text));
      /* NOTA: var() admite UN solo fallback. Un multi-shadow separado por comas
         DENTRO del fallback se interpreta como dos fallbacks → toda la
         declaración es CSS inválido y la sombra NO renderiza en los temas que no
         definen el token (era el bug: solo beige lo definía). Solución: el
         multi-shadow va como declaración base, temático y sin negro puro. */
      box-shadow:
        0 1px 2px var(--fvx-shadow-1, rgba(15, 23, 42, 0.08)),
        0 0 0 1px color-mix(in srgb, var(--fvx-nav-icon-active, var(--fvx-link, #2563eb)) 22%, transparent);
    }

    .fvx-segmented-toggle--sidebar .mat-button-toggle-checked .fvx-segmented-toggle__icon {
      color: var(
        --fvx-segmented-toggle-checked-icon,
        var(--fvx-nav-icon-active, var(--fvx-link, #2563eb))
      );
    }

    .fvx-segmented-toggle--sidebar .fvx-segmented-toggle__icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      line-height: 14px;
      color: inherit;
    }

    .fvx-segmented-toggle--sidebar .fvx-segmented-toggle__label {
      font-size: var(--fvx-text-2xs);
      font-weight: 600;
      line-height: 1;
      letter-spacing: 0.02em;
    }

    .fvx-segmented-toggle--sidebar .mat-button-toggle-focus-overlay {
      display: none;
    }

    .fvx-segmented-toggle--sidebar .mat-button-toggle-ripple {
      border-radius: 4px;
    }

    /* Sidebar + vertical (rail): sin bordes/ranuras MDC entre filas; el horizontal ya iba fino. */
    .fvx-segmented-toggle--sidebar.fvx-segmented-toggle--vertical.mat-button-toggle-group {
      flex-direction: column;
      align-items: stretch;
      --mat-button-toggle-height: 25px;
    }

    .fvx-segmented-toggle--sidebar.fvx-segmented-toggle--vertical
      .mat-button-toggle.mat-button-toggle-appearance-standard
      .mat-button-toggle-label-content {
      min-height: 20px;
      min-width: 24px;
    }

    :host ::ng-deep .fvx-segmented-toggle--sidebar.fvx-segmented-toggle--vertical .mat-button-toggle,
    :host ::ng-deep .fvx-segmented-toggle--sidebar.fvx-segmented-toggle--vertical .mdc-button-toggle,
    :host
      ::ng-deep
      .fvx-segmented-toggle--sidebar.fvx-segmented-toggle--vertical
      .mat-button-toggle
      .mat-button-toggle-button {
      border: none !important;
      box-shadow: none !important;
      background-clip: padding-box;
    }

    :host ::ng-deep
      .fvx-segmented-toggle--sidebar.fvx-segmented-toggle--vertical
      .mat-button-toggle:not(:first-of-type) {
      border-top: none !important;
    }

    :host
      ::ng-deep
      .fvx-segmented-toggle--sidebar.fvx-segmented-toggle--vertical
      .mat-button-toggle
      .mat-mdc-button-touch-target,
    :host
      ::ng-deep
      .fvx-segmented-toggle--sidebar.fvx-segmented-toggle--vertical
      .mdc-button-toggle
      .mdc-button {
      box-shadow: none !important;
    }

    .fvx-segmented-toggle--sidebar.fvx-segmented-toggle--vertical .mat-button-toggle-checked {
      box-shadow: none;
    }
  `],
})
export class SegmentedToggleComponent {
  @Input() items: readonly SegmentedToggleItem[] = [];

  @Input() value: string | null = null;

  /** ``toolbar`` ≈ topbar (texto); ``sidebar`` ≈ footer del menú (íconos). */
  @Input() appearance: 'toolbar' | 'sidebar' = 'toolbar';

  @HostBinding('class.fvx-segmented-toggle-host--sidebar')
  get hostSidebarShrink(): boolean {
    return this.appearance === 'sidebar';
  }

  @Input() vertical = false;

  @Input() ariaLabel = '';

  @Input() hideSingleSelectionIndicator = true;

  @Input() tooltipPosition: 'left' | 'right' | 'above' | 'below' | 'before' | 'after' =
    'above';

  @Output() readonly valueChange = new EventEmitter<string>();

  onChange(v: unknown): void {
    if (v !== undefined && v !== null) {
      this.valueChange.emit(String(v));
    }
  }
}
