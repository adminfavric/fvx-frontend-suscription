import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <header class="page-hero">
      <div class="inner">
        <span class="eyebrow">Noticias</span>
        <h1>Lo que está pasando</h1>
        <p>Novedades de Alkymia Solar, lanzamientos y la docuserie.</p>
      </div>
    </header>

    <section class="body">
      <article class="story">
        <span class="story__tag">Docuserie</span>
        <h2>El lanzamiento de la docuserie</h2>
        <p class="story__lead">
          Aquí quedará registrado todo lo que fue el lanzamiento de la docuserie: el evento,
          las fotos, los textos y los videos de testimonios. Seguiremos promocionando la serie
          en otras plataformas.
        </p>
        <div class="media-grid">
          <div class="media media--photo"><mat-icon>photo_library</mat-icon><span>Fotos del lanzamiento</span></div>
          <div class="media media--video"><mat-icon>play_circle</mat-icon><span>Video de testimonios</span></div>
          <div class="media media--text"><mat-icon>article</mat-icon><span>Crónica del evento</span></div>
        </div>
        <p class="story__note">El contenido (fotos, textos y videos) se cargará desde la administración.</p>
      </article>
    </section>
  `,
  styles: [`
    :host { --lita-violet:#5b3a8a; --lita-violet-deep:#2e1a52; --lita-gold:#d9a441; --lita-cream:#faf6ef; --lita-ink:#2a2333; --lita-muted:#6b6478; display:block; background:var(--lita-cream); min-height:60vh; }
    .page-hero { background: linear-gradient(160deg, var(--lita-violet), var(--lita-violet-deep)); color:#fff; }
    .inner { max-width:900px; margin:0 auto; padding: clamp(48px,7vw,90px) clamp(16px,4vw,48px); text-align:center; }
    .eyebrow { color: var(--lita-gold); letter-spacing:.16em; text-transform:uppercase; font-size:.78rem; }
    .page-hero h1 { margin:14px 0 12px; font-size: clamp(1.9rem,4vw,2.8rem); }
    .page-hero p { margin:0 auto; max-width:52ch; color:#e9e2f2; line-height:1.6; }
    .body { max-width:860px; margin:0 auto; padding: clamp(40px,6vw,72px) clamp(16px,4vw,48px); }
    .story { background:#fff; border:1px solid #eadfce; border-radius:20px; padding: clamp(28px,4vw,44px); }
    .story__tag { display:inline-block; background: color-mix(in srgb, var(--lita-violet) 12%, #fff); color: var(--lita-violet); font-weight:700; font-size:.75rem; text-transform:uppercase; letter-spacing:.06em; padding:5px 12px; border-radius:999px; }
    .story h2 { margin:14px 0 12px; color: var(--lita-violet-deep); font-size: clamp(1.5rem,3vw,2rem); }
    .story__lead { color: var(--lita-ink); line-height:1.7; margin:0 0 24px; }
    .media-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin-bottom:20px; }
    .media { border-radius:14px; padding:28px 18px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px; color: var(--lita-violet-deep); background: var(--lita-cream); border:1px dashed #d9cdbb; }
    .media mat-icon { font-size:36px; width:36px; height:36px; color: var(--lita-gold); }
    .media span { font-size:.9rem; font-weight:600; }
    .story__note { margin:0; color: var(--lita-muted); font-size:.85rem; }
  `],
})
export class NewsComponent {}
