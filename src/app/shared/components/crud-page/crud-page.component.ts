import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { TranslocoPipe } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { DataTableComponent } from '../data-table/data-table.component';
import { FilterPanelComponent } from '../filter-panel/filter-panel.component';
import { PageHeaderComponent, PageBreadcrumb } from '../page-header/page-header.component';
import { ColumnConfig, TableAction, FilterConfig } from '../../../core/models/api.model';
import { CanDirective } from '../../../core/directives/can.directive';
import type { Permission } from '../../../core/auth/permissions';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-crud-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    PageHeaderComponent,
    DataTableComponent,
    FilterPanelComponent,
    CanDirective
],
  template: `
    <div class="page-container">
      <app-page-header
        [title]="title"
        [subtitle]="subtitle"
        [breadcrumbs]="breadcrumbs ?? []"
      >
        <div actions>
          @if (createPermission) {
            <button *appCan="createPermission" mat-flat-button color="primary" type="button" (click)="createClick.emit()">
              <mat-icon>add</mat-icon>
              {{ 'crud.addItem' | transloco: { name: entityName } }}
            </button>
          } @else if (showCreate) {
            <button mat-flat-button color="primary" type="button" (click)="createClick.emit()">
              <mat-icon>add</mat-icon>
              {{ 'crud.addItem' | transloco: { name: entityName } }}
            </button>
          }
        </div>
      </app-page-header>

      <div class="page-body" [class.has-filters]="showSidePanel">
        <div class="page-table">
          <app-data-table
            [columns]="columns"
            [actions]="actions"
            [data]="data"
            [totalCount]="totalCount"
            [pageSize]="pageSize"
            [pageIndex]="pageIndex"
            [isLoading]="loading"
            [activeFilterCount]="activeFilterCount"
            [searchPlaceholder]="'crud.searchPlaceholder' | transloco: { entity: title }"
            (pageChange)="pageChange.emit($event)"
            (sortChange)="sortChange.emit($event)"
            (searchChange)="searchChange.emit($event)"
            (actionClick)="actionClick.emit($event)"
            (rowClick)="rowClick.emit($event)"
            (refreshClick)="refreshClick.emit()"
            (exportClick)="exportClick.emit()"
            [showExport]="effectiveShowExport">
            <!-- Modo inline: barra de filtros DENTRO del card de la tabla (fila
                 superior, proyectada vía [tableFilters]). -->
            @if (showInline) {
              <app-filter-panel
                tableFilters
                class="crud-inline-filters"
                [filters]="filters"
                [inline]="true"
                [showHeader]="false"
                [alwaysExpanded]="true"
                (filterChange)="onFilterChange($event)">
              </app-filter-panel>
            }
            <!-- Slot toolbar de la tabla: en modo dropdown va el botón de filtros aquí.
                 Mantenemos un único nodo proyectado (el <button>) para que el @if no
                 rompa el slot. El <mat-menu> vive fuera y se referencia por template ref. -->
            @if (showDropdown) {
              <button
                tableActions
                mat-icon-button
                type="button"
                class="toolbar-icon-btn"
                [class.toolbar-icon-btn--active]="activeFilterCount > 0"
                [matMenuTriggerFor]="filtersMenu"
                [matTooltip]="'filterPanel.title' | transloco"
                [matBadge]="activeFilterCount || null"
                matBadgeColor="primary"
                matBadgeSize="small"
                matBadgeOverlap="true"
                [attr.aria-label]="'filterPanel.title' | transloco">
                <mat-icon>filter_list</mat-icon>
              </button>
            }
          </app-data-table>

          <!-- mat-menu siempre renderizado (es invisible hasta que se dispara). El
               @if del trigger arriba se encarga de mostrar/ocultar el botón. -->
          <mat-menu #filtersMenu="matMenu" class="crud-filters-menu" xPosition="before">
            <!-- Contenedor NO interactivo: el (click)/(keydown) solo frena la
                 propagación para que el mat-menu no se cierre al usar los filtros
                 internos (que ya son accesibles). -->
            <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
            <div class="crud-filters-menu__inner"
                 (click)="$event.stopPropagation()"
                 (keydown)="$event.stopPropagation()">
              <app-filter-panel
                [filters]="filters"
                [showHeader]="false"
                [alwaysExpanded]="true"
                [embedded]="true"
                (filterChange)="onFilterChange($event)">
              </app-filter-panel>
            </div>
          </mat-menu>
        </div>

        @if (showSidePanel) {
          <app-filter-panel
            [filters]="filters"
            (filterChange)="onFilterChange($event)">
          </app-filter-panel>
        }
      </div>
    </div>
  `,
  styles: [`
    @use 'variables' as v;

    .page-body {
      display: flex;
      gap: v.$spacing-lg;
      align-items: flex-start;
      width: 100%;
    }

    .page-table {
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
    }

    /* Barra de filtros inline (filterMode='inline') DENTRO del card de la tabla,
       como fila superior alineada a la derecha (proyectada vía [tableFilters]). */
    .crud-inline-filters {
      display: flex;
      justify-content: flex-end;
      padding: 12px 16px;
      border-bottom: 1px solid var(--fvx-border);
    }
    @media (max-width: 768px) {
      .crud-inline-filters { justify-content: flex-start; }
    }

    @media (max-width: 768px) {
      .page-body {
        flex-direction: column;
        gap: v.$spacing-sm;

        &.has-filters {
          flex-direction: column;

          .page-table {
            order: 2;
            width: 100%;
          }

          app-filter-panel {
            order: 1;
            display: flex;
            justify-content: flex-end;
            width: 100%;
          }
        }
      }
    }
  `]
})
export class CrudPageComponent {
  private readonly auth = inject(AuthService);
  private readonly breakpoints = inject(BreakpointObserver);
  /** Mobile (≤768px). En mobile el modo 'inline' (selectores en línea) cae a
   *  'dropdown' automáticamente: una fila de selects no cabe en pantalla angosta.
   *  Signal → reactivo con OnPush. */
  private readonly isMobile = toSignal(
    this.breakpoints.observe('(max-width: 768px)').pipe(map((s) => s.matches)),
    { initialValue: this.breakpoints.isMatched('(max-width: 768px)') },
  );

