import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  signal,
  computed,
  HostListener,
  ViewEncapsulation,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TruncateTooltipDirective } from '../../directives/truncate-tooltip.directive';
import { DateFormatPipe } from '../../pipes/date-format.pipe';
import { ColumnConfig, TableAction } from '../../../core/models/api.model';
import { EntityDrawerService } from '../../../core/services/entity-drawer.service';
import { UserUiPreferencesService } from '../../../core/services/user-ui-preferences.service';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { SearchInputComponent } from '../search-input/search-input.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { StatusChipComponent, StatusChipVariant } from '../status-chip/status-chip.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule,
    TruncateTooltipDirective,
    DateFormatPipe,
    EmptyStateComponent,
    SearchInputComponent,
    SkeletonComponent,
    StatusChipComponent,
    TranslocoPipe,
  ],
  template: `
    <div class="content-card">
      <!-- Barra de filtros inline (proyectada por el padre con [tableFilters]).
           Va DENTRO del card, como fila superior. Vacío → no ocupa espacio. -->
      <ng-content select="[tableFilters]"></ng-content>
      <div class="table-toolbar">
        <div class="search-field">
          <app-search-input
            #tableSearch
            [placeholder]="searchPlaceholder"
            [debounceMs]="400"
            (searchChange)="onTableSearch($event)"
          />
        </div>

        <span class="spacer"></span>

        <div class="toolbar-actions">
          @if (showInteractionToggles) {
            <!-- Toggle: marcado de filas (off por defecto). Activo = botón resaltado. -->
            <button
              mat-icon-button
              type="button"
              class="toolbar-icon-btn"
              [class.toolbar-icon-btn--on]="rowSelectable()"
              [attr.aria-pressed]="rowSelectable()"
              [matTooltip]="(rowSelectable() ? 'dataTable.selectRowsOff' : 'dataTable.selectRowsOn') | transloco"
              (click)="toggleRowSelectable()">
              <mat-icon>{{ rowSelectable() ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
            </button>
            <!-- Toggle: navegación por teclado (on por defecto). -->
            <button
              mat-icon-button
              type="button"
              class="toolbar-icon-btn"
              [class.toolbar-icon-btn--on]="keyboardNav()"
              [attr.aria-pressed]="keyboardNav()"
              [matTooltip]="(keyboardNav() ? 'dataTable.keyboardNavOff' : 'dataTable.keyboardNavOn') | transloco"
              (click)="toggleKeyboardNav()">
              <mat-icon>keyboard</mat-icon>
            </button>
            <!-- Toggle: densidad (compacto por defecto). -->
            <button
              mat-icon-button
              type="button"
              class="toolbar-icon-btn"
              [attr.aria-pressed]="density() === 'compact'"
              [matTooltip]="(density() === 'compact' ? 'dataTable.densityNormal' : 'dataTable.densityCompact') | transloco"
              (click)="toggleDensity()">
              <mat-icon>{{ density() === 'compact' ? 'density_small' : 'density_medium' }}</mat-icon>
            </button>
          }
          <button mat-icon-button [matTooltip]="'dataTable.refresh' | transloco" (click)="refreshClick.emit()" class="toolbar-icon-btn">
            <mat-icon>refresh</mat-icon>
          </button>
          @if (displayedColumns.length > 0) {
            <button
              mat-icon-button
              type="button"
              class="toolbar-icon-btn"
              [matTooltip]="'dataTable.pinColumns' | transloco"
              [matMenuTriggerFor]="pinColumnsMenu">
              <mat-icon>view_column</mat-icon>
            </button>
            <mat-menu #pinColumnsMenu="matMenu" class="data-table-pin-menu">
              <div class="data-table-pin-menu__title">{{ 'dataTable.pinColumns' | transloco }}</div>
              @for (colKey of displayedColumns; track colKey) {
                <!-- Contenedor NO interactivo: el (click)/(keydown) solo frena la
                     propagación para que el mat-menu no se cierre al togglear el
                     checkbox. El control real (mat-checkbox) ya es accesible. -->
                <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
                <div class="data-table-pin-menu__row"
                     (click)="$event.stopPropagation()"
                     (keydown)="$event.stopPropagation()">
                  <mat-checkbox
                    [checked]="isPinned(colKey)"
                    (change)="onPinnedColumnChange(colKey, $event.checked)"
                    (click)="$event.stopPropagation()">
                    {{ columnPinLabel(colKey) }}
                  </mat-checkbox>
                </div>
              }
            </mat-menu>
          }
          @if (showExport) {
            <button mat-icon-button [matTooltip]="'dataTable.exportExcel' | transloco" (click)="exportClick.emit()" class="toolbar-icon-btn">
              <mat-icon>download</mat-icon>
            </button>
          }
          <ng-content select="[tableActions]"></ng-content>
        </div>
      </div>

      <div class="data-table__table-surface"
           [class.data-table__table-surface--empty]="!loading() && data.length === 0">
        @if (loading() && data.length === 0) {
          <div class="data-table__skel" aria-busy="true" aria-live="polite">
            <div class="data-table__skel-header">
              @for (col of displayedColumns; track col) {
                <app-skeleton height="12px" width="60%" />
              }
            </div>
            @for (i of skeletonRows; track i) {
              <div class="data-table__skel-row">
                @for (col of displayedColumns; track col) {
                  <app-skeleton height="14px" />
                }
              </div>
            }
          </div>
        } @else if (!loading() && data.length === 0) {
          <!-- Sin datos: mostramos el empty-state DENTRO de la superficie (que
               reserva ~360px) para que quede centrado en ese espacio y pegado al
               header, en vez de renderizar un <table> con header huérfano y el
               empty-state colgando debajo. -->
          @if (hasActiveFilter()) {
            <app-empty-state
              [icon]="emptyFilteredIcon"
              [title]="emptyFilteredTitle || ('dataTable.emptyFilteredTitle' | transloco)"
              [description]="emptyFilteredDescription || ''"
              [compact]="true"
            >
              <button mat-stroked-button (click)="clearSearch()">
                <mat-icon>close</mat-icon>
                {{ 'dataTable.clearSearch' | transloco }}
              </button>
              <ng-content select="[emptyFilteredActions]"></ng-content>
            </app-empty-state>
          } @else {
            <app-empty-state
              [icon]="emptyIcon"
              [title]="emptyTitle || ('dataTable.emptyTitle' | transloco)"
              [description]="emptyDescription || ''"
              [compact]="true"
            >
              <ng-content select="[emptyActions]"></ng-content>
            </app-empty-state>
          }
        } @else {
        @if (loading()) {
          <div class="data-table__loading-bar" aria-busy="true" aria-live="polite">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          </div>
        }
        <div class="table-container" [class.has-sticky-actions]="isStickyEnd('actions')">
        <table mat-table [dataSource]="data" matSort (matSortChange)="onSortChange($event)"
               class="kbd-nav-table"
               [class.dense]="density() === 'compact'"
               [attr.tabindex]="keyboardNav() ? 0 : null"
               [attr.aria-label]="keyboardNav() ? ('dataTable.keyboardNavLabel' | transloco) : null"
               (keydown)="onTableKeydown($event)">

          @for (col of columns; track col.key) {
            <ng-container
              [matColumnDef]="col.key"
              [sticky]="isStickyStart(col.key)"
              [stickyEnd]="isStickyEnd(col.key)">
              <th mat-header-cell *matHeaderCellDef [mat-sort-header]="col.sortable !== false ? col.key : ''">
                @if (col.labelKey) {
                  {{ col.labelKey | transloco }}
                } @else {
                  {{ col.label }}
                }
              </th>
              <td mat-cell *matCellDef="let row" 
                  appTruncateTooltip
                  [matTooltip]="getCellTooltip(row, col)" 
                  matTooltipPosition="above">
                @switch (col.type) {
                  @case ('boolean') {
                    <app-status-chip
                      [variant]="row[col.key] ? 'success' : 'muted'"
                      [label]="row[col.key] ? ('common.yes' | transloco) : ('common.no' | transloco)"
                    />
                  }
                  @case ('chip') {
                    <app-status-chip
                      [variant]="getChipVariant(row[col.key])"
                      [label]="col.chipMap?.[row[col.key]] || row[col.key] || ('common.dash' | transloco)"
                    />
                  }
                  @case ('date') {
                    {{ row[col.key] | dateFormat }}
                  }
                  @default {
                    @if (isCodeField(col.key)) {
                      <span class="code-chip">{{ row[col.key] ?? ('common.dash' | transloco) }}</span>
                    } @else if (col.render) {
                      {{ col.render(row) }}
                    } @else {
                      {{ row[col.key] ?? ('common.dash' | transloco) }}
                    }
                  }
                }
              </td>
            </ng-container>
          }

          <ng-container
            matColumnDef="actions"
            [sticky]="isStickyStart('actions')"
            [stickyEnd]="isStickyEnd('actions')">
            <th mat-header-cell *matHeaderCellDef class="actions-column">
              <span class="actions-column__label-text">{{ 'dataTable.actions' | transloco }}</span>
              <mat-icon class="actions-column__label-icon"
                        aria-hidden="true"
                        [matTooltip]="'dataTable.actions' | transloco"
                        matTooltipPosition="above">more_horiz</mat-icon>
            </th>
            <td mat-cell *matCellDef="let row" class="actions-column">
              <div class="actions-bar">
                <!-- Acciones primarias visibles inline (texto + icono). -->
                @for (act of primaryActions; track act.action) {
                  @if (!act.condition || act.condition(row)) {
                    <button
                      type="button"
                      class="actions-bar__primary"
                      [class.actions-bar__primary--warn]="act.color === 'warn'"
                      [class.actions-bar__btn--toggle-on]="act.action === 'toggle_active' && isRowActive(row)"
                      [class.actions-bar__btn--toggle-off]="act.action === 'toggle_active' && !isRowActive(row)"
                      [matTooltip]="actionTooltip(act, row)"
                      (click)="onAction(act.action, row); $event.stopPropagation()">
                      <mat-icon>{{ actionIcon(act, row) }}</mat-icon>
                      <span>{{ actionLabel(act) }}</span>
                    </button>
                  }
                }

                <!-- Kebab menu para las acciones secundarias. -->
                @if (visibleSecondaryActions(row).length > 0) {
                  <button
                    mat-icon-button
                    type="button"
                    class="actions-bar__kebab"
                    [matMenuTriggerFor]="rowMenu"
                    [matTooltip]="'dataTable.moreActions' | transloco"
                    matTooltipPosition="above"
                    [attr.aria-label]="'dataTable.moreActions' | transloco"
                    (click)="$event.stopPropagation()">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #rowMenu="matMenu" xPosition="before" class="fvx-kebab-menu">
                    @for (act of visibleSecondaryActions(row); track act.action) {
                      <button
                        mat-menu-item
                        [class.danger]="act.color === 'warn'"
                        (click)="onAction(act.action, row); $event.stopPropagation()">
                        <mat-icon>{{ actionIcon(act, row) }}</mat-icon>
                        <span>{{ actionLabel(act) }}</span>
                      </button>
                    }
                  </mat-menu>
                }
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              (click)="onRowClick(row)"
              (dblclick)="onRowDblClick(row, $event)"
              [class.clickable-row]="rowSelectable()"
              [attr.aria-selected]="rowSelectable() ? isRowHighlighted(row) : null"
              [class.clickable-row--selected]="isRowHighlighted(row)"
              [class.clickable-row--kbd]="i === activeRowIndex()"></tr>
        </table>
      </div>
      <!-- Región de estado para lectores de pantalla: anuncia la fila activa
           (nav por teclado) y los cambios de marcado, que de otro modo solo se
           comunican por color/CSS (WCAG 4.1.2). visualmente oculta. -->
      <div class="cdk-visually-hidden" aria-live="polite" role="status">{{ rowStatusMessage() }}</div>
        }
      </div>

      <mat-paginator [length]="totalCount"
                     [pageSize]="pageSize"
                     [pageIndex]="pageIndex"
                     [pageSizeOptions]="[10, 20, 50, 100]"
                     (page)="onPageChange($event)"
                     showFirstLastButtons>
      </mat-paginator>
    </div>
  `,
  styles: [`
    /* Columna Acciones sticky a la derecha (ancho fijo). */
    .actions-column {
      width: 130px;
      min-width: 130px;
      white-space: nowrap;
      text-align: right;
      padding-right: 12px !important;
    }
    /* Header: texto en desktop, ícono en mobile (ahorra espacio en una
       columna que de todas formas solo tiene botones de icono visibles). */
    .actions-column__label-icon {
      display: none;
      font-size: 18px;
      width: 18px;
      height: 18px;
      vertical-align: middle;
      color: var(--fvx-text-muted);
    }
    .clickable-row { cursor: pointer; }
    /* ── Toolbar — íconos utilitarios (recargar / columnas / exportar / filtros) ── */
    /* Spec: caja 36x36, radio 9px, --text-secondary en reposo, hover con bg,
       foco visible, agrupados con divisor sutil del buscador. */
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 2px;                    /* spec — pegaditos, son un grupo */
      position: relative;
    }
    /* Divisor sutil entre el buscador y el grupo de íconos. Solo aparece si el
       slot tiene contenido (:empty lo oculta). */
    .toolbar-actions:not(:empty)::before {
      content: '';
      display: inline-block;
      width: 1px;
      height: 22px;
      background: var(--fvx-border);
      margin: 0 8px 0 0;
      align-self: center;
      flex-shrink: 0;
    }
    .toolbar-icon-btn.mat-mdc-icon-button {
      /* Override del global html .mat-mdc-icon-button { width: 32px } —
         este es el variant de toolbar, más grande para alcanzar 36px hit-target. */
      width: 36px !important;
      height: 36px !important;
      padding: 0 !important;
      border-radius: var(--fvx-radius, 9px) !important;
      color: var(--fvx-text-secondary);
      --mat-icon-button-icon-color: var(--fvx-text-secondary);
      --mat-icon-button-state-layer-size: 36px;
      transition: background-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;
    }
    .toolbar-icon-btn.mat-mdc-icon-button .mat-mdc-button-touch-target {
      width: 36px !important;
      height: 36px !important;
    }
    .toolbar-icon-btn.mat-mdc-icon-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      line-height: 20px;
      color: inherit;
    }
    .toolbar-icon-btn.mat-mdc-icon-button:hover:not([disabled]) {
      background-color: var(--fvx-hover-bg) !important;
      color: var(--fvx-text-primary);
      --mat-icon-button-icon-color: var(--fvx-text-primary);
    }
    .toolbar-icon-btn.mat-mdc-icon-button:active:not([disabled]) {
      background-color: color-mix(in srgb, var(--fvx-text-primary) 10%, transparent) !important;
    }
    .toolbar-icon-btn.mat-mdc-icon-button:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px var(--fvx-accent-soft, color-mix(in srgb, var(--fvx-link) 24%, transparent)) !important;
    }
    /* Estado ACTIVO (ej. filtros aplicados): fondo accent-soft + icono accent.
       Comunica "este toggle está actuando sobre los datos". */
    .toolbar-icon-btn.mat-mdc-icon-button.toolbar-icon-btn--active {
      background-color: var(--fvx-accent-soft, color-mix(in srgb, var(--fvx-link) 16%, transparent)) !important;
      color: var(--fvx-link);
      --mat-icon-button-icon-color: var(--fvx-link);
    }
    .toolbar-icon-btn.mat-mdc-icon-button.toolbar-icon-btn--active:hover:not([disabled]) {
      background-color: color-mix(in srgb, var(--fvx-link) 22%, transparent) !important;
    }
    /* Estado ON de un toggle de interacción (marcado de filas / nav teclado):
       mismo lenguaje visual que --active pero semánticamente "modo encendido". */
    .toolbar-icon-btn.mat-mdc-icon-button.toolbar-icon-btn--on {
      background-color: var(--fvx-accent-soft, color-mix(in srgb, var(--fvx-link) 16%, transparent)) !important;
      color: var(--fvx-link);
      --mat-icon-button-icon-color: var(--fvx-link);
    }
    .toolbar-icon-btn.mat-mdc-icon-button.toolbar-icon-btn--on:hover:not([disabled]) {
      background-color: color-mix(in srgb, var(--fvx-link) 22%, transparent) !important;
    }

    /* ── Columna Acciones: primary visible + kebab (spec FVX) ─────────────── */
    .actions-bar {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }
    .actions-bar__primary {
      /* Reset agresivo del default del navegador (Safari macOS pinta un fondo gris
         por defecto en button, y el shorthand background no siempre lo neutraliza). */
      appearance: none;
      -webkit-appearance: none;
      background: none !important;
      background-color: transparent !important;
      border: none;
      box-shadow: none;
      outline: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      font-family: inherit;
      font-size: var(--fvx-text-sm);
      font-weight: 600;
      line-height: 1;
      color: var(--fvx-text-secondary);
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.1s ease, color 0.1s ease;
    }
    .actions-bar__primary mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: inherit;
    }
    .actions-bar__primary:hover {
      background: color-mix(in srgb, var(--fvx-text-primary) 6%, transparent);
      color: var(--fvx-text-primary);
    }
    .actions-bar__primary--warn {
      color: var(--fvx-chip-danger-fg, #ef4444);
    }
    .actions-bar__primary--warn:hover {
      background: color-mix(in srgb, var(--fvx-chip-danger-fg, #ef4444) 12%, transparent);
      color: var(--fvx-chip-danger-fg, #ef4444);
    }
    /* Compat con la lógica toggle_active heredada (icono on/off según estado). */
    .actions-bar__btn--toggle-on { color: var(--fvx-link); }
    .actions-bar__btn--toggle-off { color: var(--fvx-text-muted); }

    /* ── Mobile: TODAS las acciones van al kebab ⋮ ──
       En pantallas estrechas la columna "Acciones" se aprieta; en vez de mostrar
       el botón primario como icono + el kebab (se ven como "dos iconos"),
       primaryActions devuelve [] en mobile y todo cae al desplegable. Aquí solo
       achicamos la columna (solo queda el kebab) y mostramos el header como ícono. */
    @media (max-width: 768px) {
      .actions-column { width: 56px; min-width: 56px; }
      .actions-column__label-text { display: none; }
      .actions-column__label-icon { display: inline-flex; }
    }

    .actions-bar__kebab.mat-mdc-icon-button {
      --mat-icon-button-icon-color: var(--fvx-text-secondary);
      width: 28px;
      height: 28px;
      padding: 0;
    }
    .actions-bar__kebab.mat-mdc-icon-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      line-height: 18px;
    }
    .actions-bar__kebab.mat-mdc-icon-button:hover {
      --mat-icon-button-icon-color: var(--fvx-text-primary);
    }

    /* ── Zebra striping (per-cell para preservar el sticky) ─────────────── */
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row > td.mat-mdc-cell {
      background-color: var(--fvx-bg-card);
    }
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row:nth-child(even) > td.mat-mdc-cell {
      /* Zebra (banda par) al 3% del texto primario — la mitad del 6% anterior:
         interlineado más sutil. */
      background-color: color-mix(in srgb, var(--fvx-bg-card) 97%, var(--fvx-text-primary));
    }
    /* Hover: tinte de ACENTO al 12% — destaca con claridad sobre AMBAS bandas de
       la zebra (par ~6% neutro) que con un neutro al 7% quedaba casi invisible.
       Jerarquía de tintes, de menor a mayor, para que cada estado se distinga:
         zebra par 3% (neutro) < foco teclado 8% (accent) < hover 12% (accent)
         < fila seleccionada 22/28% (accent + texto teñido + barra lateral 4px).
       Transición 180ms para que el cambio sea suave al pasar el mouse. */
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row > td.mat-mdc-cell {
      transition: background-color 180ms ease;
    }
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row:hover > td.mat-mdc-cell {
      background-color: color-mix(in srgb, var(--fvx-link) 12%, var(--fvx-bg-card));
    }

    /* ── Fila seleccionada (la que abrió el drawer) ──
       Estado FIJADO: debe distinguirse con claridad del hover (transitorio, 12%).
       Por eso no solo sube el tinte (22% reposo / 28% hover) sino que también
       tiñe el TEXTO de acento (peso 500) y engruesa la barra lateral a 4px de
       alto completo — contraste de color Y tipografía, no solo de saturación. */
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row.clickable-row--selected > td.mat-mdc-cell {
      background-color: color-mix(in srgb, var(--fvx-link) 22%, var(--fvx-bg-card)) !important;
      color: color-mix(in srgb, var(--fvx-link) 70%, var(--fvx-text-primary));
      font-weight: 500;
    }
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row.clickable-row--selected:hover > td.mat-mdc-cell {
      background-color: color-mix(in srgb, var(--fvx-link) 28%, var(--fvx-bg-card)) !important;
    }
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row.clickable-row--selected > td.mat-mdc-cell:first-child {
      position: relative;
    }
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row.clickable-row--selected > td.mat-mdc-cell:first-child::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--fvx-link);
      border-radius: 0 3px 3px 0;
      pointer-events: none;
    }

    /* ── Navegación por teclado: fila activa (↑/↓) ────────────────────────
       Tinte más leve que --selected, para distinguir "foco de teclado" de
       "marcada / abierta en drawer". */
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row.clickable-row--kbd > td.mat-mdc-cell {
      background-color: color-mix(in srgb, var(--fvx-link) 8%, var(--fvx-bg-card)) !important;
    }
    /* Hover sobre la fila activa por teclado: gana el hover (12%) — el --kbd usa
       !important, así que aquí también para que el mouse la oscurezca igual que
       a cualquier otra fila. */
    app-data-table table.mat-mdc-table tbody tr.mat-mdc-row.clickable-row--kbd:hover > td.mat-mdc-cell {
      background-color: color-mix(in srgb, var(--fvx-link) 12%, var(--fvx-bg-card)) !important;
    }
    /* La tabla es enfocable (tabindex=0) para la navegación por teclado, pero NO
       mostramos un anillo en toda la tabla: confunde y la fila activa
       (.clickable-row--kbd) ya indica dónde estás al navegar con flechas. */
    app-data-table table.kbd-nav-table:focus,
    app-data-table table.kbd-nav-table:focus-visible {
      outline: none;
    }

    /* ── Gradiente de fade junto a la columna sticky de acciones ──────────
       Solo cuando EXISTE una columna 'actions' anclada (.has-sticky-actions).
       Sin acciones (p. ej. un usuario VIEWER sin permisos de edición) no hay
       nada sticky a la derecha, así que el gradiente pintaría sobre datos
       reales a ~130px del borde. */
    app-data-table .table-container {
      position: relative;
    }
    app-data-table .table-container.has-sticky-actions::after {
      content: '';
      position: sticky;
      float: right;
      right: 130px;                /* matchea .actions-column width (desktop) */
      top: 0;
      width: 28px;
      height: 100%;
      margin-left: -28px;
      pointer-events: none;
      background: linear-gradient(
        to right,
        color-mix(in srgb, var(--fvx-bg-card) 0%, transparent) 0%,
        color-mix(in srgb, var(--fvx-bg-card) 60%, transparent) 60%,
        var(--fvx-bg-card) 100%
      );
      z-index: 1;
    }
    @media (max-width: 768px) {
      app-data-table .table-container.has-sticky-actions::after { right: 72px; }
    }
    .code-chip {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: var(--fvx-text-xs);
      font-weight: 600;
      line-height: 1.5;
      background: var(--fvx-hover-bg, #f3f4f6);
      /* tmp-dark: --fvx-code-pill-fg y --fvx-hover-bg alinean 1er plano con la píldora. */
      color: var(--fvx-code-pill-fg, var(--fvx-text-secondary, #374151));
      border: 1px solid var(--fvx-border, #e5e7eb);
      white-space: nowrap;
    }
    app-data-table app-empty-state {
      display: block;
      margin: 12px 0;
    }

    /* Barra de carga sobre la zona de la tabla (no encima de toda la card).
       min-height reservado para que el skeleton, la data y el empty-state
       ocupen aproximadamente la misma altura — sin esto, al navegar entre
       /users (4 filas) y /groups (0 filas) y tabla con 20 filas la altura
       colapsa/expande y se ve el "salto entre páginas". */
    app-data-table .data-table__table-surface {
      position: relative;
      min-height: 360px;
    }
    /* Estado vacío: no reservamos los 360px (no hay filas que "salten" entre
       páginas) y el empty-state queda ARRIBA, pegado al header de la card, en
       vez de flotar al centro de una superficie alta. */
    app-data-table .data-table__table-surface--empty {
      min-height: 0;
    }
    app-data-table .data-table__table-surface--empty app-empty-state {
      margin: 0;
    }
    app-data-table .data-table__loading-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 8;
      pointer-events: none;
    }

    /* Skeleton block para initial load (data vacía + loading). Imita header + N filas. */
    app-data-table .data-table__skel {
      padding: 8px 16px 16px;
    }
    app-data-table .data-table__skel-header,
    app-data-table .data-table__skel-row {
      display: grid;
      grid-auto-columns: minmax(80px, 1fr);
      grid-auto-flow: column;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid var(--fvx-border);
    }
    app-data-table .data-table__skel-header {
      border-bottom: 1px solid var(--fvx-border);
      padding-bottom: 14px;
    }
    app-data-table .data-table__skel-row:last-child {
      border-bottom: none;
    }

    /* Sticky columns: stacking sobre el scroll horizontal.
       El fondo lo asigna el zebra per-cell de arriba; aquí solo el z-index del header. */
    app-data-table .table-container table.mat-mdc-table th.mat-mdc-header-cell.mat-mdc-table-sticky {
      /* Mismo fondo que el resto del header + un tinte mínimo (4%) para diferenciar
         la columna fijada de forma MUY sutil (antes usaba --fvx-bg-card y
         contrastaba demasiado). */
      background: color-mix(in srgb, var(--fvx-text-primary) 4%, var(--fvx-table-header-bg, var(--fvx-bg-surface-2)));
      z-index: 3;
    }
    app-data-table .table-container table.mat-mdc-table td.mat-mdc-cell.mat-mdc-table-sticky {
      z-index: 2;
    }
    /* Línea divisoria DENTRO de la celda sticky (antes de la fila), no en el borde —
       evita el "corte" visual feo cuando la tabla scrollea. */
    app-data-table .table-container table.mat-mdc-table td.mat-mdc-cell.mat-mdc-table-sticky.actions-column::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 1px;
      background: var(--fvx-border);
      opacity: 0.5;
    }

    .mat-mdc-menu-panel.data-table-pin-menu {
      max-width: 280px;
    }
    .data-table-pin-menu__title {
      padding: 10px 16px 4px;
      font-size: var(--fvx-text-sm);
      font-weight: 600;
      color: var(--fvx-text-muted, #737373);
      pointer-events: none;
    }
    .data-table-pin-menu__row {
      padding: 4px 12px 4px 8px;
    }
    .data-table-pin-menu__row .mat-mdc-checkbox {
      width: 100%;
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class DataTableComponent implements OnChanges {
  @ViewChild('tableSearch') private tableSearch?: SearchInputComponent;

  private readonly transloco = inject(TranslocoService);
  private readonly drawer = inject(EntityDrawerService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly uiPrefs = inject(UserUiPreferencesService);

  /** Densidad global (alto de fila); 'compact' por defecto. Se aplica como
   *  clase `.dense` en la `<table>` y el toggle del header la alterna. */
  readonly density = this.uiPrefs.tableDensity;

  /**
   * Id de la fila actualmente abierta en el ``EntityDrawer`` (modo API). Se
   * deriva del estado global del drawer — la tabla destaca esa fila con un
   * leve fondo accent y una barra de acento a la izquierda. Cuando el drawer
   * cierra, ``config()`` vuelve a ``null`` y la marca desaparece sola.
   */
  readonly selectedRowId = computed<number | null>(() => {
    if (!this.drawer.isOpen()) return null;
    const cfg = this.drawer.config();
    if (!cfg || cfg.embedComponent) return null;
    return typeof cfg.entityId === 'number' ? cfg.entityId : null;
  });

  private _columns: ColumnConfig[] = [];
  
  @Input() set columns(value: ColumnConfig[]) {
    this._columns = this.reorderColumns(value);
  }
  get columns(): ColumnConfig[] {
    return this._columns;
  }
  
  @Input() actions: TableAction[] = [];
  @Input() data: any[] = [];
  @Input() totalCount = 0;
  @Input() pageSize = 20;
  @Input() pageIndex = 0;
  @Input() searchPlaceholder = 'Search...';
  /** Falso para roles solo lectura (p. ej. `VIEWER` sin `is_staff`). */
  @Input() showExport = true;

  // ── Toggles de interacción (botones en el header) ───────────────────────────
  /** Estado inicial del marcado de filas (click marca / doble click desmarca).
   *  Por defecto DESHABILITADO: se activa con el botón del header. El usuario lo
   *  alterna en `rowSelectable`. */
  @Input() rowSelectableDefault = false;
  /** Estado inicial de la navegación por teclado (flechas + Enter/Espacio).
   *  Por defecto HABILITADO. El usuario lo alterna en `keyboardNav`. */
  @Input() keyboardNavDefault = true;
  /** Muestra los botones de toggle (selección / densidad) en el header. */
  @Input() showInteractionToggles = true;

  /** ¿El marcado de filas está activo? (toggle del header). */
  readonly rowSelectable = signal(false);
  /** ¿La navegación por teclado está activa? (toggle del header). */
  readonly keyboardNav = signal(true);

  /**
   * Columnas ancladas al hacer scroll (`sticky` a la izquierda; la columna `actions` usa `stickyEnd` a la derecha).
   * Si no se define, por defecto se fija `actions` cuando hay botones de fila.
   */
  @Input() stickyColumns?: string[];

  // ── Empty state: sin registros (dataset vacío total) ──
  @Input() emptyIcon = 'inbox';
  @Input() emptyTitle = '';
  @Input() emptyDescription?: string;

  // ── Empty state: sin resultados por filtro/búsqueda activa ──
  @Input() emptyFilteredIcon = 'search_off';
  @Input() emptyFilteredTitle = '';
  @Input() emptyFilteredDescription?: string;

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() actionClick = new EventEmitter<{ action: string; row: any }>();
  @Output() rowClick = new EventEmitter<any>();
  @Output() refreshClick = new EventEmitter<void>();
  @Output() exportClick = new EventEmitter<void>();
  /** Emite cuando el usuario cambia la selección de columnas fijas (también útil para persistir preferencias). */
  @Output() stickyColumnsChange = new EventEmitter<string[]>();

  loading = signal(false);
  /** Texto de búsqueda actual (tras debounce del `app-search-input`); usado para empty “filtrado”. */
  searchValue = '';

  /** Ancho de viewport (se refresca en resize) para decidir el layout de acciones. */
  private readonly viewportWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);
  /** ¿Vista mobile? Mismo breakpoint que el media query de la columna acciones (768px). */
  readonly isMobile = computed(() => this.viewportWidth() < 768);

  @HostListener('window:resize')
  protected onViewportResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  // ── Marcar fila (selección persistente) ────────────────────────────────────
  // 1 click → MARCA la fila (resalta). Doble click → la DESMARCA. NO abre el
  // drawer: el detalle se accede por el botón Editar / acciones. Sin timer: el
  // single SUMA (idempotente) y el doble RESTA, así los dos clicks intermedios
  // del doble no rompen nada (queda desmarcada). Reusa el highlight `--selected`.
  private readonly markedRows = signal<Set<unknown>>(new Set());

  // Mensaje para la región aria-live (lectores de pantalla). Se actualiza al
  // marcar/desmarcar y al mover la fila activa por teclado.
  readonly rowStatusMessage = signal('');

  private rowKey(row: any): unknown {
    return row?.id != null ? row.id : row;
  }

  /** Etiqueta legible de una fila para anunciar al AT: usa la 1ª columna con
   *  valor; si no hay, cae al índice (1-based). */
  private rowLabel(row: any, index: number): string {
    for (const col of this.columns) {
      const v = row?.[col.key];
      if (v != null && v !== '') return String(v);
    }
    return this.transloco.translate('dataTable.rowN', { n: index + 1 });
  }

  private setRowMarked(row: any, marked: boolean): void {
    const key = this.rowKey(row);
    let changed = false;
    this.markedRows.update(set => {
      if (set.has(key) === marked) return set; // sin cambio → no re-render
      changed = true;
      const next = new Set(set);
      if (marked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
    if (changed) {
      const label = this.rowLabel(row, this.data.indexOf(row));
      this.rowStatusMessage.set(
        this.transloco.translate(marked ? 'dataTable.rowMarked' : 'dataTable.rowUnmarked', { row: label }),
      );
    }
  }

  onRowClick(row: any): void {
    if (!this.rowSelectable()) return; // selección desactivada → fila inerte
    this.setRowMarked(row, true); // 1 click → marca
  }

  onRowDblClick(row: any, event: Event): void {
    if (!this.rowSelectable()) return; // selección desactivada → fila inerte
    event.preventDefault(); // evita la selección de texto del doble click
    this.setRowMarked(row, false); // doble click → desmarca
  }

  /** Alterna el marcado de filas (botón del header). Al apagarlo, limpia las
   *  filas ya marcadas para no dejar resaltados huérfanos. */
  toggleRowSelectable(): void {
    const next = !this.rowSelectable();
    this.rowSelectable.set(next);
    if (!next) {
      this.markedRows.set(new Set());
    }
  }

  /** Alterna la navegación por teclado (botón del header). Al apagarla, suelta
   *  la fila activa. */
  toggleKeyboardNav(): void {
    const next = !this.keyboardNav();
    this.keyboardNav.set(next);
    if (!next) {
      this.activeRowIndex.set(-1);
    }
  }

  /** Alterna la densidad global (compacto ↔ normal) y la persiste. */
  toggleDensity(): void {
    this.uiPrefs.setTableDensity(this.density() === 'compact' ? 'normal' : 'compact');
  }

  private toggleRowMarked(row: any): void {
    this.setRowMarked(row, !this.isRowMarked(row));
  }

  isRowMarked(row: any): boolean {
    return this.markedRows().has(this.rowKey(row));
  }

  /** Fila resaltada: marcada por click O abierta en el drawer (edición). */
  isRowHighlighted(row: any): boolean {
    return this.isRowMarked(row) || (row?.id != null && row.id === this.selectedRowId());
  }

  // ── Navegación por teclado (la <table> tiene tabindex=0) ───────────────────
  // ↑/↓ mueven la fila activa, Home/End van a la primera/última; Enter o Espacio
  // marcan/desmarcan (toggle) la fila activa. La fila activa se resalta
  // (.clickable-row--kbd) y se hace scroll a la vista.
  readonly activeRowIndex = signal(-1);

  onTableKeydown(event: KeyboardEvent): void {
    if (!this.keyboardNav()) return; // nav por teclado desactivada (toggle header)

    // Solo actuar cuando la tecla nace en la propia <table> (el elemento con
    // tabindex=0), NO en un control descendiente. keydown burbujea, así que sin
    // este guard un Enter/Espacio sobre un mat-sort-header o un botón de acción
    // de la fila también caería aquí y marcaría/desmarcaría una fila ajena
    // (regresión de la nav por teclado). Flechas/Home/End quedan confinadas a
    // la superficie de la tabla por la misma razón.
    if (event.target !== event.currentTarget) return;

    const n = this.data.length;
    if (n === 0) return;
    let idx = this.activeRowIndex();

    switch (event.key) {
      case 'ArrowDown':
        idx = idx < 0 ? 0 : Math.min(idx + 1, n - 1);
        break;
      case 'ArrowUp':
        idx = idx <= 0 ? 0 : idx - 1;
        break;
      case 'Home':
        idx = 0;
        break;
      case 'End':
        idx = n - 1;
        break;
      case 'Enter':
      case ' ': // Enter / Espacio → marcar o desmarcar (solo si la selección está activa)
        if (idx >= 0 && this.rowSelectable()) {
          event.preventDefault();
          this.toggleRowMarked(this.data[idx]);
        }
        return;
      default:
        return; // otras teclas: dejar pasar (no interferir con sort, etc.)
    }

    event.preventDefault(); // evita el scroll de página con las flechas
    this.activeRowIndex.set(idx);
    this.scrollActiveRowIntoView(idx);
    // Anunciar al AT la fila activa (índice + estado marcado).
    const row = this.data[idx];
    const label = this.rowLabel(row, idx);
    this.rowStatusMessage.set(
      this.transloco.translate('dataTable.rowActive', {
        row: label,
        index: idx + 1,
        total: n,
        state: this.transloco.translate(
          this.isRowMarked(row) ? 'dataTable.stateMarked' : 'dataTable.stateUnmarked',
        ),
      }),
    );
  }

  private scrollActiveRowIntoView(idx: number): void {
    // tras el render de la clase activa, llevar la fila a la vista.
    queueMicrotask(() => {
      const rows = this.host.nativeElement.querySelectorAll('tbody tr.mat-mdc-row');
      (rows[idx] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
    });
  }

  /** Claves de columnas actualmente ancladas (Material aplica `sticky` / `stickyEnd` en `matColumnDef`). */
  readonly pinnedColumnKeys = signal<string[]>([]);

  /** Filas placeholder durante la primera carga (initial loading + data vacía).
   *  Se ajusta al `pageSize` con tope de 8 — más de 8 skeletons grandes se
   *  siente lento y desproporcionado al alto del viewport.
   *  Usar un getter (no @Input/init) para que el array se recalcule cuando
   *  el padre cambia `pageSize` después del primer render. */
  protected get skeletonRows(): number[] {
    const n = Math.min(Math.max(this.pageSize ?? 5, 3), 8);
    return Array.from({ length: n }, (_, i) => i);
  }

  private defaultStickyApplied = false;

  @Input() set isLoading(value: boolean) {
    this.loading.set(value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Inicializa los toggles desde los @Input default (una vez). El usuario los
    // alterna luego con los botones del header.
    if (changes['rowSelectableDefault']) {
      this.rowSelectable.set(this.rowSelectableDefault);
    }
    if (changes['keyboardNavDefault']) {
      this.keyboardNav.set(this.keyboardNavDefault);
    }

    // Nuevo dataset (página/filtro/refresh) → la fila activa por teclado ya no
    // corresponde; la reseteamos para no resaltar una fila equivocada.
    if (changes['data']) {
      this.activeRowIndex.set(-1);
    }

    if (changes['stickyColumns'] && this.stickyColumns !== undefined) {
      this.pinnedColumnKeys.set(this.filterToDisplayedColumns([...this.stickyColumns]));
      this.defaultStickyApplied = true;
      return;
    }

    if (changes['columns'] || changes['actions']) {
      this.pinnedColumnKeys.update(keys => this.filterToDisplayedColumns(keys));
      if (this.stickyColumns === undefined) {
        this.tryApplyDefaultStickyColumn();
      }
    }
  }

  get displayedColumns(): string[] {
    return this.allDisplayedColumnKeys();
  }

  isPinned(key: string): boolean {
    return this.pinnedColumnKeys().includes(key);
  }

  /** Columnas de datos: borde izquierdo (`sticky`). La columna `actions` usa `stickyEnd`. */
  isStickyStart(key: string): boolean {
    return key !== 'actions' && this.isPinned(key);
  }

  isStickyEnd(key: string): boolean {
    return key === 'actions' && this.isPinned(key);
  }

  columnPinLabel(key: string): string {
    if (key === 'actions') {
      return this.transloco.translate('dataTable.actions');
    }
    const col = this.columns.find(c => c.key === key);
    if (!col) return key;
    if (col.labelKey) {
      return this.transloco.translate(col.labelKey);
    }
    return col.label;
  }

  onPinnedColumnChange(key: string, checked: boolean): void {
    const set = new Set(this.pinnedColumnKeys());
    if (checked) {
      set.add(key);
    } else {
      set.delete(key);
    }
    const next = this.filterToDisplayedColumns([...set]);
    this.pinnedColumnKeys.set(next);
    this.stickyColumnsChange.emit(next);
  }

  private tryApplyDefaultStickyColumn(): void {
    if (this.defaultStickyApplied) return;
    if (this.actions.length === 0) return;
    this.pinnedColumnKeys.set(['actions']);
    this.defaultStickyApplied = true;
  }

  private allDisplayedColumnKeys(): string[] {
    const cols = this.columns.map(c => c.key);
    if (this.actions.length > 0) cols.push('actions');
    return cols;
  }

  private filterToDisplayedColumns(keys: string[]): string[] {
    const allowed = new Set(this.allDisplayedColumnKeys());
    return keys.filter(k => allowed.has(k));
  }

  onTableSearch(value: string): void {
    this.searchValue = value ?? '';
    this.searchChange.emit(this.searchValue);
  }

  clearSearch(): void {
    this.searchValue = '';
    this.tableSearch?.clear();
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  onSortChange(sort: Sort): void {
    this.sortChange.emit(sort);
  }

  onAction(action: string, row: any): void {
    this.actionClick.emit({ action, row });
  }

  /** Icono Material (ligature) por acción y fila. */
  actionIcon(act: TableAction, row: any): string {
    return act.iconForRow ? act.iconForRow(row) : act.icon;
  }

  /** Texto del tooltip en la acción. */
  actionTooltip(act: TableAction, row: any): string {
    if (act.tooltipForRow) {
      return act.tooltipForRow(row);
    }
    if (
      act.action === 'toggle_active' &&
      act.tooltipKeyWhenActive &&
      act.tooltipKeyWhenInactive
    ) {
      const active = (row as { is_active?: boolean })?.is_active === true;
      return this.transloco.translate(
        active ? act.tooltipKeyWhenActive : act.tooltipKeyWhenInactive,
      );
    }
    if (act.tooltipKey) {
      return this.transloco.translate(act.tooltipKey);
    }
    if (act.labelKey) {
      return this.transloco.translate(act.labelKey);
    }
    return act.label;
  }

  /** Para `toggle_active`: fila marcada activa en API (`is_active`). */
  isRowActive(row: any): boolean {
    return row?.is_active === true;
  }

  /** Texto visible del botón / item de menú para una acción. */
  actionLabel(act: TableAction): string {
    if (act.labelKey) {
      return this.transloco.translate(act.labelKey);
    }
    return act.label;
  }

  /**
   * Acciones que se renderizan inline (texto + icono) en la columna Acciones.
   *
   * - Si alguna acción tiene `primary: true` → esas son primarias.
   * - Si **ninguna** la tiene → la primera del array pasa a ser primaria automáticamente.
   * - Si quieres "todo en kebab", marca todas con `primary: false` explícito.
   *
   * En **mobile** NINGUNA acción va inline: todas (incl. "Editar") caen al kebab
   * ⋮, porque la columna es estrecha y un icono inline + el kebab se ven como
   * "dos iconos". Reactivo a `isMobile()` → re-renderiza al cruzar el breakpoint.
   */
  get primaryActions(): TableAction[] {
    if (this.actions.length === 0) return [];
    if (this.isMobile()) return [];
    const hasExplicit = this.actions.some(a => a.primary === true);
    if (hasExplicit) {
      return this.actions.filter(a => a.primary === true);
    }
    const allOptedOut = this.actions.every(a => a.primary === false);
    if (allOptedOut) return [];
    return [this.actions[0]];
  }

  /** Acciones secundarias (van al kebab `⋮`). Complemento de {@link primaryActions}. */
  get secondaryActions(): TableAction[] {
    const primaryIds = new Set(this.primaryActions.map(a => a.action));
    return this.actions.filter(a => !primaryIds.has(a.action));
  }

  /** Secundarias visibles para esta fila (filtrando por `condition`). */
  visibleSecondaryActions(row: any): TableAction[] {
    return this.secondaryActions.filter(a => !a.condition || a.condition(row));
  }

  /** Nº de filtros de columna activos (lo pasa el padre, ej. crud-page). Junto
   *  con el search box decide el empty-state "sin resultados" vs "sin registros". */
  @Input() activeFilterCount = 0;

  hasActiveFilter(): boolean {
    const hasSearch = !!this.searchValue && this.searchValue.trim().length > 0;
    return hasSearch || this.activeFilterCount > 0;
  }

  /** Mapea el valor de la columna al variant de `app-status-chip`. */
  getChipVariant(value: string): StatusChipVariant {
    if (!value) return 'muted';
    const v = value.toString().toLowerCase();
    if (['active', 'completed', 'admitted', 'success', 'ok', 'done'].includes(v)) return 'success';
    if (['inactive', 'cancelled', 'deceased', 'rejected', 'failed', 'error'].includes(v)) return 'danger';
    if (['pending', 'in_progress', 'in progress', 'warning', 'warn'].includes(v)) return 'warn';
    if (['info', 'draft', 'new'].includes(v)) return 'info';
    return 'neutral';
  }

  getCellTooltip(row: any, col: ColumnConfig): string {
    if (col.type === 'boolean') {
      return row[col.key]
        ? this.transloco.translate('common.yes')
        : this.transloco.translate('common.no');
    }
    if (col.type === 'chip') {
      return col.chipMap?.[row[col.key]] || row[col.key] || this.transloco.translate('common.dash');
    }
    if (col.type === 'date') {
      return row[col.key] ? new Date(row[col.key]).toLocaleString() : '';
    }
    if (col.render) {
      return col.render(row) || '';
    }
    return row[col.key]?.toString() || '';
  }

  isCodeField(key: string): boolean {
    return key === 'code' || key.endsWith('_code') || key.includes('code');
  }

  private reorderColumns(columns: ColumnConfig[]): ColumnConfig[] {
    if (!columns || columns.length === 0) return columns;

    const hasName = columns.some(c => c.key === 'name');
    const hasCode = columns.some(c => c.key === 'code');

    // If both name and code exist, ensure name comes before code
    if (hasName && hasCode) {
      const nameIndex = columns.findIndex(c => c.key === 'name');
      const codeIndex = columns.findIndex(c => c.key === 'code');

      // If code comes before name, reorder
      if (codeIndex < nameIndex) {
        const reordered = [...columns];
        const codeColumn = reordered.splice(codeIndex, 1)[0];
        const newNameIndex = reordered.findIndex(c => c.key === 'name');
        reordered.splice(newNameIndex + 1, 0, codeColumn);
        return reordered;
      }
    }

    return columns;
  }
}
