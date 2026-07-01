import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../core/services/notification.service';
import { environment } from '../../../environments/environment';

interface BroadcastPlan { id: number; name: string; count: number; }

/**
 * Correos masivos: redacta un mensaje con un editor enriquecido y lo envía a los
 * miembros ACTIVOS de las membresías elegidas (o a todos). Permite mandar una
 * prueba a una dirección antes del envío masivo. El backend envuelve el HTML en
 * la plantilla de marca y envía uno a uno (sin exponer la lista de correos).
 */
@Component({
  selector: 'app-broadcast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <div class="page-container">
      <app-page-header
        title="Correos masivos"
        subtitle="Escribe un mensaje y envíalo a los miembros de las membresías que elijas."
        [breadcrumbs]="breadcrumbs">
      </app-page-header>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <div class="grid">
        <!-- Destinatarios -->
        <section class="card">
          <h3><mat-icon>groups</mat-icon> ¿A quién enviar?</h3>
          <p class="hint">Sin selección = a todos los miembros activos ({{ totalActive() }}).</p>
          <div class="plans">
            @for (p of plans(); track p.id) {
              <label class="plan" [class.on]="selected().has(p.id)">
                <input type="checkbox" [checked]="selected().has(p.id)" (change)="togglePlan(p.id)" />
                <span class="plan__name">{{ p.name }}</span>
                <span class="plan__n">{{ p.count }}</span>
              </label>
            }
          </div>
          <div class="recipients">
            <mat-icon>send</mat-icon>
            Se enviará a <strong>{{ recipientEstimate() }}</strong>
            @if (selected().size) { <span>(aprox., sin repetir correos)</span> }
          </div>
        </section>

        <!-- Mensaje -->
        <section class="card">
          <h3><mat-icon>edit</mat-icon> Mensaje</h3>
          <label class="fld">
            <span>Asunto</span>
            <input type="text" [(ngModel)]="subject" placeholder="Asunto del correo" maxlength="180" />
          </label>

          <span class="fld-label">Contenido</span>
          <div class="editor">
            <div class="toolbar">
              <button type="button" (mousedown)="cmd($event, 'bold')" title="Negrita"><b>B</b></button>
              <button type="button" (mousedown)="cmd($event, 'italic')" title="Cursiva"><i>I</i></button>
              <button type="button" (mousedown)="cmd($event, 'underline')" title="Subrayado"><u>U</u></button>
              <span class="sep"></span>
              <button type="button" (mousedown)="cmd($event, 'insertUnorderedList')" title="Lista"><mat-icon>format_list_bulleted</mat-icon></button>
              <button type="button" (mousedown)="cmd($event, 'insertOrderedList')" title="Lista numerada"><mat-icon>format_list_numbered</mat-icon></button>
              <span class="sep"></span>
              <button type="button" (mousedown)="makeLink($event)" title="Enlace"><mat-icon>link</mat-icon></button>
              <button type="button" (mousedown)="cmd($event, 'removeFormat')" title="Quitar formato"><mat-icon>format_clear</mat-icon></button>
            </div>
            <div #editor class="area" contenteditable="true" (input)="onEdit()"
                 (blur)="onEdit()" data-placeholder="Escribe aquí el contenido del correo…"></div>
          </div>

          <div class="actions">
            <div class="test">
              <input type="email" [(ngModel)]="testEmail" placeholder="tu-correo@ejemplo.com" />
              <button class="btn btn--ghost" [disabled]="sending() || !canSend()" (click)="sendTest()">
                <mat-icon>outgoing_mail</mat-icon> Enviar prueba
              </button>
            </div>
            <button class="btn btn--primary" [disabled]="sending() || !canSend()" (click)="send()">
              <mat-icon>campaign</mat-icon> Enviar a los miembros
            </button>
          </div>
          @if (sending()) { <p class="sending">Enviando…</p> }
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .grid { display:grid; grid-template-columns: 320px 1fr; gap:18px; align-items:start; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background:var(--fvx-surface,#fff); border:1px solid var(--fvx-border,#e6e6ef); border-radius:14px; padding:18px 20px; }
    .card h3 { display:flex; align-items:center; gap:8px; margin:0 0 6px; font-size:1rem; color:var(--fvx-text-primary,#2a2333); }
    .card h3 mat-icon { color:var(--fvx-primary,#5b3a8a); font-size:20px; width:20px; height:20px; }
    .hint { color:var(--fvx-text-muted,#6b6478); font-size:.83rem; margin:0 0 12px; }
    .plans { display:flex; flex-direction:column; gap:8px; max-height:340px; overflow:auto; }
    .plan { display:flex; align-items:center; gap:10px; border:1px solid var(--fvx-border,#e6e6ef); border-radius:10px; padding:9px 12px; cursor:pointer; }
    .plan.on { border-color:var(--fvx-primary,#5b3a8a); background:#f6f2fb; }
    .plan input { accent-color:var(--fvx-primary,#5b3a8a); }
    .plan__name { flex:1; font-size:.9rem; color:var(--fvx-text-primary,#2a2333); }
    .plan__n { background:#f0eaf6; color:#5b3a8a; border-radius:999px; padding:1px 9px; font-size:.74rem; font-weight:700; }
    .recipients { display:flex; align-items:center; gap:6px; margin-top:14px; padding-top:14px; border-top:1px solid var(--fvx-border,#eee); font-size:.88rem; color:var(--fvx-text-primary,#2a2333); }
    .recipients mat-icon { color:var(--fvx-primary,#5b3a8a); font-size:18px; width:18px; height:18px; }
    .recipients span { color:var(--fvx-text-muted,#6b6478); font-size:.8rem; }
    .fld { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    .fld span, .fld-label { font-size:.8rem; font-weight:600; color:var(--fvx-text-primary,#2a2333); }
    .fld input { border:1px solid var(--fvx-border,#d9d3e4); border-radius:9px; padding:10px 12px; font-size:.92rem; }
    .fld-label { display:block; margin-bottom:6px; }
    .editor { border:1px solid var(--fvx-border,#d9d3e4); border-radius:10px; overflow:hidden; }
    .toolbar { display:flex; align-items:center; gap:2px; padding:6px 8px; background:#faf8fd; border-bottom:1px solid var(--fvx-border,#eee); flex-wrap:wrap; }
    .toolbar button { display:inline-flex; align-items:center; justify-content:center; min-width:32px; height:32px; border:none; background:none; border-radius:7px; cursor:pointer; color:#4a4358; font-size:.95rem; }
    .toolbar button:hover { background:#efe9f7; }
    .toolbar mat-icon { font-size:19px; width:19px; height:19px; }
    .toolbar .sep { width:1px; height:20px; background:var(--fvx-border,#ddd); margin:0 4px; }
    .area { min-height:240px; padding:14px 16px; font-size:.95rem; line-height:1.6; color:#2a2333; outline:none; }
    .area:empty::before { content: attr(data-placeholder); color:#a89db8; }
    .actions { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:16px; flex-wrap:wrap; }
    .test { display:flex; align-items:center; gap:8px; flex:1; min-width:240px; }
    .test input { flex:1; border:1px solid var(--fvx-border,#d9d3e4); border-radius:9px; padding:9px 12px; font-size:.88rem; }
    .btn { display:inline-flex; align-items:center; gap:6px; border:none; border-radius:999px; padding:10px 18px; font-size:.9rem; font-weight:700; cursor:pointer; }
    .btn:disabled { opacity:.55; cursor:default; }
    .btn mat-icon { font-size:19px; width:19px; height:19px; }
    .btn--primary { background:var(--fvx-primary,#5b3a8a); color:#fff; }
    .btn--ghost { background:#f0eaf6; color:#5b3a8a; }
    .sending { color:var(--fvx-text-muted,#6b6478); font-size:.85rem; margin:10px 0 0; }
  `],
})
export class BroadcastComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);

  private editorRef = viewChild<ElementRef<HTMLDivElement>>('editor');

  breadcrumbs = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Correos masivos' },
  ];

  plans = signal<BroadcastPlan[]>([]);
  totalActive = signal(0);
  loading = signal(true);
  sending = signal(false);
  selected = signal<Set<number>>(new Set());

  subject = '';
  testEmail = '';
  html = signal('');

  private base = `${environment.apiUrl}/broadcast/`;

  /** Estimación de destinatarios: suma de los planes elegidos, o el total. */
  recipientEstimate = computed(() => {
    const sel = this.selected();
    if (!sel.size) return this.totalActive();
    return this.plans().filter(p => sel.has(p.id)).reduce((n, p) => n + p.count, 0);
  });

  canSend = computed(() => !!this.subject.trim() && !!this.html().trim());

  togglePlan(id: number): void {
    const next = new Set(this.selected());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selected.set(next);
  }

  /** Ejecuta un comando de formato manteniendo el foco en el editor. */
  cmd(event: Event, command: string): void {
    event.preventDefault();
    this.editorRef()?.nativeElement.focus();
    document.execCommand(command, false);
    this.onEdit();
  }

  makeLink(event: Event): void {
    event.preventDefault();
    const url = window.prompt('URL del enlace (incluye https://):', 'https://');
    if (!url) return;
    this.editorRef()?.nativeElement.focus();
    document.execCommand('createLink', false, url);
    this.onEdit();
  }

  onEdit(): void {
    this.html.set(this.editorRef()?.nativeElement.innerHTML.trim() ?? '');
  }

  async ngOnInit(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ plans: BroadcastPlan[]; total_active: number }>(this.base),
      );
      this.plans.set(res?.plans ?? []);
      this.totalActive.set(res?.total_active ?? 0);
    } catch {
      this.notify.error('No se pudieron cargar las membresías.');
    } finally {
      this.loading.set(false);
    }
  }

  async sendTest(): Promise<void> {
    const to = this.testEmail.trim();
    if (!to || !to.includes('@')) { this.notify.error('Escribe un correo válido para la prueba.'); return; }
    this.sending.set(true);
    try {
      await firstValueFrom(this.http.post(this.base, {
        subject: this.subject.trim(), html: this.html(), test_to: to,
      }));
      this.notify.success(`Prueba enviada a ${to}.`);
    } catch {
      this.notify.error('No se pudo enviar la prueba.');
    } finally {
      this.sending.set(false);
    }
  }

  send(): void {
    const n = this.recipientEstimate();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Enviar correo masivo',
        message: `Se enviará el correo a ${n} miembro(s). Esta acción no se puede deshacer. ¿Continuar?`,
        confirmText: 'Enviar',
        color: 'primary',
      } as ConfirmDialogData,
      panelClass: 'fvx-crud-dialog', width: '440px', maxWidth: '92vw',
    });
    ref.afterClosed().subscribe(async confirmed => {
      if (!confirmed) return;
      this.sending.set(true);
      try {
        const res = await firstValueFrom(this.http.post<{ sent: number; recipients: number }>(this.base, {
          subject: this.subject.trim(), html: this.html(), plan_ids: [...this.selected()],
        }));
        this.notify.success(`Correo enviado a ${res?.sent ?? 0} miembro(s).`);
      } catch {
        this.notify.error('No se pudo enviar el correo.');
      } finally {
        this.sending.set(false);
      }
    });
  }
}
