import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EntityFormDialogComponent } from '../../shared/components/entity-form-dialog/entity-form-dialog.component';
import { ConversationDialogComponent, type ConversationDialogData } from './conversation-dialog.component';
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

/** Fila de la bandeja: UNA persona (email normalizado) con todos sus mensajes. */
interface Thread {
  key: string;
  email: string;
  name: string;
  last: Lead;
  count: number;
  unread: number;
  kinds: string[];
}

const KIND_LABELS: Record<string, string> = {
  newsletter: 'Newsletter', contact: 'Contacto', maraton: 'Maratón', email: 'Correo',
};

/**
 * Mensajes entrantes del sitio (contacto, newsletter, inscripciones y respuestas
 * por correo). La bandeja agrupa por PERSONA (email, sin distinguir mayúsculas):
 * una clienta = una fila, aunque haya escrito varias veces; el hilo completo se
 * ve en "Ver conversación". Los leads los crea el público vía /public/leads/ y
 * la ingesta IMAP.
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
      subtitle="Contacto, newsletter e inscripciones recibidas desde el sitio, agrupados por persona."
      [breadcrumbs]="breadcrumbs">
    </app-page-header>

    <div class="filters">
      <button class="chip" [class.chip--on]="kind() === 'all'" (click)="kind.set('all')">Todos</button>
      <button class="chip" [class.chip--on]="kind() === 'contact'" (click)="kind.set('contact')">Contacto</button>
      <button class="chip" [class.chip--on]="kind() === 'newsletter'" (click)="kind.set('newsletter')">Newsletter</button>
      <button class="chip" [class.chip--on]="kind() === 'maraton'" (click)="kind.set('maraton')">Maratón</button>
      <button class="chip" [class.chip--on]="kind() === 'email'" (click)="kind.set('email')">Correos</button>
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
            <td mat-cell *matCellDef="let t">
              @for (k of t.kinds; track k) { <span class="badge">{{ label(k) }}</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let t">{{ t.name || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let t"><a [href]="'mailto:' + t.email">{{ t.email }}</a></td>
          </ng-container>
          <ng-container matColumnDef="message">
            <th mat-header-cell *matHeaderCellDef>Último mensaje</th>
            <td mat-cell *matCellDef="let t">
              @if (t.last.subject) { <strong>{{ t.last.subject }}</strong><br /> }
              <span class="msg">{{ t.last.message || (t.last.country ? ('País: ' + t.last.country) : '—') }}</span>
              @if (t.count > 1) { <span class="count">{{ t.count }} mensajes</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let t">
              @if (t.unread > 0) { <span class="badge badge--new">{{ t.unread > 1 ? t.unread + ' nuevos' : 'Nuevo' }}</span> }
              @else if (t.last.is_replied) { <span class="badge badge--replied">Respondido</span> }
              @else { <span class="badge badge--read">Leído</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let t">{{ t.last.created | date: 'dd-MM-yyyy HH:mm' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let t">
              <button class="act" [class.act--on]="t.unread === 0" (click)="toggleRead(t)"
                      [title]="t.unread > 0 ? 'Marcar todo como leído' : 'Marcar como no leído'">
                <mat-icon>{{ t.unread > 0 ? 'mark_email_unread' : 'mark_email_read' }}</mat-icon>
              </button>
              <button class="act act--reply" (click)="openReply(t)" title="Responder por correo">
                <mat-icon>reply</mat-icon>
              </button>
              <button class="act act--conv" (click)="openConversation(t)" title="Ver conversación">
                <mat-icon>forum</mat-icon>
              </button>
              @if (t.last.is_replied) {
                <button class="act act--on" (click)="toggleReplied(t)" title="Quitar 'respondido'">
                  <mat-icon>task_alt</mat-icon>
                </button>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" [class.row--unread]="row.unread > 0"></tr>
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
    .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:.75rem; background:#ececf2; color:#555; margin-right:4px; }
    .badge--new { background:#fde68a; color:#92400e; }
    .badge--read { background:#e0e7ff; color:#3730a3; }
    .badge--replied { background:#d1fae5; color:#065f46; }
    .count { display:inline-block; margin-left:8px; padding:1px 8px; border-radius:999px; font-size:.72rem; background:#f0e9fa; color:#5b3a8a; font-weight:600; white-space:nowrap; }
    .act { border:none; background:transparent; cursor:pointer; color:var(--fvx-text-muted,#6b6478); padding:4px; border-radius:6px; }
    .act:hover { background:var(--fvx-bg-surface-2,#f1f1f6); }
    .act--on { color:var(--fvx-link,#5b3a8a); }
    .act--reply { color:#1f7a45; }
    .act--reply:hover { background:#e3f6ea; }
    .act--conv { color:#5b3a8a; }
    .act--conv:hover { background:#f0e9fa; }
    .act mat-icon { font-size:20px; width:20px; height:20px; }
    .row--unread td { font-weight:600; }
    .msg { color:var(--fvx-text-secondary,#6b6478); font-size:.88rem; }
    .state { display:flex; align-items:center; gap:8px; padding:32px; color:var(--fvx-text-muted,#6b6478); justify-content:center; }
    .state--error { color:#c0392b; }
  `],
})
export class MessagesComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  cols = ['kind', 'name', 'email', 'message', 'status', 'created', 'actions'];
  rows = signal<Lead[]>([]);
  kind = signal<string>('all');
  loading = signal(true);
  error = signal('');
  breadcrumbs = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Mensajes' },
  ];

  /** Agrupa los leads por persona (email en minúsculas). Los leads llegan
   * ordenados por -created, así que el primero de cada email es el último
   * mensaje recibido y las filas quedan ordenadas por actividad reciente. */
  threads = computed<Thread[]>(() => {
    const map = new Map<string, Thread>();
    for (const m of this.rows()) {
      const key = (m.email || '').trim().toLowerCase();
      let t = map.get(key);
      if (!t) {
        t = { key, email: m.email, name: m.name || '', last: m, count: 0, unread: 0, kinds: [] };
        map.set(key, t);
      }
      t.count++;
      if (!m.is_read) t.unread++;
      if (!t.kinds.includes(m.kind)) t.kinds.push(m.kind);
      if (!t.name && m.name) t.name = m.name;
    }
    return [...map.values()];
  });

  filtered = computed(() =>
    this.kind() === 'all' ? this.threads() : this.threads().filter(t => t.kinds.includes(this.kind())),
  );

  label(k: string): string {
    return KIND_LABELS[k] ?? k;
  }

  /** Marca TODO el hilo como leído (o el último mensaje como no leído). */
  toggleRead(t: Thread): void {
    if (t.unread > 0) {
      this.markThread(t, { is_read: true });
    } else {
      this.markThread(t, { is_read: false });
    }
  }

  /** Marca respondido/no todo el hilo; al responder, además queda leído. */
  toggleReplied(t: Thread): void {
    const next = !t.last.is_replied;
    this.markThread(t, next ? { is_read: true, is_replied: true } : { is_replied: false });
  }

  /** Abre el hilo de conversación con esa persona (sitio + correos). */
  openConversation(t: Thread): void {
    this.dialog.open(ConversationDialogComponent, {
      data: { email: t.email, name: t.name } as ConversationDialogData,
      panelClass: 'fvx-crud-dialog',
      maxWidth: '94vw',
    });
    // Abrir la conversación deja el hilo como leído (como cualquier bandeja).
    if (t.unread > 0) this.markThread(t, { is_read: true });
  }

  /** Responde por correo al ÚLTIMO mensaje de la persona. */
  openReply(t: Thread): void {
    const m = t.last;
    const ref = this.dialog.open(EntityFormDialogComponent, {
      data: {
        title: `Responder a ${t.name || t.email}`,
        mode: 'create',
        fields: [
          { key: 'subject', label: 'Asunto', type: 'text', colspan: 2,
            defaultValue: m.subject ? `Re: ${m.subject}` : 'Respuesta a tu mensaje' },
          { key: 'body', label: 'Mensaje', type: 'textarea', required: true, colspan: 2,
            info: `Se enviará por correo a ${t.email}` },
        ],
        submitHandler: (value: Record<string, any>) =>
          this.http.post<Lead>(`${environment.apiUrl}/leads/${m.id}/reply/`, value),
      },
      panelClass: 'fvx-crud-dialog', width: '560px', maxWidth: '94vw',
    });
    ref.afterClosed().subscribe((updated: Lead | undefined) => {
      if (!updated) return;
      this.rows.update(list => list.map(x => (x.id === m.id ? { ...x, ...updated } : x)));
      this.snack.open('Respuesta enviada por correo.', 'OK', { duration: 4000 });
    });
  }

  /** Actualiza leído/respondido de TODOS los mensajes de la persona (backend
   * ``/leads/mark-thread/``) y refleja el cambio en las filas locales. */
  private markThread(t: Thread, body: { is_read?: boolean; is_replied?: boolean }): void {
    this.http.post(`${environment.apiUrl}/leads/mark-thread/`, { email: t.email, ...body }).subscribe({
      next: () => this.rows.update(list =>
        list.map(x =>
          (x.email || '').trim().toLowerCase() === t.key ? { ...x, ...body } : x,
        ),
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
