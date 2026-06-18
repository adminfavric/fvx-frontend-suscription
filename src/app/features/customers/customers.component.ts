import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface FlowCustomer {
  customerId: string;
  name: string;
  email: string;
  creditCardType: string | null;
  last4CardDigits: string | null;
  status: number;
  created: string;
}

/**
 * Clientes registrados en Flow (espejo de solo lectura). Flow es la fuente de
 * verdad; este listado consume `GET /api/v1/customers/` que hace de proxy.
 */
@Component({
  selector: 'app-customers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTableModule, MatProgressBarModule, MatIconModule, PageHeaderComponent],
  template: `
   <div class="page-container">
    <app-page-header
      title="Clientes"
      subtitle="Clientes registrados en Flow (solo lectura)."
      [breadcrumbs]="breadcrumbs">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (error()) {
      <div class="state state--error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (!loading() && rows().length === 0) {
      <div class="state"><mat-icon>group_off</mat-icon> Aún no hay clientes en Flow.</div>
    } @else {
      <div class="table-wrap">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let c">{{ c.name || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let c">{{ c.email }}</td>
          </ng-container>
          <ng-container matColumnDef="card">
            <th mat-header-cell *matHeaderCellDef>Tarjeta</th>
            <td mat-cell *matCellDef="let c">
              @if (c.last4CardDigits) { {{ c.creditCardType }} ••••{{ c.last4CardDigits }} }
              @else { <span class="muted">Sin tarjeta</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let c">
              <span class="chip" [class.chip--ok]="c.status === 1">{{ c.status === 1 ? 'Activo' : 'Inactivo' }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Registrado</th>
            <td mat-cell *matCellDef="let c">{{ c.created | date: 'dd-MM-yyyy HH:mm' }}</td>
          </ng-container>
          <ng-container matColumnDef="customerId">
            <th mat-header-cell *matHeaderCellDef>ID Flow</th>
            <td mat-cell *matCellDef="let c"><code>{{ c.customerId }}</code></td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </div>
    }
   </div>
  `,
  styles: [`
    :host { display: block; }
    .table-wrap { overflow-x: auto; background: var(--fvx-surface, #fff); border: 1px solid var(--fvx-border, #e6e6ef); border-radius: 12px; }
    table { width: 100%; }
    code { font-size: .82rem; color: var(--fvx-text-muted, #6b6478); }
    .muted { color: var(--fvx-text-muted, #9a93a8); }
    .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .78rem; background: #ececf2; color: #555; }
    .chip--ok { background: #e3f6ea; color: #1f7a45; }
    .state { display: flex; align-items: center; gap: 8px; padding: 32px; color: var(--fvx-text-muted, #6b6478); justify-content: center; }
    .state--error { color: #c0392b; }
  `],
})
export class CustomersComponent implements OnInit {
  private http = inject(HttpClient);
  cols = ['name', 'email', 'card', 'status', 'created', 'customerId'];
  rows = signal<FlowCustomer[]>([]);
  loading = signal(true);
  error = signal('');
  breadcrumbs = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Clientes' },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: FlowCustomer[] }>(`${environment.apiUrl}/customers/`),
      );
      this.rows.set(res?.data ?? []);
    } catch {
      this.error.set('No se pudieron cargar los clientes desde Flow.');
    } finally {
      this.loading.set(false);
    }
  }
}
