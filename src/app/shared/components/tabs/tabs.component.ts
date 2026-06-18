import {
  AfterContentInit,
  Component,
  ContentChildren,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  TemplateRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

import { TabContentDirective } from './tab-content.directive';

export interface TabItem {
  /** Identificador estable para la tab (persistencia, trackBy, templates). */
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  /** Badge pequeño opcional (número o texto corto). */
  badge?: string | number;
}

/**
 * Wrapper de `mat-tab-group` con API declarativa: se definen las tabs via
 * `[tabs]` y cada contenido vive en un `<ng-template appTabContent="key">`.
 *
 * ```html
 * <app-tabs [tabs]="tabs" [(activeKey)]="current" (activeKeyChange)="onTab($event)">
 *   <ng-template appTabContent="overview"><p>Overview</p></ng-template>
 *   <ng-template appTabContent="details"><p>Details</p></ng-template>
 * </app-tabs>
 * ```
 *
 * - `stretch=true` expande las labels al ancho total (como `mat-tab-group` `mat-stretch-tabs`).
 * - `align`: `'start' | 'center' | 'end'`.
 */
@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatIconModule],
  template: `
    <mat-tab-group
      class="app-tabs"
      [mat-stretch-tabs]="stretch"
      [mat-align-tabs]="align"
      [fitInkBarToContent]="true"
      [selectedIndex]="activeIndex()"
      (selectedIndexChange)="onIndexChange($event)"
      [dynamicHeight]="dynamicHeight"
      [animationDuration]="animationDuration"
    >
      @for (t of tabs; track t.key) {
        <mat-tab [disabled]="t.disabled || false">
          <ng-template mat-tab-label>
            <span class="app-tabs__label">
              @if (t.icon) {
                <mat-icon class="app-tabs__icon">{{ t.icon }}</mat-icon>
              }
              <span>{{ t.label }}</span>
              @if (t.badge !== undefined && t.badge !== null && t.badge !== '') {
                <span class="app-tabs__badge">{{ t.badge }}</span>
              }
            </span>
          </ng-template>
          <div class="app-tabs__body">
            @if (templateFor(t.key); as tpl) {
              <ng-container *ngTemplateOutlet="tpl"></ng-container>
            }
          </div>
        </mat-tab>
      }
    </mat-tab-group>
  `,
  styles: [`
    /*
     * Spec FVX de tabs (ver design-fvx.md — tabs). Mapea el patrón visual
     * (label 13/600, ícono 17px gap 7px, underline 2px en accent, badge píldora
     * 10/700 con estado activo en accent-soft, focus ring) sobre las clases
     * internas de mat-tab-group via ::ng-deep. Tokens nativos --fvx-* (cubren los
     * 5 temas) en vez de los --tab-* del spec: los valores coinciden 1:1
     *   --fvx-text-secondary = tab inactivo · --fvx-text-primary = hover
     *   --fvx-accent = activo + underline · --fvx-bg-surface-2 = badge inactivo
     *   --fvx-accent-soft = badge activo · --fvx-border = línea de la barra
     */
    :host { display: block; }
    .app-tabs__label {
      display: inline-flex;
      align-items: center;
      gap: 7px;                       /* spec: gap 7px ícono↔texto */
    }
    .app-tabs__icon {
      font-size: 17px;                /* spec: ícono 17px */
      width: 17px;
      height: 17px;
      color: inherit;                 /* hereda el color del label (estado-aware) */
    }
    .app-tabs__badge {
      /* spec: píldora 10px/700, padding 1px 6px, radio 999px. Badge en 0 SÍ
         se muestra (la condición del template solo oculta null/''/undefined).
         line-height ceñido para que la píldora quede compacta (como el spec),
         no un óvalo alto. */
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--fvx-bg-surface-2, #1e2333);
      color: var(--fvx-text-secondary, #9aa1b8);
      font-size: var(--fvx-text-2xs);
      font-weight: 700;
      line-height: 1.5;
      letter-spacing: 0.02em;
    }
    .app-tabs__body {
      padding: 16px 4px 4px;
    }

    /* ─── Theming override: mat-tab-group trae fondo blanco y colores
       Material que chocan con los contenedores del shell. Forzamos fondo
       transparente (hereda del padre) y colores/medidas del spec FVX.
       Altura e indicador via tokens M3 nativos (no a la fuerza):
         --mat-tab-container-height 40px (barra compacta, como el spec)
         --mat-tab-active-indicator-height 2px (underline). */
    :host ::ng-deep .app-tabs {
      --mat-tab-container-height: 40px;
      --mat-tab-active-indicator-height: 2px;
      --mat-tab-active-indicator-color: var(--fvx-accent, #6d7cf6);
      /* La línea inferior de la barra la dibuja Material con ESTE token; por
         defecto cae a --mat-sys-surface-variant (claro) → se veía una línea
         blanca en tema oscuro. La fijamos a --fvx-border (sutil en todos los
         temas). No añadimos un border-bottom propio para no duplicar la línea. */
      --mat-tab-divider-color: var(--fvx-border, #e2e8f0);
      --mat-tab-divider-height: 1px;
    }
    :host ::ng-deep .app-tabs,
    :host ::ng-deep .app-tabs .mat-mdc-tab-header,
    :host ::ng-deep .app-tabs .mat-mdc-tab-label-container,
    :host ::ng-deep .app-tabs .mat-mdc-tab-labels,
    :host ::ng-deep .app-tabs .mat-mdc-tab-body-wrapper {
      background: transparent;
    }
    /* Tab: padding horizontal 16px, sin min-width ni grow de Material. La altura
       la fija --mat-tab-container-height (40px), así que aquí no peleamos con el
       padding vertical: el contenido se centra en los 40px. */
    :host ::ng-deep .app-tabs .mat-mdc-tab.mdc-tab {
      padding: 0 16px;
      min-width: 0;
      flex-grow: 0;
      letter-spacing: normal;
    }
    :host ::ng-deep .app-tabs .mat-mdc-tab .mdc-tab__text-label {
      font-size: var(--fvx-text-sm);
      font-weight: 600;
      color: var(--fvx-text-secondary, #475569);
      transition: color 0.12s ease;
    }
    :host ::ng-deep .app-tabs .mat-mdc-tab:hover .mdc-tab__text-label {
      color: var(--fvx-text-primary, #1e293b);
    }
    :host ::ng-deep .app-tabs .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
      color: var(--fvx-accent, #2563eb);   /* spec: activo en accent (no text-primary) */
    }
    /* Badge en estado activo: fondo accent-soft + texto accent. */
    :host ::ng-deep .app-tabs .mat-mdc-tab.mdc-tab--active .app-tabs__badge {
      background: var(--fvx-accent-soft, rgba(109, 124, 246, 0.17));
      color: var(--fvx-accent, #6d7cf6);
    }
    /* El indicador (underline 2px en accent) se controla via los tokens M3 de
       arriba (--mat-tab-active-indicator-{height,color}) + fitInkBarToContent en
       el template, que lo recorta al ancho del contenido en vez del tab entero. */
    /* Focus ring accesible (teclado), alineado con el resto del sistema. */
    :host ::ng-deep .app-tabs .mat-mdc-tab:focus-visible {
      outline: 2px solid var(--fvx-accent-soft, rgba(109, 124, 246, 0.17));
      outline-offset: -2px;
      border-radius: 4px;
    }
    /* Quita el ripple/overlay tintado de Material para un look más plano. */
    :host ::ng-deep .app-tabs .mat-mdc-tab .mat-mdc-tab-ripple,
    :host ::ng-deep .app-tabs .mat-mdc-tab .mdc-tab__ripple::before {
      display: none;
    }
    /* Tab deshabilitada */
    :host ::ng-deep .app-tabs .mat-mdc-tab.mdc-tab--disabled .mdc-tab__text-label {
      color: var(--fvx-text-muted, #94a3b8);
      opacity: 0.6;
    }
  `],
})
export class TabsComponent implements AfterContentInit {
  @Input() tabs: TabItem[] = [];
  @Input() activeKey?: string;
  @Input() stretch = false;
  @Input() align: 'start' | 'center' | 'end' = 'start';
  @Input() dynamicHeight = false;
  @Input() animationDuration = '200ms';

