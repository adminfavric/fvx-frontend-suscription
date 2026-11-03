import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type EventStatus = 'upcoming' | 'finished';

/** Chip de estado: «Próximo encuentro» (oro) o «Finalizado» (gris). */
@Component({
  selector: 'app-event-status-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-status-chip.component.html',
})
export class EventStatusChipComponent {
  status = input.required<EventStatus>();
  /** Versión corta («Próximo») para la mini tarjeta. */
  compact = input(false);

  label = computed(() => {
    if (this.status() === 'finished') return 'Finalizado';
    return this.compact() ? 'Próximo' : 'Próximo encuentro';
  });
}
