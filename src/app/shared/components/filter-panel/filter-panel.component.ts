import { Component, Input, Output, EventEmitter, signal, OnInit, inject, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { FilterConfig } from '../../../core/models/api.model';
import { SmartSelectComponent, SelectOption } from '../smart-select/smart-select.component';

interface FilterOption { value: any; label: string; labelKey?: string }

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, TranslocoPipe, SmartSelectComponent],
  template: `
    @if (inline) {
      <!-- Vista INLINE: una fila de app-smart-select (uno por filtro), como una
           barra de filtros encima de la tabla. Reusa el mismo estado/eventos. -->
      <div class="filter-inline">
        @for (filter of filters; track filter.key) {
          <div class="filter-inline__item">
            <span class="filter-inline__label">
              @if (filter.labelKey) { {{ filter.labelKey | transloco }} } @else { {{ filter.label }} }
            </span>
            @if (filter.type === 'text') {
              <input
                type="text"
                class="filter-text-input"
                [placeholder]="'filterPanel.textPlaceholder' | transloco"
                [ngModel]="textInputs[filter.paramName || filter.key] || ''"
                (ngModelChange)="onTextInputChange(filter, $event)"
              />
            } @else {
              <app-smart-select
                class="filter-inline__select"
                [options]="inlineOptions(filter)"
                [showNone]="false"
                [placeholder]="'filterPanel.optionAll' | transloco"
                [ngModel]="activeFilters()[filter.paramName || filter.key] ?? null"
                (ngModelChange)="onInlineSelect(filter, $event)"
              />
            }
          </div>
        }
        @if (hasActiveFilters()) {
          <button class="clear-all clear-all--inline" (click)="clearAll()">
            <mat-icon>close</mat-icon> {{ 'filterPanel.clearAll' | transloco }}
          </button>
        }
      </div>
    } @else {
    <div class="filter-panel"
         [class.collapsed]="!alwaysExpanded && collapsed()"
         [class.filter-panel--embedded]="embedded">
      @if (showHeader) {
        <button class="filter-toggle" (click)="collapsed.set(!collapsed())" [attr.title]="filterToggleTitle()">
          <mat-icon>filter_list</mat-icon>
          @if (!collapsed()) {
            <span>{{ 'filterPanel.title' | transloco }}</span>
            <mat-icon class="toggle-chevron">chevron_right</mat-icon>
          }
        </button>
      }

      @if (alwaysExpanded || !collapsed()) {
        <div class="filter-body">
          @if (hasActiveFilters()) {
            <button class="clear-all" (click)="clearAll()">
              <mat-icon>close</mat-icon> {{ 'filterPanel.clearAll' | transloco }}
            </button>
          }

          @for (filter of filters; track filter.key) {
            <div class="filter-group">
              <div class="filter-group-title">
                <mat-icon class="filter-group-icon">{{ getFilterIcon(filter) }}</mat-icon>
                @if (filter.labelKey) { {{ filter.labelKey | transloco }} } @else { {{ filter.label }} }
              </div>
              <div class="filter-options">
                @if (filter.type === 'text') {
                  <input
                    type="text"
                    class="filter-text-input"
                    [placeholder]="'filterPanel.textPlaceholder' | transloco"
                    [ngModel]="textInputs[filter.paramName || filter.key] || ''"
                    (ngModelChange)="onTextInputChange(filter, $event)"
                  />
                } @else {
                  <button type="button" class="filter-option"
                     [class.active]="!activeFilters()[filter.paramName || filter.key]"
                     (click)="clearFilter(filter)">
                    {{ 'filterPanel.optionAll' | transloco }}
                  </button>
                  @for (opt of filter.options || booleanOptions(); track opt.value) {
                    <button type="button" class="filter-option"
                       [class.active]="activeFilters()[filter.paramName || filter.key] === opt.value"
                       (click)="setFilter(filter, opt.value)">
                      @if (opt.labelKey) { {{ opt.labelKey | transloco }} } @else { {{ opt.label }} }
                    </button>
                  }
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
    }
  `,
  styles: [`
    @use 'variables' as v;

    /* ── Layout inline: barra de filtros (fila de selects) encima de la tabla ── */
    .filter-inline {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 14px;
    }
    .filter-inline__item {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;            // no estirar: cada filtro ocupa su ancho
    }
    .filter-inline__label {
      font-size: var(--fvx-text-2xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--fvx-text-secondary);
      white-space: nowrap;
    }
    // Ancho fijo del select: el smart-select trae :host{width:100%}, que sin esto
    // estira cada filtro a todo el ancho y los apila en vertical. Especificidad
    // (0,2,1) para ganarle al :host (0,1,0).
    .filter-inline app-smart-select.filter-inline__select {
      width: 150px;
      min-width: 150px;
    }
    .clear-all--inline { margin-left: auto; }
    /* Compactar el mat-form-field del smart-select dentro de la barra. */
    .filter-inline ::ng-deep .smart-select-field .mat-mdc-form-field-infix {
      min-height: 34px;
      padding-top: 6px;
      padding-bottom: 6px;
    }
    .filter-inline ::ng-deep .smart-select-field .mat-mdc-text-field-wrapper {
      background: var(--fvx-bg-card);
    }

    .filter-panel {
      width: 220px;
      min-width: 220px;
      background: var(--fvx-bg-card);
      border: 1px solid var(--fvx-panel-border, var(--fvx-card-border, var(--fvx-border)));
      border-radius: v.$radius-xl;
      overflow: hidden;
      transition: width 0.2s ease, min-width 0.2s ease;
      align-self: flex-start;

      &.collapsed {
        width: 40px;
        min-width: 40px;
        border-radius: 9999px;
        border-color: transparent;
        background: color-mix(in srgb, var(--fvx-text-primary) 6%, transparent);
      }

      // Variante embebida (mat-menu / dropdown): el contenedor padre provee
      // bg/borde/sombra; el panel solo aporta layout interno.
      &.filter-panel--embedded {
        width: 260px;
        min-width: 260px;
        background: transparent;
        border: none;
        border-radius: 0;
      }
    }

    .filter-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 12px 14px;
      background: none;
      border: none;
      border-bottom: 1px solid var(--fvx-border);
      cursor: pointer;
      font-size: v.$font-size-base;
      font-weight: v.$font-weight-semibold;
      color: var(--fvx-text-primary);
      font-family: v.$font-family;

      .mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--fvx-text-secondary);
      }

      .toggle-chevron {
        margin-left: auto;
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--fvx-text-muted);
      }

      &:hover {
        background: color-mix(in srgb, var(--fvx-text-primary) 6%, transparent);
      }

      .collapsed & {
        justify-content: center;
        padding: 10px 0;
        border-bottom: none;

        .mat-icon {
          color: var(--fvx-text-muted);
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .filter-body {
      padding: 8px 0;
      max-height: calc(100vh - 280px);
      overflow-y: auto;

      &::-webkit-scrollbar { width: 3px; }
      &::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--fvx-text-muted) 45%, transparent);
        border-radius: 2px;
      }
    }

    .clear-all {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 0 12px 8px;
      padding: 4px 10px;
      background: none;
      border: 1px solid var(--fvx-border);
      border-radius: 9999px;
      cursor: pointer;
      font-size: v.$font-size-xs;
      font-weight: v.$font-weight-medium;
      color: var(--fvx-text-secondary);
      font-family: v.$font-family;

      .mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
      }

      &:hover {
        background: color-mix(in srgb, var(--fvx-text-primary) 6%, transparent);
        color: v.$color-warn;
        border-color: v.$color-warn;
      }
    }

    .filter-group {
      padding: 6px 14px;
    }

    .filter-group-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: v.$font-size-xs;
      font-weight: v.$font-weight-semibold;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--fvx-text-muted);
      margin-bottom: 4px;
    }

    .filter-group-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      color: var(--fvx-text-muted);
    }

    .filter-options {
      display: flex;
      flex-direction: column;
    }

    .filter-text-input {
      width: 100%;
      padding: 5px 8px;
      border: 1px solid var(--fvx-border);
      border-radius: 4px;
      background: var(--fvx-bg-input, var(--fvx-bg-card));
      color: var(--fvx-text-primary);
      font-size: v.$font-size-base;
      font-family: v.$font-family;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &::placeholder {
        color: var(--fvx-text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--fvx-link);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--fvx-link) 18%, transparent);
      }
    }

    .filter-option {
      display: block;
      width: 100%;
      text-align: left;
      appearance: none;
      background: none;
      border: none;
      font-family: inherit;
      padding: 3px 8px;
      font-size: v.$font-size-base;
      color: var(--fvx-text-secondary);
      cursor: pointer;
      border-radius: 4px;
      text-decoration: none;
      transition: background 0.1s, color 0.1s;

      &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--fvx-accent-soft, color-mix(in srgb, var(--fvx-link) 30%, transparent));
      }

      &:hover {
        background: color-mix(in srgb, var(--fvx-text-primary) 6%, transparent);
        color: var(--fvx-text-primary);
      }

      &.active {
        color: var(--fvx-filter-option-active-fg, var(--fvx-link));
        font-weight: v.$font-weight-semibold;
        background: var(
          --fvx-filter-option-active-bg,
          color-mix(in srgb, var(--fvx-link) 14%, transparent)
        );
      }
    }

    @media (max-width: 768px) {
      .filter-panel {
        width: 100%;
        min-width: 100%;
        border-radius: v.$radius-lg;

        &.collapsed {
          width: auto;
          min-width: auto;
          border-radius: 9999px;
          align-self: flex-end;
        }
      }

      .filter-body {
        max-height: 50vh;
        overflow-y: auto;
      }

      .filter-toggle .toggle-chevron {
        transform: rotate(90deg);
      }

      .collapsed .filter-toggle .toggle-chevron {
        transform: rotate(-90deg);
      }

      .filter-option {
        padding: 6px 8px;
        font-size: v.$font-size-md;
      }

      .filter-group {
        padding: 8px 14px;
      }
    }
  `]
})
export class FilterPanelComponent implements OnInit, OnDestroy {
  private readonly transloco = inject(TranslocoService);

