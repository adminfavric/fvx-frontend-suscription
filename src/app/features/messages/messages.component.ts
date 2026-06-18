import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface Lead {
  id: number;
  kind: string;
  source: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  subject: string;
  message: string;
  created: string;
  is_read: boolean;
  is_replied: boolean;
}

const KIND_LABELS: Record<string, string> = {
  newsletter: 'Newsletter', contact: 'Contacto', maraton: 'Maratón',
};

/**
 * Mensajes entrantes del sitio (contacto, newsletter, inscripciones). Solo
 * lectura — los crea el público vía /public/leads/.
 */
@Component({
  selector: 'app-messages',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTableModule, MatProgressBarModule, MatIconModule, PageHeaderComponent],
  template: `
   <div class="page-container">
    <app-page-header
      title="Mensajes"
      subtitle="Contacto, newsletter e inscripciones recibidas desde el sitio."
      [breadcrumbs]="breadcrumbs">
    </app-page-header>

    <div class="filters">
      <button class="chip" [class.chip--on]="kind() === 'all'" (click)="kind.set('all')">Todos</button>
      <button class="chip" [class.chip--on]="kind() === 'contact'" (click)="kind.set('contact')">Contacto</button>
      <button class="chip" [class.chip--on]="kind() === 'newsletter'" (click)="kind.set('newsletter')">Newsletter</button>
      <button class="chip" [class.chip--on]="kind() === 'maraton'" (click)="kind.set('maraton')">Maratón</button>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    @if (error()) {
      <div class="state state--error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (!loading() && filtered().length === 0) {
      <div class="state"><mat-icon>mark_email_unread</mat-icon> No hay mensajes en esta categoría.</div>
    } @else {
      <div class="table-wrap">
        <table mat-table [dataSource]="filtered()">
          <ng-container matColumnDef="kind">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let m"><span class="badge">{{ label(m.kind) }}</span></td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let m">{{ m.name || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let m"><a [href]="'mailto:' + m.email">{{ m.email }}</a></td>
          </ng-container>
          <ng-container matColumnDef="message">
            <th mat-header-cell *matHeaderCellDef>Mensaje</th>
            <td mat-cell *matCellDef="let m">
              @if (m.subject) { <strong>{{ m.subject }}</strong><br /> }
              <span class="msg">{{ m.message || (m.country ? ('País: ' + m.country) : '—') }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let m">
              @if (m.is_replied) { <span class="badge badge--replied">Respondido</span> }
              @else if (m.is_read) { <span class="badge badge--read">Leído</span> }
              @else { <span class="badge badge--new">Nuevo</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let m">{{ m.created | date: 'dd-MM-yyyy HH:mm' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let m">
              <button class="act" [class.act--on]="m.is_read" (click)="toggleRead(m)"
                      [title]="m.is_read ? 'Marcar como no leído' : 'Marcar como leído'">
                <mat-icon>{{ m.is_read ? 'mark_email_read' : 'mark_email_unread' }}</mat-icon>
              </button>
              <button class="act" [class.act--on]="m.is_replied" (click)="toggleReplied(m)"
                      [title]="m.is_replied ? 'Quitar respondido' : 'Marcar como respondido'">
                <mat-icon>{{ m.is_replied ? 'task_alt' : 'reply' }}</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" [class.row--unread]="!row.is_read"></tr>
        </table>
      </div>
    }
   </div>
  `,
  styles: [`
    :host { display: block; }
    .filters { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
    .chip { border:1px solid var(--fvx-border,#e0d6ec); background:var(--fvx-surface,#fff); color:var(--fvx-link,#5b3a8a); border-radius:999px; padding:6px 14px; font-size:.82rem; font-weight:600; cursor:pointer; }
    .chip--on { background:var(--fvx-link,#5b3a8a); color:#fff; }
    .table-wrap { overflow-x:auto; background:var(--fvx-surface,#fff); border:1px solid var(--fvx-border,#e6e6ef); border-radius:12px; }
    table { width:100%; }
    .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:.75rem; background:#ececf2; color:#555; }
    .badge--new { background:#fde68a; color:#92400e; }
    .badge--read { background:#e0e7ff; color:#3730a3; }
    .badge--replied { background:#d1fae5; color:#065f46; }
    .act { border:none; background:transparent; cursor:pointer; color:var(--fvx-text-muted,#6b6478); padding:4px; border-radius:6px; }
    .act:hover { background:var(--fvx-bg-surface-2,#f1f1f6); }
    .act--on { color:var(--fvx-link,#5b3a8a); }
    .act mat-icon { font-size:20px; width:20px; height:20px; }
    .row--unread td { font-weight:600; }
    .msg { color:var(--fvx-text-secondary,#6b6478); font-size:.88rem; }
    .state { display:flex; align-items:center; gap:8px; padding:32px; color:var(--fvx-text-muted,#6b6478); justify-content:center; }
    .state--error { color:#c0392b; }
  `],
})
export class MessagesComponent implements OnInit {
  private http = inject(HttpClient);
  cols = ['kind', 'name', 'email', 'message', 'status', 'created', 'actions'];
  rows = signal<Lead[]>([]);
  kind = signal<string>('all');
  loading = signal(true);
  error = signal('');
  breadcrumbs = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Mensajes' },
  ];

  filtered = computed(() =>
    this.kind() === 'all' ? this.rows() : this.rows().filter(m => m.kind === this.kind()),
  );

  label(k: string): string {
    return KIND_LABELS[k] ?? k;
  }

  /** Marca leído/no leído. */
  toggleRead(m: Lead): void {
    this.patchMark(m, { is_read: !m.is_read });
  }

  /** Marca respondido/no; al responder, además queda leído. */
  toggleReplied(m: Lead): void {
    const next = !m.is_replied;
    this.patchMark(m, next ? { is_read: true, is_replied: true } : { is_replied: false });
  }

  private patchMark(m: Lead, body: { is_read?: boolean; is_replied?: boolean }): void {
    this.http.patch<Lead>(`${environment.apiUrl}/leads/${m.id}/mark/`, body).subscribe({
      next: updated => this.rows.update(list =>
        list.map(x => (x.id === m.id ? { ...x, ...updated } : x)),
      ),
      error: () => this.error.set('No se pudo actualizar el mensaje. Intenta de nuevo.'),
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ results?: Lead[] } | Lead[]>(`${environment.apiUrl}/leads/?page_size=500`),
      );
      this.rows.set((res as any)?.results ?? (res as Lead[]) ?? []);
    } catch {
      this.error.set('No se pudieron cargar los mensajes.');
    } finally {
      this.loading.set(false);
    }
  }
}
