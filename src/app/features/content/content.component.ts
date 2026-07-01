import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, FilterConfig, TableAction } from '../../core/models/api.model';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';
import { crudDialogSizing } from '../../shared/base/crud-dialogs';
import { EntityFormDialogComponent, EntityFormDialogData } from '../../shared/components/entity-form-dialog/entity-form-dialog.component';
import { environment } from '../../../environments/environment';

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
 *
 * Al CREAR, el diálogo incluye además un bloque "Programar" (membresías + fechas)
 * para asignar el contenido a los planes en el mismo popup, sin pasar por
 * "Programación" aparte. Al EDITAR se usa el flujo estándar (solo el contenido).
 */
@Component({
  selector: 'app-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent],
  template: `
    <app-crud-page
      title="Contenido (biblioteca)"
      subtitle="Piezas de contenido. Al crear puedes asignarlas a las membresías en el mismo popup (o hacerlo luego en 'Programación')."
      [breadcrumbs]="crudBreadcrumbs"
      [columns]="columns"
      [actions]="tableActions()"
      [filters]="filterConfigs"
      filterMode="inline"
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
      (filterChange)="onFilterChange($event)"
      (actionClick)="onAction($event)">
    </app-crud-page>
  `,
})
export class ContentComponent extends BaseCrudComponent<ContentItem> implements OnInit {
  private http = inject(HttpClient);

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

