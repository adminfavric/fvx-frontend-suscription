import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Bloque de lanzamiento que se muestra ANTES de las membresías: mensaje de
 * bienvenida de la nueva plataforma + "Próximas actividades" (calendario de
 * iniciación por nivel de suscripción, en horario de Chile). Es contenido
 * estático de campaña; cuando la plataforma esté poblada se puede retirar o
 * mover a administración.
 */
interface Activity {
  title: string;
  when: string;
}
interface Tier {
  name: string;
  badge?: string;
  featured?: boolean;
  items: Activity[];
}

@Component({
  selector: 'app-launch-schedule',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <!-- Mensaje de bienvenida -->
    <section class="intro">
      <span class="eyebrow">Nueva plataforma</span>
      <h2>Estamos preparando tu espacio con mucho cariño</h2>
      <p>
        Este es un espacio donde podrás
        acceder al nutritivo contenido que estamos creando para ti: videos, libros, talleres y
        nuestros encuentros por Zoom dedicados especialmente a nuestra comunidad.
      </p>
      <p>
        Ya tenemos las primeras fechas confirmadas. Si aún no ves nada en tu panel de
        suscripción, ¡no te preocupes! Aquí abajo te compartimos el calendario de iniciación.
      </p>
      <p class="gift">
        <mat-icon>card_giftcard</mat-icon>
        <span>
          Y como agradecimiento por tu confianza y tu espera, quienes se hayan registrado
          <strong>antes del 25 de junio</strong> recibirán un <strong>regalo sorpresa</strong>. 🎁
        </span>
      </p>
    </section>

    <!-- Próximas actividades (calendario por nivel) -->
    <section class="schedule">
      <div class="schedule__inner">
        <div class="schedule__top">
          <span class="brand"><em>Experiencias</em> LITA DONOSO</span>
          <span class="tz">Horarios de Chile · GMT-3</span>
        </div>
        <span class="eyebrow eyebrow--gold">Inicia el contenido</span>
        <h3>Próximas actividades</h3>

        <div class="cols">
          @for (t of tiers; track t.name) {
            <article class="col" [class.col--featured]="t.featured">
              @if (t.badge) { <span class="col__badge">{{ t.badge }}</span> }
              <h4>{{ t.name }}</h4>
              <ul>
                @for (a of t.items; track a.title) {
                  <li>
                    <span class="dot"></span>
                    <div>
                      <p class="act">{{ a.title }}</p>
                      <p class="when">{{ a.when }}</p>
                    </div>
                  </li>
                }
              </ul>
            </article>
          }
        </div>

        <p class="sign">Con cariño,<br /><strong>Grupo Alkymia</strong></p>
      </div>
    </section>
  `,
  styles: [`
    :host {
      --lita-violet:#5b3a8a; --lita-violet-deep:#2e1a52; --lita-gold:#d9a441;
      --lita-cream:#faf6ef; --lita-ink:#2a2333; --lita-muted:#6b6478;
      display:block;
    }

    /* ── Bienvenida ── */
    .intro { max-width: 760px; margin: 0 auto; padding: clamp(36px,5vw,64px) clamp(16px,4vw,48px) clamp(12px,2vw,24px); text-align:center; }
    .eyebrow { color: var(--lita-gold); letter-spacing:.16em; text-transform:uppercase; font-size:.78rem; font-weight:700; }
    .intro h2 { margin:12px 0 18px; color: var(--lita-violet-deep); font-size: clamp(1.5rem,3vw,2.1rem); }
    .intro p { color: var(--lita-ink); line-height:1.75; margin:0 0 14px; }
    .gift { display:flex; align-items:center; gap:12px; justify-content:flex-start; text-align:left; background: color-mix(in srgb, var(--lita-gold) 14%, #fff); border:1px solid color-mix(in srgb, var(--lita-gold) 40%, transparent); border-radius:16px; padding:16px 18px; margin-top:8px; }
    .gift mat-icon { color:#b9842b; flex:0 0 auto; font-size:28px; width:28px; height:28px; }
    .gift strong { color: var(--lita-violet-deep); }

    /* ── Calendario (estilo oscuro de la imagen) ── */
    .schedule { padding: clamp(24px,4vw,48px) clamp(16px,4vw,40px) clamp(40px,6vw,72px); }
    .schedule__inner {
      max-width: 1100px; margin: 0 auto; border-radius: 28px;
      padding: clamp(28px,4vw,56px) clamp(20px,4vw,52px);
      color:#f3ecff;
      background:
        radial-gradient(120% 90% at 85% 0%, rgba(217,164,65,.18), transparent 55%),
        linear-gradient(160deg, #3a2363 0%, var(--lita-violet-deep) 55%, #1c1036 100%);
      box-shadow: 0 30px 60px -30px rgba(46,26,82,.7);
    }
    .schedule__top { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom: clamp(20px,4vw,40px); }
    .brand { font-size:1.15rem; letter-spacing:.04em; color:#f3ecff; }
    .brand em { font-family:'Playfair Display', serif; font-style:italic; color:#fff; font-size:1.25rem; }
    .tz { color: var(--lita-gold); letter-spacing:.14em; text-transform:uppercase; font-size:.72rem; }
    .eyebrow--gold { display:block; }
    .schedule h3 { font-family:'Playfair Display', serif; margin:8px 0 clamp(22px,3vw,36px); font-size: clamp(1.9rem,4vw,2.7rem); color:#fff; font-weight:700; }

    .cols { display:grid; grid-template-columns: repeat(3, 1fr); gap: clamp(14px,2vw,22px); }
    .col { position:relative; border:1px solid rgba(217,164,65,.18); border-radius:18px; padding: clamp(20px,2.5vw,28px); background: rgba(255,255,255,.03); }
    .col--featured { border-color: rgba(217,164,65,.6); background: rgba(217,164,65,.06); }
    .col__badge { position:absolute; top:-12px; left:50%; transform:translateX(-50%); white-space:nowrap; background: var(--lita-gold); color: var(--lita-violet-deep); font-size:.66rem; font-weight:800; letter-spacing:.08em; padding:5px 14px; border-radius:999px; text-transform:uppercase; }
    .col h4 { margin:6px 0 18px; color: var(--lita-gold); letter-spacing:.12em; font-size:1rem; border-bottom:1px solid rgba(217,164,65,.25); padding-bottom:14px; }
    .col ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:18px; }
    .col li { display:flex; gap:10px; align-items:flex-start; }
    .dot { width:7px; height:7px; border-radius:50%; background: var(--lita-gold); margin-top:9px; flex:0 0 auto; }
    .act { font-family:'Playfair Display', serif; margin:0; color:#fbf7ff; font-size:1.05rem; line-height:1.4; }
    .when { margin:4px 0 0; color: color-mix(in srgb, var(--lita-gold) 85%, #fff); font-size:.82rem; letter-spacing:.02em; }

    .sign { margin: clamp(26px,4vw,40px) 0 0; color:#e9e2f2; line-height:1.6; }
    .sign strong { color:#fff; font-family:'Playfair Display', serif; font-size:1.1rem; }

    @media (max-width: 820px) { .cols { grid-template-columns: 1fr; } .col__badge { left:18px; transform:none; } }
  `],
})
export class LaunchScheduleComponent {
  tiers: Tier[] = [
    {
      name: 'BÁSICO',
      items: [
        { title: 'Taller Alkymia Solar para Principiantes', when: 'Domingo 28 · 03:00 PM' },
      ],
    },
    {
      name: 'PREMIUM',
      items: [
        { title: 'Taller de Sanación del Árbol Genealógico', when: 'Domingo 28 · 10:00 AM' },
        { title: 'Taller Alkymia Solar para Principiantes', when: 'Domingo 28 · 03:00 PM' },
        { title: 'Podcast + Conversatorio (tema sorpresa)', when: 'Lunes 29 · 10:00 AM' },
      ],
    },
    {
      name: 'ORO',
      badge: 'Acceso completo',
      featured: true,
      items: [
        { title: 'Taller de Sanación del Árbol Genealógico', when: 'Domingo 28 · 10:00 AM' },
        { title: 'Taller Alkymia Solar para Principiantes', when: 'Domingo 28 · 03:00 PM' },
        { title: 'Podcast + Conversatorio (tema sorpresa)', when: 'Lunes 29 · 10:00 AM' },
        { title: 'Escuelas', when: 'Fechas por definir' },
      ],
    },
  ];
}
