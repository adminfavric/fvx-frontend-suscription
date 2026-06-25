import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Membership, formatPrice } from '../data/catalog';
import { ContentService } from '../../core/services/content.service';
import { MemberAuthService } from '../services/member-auth.service';
import { LaunchScheduleComponent } from './launch-schedule.component';

@Component({
  selector: 'app-memberships',
  standalone: true,
  imports: [RouterLink, MatIconModule, LaunchScheduleComponent],
  template: `
    <!-- Bienvenida + calendario de iniciación (reemplaza el hero anterior) -->
    <app-launch-schedule />

    @if (cambiar()) {
      <div class="switch-bar">
        <mat-icon>swap_horiz</mat-icon>
        <span>Estás <strong>cambiando de plan</strong>. Elige tu nueva membresía: al contratarla, tu plan actual se cancela y <strong>conservas el acceso hasta el final del período ya pagado</strong>.</span>
      </div>
    }

    <section class="list">
      @for (m of memberships(); track m.slug) {
        <article class="plan" [class.plan--featured]="m.featured" [class.plan--current]="isCurrent(m.slug)">
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
            @if (isCurrent(m.slug)) {
              <span class="plan__current-tag"><mat-icon>check_circle</mat-icon> Tu plan actual</span>
            } @else {
              <a class="btn btn--violet" [routerLink]="['/membresias', m.slug]" [queryParams]="cambiar() ? { cambiar: 1 } : {}">
                {{ cambiar() ? 'Cambiar a este plan' : (m.priceMonthly ? 'Suscribirme' : 'Más información') }}
              </a>
            }
          </div>
        </article>
      } @empty {
        <p class="empty">Estamos preparando las membresías. Muy pronto disponibles aquí.</p>
      }
    </section>
  `,
  styles: [`
    :host { --lita-violet:#5b3a8a; --lita-violet-deep:#2e1a52; --lita-gold:#d9a441; --lita-cream:#faf6ef; --lita-ink:#2a2333; --lita-muted:#6b6478; display:block; }

    .list { max-width: 980px; margin: 0 auto; padding: clamp(8px,2vw,24px) clamp(16px,4vw,48px) clamp(40px,6vw,72px); display:flex; flex-direction:column; gap: 24px; }
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

    .switch-bar { max-width: 980px; margin: 0 auto; padding: 14px 18px; display:flex; gap:10px; align-items:flex-start;
      background: color-mix(in srgb, var(--lita-gold) 16%, #fff); border:1px solid color-mix(in srgb, var(--lita-gold) 45%, transparent);
      border-radius:14px; color: var(--lita-ink); font-size:.92rem; line-height:1.5; }
    .switch-bar mat-icon { color:#b9842b; flex:0 0 auto; }
    .switch-bar strong { color: var(--lita-violet-deep); }
    .plan--current { border-color: var(--lita-violet); box-shadow: 0 0 0 2px color-mix(in srgb, var(--lita-violet) 22%, transparent); }
    .plan__current-tag { display:inline-flex; align-items:center; gap:6px; color: var(--lita-violet); font-weight:700; font-size:.92rem; }
    .plan__current-tag mat-icon { color:#1f7a45; font-size:20px; width:20px; height:20px; }
  `],
})
export class MembershipsComponent implements OnInit {
  private content = inject(ContentService);
  private member = inject(MemberAuthService);
  private route = inject(ActivatedRoute);
  memberships = signal<Membership[]>([]);
  /** El visitante viene "cambiando de plan" (desde Mi contenido). */
  cambiar = signal(false);
  /** Slugs de los planes que el miembro YA tiene activos (para marcarlos). */
  myPlanSlugs = signal<string[]>([]);
  price = formatPrice;

  /** ¿El miembro ya tiene este plan activo? */
  isCurrent(slug: string): boolean {
    return this.myPlanSlugs().includes(slug);
  }

  async ngOnInit(): Promise<void> {
    const q = this.route.snapshot.queryParamMap;
    this.cambiar.set(q.get('cambiar') === '1');
    this.memberships.set(await this.content.getMemberships());

    // Planes activos del miembro (si está logueado) para marcarlos como actuales.
    const slugs = new Set<string>();
    const fromQuery = q.get('actual');
    if (fromQuery) slugs.add(fromQuery);
    if (this.member.isLoggedIn()) {
      try {
        const res = await this.member.getContent();
        (res.plans ?? []).forEach(p => slugs.add(p.slug));
      } catch { /* sin sesión válida: se ignora */ }
    }
    this.myPlanSlugs.set([...slugs]);
  }
}
