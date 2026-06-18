import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnInit,
  Output,
  ViewChild,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs/operators';

import {
  MapboxPlace,
  MapboxSearchOptions,
  MapboxService,
} from '../../../core/services/mapbox.service';

/**
 * Buscador inteligente de direcciones (Mapbox Geocoding v6).
 *
 * **Doble interfaz**:
 *
 *   1. **Reactive Forms / template-driven** (recomendado): es un
 *      ``ControlValueAccessor``, así que funciona con ``formControlName``,
 *      ``[formControl]`` o ``[(ngModel)]`` — el valor del control es el
 *      ``MapboxPlace`` completo seleccionado (o ``null``).
 *
 *   2. **Emit puro** (sin formularios): suscribite al ``(placeSelected)``
 *      para obtener el ``MapboxPlace`` y omitir el form-binding.
 *
 * Ambas formas son simultáneas: si bindeas ``formControlName`` y además
 * escuchás ``(placeSelected)``, ambos se disparan al elegir.
 *
 * Si el token Mapbox (en ``config.json`` runtime) está vacío, el componente muestra un
 * placeholder explicativo en vez de romper la app.
 *
 * ```html
 * <!-- 1) Con reactive form -->
 * <app-place-search
 *   formControlName="address"
 *   placeholder="Buscar ubicación"
 *   [countries]="['cl']"
 *   [types]="['address', 'street', 'place']"
 * />
 *
 * <!-- 2) Con emit, sin form -->
 * <app-place-search
 *   placeholder="Buscar"
 *   (placeSelected)="onAddressPicked($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-place-search',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatProgressSpinnerModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PlaceSearchComponent),
      multi: true,
    },
  ],
  template: `
    @if (!mapbox.isConfigured()) {
      <div class="ps__placeholder" role="alert">
        <mat-icon aria-hidden="true">location_off</mat-icon>
        <span>{{ 'placeSearch.notConfigured' | transloco }}</span>
      </div>
    } @else {
      <div class="ps" [class.ps--disabled]="disabled">
        <div class="ps__input-row">
          <mat-icon class="ps__icon" aria-hidden="true">search</mat-icon>
          <input
            #queryInput
            type="search"
            class="ps__input"
            role="combobox"
            [attr.aria-expanded]="showList()"
            aria-autocomplete="list"
            aria-controls="ps-list"
            [placeholder]="placeholder"
            [disabled]="disabled"
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange($event)"
            (focus)="onFocus()"
            (blur)="onBlur()"
            (keydown)="onKeydown($event)"
            id="fvx-place-search"
            name="fvx-place-search"
            [attr.autocomplete]="acToken"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            [attr.data-1p-ignore]="true"
            [attr.data-lpignore]="true"
          />
          @if (loading()) {
            <mat-progress-spinner
              class="ps__spinner"
              diameter="18"
              mode="indeterminate"
            />
          } @else if (query) {
            <button
              type="button"
              class="ps__clear"
              [attr.aria-label]="'placeSearch.clear' | transloco"
              (mousedown)="$event.preventDefault()"
              (click)="clear()"
            >
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        @if (showList()) {
          <ul
            id="ps-list"
            class="ps__list"
            role="listbox"
            (mousedown)="$event.preventDefault()"
          >
            @if (results().length === 0 && !loading()) {
              <li class="ps__empty">
                {{ 'placeSearch.empty' | transloco }}
              </li>
            }
            @for (place of results(); track place.id; let i = $index) {
              <!-- Patrón combobox ARIA: el teclado se maneja en el <input
                   role="combobox"> (onKeydown: flechas + Enter). Cada <li
                   role="option"> recibe (click) solo como atajo de ratón; no
                   debe ser un tabstop propio. -->
              <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
              <li
                class="ps__item"
                [class.ps__item--active]="i === activeIndex()"
                role="option"
                [attr.aria-selected]="i === activeIndex()"
                (mouseenter)="activeIndex.set(i)"
                (click)="select(place)"
              >
                <mat-icon aria-hidden="true">place</mat-icon>
                <div class="ps__item-text">
                  <span class="ps__item-name">{{ place.name }}</span>
                  @if (place.fullAddress && place.fullAddress !== place.name) {
                    <span class="ps__item-hint">{{ place.fullAddress }}</span>
                  }
                </div>
              </li>
            }
          </ul>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; position: relative; }

    .ps {
      position: relative;
      width: 100%;
    }
    .ps--disabled { opacity: 0.6; pointer-events: none; }

    .ps__input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding: 0 10px;
      background: var(--fvx-bg-card);
      border: 1px solid var(--fvx-border);
      border-radius: var(--fvx-radius-lg, 13px);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .ps__input-row:focus-within {
      border-color: var(--fvx-border-focus, var(--fvx-link));
      box-shadow: 0 0 0 3px var(--fvx-accent-soft);
    }

    .ps__icon {
      color: var(--fvx-text-muted);
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .ps__input {
      flex: 1 1 auto;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--fvx-text-primary);
      font-family: inherit;
      font-size: var(--fvx-text-base);
    }
    .ps__input::placeholder { color: var(--fvx-text-muted); }

    .ps__spinner {
      flex-shrink: 0;
      --mdc-circular-progress-active-indicator-color: var(--fvx-link);
    }

    .ps__clear {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--fvx-text-muted);
      border-radius: 50%;
      cursor: pointer;
      flex-shrink: 0;
    }
    .ps__clear:hover {
      background: var(--fvx-hover-bg);
      color: var(--fvx-text-primary);
    }
    .ps__clear mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .ps__list {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      margin: 0;
      padding: 4px 0;
      list-style: none;
      max-height: 320px;
      overflow-y: auto;
      background: var(--fvx-bg-card);
      border: 1px solid var(--fvx-border);
      border-radius: var(--fvx-radius-lg, 13px);
      box-shadow: var(--fvx-shadow-pop, 0 14px 40px rgba(0, 0, 0, 0.18));
      z-index: 30;
    }

    .ps__empty {
      padding: 12px 14px;
      color: var(--fvx-text-muted);
      font-size: var(--fvx-text-sm);
      text-align: center;
    }

    .ps__item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      transition: background 0.1s ease;
    }
    .ps__item--active, .ps__item:hover {
      background: var(--fvx-hover-bg);
    }
    .ps__item mat-icon {
      flex-shrink: 0;
      color: var(--fvx-text-muted);
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-top: 2px;
    }
    .ps__item-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .ps__item-name {
      color: var(--fvx-text-primary);
      font-size: var(--fvx-text-base);
      font-weight: 500;
    }
    .ps__item-hint {
      color: var(--fvx-text-muted);
      font-size: var(--fvx-text-sm);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ps__placeholder {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--fvx-chip-warn-bg);
      color: var(--fvx-chip-warn-fg);
      border: 1px solid var(--fvx-chip-warn-border);
      border-radius: var(--fvx-radius-lg, 13px);
      font-size: var(--fvx-text-sm);
    }
    .ps__placeholder mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
  `],
})
export class PlaceSearchComponent implements OnInit, ControlValueAccessor {
  readonly mapbox = inject(MapboxService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('queryInput') private inputRef?: ElementRef<HTMLInputElement>;

  /**
   * Token `autocomplete` NO reconocido por Chrome (único por instancia) — fuerza
   * que el clasificador heurístico marque el campo como UNKNOWN_TYPE y NO ofrezca
   * el dropdown de direcciones guardadas. `autocomplete="off"` a secas es WONTFIX
   * para campos que Chrome cree de dirección; un token desconocido sí funciona, y
   * randomizarlo evita que Chrome lo "aprenda". Ver placeSearch.placeholder: NO
   * debe contener "dirección"/"address" (la regex de Chrome también lo matchea).
   */
  readonly acToken = 'off-' + Math.random().toString(36).slice(2, 8);

  /**
   * Placeholder del input. IMPORTANTE: evitá la palabra "dirección"/"address"
   * aquí — la heurística de autofill de Chrome la matchea en el placeholder y
   * reactiva el dropdown de direcciones guardadas pese al token de autocomplete.
   * Usá "Buscar ubicación"/"Search location" o similar.
   */
  @Input() placeholder = 'Buscar ubicación';
  /** Debounce de teclado antes de pegarle al API (ms). */
  @Input() debounceMs = 350;
  /** Cantidad mínima de caracteres para disparar búsqueda. */
  @Input() minChars = 3;
  /** Lista ISO-3166 alpha-2 de países permitidos. Ej. ``['cl', 'ar']``. */
  @Input() countries?: readonly string[];
  /** Tipos de feature de Mapbox. Default: ``['address']``. */
  @Input() types: readonly string[] = ['address'];
  /** Idioma de resultados. Default ``'es'``. */
  @Input() language = 'es';
  /** Máximo de sugerencias mostradas. */
  @Input() limit = 5;
  /** Sesgo geográfico para mejorar relevancia. */
  @Input() proximity?: { lng: number; lat: number };

  /**
   * Evento "puro" para consumir sin formulario reactivo. Se dispara una vez
   * por cada selección. Para usuarios de Reactive Forms, esto es redundante
   * con ``formControl.valueChanges`` pero no hace daño tenerlo activo.
   */
  @Output() readonly placeSelected = new EventEmitter<MapboxPlace>();

  /** Estado interno. */
  query = '';
  readonly results = signal<MapboxPlace[]>([]);
  readonly loading = signal(false);
  readonly focused = signal(false);
  readonly activeIndex = signal(-1);

  disabled = false;
  private currentValue: MapboxPlace | null = null;

  @HostBinding('attr.role') readonly role = 'search';

  private readonly query$ = new Subject<string>();

  // ── CVA callbacks ──────────────────────────────────────────────────────────
  private onChange: (value: MapboxPlace | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnInit(): void {
    this.query$
      .pipe(
        debounceTime(this.debounceMs),
        distinctUntilChanged(),
        tap((q) => {
          if (q.trim().length < this.minChars) {
            this.results.set([]);
            this.loading.set(false);
          } else {
            this.loading.set(true);
          }
        }),
        filter((q) => q.trim().length >= this.minChars),
        switchMap((q) =>
          this.mapbox
            .search(q, this.searchOptions())
            .pipe(catchError(() => of([] as MapboxPlace[]))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((places) => {
        this.results.set(places);
        this.loading.set(false);
        this.activeIndex.set(places.length > 0 ? 0 : -1);
      });
  }

  private searchOptions(): MapboxSearchOptions {
    return {
      countries: this.countries,
      types: this.types,
      language: this.language,
      limit: this.limit,
      proximity: this.proximity,
    };
  }

  /** Visibilidad del dropdown: focused + tiene query o resultados. */
  showList(): boolean {
    return this.focused() && (this.results().length > 0 || this.loading() || (this.query.trim().length >= this.minChars));
  }

  onQueryChange(value: string): void {
    this.query = value;
    if (!value) {
      this.results.set([]);
      this.loading.set(false);
      // Si el usuario limpia el input manualmente, limpiamos el form value también.
      if (this.currentValue !== null) {
        this.currentValue = null;
        this.onChange(null);
      }
      return;
    }
    this.query$.next(value);
  }

  onFocus(): void { this.focused.set(true); }

  onBlur(): void {
    // Pequeño delay para permitir que el click en un item del dropdown corra antes.
    setTimeout(() => {
      this.focused.set(false);
      this.onTouched();
    }, 120);
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.showList() || this.results().length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => (i + 1) % this.results().length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => (i - 1 + this.results().length) % this.results().length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const i = this.activeIndex();
      if (i >= 0 && i < this.results().length) {
        this.select(this.results()[i]);
      }
    } else if (event.key === 'Escape') {
      this.results.set([]);
      this.focused.set(false);
      this.inputRef?.nativeElement.blur();
    }
  }

  select(place: MapboxPlace): void {
    this.query = place.fullAddress || place.name;
    this.currentValue = place;
    this.results.set([]);
    this.focused.set(false);
    this.onChange(place);
    this.placeSelected.emit(place);
  }

  clear(): void {
    this.query = '';
    this.results.set([]);
    this.currentValue = null;
    this.onChange(null);
    this.inputRef?.nativeElement.focus();
  }

  // ── ControlValueAccessor ───────────────────────────────────────────────────

  writeValue(value: MapboxPlace | null): void {
    this.currentValue = value;
    this.query = value?.fullAddress || value?.name || '';
  }

  registerOnChange(fn: (value: MapboxPlace | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }
}
