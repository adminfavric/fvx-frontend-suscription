import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { HeroComponent } from '../components/hero/hero.component';
import { AboutComponent } from '../components/about/about.component';
import { DocuserieComponent } from '../components/docuserie/docuserie.component';
import { ExperiencesComponent } from '../components/experiences/experiences.component';
import { HealingComponent } from '../components/healing/healing.component';
import { NewsletterComponent } from '../components/newsletter/newsletter.component';
import { Membership, INSCRIPTION_OPENS, formatPrice } from '../data/catalog';
import { ContentService } from '../../core/services/content.service';

/**
 * Home pública: composición del diseño original (hero/about/docuserie/…)
 * con la sección de Membresías integrada, que lee del backend Django
 * (`ContentService` → `/public/memberships/`) y enlaza al checkout de Flow.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    HeroComponent,
    AboutComponent,
    DocuserieComponent,
    ExperiencesComponent,
    HealingComponent,
    NewsletterComponent,
  ],
  template: `
    <app-hero />
    <app-about />

    <!-- MEMBRESÍAS (datos desde Django/Flow) -->
    <section id="membresias" class="memberships">
      <div class="memberships__inner">
        <header class="memberships__head">
          <span class="eyebrow">Comunidad Alkymia Solar</span>
          <h2>Membresías</h2>
          <p>Elige el espacio que resuena contigo. Puedes inscribirte en una o en varias.</p>
          <p class="opens"><mat-icon>event_available</mat-icon> Inscripciones abren el <strong>{{ inscriptionOpens }}</strong></p>
        </header>

        <div class="cards">
          @for (m of memberships(); track m.slug) {
            <article class="card" [class.card--featured]="m.featured">
              @if (m.featured) { <span class="card__badge">Destacada</span> }
              @if (m.image_url) { <img class="card__img" [src]="m.image_url" [alt]="m.name" loading="lazy" /> }
              <span class="card__icon"><mat-icon>{{ m.icon || 'auto_awesome' }}</mat-icon></span>
              <h3>{{ m.name }}</h3>
              <p class="card__tagline">{{ m.tagline }}</p>
              @if (m.description) { <p class="card__desc">{{ m.description }}</p> }
              <p class="card__price">{{ price(m.priceMonthly) }}@if (m.priceMonthly) {<small>/mes</small>}</p>
              <a class="card__cta" [routerLink]="['/membresias', m.slug]">
                {{ m.priceMonthly ? 'Suscribirme' : 'Más información' }}
              </a>
            </article>
          } @empty {
            <p class="cards__empty">Pronto publicaremos las membresías disponibles.</p>
          }
        </div>

        <div class="memberships__foot">
          <a class="link" routerLink="/membresias">Ver todas las membresías en detalle →</a>
        </div>
      </div>
    </section>

    <app-docuserie />
    <app-experiences />
    <app-healing />
    <app-newsletter />
  `,
  styles: [`
    .memberships {
      background:
        radial-gradient(1100px 480px at 85% -10%, rgba(201,162,39,.16), transparent 60%),
        linear-gradient(160deg, #ffffff 0%, #f4f0f8 100%);
      padding: clamp(56px, 8vw, 110px) clamp(16px, 4vw, 48px);
    }
    .memberships__inner { max-width: 1140px; margin: 0 auto; }
    .memberships__head { text-align: center; margin-bottom: 48px; }
    .eyebrow {
      display: inline-block; font-size: .78rem; letter-spacing: .18em; text-transform: uppercase;
      color: var(--color-gold-dark); font-weight: 600; margin-bottom: 12px;
    }
    .memberships__head h2 {
      font-family: 'Playfair Display', serif; font-weight: 700;
      font-size: clamp(2rem, 4vw, 2.9rem); color: var(--color-purple-dark); margin: 0 0 12px;
    }
    .memberships__head p { margin: 0 auto; color: var(--color-text-light); font-size: 1.08rem; max-width: 60ch; }
    .opens {
      display: inline-flex; align-items: center; justify-content: center; flex-wrap: wrap;
      gap: 4px 8px; margin-top: 18px !important; text-align: center;
      color: var(--color-purple); font-weight: 500; font-size: .98rem;
    }
    .opens mat-icon { color: var(--color-gold-dark); font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .opens strong { white-space: nowrap; }

    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 255px), 1fr)); gap: 26px; }
    .cards__empty { grid-column: 1 / -1; text-align: center; color: var(--color-text-light); }
    .card {
      position: relative; background: #fff; border: 1px solid #ece4f2; border-radius: 20px;
      padding: 32px 26px; display: flex; flex-direction: column; align-items: flex-start;
      box-shadow: var(--shadow-soft); transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    }
    .card:hover { transform: translateY(-4px); box-shadow: var(--shadow-medium); }
    .card--featured { border-color: var(--color-gold); box-shadow: 0 18px 44px -16px rgba(201,162,39,.5); }
    .card__badge {
      position: absolute; top: 18px; right: 18px;
      background: linear-gradient(135deg, var(--color-gold), var(--color-gold-dark)); color: #fff;
      font-size: .68rem; font-weight: 700; padding: 5px 11px; border-radius: 999px;
      text-transform: uppercase; letter-spacing: .05em;
    }
    .card__img { width: 100%; height: 150px; object-fit: cover; border-radius: 14px; margin-bottom: 16px; }
    .card__icon {
      width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; margin-bottom: 18px;
      background: linear-gradient(135deg, rgba(107,76,140,.12), rgba(201,162,39,.12)); color: var(--color-purple);
    }
    .card__icon mat-icon { font-size: 30px; width: 30px; height: 30px; }
    .card h3 { margin: 0 0 8px; font-size: 1.2rem; color: var(--color-slate); font-family: 'Playfair Display', serif; }
    .card__tagline { margin: 0 0 10px; color: var(--color-text-light); font-size: .92rem; line-height: 1.5; }
    .card__desc { margin: 0 0 18px; color: var(--color-text-light); font-size: .9rem; line-height: 1.6; flex: 1; }
    .card__price { margin: auto 0 20px; font-size: 1.35rem; font-weight: 700; color: var(--color-purple-dark); }
    .card__price small { font-size: .8rem; color: var(--color-text-light); font-weight: 500; }
    .card__cta {
      align-self: stretch; text-align: center; text-decoration: none;
      background: linear-gradient(135deg, var(--color-purple) 0%, var(--color-purple-dark) 100%);
      color: #fff; padding: 12px 18px; border-radius: 999px; font-weight: 600; font-size: .95rem;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    }
    .card__cta:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(107,76,140,.35); }

    .memberships__foot { text-align: center; margin-top: 40px; }
    .link { color: var(--color-purple); font-weight: 600; text-decoration: none; }
    .link:hover { color: var(--color-gold-dark); }
  `],
})
export class HomeComponent implements OnInit {
  private content = inject(ContentService);
  memberships = signal<Membership[]>([]);
  inscriptionOpens = INSCRIPTION_OPENS;
  price = formatPrice;

  async ngOnInit(): Promise<void> {
    this.memberships.set(await this.content.getMemberships());
  }
}
