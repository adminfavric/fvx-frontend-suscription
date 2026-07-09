import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent, type PageBreadcrumb } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface Reminder {
  key: string;
  title: string;
  description: string;
  schedule: string;
  has_test: boolean;
  task: string;
  registered: boolean;
  enabled: boolean;
  last_run_at: string | null;
  lead_minutes: number | null;
}
interface NotificationsData {
  reminders: Reminder[];
  email: { host: string; from_email: string; looks_real: boolean };
  celery: { healthy: boolean; last_run_at: string | null };
}

/**
 * Panel de notificaciones automáticas: muestra los avisos por correo programados
 * (aviso de sesión en vivo 30 min antes, recordatorio de vencimiento), permite
 * prenderlos/apagarlos, ver el estado de Celery y del correo, y disparar el aviso
 * de sesiones en vivo como prueba. El motor corre por detrás (Celery beat); acá
 * solo se ve/controla.
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatIconModule,
    MatSlideToggleModule,
    MatButtonModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      title="Notificaciones"
      subtitle="Avisos automáticos por correo. El envío corre solo en segundo plano; aquí los prendes, apagas y revisas su estado."
      [breadcrumbs]="breadcrumbs">
    </app-page-header>

    @if (loading()) {
      <div class="center">
        <span class="loader" aria-hidden="true"></span>
        <p class="loadtxt">Cargando notificaciones…</p>
      </div>
    } @else if (data(); as d) {
      <!-- Estado del sistema -->
      <div class="status">
        <span class="pill" [class.pill--ok]="d.celery.healthy" [class.pill--warn]="!d.celery.healthy">
          <mat-icon>{{ d.celery.healthy ? 'bolt' : 'warning' }}</mat-icon>
          {{ d.celery.healthy ? 'Motor de tareas activo' : 'Motor de tareas sin actividad reciente' }}
        </span>
        <span class="pill" [class.pill--ok]="d.email.looks_real" [class.pill--warn]="!d.email.looks_real">
          <mat-icon>{{ d.email.looks_real ? 'mark_email_read' : 'unsubscribe' }}</mat-icon>
          {{ d.email.looks_real ? 'Correo configurado (' + d.email.host + ')' : 'Correo NO configurado para producción (' + (d.email.host || '—') + ')' }}
        </span>
      </div>

      @if (!d.celery.healthy) {
        <p class="hint hint--warn">
          <mat-icon>info</mat-icon>
          No se registran corridas recientes de las tareas. Verifica que los contenedores
          <strong>celery_worker</strong> y <strong>celery_beat</strong> estén corriendo en el servidor.
        </p>
      }
      @if (!d.email.looks_real) {
        <p class="hint hint--warn">
          <mat-icon>info</mat-icon>
          El correo apunta a un entorno local y <strong>no enviará</strong> en producción. Configura un
          SMTP real (<code>EMAIL_HOST/PORT/USER/PASSWORD</code>) en el <code>.env</code> del servidor.
        </p>
      }

      <!-- Avisos programados -->
      <div class="cards">
        @for (r of d.reminders; track r.task) {
          <article class="card" [class.card--off]="!r.enabled">
            <div class="card__top">
              <div>
                <h3>{{ r.title }}</h3>
                <p class="desc">{{ r.description }}</p>
              </div>
              <mat-slide-toggle
                [checked]="r.enabled"
                [disabled]="!r.registered || saving()"
                (change)="toggle(r, $event.checked)">
              </mat-slide-toggle>
            </div>

            <div class="meta">
              <span class="chip"><mat-icon>schedule</mat-icon> {{ r.schedule }}</span>
              @if (r.lead_minutes) {
                <span class="chip"><mat-icon>alarm</mat-icon> {{ r.lead_minutes }} min antes</span>
              }
              <span class="chip chip--muted">
                <mat-icon>history</mat-icon>
                Última corrida: {{ r.last_run_at ? (r.last_run_at | date: 'dd-MM-yyyy HH:mm') : 'Nunca' }}
              </span>
              @if (!r.registered) {
                <span class="chip chip--warn"><mat-icon>error_outline</mat-icon> No registrada (falta migración/Celery)</span>
              }
            </div>

            @if (r.has_test) {
              <div class="actions">
                <button mat-stroked-button [disabled]="running() || !r.enabled" (click)="runLive()">
                  <mat-icon>send</mat-icon>
                  {{ running() ? 'Enviando…' : 'Enviar avisos ahora (prueba)' }}
                </button>
                <span class="note">Solo envía si hay una sesión en los próximos {{ r.lead_minutes || 30 }} min. No repite avisos ya enviados.</span>
              </div>
            }
          </article>
        }
      </div>
    } @else {
      <div class="errbox">
        <p class="hint hint--warn"><mat-icon>error_outline</mat-icon> No se pudo cargar el panel de notificaciones.</p>
        <button mat-stroked-button (click)="reload()"><mat-icon>refresh</mat-icon> Reintentar</button>
      </div>
    }
  `,
  styles: [`
    :host { display:block; }
    .center { display:flex; flex-direction:column; align-items:center; gap:14px; padding:60px 0; }
    .loader { width:34px; height:34px; border-radius:50%; border:3px solid #e7e2ef; border-top-color:#5b3a8a; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .loadtxt { color:#6b6478; font-size:.9rem; margin:0; }
    .errbox { display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-top:16px; }
    .status { display:flex; flex-wrap:wrap; gap:12px; margin:8px 0 4px; }
    .pill {
      display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border-radius:999px;
      font-size:.86rem; font-weight:600; border:1px solid transparent;
    }
    .pill mat-icon { font-size:18px; width:18px; height:18px; }
    .pill--ok { background:rgba(63,164,106,.12); color:#2f8a59; border-color:rgba(63,164,106,.35); }
    .pill--warn { background:rgba(217,119,6,.12); color:#b45309; border-color:rgba(217,119,6,.35); }
    .hint {
      display:flex; align-items:flex-start; gap:8px; margin:10px 0 0; padding:12px 14px; border-radius:12px;
      font-size:.88rem; line-height:1.5;
    }
    .hint mat-icon { font-size:19px; width:19px; height:19px; flex:0 0 auto; margin-top:1px; }
    .hint--warn { background:rgba(217,119,6,.08); color:#92400e; border:1px solid rgba(217,119,6,.25); }
    .hint code { background:rgba(0,0,0,.06); padding:1px 6px; border-radius:6px; font-size:.85em; }

    .cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap:18px; margin-top:20px; }
    .card {
      background:#fff; border:1px solid #e7e2ef; border-radius:16px; padding:22px 22px 20px;
      box-shadow:0 10px 30px -22px rgba(46,26,82,.35); transition:opacity .15s;
    }
    .card--off { opacity:.72; }
    .card__top { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
    .card__top h3 { margin:0 0 6px; font-size:1.1rem; color:#2e1a52; }
    .desc { margin:0; color:#6b6478; font-size:.9rem; line-height:1.55; }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
    .chip {
      display:inline-flex; align-items:center; gap:6px; padding:5px 11px; border-radius:999px;
      background:#f4f0f8; color:#5b3a8a; font-size:.78rem; font-weight:600;
    }
    .chip mat-icon { font-size:15px; width:15px; height:15px; }
    .chip--muted { background:#f3f4f6; color:#6b7280; }
    .chip--warn { background:rgba(217,119,6,.12); color:#b45309; }
    .actions { display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; margin-top:18px; padding-top:16px; border-top:1px solid #f0ecf5; }
    .actions button mat-icon { margin-right:4px; }
    .note { color:#9a93a8; font-size:.78rem; max-width:38ch; line-height:1.4; }
  `],
})
export class NotificationsComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);

  readonly breadcrumbs: PageBreadcrumb[] = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Notificaciones' },
  ];

  readonly data = signal<NotificationsData | null>(null);
  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly running = signal<boolean>(false);

  private get base(): string { return `${environment.apiUrl}/notifications`; }

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      // timeout: si la petición se cuelga, cae al estado de error (no queda en blanco).
      const raw = await firstValueFrom(
        this.http.get<Partial<NotificationsData>>(`${this.base}/`).pipe(timeout(15000)),
      );
      // Normalizamos: el panel nunca debe crashear si el backend devuelve una
      // forma parcial (p. ej. una versión anterior sin `celery`).
      this.data.set({
        reminders: raw?.reminders ?? [],
        email: raw?.email ?? { host: '', from_email: '', looks_real: false },
        celery: raw?.celery ?? { healthy: false, last_run_at: null },
      });
    } catch (e) {
      console.error('[notificaciones] no se pudo cargar el panel:', e);
      this.data.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async toggle(r: Reminder, enabled: boolean): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(this.http.post(`${this.base}/`, { task: r.task, enabled }));
      // Refleja el cambio en el estado local sin recargar todo.
      const d = this.data();
      if (d) {
        this.data.set({
          ...d,
          reminders: d.reminders.map(x => (x.task === r.task ? { ...x, enabled } : x)),
        });
      }
      this.snack.open(enabled ? 'Aviso activado.' : 'Aviso desactivado.', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('No se pudo cambiar el aviso.', 'Cerrar', { duration: 4000 });
      await this.reload(); // resincroniza el toggle con el servidor
    } finally {
      this.saving.set(false);
    }
  }

  async runLive(): Promise<void> {
    this.running.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{ sent: number }>(`${this.base}/run-live/`, {}),
      );
      const n = res?.sent ?? 0;
      this.snack.open(
        n > 0 ? `Se enviaron ${n} aviso(s).` : 'No hay sesiones en los próximos 30 min (0 enviados).',
        'OK',
        { duration: 4000 },
      );
    } catch {
      this.snack.open('No se pudo enviar la prueba.', 'Cerrar', { duration: 4000 });
    } finally {
      this.running.set(false);
    }
  }
}
