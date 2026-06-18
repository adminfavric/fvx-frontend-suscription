import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  imports: [FormsModule, MatIconModule],
  template: `
    <section class="access">
      <div class="card">
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
          <p>Te enviamos un código a <strong>{{ email }}</strong>. Ingrésalo aquí.</p>
          <label>Código
            <input type="text" inputmode="numeric" [(ngModel)]="code" placeholder="6 dígitos" (keyup.enter)="enter()" />
          </label>
          @if (error()) { <p class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</p> }
          <button class="btn" (click)="enter()" [disabled]="busy()">
            {{ busy() ? 'Verificando…' : 'Entrar' }}
          </button>
          <button class="link" (click)="step.set('email'); error.set('')">Usar otro correo</button>
        }
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
  `],
})
export class MemberLoginComponent {
  private member = inject(MemberAuthService);
  private router = inject(Router);

  step = signal<'email' | 'code'>('email');
  email = '';
  code = '';
  busy = signal(false);
  error = signal('');

  async sendCode(): Promise<void> {
    const email = this.email.trim();
    if (!email || !email.includes('@')) { this.error.set('Ingresa un correo válido.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.member.requestCode(email);
      this.step.set('code');
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
