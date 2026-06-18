import { signal, inject, Directive, computed } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ExcelExportService, type ExportColumn } from '../../core/services/excel-export.service';
import { EntityDrawerService } from '../../core/services/entity-drawer.service';
import { ColumnConfig, FieldConfig, TableAction, FilterConfig, QueryParams, RelationshipConfig } from '../../core/models/api.model';
import { EntityFormDialogComponent, EntityFormDialogData } from '../components/entity-form-dialog/entity-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';
import { RelationshipDialogComponent, RelationshipDialogData } from '../components/relationship-dialog/relationship-dialog.component';
// Lógica extraída a helpers para adelgazar este orquestador (misma API pública).
import {
  canDoEditorActions,
  filterActionsByRole,
  isActionKeyPermitted,
} from './crud-permissions';
import { readUrlState, buildUrlQueryParams, type CrudUrlState } from './crud-url-state';
import { crudDialogSizing, entityDisplayName } from './crud-dialogs';

@Directive()
export abstract class BaseCrudComponent<T extends { id: number }> {
  protected api = inject(ApiService);
  protected auth = inject(AuthService);
  protected notify = inject(NotificationService);
  protected dialog = inject(MatDialog);
  protected excelExport = inject(ExcelExportService);
  protected drawerService = inject(EntityDrawerService);
  protected transloco = inject(TranslocoService);
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);

  /**
   * Si es `true`, paginación / búsqueda / orden / filtros activos se sincronizan
   * con los query params del URL (bookmarkable, sobrevive recarga, comparte por link).
   * Las subclases pueden ponerlo en `false` si no quieren la sincronización.
   */
  protected syncStateWithUrl = true;
  private hydratedFromUrl = false;

  /**
   * Fila: ``is_staff`` → todo; `ADMIN` → incl. borrar; `EDITOR` → edición/activar, sin borrar; `VIEWER` → sin botones.
   * Depende de ``this.actions``; se recalcula con el usuario actual.
   */
  readonly tableActions = computed(() => {
    this.auth.user();
    return filterActionsByRole(this.auth, this.actions);
  });

  /** Crear / exportar: mismo umbral (EDITOR+; staff: sí). */
  readonly canCreate = computed(() => {
    this.auth.user();
    return canDoEditorActions(this.auth);
  });
  readonly canExport = this.canCreate;

  abstract endpoint: string;
  abstract entityName: string;
  /**
   * Clave i18n del nombre singular (p. ej. `users.entitySingular`).
   * Si se define, mensajes y títulos usan traducción en lugar de `entityName`.
   */
  protected entityNameKey?: string;
  abstract columns: ColumnConfig[];
  abstract formFields: FieldConfig[];
  exportColumns: ExportColumn[] = [];
  
  /** Si está definido, el clic en fila abre el drawer (p. ej. `'user'`). */
  drawerEntityType?: 'user';
  actions: TableAction[] = [
    { icon: 'edit', label: '', labelKey: 'crud.actions.edit', action: 'edit', color: 'primary' },
    { icon: 'delete', label: '', labelKey: 'crud.actions.delete', action: 'delete', color: 'warn' },
  ];
  filterConfigs: FilterConfig[] = [];
  relationshipConfigs: RelationshipConfig[] = [];
  activeFilters = signal<Record<string, any>>({});

  data = signal<T[]>([]);
  totalCount = signal(0);
  loading = signal(false);
  pageSize = signal(20);
  pageIndex = signal(0);
  search = signal('');
  ordering = signal('');

  loadData(): void {
    // Primer call: hidrata desde URL para que paginación/búsqueda/filtros
    // arranquen alineados con el query string actual (bookmarkable, recarga).
    if (this.syncStateWithUrl && !this.hydratedFromUrl) {
      this.hydratedFromUrl = true;
      this.hydrateStateFromUrl(this.route.snapshot.queryParams);
    }
    this.loading.set(true);
    const params: QueryParams = {
      page: this.pageIndex() + 1,
      page_size: this.pageSize(),
    };
    if (this.search()) params['search'] = this.search();
    if (this.ordering()) params['ordering'] = this.ordering();

    // Merge active filters into query params
    const filters = this.activeFilters();
    for (const key of Object.keys(filters)) {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params[key] = filters[key];
      }
    }

    this.api.list<T>(this.endpoint, params).subscribe({
      next: res => {
        this.data.set(res.results);
        this.totalCount.set(res.count);
        this.loading.set(false);
      },
      error: err => {
        this.notify.handleError(err);
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.syncStateToUrl();
    this.loadData();
  }

  onSortChange(sort: Sort): void {
    if (sort.direction) {
      this.ordering.set(sort.direction === 'desc' ? `-${sort.active}` : sort.active);
    } else {
      this.ordering.set('');
    }
    this.pageIndex.set(0);
    this.syncStateToUrl();
    this.loadData();
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
    this.syncStateToUrl();
    this.loadData();
  }

  onFilterChange(filters: Record<string, any>): void {
    this.activeFilters.set(filters);
    this.pageIndex.set(0);
    this.syncStateToUrl();
    this.loadData();
  }

  /**
   * Lee `page`, `page_size`, `search`, `ordering` y filtros del URL y los
   * inyecta en los signals (el parseo vive en `readUrlState`). El resto de
   * claves del URL (`?other=...`) se dejan sin tocar.
   */
  protected hydrateStateFromUrl(params: Params): void {
    const s = readUrlState(params, this.filterConfigs);
    if (s.pageIndex !== undefined) this.pageIndex.set(s.pageIndex);
    if (s.pageSize !== undefined) this.pageSize.set(s.pageSize);
    if (s.search !== undefined) this.search.set(s.search);
    if (s.ordering !== undefined) this.ordering.set(s.ordering);
    if (s.filters !== undefined) this.activeFilters.set(s.filters);
  }

  /**
   * Escribe el estado actual de paginación / búsqueda / orden / filtros al URL
   * (el armado del objeto qp vive en `buildUrlQueryParams`). `replaceUrl: true`
   * para no inflar el historial del navegador.
   */
  protected syncStateToUrl(): void {
    if (!this.syncStateWithUrl) return;
    const state: CrudUrlState = {
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      search: this.search(),
      ordering: this.ordering(),
      filters: this.activeFilters(),
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: buildUrlQueryParams(state, this.filterConfigs),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Nombre de entidad traducido (mensajes, títulos de diálogo). */
  protected tEntity(): string {
    return this.entityNameKey
      ? this.transloco.translate(this.entityNameKey)
      : this.entityName;
  }

  /**
   * Filtra la botonera según `TableAction` y rol. Wrapper protegido (las
   * subclases pueden sobreescribirlo si un recurso tiene acciones con criterio
   * distinto); la lógica vive en `crud-permissions.filterActionsByRole`.
   */
  protected filterActionsByRole(all: TableAction[]): TableAction[] {
    return filterActionsByRole(this.auth, all);
  }

  /**
   * Campos del formulario (p. ej. ocultar contraseña en edición);
   * las subclases pueden restringir columnas.
   */
  protected getFormDialogFields(_entity?: T): FieldConfig[] {
    return this.formFields;
  }

  /**
   * Columnas export; por defecto `exportColumns` estático.
   * Sobreescribir para etiquetas según idioma.
   */
  getExportColumns(): ExportColumn[] {
    return this.exportColumns;
  }

  onAction(event: { action: string; row: T }): void {
    if (!isActionKeyPermitted(this.auth, this.actions, event.action)) {
      this.notify.error(this.transloco.translate('crud.error.forbiddenAction'));
      return;
    }
    switch (event.action) {
      case 'edit':
        this.openFormDialog(event.row);
        break;
      case 'delete':
        this.confirmDelete(event.row);
        break;
      case 'toggle_active':
        this.toggleActive(event.row);
        break;
      case 'relationships':
        this.openRelationshipDialog(event.row);
        break;
    }
  }

  openFormDialog(entity?: T): void {
    if (entity) {
      if (!canDoEditorActions(this.auth)) {
        this.notify.error(this.transloco.translate('crud.error.forbiddenAction'));
        return;
      }
    } else if (!this.canCreate()) {
      this.notify.error(this.transloco.translate('crud.error.forbiddenAction'));
      return;
    }
    const mode = entity ? 'edit' : 'create';
    const ent = this.tEntity();
    const title = this.transloco.translate(
      mode === 'create' ? 'crud.dialog.createTitle' : 'crud.dialog.editTitle',
      { entity: ent },
    );
    const dialogData: EntityFormDialogData = {
      title,
      fields: this.getFormDialogFields(entity),
      entity,
      mode,
      // La API se llama con el dialog ABIERTO: si falla (p. ej. validación de
      // contraseña) el dialog muestra el error inline y NO se cierra ni pierde lo
      // escrito. Cierra solo en éxito (con la entidad guardada).
      submitHandler: (value: Record<string, any>) =>
        entity
          ? this.api.update<T>(this.endpoint, entity.id, value as Partial<T>)
          : this.api.create<T>(this.endpoint, value as Partial<T>),
    };

    const dialogRef = this.dialog.open(EntityFormDialogComponent, {
      data: dialogData,
      ...crudDialogSizing('650px'),
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      // El dialog cierra con `result` SOLO en éxito (el `submitHandler` ya llamó a
      // la API y los errores se muestran dentro del dialog). Cancelar → undefined.
      if (!result) return;
      this.notify.success(
        this.transloco.translate(entity ? 'crud.notify.updated' : 'crud.notify.created', {
          entity: ent,
        }),
      );
      this.loadData();
    });
  }

  confirmDelete(entity: T): void {
    if (!isActionKeyPermitted(this.auth, this.actions, 'delete')) {
      this.notify.error(this.transloco.translate('crud.error.forbiddenAction'));
      return;
    }
    const ent = this.tEntity();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('crud.confirm.title'),
        message: this.transloco.translate('crud.confirm.message', { entity: ent }),
        confirmText: this.transloco.translate('crud.confirm.deleteAction'),
        color: 'warn',
      } as ConfirmDialogData,
      panelClass: 'fvx-crud-dialog',
      width: '440px',
      maxWidth: '92vw',
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.api.delete(this.endpoint, entity.id).subscribe({
        next: () => {
          this.notify.success(
            this.transloco.translate('crud.notify.deleted', { entity: this.tEntity() }),
          );
          this.loadData();
        },
        error: err => this.notify.handleError(err),
      });
    });
  }

  toggleActive(entity: T): void {
    if (!isActionKeyPermitted(this.auth, this.actions, 'toggle_active')) {
      this.notify.error(this.transloco.translate('crud.error.forbiddenAction'));
      return;
    }
    const record = entity as any;
    const newActive = !record.is_active;

    this.api.patch<T>(this.endpoint, entity.id, { is_active: newActive } as any).subscribe({
      next: () => {
        const k = newActive ? 'crud.notify.activated' : 'crud.notify.deactivated';
        this.notify.success(
          this.transloco.translate(k, { entity: this.tEntity() }),
        );
        this.loadData();
      },
      error: err => this.notify.handleError(err),
    });
  }

  onRefresh(): void {
    this.loadData();
  }

  onExport(): void {
    if (!this.canCreate()) {
      this.notify.error(this.transloco.translate('crud.error.forbiddenAction'));
      return;
    }
    const cols = this.getExportColumns();
    if (cols.length === 0) {
      this.notify.error(this.transloco.translate('crud.export.noColumns'));
      return;
    }

    const rows = this.excelExport.normalizeRows(this.data());
    if (rows.length === 0) {
      this.notify.error(this.transloco.translate('crud.export.noData'));
      return;
    }

    // exportToExcel es async (carga xlsx bajo demanda); el toast de éxito va
    // tras escribir el archivo, y un fallo de carga/escritura se notifica.
    this.excelExport
      .exportToExcel(rows, cols, this.endpoint)
      .then(() => this.notify.success(this.transloco.translate('crud.export.success')))
      .catch(() => this.notify.error(this.transloco.translate('crud.export.noData')));
  }

  openRelationshipDialog(entity: T): void {
    if (this.relationshipConfigs.length === 0) return;
    if (!canDoEditorActions(this.auth)) {
      this.notify.error(this.transloco.translate('crud.error.forbiddenAction'));
      return;
    }

    // If only one relationship config, open it directly
    // If multiple, could show a chooser — for now open the first one
    const config = this.relationshipConfigs[0];
    const entityName = this.getEntityDisplayName(entity);

    this.dialog.open(RelationshipDialogComponent, {
      data: {
        config,
        entityId: entity.id,
        entityName,
      } as RelationshipDialogData,
      ...crudDialogSizing('550px', '85vh'),
    });
  }

  /** Nombre visible de la entidad (delega en `crud-dialogs.entityDisplayName`).
   *  Wrapper protegido por si una subclase quiere otra lógica. */
  protected getEntityDisplayName(entity: T): string {
    return entityDisplayName(entity);
  }

  /**
   * Título del cajón de detalle al hacer clic en una fila. Puede redefinirse
   * (p. ej. sin id numérico en el listado de usuarios).
   */
  protected getDrawerTitle(row: T): string {
    return this.transloco.translate('crud.drawerTitle', {
      entity: this.tEntity(),
      id: String((row as { id: number | string }).id),
    });
  }

  onRowClick(row: T): void {
    // Only open drawer if drawerEntityType is defined
    if (this.drawerEntityType) {
      this.drawerService.open({
        entityType: this.drawerEntityType,
        entityId: row.id,
        title: this.getDrawerTitle(row),
      });
    }
  }
}
