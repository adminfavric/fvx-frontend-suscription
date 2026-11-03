import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PublicEvent } from '../../../core/services/content.service';
import { formatPrice } from '../../data/catalog';
import { formatLongDate, formatSchedule } from '../event-format';

/** Datos clave con íconos: fecha, horario, lugar y (opcional) valor. */
@Component({
  selector: 'app-event-facts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-facts.component.html',
})
export class EventFactsComponent {
  event = input.required<PublicEvent>();
  withPrice = input(true);

  dateText = computed(() => {
    const date = this.event().date;
    return date ? formatLongDate(date) : 'Fecha por anunciar';
  });
  scheduleText = computed(() => formatSchedule(this.event().date, this.event().end_date));
  priceText = computed(() => formatPrice(this.event().price));
}
