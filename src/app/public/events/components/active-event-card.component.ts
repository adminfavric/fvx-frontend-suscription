import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEvent } from '../../../core/services/content.service';
import { formatPrice } from '../../data/catalog';
import { EventFactsComponent } from './event-facts.component';
import { EventImageComponent } from './event-image.component';
import { EventStatusChipComponent } from './event-status-chip.component';

/** Tarjeta grande de un evento próximo en /eventos. */
@Component({
  selector: 'app-active-event-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EventFactsComponent, EventImageComponent, EventStatusChipComponent],
  templateUrl: './active-event-card.component.html',
})
export class ActiveEventCardComponent {
  event = input.required<PublicEvent>();

  priceText = computed(() => formatPrice(this.event().price));
  priceNote = computed(() => {
    const lodging = this.event().lodging_price ? 'alojamiento opcional' : '';
    return [this.event().price_note, lodging].filter(Boolean).join(' · ');
  });
}
