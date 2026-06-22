import { version as pkgVersion } from '../../package.json';

export const environment = {
  production: true,
  apiUrl: 'https://suscription-services.favric.cl/api/v1',
  authUrl: 'https://suscription-services.favric.cl/api/auth',
  httpLogging: false,
  /** Versión visible en el menú de usuario (sincronizada con package.json). */
  version: pkgVersion,
  stage: 'production' as const,
  /** Intervalo (ms) del polling del inbox de notificaciones. 180000 = 3 min. */
  inboxPollMs: 180_000,
  /** Interruptor GLOBAL de PayPal en el frontend. En ``false`` el checkout no
   * muestra PayPal ni carga su SDK. Ponlo en ``true`` cuando esté configurado. */
  paypalEnabled: false,
  /** Client-id PÚBLICO de PayPal (LIVE). Reemplazar por el de producción al
   * publicar. Vacío = el botón PayPal no se renderiza. */
  paypalClientId: '',
  /** Locale del SDK de PayPal (traduce los botones). es_CL = español de Chile. */
  paypalLocale: 'es_CL',
  /** Config Firebase (proyecto gen-suscription). El frontend la inicializa en
   * app.config; hoy su uso es legacy (auth/contenido ya van por Django). Se
   * mantiene para que el build no falle; se puede remover al limpiar Firebase. */
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
