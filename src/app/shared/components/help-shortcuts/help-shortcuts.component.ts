import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';

import { APP_CONFIG } from '../../../core/config/app-config.token';

interface ShortcutRow {
  /** i18n key del nombre de la acción. */
  labelKey: string;
  /** Teclas a renderizar como `<kbd>`. Cadenas adicionales se renderizan literales. */
  keys: string[];
  /** Marca como "próximamente". */
  upcoming?: boolean;
}

/**
 * Modal informativa con los atajos de teclado disponibles. Se abre desde
 * el icono `?` del topbar vía ``ContentDialogComponent.openWith``.
 *
 * El template mantiene una lista corta y honesta — solo lo que realmente
 * funciona hoy en el shell. La paleta de comandos `⌘K` se añadirá en un
 * pase posterior.
 */
@Component({
  selector: 'app-help-shortcuts',
  standalone: true,
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hs">
      <p class="hs__intro">{{ 'layout.help.intro' | transloco }}</p>
      <table class="hs__table" role="table">
        <thead>
          <tr>
            <th>{{ 'layout.help.action' | transloco }}</th>
            <th>{{ 'layout.help.shortcut' | transloco }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of shortcuts; track row.labelKey) {
            <tr [class.hs__row--upcoming]="row.upcoming">
              <td>
                {{ row.labelKey | transloco }}
                @if (row.upcoming) {
                  <span class="hs__pill">{{ 'layout.help.upcoming' | transloco }}</span>
                }
              </td>
              <td class="hs__keys">
                @for (key of row.keys; track $index; let last = $last) {
                  <kbd>{{ key }}</kbd>
                  @if (!last) { <span class="hs__sep">+</span> }
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
      <p class="hs__version">
        {{ 'layout.help.version' | transloco: { version: version } }}
      </p>
    </div>
  `,
  styles: [`
    :host { display: block; color: var(--fvx-text-primary); }

    .hs__intro {
      margin: 0 0 12px;
      color: var(--fvx-text-secondary);
      font-size: 0.9375rem;
    }

    .hs__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .hs__table th,
    .hs__table td {
      text-align: left;
      padding: 8px 6px;
      border-bottom: 1px solid var(--fvx-border);
    }

    .hs__table th {
      font-weight: 600;
      color: var(--fvx-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 0.75rem;
    }

    .hs__row--upcoming {
      opacity: 0.65;
    }

    .hs__pill {
      display: inline-block;
      margin-left: 8px;
      padding: 1px 8px;
      border-radius: 9999px;
      background: var(--fvx-hover-bg, color-mix(in srgb, var(--fvx-text-primary) 8%, transparent));
      color: var(--fvx-text-secondary);
      font-size: 0.6875rem;
      font-weight: 500;
      vertical-align: middle;
    }

    .hs__keys kbd {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--fvx-bg-card);
      border: 1px solid var(--fvx-border);
      box-shadow: 0 1px 0 var(--fvx-border);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.8125rem;
      color: var(--fvx-text-primary);
    }

    .hs__sep {
      margin: 0 4px;
      color: var(--fvx-text-muted);
    }

    .hs__version {
      margin: 14px 0 0;
      font-size: 0.75rem;
      color: var(--fvx-text-muted);
    }
  `],
})
export class HelpShortcutsComponent {
  readonly version = inject(APP_CONFIG).version;

  readonly shortcuts: ShortcutRow[] = [
    { labelKey: 'layout.help.shortcuts.commandPalette', keys: ['Ctrl / ⌘', 'K'] },
    { labelKey: 'layout.help.shortcuts.closeDialog', keys: ['Esc'] },
    { labelKey: 'layout.help.shortcuts.submitForm', keys: ['Enter'] },
  ];
}
