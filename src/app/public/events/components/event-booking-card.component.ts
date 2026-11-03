import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PublicEvent } from '../../../core/services/content.service';
import { formatPrice } from '../../data/catalog';
import { EventInterestFormComponent } from './event-interest-form.component';

/** «Reserva tu cupo»: precio, alojamiento opcional, formulario y condiciones. */
@Component({
  selector: 'app-event-booking-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EventInterestFormComponent],
  templateUrl: './event-booking-card.component.html',
})
export class EventBookingCardComponent {
  event = input.required<PublicEvent>();

  priceText = computed(() => formatPrice(this.event().price));
  lodgingPriceText = computed(() => formatPrice(this.event().lodging_price ?? null));
  offersLodging = computed(() => !!this.event().lodging_price);
}
