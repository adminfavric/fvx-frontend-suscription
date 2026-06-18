import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';

import { BreadcrumbsService } from '../../../core/services/breadcrumbs.service';

export interface PageBreadcrumb {
  /** Texto fijo; omitir si hay `labelKey`. */
  label?: string;
  labelKey?: string;
  link?: string;
}

/**
 * Cabecera estándar para páginas (título, subtítulo, slot `actions`).
 *
 * **Los breadcrumbs ya NO se renderizan acá** — ahora viven en el topbar
 * global (`BreadcrumbsService` los auto-deriva del menú backend). Mantener
 * el `@Input() breadcrumbs` solo como mecanismo de override declarativo:
 * cuando se le pasa una lista explícita, el componente la empuja al servicio
 * vía `setOverride()` y la limpia al destruirse.
 *
 * ```html
 * <app-page-header title="Upload center" subtitle="...">
 *   <ng-container actions>...</ng-container>
 * </app-page-header>
 * ```
 *
 * Para vistas detalle (anexar el nombre del registro al trail auto):
 * ```ts
 * constructor(private bc: BreadcrumbsService) {}
 * ngOnInit() {
 *   this.api.get(this.id).subscribe(r => this.bc.append({ label: r.name }));
 * }
 * ```
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [],
  host: { '[attr.title]': 'null' },
  template: `
    <header class="page-header-c">
      <div class="page-header-c__row">
        <div class="page-header-c__heading">
          <h1 class="page-header-c__title">{{ title }}</h1>
          @if (subtitle) {
            <p class="page-header-c__subtitle">{{ subtitle }}</p>
          }
        </div>
        <div class="page-header-c__actions">
          <ng-content select="[actions]"></ng-content>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; margin-bottom: 16px; }
    .page-header-c__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .page-header-c__title {
      margin: 0;
      /* Spec design-fvx: H1 página = 24px / 700 / line-height 1.2. */
      font-size: var(--fvx-text-2xl);     /* 24px (escala FVX) */
      font-weight: 700;
      line-height: 1.2;
      color: var(--fvx-text-primary, #1e293b);
      letter-spacing: -0.01em;
    }
    .page-header-c__subtitle {
      margin: 4px 0 0;
      /* Spec: subtítulo / descripción = 13px / 400 / line-height 1.45. */
      font-size: var(--fvx-text-compact); /* 13px (escala FVX) */
      font-weight: 400;
      line-height: 1.45;
      color: var(--fvx-text-secondary, #475569);
    }
    .page-header-c__actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      /* Si la fila envuelve (mobile o títulos largos), las acciones quedan
         igualmente alineadas a la derecha en vez de caer al borde izquierdo
         del wrap. Sin esto, 'flex-wrap' + 'space-between' deja al action
         en flex-start de su propia fila. */
      margin-left: auto;
    }
  `],
})
export class PageHeaderComponent implements OnChanges, OnDestroy {
  @Input() title = '';
  @Input() subtitle?: string;
  /**
   * Override declarativo del trail de breadcrumbs (se reenvía al
   * `BreadcrumbsService`). Solo necesario para system pages que no están en
   * el menú backend; en el resto de los casos, omitir y dejar que el service
   * derive el trail automáticamente.
   */
  @Input() breadcrumbs?: PageBreadcrumb[];

  private readonly bc = inject(BreadcrumbsService);

  ngOnChanges(changes: SimpleChanges): void {
    if ('breadcrumbs' in changes) {
      this.bc.setOverride(this.breadcrumbs ?? null);
    }
  }

  ngOnDestroy(): void {
    // Al destruirse la página dueña del override lo limpiamos para no
    // contaminar la siguiente navegación si llega antes que NavigationEnd
    // del service alcance a resetear.
    this.bc.setOverride(null);
  }
}
