import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PublicEvent } from '../../../core/services/content.service';

/** Imagen del evento; sin `image_url` cae al ícono del evento (como hoy). */
@Component({
  selector: 'app-event-image',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './event-image.component.html',
})
export class EventImageComponent {
  event = input.required<PublicEvent>();
  /** Junto a un título que ya nombra el evento: texto alternativo vacío. */
  decorative = input(false);
  lazy = input(true);

  altText = computed(() => (this.decorative() ? '' : this.event().image_alt || this.event().name));
}
