import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, TableAction } from '../../core/models/api.model';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';

interface ContentItem {
  id: number;
  title: string;
  kind: string;
  is_published: boolean;
}

const KIND_LABELS: Record<string, string> = {
  video: 'Video', audio: 'Audio', pdf: 'PDF', text: 'Texto', image: 'Imagen', zoom: 'Zoom', link: 'Enlace',
};

/**
 * Biblioteca de contenido (piezas independientes). Se asignan a planes mediante
 * la sección "Programación". El miembro las ve en su biblioteca.
 */
@Component({
  selector: 'app-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent],
  template: `
    <app-crud-page
      title="Contenido (biblioteca)"
      subtitle="Piezas de contenido. Para que un miembro las vea, asígnalas a un plan en 'Programación'."
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
export class ContentComponent extends BaseCrudComponent<ContentItem> implements OnInit {
  readonly crudBreadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Contenido' },
  ];

  endpoint = 'content-items';
  entityName = 'Contenido';

  columns: ColumnConfig[] = [
    { key: 'title', label: 'Título', sortable: true },
    { key: 'kind', label: 'Tipo', render: r => KIND_LABELS[r.kind] ?? r.kind },
    { key: 'is_published', label: 'Publicado', type: 'boolean' },
    { key: 'order', label: 'Orden', sortable: true },
  ];

  formFields: FieldConfig[] = [
    { key: 'title', label: 'Título', type: 'text', required: true, colspan: 2 },
    { key: 'kind', label: 'Tipo', type: 'select', defaultValue: 'video',
      info: 'Tipo de contenido: video, audio, PDF, texto, imagen, sesión Zoom o enlace.',
      options: [
        { value: 'video', label: 'Video' },
        { value: 'audio', label: 'Audio' },
        { value: 'pdf', label: 'PDF / documento' },
        { value: 'text', label: 'Texto' },
        { value: 'image', label: 'Imagen' },
        { value: 'zoom', label: 'Sesión Zoom (en vivo)' },
        { value: 'link', label: 'Enlace' },
      ],
    },
    { key: 'order', label: 'Orden', type: 'number', defaultValue: 0, info: 'Orden en la biblioteca (menor primero).' },
    { key: 'text', label: 'Texto / descripción', type: 'textarea', colspan: 2,
      info: 'Para contenido de tipo Texto, o una descripción que acompaña al archivo/enlace.' },
    { key: 'file_url', label: 'Archivo', type: 'file', colspan: 2,
      accept: 'video/*,audio/*,application/pdf,image/*',
      info: 'Sube el video, audio, PDF o imagen desde tu computador (hasta 500 MB).' },
    { key: 'external_url', label: 'Enlace externo', type: 'text', colspan: 2,
      info: 'Para links de YouTube/Vimeo (en vez de subir archivo). Para Zoom embebido, usa los campos de abajo.' },
    { key: 'image_url', label: 'Portada', type: 'image', colspan: 2,
      info: 'Imagen de portada para la tarjeta en la biblioteca (opcional).' },
    // ── Sesión en vivo (Zoom) — solo aplica si el tipo es "Sesión Zoom" ──
    { key: 'zoom_meeting_number', label: 'Zoom · N° de reunión', type: 'text', colspan: 1,
      info: 'Solo tipo "Sesión Zoom": el ID numérico de la reunión (Meeting ID). El miembro se une embebido, sin ver el link.' },
    { key: 'zoom_passcode', label: 'Zoom · Clave', type: 'text', colspan: 1,
      info: 'Clave de la reunión Zoom. Se guarda en el servidor; el miembro nunca ve el link.' },
    { key: 'live_start', label: 'Inicio en vivo', type: 'datetime', colspan: 1,
      info: 'Fecha y hora de inicio. El acceso se abre unos minutos antes.' },
    { key: 'live_end', label: 'Fin en vivo', type: 'datetime', colspan: 1,
      info: 'Fin de la sesión (opcional). Vacío = duración por defecto desde el inicio.' },
    { key: 'is_published', label: 'Publicado', type: 'boolean', defaultValue: true,
      info: 'Si está activo y está programado en un plan vigente, el miembro lo ve.' },
  ];

  override actions: TableAction[] = [
    { icon: 'edit', label: '', labelKey: 'crud.actions.edit', action: 'edit', color: 'primary' },
    { icon: 'delete', label: '', labelKey: 'crud.actions.delete', action: 'delete', color: 'warn' },
  ];

  ngOnInit(): void {
    this.loadData();
  }
}
