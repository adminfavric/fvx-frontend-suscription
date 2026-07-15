import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseCrudComponent } from '../../shared/base/base-crud.component';
import { CrudPageComponent } from '../../shared/components/crud-page/crud-page.component';
import { ColumnConfig, FieldConfig, TableAction } from '../../core/models/api.model';
import type { PageBreadcrumb } from '../../shared/components/page-header/page-header.component';

interface EmailLog {
  id: number;
  sender_email: string;
  kind: string;
  kind_label: string;
  subject: string;
  to_email: string;
  recipients_count: number;
  note: string;
  lead: number | null;
  lead_email: string;
  created: string;
}

/**
 * Historial de correos: registro de auditoría (solo lectura) de TODO lo que se
 * envía desde el panel — correos masivos, envíos individuales y respuestas a
 * mensajes — con quién lo envió (el correo del admin logueado), a quién / a
 * cuántos, el asunto y la fecha. Los datos los genera el backend en cada envío.
 */
@Component({
  selector: 'app-email-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPageComponent],
  template: `
    <app-crud-page
      title="Historial de correos"
      subtitle="Registro de todos los correos enviados desde el panel (masivos, individuales y respuestas), con quién los envió. Solo lectura."
      [breadcrumbs]="crudBreadcrumbs"
      [columns]="columns"
      [actions]="tableActions()"
      [showCreate]="false"
      [data]="data()"
      [totalCount]="totalCount()"
      [pageSize]="pageSize()"
      [pageIndex]="pageIndex()"
      [loading]="loading()"
      (pageChange)="onPageChange($event)"
      (sortChange)="onSortChange($event)"
      (searchChange)="onSearchChange($event)">
    </app-crud-page>
  `,
})
export class EmailHistoryComponent extends BaseCrudComponent<EmailLog> implements OnInit {
  readonly crudBreadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Historial de correos' },
  ];

  endpoint = 'email-logs';
  entityName = 'Correo';

  columns: ColumnConfig[] = [
    { key: 'created', label: 'Fecha', type: 'date', sortable: true },
    { key: 'kind_label', label: 'Tipo' },
    { key: 'sender_email', label: 'Enviado por', sortable: true, render: r => r.sender_email || '—' },
    { key: 'to_email', label: 'Para', render: r => r.to_email || `${r.recipients_count} destinatario(s)` },
    { key: 'subject', label: 'Asunto', render: r => r.subject || '—' },
    { key: 'note', label: 'Contexto', render: r => r.note || '—' },
  ];

  // Log de solo lectura: sin acciones de fila (editar/eliminar) ni crear.
  override actions: TableAction[] = [];
  formFields: FieldConfig[] = [];

  async ngOnInit(): Promise<void> {
    this.loadData();
  }
}
