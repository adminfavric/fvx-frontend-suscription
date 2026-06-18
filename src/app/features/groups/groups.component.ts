import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, TableAction } from '../../core/models/api.model';
import { Group } from '../../core/models/group.model';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-groups',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent, TranslocoPipe],
  template: `
    <app-crud-page
      [title]="'groups.title' | transloco"
      [entityName]="'groups.entitySingular' | transloco"
      [subtitle]="'groups.subtitle' | transloco"
      [breadcrumbs]="crudBreadcrumbs"
      [columns]="columns"
      [actions]="tableActions()"
      [createPermission]="'groups.create'"
      [exportPermission]="'groups.read'"
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
export class GroupsComponent extends BaseCrudComponent<Group> implements OnInit {
  readonly crudBreadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { labelKey: 'groups.breadcrumb' },
  ];

  endpoint = 'groups';
  entityName = 'Group';
  protected override entityNameKey = 'groups.entitySingular';

  columns: ColumnConfig[] = [
    { key: 'id', label: 'ID', labelKey: 'crud.field.id', sortable: true },
    { key: 'name', label: 'Name', labelKey: 'crud.field.name', sortable: true },
  ];

  formFields: FieldConfig[] = [
    { key: 'name', label: 'Name', labelKey: 'crud.field.name', type: 'text', required: true },
  ];

  override actions: TableAction[] = [
    { icon: 'edit', label: '', labelKey: 'crud.actions.edit', action: 'edit', color: 'primary' },
    { icon: 'delete', label: '', labelKey: 'crud.actions.delete', action: 'delete', color: 'warn' },
  ];

  ngOnInit(): void {
    this.loadData();
  }
}