  @Input() filters: FilterConfig[] = [];
  /**
   * Oculta el header con el toggle de colapsar (útil cuando el panel vive
   * embebido en un `mat-menu` o dropdown — el contenedor padre ya provee la
   * chrome de apertura/cierre).
   */
  @Input() showHeader = true;
  /**
   * Si `true`, ignora el estado `collapsed` interno y siempre muestra el
   * cuerpo. Combinado con `showHeader=false` queda como "lista pura de filtros".
   */
  @Input() alwaysExpanded = false;
  /**
   * Si `true`, ajusta los estilos para encajar dentro de un contenedor con
   * chrome propio (ej. mat-menu). Quita el borde redondeado externo y el bg
   * (los hereda del menú padre) y reduce el padding interno.
   */
  @Input() embedded = false;
  /**
   * Layout INLINE: renderiza los filtros como una fila de `app-smart-select`
   * (uno por filtro) en vez del panel/lista. Pensado para una barra de filtros
   * encima de la tabla (ver `crud-page` con `filterMode='inline'`).
   */
  @Input() inline = false;

  @Output() filterChange = new EventEmitter<Record<string, any>>();

  collapsed = signal(false);

  /**
   * Estado local de los inputs `type: 'text'` antes del debounce. Permite
   * mostrar lo que el usuario está tecleando aunque `activeFilters()` aún
   * no se haya actualizado.
   */
  textInputs: Record<string, string> = {};
  private readonly textDebounce$ = new Subject<{ filter: FilterConfig; value: string }>();
  private textSub?: Subscription;

