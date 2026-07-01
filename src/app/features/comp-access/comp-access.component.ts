import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, TableAction } from '../../core/models/api.model';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface CompMembership {
  id: number;
  email: string;
  full_name?: string;
  all_plans: boolean;
  plans: number[];
  plan_names?: string;
  is_active: boolean;
  note?: string;
}

/**
 * Accesos de CORTESÍA / STAFF: un correo que ve el contenido de las membresías
 * sin una suscripción real (no cuenta como suscripción ni aparece en métricas).
 * Útil para el equipo, invitados o pruebas. Se puede dar acceso a TODAS las
 * membresías o solo a algunas.
 */
@Component({
  selector: 'app-comp-access',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent],
  template: `
    <app-crud-page
      title="Accesos de cortesía"
      subtitle="Correos que ven el contenido de las membresías sin ser una suscripción (equipo, invitados, pruebas)."
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
export class CompAccessComponent extends BaseCrudComponent<CompMembership> implements OnInit {
  private http = inject(HttpClient);

  readonly crudBreadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Accesos de cortesía' },
  ];

  endpoint = 'comp-memberships';
  entityName = 'Acceso de cortesía';

  columns: ColumnConfig[] = [
    { key: 'email', label: 'Correo', sortable: true },
    { key: 'full_name', label: 'Nombre', render: r => r.full_name || '—' },
    { key: 'plan_names', label: 'Membresías', render: r => r.all_plans ? 'Todas' : (r.plan_names || '—') },
    { key: 'is_active', label: 'Activo', type: 'boolean' },
  ];

  formFields: FieldConfig[] = [
    { key: 'email', label: 'Correo', type: 'email', required: true, colspan: 2,
      info: 'El correo con el que la persona entrará en /acceso (le llegará un código).' },
    { key: 'full_name', label: 'Nombre (opcional)', type: 'text', colspan: 2 },
    { key: 'all_plans', label: 'Acceso a TODAS las membresías', type: 'boolean', defaultValue: true,
      info: 'Marcado = ve el contenido de todas las membresías. Desmárcalo para elegir membresías concretas.' },
    { key: 'plans', label: 'Membresías', type: 'multiselect', colspan: 2, options: [],
      info: 'Solo si "Acceso a TODAS" está desmarcado: las membresías cuyo contenido podrá ver.',
      showWhen: { field: 'all_plans', equals: false } },
    { key: 'note', label: 'Nota (opcional)', type: 'text', colspan: 2,
      info: 'Para tu referencia (ej. "cuenta de prueba", "invitado taller").' },
    { key: 'is_active', label: 'Activo', type: 'boolean', defaultValue: true,
      info: 'Desactívalo para quitar el acceso sin borrar el registro.' },
  ];

  override actions: TableAction[] = [
    { icon: 'edit', label: '', labelKey: 'crud.actions.edit', action: 'edit', color: 'primary' },
    { icon: 'delete', label: '', labelKey: 'crud.actions.delete', action: 'delete', color: 'warn' },
  ];

  async ngOnInit(): Promise<void> {
    this.loadData();
    try {
      const plans = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/plans/?page_size=200&is_active=true`),
      );
      const items = (plans?.results ?? plans ?? []) as { id: number; name: string }[];
      const opts = items.map(p => ({ value: p.id, label: p.name }));
      const f = this.formFields.find(x => x.key === 'plans');
      if (f) f.options = opts;
    } catch {
      /* sin opciones; se pueden cargar recargando */
    }
  }
}
