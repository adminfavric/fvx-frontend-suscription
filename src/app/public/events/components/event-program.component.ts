import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EventProgramItem } from '../../../core/services/content.service';

/** Línea de tiempo del programa; las filas destacadas van en oro. */
@Component({
  selector: 'app-event-program',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-program.component.html',
})
export class EventProgramComponent {
  items = input.required<EventProgramItem[]>();
}
