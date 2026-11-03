import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Lista «Incluye» con ✓. */
@Component({
  selector: 'app-event-includes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-includes.component.html',
})
export class EventIncludesComponent {
  items = input.required<string[]>();
}
