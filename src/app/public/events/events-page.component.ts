import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ContentService, PublicEvent } from '../../core/services/content.service';
import { isEventPast } from './event-format';
import { ActiveEventCardComponent } from './components/active-event-card.component';
import { PastEventCardComponent } from './components/past-event-card.component';

/** Fecha de orden: los finalizados van del más reciente al más antiguo. */
function sortKey(event: PublicEvent): number {
  return event.date ? new Date(event.date).getTime() : 0;
}

/**
 * /eventos: «Próximos encuentros» y «Encuentros anteriores». Qué evento ya
 * terminó lo decide el servidor (`is_past`) si lo envía; si no, `isEventPast`.
 * Presenciales con pago por transferencia: «Quiero ir» deja un Lead.
 */
@Component({
  selector: 'app-events-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Hoja común de /eventos (clases con prefijo `ev-`), compartida con el detalle.
  encapsulation: ViewEncapsulation.None,
  imports: [ActiveEventCardComponent, PastEventCardComponent],
  templateUrl: './events-page.component.html',
  styleUrl: './events.scss',
})
export class EventsPageComponent implements OnInit {
  private content = inject(ContentService);

  events = signal<PublicEvent[]>([]);
  loaded = signal(false);
  upcoming = computed(() => this.events().filter((e) => !isEventPast(e)));
  past = computed(() => this.events().filter((e) => isEventPast(e)).sort((a, b) => sortKey(b) - sortKey(a)));

  async ngOnInit(): Promise<void> {
    this.events.set(await this.content.getEvents());
    this.loaded.set(true);
  }
}
