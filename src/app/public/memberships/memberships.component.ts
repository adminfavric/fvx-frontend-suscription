import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Membership, INSCRIPTION_OPENS, formatPrice } from '../data/catalog';
import { ContentService } from '../../core/services/content.service';

@Component({
  selector: 'app-memberships',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <header class="page-hero">
      <div class="page-hero__inner">
        <span class="eyebrow">Membresías</span>
        <h1>Elige tu camino de Alkymia</h1>
        <p>
          Cada membresía es un espacio independiente. Puedes inscribirte en una o combinar varias.
          Inscripciones desde el <strong>{{ inscriptionOpens }}</strong>.
        </p>
      </div>
    </header>

    <section class="list">
      @for (m of memberships(); track m.slug) {
        <article class="plan" [class.plan--featured]="m.featured">
          @if (m.image_url) { <img class="plan__img" [src]="m.image_url" [alt]="m.name" loading="lazy" /> }
          <div class="plan__head">
            <span class="plan__icon"><mat-icon>{{ m.icon }}</mat-icon></span>
            <div>
              <h2>{{ m.name }}</h2>
              <p class="plan__tagline">{{ m.tagline }}</p>
            </div>
            @if (m.featured) { <span class="plan__badge">Destacada</span> }
          </div>

          <p class="plan__desc">{{ m.description }}</p>

          <ul class="plan__features">
            @for (f of m.features; track f) {
              <li><mat-icon>check_circle</mat-icon> {{ f }}</li>
            }
          </ul>

          <div class="plan__meta">
            <span class="chip"><mat-icon>schedule</mat-icon> {{ m.cadence }}</span>
            <span class="chip">
              <mat-icon>{{ m.recorded ? 'videocam' : 'sensors' }}</mat-icon>
              {{ m.recorded ? 'Queda grabado' : 'Solo en vivo' }}
            </span>
          </div>

          <div class="plan__foot">
            <span class="plan__price">{{ price(m.priceMonthly) }}@if (m.priceMonthly) {<small>/mes</small>}</span>
            <a class="btn btn--violet" [routerLink]="['/membresias', m.slug]">
              {{ m.priceMonthly ? 'Contratar' : 'Más información' }}
            </a>
          </div>
        </article>
      } @empty {
        <p class="empty">Estamos preparando las membresías. Muy pronto disponibles aquí.</p>
      }
    </section>
  `,
  styles: [`
    :host { --lita-violet:#5b3a8a; --lita-violet-deep:#2e1a52; --lita-gold:#d9a441; --lita-cream:#faf6ef; --lita-ink:#2a2333; --lita-muted:#6b6478; display:block; }

    .page-hero { background: linear-gradient(160deg, var(--lita-violet), var(--lita-violet-deep)); color:#fff; }
    .page-hero__inner { max-width: 900px; margin:0 auto; padding: clamp(48px,7vw,90px) clamp(16px,4vw,48px); text-align:center; }
    .eyebrow { color: var(--lita-gold); letter-spacing:.16em; text-transform:uppercase; font-size:.78rem; }
    .page-hero h1 { margin:14px 0 12px; font-size: clamp(1.9rem,4vw,2.8rem); }
    .page-hero p { margin:0 auto; max-width:54ch; color:#e9e2f2; line-height:1.6; }

    .list { max-width: 980px; margin: 0 auto; padding: clamp(40px,6vw,72px) clamp(16px,4vw,48px); display:flex; flex-direction:column; gap: 24px; }
    .empty { text-align:center; color: var(--lita-muted); font-size:1.05rem; padding: 40px 0; }

    .plan { background:#fff; border:1px solid #eadfce; border-radius:20px; padding: 30px clamp(20px,3vw,36px); box-shadow: 0 12px 32px -22px rgba(46,26,82,.5); position:relative; }
    .plan--featured { border-color: var(--lita-gold); }
    .plan__img { width: 100%; height: 200px; object-fit: cover; border-radius: 14px; margin-bottom: 18px; }

    .plan__head { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
    .plan__icon { width:54px; height:54px; border-radius:14px; display:grid; place-items:center; background: color-mix(in srgb, var(--lita-violet) 12%, #fff); color: var(--lita-violet); flex-shrink:0; }
    .plan__icon mat-icon { font-size:30px; width:30px; height:30px; }
    .plan__head h2 { margin:0; font-size:1.3rem; color: var(--lita-violet-deep); }
    .plan__tagline { margin:2px 0 0; color: var(--lita-muted); font-size:.92rem; }
    .plan__badge { margin-left:auto; align-self:flex-start; background: var(--lita-gold); color: var(--lita-violet-deep); font-size:.7rem; font-weight:700; padding:4px 10px; border-radius:999px; text-transform:uppercase; }

    .plan__desc { color: var(--lita-ink); line-height:1.65; margin: 0 0 18px; }

    .plan__features { list-style:none; padding:0; margin:0 0 18px; display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:8px 18px; }
    .plan__features li { display:flex; align-items:flex-start; gap:8px; color: var(--lita-ink); font-size:.95rem; }
    .plan__features mat-icon { color:#3fa46a; font-size:20px; width:20px; height:20px; flex-shrink:0; margin-top:1px; }

    .plan__meta { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:22px; }
    .chip { display:inline-flex; align-items:center; gap:6px; background: var(--lita-cream); border:1px solid #eadfce; color: var(--lita-muted); border-radius:999px; padding:6px 12px; font-size:.85rem; }
    .chip mat-icon { font-size:16px; width:16px; height:16px; }

    .plan__foot { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; border-top:1px solid #f0e8da; padding-top:18px; }
    .plan__price { font-size:1.4rem; font-weight:800; color: var(--lita-violet-deep); }
    .plan__price small { font-size:.85rem; font-weight:500; color: var(--lita-muted); }

    .btn { display:inline-flex; align-items:center; justify-content:center; padding:12px 26px; border-radius:999px; text-decoration:none; font-weight:700; transition: transform .12s, filter .15s; }
    .btn:hover { transform: translateY(-1px); }
    .btn--violet { background: var(--lita-violet); color:#fff; }
  `],
})
export class MembershipsComponent implements OnInit {
  private content = inject(ContentService);
  memberships = signal<Membership[]>([]);
  inscriptionOpens = INSCRIPTION_OPENS;
  price = formatPrice;

  async ngOnInit(): Promise<void> {
    this.memberships.set(await this.content.getMemberships());
  }
}
