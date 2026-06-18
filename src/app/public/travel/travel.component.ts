import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <header class="page-hero">
      <div class="inner">
        <span class="eyebrow">Experiencia de viajes</span>
        <h1>Viaja y vive la experiencia Alkymia</h1>
        <p>Viajes y encuentros presenciales en la casa/centro de Lita Donoso. Un espacio para profundizar el camino.</p>
      </div>
    </header>

    <section class="body">
      <div class="placeholder">
        <mat-icon>travel_explore</mat-icon>
        <h2>Próximos viajes y experiencias</h2>
        <p>
          Aquí se publicarán las próximas experiencias de viaje, retiros y visitas a la casa/centro,
          con fotos, fechas y formulario de interés. El contenido se cargará desde la administración.
        </p>
        <a class="btn btn--gold" routerLink="/membresias">Mientras tanto, conoce las membresías</a>
      </div>
    </section>
  `,
  styles: [`
    :host { --lita-violet:#5b3a8a; --lita-violet-deep:#2e1a52; --lita-gold:#d9a441; --lita-cream:#faf6ef; --lita-ink:#2a2333; --lita-muted:#6b6478; display:block; background:var(--lita-cream); min-height:60vh; }
    .page-hero { background: linear-gradient(160deg, var(--lita-violet), var(--lita-violet-deep)); color:#fff; }
    .inner { max-width:900px; margin:0 auto; padding: clamp(48px,7vw,90px) clamp(16px,4vw,48px); text-align:center; }
    .eyebrow { color: var(--lita-gold); letter-spacing:.16em; text-transform:uppercase; font-size:.78rem; }
    .page-hero h1 { margin:14px 0 12px; font-size: clamp(1.9rem,4vw,2.8rem); }
    .page-hero p { margin:0 auto; max-width:52ch; color:#e9e2f2; line-height:1.6; }
    .body { max-width:760px; margin:0 auto; padding: clamp(40px,6vw,72px) clamp(16px,4vw,48px); }
    .placeholder { background:#fff; border:1px dashed #d9cdbb; border-radius:20px; padding: clamp(32px,5vw,56px); text-align:center; }
    .placeholder mat-icon { font-size:48px; width:48px; height:48px; color: var(--lita-gold); }
    .placeholder h2 { margin:14px 0 10px; color: var(--lita-violet-deep); }
    .placeholder p { margin:0 auto 22px; color: var(--lita-muted); line-height:1.6; max-width:48ch; }
    .btn { display:inline-flex; align-items:center; justify-content:center; padding:12px 24px; border-radius:999px; text-decoration:none; font-weight:700; }
    .btn--gold { background: var(--lita-gold); color: var(--lita-violet-deep); }
  `],
})
export class TravelComponent {}
