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
 * Gestión de eventos especiales (/eventos). «Quiero ir» deja un mensaje en la
 * bandeja y el pago se coordina por transferencia. Distinto de los planes
 * (suscripción recurrente).
 */
@Component({
  selector: 'app-admin-events',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent],
  template: `
    <app-crud-page
      title="Eventos especiales"
      subtitle="Talleres y encuentros: «Quiero ir» llega a Mensajes y el pago es por transferencia."
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
    { key: 'date', label: 'Inicio', render: r => (r.date ? new Date(r.date).toLocaleString('es-CL') : '—') },
    { key: 'price', label: 'Precio', render: r => (r.price ? `$${Number(r.price).toLocaleString('es-CL')}` : '—') },
    { key: 'is_public', label: 'Público', type: 'boolean' },
    { key: 'is_active', label: 'Activo', type: 'boolean' },
  ];

  formFields: FieldConfig[] = [
    { key: 'name', label: 'Nombre', type: 'text', required: true, colspan: 2,
      info: 'Nombre del evento (ej. "Taller Básico de Alkymia Solar").' },
    { key: 'subtitle', label: 'Subtítulo', type: 'text', colspan: 2 },
    { key: 'location', label: 'Lugar', type: 'text', colspan: 2,
      info: 'Dónde ocurre el evento (ej. "Punta Griega"). Se muestra destacado junto a la fecha.' },
    { key: 'price', label: 'Precio (CLP)', type: 'number',
      info: 'Precio de la compra única en pesos. Vacío = "Valor por confirmar" (no comprable aún).' },
    { key: 'date', label: 'Inicio', type: 'datetime',
      info: 'Fecha y hora de inicio. Vacío = "Fecha por anunciar".' },
    { key: 'end_date', label: 'Término', type: 'datetime',
      info: 'Hora de término (p. ej. 18:00). Arma el horario «De 9:30 a 18:00» y, cuando pasa, el evento se muestra como Finalizado y deja de aceptar reservas.' },
    { key: 'summary', label: 'Resumen', type: 'text', colspan: 2,
      info: 'Una o dos líneas para la tarjeta de /eventos (máx. 200 caracteres).' },
    { key: 'audience', label: 'Para quién', type: 'textarea', colspan: 2,
      info: 'Se muestra destacado al inicio de «Sobre el encuentro».' },
    { key: 'description', label: 'Descripción', type: 'textarea', colspan: 2,
      info: 'Texto de «Sobre el encuentro». Una línea en blanco separa los párrafos.' },
    { key: 'price_note', label: 'Nota del precio', type: 'text', colspan: 2,
      placeholder: 'por persona, sin alojamiento' },
    { key: 'lodging_price', label: 'Alojamiento (CLP)', type: 'number',
      info: 'Precio del alojamiento opcional. Vacío = sin alojamiento (no aparece la casilla).' },
    { key: 'lodging_note', label: 'Qué incluye el alojamiento', type: 'text',
      placeholder: 'por persona en habitación doble…' },
    { key: 'program', label: 'Programa', type: 'rows', colspan: 2, addLabel: 'Agregar actividad',
      info: 'Una fila por actividad. «Destacado» la pinta en oro (p. ej. las clases).',
      rowColumns: [
        { key: 'start', label: 'Inicio', flex: 1 },
        { key: 'end', label: 'Fin', flex: 1 },
        { key: 'title', label: 'Actividad', flex: 3 },
        { key: 'detail', label: 'Detalle (opcional)', flex: 3 },
        { key: 'highlight', label: 'Destacado', type: 'boolean' },
      ] },
    { key: 'includes', label: 'Incluye', type: 'rows', colspan: 2, addLabel: 'Agregar ítem',
      placeholder: 'p. ej. Café de bienvenida' },
    { key: 'conditions', label: 'Condiciones', type: 'rows', colspan: 2, addLabel: 'Agregar condición',
      placeholder: 'p. ej. La reserva no tiene devolución.',
      info: 'Se muestran bajo el formulario de reserva.' },
    { key: 'icon', label: 'Ícono', type: 'text', hint: 'Material icon (p. ej. wb_sunny)',
      info: 'Ícono de Material para la tarjeta si no hay imagen.' },
    { key: 'image_url', label: 'Imagen', type: 'image', colspan: 2,
      info: 'Imagen de portada del evento (se sube desde tu PC). Opcional.' },
    { key: 'image_alt', label: 'Texto alternativo de la imagen', type: 'text', colspan: 2,
      info: 'Describe la imagen para quien no la ve (lectores de pantalla). Vacío = el nombre del evento.' },
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