  filterToggleTitle(): string {
    return this.transloco.translate(
      this.collapsed() ? 'filterPanel.showFilters' : 'filterPanel.hideFilters',
    );
  }

  booleanOptions(): FilterOption[] {
    return [
      { value: 'true', label: 'Yes', labelKey: 'common.yes' },
      { value: 'false', label: 'No', labelKey: 'common.no' },
    ];
  }

  ngOnInit(): void {
    if (window.innerWidth < 769) {
      this.collapsed.set(true);
    }
    // Misma cadencia que `app-search-input` para consistencia con el resto del shell.
    this.textSub = this.textDebounce$
      .pipe(debounceTime(400))
      .subscribe(({ filter, value }) => {
        const trimmed = value.trim();
        if (trimmed) {
          this.setFilter(filter, trimmed);
        } else {
          this.clearFilter(filter);
        }
      });
  }

  ngOnDestroy(): void {
    this.textSub?.unsubscribe();
  }

  activeFilters = signal<Record<string, any>>({});

  setFilter(filter: FilterConfig, value: any): void {
    const key = filter.paramName || filter.key;
    const current = { ...this.activeFilters() };
    current[key] = value;
    this.activeFilters.set(current);
    this.filterChange.emit(current);
  }

  clearFilter(filter: FilterConfig): void {
    const key = filter.paramName || filter.key;
    const current = { ...this.activeFilters() };
    delete current[key];
    this.activeFilters.set(current);
    this.textInputs[key] = '';
    this.filterChange.emit(current);
  }

  clearAll(): void {
    this.activeFilters.set({});
    this.textInputs = {};
    this.filterChange.emit({});
  }

  onTextInputChange(filter: FilterConfig, value: string): void {
    this.textInputs[filter.paramName || filter.key] = value;
    this.textDebounce$.next({ filter, value });
  }

  hasActiveFilters(): boolean {
    return Object.keys(this.activeFilters()).length > 0;
  }

  getFilterIcon(filter: FilterConfig): string {
    switch (filter.type) {
      case 'boolean': return 'toggle_on';
      case 'select': return 'tune';
      default: return 'label';
    }
  }

  // ── Vista inline (app-smart-select) ────────────────────────────────────────
  /** Opciones para el smart-select: "Todos" (value null) + las del filtro,
   *  traducidas (smart-select muestra `label` tal cual, sin transloco). */
  inlineOptions(filter: FilterConfig): SelectOption[] {
    const all: SelectOption = {
      value: null,
      label: this.transloco.translate('filterPanel.optionAll'),
    };
    const opts = (filter.options || this.booleanOptions()).map((o) => ({
      value: o.value,
      label: o.labelKey ? this.transloco.translate(o.labelKey) : o.label,
    }));
    return [all, ...opts];
  }

  /** Cambio en un smart-select inline: null → limpiar; valor → fijar. */
  onInlineSelect(filter: FilterConfig, value: any): void {
    if (value === null || value === undefined || value === '') {
      this.clearFilter(filter);
    } else {
      this.setFilter(filter, value);
    }
  }
}
