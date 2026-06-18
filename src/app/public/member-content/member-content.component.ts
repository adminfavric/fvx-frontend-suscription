import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ContentViewerDialogComponent } from './content-viewer-dialog.component';
import { MemberAuthService, MemberContentItem, MemberSubscription } from '../services/member-auth.service';

/**
 * Área de miembros: muestra el contenido de los planes a los que el suscriptor
 * tiene una suscripción activa. Renderiza cada item según su tipo.
 */
@Component({
  selector: 'app-member-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, DatePipe],
  template: `
    <section class="mc">
      <header class="mc__head">
        <div>
          <span class="eyebrow">Área de miembros</span>
          <h1>Mi contenido</h1>
          <p class="who">{{ member.email() }}</p>
        </div>
        <button class="logout" (click)="logout()"><mat-icon>logout</mat-icon> Salir</button>
      </header>

      @if (subs().length) {
        <section class="subs">
          <h2 class="subs__title">Mi suscripción</h2>
          @for (s of subs(); track s.subscription_id) {
            <div class="sub-card">
              <div class="sub-card__top">
                <strong>{{ s.plan_name }}</strong>
                <span class="badge" [class.badge--ok]="s.status === 1 && !s.cancel_at_period_end" [class.badge--off]="s.status !== 1">{{ subStatus(s) }}</span>
              </div>
              <div class="sub-card__meta">
                @if (s.card?.last4) { <span><mat-icon>credit_card</mat-icon> {{ s.card?.type }} ••••{{ s.card?.last4 }}</span> }
                @if (s.status === 1 && !s.cancel_at_period_end && s.next_invoice_date) { <span><mat-icon>event</mat-icon> Próximo cobro: {{ s.next_invoice_date | date: 'dd-MM-yyyy' }}</span> }
                @if (s.cancel_at_period_end) { <span class="warn"><mat-icon>info</mat-icon> Acceso hasta el {{ s.period_end | date: 'dd-MM-yyyy' }} (cancelada)</span> }
              </div>
              <div class="sub-card__actions">
                @if (s.status === 1 && !s.cancel_at_period_end) {
                  <button class="cancel-btn" (click)="cancel(s)" [disabled]="busy()">
                    {{ busy() ? 'Cancelando…' : 'Cancelar suscripción' }}
                  </button>
                }
                <a class="other-btn" routerLink="/membresias">Ver otras membresías</a>
              </div>
            </div>
          }
        </section>
      }

      @if (loading()) {
        <p class="state">Cargando tu contenido…</p>
      } @else if (error()) {
        <p class="state state--error"><mat-icon>error_outline</mat-icon> {{ error() }}</p>
      } @else if (plans().length === 0) {
        <div class="empty">
          <mat-icon>lock</mat-icon>
          <h2>Aún no tienes membresías activas</h2>
          <p>Cuando te suscribas a una membresía, tu contenido aparecerá aquí.</p>
          <a class="btn" routerLink="/membresias">Ver membresías</a>
        </div>
      } @else {
        <section class="lib">
          <div class="lib__head">
            <h2 class="lib__title">Biblioteca</h2>
            <div class="filters">
              <button class="chip" [class.chip--on]="kind() === 'all'" (click)="kind.set('all')">Todo</button>
              @for (k of kindsPresent(); track k) {
                <button class="chip" [class.chip--on]="kind() === k" (click)="kind.set(k)">{{ kindLabel(k) }}</button>
              }
            </div>
          </div>

          <div class="cards">
            @for (it of filtered(); track it.id) {
              <article class="lcard" (click)="open(it)">
                <div class="lcard__cover" [attr.data-kind]="it.kind">
                  @if (it.image_url) { <img [src]="it.image_url" [alt]="it.title" loading="lazy" /> }
                  @else { <mat-icon class="lcard__bgicon">{{ iconFor(it.kind) }}</mat-icon> }
                  <span class="lcard__play"><mat-icon>{{ playIcon(it.kind) }}</mat-icon></span>
                  <span class="lcard__badge"><mat-icon>{{ iconFor(it.kind) }}</mat-icon> {{ kindLabel(it.kind) }}</span>
                </div>
                <div class="lcard__body">
                  <h3>{{ it.title }}</h3>
                  @if (it.text) { <p>{{ it.text }}</p> }
                </div>
              </article>
            } @empty {
              <p class="state">No hay contenido en esta categoría todavía.</p>
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    :host { --v:#5b3a8a; --vd:#2e1a52; --gold:#d9a441; display:block; background: var(--color-bg,#faf6ef); min-height:70vh; }
    .mc { max-width: 980px; margin:0 auto; padding: clamp(28px,5vw,56px) clamp(16px,4vw,40px); }
    .mc__head { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:28px; }
    .eyebrow { color: var(--gold); letter-spacing:.16em; text-transform:uppercase; font-size:.74rem; font-weight:600; }
    .mc__head h1 { margin:6px 0 2px; color: var(--vd); font-size: clamp(1.6rem,3vw,2.2rem); }
    .who { color:#6b6478; margin:0; font-size:.9rem; }
    .logout { display:inline-flex; align-items:center; gap:6px; background:none; border:1px solid #d9cdbb; border-radius:999px; padding:8px 14px; cursor:pointer; color:#2a2333; font-size:.85rem; }
    .logout mat-icon { font-size:18px; width:18px; height:18px; }

    .subs { margin-bottom:32px; }
    .subs__title { color: var(--vd); font-size:1.1rem; margin:0 0 12px; }
    .sub-card { background:#fff; border:1px solid #eadfce; border-radius:14px; padding:18px 20px; }
    .sub-card__top { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .sub-card__top strong { color:#2a2333; font-size:1.05rem; }
    .badge { font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:999px; background:#ececf2; color:#555; }
    .badge--ok { background:#e3f6ea; color:#1f7a45; }
    .badge--off { background:#fdecea; color:#c0392b; }
    .sub-card__meta { display:flex; flex-wrap:wrap; gap:16px; margin:12px 0; color:#6b6478; font-size:.88rem; }
    .sub-card__meta span { display:inline-flex; align-items:center; gap:5px; }
    .sub-card__meta mat-icon { font-size:17px; width:17px; height:17px; color: var(--v); }
    .sub-card__meta .warn { color:#b9842b; }
    .sub-card__meta .warn mat-icon { color:#b9842b; }
    .sub-card__actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
    .cancel-btn { background:none; border:1px solid #e0b4b0; color:#c0392b; border-radius:999px; padding:8px 16px; font-size:.85rem; cursor:pointer; }
    .cancel-btn:hover:not(:disabled) { background:#fdecea; }
    .cancel-btn:disabled { opacity:.6; cursor:default; }
    .other-btn { display:inline-flex; align-items:center; background: color-mix(in srgb, var(--v) 12%, #fff); color: var(--v); border-radius:999px; padding:8px 16px; font-size:.85rem; font-weight:600; text-decoration:none; }
    .other-btn:hover { background: color-mix(in srgb, var(--v) 20%, #fff); }

    .state { color:#6b6478; padding:20px 0; }
    .state--error { color:#b91c1c; display:flex; gap:6px; align-items:center; }
    .empty { text-align:center; padding:48px 0; color:#6b6478; }
    .empty mat-icon { font-size:48px; width:48px; height:48px; color:#b9aed0; }
    .empty h2 { color: var(--vd); margin:14px 0 6px; }

    /* Biblioteca */
    .lib__head { display:flex; flex-wrap:wrap; gap:14px; align-items:center; justify-content:space-between; margin-bottom:22px; }
    .lib__title { color: var(--vd); font-size:1.4rem; margin:0; }
    .filters { display:flex; flex-wrap:wrap; gap:8px; }
    .chip { border:1px solid #e0d6ec; background:#fff; color: var(--v); border-radius:999px; padding:7px 14px; font-size:.82rem; font-weight:600; cursor:pointer; transition:all .15s; }
    .chip--on { background: var(--v); color:#fff; border-color: var(--v); }

    .cards { display:grid; grid-template-columns: repeat(auto-fill, minmax(230px,1fr)); gap:22px; }
    .lcard { background:#fff; border:1px solid #eadfce; border-radius:18px; overflow:hidden; cursor:pointer; transition:transform .15s, box-shadow .15s; box-shadow:0 10px 30px -22px rgba(46,26,82,.5); }
    .lcard:hover { transform:translateY(-4px); box-shadow:0 18px 40px -20px rgba(46,26,82,.55); }
    .lcard__cover { position:relative; aspect-ratio: 16/10; display:grid; place-items:center; overflow:hidden;
      background:linear-gradient(135deg, #6B4C8C, #2e1a52); }
    .lcard__cover[data-kind="audio"] { background:linear-gradient(135deg,#b9842b,#d9a441); }
    .lcard__cover[data-kind="pdf"] { background:linear-gradient(135deg,#c0392b,#7d241b); }
    .lcard__cover[data-kind="zoom"] { background:linear-gradient(135deg,#2d8cff,#1452a8); }
    .lcard__cover[data-kind="image"] { background:linear-gradient(135deg,#3fa46a,#1f7a45); }
    .lcard__cover[data-kind="text"] { background:linear-gradient(135deg,#5d6d7e,#2c3e50); }
    .lcard__cover img { width:100%; height:100%; object-fit:cover; }
    .lcard__bgicon { color:rgba(255,255,255,.85); font-size:54px; width:54px; height:54px; }
    .lcard__play { position:absolute; inset:0; display:grid; place-items:center; opacity:0; transition:opacity .15s; background:rgba(0,0,0,.25); }
    .lcard:hover .lcard__play { opacity:1; }
    .lcard__play mat-icon { color:#fff; font-size:52px; width:52px; height:52px; }
    .lcard__badge { position:absolute; top:10px; left:10px; display:inline-flex; align-items:center; gap:4px; background:rgba(0,0,0,.5); color:#fff; font-size:.68rem; font-weight:600; padding:4px 9px; border-radius:999px; }
    .lcard__badge mat-icon { font-size:14px; width:14px; height:14px; }
    .lcard__body { padding:14px 16px 18px; }
    .lcard__body h3 { margin:0 0 5px; color:#2a2333; font-size:1.02rem; line-height:1.3; }
    .lcard__body p { margin:0; color:#6b6478; font-size:.85rem; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  `],
})
export class MemberContentComponent implements OnInit {
  member = inject(MemberAuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  loading = signal(true);
  error = signal('');
  busy = signal(false);
  plans = signal<{ slug: string; name: string }[]>([]);
  subs = signal<MemberSubscription[]>([]);
  items = signal<MemberContentItem[]>([]);
  kind = signal<string>('all');

  private readonly KIND_ORDER = ['video', 'audio', 'pdf', 'zoom', 'image', 'text', 'link'];

  /** Tipos presentes en la biblioteca (para mostrar solo esos filtros). */
  kindsPresent = computed(() => {
    const present = new Set(this.items().map(i => i.kind));
    return this.KIND_ORDER.filter(k => present.has(k as MemberContentItem['kind']));
  });

  /** Contenido filtrado por el tipo seleccionado. */
  filtered = computed(() =>
    this.kind() === 'all' ? this.items() : this.items().filter(i => i.kind === this.kind()),
  );

  /** Abre el visor (video/audio/imagen/texto) o el recurso externo (pdf/zoom/link). */
  open(it: MemberContentItem): void {
    if (['video', 'audio', 'image', 'text'].includes(it.kind)) {
      this.dialog.open(ContentViewerDialogComponent, {
        data: it, panelClass: 'fvx-crud-dialog', width: '880px', maxWidth: '94vw',
      });
    } else {
      const url = it.file_url || it.external_url;
      if (url) window.open(url, '_blank', 'noopener');
    }
  }

  playIcon(kind: string): string {
    return { video: 'play_arrow', audio: 'play_arrow', pdf: 'picture_as_pdf', zoom: 'videocam', image: 'zoom_in', text: 'article', link: 'open_in_new' }[kind] ?? 'open_in_new';
  }

  async ngOnInit(): Promise<void> {
    if (!this.member.isLoggedIn()) { this.router.navigate(['/acceso']); return; }
    try {
      const [content, account] = await Promise.all([
        this.member.getContent(),
        this.member.getAccount().catch(() => ({ subscriptions: [] as MemberSubscription[] })),
      ]);
      this.plans.set(content.plans);
      this.items.set(content.content);
      this.subs.set(account.subscriptions);
    } catch (e: any) {
      if (e?.status === 401) { this.member.logout(); this.router.navigate(['/acceso']); return; }
      this.error.set('No se pudo cargar tu contenido. Intenta nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }

  subStatus(s: MemberSubscription): string {
    if (s.status !== 1) return 'Inactiva';
    return s.cancel_at_period_end ? 'Cancelada (acceso hasta fin de período)' : 'Activa';
  }

  async cancel(s: MemberSubscription): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancelar suscripción',
        message: `¿Cancelar tu suscripción a "${s.plan_name}"? Conservarás el acceso hasta el final del período ya pagado.`,
        confirmText: 'Cancelar suscripción',
        cancelText: 'Volver',
        color: 'warn',
      },
      panelClass: 'fvx-crud-dialog', width: '460px', maxWidth: '92vw',
    });
    const ok = await firstValueFrom(ref.afterClosed());
    if (!ok) return;
    this.busy.set(true);
    try {
      await this.member.cancelSubscription(s.subscription_id);
      // Recargar estado (la suscripción quedará marcada como cancelada al período).
      const account = await this.member.getAccount();
      this.subs.set(account.subscriptions);
    } catch {
      this.error.set('No se pudo cancelar. Intenta nuevamente.');
    } finally {
      this.busy.set(false);
    }
  }

  iconFor(kind: string): string {
    return { video: 'play_circle', audio: 'graphic_eq', pdf: 'picture_as_pdf', text: 'article', image: 'image', zoom: 'videocam', link: 'link' }[kind] ?? 'article';
  }
  kindLabel(kind: string): string {
    return { video: 'Video', audio: 'Audio', pdf: 'Documento', text: 'Texto', image: 'Imagen', zoom: 'Zoom en vivo', link: 'Enlace' }[kind] ?? kind;
  }

  logout(): void {
    this.member.logout();
    this.router.navigate(['/']);
  }
}
