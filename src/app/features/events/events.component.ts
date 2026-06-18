import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, TableAction } from '../../core/models/api.model';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';

interface AdminEvent {
  id: number;
  name: string;
  date: string | null;
  price: number | null;
  is_public: boolean;
  is_active: boolean;
}

/**
 * Gestión de eventos especiales (compra única). El pago lo procesa Flow
 * (one-time). Distinto de los planes (suscripción recurrente).
 */
@Component({
  selector: 'app-admin-events',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent],
  template: `
    <app-crud-page
      title="Eventos especiales"
      subtitle="Talleres y encuentros de compra única (pago directo vía Flow)."
      [breadcrumbs]="crudBreadcrumbs"
      [columns]="columns"
      [actions]="tableActions()"
      [createPermission]="'plans.create'"
      [exportPermission]="'plans.read'"
      [data]="data()"
      [totalCount]="totalCount()"
      [pageSize]="pageSize()"
      [pageIndex]="pageIndex()"
      [loading]="loading()"
      (createClick)="openFormDialog()"
      (pageChange)="onPageChange($event)"
      (sortChange)="onSortChange($event)"
      (searchChange)="onSearchChange($event)"
      (actionClick)="onAction($event)">
    </app-crud-page>
  `,
})
export class AdminEventsComponent extends BaseCrudComponent<AdminEvent> implements OnInit {
  readonly crudBreadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Eventos' },
  ];

  endpoint = 'events';
  entityName = 'Evento';

  columns: ColumnConfig[] = [
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'date', label: 'Fecha', render: r => (r.date ? new Date(r.date).toLocaleString('es-CL') : '—') },
    { key: 'price', label: 'Precio', render: r => (r.price ? `$${Number(r.price).toLocaleString('es-CL')}` : '—') },
    { key: 'is_public', label: 'Público', type: 'boolean' },
    { key: 'is_active', label: 'Activo', type: 'boolean' },
  ];

  formFields: FieldConfig[] = [
    { key: 'name', label: 'Nombre', type: 'text', required: true, colspan: 2,
      info: 'Nombre del evento (ej. "Taller Básico de Alkymia Solar").' },
    { key: 'subtitle', label: 'Subtítulo', type: 'text', colspan: 2 },
    { key: 'price', label: 'Precio (CLP)', type: 'number',
      info: 'Precio de la compra única en pesos. Vacío = "Valor por confirmar" (no comprable aún).' },
    { key: 'date', label: 'Fecha', type: 'date', info: 'Fecha del evento. Vacío = "Próximamente".' },
    { key: 'description', label: 'Descripción', type: 'textarea', colspan: 2 },
    { key: 'icon', label: 'Ícono', type: 'text', hint: 'Material icon (p. ej. wb_sunny)',
      info: 'Ícono de Material para la tarjeta si no hay imagen.' },
    { key: 'image_url', label: 'Imagen', type: 'image', colspan: 2,
      info: 'Imagen de portada del evento (se sube desde tu PC). Opcional.' },
    { key: 'is_public', label: 'Público', type: 'boolean', defaultValue: true,
      info: 'Si está activo, el evento se muestra en la página pública de eventos.' },
    { key: 'order', label: 'Orden', type: 'number', defaultValue: 0 },
  ];

  override actions: TableAction[] = [
    { icon: 'edit', label: '', labelKey: 'crud.actions.edit', action: 'edit', color: 'primary' },
    { icon: 'delete', label: '', labelKey: 'crud.actions.delete', action: 'delete', color: 'warn' },
  ];

  ngOnInit(): void {
    this.loadData();
  }
}
