import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEvent } from '../../../core/services/content.service';
import { formatDayMonthYear, formatShortDate } from '../event-format';
import { EventImageComponent } from './event-image.component';
import { EventStatusChipComponent } from './event-status-chip.component';

/** En el detalle de un evento finalizado: no vende y muestra el próximo. */
@Component({
  selector: 'app-event-finished-notice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EventImageComponent, EventStatusChipComponent],
  templateUrl: './event-finished-notice.component.html',
})
export class EventFinishedNoticeComponent {
  event = input.required<PublicEvent>();
  next = input<PublicEvent | null>(null);

  dateText = computed(() => {
    const date = this.event().date;
    return date ? ` el ${formatDayMonthYear(date)}` : '';
  });
  nextTitle = computed(() => {
    const next = this.next();
    return next ? [next.name, next.subtitle].filter(Boolean).join(': ') : '';
  });
  nextMeta = computed(() => {
    const next = this.next();
    if (!next) return '';
    return [next.date ? formatShortDate(next.date) : '', next.location].filter(Boolean).join(' · ');
  });
}
