import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { MapboxService } from '../../../core/services/mapbox.service';
import { ThemeService } from '../../../core/services/theme.service';

/** Coordenada WGS84 — orden ``[lng, lat]`` (igual que Mapbox; cuidado con invertirlo). */
export type MapCoord = [number, number];

/** Claves de control nativo de Mapbox que el componente sabe attachear. */
type ControlKey = 'navigation' | 'geolocate' | 'fullscreen' | 'scale';

/** Marker simple que el padre puede pasar al mapa. */
export interface MapMarker {
  /** ID único para track + remoción quirúrgica. */
  id: string;
  coord: MapCoord;
  /** Color del pin. Default usa ``--fvx-link``. */
  color?: string;
  /** Texto del popup que aparece al click sobre el pin (opcional). */
  popupHtml?: string;
  /** Si ``true``, el pin se puede arrastrar. */
  draggable?: boolean;
}

/**
 * Opciones del mapa pensadas para que el componente padre pueda
 * activar/desactivar features sin tocar el SDK directamente.
 *
 * Todos los campos son opcionales — los que no pases caen al default.
 */
export interface MapOptions {
  /** Style URL de Mapbox. Default ``mapbox://styles/mapbox/streets-v12``. */
  style?: string;
  /** Centro inicial. Default Santiago de Chile ``[-70.6483, -33.4569]``. */
  center?: MapCoord;
  /** Zoom inicial (0-22). Default 12. */
  zoom?: number;
  /** Pitch / inclinación inicial (0-85, grados). Default 0. */
  pitch?: number;
  /** Bearing / rotación inicial (-180 a 180, grados). Default 0. */
  bearing?: number;

  /** Controles del chrome del mapa. */
  controls?: {
    /** Botones de zoom + brújula. Default ``true``. */
    navigation?: boolean;
    /** Botón "centrar en mi ubicación". Default ``false``. */
    geolocate?: boolean;
    /** Botón "pantalla completa". Default ``false``. */
    fullscreen?: boolean;
    /** Barra de escala (metros/millas). Default ``false``. */
    scale?: boolean;
  };

  /** Interacciones del usuario. */
  interactions?: {
    scrollZoom?: boolean;        // default FALSE (evita zoom accidental al hacer scroll de página)
    dragPan?: boolean;           // default true
    dragRotate?: boolean;        // default true
    boxZoom?: boolean;           // default true
    doubleClickZoom?: boolean;   // default true
    keyboard?: boolean;          // default true
    touchZoomRotate?: boolean;   // default true
  };

  /** Marcadores a renderizar inicialmente. Updates en runtime via ``[markers]``. */
  markers?: MapMarker[];
}

