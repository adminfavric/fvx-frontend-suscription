import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
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
 * tiene una suscripción activa. La biblioteca separa las sesiones Zoom (en vivo /
 * próximas / historial) del contenido on-demand, que se filtra por tipo.
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
          <button class="subs__toggle" (click)="showSubs.set(!showSubs())" [class.is-open]="showSubs()">
            <mat-icon class="subs__toggle-ic">card_membership</mat-icon>
            <span>Mi suscripción y pagos</span>
            <span class="subs__count">{{ subs().length }}</span>
            <mat-icon class="subs__chev">expand_more</mat-icon>
          </button>
          @if (showSubs()) {
          <div class="subs__list">
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
                @if (s.status === 1) {
                  <button class="switch-btn" (click)="switchPlan(s)">
                    <mat-icon>swap_horiz</mat-icon> Cambiar de plan
                  </button>
                }
                @if (s.status === 1 && !s.cancel_at_period_end && !s.is_manual) {
                  <button class="cancel-btn" (click)="cancel(s)" [disabled]="busy()">
                    {{ busy() ? 'Cancelando…' : 'Cancelar suscripción' }}
                  </button>
                }
                <a class="other-btn" routerLink="/membresias">Ver otras membresías</a>
              </div>
            </div>
          }
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
        <div class="lib-intro">
          <h2 class="lib-intro__title">Biblioteca</h2>
          <p class="lib-intro__sub">Tus sesiones en vivo y tu contenido, en un solo lugar.</p>
        </div>

        <!-- ── EN VIVO Y PRÓXIMAS ── -->
        <section class="live-sec">
          <span class="sec-label"><mat-icon>sensors</mat-icon> En vivo y próximas</span>

          @for (it of liveSessions(); track it.id) {
            <article class="live-banner" role="button" tabindex="0"
                     (click)="enterRoom(it)" (keydown.enter)="enterRoom(it)" (keydown.space)="enterRoom(it)">
              <span class="live-seal"><span class="dot"></span> EN VIVO</span>
              <div class="live-banner__body">
                <span class="live-kicker"><mat-icon>videocam</mat-icon> Zoom en vivo</span>
                <h3>{{ it.title }}</h3>
                <span class="enter-btn">Entrar a la sala <mat-icon>arrow_forward</mat-icon></span>
              </div>
            </article>
          }

          @for (it of soonSessions(); track it.id) {
            <article class="soon-card" aria-disabled="true">
              @if (it.image_url) {
                <div class="soon-cover"><img [src]="it.image_url" [alt]="it.title" loading="lazy" /></div>
              }
              <span class="soon-eyebrow"><mat-icon>hourglass_top</mat-icon> Próxima sesión</span>
              <h3>{{ it.title }}</h3>
              @if (it.live_start) {
                <p class="soon-date"><mat-icon>calendar_today</mat-icon> {{ it.live_start | date: "EEEE dd 'de' MMMM 'a las' HH:mm" }}</p>
              }
              <div class="tiles">
                @for (t of countdownTiles(it); track t.l) {
                  <div class="tile"><span class="tile__v">{{ t.v }}</span><span class="tile__l">{{ t.l }}</span></div>
                }
              </div>
              <p class="soon-note"><mat-icon>lock</mat-icon> La sala abre 15 min antes del inicio</p>
            </article>
          }

          @if (!hasSessions()) {
            <div class="empty-soft">
              <mat-icon>event_available</mat-icon>
              <h4>Sin sesiones próximas</h4>
              <p>Cuando se programe una sesión en vivo, aparecerá aquí con su cuenta regresiva.</p>
            </div>
          }
        </section>

        <!-- ── BIBLIOTECA ON-DEMAND ── -->
        <div class="od-header">
          <span class="od-label"><mat-icon>collections_bookmark</mat-icon> Biblioteca on-demand</span>
          <div class="od-filters">
            <button [class.active]="kind() === 'all'" (click)="kind.set('all')">Todo</button>
            @for (k of onDemandKinds(); track k) {
              <button [class.active]="kind() === k" (click)="kind.set(k)">
                <mat-icon>{{ iconFor(k) }}</mat-icon>{{ kindLabel(k) }}
              </button>
            }
          </div>
        </div>

        <div class="cards">
          @for (it of contentList(); track it.id) {
            <article class="lcard" role="button" tabindex="0"
                     (click)="open(it)" (keydown.enter)="open(it)" (keydown.space)="open(it)">
              <div class="lcard__cover" [attr.data-kind]="it.kind">
                @if (it.image_url) { <img [src]="it.image_url" [alt]="it.title" loading="lazy" /> }
                @else { <mat-icon class="lcard__bgicon">{{ iconFor(it.kind) }}</mat-icon> }
                <span class="lcard__play"><mat-icon>{{ playIcon(it.kind) }}</mat-icon></span>
                <span class="lcard__badge"><mat-icon>{{ iconFor(it.kind) }}</mat-icon> {{ kindLabel(it.kind) }}</span>
              </div>
              <div class="lcard__body">
                <h3>{{ it.title }}</h3>
                @if (it.text) { <p>{{ it.text }}</p> }
                @if (it.created) { <span class="lcard__date"><mat-icon>schedule</mat-icon> {{ it.created | date: 'dd-MM-yyyy' }}</span> }
              </div>
            </article>
          } @empty {
            <div class="empty-soft empty-soft--grid">
              <mat-icon>inbox</mat-icon>
              <h4>Sin contenido en esta categoría</h4>
              <p>Prueba con otro filtro para ver más de tu biblioteca.</p>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    /* Tokens locales: reutilizan los css roots globales (--color-*) y añaden las
       sombras de violeta profundo que la marca usa en esta pantalla. */
    :host {
      --v:  var(--color-purple);       /* violeta claro  #6B4C8C */
      --vm: #5b3a8a;                   /* violeta medio  */
      --vd: #2e1a52;                   /* violeta profundo */
      --gold: var(--color-gold);       /* dorado de marca */
      --gold-vivo: #d9a441;            /* dorado vivo (acentos/countdown) */
      --crema: var(--color-bg);
      --texto: var(--color-text);
      --texto-suave: var(--color-text-light);
      --texto-tenue: #a89db8;
      --borde: rgba(46,26,82,.06);
      --vivo: #ef4444;
      display:block; min-height:70vh;
      background:
        radial-gradient(120% 80% at 92% -12%, rgba(217,164,65,.12), transparent 58%),
        radial-gradient(100% 70% at -8% 2%, rgba(91,58,138,.12), transparent 52%),
        var(--crema);
    }
    .mc { max-width: 1080px; margin:0 auto; padding: clamp(28px,5vw,56px) clamp(16px,4vw,40px); }
    .mc__head { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:28px; }
    .eyebrow { color: var(--gold); letter-spacing:.16em; text-transform:uppercase; font-size:.74rem; font-weight:600; }
    .mc__head h1 { font-family:'Playfair Display',serif; margin:6px 0 2px; color: var(--vd); font-size: clamp(1.7rem,3vw,2.3rem); }
    .who { color: var(--texto-suave); margin:0; font-size:.9rem; }
    .logout { display:inline-flex; align-items:center; gap:6px; background:none; border:1px solid #d9cdbb; border-radius:999px; padding:8px 14px; cursor:pointer; color:var(--texto); font-size:.85rem; }
    .logout:hover { background:#fff; }
    .logout mat-icon { font-size:18px; width:18px; height:18px; }

    .subs { margin-bottom:24px; }
    .subs__toggle { display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid #eadfce; border-radius:999px; padding:8px 14px; cursor:pointer; color:var(--vd); font-size:.88rem; font-weight:600; box-shadow: var(--sombra-card,0 14px 34px -22px rgba(46,26,82,.18)); }
    .subs__toggle:hover { background:#faf6ef; }
    .subs__toggle-ic { font-size:18px; width:18px; height:18px; color: var(--gold-vivo); }
    .subs__count { background:#f0eaf6; color:var(--v); border-radius:999px; padding:1px 8px; font-size:.74rem; font-weight:700; }
    .subs__chev { font-size:20px; width:20px; height:20px; color:var(--texto-suave); transition: transform .18s; }
    .subs__toggle.is-open .subs__chev { transform: rotate(180deg); }
    .subs__list { display:flex; flex-direction:column; gap:12px; margin-top:12px; }
    .sub-card { background:#fff; border:1px solid #eadfce; border-radius:14px; padding:18px 20px; box-shadow: var(--sombra-card,0 14px 34px -20px rgba(46,26,82,.26)); }
    .sub-card__top { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .sub-card__top strong { color:var(--texto); font-size:1.05rem; }
    .badge { font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:999px; background:#ececf2; color:#555; }
    .badge--ok { background:#e3f6ea; color:#1f7a45; }
    .badge--off { background:#fdecea; color:#c0392b; }
    .sub-card__meta { display:flex; flex-wrap:wrap; gap:16px; margin:12px 0; color:var(--texto-suave); font-size:.88rem; }
    .sub-card__meta span { display:inline-flex; align-items:center; gap:5px; }
    .sub-card__meta mat-icon { font-size:17px; width:17px; height:17px; color: var(--v); }
    .sub-card__meta .warn { color:#b9842b; }
    .sub-card__meta .warn mat-icon { color:#b9842b; }
    .sub-card__actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
    .switch-btn { display:inline-flex; align-items:center; gap:6px; background: var(--gold-vivo,#d9a441); border:none; color:#2e1a52; border-radius:999px; padding:8px 16px; font-size:.85rem; font-weight:700; cursor:pointer; }
    .switch-btn:hover { filter:brightness(.96); }
    .switch-btn mat-icon { font-size:18px; width:18px; height:18px; }
    .cancel-btn { background:none; border:1px solid #e0b4b0; color:#c0392b; border-radius:999px; padding:8px 16px; font-size:.85rem; cursor:pointer; }
    .cancel-btn:hover:not(:disabled) { background:#fdecea; }
    .cancel-btn:disabled { opacity:.6; cursor:default; }
    .other-btn { display:inline-flex; align-items:center; background: color-mix(in srgb, var(--v) 12%, #fff); color: var(--v); border-radius:999px; padding:8px 16px; font-size:.85rem; font-weight:600; text-decoration:none; }
    .other-btn:hover { background: color-mix(in srgb, var(--v) 20%, #fff); }

    .state { color:var(--texto-suave); padding:20px 0; }
    .state--error { color:#b91c1c; display:flex; gap:6px; align-items:center; }
    .empty { text-align:center; padding:48px 0; color:var(--texto-suave); }
    .empty mat-icon { font-size:48px; width:48px; height:48px; color:#b9aed0; }
    .empty h2 { color: var(--vd); margin:14px 0 6px; }
    .empty .btn { display:inline-block; margin-top:10px; background:var(--vd); color:#fff; text-decoration:none; border-radius:999px; padding:10px 22px; font-weight:600; font-size:.9rem; }

    /* Intro Biblioteca */
    .lib-intro { margin-bottom:22px; }
    .lib-intro__title { font-family:'Playfair Display',serif; color: var(--vd); font-size: clamp(1.5rem,2.6vw,1.9rem); margin:0 0 4px; }
    .lib-intro__sub { color: var(--texto-suave); margin:0; font-size:.95rem; }

    /* Rótulos de sección */
    .sec-label, .od-label {
      display:inline-flex; align-items:center; gap:8px; color: var(--vd);
      font-weight:700; font-size:.78rem; letter-spacing:.14em; text-transform:uppercase;
    }
    .sec-label mat-icon, .od-label mat-icon { font-size:18px; width:18px; height:18px; color: var(--gold); }

    /* ── EN VIVO Y PRÓXIMAS ── */
    .live-sec { display:flex; flex-direction:column; gap:16px; margin:6px 0 8px; }

    .live-banner {
      position:relative; overflow:hidden; cursor:pointer; border:none; border-radius:20px;
      padding:24px 26px; color:#fff;
      background: linear-gradient(118deg,#2e1a52,#5b3a8a 56%,#6B4C8C);
      box-shadow: 0 18px 46px -22px rgba(46,26,82,.7), 0 0 0 1px rgba(217,164,65,.28) inset;
      transition: transform .15s, box-shadow .15s;
    }
    .live-banner::after {
      content:''; position:absolute; inset:0; pointer-events:none;
      background: radial-gradient(80% 120% at 88% -10%, rgba(217,164,65,.30), transparent 60%);
    }
    .live-banner:hover { transform: translateY(-3px); box-shadow: 0 24px 56px -22px rgba(46,26,82,.8), 0 0 0 1px rgba(217,164,65,.45) inset; }
    .live-banner:focus-visible { outline:3px solid var(--gold-vivo); outline-offset:3px; }
    .live-seal {
      position:relative; z-index:1; display:inline-flex; align-items:center; gap:6px;
      background:var(--vivo); color:#fff; font-size:.68rem; font-weight:800; letter-spacing:.08em;
      padding:5px 11px; border-radius:999px; animation: mi-pulse 1.8s infinite;
    }
    .live-seal .dot { width:7px; height:7px; border-radius:50%; background:#fff; }
    @keyframes mi-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(239,68,68,.55); }
      70%  { box-shadow: 0 0 0 9px rgba(239,68,68,0); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }
    .live-banner__body { position:relative; z-index:1; margin-top:12px; }
    .live-kicker { display:inline-flex; align-items:center; gap:5px; font-size:.8rem; color: var(--gold-vivo); font-weight:600; }
    .live-kicker mat-icon { font-size:17px; width:17px; height:17px; }
    .live-banner__body h3 { font-family:'Playfair Display',serif; margin:6px 0 16px; font-size: clamp(1.3rem,2.4vw,1.7rem); line-height:1.2; }
    .enter-btn {
      display:inline-flex; align-items:center; gap:6px; background: var(--gold-vivo); color:#2a1a06;
      font-weight:700; font-size:.92rem; padding:10px 20px; border-radius:999px;
    }
    .enter-btn mat-icon { font-size:19px; width:19px; height:19px; }

    .soon-card {
      background:#fff; border:1px solid rgba(217,164,65,.4); border-radius:20px; padding:22px 24px;
      box-shadow: 0 14px 40px -22px rgba(46,26,82,.28);
    }
    /* Portada de la sesión (antes de estar "en vivo"): se muestra si el
       contenido Zoom tiene imagen de portada configurada. */
    .soon-cover { margin:-22px -24px 16px; border-radius:20px 20px 0 0; overflow:hidden; aspect-ratio:16/9; background:#f0eaf6; }
    .soon-cover img { width:100%; height:100%; object-fit:cover; display:block; }
    .soon-eyebrow { display:inline-flex; align-items:center; gap:6px; color: var(--gold-vivo); font-weight:700; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; }
    .soon-eyebrow mat-icon { font-size:17px; width:17px; height:17px; }
    .soon-card h3 { font-family:'Playfair Display',serif; color: var(--vd); margin:8px 0 6px; font-size: clamp(1.2rem,2.2vw,1.5rem); }
    .soon-date { display:inline-flex; align-items:center; gap:6px; color: var(--texto-suave); font-size:.9rem; margin:0 0 16px; text-transform:capitalize; }
    .soon-date mat-icon { font-size:17px; width:17px; height:17px; color: var(--v); }
    .tiles { display:flex; gap:10px; flex-wrap:wrap; }
    .tile {
      display:flex; flex-direction:column; align-items:center; gap:3px; min-width:58px;
      background: linear-gradient(160deg,#3a2068,#2e1a52); color:#fff;
      border-radius:14px; padding:12px 10px 9px;
    }
    .tile__v { font-family:'Playfair Display',serif; color: var(--gold-vivo); font-size:25px; line-height:1; font-weight:700; }
    .tile__l { font-size:9px; letter-spacing:.1em; text-transform:uppercase; color: rgba(255,255,255,.72); }
    .soon-note { display:inline-flex; align-items:center; gap:6px; color: var(--texto-tenue); font-size:.8rem; margin:16px 0 0; }
    .soon-note mat-icon { font-size:15px; width:15px; height:15px; }

    .empty-soft {
      text-align:center; padding:34px 20px; color: var(--texto-suave);
      border:1.5px dashed rgba(217,164,65,.5); border-radius:18px; background: rgba(255,255,255,.5);
    }
    .empty-soft mat-icon { font-size:40px; width:40px; height:40px; color: var(--gold-vivo); }
    .empty-soft h4 { color: var(--vd); margin:10px 0 4px; font-size:1.05rem; }
    .empty-soft p { margin:0; font-size:.88rem; }
    .empty-soft--grid { grid-column:1/-1; }

    /* ── BIBLIOTECA ON-DEMAND ── */
    .od-header { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin:42px 0 18px; }
    .od-filters { display:flex; gap:8px; flex-wrap:wrap; }
    .od-filters button {
      padding:9px 15px; border-radius:999px; font:600 13px 'Inter',sans-serif; cursor:pointer;
      display:inline-flex; align-items:center; gap:6px; white-space:nowrap;
      border:1px solid rgba(46,26,82,.14); background:#fff; color:var(--texto-suave); transition:all .15s;
    }
    .od-filters button mat-icon { font-size:16px; width:16px; height:16px; }
    .od-filters button:hover { border-color: var(--v); color: var(--v); }
    .od-filters button.active { border-color: var(--vd); background: var(--vd); color:#fff; }

    .cards { display:grid; grid-template-columns: repeat(auto-fill, minmax(230px,1fr)); gap:20px; }
    .lcard { background:#fff; border:1px solid #eadfce; border-radius:18px; overflow:hidden; cursor:pointer; transition:transform .15s, box-shadow .15s; box-shadow:0 14px 34px -20px rgba(46,26,82,.26); }
    .lcard:hover { transform:translateY(-4px); box-shadow:0 20px 44px -18px rgba(46,26,82,.4); }
    .lcard__cover { position:relative; aspect-ratio: 16/10; display:grid; place-items:center; overflow:hidden;
      background:linear-gradient(135deg,#6B4C8C,#2e1a52); }
    .lcard__cover[data-kind="video"] { background:linear-gradient(135deg,#3a2068,#5b3a8a); }
    .lcard__cover[data-kind="audio"] { background:linear-gradient(135deg,#5b3a8a,#8a5a9e); }
    .lcard__cover[data-kind="pdf"]   { background:linear-gradient(135deg,#2e1a52,#4a2d73); }
    .lcard__cover[data-kind="text"]  { background:linear-gradient(135deg,#4a2d73,#6B4C8C); }
    .lcard__cover[data-kind="image"] { background:linear-gradient(135deg,#6B4C8C,#d9a441); }
    .lcard__cover[data-kind="link"]  { background:linear-gradient(135deg,#3f2a63,#6B4C8C); }
    .lcard__cover img { width:100%; height:100%; object-fit:cover; }
    .lcard__bgicon { color:rgba(255,255,255,.85); font-size:54px; width:54px; height:54px; }
    .lcard__play { position:absolute; inset:0; display:grid; place-items:center; opacity:0; transition:opacity .15s; background:rgba(0,0,0,.25); }
    .lcard:hover .lcard__play { opacity:1; }
    .lcard__play mat-icon { color:#fff; font-size:52px; width:52px; height:52px; }
    .lcard__badge { position:absolute; top:10px; left:10px; display:inline-flex; align-items:center; gap:4px; background:rgba(0,0,0,.5); color:#fff; font-size:.68rem; font-weight:600; padding:4px 9px; border-radius:999px; }
    .lcard__badge mat-icon { font-size:14px; width:14px; height:14px; }
    .lcard__body { padding:14px 16px 16px; }
    .lcard__body h3 { font-family:'Playfair Display',serif; margin:0 0 5px; color:var(--texto); font-size:1.05rem; line-height:1.3; }
    .lcard__body p { margin:0 0 8px; color:var(--texto-suave); font-size:.85rem; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .lcard__date { display:inline-flex; align-items:center; gap:4px; color: var(--texto-tenue); font-size:.76rem; }
    .lcard__date mat-icon { font-size:14px; width:14px; height:14px; }

    /* ── HISTORIAL (acordeón) ── */
    .hist-toggle {
      display:flex; align-items:center; gap:10px; width:100%; margin-top:40px;
      background:none; border:1px solid var(--borde); border-top:1px solid #e7ddcd; border-radius:14px;
      padding:14px 18px; cursor:pointer; color: var(--texto-suave); font-size:.92rem; font-weight:600;
    }
    .hist-toggle:hover { background: rgba(255,255,255,.6); }
    .hist-toggle > mat-icon:first-child { color: var(--v); }
    .hist-count { background:#ece6f1; color: var(--vd); font-size:.74rem; font-weight:700; padding:2px 9px; border-radius:999px; }
    .hist-chevron { margin-left:auto; }
    .hist-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(230px,1fr)); gap:18px; margin-top:16px; }
    .hist-card { display:flex; gap:0; flex-direction:column; background:#fff; border:1px solid #e7ddcd; border-radius:16px; overflow:hidden; opacity:.9; }
    .hist-card__cover { aspect-ratio:16/9; display:grid; place-items:center; background:linear-gradient(135deg,#4a4060,#332a4a); }
    .hist-card__cover mat-icon { color: rgba(255,255,255,.6); font-size:40px; width:40px; height:40px; }
    .hist-card__body { padding:12px 15px 15px; }
    .hist-seal { display:inline-flex; align-items:center; gap:4px; color:#7d7490; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
    .hist-seal mat-icon { font-size:14px; width:14px; height:14px; }
    .hist-card__body h4 { font-family:'Playfair Display',serif; color: var(--texto); margin:6px 0 4px; font-size:1rem; }
    .hist-card__body p { margin:0; color: var(--texto-suave); font-size:.82rem; }
    .hist-note { color: var(--texto-tenue) !important; font-style:italic; margin-top:4px !important; }

    @media (max-width:560px) {
      .live-banner { padding:20px; }
      .tile { min-width:52px; }
    }
  `],
})
export class MemberContentComponent implements OnInit, OnDestroy {
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
  /** "Mi suscripción y pagos" colapsada por defecto: la biblioteca es la prioridad. */
  showSubs = signal(false);

  /** Reloj que avanza cada segundo para la cuenta regresiva de las sesiones Zoom. */
  private now = signal(Date.now());
  private clockId?: ReturnType<typeof setInterval>;
  /** Vigilancia de sesión única: detecta si el miembro inició sesión en otro lado. */
  private sessionId?: ReturnType<typeof setInterval>;
  private onVisible = (): void => { if (document.visibilityState === 'visible') this.checkSession(); };

  private readonly KIND_ORDER = ['video', 'audio', 'pdf', 'image', 'text', 'link'];

  /** Sesiones Zoom de la biblioteca (separadas del contenido on-demand). */
  private zoomItems = computed(() => this.items().filter(i => i.kind === 'zoom'));

  /** Listas derivadas por estado; dependen de `now()` → se recalculan cada tick. */
  liveSessions = computed(() => this.zoomItems().filter(i => this.zoomState(i) === 'live'));
  soonSessions = computed(() =>
    this.zoomItems()
      .filter(i => this.zoomState(i) === 'soon')
      .sort((a, b) => (this.opensMs(a) ?? 0) - (this.opensMs(b) ?? 0)),
  );
  hasSessions = computed(() => this.liveSessions().length > 0 || this.soonSessions().length > 0);

  /** Contenido on-demand (todo menos Zoom). */
  private onDemandItems = computed(() => this.items().filter(i => i.kind !== 'zoom'));

  /** Tipos on-demand presentes (para mostrar solo esos chips de filtro). */
  onDemandKinds = computed(() => {
    const present = new Set(this.onDemandItems().map(i => i.kind));
    return this.KIND_ORDER.filter(k => present.has(k as MemberContentItem['kind']));
  });

  /** On-demand filtrado por el tipo seleccionado. Los chips no afectan a las sesiones. */
  contentList = computed(() =>
    this.kind() === 'all' ? this.onDemandItems() : this.onDemandItems().filter(i => i.kind === this.kind()),
  );

  /** Momento (ms) en que abre la sala: `opens_at` o 15 min antes de `live_start`. */
  private opensMs(it: MemberContentItem): number | null {
    if (it.opens_at) return Date.parse(it.opens_at);
    if (it.live_start) return Date.parse(it.live_start) - 15 * 60_000;
    return null;
  }

  /** Momento (ms) en que cierra la sala: `closes_at` o `live_end`. */
  private closesMs(it: MemberContentItem): number | null {
    if (it.closes_at) return Date.parse(it.closes_at);
    if (it.live_end) return Date.parse(it.live_end);
    return null;
  }

  /** Estado de una sesión Zoom según el reloj actual y la franja de la sala. */
  zoomState(it: MemberContentItem): 'live' | 'soon' | 'ended' {
    const now = this.now();
    const opens = this.opensMs(it);
    const closes = this.closesMs(it);
    if (closes != null && now >= closes) return 'ended';
    if (opens != null && now >= opens) return 'live';
    return 'soon';
  }

  /** Tiles de cuenta regresiva hasta que abre la sala (Días? / Horas / Min / Seg). */
  countdownTiles(it: MemberContentItem): { v: string; l: string }[] {
    const target = this.opensMs(it);
    let s = Math.max(0, Math.floor(((target ?? 0) - this.now()) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const out: { v: string; l: string }[] = [];
    if (d > 0) out.push({ v: pad(d), l: d === 1 ? 'Día' : 'Días' });
    out.push({ v: pad(h), l: 'Horas' });
    out.push({ v: pad(m), l: 'Min' });
    out.push({ v: pad(s), l: 'Seg' });
    return out;
  }

  /** Entra a la sala Zoom embebida; solo si la sala está abierta (estado `live`). */
  enterRoom(it: MemberContentItem): void {
    if (this.zoomState(it) !== 'live') return;
    if (it.has_zoom) {
      this.router.navigate(['/sala', it.id]);
    } else if (it.external_url) {
      window.open(it.external_url, '_blank', 'noopener');
    }
  }

  /** Abre el visor (video/audio/imagen/texto) o el recurso externo (pdf/link). */
  open(it: MemberContentItem): void {
    if (['video', 'audio', 'image', 'text'].includes(it.kind)) {
      this.dialog.open(ContentViewerDialogComponent, {
        data: it, panelClass: 'fvx-crud-dialog', width: '880px', maxWidth: '94vw',
      });
      return;
    }
    // Enlace externo (YouTube/Vimeo): se abre tal cual.
    if (!it.has_file && it.external_url) {
      window.open(it.external_url, '_blank', 'noopener');
      return;
    }
    // PDF u otro archivo servido: se pide una URL FIRMADA de vida corta. La
    // ventana se abre YA (síncrona) para no gatillar el bloqueo de pop-ups y
    // luego se redirige al obtener la firma.
    const w = window.open('', '_blank', 'noopener');
    this.member.getMediaUrl(it.id).then(url => {
      if (w) w.location.href = url;
      else window.open(url, '_blank', 'noopener');
    }).catch(() => { if (w) w.close(); });
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
      // Reloj para la cuenta regresiva, solo si hay alguna sesión Zoom con horario.
      if (content.content.some(i => i.kind === 'zoom' && (i.opens_at || i.closes_at || i.live_start))) {
        this.clockId = setInterval(() => this.now.set(Date.now()), 1000);
      }
    } catch (e: any) {
      if (e?.status === 401) { this.member.logout(); this.router.navigate(['/acceso']); return; }
      this.error.set('No se pudo cargar tu contenido. Intenta nuevamente.');
    } finally {
      this.loading.set(false);
    }
    this.startSessionWatch();
  }

  ngOnDestroy(): void {
    if (this.clockId) clearInterval(this.clockId);
    if (this.sessionId) clearInterval(this.sessionId);
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  /** Sondea la sesión cada 45s y al volver a la pestaña; si fue invalidada por
   * un login en otro lugar (401), cierra y manda al acceso con el aviso. */
  private startSessionWatch(): void {
    this.sessionId = setInterval(() => this.checkSession(), 45_000);
    document.addEventListener('visibilitychange', this.onVisible);
  }

  private async checkSession(): Promise<void> {
    try {
      await this.member.ping();
    } catch (e: any) {
      if (e?.status === 401) {
        if (this.sessionId) clearInterval(this.sessionId);
        this.member.logout();
        this.router.navigate(['/acceso'], { queryParams: { sesion: 'otro' } });
      }
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

  /** Inicia el cambio de plan: va al catálogo en modo "cambiar". El checkout
   * detecta la suscripción actual y la cancela al pagar la nueva (conservando el
   * acceso hasta el fin del período). Las de período (mensualidad) expiran solas. */
  switchPlan(s: MemberSubscription): void {
    this.router.navigate(['/membresias'], { queryParams: { cambiar: '1', actual: s.plan_slug } });
  }

  logout(): void {
    this.member.logout();
    this.router.navigate(['/']);
  }
}