  /** Modo efectivo de filtros: 'inline' se degrada a 'dropdown' en mobile. */
  get effectiveFilterMode(): 'panel' | 'dropdown' | 'inline' {
    if (this.filterMode === 'inline' && this.isMobile()) return 'dropdown';
    return this.filterMode;
  }

  /** Valor efectivo de `[showExport]` para el data-table:
   *  si hay `exportPermission` → `auth.can(perm)`; si no → el flag manual. */
  get effectiveShowExport(): boolean {
    return this.exportPermission
      ? this.auth.can(this.exportPermission)
      : this.showExport;
  }

  @Input() title = '';
  /** Nombre de entidad en singular para el botón «Add …» / «Añadir …» (clave `crud.addItem`). */
  @Input() entityName = '';
  /** Texto bajo el título (opcional). */
  @Input() subtitle?: string;
  /** Migas de pan; vacío si no se pasan. */
  @Input() breadcrumbs?: PageBreadcrumb[];
  @Input() columns: ColumnConfig[] = [];
  @Input() actions: TableAction[] = [];
  @Input() filters: FilterConfig[] = [];
  @Input() data: any[] = [];
  @Input() totalCount = 0;
  @Input() pageSize = 20;
  @Input() pageIndex = 0;
  @Input() loading = false;
  /** Muestra «Añadir …» (p. ej. falso para `VIEWER` sin `is_staff`).
   *  Ignorado si `createPermission` está definido (la directiva manda). */
  @Input() showCreate = true;
  /**
   * Permiso requerido para mostrar el botón "Añadir …". Cuando se define, el
   * botón se renderiza vía `*appCan` y se gatea reactivamente con el rol del
   * usuario. Reemplaza el binding manual `[showCreate]="auth.can(...)"`.
   *
   * Ej.: `[createPermission]="'users.create'"`.
   */
  @Input() createPermission?: Permission;
  /** Muestra exportar Excel en la barra de la tabla.
   *  Ignorado si `exportPermission` está definido. */
  @Input() showExport = true;
  /**
   * Permiso requerido para mostrar el botón de exportar Excel del data-table.
   * Cuando se define, el flag interno `[showExport]` se calcula vía
   * `auth.can(permission)` en lugar del binding manual.
   */
  @Input() exportPermission?: Permission;
  /**
   * Control explícito de la visibilidad de los filtros (independiente del modo).
   *
   * - `undefined` (default): muestra filtros si `filters.length > 0` (comportamiento histórico).
   * - `true`: siempre muestra (útil en previews / antes de poblar filtros).
   * - `false`: nunca muestra (escape hatch).
   */
  @Input() showFilterPanel?: boolean;

  /**
   * Modo de visualización de los filtros:
   *
   * - `'dropdown'` (default): botón `filter_list` con badge dentro del toolbar
   *   de la tabla; al hacer click despliega un menu con los filtros. Deja la
   *   tabla extendida a todo el ancho disponible.
   * - `'panel'`: panel lateral fijo a la derecha de la tabla (comportamiento
   *   histórico). Útil cuando el set de filtros es grande y se manipula seguido.
   * - `'inline'`: barra de `app-smart-select` (uno por filtro) encima de la
   *   tabla. Buena cuando los filtros son pocos y quieres verlos siempre.
   *   **Responsive**: en mobile (≤768px) cae automáticamente a `'dropdown'`,
   *   porque una fila de selectores no cabe en pantalla angosta. Así puedes
   *   dejar `'inline'` siempre y obtienes selectores en desktop y desplegable
   *   en mobile sin configurar nada por pantalla.
   */
  @Input() filterMode: 'panel' | 'dropdown' | 'inline' = 'dropdown';

  /** Cantidad de filtros activos — alimenta el badge del botón dropdown. */
  activeFilterCount = 0;

  private get hasFilters(): boolean {
    return this.showFilterPanel ?? this.filters.length > 0;
  }
  get showSidePanel(): boolean {
    return this.hasFilters && this.effectiveFilterMode === 'panel';
  }
  get showDropdown(): boolean {
    return this.hasFilters && this.effectiveFilterMode === 'dropdown';
  }
  get showInline(): boolean {
    return this.hasFilters && this.effectiveFilterMode === 'inline';
  }

  onFilterChange(filters: Record<string, any>): void {
    this.activeFilterCount = Object.keys(filters).filter(
      (k) => filters[k] !== undefined && filters[k] !== null && filters[k] !== '',
    ).length;
    this.filterChange.emit(filters);
  }

  @Output() createClick = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<Record<string, any>>();
  @Output() actionClick = new EventEmitter<{ action: string; row: any }>();
  @Output() rowClick = new EventEmitter<any>();
  @Output() refreshClick = new EventEmitter<void>();
  @Output() exportClick = new EventEmitter<void>();
}
