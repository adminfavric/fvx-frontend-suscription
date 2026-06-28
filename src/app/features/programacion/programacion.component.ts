import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, TableAction } from '../../core/models/api.model';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface Schedule {
  id: number;
  content: number;
  content_title?: string;
  plan: number;
  plan_name?: string;
  starts_at: string;
  ends_at: string | null;
}

/**
 * Programación: el hub que asigna una pieza de contenido a un plan durante un
 * rango de fechas. Un contenido puede asignarse a varios planes (varias filas).
 * Sin "Hasta" = disponible sin fin (hasta que se elimine la asignación).
 */
@Component({
  selector: 'app-programacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent],
  template: `
    <app-crud-page
      title="Programación"
      subtitle="Asigna contenido a las membresías con fecha de inicio (y fin opcional). El mismo contenido puede ir en varios planes."
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
export class ProgramacionComponent extends BaseCrudComponent<Schedule> implements OnInit {
  private http = inject(HttpClient);

  readonly crudBreadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Programación' },
  ];

  endpoint = 'content-schedules';
  entityName = 'Programación';

  columns: ColumnConfig[] = [
    { key: 'content_title', label: 'Contenido', sortable: false },
    { key: 'plan_name', label: 'Membresía' },
    { key: 'starts_at', label: 'Desde' },
    { key: 'ends_at', label: 'Hasta', render: r => r.ends_at || 'Sin fin' },
  ];

  /** CREAR: permite varias membresías → crea una programación por cada una. */
  formFields: FieldConfig[] = [
    { key: 'content', label: 'Contenido', type: 'select', required: true, colspan: 2, options: [],
      info: 'La pieza de contenido a asignar (de la biblioteca).' },
    { key: 'plans', label: 'Membresías', type: 'multiselect', required: true, colspan: 2, options: [],
      info: 'Elige una o varias membresías. Se creará una programación por cada una (ej. lanzar un audio a todas).' },
    { key: 'starts_at', label: 'Disponible desde', type: 'date', required: true,
      info: 'Fecha desde la que el contenido aparece en este plan.' },
    { key: 'ends_at', label: 'Disponible hasta', type: 'date',
      info: 'Déjalo vacío para que esté disponible "sin fin" (hasta que elimines la asignación).' },
  ];

  /** EDITAR: cada fila es UNA membresía → selección simple (evita duplicados/500). */
  editFields: FieldConfig[] = [
    { key: 'content', label: 'Contenido', type: 'select', required: true, colspan: 2, options: [],
      info: 'La pieza de contenido a asignar (de la biblioteca).' },
    { key: 'plan', label: 'Membresía', type: 'select', required: true, colspan: 2, options: [],
      info: 'Membresía de esta programación. Para agregar otras, crea una nueva programación.' },
    { key: 'starts_at', label: 'Disponible desde', type: 'date', required: true,
      info: 'Fecha desde la que el contenido aparece en este plan.' },
    { key: 'ends_at', label: 'Disponible hasta', type: 'date',
      info: 'Déjalo vacío para que esté disponible "sin fin".' },
  ];

  /** Crear usa multi-membresía; editar usa membresía simple (una fila = un plan). */
  protected override getFormDialogFields(entity?: Schedule): FieldConfig[] {
    return entity ? this.editFields : this.formFields;
  }

  override actions: TableAction[] = [
    { icon: 'edit', label: '', labelKey: 'crud.actions.edit', action: 'edit', color: 'primary' },
    { icon: 'delete', label: '', labelKey: 'crud.actions.delete', action: 'delete', color: 'warn' },
  ];

  async ngOnInit(): Promise<void> {
    this.loadData();
    try {
      const [content, plans] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${environment.apiUrl}/content-items/?page_size=500`)),
        firstValueFrom(this.http.get<any>(`${environment.apiUrl}/plans/?page_size=200&is_active=true`)),
      ]);
      const cItems = (content?.results ?? content ?? []) as { id: number; title: string; kind: string }[];
      const pItems = (plans?.results ?? plans ?? []) as { id: number; name: string }[];
      const contentOpts = cItems.map(c => ({ value: c.id, label: `${c.title} (${c.kind})` }));
      const planOpts = pItems.map(p => ({ value: p.id, label: p.name }));
      // Cargar opciones en AMBOS juegos de campos (crear y editar).
      for (const f of [...this.formFields, ...this.editFields]) {
        if (f.key === 'content') f.options = contentOpts;
        if (f.key === 'plans' || f.key === 'plan') f.options = planOpts;
      }
    } catch {
      /* sin opciones; reintentar recargando */
    }
  }
}
