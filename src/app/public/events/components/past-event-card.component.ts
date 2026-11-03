import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEvent } from '../../../core/services/content.service';
import { formatShortDate } from '../event-format';
import { EventImageComponent } from './event-image.component';
import { EventStatusChipComponent } from './event-status-chip.component';

/** Tarjeta resumida de un evento finalizado: todo el bloque enlaza al detalle. */
@Component({
  selector: 'app-past-event-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EventImageComponent, EventStatusChipComponent],
  templateUrl: './past-event-card.component.html',
})
export class PastEventCardComponent {
  event = input.required<PublicEvent>();

  meta = computed(() => {
    const e = this.event();
    return [e.date ? formatShortDate(e.date) : '', e.location, e.subtitle].filter(Boolean).join(' · ');
  });
}