/**
 * Componente de mapa interactivo (mapbox-gl JS).
 *
 * El padre controla TODO mediante el input ``[options]`` (declarativo):
 *
 * - Activar/desactivar controles (zoom, geolocate, fullscreen, scale)
 * - Activar/desactivar interacciones (scroll, drag, rotate, etc.)
 * - Cambiar centro, zoom, pitch, bearing dinámicamente
 * - Renderizar markers (con popup y drag opcional)
 *
 * Cambios en ``[options]`` se aplican incrementalmente — el mapa NO se
 * reinstancia salvo que cambie el ``style``. Para markers, el componente
 * hace un diff por ``id`` (agrega los nuevos, remueve los que ya no están,
 * actualiza los existentes si se movieron).
 *
 * Si el token de Mapbox no está configurado, muestra un placeholder en
 * lugar de fallar.
 *
 * ```html
 * <!-- Mínimo -->
 * <app-map />
 *
 * <!-- Personalizado -->
 * <app-map
 *   [options]="{
 *     center: [-70.65, -33.45],
 *     zoom: 14,
 *     controls: { navigation: true, geolocate: true, scale: true },
 *     interactions: { scrollZoom: false },
 *     markers: [
 *       { id: 'home', coord: [-70.65, -33.45], color: '#4f5bd5', popupHtml: '<b>Casa</b>' },
 *     ],
 *   }"
 *   (markerClick)="onMarkerClick($event)"
 *   (mapClick)="onMapClick($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-map',
  standalone: true,
  imports: [MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!mapbox.isConfigured()) {
      <div class="map__placeholder" role="alert">
        <mat-icon aria-hidden="true">map</mat-icon>
        <span>{{ 'map.notConfigured' | transloco }}</span>
      </div>
    } @else {
      <div class="map__wrap">
        <div #host class="map__host" role="application" [attr.aria-label]="ariaLabel"></div>
        @if (showScrollHint()) {
          <!-- Patrón Google Maps: capa que pide click para activar el zoom con
               rueda. Es decorativa (pointer-events: none) salvo el aviso; el
               click real lo capta el mapa debajo. Se oculta al activar y vuelve
               al salir el mouse (mouseleave). -->
          <div class="map__scroll-hint" aria-hidden="true">
            <span class="map__scroll-hint-pill">
              <mat-icon>touch_app</mat-icon>
              {{ 'map.scrollHint' | transloco }}
            </span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 240px;
      position: relative;
    }
    .map__wrap {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: inherit;
    }
    .map__host {
      width: 100%;
      height: 100%;
      min-height: inherit;
      border-radius: var(--fvx-radius-lg, 13px);
      overflow: hidden;
    }
    /* Aviso "click para activar el zoom" (patrón Google Maps). No intercepta
       eventos (el click llega al mapa de abajo); solo muestra la píldora. */
    /* Aviso flotante abajo-derecha (no cubre el mapa ni tapa los markers).
       La esquina inferior-derecha está libre: escala va abajo-izquierda,
       zoom/geolocate/fullscreen arriba-derecha. */
    .map__scroll-hint {
      position: absolute;
      right: 10px;
      bottom: 10px;
      display: flex;
      pointer-events: none;
      opacity: 0;
      animation: map-hint-in var(--fvx-motion-fast, 140ms) var(--fvx-motion-easing, ease) forwards;
      z-index: 2;
    }
    @keyframes map-hint-in { to { opacity: 1; } }
    .map__scroll-hint-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 11px;
      border-radius: var(--fvx-radius-pill, 999px);
      background: color-mix(in srgb, var(--fvx-bg-card, #161a26) 92%, transparent);
      backdrop-filter: blur(4px);
      color: var(--fvx-text-primary, #e9ecf5);
      border: 1px solid var(--fvx-border, rgba(255, 255, 255, 0.08));
      box-shadow: var(--fvx-shadow-2, 0 4px 14px rgba(0, 0, 0, 0.2));
      font-size: var(--fvx-text-xs, 11px);
      font-weight: 600;
      white-space: nowrap;
    }
    .map__scroll-hint-pill mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--fvx-accent, #6d7cf6);
    }
    /* Asegurar que los controles de mapbox-gl hereden tokens de tema */
    :host ::ng-deep .mapboxgl-ctrl-group {
      box-shadow: var(--fvx-shadow-2, 0 4px 14px rgba(0, 0, 0, 0.08));
      border-radius: var(--fvx-radius, 9px);
    }
    .map__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      height: 100%;
      min-height: inherit;
      background: var(--fvx-bg-surface-2, var(--fvx-bg-card));
      color: var(--fvx-text-muted);
      border: 1px dashed var(--fvx-border);
      border-radius: var(--fvx-radius-lg, 13px);
      font-size: var(--fvx-text-sm);
    }
    .map__placeholder mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
  `],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  readonly mapbox = inject(MapboxService);
  private readonly theme = inject(ThemeService);

  @ViewChild('host') private hostRef?: ElementRef<HTMLDivElement>;

  @Input() options: MapOptions = {};
  @Input() ariaLabel = 'Interactive map';

  /**
   * Comportamiento del zoom con la rueda del mouse:
   *
   * - ``'off'`` (default) — desactivado siempre. El zoom solo con los botones +/−.
   *   Evita el zoom accidental al hacer scroll de la página. Para activarlo
   *   permanentemente sin este patrón, pasá ``[options].interactions.scrollZoom``.
   * - ``'on'`` — activado siempre (la rueda hace zoom sobre el mapa).
   * - ``'click-to-activate'`` — patrón Google Maps: arranca desactivado con un
   *   aviso "click para activar"; al hacer click se activa, y se vuelve a
   *   desactivar cuando el mouse sale del mapa. Lo mejor de ambos mundos.
   *
   * Nota: si pasás ``[options].interactions.scrollZoom`` explícito, ese gana
   * sobre ``scrollZoomMode`` (control manual total).
   */
  @Input() scrollZoomMode: 'off' | 'on' | 'click-to-activate' = 'off';

  /** Muestra el aviso "click para activar el zoom" (modo click-to-activate, inactivo). */
  readonly showScrollHint = signal(false);

  /**
   * Si ``true`` (default), el mapa toma su style base y colores del template
   * FVX activo (``ThemeService.currentId``) y se re-pinta automáticamente al
   * cambiar de tema. Si querés controlar el ``style`` manualmente vía
   * ``[options].style``, pasá ``[themed]="false"``.
   */
  @Input() themed = true;

  constructor() {
    // Reacciona a cambios de tema en vivo. Dos casos:
    //   · Misma base (ej. default→light, ambos light-v11) → solo re-pinta capas.
    //   · Base distinta (ej. light→dark) → setStyle (el ``style.load`` re-pinta).
    // Solo aplica si ``themed`` y el padre NO fijó un ``style`` manual.
    effect(() => {
      const id = this.theme.currentId();
      if (!this.themed || !this.map || this.options.style) return;

      const targetStyle = this.mapbox.styleForTheme(id);
      if (targetStyle !== this.currentStyle) {
        this.currentStyle = targetStyle;
        this.map.setStyle(targetStyle); // style.load → applyThemeToMap
      } else if (this.map.isStyleLoaded?.()) {
        this.mapbox.applyThemeToMap(this.map, id);
      }
    });
  }

  /** Click sobre el mapa (no sobre un marker). Coord en ``[lng, lat]``. */
  @Output() readonly mapClick = new EventEmitter<MapCoord>();
  /** Click sobre un marker. Emite el marker. */
  @Output() readonly markerClick = new EventEmitter<MapMarker>();
  /** Cuando el usuario arrastra un marker draggable. Emite el marker actualizado. */
  @Output() readonly markerDragEnd = new EventEmitter<MapMarker>();
  /** Cambio de viewport (debounced). Útil para sincronizar con otros componentes. */
  @Output() readonly viewportChange = new EventEmitter<{
    center: MapCoord;
    zoom: number;
    pitch: number;
    bearing: number;
  }>();
  /** Cuando el mapa terminó de cargar (style + sources). */
  @Output() readonly mapLoaded = new EventEmitter<void>();

  // Referencias internas. ``any`` evita acoplar el tipo público al SDK importado lazy.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private markerInstances = new Map<string, any>();
  /** Handler 'click' del DOM por marker — para removerlo antes de destruir (evita fuga). */
  private markerClickHandlers = new Map<string, (e: Event) => void>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapboxGl: any = null;
  private currentStyle: string | undefined;

  /** Instancias de control activas, por clave — para re-attachear/remover en diff. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private controlInstances = new Map<ControlKey, any>();
  /** Última config de controles aplicada (para diffear en applyOptions). */
  private appliedControls: Required<NonNullable<MapOptions['controls']>> | null = null;

  async ngAfterViewInit(): Promise<void> {
    if (!this.mapbox.isConfigured() || !this.hostRef) return;
    await this.initMap();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!this.map || !this.mapboxGl) return;
    if (changes['options']) {
      this.applyOptions(this.options);
    }
    if (changes['scrollZoomMode'] && !changes['scrollZoomMode'].firstChange) {
      this.applyScrollZoomMode();
    }
  }

  ngOnDestroy(): void {
    this.detachScrollLeave();
    // Teardown con remoción de listeners DOM (no solo .remove()).
    for (const id of [...this.markerInstances.keys()]) {
      this.teardownMarker(id);
    }
    this.markerClickHandlers.clear();
    this.controlInstances.clear();
    if (this.map) {
      this.map.remove(); // remove() ya destruye todos los controles añadidos
      this.map = null;
    }
  }

  private async initMap(): Promise<void> {
    this.mapboxGl = await this.mapbox.loadGl();

    const opts = this.options;
    // Style base: si ``themed`` y no se pasó uno explícito, lo decide el tema
    // activo (light-v11 / dark-v11). Si el padre pasa ``options.style``, gana.
    this.currentStyle =
      opts.style ??
      (this.themed
        ? this.mapbox.styleForTheme(this.theme.currentId())
        : 'mapbox://styles/mapbox/streets-v12');

    this.map = new this.mapboxGl.Map({
      container: this.hostRef!.nativeElement,
      style: this.currentStyle,
      center: opts.center ?? [-70.6483, -33.4569],
      zoom: opts.zoom ?? 12,
      pitch: opts.pitch ?? 0,
      bearing: opts.bearing ?? 0,
      // scrollZoom OFF por defecto: evita que la rueda haga zoom sin querer al
      // hacer scroll de la página (se activa explícitamente via options).
      scrollZoom: opts.interactions?.scrollZoom ?? false,
      // Resto de interacciones: true; el usuario las puede desactivar via options.
      dragPan: opts.interactions?.dragPan ?? true,
      dragRotate: opts.interactions?.dragRotate ?? true,
      boxZoom: opts.interactions?.boxZoom ?? true,
      doubleClickZoom: opts.interactions?.doubleClickZoom ?? true,
      keyboard: opts.interactions?.keyboard ?? true,
      touchZoomRotate: opts.interactions?.touchZoomRotate ?? true,
    });

    this.syncControls(opts.controls);
    this.applyScrollZoomMode();

    this.map.on('load', () => {
      // Aplica el branding de colores del tema actual una vez que el style
      // cargó todas sus capas. El ``effect`` del constructor maneja cambios
      // de tema posteriores.
      if (this.themed) {
        this.mapbox.applyThemeToMap(this.map, this.theme.currentId());
      }
      this.mapLoaded.emit();
      this.syncMarkers(opts.markers ?? []);
    });

    // ``style.load`` se dispara también tras un ``setStyle`` (cambio de tema
    // que requiere base distinta, ej. light→dark). Re-aplica el branding.
    this.map.on('style.load', () => {
      if (this.themed) {
        this.mapbox.applyThemeToMap(this.map, this.theme.currentId());
      }
    });

    this.map.on('click', (e: { lngLat: { lng: number; lat: number } }) => {
      // Modo click-to-activate: el primer click activa el scroll-zoom y oculta
      // el aviso (el zoom se desactiva de nuevo al salir el mouse del mapa).
      if (this.scrollZoomMode === 'click-to-activate' && this.options.interactions?.scrollZoom === undefined) {
        this.map.scrollZoom.enable();
        this.showScrollHint.set(false);
      }
      this.mapClick.emit([e.lngLat.lng, e.lngLat.lat]);
    });

    this.map.on('moveend', () => {
      this.viewportChange.emit({
        center: this.map.getCenter().toArray() as MapCoord,
        zoom: this.map.getZoom(),
        pitch: this.map.getPitch(),
        bearing: this.map.getBearing(),
      });
    });
  }

  /**
   * Configura el zoom con rueda según ``scrollZoomMode``. Si el padre fijó
   * ``options.interactions.scrollZoom`` explícito, ese gana y este modo no hace
   * nada (control manual). En ``click-to-activate`` añade un listener de
   * ``mouseleave`` que vuelve a desactivar el zoom y reaparece el aviso.
   */
  private applyScrollZoomMode(): void {
    // Override manual explícito → respetarlo, sin patrón ni aviso.
    if (this.options.interactions?.scrollZoom !== undefined) {
      this.showScrollHint.set(false);
      this.detachScrollLeave();
      return;
    }

    if (this.scrollZoomMode === 'on') {
      this.map.scrollZoom.enable();
      this.showScrollHint.set(false);
      this.detachScrollLeave();
    } else if (this.scrollZoomMode === 'click-to-activate') {
      this.map.scrollZoom.disable();
      this.showScrollHint.set(true);
      this.attachScrollLeave();
    } else {
      // 'off'
      this.map.scrollZoom.disable();
      this.showScrollHint.set(false);
      this.detachScrollLeave();
    }
  }

  private scrollLeaveHandler: (() => void) | null = null;

  /** Al salir el mouse del mapa: re-desactiva el zoom y reaparece el aviso. */
  private attachScrollLeave(): void {
    if (this.scrollLeaveHandler || !this.hostRef) return;
    const el = this.hostRef.nativeElement;
    const handler = () => {
      if (this.scrollZoomMode !== 'click-to-activate') return;
      this.map?.scrollZoom?.disable();
      this.showScrollHint.set(true);
    };
    el.addEventListener('mouseleave', handler);
    this.scrollLeaveHandler = () => el.removeEventListener('mouseleave', handler);
  }

  private detachScrollLeave(): void {
    this.scrollLeaveHandler?.();
    this.scrollLeaveHandler = null;
  }

  /**
   * Aplica cambios incrementales del input ``[options]`` sin recrear el mapa
   * (a menos que cambie el style, que sí requiere reload).
   */
  private applyOptions(opts: MapOptions): void {
    // Style → solo si el padre pasa uno EXPLÍCITO y cambió. Antes caía a
    // 'streets-v12' por defecto, así que cualquier cambio de [options] (p. ej.
    // agregar un marker al clickear) hacía setStyle('streets-v12') y pisaba el
    // estilo del tema (dark-v11) → las calles "cambiaban de color" al clickear.
    // En modo themed sin style propio, el style lo gobierna el effect del tema.
    if (opts.style && opts.style !== this.currentStyle) {
      this.currentStyle = opts.style;
      this.map.setStyle(opts.style);
    }

    // Controles: re-sincroniza (diff) para que togglear geolocate/fullscreen/
    // scale vía [options] tome efecto. Solo si cambió algo respecto a lo aplicado.
    const c = opts.controls;
    const prev = this.appliedControls;
    const controlsChanged =
      !prev ||
      (c?.navigation ?? true) !== prev.navigation ||
      (c?.geolocate ?? false) !== prev.geolocate ||
      (c?.fullscreen ?? false) !== prev.fullscreen ||
      (c?.scale ?? false) !== prev.scale;
    if (controlsChanged) {
      this.syncControls(c);
    }

    // Viewport (acepta cambios suaves).
    if (opts.center) this.map.setCenter(opts.center);
    if (typeof opts.zoom === 'number') this.map.setZoom(opts.zoom);
    if (typeof opts.pitch === 'number') this.map.setPitch(opts.pitch);
    if (typeof opts.bearing === 'number') this.map.setBearing(opts.bearing);

    // Interactions (toggle on/off live).
    const inter = opts.interactions;
    if (inter) {
      const toggle = (handler: string, enabled: boolean | undefined) => {
        if (enabled === undefined) return;
        const h = (this.map as Record<string, unknown>)[handler] as { enable: () => void; disable: () => void };
        if (h) (enabled ? h.enable : h.disable).call(h);
      };
      toggle('scrollZoom', inter.scrollZoom);
      toggle('dragPan', inter.dragPan);
      toggle('dragRotate', inter.dragRotate);
      toggle('boxZoom', inter.boxZoom);
      toggle('doubleClickZoom', inter.doubleClickZoom);
      toggle('keyboard', inter.keyboard);
      toggle('touchZoomRotate', inter.touchZoomRotate);
    }

    // Markers — diff por ID.
    this.syncMarkers(opts.markers ?? []);
  }

  /**
   * Sincroniza los controles nativos de Mapbox con el estado deseado, con diff:
   * añade los que faltan y remueve los que sobran. Antes solo corría una vez en
   * ``initMap``, así que togglear geolocate/fullscreen/scale vía ``[options]``
   * NO hacía nada (los controles no se re-attacheaban) — bugs de los puntos 4/5.
   */
  private syncControls(controls?: MapOptions['controls']): void {
    const desired: Required<NonNullable<MapOptions['controls']>> = {
      navigation: controls?.navigation ?? true,
      geolocate: controls?.geolocate ?? false,
      fullscreen: controls?.fullscreen ?? false,
      scale: controls?.scale ?? false,
    };

    const factory: Record<ControlKey, () => { control: unknown; position: string }> = {
      navigation: () => ({
        control: new this.mapboxGl.NavigationControl({ visualizePitch: true }),
        position: 'top-right',
      }),
      geolocate: () => ({
        // trackUserLocation: sigue la posición; al click pide permiso al navegador
        // y centra el mapa. showUserHeading muestra la flecha de orientación.
        control: new this.mapboxGl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        position: 'top-right',
      }),
      fullscreen: () => ({
        // container: el host del mapa → fullscreen del mapa, no de toda la página.
        control: new this.mapboxGl.FullscreenControl({ container: this.hostRef?.nativeElement }),
        position: 'top-right',
      }),
      scale: () => ({
        control: new this.mapboxGl.ScaleControl({ unit: 'metric' }),
        position: 'bottom-left',
      }),
    };

    (Object.keys(desired) as ControlKey[]).forEach((key) => {
      const want = desired[key];
      const has = this.controlInstances.has(key);
      if (want && !has) {
        const { control, position } = factory[key]();
        this.map.addControl(control, position);
        this.controlInstances.set(key, control);
      } else if (!want && has) {
        const instance = this.controlInstances.get(key);
        this.map.removeControl(instance);
        this.controlInstances.delete(key);
      }
    });

    this.appliedControls = desired;
  }

  /** Quita los listeners DOM/SDK de un marker antes de removerlo (evita huérfanos). */
  private teardownMarker(id: string): void {
    const instance = this.markerInstances.get(id);
    if (!instance) return;
    const click = this.markerClickHandlers.get(id);
    if (click) {
      instance.getElement().removeEventListener('click', click);
      this.markerClickHandlers.delete(id);
    }
    instance.remove(); // remove() limpia los listeners propios del SDK (dragend, etc.)
    this.markerInstances.delete(id);
  }

  /** Diff markers por ``id``: agrega los nuevos, remueve obsoletos, mueve los existentes. */
  private syncMarkers(next: MapMarker[]): void {
    const nextIds = new Set(next.map((m) => m.id));

    // Remover los que ya no están (con teardown de listeners).
    for (const [id] of this.markerInstances) {
      if (!nextIds.has(id)) {
        this.teardownMarker(id);
      }
    }

    // Agregar o actualizar
    for (const m of next) {
      const existing = this.markerInstances.get(m.id);
      if (existing) {
        const cur = existing.getLngLat();
        if (cur.lng !== m.coord[0] || cur.lat !== m.coord[1]) {
          existing.setLngLat(m.coord);
        }
      } else {
        const marker = new this.mapboxGl.Marker({
          color: m.color ?? 'var(--fvx-link, #4f5bd5)',
          draggable: !!m.draggable,
        })
          .setLngLat(m.coord)
          .addTo(this.map);

        if (m.popupHtml) {
          marker.setPopup(new this.mapboxGl.Popup({ offset: 25 }).setHTML(m.popupHtml));
        }

        // Guardamos el handler para poder removerlo en teardown (antes era una
        // función anónima imposible de remover → listener DOM huérfano al
        // remover el marker).
        const clickHandler = (e: Event) => {
          e.stopPropagation();
          this.markerClick.emit(m);
        };
        marker.getElement().addEventListener('click', clickHandler);
        this.markerClickHandlers.set(m.id, clickHandler);

        if (m.draggable) {
          // marker.on('dragend') lo limpia el SDK en marker.remove().
          marker.on('dragend', () => {
            const ll = marker.getLngLat();
            this.markerDragEnd.emit({ ...m, coord: [ll.lng, ll.lat] });
          });
        }

        this.markerInstances.set(m.id, marker);
      }
    }
  }
}
