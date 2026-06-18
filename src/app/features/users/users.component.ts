import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, TableAction, FilterConfig } from '../../core/models/api.model';
import { AuthService } from '../../core/services/auth.service';
import { ExportColumn } from '../../core/services/excel-export.service';
import { User } from '../../core/models/user.model';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent, TranslocoPipe],
  template: `
    <app-crud-page
      [title]="'users.title' | transloco"
      [entityName]="'users.entitySingular' | transloco"
      [subtitle]="'users.subtitle' | transloco"
      [breadcrumbs]="crudBreadcrumbs"
      [columns]="columns"
      [actions]="tableActions()"
      [createPermission]="'users.create'"
      [exportPermission]="'users.export'"
      [data]="data()"
      [totalCount]="totalCount()"
      [pageSize]="pageSize()"
      [pageIndex]="pageIndex()"
      [loading]="loading()"
      (createClick)="openFormDialog()"
      (pageChange)="onPageChange($event)"
      (sortChange)="onSortChange($event)"
      (searchChange)="onSearchChange($event)"
      [filters]="filterConfigs" filterMode="inline" (filterChange)="onFilterChange($event)"
      (actionClick)="onAction($event)"
      (rowClick)="onRowClick($event)"
      (refreshClick)="onRefresh()"
      (exportClick)="onExport()">
    </app-crud-page>
  `,
})
export class UsersComponent extends BaseCrudComponent<User> implements OnInit {
  private readonly authUser = inject(AuthService).user;
  private readonly t = inject(TranslocoService);

