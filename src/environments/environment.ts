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
