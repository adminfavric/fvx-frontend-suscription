import { Component, Input, computed, signal } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CopyButtonComponent } from '../copy-button/copy-button.component';

/**
 * Inspector JSON ligero (sin dependencias extra). Útil para payloads, metadata,
 * `theme_overrides`, logs API, etc.
 *
 * ```html
 * <app-json-viewer [data]="payload" />
 * <app-json-viewer [data]="payload" [initialExpand]="false" [copyable]="true" />
 * ```
 */
@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, CopyButtonComponent],
  template: `
    <div class="json-viewer">
      @if (copyable) {
        <div class="json-viewer__toolbar">
          <app-copy-button [value]="asString()" [notify]="true" tooltip="Copy JSON" />
        </div>
      }
      <pre class="json-viewer__pre" [class.json-viewer__pre--no-wrap]="!wrap"
        [innerHTML]="highlighted()"></pre>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .json-viewer {
      position: relative;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      font-family: 'JetBrains Mono', 'Fira Code', 'Menlo', monospace;
      font-size: 0.8125rem;
    }
    .json-viewer__toolbar {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 1;
    }
    .json-viewer__toolbar ::ng-deep .copy-button mat-icon { color: #94a3b8; }
    .json-viewer__pre {
      margin: 0;
      padding: 12px 16px;
      max-height: 480px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .json-viewer__pre--no-wrap { white-space: pre; word-break: normal; }
    :host ::ng-deep .jv-key { color: #60a5fa; }
    :host ::ng-deep .jv-string { color: #86efac; }
    :host ::ng-deep .jv-number { color: #fbbf24; }
    :host ::ng-deep .jv-bool { color: #f472b6; }
    :host ::ng-deep .jv-null { color: #94a3b8; font-style: italic; }
  `],
})
export class JsonViewerComponent {
  @Input() set data(v: unknown) { this._data.set(v); }
  @Input() initialExpand = true;
  @Input() copyable = true;
  @Input() wrap = true;

  private _data = signal<unknown>(null);

  asString = computed<string>(() => {
    try {
      return JSON.stringify(this._data(), null, 2) ?? '';
    } catch {
      return String(this._data());
    }
  });

  highlighted = computed<string>(() => this.syntaxHighlight(this.asString()));

  private syntaxHighlight(raw: string): string {
    const esc = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return esc.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'jv-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'jv-key' : 'jv-string';
        } else if (/true|false/.test(match)) {
          cls = 'jv-bool';
        } else if (/null/.test(match)) {
          cls = 'jv-null';
        }
        return `<span class="${cls}">${match}</span>`;
      },
    );
  }
}
