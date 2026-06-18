import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, TableAction } from '../../core/models/api.model';
import { Plan } from '../../core/models/plan.model';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';

/** Flow interval codes → human label (matches backend PlanInterval). */
const INTERVAL_LABELS: Record<number, string> = {
  1: 'Diario',
  2: 'Semanal',
  3: 'Mensual',
  4: 'Anual',
};

@Component({
  selector: 'app-plans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent, TranslocoPipe, MatButtonModule, MatIconModule],
  template: `
    <div class="plans-toolbar">
      <button mat-stroked-button type="button" (click)="toggleShowAll()">
        <mat-icon>{{ showAll() ? 'filter_alt' : 'filter_alt_off' }}</mat-icon>
        {{ showAll() ? 'Mostrar solo activos' : 'Mostrar todos' }}
      </button>
    </div>
    <app-crud-page
      [title]="'plans.title' | transloco"
      [entityName]="'plans.entitySingular' | transloco"
      [subtitle]="'plans.subtitle' | transloco"
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
  styles: [`.plans-toolbar { display: flex; justify-content: flex-end; padding: 0 0 12px; }`],
})
export class PlansComponent extends BaseCrudComponent<Plan> implements OnInit {
  showAll = signal(false);

  readonly crudBreadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { labelKey: 'plans.breadcrumb' },
  ];

  endpoint = 'plans';
  entityName = 'Plan';
  protected override entityNameKey = 'plans.entitySingular';

  columns: ColumnConfig[] = [
    { key: 'name', label: 'Name', labelKey: 'crud.field.name', sortable: true },
    {
      key: 'amount',
      label: 'Amount',
      labelKey: 'plans.field.amount',
      sortable: true,
      render: r => (r.amount ? `$${Number(r.amount).toLocaleString('es-CL')}` : '—'),
    },
    {
      key: 'interval',
      label: 'Interval',
      labelKey: 'plans.field.interval',
      render: r => INTERVAL_LABELS[r.interval] ?? String(r.interval),
    },
    { key: 'is_public', label: 'Public', labelKey: 'plans.field.isPublic', type: 'boolean' },
    { key: 'featured', label: 'Featured', labelKey: 'plans.field.featured', type: 'boolean' },
    {
      key: 'flow_synced_at',
      label: 'Flow',
      labelKey: 'plans.field.flowSynced',
      render: r => (r.flow_synced_at ? '✓' : '—'),
    },
    { key: 'is_active', label: 'Active', labelKey: 'plans.field.active', type: 'boolean' },
  ];

  // Form acotado a lo esencial: los mínimos que Flow necesita (name, amount,
  // interval) + presentación. Los campos avanzados de cobro (currency=CLP,
  // interval_count=1, trial=0, days_until_due=3, periods=sin fin, retries=3,
  // order=0, is_active) usan los valores por defecto del backend. Mantener el
  // form corto evita que el diálogo se desborde y simplifica la creación.
  formFields: FieldConfig[] = [
    { key: 'name', label: 'Name', labelKey: 'crud.field.name', type: 'text', required: true, colspan: 2,
      info: 'Nombre de la membresía. Es lo que ve el cliente en la tarjeta y lo que se envía a Flow.' },
    { key: 'amount', label: 'Amount', labelKey: 'plans.field.amount', type: 'number', hint: 'CLP. Vacío = borrador (no se sube a Flow)',
      info: 'Precio del cobro recurrente en pesos chilenos (CLP). Si lo dejas vacío, el plan queda como borrador y NO se sube a Flow.' },
    {
      key: 'interval',
      label: 'Interval',
      labelKey: 'plans.field.interval',
      type: 'select',
      defaultValue: 3,
      info: 'Cada cuánto se le cobra al cliente: diario, semanal, mensual o anual. Es el período de cobro real que usa Flow.',
      options: [
        { value: 1, label: 'Diario' },
        { value: 2, label: 'Semanal' },
        { value: 3, label: 'Mensual' },
        { value: 4, label: 'Anual' },
      ],
    },
    { key: 'tagline', label: 'Tagline', labelKey: 'plans.field.tagline', type: 'text', colspan: 2,
      info: 'Frase corta bajo el título de la membresía (ej. "Sesión mensual · curso anual"). Solo para mostrar.' },
    { key: 'cadence', label: 'Cadence', labelKey: 'plans.field.cadence', type: 'text',
      info: 'Texto descriptivo del ritmo del contenido (ej. "1 módulo por mes"). Es solo visual; NO afecta el cobro (eso lo define "Frecuencia"). Puedes dejarlo vacío.' },
    { key: 'icon', label: 'Icon', labelKey: 'plans.field.icon', type: 'text', hint: 'Material icon (p. ej. auto_awesome)',
      info: 'Nombre de un ícono de Material (ej. auto_awesome, self_improvement, menu_book). Se muestra en la tarjeta si no hay imagen. Lista: fonts.google.com/icons' },
    { key: 'description', label: 'Description', labelKey: 'plans.field.description', type: 'textarea', colspan: 2,
      info: 'Descripción larga de la membresía para la página de detalle.' },
    { key: 'image_url', label: 'Image', labelKey: 'plans.field.imageUrl', type: 'image', colspan: 2, hint: 'Imagen opcional para la card (se sube desde tu PC; no se envía a Flow)',
      info: 'Imagen de portada de la tarjeta. Se sube desde tu computador. Opcional; no se envía a Flow.' },
    { key: 'recorded', label: 'Recorded', labelKey: 'plans.field.recorded', type: 'boolean',
      info: 'Marca si las sesiones quedan grabadas para verlas después (vs. solo en vivo). Se muestra como una etiqueta en la tarjeta.' },
    { key: 'featured', label: 'Featured', labelKey: 'plans.field.featured', type: 'boolean',
      info: 'Resalta esta membresía como "Destacada" en el sitio (borde dorado e insignia).' },
    { key: 'is_public', label: 'Public', labelKey: 'plans.field.isPublic', type: 'boolean', defaultValue: true,
      info: 'Si está activo, la membresía se muestra en el sitio público (debe además estar activa en Flow). Desactívalo para ocultarla sin borrarla.' },
  ];

  override actions: TableAction[] = [
    { icon: 'edit', label: '', labelKey: 'crud.actions.edit', action: 'edit', color: 'primary' },
    { icon: 'delete', label: '', labelKey: 'crud.actions.delete', action: 'delete', color: 'warn' },
  ];

  ngOnInit(): void {
    // Por defecto solo planes ACTIVOS (oculta inactivos/eliminados).
    this.activeFilters.set({ is_active: true });
    this.loadData();
  }

  /** Alterna entre "solo activos" (default) y "todos". */
  toggleShowAll(): void {
    this.showAll.set(!this.showAll());
    this.activeFilters.set(this.showAll() ? {} : { is_active: true });
    this.pageIndex.set(0);
    this.loadData();
  }
}
