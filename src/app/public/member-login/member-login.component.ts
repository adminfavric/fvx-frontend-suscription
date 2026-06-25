import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MemberAuthService } from '../services/member-auth.service';

/**
 * Acceso de miembros (suscriptores) sin contraseña. Paso 1: email → se envía un
 * código. Paso 2: ingresar el código → entra a "Mi contenido".
 */
@Component({
  selector: 'app-member-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, RouterLink],
  template: `
    <section class="access">
      <div class="card">
        @if (pago() === 'ok') {
          <div class="pay pay--ok"><mat-icon>check_circle</mat-icon>
            <span><strong>¡Pago recibido!</strong> Ingresa tu correo para entrar a tu contenido.</span>
          </div>
        } @else if (pago() === 'pendiente') {
          <div class="pay pay--pend"><mat-icon>hourglass_top</mat-icon>
            <span>Tu pago está <strong>en proceso de confirmación</strong>. Si ya pagaste, ingresa en unos minutos.</span>
          </div>
        }
        @if (sesionOtro()) {
          <div class="pay pay--pend"><mat-icon>devices</mat-icon>
            <span>Tu sesión <strong>se abrió en otro dispositivo</strong>. Por seguridad, vuelve a ingresar aquí.</span>
          </div>
        }
        <span class="card__icon"><mat-icon>lock_open</mat-icon></span>
        <h1>Acceso de miembros</h1>

        @if (step() === 'email') {
          <p>Ingresa el correo con el que te suscribiste. Te enviaremos un código de acceso.</p>
          <label>Correo electrónico
            <input type="email" [(ngModel)]="email" placeholder="tu@correo.cl" (keyup.enter)="sendCode()" />
          </label>
          @if (error()) { <p class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</p> }
          <button class="btn" (click)="sendCode()" [disabled]="busy()">
            {{ busy() ? 'Enviando…' : 'Enviar código' }}
          </button>
        } @else {
          <div class="sent">
            <mat-icon>mark_email_read</mat-icon>
            <span>Código enviado a <strong>{{ email }}</strong></span>
          </div>
          <p class="sent-hint">Revisa tu correo (y la carpeta de spam) e ingrésalo aquí.</p>
          <label>Código
            <input type="text" inputmode="numeric" [(ngModel)]="code" placeholder="6 dígitos" (keyup.enter)="enter()" />
          </label>
          @if (error()) { <p class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</p> }
          @if (notice()) { <p class="notice"><mat-icon>check_circle</mat-icon> {{ notice() }}</p> }
          <button class="btn" (click)="enter()" [disabled]="busy()">
            {{ busy() ? 'Verificando…' : 'Entrar' }}
          </button>
          <div class="resend">
            @if (resendIn() > 0) {
              <span>¿No te llegó? Podrás reenviarlo en {{ resendIn() }}s</span>
            } @else {
              <button class="link" (click)="resend()" [disabled]="busy()">Reenviar código</button>
            }
          </div>
          <button class="link" (click)="useAnotherEmail()">Usar otro correo</button>
        }

        <p class="signup">
          ¿No tienes una cuenta? <a routerLink="/membresias">Suscríbete aquí</a>.
        </p>
      </div>
    </section>
  `,
  styles: [`
    :host { --v:#5b3a8a; --vd:#2e1a52; --gold:#d9a441; display:block; background: var(--color-bg,#faf6ef); min-height: 70vh; }
    .access { max-width: 460px; margin: 0 auto; padding: clamp(40px,8vw,90px) 20px; }
    .card { background:#fff; border:1px solid #eadfce; border-radius:20px; padding: 32px; box-shadow: 0 18px 44px -26px rgba(46,26,82,.5); text-align:center; }
    .card__icon { width:56px; height:56px; border-radius:16px; display:grid; place-items:center; margin:0 auto 14px; background: linear-gradient(135deg, rgba(107,76,140,.14), rgba(217,164,65,.14)); color: var(--v); }
    h1 { color: var(--vd); font-size:1.4rem; margin:0 0 8px; }
    p { color:#6b6478; margin:0 0 18px; line-height:1.5; }
    label { display:flex; flex-direction:column; gap:6px; text-align:left; font-weight:600; font-size:.85rem; color:#2a2333; margin-bottom:14px; }
    input { padding:12px; border:1px solid #d9cdbb; border-radius:10px; font-size:1rem; font-family:inherit; }
    input:focus { outline:none; border-color:var(--v); box-shadow:0 0 0 3px rgba(91,58,138,.18); }
    .btn { width:100%; background: var(--gold); color: var(--vd); border:none; padding:13px; border-radius:999px; font-weight:700; font-size:.95rem; cursor:pointer; }
    .btn:disabled { opacity:.7; cursor:default; }
    .link { background:none; border:none; color:var(--v); cursor:pointer; margin-top:12px; font-size:.85rem; text-decoration:underline; }
    .error { display:flex; align-items:center; gap:6px; justify-content:center; color:#b91c1c; font-size:.85rem; }
    .error mat-icon { font-size:18px; width:18px; height:18px; }
    .signup { margin:20px 0 0; padding-top:16px; border-top:1px solid #f0e8da; font-size:.88rem; color:#6b6478; }
    .signup a { color:var(--v); font-weight:700; }
    .pay { display:flex; gap:8px; align-items:flex-start; text-align:left; padding:12px 14px; border-radius:12px; margin-bottom:18px; font-size:.88rem; line-height:1.45; }
    .pay mat-icon { flex:0 0 auto; }
    .pay--ok { background:#e3f6ea; color:#1f7a45; }
    .pay--pend { background:#fbf0d8; color:#b9842b; }
    .sent { display:flex; gap:10px; align-items:flex-start; text-align:left; background:#e3f6ea; color:#1f7a45; padding:12px 14px; border-radius:12px; margin-bottom:6px; font-size:.88rem; }
    .sent mat-icon { font-size:22px; width:22px; height:22px; flex:0 0 auto; margin-top:1px; }
    .sent span { min-width:0; line-height:1.4; }
    .sent strong { display:block; color:#15663a; font-size:.92rem; overflow-wrap:anywhere; }
    .sent-hint { font-size:.82rem; color:#9a93a8; margin:0 0 16px; }
    .notice { display:flex; align-items:center; gap:6px; justify-content:center; color:#1f7a45; font-size:.85rem; }
    .notice mat-icon { font-size:18px; width:18px; height:18px; }
    .resend { margin-top:10px; font-size:.85rem; color:#6b6478; }
    .resend .link { margin-top:0; }
  `],
})
export class MemberLoginComponent implements OnDestroy {
  private member = inject(MemberAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  step = signal<'email' | 'code'>('email');
  email = '';
  code = '';
  busy = signal(false);
  error = signal('');
  /** Aviso breve (ej. "Código reenviado"). */
  notice = signal('');
  /** Segundos restantes antes de poder reenviar el código (0 = ya puede). */
  resendIn = signal(0);
  private timer?: ReturnType<typeof setInterval>;
  /** Espera entre reenvíos (segundos). */
  private readonly RESEND_WAIT = 60;

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private startResendCountdown(): void {
    this.resendIn.set(this.RESEND_WAIT);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      const v = this.resendIn() - 1;
      this.resendIn.set(v > 0 ? v : 0);
      if (v <= 0 && this.timer) clearInterval(this.timer);
    }, 1000);
  }

  useAnotherEmail(): void {
    this.step.set('email');
    this.error.set('');
    this.notice.set('');
    this.resendIn.set(0);
    if (this.timer) clearInterval(this.timer);
  }

  async resend(): Promise<void> {
    if (this.resendIn() > 0 || this.busy()) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try {
      await this.member.requestCode(this.email.trim());
      this.notice.set('Código reenviado. Revisa tu correo.');
      this.startResendCountdown();
    } catch {
      this.error.set('No se pudo reenviar el código. Intenta nuevamente.');
    } finally {
      this.busy.set(false);
    }
  }
  /** Aviso tras volver de un pago por link (?pago=ok|pendiente). */
  pago = signal<'' | 'ok' | 'pendiente'>(
    (this.route.snapshot.queryParamMap.get('pago') as '' | 'ok' | 'pendiente') || '',
  );
  /** Llegó porque su sesión se invalidó al iniciar sesión en otro lugar. */
  sesionOtro = signal(this.route.snapshot.queryParamMap.get('sesion') === 'otro');

  async sendCode(): Promise<void> {
    const email = this.email.trim();
    if (!email || !email.includes('@')) { this.error.set('Ingresa un correo válido.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.member.requestCode(email);
      this.step.set('code');
      this.notice.set('');
      this.startResendCountdown();
    } catch {
      this.error.set('No se pudo enviar el código. Intenta nuevamente.');
    } finally {
      this.busy.set(false);
    }
  }

  async enter(): Promise<void> {
    if (!this.code.trim()) { this.error.set('Ingresa el código.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.member.verifyCode(this.email.trim(), this.code.trim());
      this.router.navigate(['/mi-contenido']);
    } catch {
      this.error.set('Código inválido o expirado.');
    } finally {
      this.busy.set(false);
    }
  }
}
