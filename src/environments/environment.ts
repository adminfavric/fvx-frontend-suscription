// Importamos la versión desde package.json (única fuente de verdad). Cuando
// hagas `npm version patch|minor|major` la app actualiza el footer del menu
// automáticamente — no hay que tocar este archivo en cada release.
import { version as pkgVersion } from '../../package.json';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  authUrl: 'http://localhost:8080/api/auth',
  /** Log HTTP method, URL, payload and response in the browser console (see http-logging.interceptor) */
  httpLogging: true,
  /** Versión visible en el menú de usuario (sincronizada con package.json). */
  version: pkgVersion,
  /** Ambiente lógico: ``'production' | 'staging' | 'dev'``. Solo se muestra chip en topbar si NO es ``'production'``. */
  stage: 'dev' as const,
  /** Intervalo (ms) del polling del inbox de notificaciones. 180000 = 3 min. */
  inboxPollMs: 180_000,
  /**
   * Interruptor GLOBAL de PayPal en el frontend. En ``false`` el checkout no
   * muestra el bloque de PayPal ni carga su SDK, sin importar lo que diga cada
   * membresía. Ponlo en ``true`` cuando el flujo (backend incluido) esté listo.
   */
  paypalEnabled: false,
  /**
   * Client-id PÚBLICO de PayPal (SANDBOX) para cargar el SDK del botón de
   * suscripción en el checkout. Es público por diseño (va en el navegador); el
   * secret NUNCA va aquí, solo en el backend. En prod, reemplazar en
   * environment.prod.ts por el client-id live.
   */
  paypalClientId: 'Ab0FXOw4iBLi5j8rCsfJt0sLO9wMnoFR09Od5YbRyuYFkYyDihLAkingKj0ITZKBD78ZDy7HJcgf3_1l',
  /** Locale del SDK de PayPal: traduce los botones y textos de PayPal (es_CL =
   * español de Chile). Cambia a es_AR, es_ES, en_US, etc. según el público. */
  paypalLocale: 'es_CL',
  /** Configuración pública del proyecto Firebase (gen-suscription). */
  firebase: {
    apiKey: 'AIzaSyDo0rCQobnSdbxrjRS_Q23_MiYXNZ-Xkqk',
    authDomain: 'gen-suscription.firebaseapp.com',
    projectId: 'gen-suscription',
    storageBucket: 'gen-suscription.firebasestorage.app',
    messagingSenderId: '224311653367',
    appId: '1:224311653367:web:27c8045fd7427e9dbef4f2',
    measurementId: 'G-TJ4QY0DYWB',
  },
};

// Nota: el token de Mapbox NO vive aquí. Está en ``public/assets/config.json``
// (gitignored, fuera del repo) y lo carga ``RuntimeConfigService`` al arrancar.
// Plantilla en ``config.example.json``. Motivo: mantener tokens fuera del git
// y permitir que un mismo build sirva para todos los ambientes.