  /** Filtros de la tabla: por tipo de contenido y por estado de publicación. */
  override filterConfigs: FilterConfig[] = [
    { key: 'kind', label: 'Tipo', type: 'select', options: [
      { value: 'video', label: 'Video' },
      { value: 'audio', label: 'Audio' },
      { value: 'pdf', label: 'PDF' },
      { value: 'text', label: 'Texto' },
      { value: 'image', label: 'Imagen' },
      { value: 'zoom', label: 'Zoom' },
      { value: 'link', label: 'Enlace' },
    ] },
    { key: 'is_published', label: 'Publicado', type: 'select', options: [
      { value: 'true', label: 'Publicado' },
      { value: 'false', label: 'Oculto' },
    ] },
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
      info: 'Sube el video, audio, PDF o imagen desde tu computador (hasta 500 MB).',
      showWhen: { field: 'kind', equals: ['video', 'audio', 'pdf', 'image'] } },
    { key: 'external_url', label: 'Enlace externo', type: 'text', colspan: 2,
      info: 'Para links de YouTube/Vimeo (en vez de subir archivo).',
      showWhen: { field: 'kind', equals: ['video', 'audio', 'link'] } },
    { key: 'image_url', label: 'Portada', type: 'image', colspan: 2,
      info: 'Imagen de portada para la tarjeta en la biblioteca (y para la sesión Zoom antes de estar en vivo).' },
    // ── Sesión en vivo (Zoom) — solo se muestran si el tipo es "Sesión Zoom" ──
    { key: 'zoom_meeting_number', label: 'Zoom · N° de reunión', type: 'text', colspan: 1,
      info: 'El ID numérico de la reunión (Meeting ID). El miembro se une embebido, sin ver el link.',
      showWhen: { field: 'kind', equals: 'zoom' } },
    { key: 'zoom_passcode', label: 'Zoom · Clave', type: 'text', colspan: 1,
      info: 'Clave de la reunión Zoom. Se guarda en el servidor; el miembro nunca ve el link.',
      showWhen: { field: 'kind', equals: 'zoom' } },
    { key: 'live_start', label: 'Inicio en vivo', type: 'datetime', colspan: 1,
      info: 'Fecha y hora de inicio de la sesión Zoom. El acceso se abre unos minutos antes.',
      showWhen: { field: 'kind', equals: 'zoom' } },
    { key: 'live_end', label: 'Fin en vivo', type: 'datetime', colspan: 1,
      info: 'Fin de la sesión Zoom (opcional). Vacío = duración por defecto desde el inicio.',
      showWhen: { field: 'kind', equals: 'zoom' } },
    { key: 'is_published', label: 'Publicado', type: 'boolean', defaultValue: true,
      info: 'Si está activo y está programado en un plan vigente, el miembro lo ve.' },
  ];

  /** Bloque "Programar" que se añade SOLO al crear (asigna a membresías ahí mismo). */
  scheduleFields: FieldConfig[] = [
    { key: 'sched_plans', label: 'Programar en membresías', type: 'multiselect', colspan: 2, options: [],
      info: 'Opcional: elige a qué membresías queda asignado este contenido ahora mismo (equivale a "Programación"). Puedes dejarlo vacío y programarlo después.' },
    { key: 'sched_starts_at', label: 'Disponible desde', type: 'date', colspan: 1,
      info: 'Fecha desde la que aparece en las membresías elegidas. Vacío = desde hoy.' },
    { key: 'sched_ends_at', label: 'Disponible hasta', type: 'date', colspan: 1,
      info: 'Vacío = disponible sin fin (hasta que elimines la programación).' },
  ];

  /** Crear: contenido + bloque de programación. Editar: solo el contenido. */
  protected override getFormDialogFields(entity?: ContentItem): FieldConfig[] {
    return entity ? this.formFields : [...this.formFields, ...this.scheduleFields];
  }

  override actions: TableAction[] = [
    { icon: 'edit', label: '', labelKey: 'crud.actions.edit', action: 'edit', color: 'primary' },
    { icon: 'delete', label: '', labelKey: 'crud.actions.delete', action: 'delete', color: 'warn' },
  ];

  /**
   * Al CREAR: guarda el contenido y, si se eligieron membresías, crea la
   * programación (una fila por plan) en la misma acción. Al EDITAR delega en el
   * flujo estándar del `BaseCrudComponent`.
   */
  override openFormDialog(entity?: ContentItem): void {
    if (entity) {
      super.openFormDialog(entity);
      return;
    }
    if (!this.canCreate()) {
      this.notify.error(this.transloco.translate('crud.error.forbiddenAction'));
      return;
    }
    const ent = this.tEntity();
    const dialogData: EntityFormDialogData = {
      title: this.transloco.translate('crud.dialog.createTitle', { entity: ent }),
      fields: this.getFormDialogFields(),
      mode: 'create',
      submitHandler: (value: Record<string, any>) => {
        // Separa el bloque de programación del contenido en sí.
        const { sched_plans, sched_starts_at, sched_ends_at, ...content } = value;
        return this.api.create<ContentItem>(this.endpoint, content as Partial<ContentItem>).pipe(
          switchMap(created => {
            const plans = (sched_plans as number[] | undefined) ?? [];
            if (!plans.length) return of(created);
            const payload: Record<string, any> = { content: created.id, plans };
            if (sched_starts_at) payload['starts_at'] = sched_starts_at;
            if (sched_ends_at) payload['ends_at'] = sched_ends_at;
            // Crea la programación; si falla, el contenido ya quedó guardado.
            return this.api.create('content-schedules', payload).pipe(map(() => created));
          }),
        );
      },
    };

    const dialogRef = this.dialog.open(EntityFormDialogComponent, {
      data: dialogData,
      ...crudDialogSizing('650px'),
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      this.notify.success(this.transloco.translate('crud.notify.created', { entity: ent }));
      this.loadData();
    });
  }

  async ngOnInit(): Promise<void> {
    this.loadData();
    // Opciones de membresías para el bloque "Programar" del diálogo de creación.
    try {
      const plans = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/plans/?page_size=200&is_active=true`),
      );
      const items = (plans?.results ?? plans ?? []) as { id: number; name: string }[];
      const opts = items.map(p => ({ value: p.id, label: p.name }));
      const f = this.scheduleFields.find(x => x.key === 'sched_plans');
      if (f) f.options = opts;
    } catch {
      /* sin opciones; se puede programar luego en Programación */
    }
  }
}
