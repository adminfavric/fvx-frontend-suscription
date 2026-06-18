import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { CommandRegistry } from '../../../core/commands/command-registry.service';
import type { CommandGroup, CommandItem } from '../../../core/commands/command-item';

interface RenderedGroup {
  key: CommandGroup;
  items: CommandItem[];
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [FormsModule, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cp">
      <div class="cp__input-row">
        <mat-icon class="cp__search-icon" aria-hidden="true">search</mat-icon>
        <input
          #searchInput
          type="text"
          class="cp__input"
          [placeholder]="'layout.commandPalette.placeholder' | transloco"
          [ngModel]="query()"
          (ngModelChange)="onQueryChange($event)"
          (keydown)="onInputKey($event)"
          autocomplete="off"
          spellcheck="false"
          [attr.aria-label]="'layout.commandPalette.placeholder' | transloco"
        />
        <kbd class="cp__hint" aria-hidden="true">Esc</kbd>
      </div>

      <div class="cp__results" role="listbox">
        @if (grouped().length === 0) {
          <div class="cp__empty">
            <mat-icon>search_off</mat-icon>
            <span>{{ 'layout.commandPalette.empty' | transloco }}</span>
          </div>
        } @else {
          @for (group of grouped(); track group.key) {
            <div class="cp__group">
              <div class="cp__group-title">
                {{ ('layout.commandPalette.group.' + group.key) | transloco }}
              </div>
              @for (cmd of group.items; track cmd.id) {
                <button
                  type="button"
                  class="cp__item"
                  role="option"
                  [class.cp__item--active]="cmd === active()"
                  [attr.aria-selected]="cmd === active()"
                  (mouseenter)="setActive(cmd)"
                  (click)="run(cmd)">
                  @if (cmd.icon) {
                    <mat-icon class="cp__item-icon" aria-hidden="true">{{ cmd.icon }}</mat-icon>
                  } @else {
                    <span class="cp__item-icon-spacer" aria-hidden="true"></span>
                  }
                  <span class="cp__item-label">{{ cmd.label }}</span>
                  @if (cmd.hint) {
                    <span class="cp__item-hint">{{ cmd.hint }}</span>
                  }
                  @if (cmd.shortcut) {
                    <kbd class="cp__item-kbd">{{ cmd.shortcut }}</kbd>
                  }
                </button>
              }
            </div>
          }
        }
      </div>

      <div class="cp__footer" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> {{ 'layout.commandPalette.footer.navigate' | transloco }}</span>
        <span><kbd>↵</kbd> {{ 'layout.commandPalette.footer.select' | transloco }}</span>
        <span><kbd>Esc</kbd> {{ 'layout.commandPalette.footer.close' | transloco }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./command-palette.component.scss'],
})
export class CommandPaletteComponent implements AfterViewInit {
  private readonly dialogRef = inject<MatDialogRef<CommandPaletteComponent>>(MatDialogRef);
  private readonly registry = inject(CommandRegistry);

  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  readonly query = signal('');
  readonly active = signal<CommandItem | null>(null);

  /** Snapshot al abrir; cualquier cambio dinámico requiere reabrir el palette. */
  private readonly allCommands: CommandItem[] = this.registry.list();

  /**
   * Normaliza texto para búsqueda:
   *   · `toLowerCase()` — case-insensitive
   *   · NFD + replace combining marks — accent-insensitive
   *     ("configuración" → "configuracion", "açúcar" → "acucar")
   *
   * Sin esto, escribir "configuracion" no encuentra "Configuración" y
   * los devs bilingües tienen una UX rota cuando cambian de idioma.
   */
  private normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  readonly filtered = computed<CommandItem[]>(() => {
    const q = this.normalize(this.query().trim());
    if (!q) return this.allCommands;
    return this.allCommands.filter((cmd) => {
      if (this.normalize(cmd.label).includes(q)) return true;
      if (cmd.hint && this.normalize(cmd.hint).includes(q)) return true;
      // Aliases: permiten matchear sinónimos / términos en otro idioma
      // (ej. buscar "users" o "cuentas" para encontrar "Usuarios").
      if (cmd.keywords?.some((k) => this.normalize(k).includes(q))) return true;
      return false;
    });
  });

  readonly grouped = computed<RenderedGroup[]>(() => {
    const buckets: Record<CommandGroup, CommandItem[]> = {
      actions: [],
      navigation: [],
      entities: [],
    };
    for (const cmd of this.filtered()) {
      buckets[cmd.group].push(cmd);
    }
    const order: CommandGroup[] = ['actions', 'navigation', 'entities'];
    return order
      .filter((key) => buckets[key].length > 0)
      .map((key) => ({ key, items: buckets[key] }));
  });

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.searchInputRef?.nativeElement.focus();
    });
    const first = this.filtered()[0];
    if (first) this.active.set(first);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    // Resetea selección al primero del nuevo filtro.
    const first = this.filtered()[0];
    this.active.set(first ?? null);
  }

  setActive(cmd: CommandItem): void {
    this.active.set(cmd);
  }

  run(cmd: CommandItem): void {
    this.dialogRef.close();
    // Diferido para que el cierre del diálogo no tape la acción siguiente
    // (p. ej. `signOut` que toca DI / router).
    queueMicrotask(() => cmd.run());
  }

  onInputKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const cmd = this.active();
      if (cmd) this.run(cmd);
    }
  }

  /** Esc también desde fuera del input (por si focus se mueve). */
  @HostListener('keydown.escape')
  onEscape(): void {
    this.dialogRef.close();
  }

  private moveActive(delta: number): void {
    const list = this.filtered();
    if (list.length === 0) return;
    const current = this.active();
    const idx = current ? list.indexOf(current) : -1;
    let next = idx + delta;
    if (next < 0) next = list.length - 1;
    if (next >= list.length) next = 0;
    this.active.set(list[next]);
  }
}
