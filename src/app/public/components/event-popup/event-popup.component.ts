import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ContentService, PublicEvent } from '../../../core/services/content.service';

const STORAGE_KEY = 'event_popup_last_shown';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Campaña fija de la home (NO viene del backend de `/eventos`): se usa para
 * promocionar entradas vendidas por fuera, como Ticketmaster, sin crear un
 * `Event` en el admin. Poner en `null` para volver al popup automático de
 * eventos especiales.
 */
const STATIC_CAMPAIGN: { image?: string; video?: string; alt: string; href: string } | null = {
  video: '/assets/campaigns/congreso-reel.mp4',
  alt: 'Primer Congreso Internacional de Medicina y Psicología Transpersonal — 8 de noviembre',
  href: 'https://www.ticketmaster.cl/event/primer-congreso-internacional-de-medicina-y-psicologa-transpersonal-metropolitan-santiago',
};

/**
 * Popup de la home con la imagen del próximo evento especial (/eventos), o
 * de `STATIC_CAMPAIGN` si está definida (tiene prioridad). Se muestra una
 * sola vez por día por visitante (localStorage). Si no hay nada que mostrar,
 * o ya se mostró hoy, el componente no renderiza nada.
 */
@Component({
  selector: 'app-event-popup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  template: `
    @if (campaign(); as c) {
      <div class="popup-backdrop" (click)="dismiss()">
        <div class="popup-card" (click)="$event.stopPropagation()">
          <button class="popup-close" type="button" (click)="dismiss()" aria-label="Cerrar">
            <mat-icon>close</mat-icon>
          </button>
          <a [href]="c.href" target="_blank" rel="noopener" (click)="dismiss()">
            @if (c.video) {
              <video [src]="c.video" [attr.aria-label]="c.alt" autoplay loop muted playsinline></video>
            } @else {
              <img [src]="c.image" [alt]="c.alt" />
            }
          </a>
        </div>
      </div>
    } @else if (event(); as e) {
      <div class="popup-backdrop" (click)="dismiss()">
        <div class="popup-card" (click)="$event.stopPropagation()">
          <button class="popup-close" type="button" (click)="dismiss()" aria-label="Cerrar">
            <mat-icon>close</mat-icon>
          </button>
          <a [routerLink]="['/eventos']" (click)="dismiss()">
            <img [src]="e.image_url" [alt]="e.name" />
          </a>
        </div>
      </div>
    }
  `,
  styles: [`
    .popup-backdrop {
      position: fixed; inset: 0; z-index: 1000; background: rgba(26,14,38,.72);
      display: flex; align-items: center; justify-content: center; padding: 24px;
      animation: fade .2s ease;
    }
    .popup-card {
      position: relative; max-width: min(90vw, 560px); max-height: calc(100vh - 48px);
      border-radius: 20px; overflow: hidden; box-shadow: 0 30px 70px -20px rgba(0,0,0,.55);
      animation: pop .25s ease; line-height: 0;
    }
    /* Alto como límite principal (imagen retrato) y ancho como tope en
       pantallas chicas — así en desktop se ve grande de verdad, y en una
       ventana baja no se corta ni empuja la X fuera de pantalla. */
    .popup-card img, .popup-card video { display: block; width: auto; height: auto; max-width: 100%; max-height: calc(100vh - 48px); cursor: pointer; }
    .popup-close {
      position: absolute; top: 10px; right: 10px; z-index: 1;
      width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer;
      background: rgba(0,0,0,.55); color: #fff; display: grid; place-items: center;
    }
    .popup-close:hover { background: rgba(0,0,0,.75); }
    .popup-close mat-icon { font-size: 20px; width: 20px; height: 20px; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pop { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class EventPopupComponent implements OnInit {
  private content = inject(ContentService);
  campaign = signal(STATIC_CAMPAIGN);
  event = signal<PublicEvent | null>(null);

  async ngOnInit(): Promise<void> {
    if (localStorage.getItem(STORAGE_KEY) === todayKey()) {
      this.campaign.set(null);
      return;
    }
    if (STATIC_CAMPAIGN) {
      localStorage.setItem(STORAGE_KEY, todayKey());
      return;
    }

    const events = await this.content.getEvents();
    const withImage = events.find((e) => e.image_url);
    if (!withImage) return;

    this.event.set(withImage);
    localStorage.setItem(STORAGE_KEY, todayKey());
  }

  dismiss(): void {
    this.campaign.set(null);
    this.event.set(null);
  }
}
