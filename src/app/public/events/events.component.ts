import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { formatPrice } from '../data/catalog';
import { ContentService, PublicEvent } from '../../core/services/content.service';

/**
 * Eventos especiales (compra ÚNICA, estilo Tiendup). Lista los eventos públicos
 * desde Django y permite comprarlos directo: nombre + email → pago en Flow.
 */
@Component({
  selector: 'app-events',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, MatIconModule],
  template: `
    <header class="page-hero">
      <div class="inner">
        <span class="eyebrow">Eventos especiales</span>
        <h1>Talleres y encuentros únicos</h1>
        <p>Experiencias que ocurren una sola vez. Cómpralas directamente aquí.</p>
      </div>
    </header>

    @if (result()) {
      <div class="result" [class.result--ok]="result() === 'ok'" [class.result--fail]="result() === 'fail'">
        <mat-icon>{{ result() === 'ok' ? 'check_circle' : 'error_outline' }}</mat-icon>
        {{ result() === 'ok' ? '¡Compra exitosa! Te enviaremos los detalles por correo.' : 'El pago no se completó. Puedes intentarlo nuevamente.' }}
      </div>
    }

    <section class="events">
      @for (e of events(); track e.slug) {
        <article class="event">
          @if (e.image_url) { <img class="event__img" [src]="e.image_url" [alt]="e.name" loading="lazy" /> }
          @else { <span class="event__icon"><mat-icon>{{ e.icon || 'celebration' }}</mat-icon></span> }
          <div class="event__body">
            <h2>{{ e.name }}</h2>
            @if (e.subtitle) { <p class="event__subtitle">{{ e.subtitle }}</p> }
            <p class="event__date">
              <mat-icon>event</mat-icon>
              {{ e.date ? (e.date | date: 'EEEE d \\'de\\' MMMM, HH:mm') : 'Fecha por anunciar' }}
            </p>
            @if (e.description) { <p class="event__desc">{{ e.description }}</p> }
          </div>
          <div class="event__action">
            <span class="event__price">{{ price(e.price) }}</span>
            @if (selected()?.slug === e.slug) {
              <form class="buy" (ngSubmit)="confirm(e)">
                <input type="text" [(ngModel)]="name" name="name" placeholder="Tu nombre" />
                <input type="email" [(ngModel)]="email" name="email" placeholder="tu@correo.cl" />
                @if (error()) { <span class="buy__err">{{ error() }}</span> }
                <button class="btn btn--gold" type="submit" [disabled]="submitting()">
                  {{ submitting() ? 'Redirigiendo…' : 'Pagar ' + price(e.price) }}
                </button>
                <button class="btn btn--ghost" type="button" (click)="cancel()">Cancelar</button>
              </form>
            } @else if (e.price) {
              <button class="btn btn--gold" type="button" (click)="select(e)">Comprar</button>
            } @else {
              <button class="btn btn--gold" type="button" disabled>Valor por confirmar</button>
            }
          </div>
        </article>
      } @empty {
        <p class="empty">Pronto anunciaremos nuevos eventos.</p>
      }
    </section>
  `,
  styles: [`
    :host { --lita-violet:#5b3a8a; --lita-violet-deep:#2e1a52; --lita-gold:#d9a441; --lita-cream:#faf6ef; --lita-ink:#2a2333; --lita-muted:#6b6478; display:block; background:var(--lita-cream); }
    .page-hero { background: linear-gradient(160deg, var(--lita-violet), var(--lita-violet-deep)); color:#fff; }
    .inner { max-width: 900px; margin:0 auto; padding: clamp(48px,7vw,90px) clamp(16px,4vw,48px); text-align:center; }
    .eyebrow { color: var(--lita-gold); letter-spacing:.16em; text-transform:uppercase; font-size:.78rem; }
    .page-hero h1 { margin:14px 0 12px; font-size: clamp(1.9rem,4vw,2.8rem); }
    .page-hero p { margin:0 auto; max-width:52ch; color:#e9e2f2; line-height:1.6; }

    .result { max-width:940px; margin: 20px auto -10px; padding:14px 18px; border-radius:12px; display:flex; align-items:center; gap:10px; font-weight:600; }
    .result--ok { background:#e3f6ea; color:#1f7a45; }
    .result--fail { background:#fdecea; color:#c0392b; }

    .events { max-width: 940px; margin:0 auto; padding: clamp(40px,6vw,72px) clamp(16px,4vw,48px); display:flex; flex-direction:column; gap:20px; }
    .empty { text-align:center; color: var(--lita-muted); }
    .event { display:grid; grid-template-columns: auto 1fr auto; gap:22px; align-items:center; background:#fff; border:1px solid #eadfce; border-radius:20px; padding: 26px clamp(20px,3vw,32px); box-shadow:0 12px 32px -24px rgba(46,26,82,.6); }
    .event__icon { width:58px; height:58px; border-radius:16px; display:grid; place-items:center; background: color-mix(in srgb, var(--lita-gold) 18%, #fff); color:#b9842b; }
    .event__icon mat-icon { font-size:32px; width:32px; height:32px; }
    .event__img { width:90px; height:90px; object-fit:cover; border-radius:14px; }
    .event__body h2 { margin:0 0 4px; color: var(--lita-violet-deep); font-size:1.25rem; }
    .event__subtitle { margin:0 0 8px; color: var(--lita-violet); font-weight:600; font-size:.95rem; }
    .event__date { display:inline-flex; align-items:center; gap:6px; color: var(--lita-muted); font-size:.9rem; margin:0 0 8px; text-transform:capitalize; }
    .event__date mat-icon { font-size:18px; width:18px; height:18px; }
    .event__desc { margin:0; color: var(--lita-ink); line-height:1.6; }
    .event__action { text-align:center; display:flex; flex-direction:column; gap:10px; min-width:170px; }
    .event__price { font-weight:800; color: var(--lita-violet-deep); }

    .buy { display:flex; flex-direction:column; gap:8px; }
    .buy input { padding:10px 12px; border:1px solid #d9cdbb; border-radius:10px; font-size:.9rem; font-family:inherit; }
    .buy input:focus { outline:none; border-color: var(--lita-violet); }
    .buy__err { color:#c0392b; font-size:.8rem; }

    .btn { display:inline-flex; align-items:center; justify-content:center; padding:11px 20px; border:none; border-radius:999px; font-weight:700; font-size:.9rem; cursor:pointer; font-family:inherit; }
    .btn--gold { background: var(--lita-gold); color: var(--lita-violet-deep); }
    .btn--ghost { background:transparent; border:1px solid #d9cdbb; color: var(--lita-muted); font-weight:600; }
    .btn:disabled { opacity:.6; cursor:not-allowed; }

    @media (max-width: 760px) { .event { grid-template-columns: 1fr; text-align:center; } .event__icon, .event__img { margin:0 auto; } .event__date { justify-content:center; } .event__action { min-width:0; } }
  `],
})
export class EventsComponent implements OnInit {
  private content = inject(ContentService);
  private route = inject(ActivatedRoute);

  events = signal<PublicEvent[]>([]);
  selected = signal<PublicEvent | null>(null);
  result = signal<'' | 'ok' | 'fail'>('');
  submitting = signal(false);
  error = signal('');
  name = '';
  email = '';
  price = formatPrice;

  async ngOnInit(): Promise<void> {
    this.events.set(await this.content.getEvents());
    const r = this.route.snapshot.queryParamMap.get('pago');
    if (r === 'ok' || r === 'fail') this.result.set(r);
  }

  select(e: PublicEvent): void {
    this.selected.set(e);
    this.error.set('');
  }

  cancel(): void {
    this.selected.set(null);
  }

  async confirm(e: PublicEvent): Promise<void> {
    if (!this.name.trim() || !this.email.includes('@')) {
      this.error.set('Completa tu nombre y un correo válido.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    try {
      const url = await this.content.startEventCheckout({
        event_slug: e.slug,
        name: this.name.trim(),
        email: this.email.trim(),
      });
      window.location.href = url;
    } catch {
      this.submitting.set(false);
      this.error.set('No se pudo iniciar el pago. Intenta nuevamente.');
    }
  }
}
