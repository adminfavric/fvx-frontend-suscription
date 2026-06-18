import { ApplicationConfig, LOCALE_ID, inject, isDevMode, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { es as dateFnsEs, enUS as dateFnsEnUS } from 'date-fns/locale';
import { MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';
import { provideEchartsCore } from 'ngx-echarts';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

import { echarts } from './shared/components/chart/echarts-register';
import { FILE_UPLOAD_PROVIDER } from './shared/components/file-uploader/providers/file-upload-provider';
import { DjangoUploadProvider } from './shared/components/file-uploader/providers/django-upload.provider';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { provideAppConfig } from './core/config/app-config.token';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { httpLoggingInterceptor } from './core/interceptors/http-logging.interceptor';
import { localeInterceptor } from './core/interceptors/locale.interceptor';
import { requestIdInterceptor } from './core/interceptors/request-id.interceptor';
import { persistLang, readStoredLang, resolveInitialUiLang } from './core/i18n/locale-storage';
import { TranslocoHttpLoader } from './core/i18n/transloco-http.loader';
import { ThemeService } from './core/services/theme.service';
import { PageContentWidthService } from './core/services/page-content-width.service';
import { UiSettingsService } from './core/services/ui-settings.service';
import { UserUiPreferencesService } from './core/services/user-ui-preferences.service';
import { MatDialogDragService } from './core/services/mat-dialog-drag.service';

/**
 * Formatos de fecha del datepicker (adapter date-fns). El usuario VE y TECLEA
 * `dd-MM-yyyy` (31-12-2026); el modelo es un Date y la serialización a la BD
 * (yyyy-MM-dd) la hace cada formulario al armar el payload.
 */
const FVX_DATE_FORMATS = {
  // `timeInput` / `timeOptionLabel` son OBLIGATORIOS para que MatTimepicker
  // (Material 21) se inicialice; sin ellos lanza un Error y el campo de hora no
  // se renderiza. Formato 24h (estándar CL). Tokens date-fns: HH=24h, mm=min.
  parse: { dateInput: 'dd-MM-yyyy', timeInput: 'HH:mm' },
  display: {
    dateInput: 'dd-MM-yyyy',
    timeInput: 'HH:mm',
    timeOptionLabel: 'HH:mm',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'PP',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

/**
 * Locale español derivado del `es` de date-fns que usa **X** para miércoles en
 * los encabezados narrow del calendario → "L M X J V S D" (convención chilena;
 * el `es` de date-fns da "m" para martes y miércoles, ambiguo). Solo se altera
 * el narrow del día 3 (miércoles); el resto del locale queda intacto.
 */
const dateFnsEsCL: typeof dateFnsEs = {
  ...dateFnsEs,
  localize: {
    ...dateFnsEs.localize,
    // miércoles → "x" minúscula, para combinar con el resto de días narrow del
    // locale es (que son minúsculas: l m x j v s d).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    day: (value: any, options?: any) =>
      options?.width === 'narrow' && value === 3 ? 'x' : dateFnsEs.localize.day(value, options),
  },
};

// Registrar el locale `es` de Angular para que el `DatePipe` (`| date`) formatee
// en español. LOCALE_ID es ESTÁTICO tras el bootstrap (no reacciona al toggle de
// idioma en runtime), así que lo fijamos al idioma persistido en la carga; los
// componentes de fecha que deben reaccionar en runtime usan el DateAdapter
// (date-fns, sincronizado con langChanges$), no el DatePipe.
registerLocaleData(localeEs);
const initialUiLang = resolveInitialUiLang();

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppConfig({
      production: environment.production,
      apiUrl: environment.apiUrl,
      authUrl: environment.authUrl,
      httpLogging: environment.httpLogging,
      version: environment.version,
      stage: environment.stage,
      inboxPollMs: environment.inboxPollMs,
      // mapboxToken NO va aquí: vive en config.json (runtime, fuera del git).
      // Lo lee MapboxService desde RuntimeConfigService.
    }),
    ...provideTransloco({
      config: {
        availableLangs: ['en', 'es'],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideAppInitializer(async () => {
      // `.init()` explícito: un `inject(...)` con resultado descartado puede ser
      // tree-shakeado en prod (el optimizador lo marca "puro") y el servicio nunca
      // arrancaría → diálogos sin handle/estilos en producción. La llamada a método
      // garantiza la instanciación.
      inject(MatDialogDragService).init();
      // Config runtime (tokens fuera del git): cargar el config.json ANTES de
      // cualquier feature que lo consuma. Inyectar aquí (sync, pre-await) por
      // el injection context; el await va más abajo junto al resto.
      const runtimeConfig = inject(RuntimeConfigService);
      // Orden de inicialización de tema (jerarquía de 3 capas):
      // 1. localStorage fallback → 2. marca global (UiSettings) → 3. preferencia usuario (post-login).
      inject(ThemeService).initFromStorage();
      inject(PageContentWidthService).initFromStorage();
      inject(UserUiPreferencesService).initAppearanceFromLocalStorage();
      const transloco = inject(TranslocoService);
      // Inyectar UiSettingsService AQUÍ (sync, antes del await): `inject()` solo
      // funciona dentro del injection context que `provideAppInitializer` abre
      // sincrónicamente; tras un `await`, el contexto se pierde y la llamada
      // lanza NG0203.
      const uiSettings = inject(UiSettingsService);
      const hadStored = readStoredLang() !== null;
      // Mismo idioma resuelto que usa LOCALE_ID arriba (función pura, idempotente).
      const initial = initialUiLang;
      transloco.setActiveLang(initial);
      if (!hadStored) {
        persistLang(initial);
      }
      // Sincronizar el locale del datepicker (date-fns) con el idioma de la app:
      // sin esto el calendario usa en-US (días "S M T…", semana en domingo). El
      // adapter date-fns recibe el OBJETO Locale (no un string BCP-47). es →
      // "L M X J V S D", semana en lunes.
      const dateAdapter = inject(DateAdapter);
      const toLocale = (lang: string): typeof dateFnsEs => (lang === 'es' ? dateFnsEsCL : dateFnsEnUS);
      dateAdapter.setLocale(toLocale(initial));
      transloco.langChanges$.subscribe((lang) => dateAdapter.setLocale(toLocale(lang)));
      // Precargar config runtime + idiomas en paralelo ANTES de disparar
      // `bootstrapFromApi`. El config.json trae tokens (Mapbox) fuera del git;
      // los idiomas son necesarios para que el `errorInterceptor` traduzca toasts.
      await Promise.all([
        runtimeConfig.load(),
        ...(['en', 'es'] as const).map((lang) => firstValueFrom(transloco.load(lang))),
      ]);
      uiSettings.bootstrapFromApi();
    }),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Cross-fade nativo del browser entre rutas (Chrome/Edge); Safari hace
      // fallback silencioso. `skipInitialTransition` evita el fade en el
      // primer render (login → dashboard) que se ve raro tras autenticar.
      // NOTA: NO usamos `onViewTransitionCreated` + `skipTransition()` para
      // saltar el fade en navegaciones de solo-query-params (filtros). Aunque
      // funcionaba, Angular hace internamente `transition.finished.catch(console.error)`
      // bajo ngDevMode → el aborto se imprimía como "AbortError: Transition was
      // skipped" en la consola de DEV. El cross-fade al filtrar es sutil; lo
      // dejamos correr y así la consola queda limpia.
      withViewTransitions({ skipInitialTransition: true }),
    ),
    // errorInterceptor first → it sees responses LAST (reverse order), so 401/refresh
    // logic in authInterceptor runs against the raw HttpErrorResponse, and only
    // unrecoverable failures are normalized to HttpError for subscribers.
    // requestIdInterceptor sits between errorInterceptor and the rest so the id is
    // available via the shared HttpContext when errorInterceptor builds toasts.
    provideHttpClient(withInterceptors([
      errorInterceptor,
      requestIdInterceptor,
      localeInterceptor,
      // credentialsInterceptor antes que authInterceptor: setea
      // `withCredentials: true` para que el browser envíe las cookies
      // HttpOnly de auth en cada request al backend.
      credentialsInterceptor,
      // csrfInterceptor: adjunta X-CSRFToken (desde la cookie csrftoken) a
      // requests mutantes hacia la API — par del enforcement por cookie del backend.
      csrfInterceptor,
      authInterceptor,
      httpLoggingInterceptor,
    ])),
    provideAnimationsAsync(),
    // Adapter de fechas date-fns: el INPUT muestra y acepta dd-MM-yyyy (formato
    // chileno), mientras el modelo sigue siendo un Date (la serialización a la BD
    // como yyyy-MM-dd la hace cada formulario). El locale (es / enUS) se
    // sincroniza con el idioma de la app en el appInitializer (más abajo).
    provideDateFnsAdapter(FVX_DATE_FORMATS),
    { provide: MAT_DATE_LOCALE, useValue: dateFnsEsCL },
    // LOCALE_ID del DatePipe (`| date`) según el idioma persistido en la carga.
    // 'es' usa el locale CL/genérico de Angular; cualquier otro → 'en-US'.
    { provide: LOCALE_ID, useValue: initialUiLang === 'es' ? 'es' : 'en-US' },
    /** Tooltips por defecto arriba (tablas CRUD, iconos de plantilla); quien necesite otra posición usa ``matTooltipPosition``. */
    {
      provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
      useValue: {
        showDelay: 0,
        hideDelay: 0,
        touchendHideDelay: 1500,
        position: 'above',
      },
    },
    provideEchartsCore({ echarts }),
    // Proveedor de subida de archivos (imágenes de planes, etc.): sube a Django
    // (`POST /api/v1/uploads/`) y devuelve la URL pública. Global para que el
    // file-uploader funcione donde se use (p. ej. el campo `image` del CRUD).
    { provide: FILE_UPLOAD_PROVIDER, useClass: DjangoUploadProvider },
    // ── Firebase (proyecto gen-suscription): Auth + Firestore para la zona pública ──
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
  ]
};
