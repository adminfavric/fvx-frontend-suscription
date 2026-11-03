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
    // En la tarjeta resumida va el subtítulo corto (hasta la primera coma); el completo queda en el detalle.
    const shortSubtitle = (e.subtitle ?? '').split(',')[0].trim();
    return [e.date ? formatShortDate(e.date) : '', e.location, shortSubtitle].filter(Boolean).join(' · ');
  });
}
