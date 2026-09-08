import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, FilterConfig, TableAction } from '../../core/models/api.model';
import {
  CONTENT_KIND_FILTER_OPTIONS,
  contentKindChips,
  contentKindLabel,
} from '../../core/models/content-kind';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface Schedule {
  id: number;
  content: number;
  content_title?: string;
  content_kind?: string;
  plan: number;
  plan_name?: string;
  starts_at: string;
  ends_at: string | null;
  date_mode?: 'date' | 'tbd' | 'available';
}

const DATE_MODE_LABELS: Record<string, string> = {
  date: 'Definida', tbd: 'Por confirmar', available: 'Material disponible',
};

/** `2026-09-01` → `01 sep 2026`. Cadena vacía si la fecha no viene o no es válida. */
function formatDay(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Hoy a medianoche, para comparar contra fechas sin hora sin desfases. */
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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
export class ProgramacionComponent extends BaseCrudComponent<Schedule> implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  readonly crudBreadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Programación' },
  ];

  endpoint = 'content-schedules';
  entityName = 'Programación';

  columns: ColumnConfig[] = [
    // El título del contenido es lo que se busca al mirar la tabla: se lleva el
    // ancho. Ordenable gracias a la anotación `content_title` del backend.
    { key: 'content_title', label: 'Contenido', sortable: true, width: '320px' },
    { key: 'content_kind', label: 'Tipo', sortable: true,
      type: 'chips', chips: (r: Schedule) => contentKindChips(r.content_kind) },
    { key: 'plan_name', label: 'Membresía', sortable: true },
    // "Desde" y "Hasta" fundidas en una sola columna: el dato es un rango, no
    // dos fechas sueltas. Debajo, en gris, en qué punto de ese rango estamos.
    { key: 'starts_at', label: 'Rango de fechas', sortable: true, width: '220px',
      render: (r: Schedule) => `${formatDay(r.starts_at)} → ${r.ends_at ? formatDay(r.ends_at) : 'sin fin'}`,
      renderSub: (r: Schedule) => this.rangeStatus(r) },
    { key: 'date_mode', label: 'Fecha', sortable: true,
      render: (r: Schedule) => DATE_MODE_LABELS[r.date_mode ?? 'date'] ?? 'Definida' },
  ];

  /** Filtros de la tabla: por tipo de contenido y por membresía. */
  override filterConfigs: FilterConfig[] = [
    // La clave viaja tal cual como parámetro de la consulta, por eso usa el
    // lookup del backend (`content__kind`).
    { key: 'content__kind', label: 'Tipo', type: 'select', options: CONTENT_KIND_FILTER_OPTIONS },
    { key: 'plan', label: 'Membresía', type: 'select', options: [] },
  ];

  /**
   * Estado del rango respecto de hoy: la fila dice *cuándo*, esto dice *si ya*.
   * Es la pregunta que uno se hace mirando una programación.
   */
  private rangeStatus(row: Schedule): string {
    const now = today();
    const start = row.starts_at ? new Date(`${row.starts_at}T00:00:00`) : null;
    const end = row.ends_at ? new Date(`${row.ends_at}T00:00:00`) : null;
    if (end && end < now) return 'Finalizado';
    if (start && start > now) {
      const days = Math.ceil((start.getTime() - now.getTime()) / 86400000);
      return days === 1 ? 'Empieza mañana' : `Empieza en ${days} días`;
    }
    return end ? 'Vigente' : 'Vigente · sin fin';
  }

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
    { key: 'date_mode', label: 'Cómo mostrar la fecha', type: 'select', defaultValue: 'date', colspan: 2,
      options: [
        { value: 'date', label: 'Mostrar fecha' },
        { value: 'tbd', label: 'Por confirmar' },
        { value: 'available', label: 'Material disponible' },
      ],
      info: 'En "Próximas actividades": "Mostrar fecha" usa la fecha real (o la hora de la sesión en vivo) y desaparece al pasar; "Por confirmar" aparece siempre como "Fecha por confirmar"; "Material disponible" aparece siempre como "Material disponible" (contenido sin fecha, ya disponible).' },
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
    { key: 'date_mode', label: 'Cómo mostrar la fecha', type: 'select', defaultValue: 'date', colspan: 2,
      options: [
        { value: 'date', label: 'Mostrar fecha' },
        { value: 'tbd', label: 'Por confirmar' },
        { value: 'available', label: 'Material disponible' },
      ],
      info: 'En "Próximas actividades": "Mostrar fecha" usa la fecha real (o la hora de la sesión en vivo) y desaparece al pasar; "Por confirmar" aparece siempre como "Fecha por confirmar"; "Material disponible" aparece siempre como "Material disponible" (contenido sin fecha, ya disponible).' },
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
      const contentOpts = cItems.map(c => ({ value: c.id, label: `${c.title} (${contentKindLabel(c.kind)})` }));
      const planOpts = pItems.map(p => ({ value: p.id, label: p.name }));
      // Cargar opciones en AMBOS juegos de campos (crear y editar).
      for (const f of [...this.formFields, ...this.editFields]) {
        if (f.key === 'content') f.options = contentOpts;
        if (f.key === 'plans' || f.key === 'plan') f.options = planOpts;
      }
      // El filtro llega por `@Input`: hay que cambiar la REFERENCIA del array
      // para que la vista OnPush vuelva a leerlo.
      this.filterConfigs = this.filterConfigs.map(fc =>
        fc.key === 'plan' ? { ...fc, options: planOpts } : fc,
      );
      this.cdr.markForCheck();
    } catch {
      /* sin opciones; reintentar recargando */
    }
  }
}
