import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MemberAuthService } from '../services/member-auth.service';
import { isHttpError } from '../../core/http/http-error';

/** Versión del Zoom Meeting SDK (Client View) cargada desde el CDN de Zoom.
 * Se puede subir cuando Zoom publique una nueva (ver npmjs.com/@zoom/meetingsdk). */
const ZOOM_VERSION = '6.2.0';
const ZOOM_CDN = `https://source.zoom.us/${ZOOM_VERSION}`;

/**
 * Sala en vivo: une al miembro a la sesión Zoom EMBEBIDA, sin exponer ningún
 * link. Pide al backend una firma de vida corta (que solo se entrega si el
 * miembro tiene el plan activo y estamos dentro de la franja horaria) y lanza el
 * Meeting SDK de Zoom (Client View) cargado desde el CDN. Vive fuera del layout
 * público porque el SDK ocupa toda la pantalla (#zmmtg-root).
 */
@Component({
  selector: 'app-zoom-room',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="room">
      @if (error()) {
        <div class="panel">
          <mat-icon class="panel__icon">videocam_off</mat-icon>
          <h1>{{ error() }}</h1>
          @if (hint()) { <p>{{ hint() }}</p> }
          <button class="btn" (click)="back()"><mat-icon>arrow_back</mat-icon> Volver a mi contenido</button>
        </div>
      } @else {
        <div class="panel">
          <span class="spinner" aria-hidden="true"></span>
          <h1>{{ status() }}</h1>
          <p>No cierres esta ventana.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; }
    .room { min-height:100vh; background:#15101f; color:#fff; display:grid; place-items:center; padding:24px; }
    .panel { text-align:center; max-width:460px; }
    .panel__icon { font-size:54px; width:54px; height:54px; color:#d9a441; }
    .panel h1 { font-size:1.3rem; margin:18px 0 8px; }
    .panel p { color:#b9aed0; margin:0 0 18px; line-height:1.5; }
    .btn { display:inline-flex; align-items:center; gap:6px; background:#d9a441; color:#2e1a52; border:none; border-radius:999px; padding:10px 20px; font-weight:700; cursor:pointer; }
    .spinner { width:42px; height:42px; border:4px solid rgba(255,255,255,.2); border-top-color:#d9a441; border-radius:50%; display:inline-block; animation:spin 1s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `],
})
export class ZoomRoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private member = inject(MemberAuthService);

  status = signal('Preparando la sala…');
  error = signal('');
  hint = signal('');

  /** Id de la sesión y latido de presencia (candado de entrada única en vivo). */
  private contentId = 0;
  private heartbeatId?: ReturnType<typeof setInterval>;

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.fail('Sesión no válida.'); return; }
    this.contentId = id;

    let info;
    try {
      this.status.set('Verificando tu acceso…');
      info = await this.member.getZoomSignature(id);
    } catch (e: any) {
      this.handleApiError(e);
      return;
    }

    try {
      this.status.set('Cargando Zoom…');
      await this.loadSdk();
      this.status.set('Conectando a la reunión…');
      this.joinMeeting(info);
      this.startHeartbeat();
    } catch {
      this.fail('No se pudo cargar Zoom.', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  ngOnDestroy(): void {
    if (this.heartbeatId) clearInterval(this.heartbeatId);
    // Liberar la presencia (best-effort) para poder reentrar de inmediato.
    if (this.contentId) this.member.zoomLeave(this.contentId).catch(() => {});
    // Al salir de la ruta, ocultar el contenedor del SDK si quedó montado.
    const root = document.getElementById('zmmtg-root');
    if (root) root.style.display = 'none';
  }

  /** Mantiene viva la presencia cada 30s. Si el backend responde 409, otro
   * dispositivo tomó la sesión → se expulsa a este cliente. */
  private startHeartbeat(): void {
    this.heartbeatId = setInterval(() => {
      this.member.zoomHeartbeat(this.contentId).catch((e: any) => {
        if (e?.status === 409) {
          if (this.heartbeatId) clearInterval(this.heartbeatId);
          try { (window as any).ZoomMtg?.leaveMeeting?.({}); } catch { /* noop */ }
          this.fail('Tu sesión se abrió en otro dispositivo.', 'Por seguridad, esta sesión solo puede estar activa en un lugar a la vez.');
        }
      });
    }, 30_000);
  }

  back(): void {
    this.router.navigate(['/mi-contenido']);
  }

  // ── Carga del SDK (Client View) desde el CDN ────────────────────────────
  private async loadSdk(): Promise<void> {
    this.injectCss(`${ZOOM_CDN}/css/bootstrap.css`);
    this.injectCss(`${ZOOM_CDN}/css/react-select.css`);
    if (!(window as any).ZoomMtg) {
      // El Client View necesita estas dependencias EN ORDEN antes del bundle.
      for (const dep of [
        'lib/vendor/react.min.js',
        'lib/vendor/react-dom.min.js',
        'lib/vendor/redux.min.js',
        'lib/vendor/redux-thunk.min.js',
        'lib/vendor/react-redux.min.js',
        'lib/vendor/lodash.min.js',
      ]) {
        await this.injectScript(`${ZOOM_CDN}/${dep}`);
      }
      await this.injectScript(`${ZOOM_CDN}/zoom-meeting-${ZOOM_VERSION}.min.js`);
    }
    const ZoomMtg = (window as any).ZoomMtg;
    if (!ZoomMtg) throw new Error('ZoomMtg no disponible');
    ZoomMtg.setZoomJSLib(`${ZOOM_CDN}/lib`, '/av');
    ZoomMtg.preLoadWasm();
    ZoomMtg.prepareWebSDK();
    // Interfaz de la reunión en español.
    try { ZoomMtg.i18n.load('es-ES'); ZoomMtg.i18n.reload('es-ES'); } catch { /* si falla, queda en inglés */ }
  }

  private joinMeeting(info: { signature: string; sdkKey: string; meetingNumber: string; passcode: string; userName: string; userEmail: string }): void {
    const ZoomMtg = (window as any).ZoomMtg;
    // El SDK monta su UI a pantalla completa en #zmmtg-root.
    const root = document.getElementById('zmmtg-root');
    if (root) root.style.display = 'block';

    ZoomMtg.init({
      leaveUrl: `${location.origin}/mi-contenido`,
      patchJsMedia: true,
      success: () => {
        ZoomMtg.join({
          sdkKey: info.sdkKey,
          signature: info.signature,
          meetingNumber: info.meetingNumber,
          passWord: info.passcode,
          userName: info.userName,
          userEmail: info.userEmail,
          error: () => this.fail('No se pudo entrar a la reunión.', 'Puede que aún no haya comenzado.'),
        });
      },
      error: () => this.fail('No se pudo iniciar Zoom.'),
    });
  }

  // ── Manejo de errores del backend (plan/horario/config) ─────────────────
  private handleApiError(e: any): void {
    const status = e?.status;
    if (status === 401) { this.member.logout(); this.router.navigate(['/acceso']); return; }
    if (status === 403) { this.fail('No tienes acceso a esta sesión.', 'Esta sesión en vivo es para otra membresía.'); return; }
    if (status === 409) {
      const detail = isHttpError(e) ? e.message : '';
      this.fail('La sala todavía no está abierta.', detail || 'Vuelve unos minutos antes de la hora de inicio.');
      return;
    }
    if (status === 503) { this.fail('Zoom no está configurado todavía.', 'Avísale al administrador del sitio.'); return; }
    this.fail('No se pudo abrir la sala.', 'Inténtalo nuevamente en unos minutos.');
  }

  private fail(message: string, hint = ''): void {
    this.error.set(message);
    this.hint.set(hint);
  }

  // ── Utilidades de carga ────────────────────────────────────────────────
  private injectCss(href: string): void {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  private injectScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.body.appendChild(script);
    });
  }
}
