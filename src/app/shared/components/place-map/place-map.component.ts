import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  MapComponent,
  MapCoord,
  MapMarker,
  MapOptions,
} from '../map/map.component';
import { PlaceSearchComponent } from '../place-search/place-search.component';
import { MapboxPlace, MapboxService } from '../../../core/services/mapbox.service';

/** Qué muestra el componente: solo buscador, solo mapa, o ambos integrados. */
export type PlaceMapMode = 'both' | 'map' | 'search';

/**
 * Combinación lista-para-usar de `app-place-search` + `app-map`.
 *
 * Pensado para que otras pantallas no tengan que cablear a mano el buscador con
 * el mapa: según `[mode]` muestra solo el buscador, solo el mapa, o ambos. En
 * modo `both`, al elegir una dirección en el buscador centra el mapa y le pone
 * un marker fijo (id `picked`) automáticamente.
 *
 * ```html
 * <!-- Ambos (default): buscador arriba, mapa abajo, integrados -->
 * <app-place-map [mode]="'both'" [countries]="['cl']" (placeSelected)="onPick($event)" />
 *
 * <!-- Solo mapa -->
 * <app-place-map [mode]="'map'" [options]="{ zoom: 14, controls: { geolocate: true } }" />
 *
 * <!-- Solo buscador -->
 * <app-place-map [mode]="'search'" (placeSelected)="onPick($event)" />
 * ```
 *
 * El mapa hereda el theming FVX (`[themed]`) y respeta los `[options]` del
 * padre; el componente solo añade/actualiza el marker `picked` cuando el modo
 * incluye buscador y se elige una dirección. Los markers del padre conviven con
 * `picked` (diff por id en `app-map`).
 */
@Component({
  selector: 'app-place-map',
  standalone: true,
  imports: [MapComponent, PlaceSearchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="place-map" [class]="'place-map--' + mode">
      @if (showSearch()) {
        <app-place-search
          class="place-map__search"
          [placeholder]="searchPlaceholder"
          [countries]="countries"
          [types]="types"
          (placeSelected)="onPlaceSelected($event)"
        />
      }

      @if (showMap()) {
        <app-map
          class="place-map__map"
          [options]="mergedOptions()"
          [themed]="themed"
          [scrollZoomMode]="scrollZoomMode"
          [ariaLabel]="mapAriaLabel"
          (mapClick)="mapClick.emit($event)"
          (markerClick)="markerClick.emit($event)"
          (markerDragEnd)="markerDragEnd.emit($event)"
          (viewportChange)="viewportChange.emit($event)"
          (mapLoaded)="mapLoaded.emit()"
        />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .place-map {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .place-map__map {
      display: block;
      width: 100%;
      /* Alto por defecto razonable; el padre puede sobreescribir con CSS o
         envolviendo en un contenedor con alto fijo. */
      min-height: 320px;
      flex: 1 1 auto;
    }
    /* En modo solo-buscador no reservamos alto de mapa. */
    .place-map--search { gap: 0; }
  `],
})
export class PlaceMapComponent {
  readonly mapbox = inject(MapboxService);

  /** Qué renderizar: 'both' (default), 'map' o 'search'. */
  @Input() mode: PlaceMapMode = 'both';

  /** Opciones del mapa (igual contrato que `app-map`). */
  @Input() options: MapOptions = {};
  /** Theming FVX del mapa (igual que `app-map`). */
  @Input() themed = true;
  @Input() mapAriaLabel = 'Interactive map';
  /**
   * Zoom con rueda: `'off'` (default), `'on'`, o `'click-to-activate'`
   * (patrón Google Maps: click activa, salir del mapa desactiva). Passthrough a
   * `app-map`.
   */
  @Input() scrollZoomMode: 'off' | 'on' | 'click-to-activate' = 'off';

  /** Placeholder del buscador. */
  // Placeholder neutro: evitar "dirección"/"address" (dispara el autofill de Chrome).
  @Input() searchPlaceholder = 'Buscar ubicación';
  /** Países para el geocoding (ej. `['cl']`). Igual contrato que `app-place-search`. */
  @Input() countries?: readonly string[];
  /** Tipos de resultado del geocoding. Default `['address']` (como `app-place-search`). */
  @Input() types: readonly string[] = ['address'];

  /**
   * Zoom al centrar tras elegir una dirección (modo con buscador). Default 15.
   */
  @Input() pickedZoom = 15;
  /** Color del marker `picked`. Default acento del tema. */
  @Input() pickedColor = '#dd9512';

  /** Lugar elegido en el buscador (también disponible en modos con search). */
  @Output() readonly placeSelected = new EventEmitter<MapboxPlace>();
  /** Passthrough de los eventos del mapa. */
  @Output() readonly mapClick = new EventEmitter<MapCoord>();
  @Output() readonly markerClick = new EventEmitter<MapMarker>();
  @Output() readonly markerDragEnd = new EventEmitter<MapMarker>();
  @Output() readonly viewportChange = new EventEmitter<{
    center: MapCoord;
    zoom: number;
    pitch: number;
    bearing: number;
  }>();
  @Output() readonly mapLoaded = new EventEmitter<void>();

  /** Override interno: centro/zoom/marker tras elegir dirección (modo both). */
  private readonly pickedCenter = signal<MapCoord | null>(null);
  private readonly pickedMarker = signal<MapMarker | null>(null);

  showSearch = computed(() => this.mode === 'both' || this.mode === 'search');
  showMap = computed(() => this.mode === 'both' || this.mode === 'map');

  /**
   * Funde las `[options]` del padre con el centro/zoom/marker derivados de la
   * dirección elegida. El marker `picked` se concatena a los del padre (diff por
   * id en `app-map`), así no pisa otros markers.
   */
  mergedOptions = computed<MapOptions>(() => {
    const base = this.options;
    const center = this.pickedCenter();
    const picked = this.pickedMarker();
    const baseMarkers = base.markers ?? [];
    const markers = picked
      ? [...baseMarkers.filter((m) => m.id !== 'picked'), picked]
      : baseMarkers;
    return {
      ...base,
      ...(center ? { center, zoom: this.pickedZoom } : {}),
      markers,
    };
  });

  onPlaceSelected(place: MapboxPlace): void {
    this.placeSelected.emit(place);
    if (!this.showMap()) return;
    const coord: MapCoord = [place.coordinates.lng, place.coordinates.lat];
    this.pickedCenter.set(coord);
    this.pickedMarker.set({
      id: 'picked',
      coord,
      color: this.pickedColor,
      popupHtml: `<b>${place.name}</b>`,
    });
  }
}
