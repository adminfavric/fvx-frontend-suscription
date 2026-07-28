import { ChangeDetectionStrategy, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

export interface ConversationDialogData {
  email: string;
  name: string;
}

interface ConversationItem {
  direction: 'in' | 'out';
  kind: string;
  kind_label: string;
  subject: string;
  body: string;
  who: string;
  created: string;
}

/**
 * Hilo de conversación con una persona: sus mensajes del sitio y respuestas por
 * correo (izquierda) + lo que se le envió desde el panel (derecha, del historial).
 */
@Component({
  selector: 'app-conversation-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatDialogModule, MatIconModule],
  template: `
    <div class="conv">
      <div class="conv__head">
        <div>
          <h2>{{ data.name || data.email }}</h2>
          <span class="mail">{{ data.email }}</span>
        </div>
        <button class="close" (click)="ref.close()" aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </div>

      <div class="conv__body">
        @if (loading()) {
          <p class="muted center">Cargando conversación…</p>
        } @else if (!items().length) {
          <p class="muted center">Sin mensajes con esta persona todavía.</p>
        } @else {
          @for (it of items(); track $index) {
            <div class="msg" [class.msg--out]="it.direction === 'out'">
              <div class="bubble" [class.bubble--out]="it.direction === 'out'">
                <div class="meta">
                  <span class="tag" [class.tag--out]="it.direction === 'out'">{{ it.kind_label }}</span>
                  <span class="who">{{ it.direction === 'out' ? ('Enviado por ' + it.who) : it.who }}</span>
                  <span class="date">{{ it.created | date: 'dd-MM-yyyy HH:mm' }}</span>
                </div>
                @if (it.subject) { <p class="subj">{{ it.subject }}</p> }
                @if (it.body) { <p class="body">{{ it.body }}</p> }
              </div>
            </div>
          }
        }
      </div>

      <p class="hint">
        <mat-icon>info</mat-icon>
        Las respuestas por correo llegan aquí automáticamente cada ~5 minutos. De los correos
        enviados se muestra el asunto (el contenido completo queda en Gmail).
      </p>
    </div>
  `,
  styles: [`
    .conv { display:flex; flex-direction:column; max-height:82vh; width:min(680px, 92vw); }
    .conv__head { display:flex; align-items:flex-start; justify-content:space-between; padding:18px 22px 12px; border-bottom:1px solid #eee7f3; }
    .conv__head h2 { margin:0; font-size:1.15rem; color:#2a2333; }
    .mail { color:#8a8398; font-size:.82rem; }
    .close { border:none; background:#f1eef6; border-radius:50%; width:34px; height:34px; display:grid; place-items:center; cursor:pointer; color:#5b3a8a; }
    .conv__body { overflow-y:auto; padding:18px 22px; display:flex; flex-direction:column; gap:12px; background:#faf8fc; min-height:220px; }
    .center { text-align:center; margin:auto; }
    .muted { color:#9a93a8; font-size:.9rem; }
    .msg { display:flex; }
    .msg--out { justify-content:flex-end; }
    .bubble { max-width:82%; background:#fff; border:1px solid #e7e0f0; border-radius:14px 14px 14px 4px; padding:10px 14px; }
    .bubble--out { background:#f0e9fa; border-color:#ddd0ee; border-radius:14px 14px 4px 14px; }
    .meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px; }
    .tag { background:#eef1f6; color:#5a6472; border-radius:999px; padding:1px 8px; font-size:.66rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
    .tag--out { background:#5b3a8a; color:#fff; }
    .who { color:#7a7390; font-size:.72rem; font-weight:600; }
    .date { color:#a9a2b8; font-size:.72rem; }
    .subj { margin:2px 0; font-weight:700; font-size:.88rem; color:#2a2333; }
    .body { margin:2px 0 0; font-size:.88rem; color:#4a4459; line-height:1.55; white-space:pre-line; }
    .hint { display:flex; align-items:center; gap:7px; margin:0; padding:10px 22px; color:#9a93a8; font-size:.76rem; border-top:1px solid #eee7f3; }
    .hint mat-icon { font-size:16px; width:16px; height:16px; flex:0 0 auto; }
  `],
})
export class ConversationDialogComponent implements OnInit {
  private http = inject(HttpClient);
  readonly items = signal<ConversationItem[]>([]);
  readonly loading = signal(true);

  constructor(
    public ref: MatDialogRef<ConversationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConversationDialogData,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ items: ConversationItem[] }>(`${environment.apiUrl}/leads/conversation/`, {
          params: { email: this.data.email },
        }),
      );
      this.items.set(res?.items ?? []);
    } catch {
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
