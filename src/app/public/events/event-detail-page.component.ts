import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewEncapsulation, computed, effect, inject, input, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContentService, PublicEvent } from '../../core/services/content.service';
import { formatWeekdayDay, splitParagraphs } from './event-format';
import { EventBookingCardComponent } from './components/event-booking-card.component';
import { EventFactsComponent } from './components/event-facts.component';
import { EventFinishedNoticeComponent } from './components/event-finished-notice.component';
import { EventImageComponent } from './components/event-image.component';
import { EventIncludesComponent } from './components/event-includes.component';
import { EventProgramComponent } from './components/event-program.component';
import { EventStatusChipComponent } from './components/event-status-chip.component';

const BOOKING_ANCHOR = 'reservar';
const SITE_NAME = 'Experiencias Lita Donoso';

/**
 * /eventos/:slug — una ruta y no un popup: se comparte por WhatsApp, funciona
 * con «atrás» y se lee cómodo en el celular. Un slug que no existe vuelve a la
 * lista. Si el evento ya terminó, no vende: muestra el aviso y el próximo.
 */
@Component({
  selector: 'app-event-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    RouterLink, EventBookingCardComponent, EventFactsComponent, EventFinishedNoticeComponent,
    EventImageComponent, EventIncludesComponent, EventProgramComponent, EventStatusChipComponent,
  ],
  templateUrl: './event-detail-page.component.html',
  styleUrl: './events.scss',
})
export class EventDetailPageComponent {
  private content = inject(ContentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private title = inject(Title);
  private host = inject(ElementRef<HTMLElement>);

  /** Viene de la ruta (`withComponentInputBinding`). */
  slug = input.required<string>();

  event = signal<PublicEvent | null>(null);
  next = signal<PublicEvent | null>(null);
  private fragment = signal<string | null>(null);

  paragraphs = computed(() => splitParagraphs(this.event()?.description));
  programTitle = computed(() => {
    const e = this.event();
    if (e?.is_past) return 'Cómo fue el día';
    return e?.date ? `Programa del ${formatWeekdayDay(e.date)}` : 'Programa';
  });

  constructor() {
    this.route.fragment.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((f) => this.fragment.set(f));
    effect(() => void this.load(this.slug()));
    effect(() => {
      if (this.event() && this.fragment() === BOOKING_ANCHOR) setTimeout(() => this.scrollToBooking());
    });
  }

  private async load(slug: string): Promise<void> {
    this.event.set(null);
    const [event, all] = await Promise.all([this.content.getEvent(slug), this.content.getEvents()]);
    if (!event) {
      void this.router.navigate(['/eventos'], { replaceUrl: true });
      return;
    }
    this.event.set(event);
    this.next.set(all.find((e) => !e.is_past && e.slug !== slug) ?? null);
    this.title.setTitle(`${[event.name, event.subtitle].filter(Boolean).join(': ')} · ${SITE_NAME}`);
  }

  scrollToBooking(): void {
    const target = this.host.nativeElement.querySelector(`#${BOOKING_ANCHOR}`) as HTMLElement | null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