  readonly crudBreadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { labelKey: 'users.breadcrumb' },
  ];

  endpoint = 'users';
  entityName = 'User';
  protected override entityNameKey = 'users.entitySingular';

  override drawerEntityType = 'user' as const;

  override getExportColumns(): ExportColumn[] {
    const t = (k: string) => this.t.translate(k);
    return [
      { key: 'id', label: t('crud.field.id') },
      { key: 'username', label: t('crud.field.username') },
      { key: 'email', label: t('crud.field.email') },
      { key: 'first_name', label: t('crud.field.firstName') },
      { key: 'last_name', label: t('crud.field.lastName') },
      { key: 'is_active', label: t('crud.field.active') },
      { key: 'is_staff', label: t('crud.field.staff') },
      { key: 'is_superuser', label: t('users.export.is_superuser') },
      { key: 'date_joined', label: t('crud.field.joined') },
      { key: 'last_login', label: t('crud.field.lastLogin') },
      { key: 'role', label: t('users.export.role') },
      { key: 'phone', label: t('users.export.phone') },
      { key: 'verified', label: t('users.export.verified') },
      { key: 'photo_url', label: t('users.export.photoUrl') },
    ];
  }

  columns: ColumnConfig[] = [
    { key: 'id', label: 'ID', labelKey: 'crud.field.id', sortable: true },
    { key: 'username', label: 'Username', labelKey: 'crud.field.username', sortable: true },
    { key: 'email', label: 'Email', labelKey: 'crud.field.email', sortable: true },
    { key: 'first_name', label: 'First Name', labelKey: 'crud.field.firstName', sortable: true },
    { key: 'last_name', label: 'Last Name', labelKey: 'crud.field.lastName', sortable: true },
    {
      key: 'role',
      label: 'Role',
      labelKey: 'users.form.profileRole',
      sortable: false,
      render: (row: User) => {
        const code = row.role;
        if (!code) return this.t.translate('common.dash');
        const map: Record<string, string> = {
          ADMIN: this.t.translate('users.role.admin'),
          EDITOR: this.t.translate('users.role.editor'),
          VIEWER: this.t.translate('users.role.viewer'),
        };
        return map[code] ?? row.role_label ?? code;
      },
    },
    { key: 'is_active', label: 'Active', labelKey: 'crud.field.active', type: 'boolean' },
    { key: 'is_staff', label: 'Staff', labelKey: 'crud.field.staff', type: 'boolean' },
    { key: 'date_joined', label: 'Joined', labelKey: 'crud.field.joined', type: 'date', sortable: true },
  ];

  formFields: FieldConfig[] = [
    { key: 'username', label: 'Username', labelKey: 'crud.field.username', type: 'text', required: true },
    { key: 'email', label: 'Email', labelKey: 'crud.field.email', type: 'email', required: true },
    { key: 'first_name', label: 'First Name', labelKey: 'crud.field.firstName', type: 'text', required: true },
    { key: 'last_name', label: 'Last Name', labelKey: 'crud.field.lastName', type: 'text', required: true },
    { key: 'password', label: 'Password', labelKey: 'crud.field.password', type: 'password', required: true },
    { key: 'is_active', label: 'Active', labelKey: 'crud.field.active', type: 'boolean' },
    { key: 'is_staff', label: 'Staff', labelKey: 'crud.field.staff', type: 'boolean' },
  ];

  override actions: TableAction[] = [
    { icon: 'edit', label: '', labelKey: 'crud.actions.edit', action: 'edit', color: 'primary' },
    {
      icon: 'toggle_on',
      label: '',
      labelKey: 'crud.actions.toggleActive',
      action: 'toggle_active',
      color: 'accent',
      iconForRow: (row: User) => (row.is_active ? 'toggle_on' : 'toggle_off'),
      tooltipKeyWhenActive: 'users.toggle.deactivate',
      tooltipKeyWhenInactive: 'users.toggle.activate',
      colorForRow: (row: User) => (row.is_active ? 'primary' : undefined),
    },
    { icon: 'delete', label: '', labelKey: 'crud.actions.delete', action: 'delete', color: 'warn' },
  ];

  override filterConfigs: FilterConfig[] = [
    { key: 'is_active', label: 'Active', labelKey: 'crud.field.active', type: 'boolean' },
    { key: 'is_staff', label: 'Staff', labelKey: 'crud.field.staff', type: 'boolean' },
  ];

  protected override getFormDialogFields(entity?: User): FieldConfig[] {
    const roleOpts = [
      { value: 'ADMIN', label: this.t.translate('users.role.admin') },
      { value: 'EDITOR', label: this.t.translate('users.role.editor') },
      { value: 'VIEWER', label: this.t.translate('users.role.viewer') },
    ];

    const roleField: FieldConfig = {
      key: 'role',
      label: 'Role',
      labelKey: 'users.form.profileRole',
      type: 'select',
      required: true,
      options: roleOpts,
      initialFrom: 'role',
      defaultValue: 'VIEWER',
    };

    const base = entity ? this.formFields.filter(f => f.key !== 'password') : this.formFields;
    const lastNameIdx = base.findIndex(f => f.key === 'last_name');
    const insertAt = lastNameIdx >= 0 ? lastNameIdx + 1 : base.length;
    const withRole = [...base.slice(0, insertAt), roleField, ...base.slice(insertAt)];

    const canManageStaff = !!this.authUser()?.is_staff;
    return withRole.map(f => {
      if (f.key === 'is_staff') {
        return {
          ...f,
          disabled: !canManageStaff,
          hint: !canManageStaff ? this.t.translate('users.form.staffRestrictedHint') : undefined,
        };
      }
      if (f.key === 'role') {
        return {
          ...f,
          disabled: !canManageStaff,
          required: canManageStaff,
          hint: !canManageStaff ? this.t.translate('users.form.roleRestrictedHint') : undefined,
        };
      }
      return { ...f };
    });
  }

  /**
   * Sin «n.º {{id}}» en la cabecera: el cuerpo ya muestra identidad; el título basta con «Usuario».
   */
  protected override getDrawerTitle(_row: User): string {
    return this.t.translate('users.entitySingular');
  }

  ngOnInit(): void {
    this.loadData();
  }

  override onAction(event: { action: string; row: User }): void {
    const me = this.authUser();
    if (
      event.action === 'toggle_active' &&
      me &&
      event.row.id === me.id &&
      event.row.is_active
    ) {
      this.notify.error(this.t.translate('users.errors.cannotDeactivateSelf'));
      return;
    }
    super.onAction(event);
  }
}