  @Output() activeKeyChange = new EventEmitter<string>();

  @ContentChildren(TabContentDirective) contents!: QueryList<TabContentDirective>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly templatesMap = signal<Record<string, TemplateRef<unknown>>>({});

  activeIndex = computed<number>(() => {
    const key = this.activeKey;
    if (!key) return 0;
    const idx = this.tabs.findIndex((t) => t.key === key);
    return idx >= 0 ? idx : 0;
  });

  ngAfterContentInit(): void {
    this.buildTemplates();
    // QueryList.changes emite indefinidamente; sin takeUntilDestroyed quedaba
    // suscrito tras destruir el componente (fuga).
    this.contents.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.buildTemplates());
  }

  templateFor(key: string): TemplateRef<unknown> | null {
    return this.templatesMap()[key] ?? null;
  }

  onIndexChange(idx: number): void {
    const t = this.tabs[idx];
    if (!t) return;
    if (this.activeKey !== t.key) {
      this.activeKey = t.key;
      this.activeKeyChange.emit(t.key);
    }
  }

  private buildTemplates(): void {
    const map: Record<string, TemplateRef<unknown>> = {};
    this.contents?.forEach((d) => {
      if (d.key) map[d.key] = d.template;
    });
    this.templatesMap.set(map);
  }
}
