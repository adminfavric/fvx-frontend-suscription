import { Component, ElementRef, Input, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Membership, formatPrice, INSCRIPTION_OPENS } from '../data/catalog';
import { ContentService } from '../../core/services/content.service';
import { MemberAuthService } from '../services/member-auth.service';
import { environment } from '../../../environments/environment';

/**
 * Detalle de una membresía + formulario de contratación (checkout).
 * El slug llega por la ruta /membresias/:slug (withComponentInputBinding).
 *
 * Dos pasarelas: Flow (principal, tarjetas chilenas en CLP, vía redirección del
 * backend) y PayPal (alternativa internacional en USD, botón del SDK que crea la
 * suscripción con un plan_id y reporta el resultado al backend en onApprove).
 */
declare const paypal: any;
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MatIconModule],
  template: `
    @if (membership(); as m) {
      <div class="wrap">
        <a class="back" routerLink="/membresias"><mat-icon>arrow_back</mat-icon> Volver a membresías</a>

        <div class="grid">
          <!-- DETALLE + POLÍTICA (columna izquierda) -->
          <div class="detail-col">
            <section class="detail">
              <span class="detail__icon"><mat-icon>{{ m.icon }}</mat-icon></span>
              <h1>{{ m.name }}</h1>
              <p class="detail__tagline">{{ m.tagline }}</p>
              <p class="detail__desc">{{ m.description }}</p>
              <ul class="detail__features">
                @for (f of m.features; track f) {
                  <li><mat-icon>check_circle</mat-icon> {{ f }}</li>
                }
              </ul>
            </section>

            <section class="policy">
              <h2><mat-icon>verified_user</mat-icon> Sin compromisos</h2>
              <ul>
                <li><mat-icon>event_repeat</mat-icon>
                  <span><strong>Cobro mensual automático.</strong> Se renueva solo cada mes; no tienes que hacer nada.</span></li>
                <li><mat-icon>cancel</mat-icon>
                  <span><strong>Cancela cuando quieras</strong>, desde "Mi contenido" o escríbenos. Sin permanencia mínima.</span></li>
                <li><mat-icon>schedule</mat-icon>
                  <span><strong>Conservas el acceso hasta el final del período ya pagado</strong> — no pierdes los días que te quedan.</span></li>
                <li><mat-icon>lock</mat-icon>
                  <span><strong>Pago seguro.</strong> No almacenamos los datos de tu tarjeta; los procesa la pasarela.</span></li>
              </ul>
            </section>
          </div>

          <!-- CONTRATACIÓN -->
          <aside class="checkout">
            @if (!checkoutResult()) {
              <div class="checkout__card">
                <h2>Contratar membresía</h2>
                <p class="checkout__price">{{ price(m.priceMonthly) }}<small>{{ periodSuffix(m.interval) }}</small></p>

                @if (switching()) {
                  <div class="switch-note">
                    <mat-icon>swap_horiz</mat-icon>
                    <span>Estás <strong>cambiando de plan</strong>. Al contratar este, cancelamos tu plan anterior y <strong>conservas el acceso actual hasta el final del período ya pagado</strong>.</span>
                  </div>
                }

                <form [formGroup]="form" (ngSubmit)="submit(m)">
                  <label>Nombre completo
                    <input type="text" formControlName="name" placeholder="Tu nombre" />
                  </label>
                  <label>Correo electrónico
                    <input type="email" formControlName="email" placeholder="tu@correo.cl" />
                  </label>

                  <!-- Ciclo de cobro: fijo según el plan (no se elige) -->
                  <div class="cycle-fixed">
                    <mat-icon>event_repeat</mat-icon>
                    <div><strong>Cobro {{ cycleLabel(m.interval) }}</strong>
                      <span>Suscripción recurrente automática.</span></div>
                  </div>

                  <!-- Flow procesa pagos nacionales e internacionales -->
                  <div class="paymethod">
                    <mat-icon>verified_user</mat-icon>
                    <div>
                      <strong>Pago nacional e internacional</strong>
                      <span>Tarjetas chilenas e internacionales, procesado de forma segura por Flow.</span>
                    </div>
                  </div>

                  @if (emailTaken()) {
                    <div class="email-taken">
                      <mat-icon>info</mat-icon>
                      <span>Este correo ya tiene una membresía. <a routerLink="/acceso">Inicia sesión</a> para gestionarla o cambiar de plan.</span>
                    </div>
                  }
                  @if (error()) { <p class="checkout__error"><mat-icon>error_outline</mat-icon> {{ error() }}</p> }

                  <button class="btn btn--gold" type="submit" [disabled]="!!submitting()">
                    <mat-icon>lock</mat-icon>
                    {{ submitting() === 'flow' ? 'Redirigiendo a Flow…' : 'Suscribirme y registrar tarjeta' }}
                  </button>
                  <p class="checkout__note">
                    Te llevaremos a Flow para registrar tu tarjeta de forma segura y activar la
                    suscripción. El pago es procesado por Flow; no almacenamos los datos de tu tarjeta.
                  </p>

                  <!-- Alternativa: pago MENSUAL con link de pago de Flow (cobro por
                       mensualidad, sin tarjeta guardada). Al volver del pago, el
                       acceso se activa automáticamente por 30 días. -->
                  <div class="intl-sep"><span>o paga tu mensualidad</span></div>
                  <div class="paymethod">
                    <mat-icon>calendar_month</mat-icon>
                    <div>
                      <strong>Pago mensual con link de pago</strong>
                      <span>Comprometes tu mensualidad con un link de pago seguro de Flow. Se habilitan 30 días de acceso; renuevas cada mes.</span>
                    </div>
                  </div>
                  <button class="btn btn--violet" type="button" [disabled]="!!submitting()" (click)="payByLink(m)">
                    <mat-icon>calendar_month</mat-icon>
                    {{ submitting() === 'link' ? 'Redirigiendo a Flow…' : 'Pagar mi mensualidad' }}
                  </button>

                  <!-- Alternativa internacional: PayPal (USD). Para clientes fuera
                       de Chile (Argentina, etc.) cuyas tarjetas no funcionan en Flow.
                       Botón oficial del SDK de PayPal (suscripción con plan_id). -->
                  @if (paypalFeatureEnabled && m.paypalEnabled && m.paypalPlanId) {
                    <div class="intl-sep"><span>¿No eres de Chile?</span></div>
                    <div class="paymethod paymethod--intl">
                      <mat-icon>public</mat-icon>
                      <div>
                        <strong>Paga con PayPal{{ m.priceUsd ? ' · ≈ US$' + m.priceUsd : '' }}</strong>
                        <span>Alternativa internacional en dólares (ideal si tu tarjeta no es chilena). Completa tu nombre y correo arriba antes de continuar.</span>
                      </div>
                    </div>
                    <!-- El SDK de PayPal renderiza aquí su botón de suscripción. -->
                    <div #paypalContainer class="paypal-box"></div>
                    @if (paypalLoading()) {
                      <p class="checkout__note">Cargando PayPal…</p>
                    }
                  }
                </form>
              </div>
            } @else if (checkoutResult() === 'ok') {
              <div class="checkout__card checkout__done">
                <mat-icon class="checkout__done-icon">check_circle</mat-icon>
                <h2>¡Suscripción creada!</h2>
                <p>
                  Tu tarjeta quedó registrada y la suscripción a <strong>{{ m.name }}</strong>
                  está activa. <strong>Inicia sesión</strong> para acceder a tu contenido.
                  Recibirás el comprobante en tu correo.
                </p>
                <a class="btn btn--gold" routerLink="/acceso">
                  <mat-icon>login</mat-icon> Iniciar sesión
                </a>
                <a class="link" routerLink="/membresias">Ver otras membresías</a>
              </div>
            } @else {
              <div class="checkout__card checkout__done">
                <mat-icon class="checkout__done-icon" style="color:#b91c1c">error</mat-icon>
                <h2>No se pudo completar</h2>
                <p>El registro de la tarjeta no se completó. Puedes intentarlo nuevamente.</p>
                <a class="btn btn--gold" [routerLink]="['/membresias', m.slug]">Reintentar</a>
              </div>
            }
          </aside>
        </div>
      </div>
    } @else {
      <div class="wrap notfound">
        <h1>Membresía no encontrada</h1>
        <a class="btn btn--violet" routerLink="/membresias">Ver todas las membresías</a>
      </div>
    }
  `,
  styles: [`
    :host { --lita-violet:#5b3a8a; --lita-violet-deep:#2e1a52; --lita-gold:#d9a441; --lita-cream:#faf6ef; --lita-ink:#2a2333; --lita-muted:#6b6478; display:block; background: var(--lita-cream); }

    .wrap { max-width: 1080px; margin: 0 auto; padding: clamp(28px,5vw,56px) clamp(16px,4vw,48px); }
    .back { display:inline-flex; align-items:center; gap:6px; color: var(--lita-violet); text-decoration:none; font-weight:600; margin-bottom: 24px; }
    .back mat-icon { font-size:20px; width:20px; height:20px; }

    .grid { display:grid; grid-template-columns: 1.4fr 1fr; gap: 32px; align-items:start; }

    .detail { background:#fff; border:1px solid #eadfce; border-radius:20px; padding: clamp(24px,3vw,40px); }
    .detail__icon { width:60px; height:60px; border-radius:16px; display:grid; place-items:center; background: color-mix(in srgb, var(--lita-violet) 12%, #fff); color: var(--lita-violet); margin-bottom:18px; }
    .detail__icon mat-icon { font-size:34px; width:34px; height:34px; }
    .detail h1 { margin:0 0 6px; color: var(--lita-violet-deep); font-size: clamp(1.6rem,3vw,2.1rem); }
    .detail__tagline { margin:0 0 18px; color: var(--lita-muted); }
    .detail__desc { color: var(--lita-ink); line-height:1.7; margin:0 0 22px; }
    .detail__features { list-style:none; padding:0; margin:0; display:grid; gap:10px; }
    .detail__features li { display:flex; gap:8px; align-items:flex-start; color: var(--lita-ink); }
    .detail__features mat-icon { color:#3fa46a; font-size:20px; width:20px; height:20px; margin-top:1px; }

    .detail-col { display:flex; flex-direction:column; gap:24px; }
    .policy { background:#fff; border:1px solid #eadfce; border-radius:20px; padding: clamp(20px,3vw,32px); }
    .policy h2 { display:flex; align-items:center; gap:8px; margin:0 0 16px; color: var(--lita-violet-deep); font-size:1.1rem; }
    .policy h2 mat-icon { color: var(--lita-gold); }
    .policy ul { list-style:none; padding:0; margin:0; display:grid; gap:14px; }
    .policy li { display:flex; gap:10px; align-items:flex-start; color: var(--lita-ink); font-size:.92rem; line-height:1.5; }
    .policy li mat-icon { color: var(--lita-violet); font-size:20px; width:20px; height:20px; margin-top:1px; flex-shrink:0; }
    .policy strong { color: var(--lita-violet-deep); }

    .checkout { position: sticky; top: 90px; }
    .checkout__card { background:#fff; border:1px solid #eadfce; border-radius:20px; padding: 28px; box-shadow: 0 16px 40px -24px rgba(46,26,82,.6); }
    .checkout__card h2 { margin:0 0 6px; color: var(--lita-violet-deep); font-size:1.25rem; }
    .checkout__price { margin:0 0 20px; font-size:1.6rem; font-weight:800; color: var(--lita-violet-deep); }
    .checkout__price small { font-size:.85rem; font-weight:500; color: var(--lita-muted); }

    form { display:flex; flex-direction:column; gap:14px; }
    label { display:flex; flex-direction:column; gap:6px; font-size:.85rem; font-weight:600; color: var(--lita-ink); }
    input, select { padding:11px 12px; border:1px solid #d9cdbb; border-radius:10px; font-size:.95rem; font-family:inherit; background:#fff; }
    input:focus, select:focus { outline:none; border-color: var(--lita-violet); box-shadow: 0 0 0 3px color-mix(in srgb, var(--lita-violet) 18%, transparent); }

    .cycle-fixed { display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:12px; background: var(--lita-cream); border:1px solid #eadfce; }
    .cycle-fixed mat-icon { color: var(--lita-violet); font-size:24px; width:24px; height:24px; flex:0 0 auto; }
    .cycle-fixed strong { display:block; font-size:.9rem; color: var(--lita-ink); }
    .cycle-fixed span { display:block; font-size:.8rem; color: var(--lita-muted); }
    .paymethod { display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:12px; background: color-mix(in srgb, var(--lita-violet) 9%, #fff); border:1px solid color-mix(in srgb, var(--lita-violet) 22%, transparent); }
    .paymethod mat-icon { font-size:24px; width:24px; height:24px; flex:0 0 auto; }
    .paymethod--intl { background: color-mix(in srgb, var(--lita-gold) 14%, #fff); border-color: color-mix(in srgb, var(--lita-gold) 40%, transparent); }
    .paymethod mat-icon { color: var(--lita-violet); }
    .paymethod--intl mat-icon { color:#b9842b; }
    .paymethod strong { display:block; font-size:.9rem; color: var(--lita-ink); }
    .paymethod span { display:block; font-size:.8rem; color: var(--lita-muted); }

    .switch-note { display:flex; gap:10px; align-items:flex-start; padding:12px 14px; margin:0 0 16px; border-radius:12px; background: color-mix(in srgb, var(--lita-gold) 14%, #fff); border:1px solid color-mix(in srgb, var(--lita-gold) 40%, transparent); font-size:.85rem; color: var(--lita-ink); line-height:1.45; }
    .switch-note mat-icon { color:#b9842b; font-size:22px; width:22px; height:22px; flex:0 0 auto; }
    .switch-note strong { color: var(--lita-violet-deep); }
    .email-taken { display:flex; gap:8px; align-items:flex-start; padding:11px 13px; margin:0 0 4px; border-radius:10px; background:#fff7e6; border:1px solid #f0dba4; color:#8a5a00; font-size:.85rem; line-height:1.45; }
    .email-taken mat-icon { color:#b9842b; font-size:20px; width:20px; height:20px; flex:0 0 auto; }
    .email-taken a { color: var(--lita-violet); font-weight:700; }

    .checkout__error { display:flex; align-items:center; gap:6px; color:#b91c1c; font-size:.85rem; margin:0; }
    .checkout__error mat-icon { font-size:18px; width:18px; height:18px; }
    .checkout__note { margin:4px 0 0; font-size:.78rem; color: var(--lita-muted); line-height:1.5; }

    .checkout__done { text-align:center; }
    .checkout__done-icon { color:#3fa46a; font-size:56px; width:56px; height:56px; }
    .checkout__done h2 { margin:10px 0; }
    .checkout__done p { color: var(--lita-ink); line-height:1.6; margin-bottom:20px; }
    .checkout__done .btn { width:100%; }
    .checkout__done .link { display:inline-block; margin-top:14px; color: var(--lita-violet); font-weight:600; text-decoration:none; font-size:.9rem; }
    .checkout__done .link:hover { color: var(--lita-gold); }

    .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:13px 24px; border:none; border-radius:999px; text-decoration:none; font-weight:700; font-size:.95rem; cursor:pointer; transition: transform .12s, filter .15s; font-family:inherit; }
    .btn:hover { transform: translateY(-1px); }
    .btn--gold { background: var(--lita-gold); color: var(--lita-violet-deep); width:100%; }
    .btn--violet { background: var(--lita-violet); color:#fff; }
    .btn mat-icon { font-size:18px; width:18px; height:18px; }
    .paypal-box { margin-top:4px; min-height:45px; }

    .intl-sep { display:flex; align-items:center; gap:10px; margin:6px 0 2px; color: var(--lita-muted); font-size:.78rem; text-transform:uppercase; letter-spacing:.05em; }
    .intl-sep::before, .intl-sep::after { content:""; flex:1; height:1px; background:#e6dccb; }

    .notfound { text-align:center; }
    .notfound h1 { color: var(--lita-violet-deep); }

    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } .checkout { position: static; } }
  `],
})
export class CheckoutComponent implements OnInit {
  /** Llega por la ruta /membresias/:slug */
  @Input() slug = '';

  /** Contenedor donde el SDK de PayPal renderiza su botón (si el plan lo ofrece). */
  @ViewChild('paypalContainer') paypalContainer?: ElementRef<HTMLDivElement>;

  membership = signal<Membership | undefined>(undefined);
  form: FormGroup;
  error = signal('');
  /** Indica a qué medio se está redirigiendo ('flow' = suscripción tarjeta,
   * 'link' = pago único por link de Flow / transferencia). */
  submitting = signal<'' | 'flow' | 'link'>('');
  /** true mientras se carga el SDK de PayPal. */
  paypalLoading = signal(false);
  /** Interruptor global de PayPal (environment). En false, el checkout ni
   * muestra el bloque ni carga el SDK, aunque la membresía lo tenga activo. */
  paypalFeatureEnabled = environment.paypalEnabled;
  checkoutResult = signal<'' | 'ok' | 'fail'>('');
  /** El visitante viene "cambiando de plan" (desde Mi contenido). */
  switching = signal(false);
  /** El correo ingresado ya tiene una membresía y NO está logueado → debe entrar. */
  emailTaken = signal(false);

  /** Bloquea el pago si un visitante NO logueado usa un correo ya registrado.
   * Devuelve true si puede continuar. */
  private async ensureCanSubscribe(email: string): Promise<boolean> {
    this.emailTaken.set(false);
    if (this.member.isLoggedIn()) return true; // logueado: puede renovar/cambiar
    if (await this.content.memberEmailHasActive(email)) {
      this.emailTaken.set(true);
      this.submitting.set('');
      return false;
    }
    return true;
  }

  private content = inject(ContentService);
  private member = inject(MemberAuthService);
  private route = inject(ActivatedRoute);
  private paypalReady = false;
  /** IDs de suscripciones recurrentes ACTIVAS de OTRO plan (a cancelar al pagar). */
  private switchFromIds: string[] = [];

  /** Cancela las suscripciones recurrentes anteriores (de otro plan) al iniciar el
   * pago de la nueva. Conserva el acceso hasta el fin del período ya pagado. No
   * bloquea el pago si la cancelación falla. */
  private async applyPlanSwitch(): Promise<void> {
    const ids = this.switchFromIds;
    this.switchFromIds = [];
    for (const id of ids) {
      try { await this.member.cancelSubscription(id); } catch { /* no bloquear el cambio */ }
    }
  }

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async ngOnInit(): Promise<void> {
    this.membership.set(await this.content.getMembership(this.slug));
    const r = this.route.snapshot.queryParamMap.get('checkout');
    if (r === 'ok' || r === 'fail') this.checkoutResult.set(r);
    const memberEmail = this.member.email();
    if (memberEmail) this.form.patchValue({ email: memberEmail });

    // Cambio de plan AUTOMÁTICO: si el miembro logueado ya tiene una suscripción
    // recurrente ACTIVA de OTRO plan, esto es un cambio → mostramos el aviso y
    // marcamos esa(s) suscripción(es) para cancelarlas al pagar la nueva. (Si está
    // deslogueado o es el mismo plan, es una contratación/renovación normal.)
    this.switching.set(this.route.snapshot.queryParamMap.get('cambiar') === '1');
    if (this.member.isLoggedIn()) {
      try {
        const acc = await this.member.getAccount();
        const others = (acc.subscriptions ?? []).filter(s =>
          s.status === 1 && !s.is_manual && !s.cancel_at_period_end &&
          !!s.subscription_id && s.plan_slug !== this.slug);
        if (others.length) {
          this.switching.set(true);
          this.switchFromIds = others.map(s => s.subscription_id);
        }
      } catch { /* sin sesión válida: se ignora */ }
    }
    // Si el plan ofrece PayPal, montamos su botón tras pintar el contenedor.
    const m = this.membership();
    if (this.paypalFeatureEnabled && m?.paypalEnabled && m.paypalPlanId && !this.checkoutResult()) {
      setTimeout(() => this.setupPaypal(m), 0);
    }
  }

  price = formatPrice;
  inscriptionOpens = INSCRIPTION_OPENS;

  /** Etiqueta del ciclo de cobro según el interval de Flow. */
  cycleLabel(interval?: number): string {
    return { 1: 'Diario', 2: 'Semanal', 3: 'Mensual', 4: 'Anual' }[interval ?? 3] ?? 'Mensual';
  }

  /** Sufijo de precio (/mes, /año…). */
  periodSuffix(interval?: number): string {
    return { 1: '/día', 2: '/semana', 3: '/mes', 4: '/año' }[interval ?? 3] ?? '/mes';
  }

  /** Suscripción vía Flow (tarjetas chilenas, CLP) — redirección del backend. */
  async submit(m: Membership): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Por favor completa tu nombre y un correo válido.');
      this.form.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.submitting.set('flow');
    const v = this.form.value;
    try {
      if (!(await this.ensureCanSubscribe(v.email))) return;
      await this.applyPlanSwitch();
      const url = await this.content.startCheckout({ plan_slug: m.slug, name: v.name, email: v.email });
      window.location.href = url; // a Flow para registrar la tarjeta y suscribir.
    } catch (e: any) {
      this.submitting.set('');
      this.error.set(e?.error?.detail || 'No se pudo iniciar el pago. Intenta nuevamente.');
    }
  }

  /** Pago por LINK de Flow (pago único, habilita 1 mes; admite transferencia).
   * Redirige a Flow; al volver, el acceso se activa solo. */
  async payByLink(m: Membership): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Por favor completa tu nombre y un correo válido.');
      this.form.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.submitting.set('link');
    const v = this.form.value;
    try {
      if (!(await this.ensureCanSubscribe(v.email))) return;
      await this.applyPlanSwitch();
      const url = await this.content.startPaymentLink({
        plan_slug: m.slug, name: v.name, email: v.email, months: 1,
      });
      window.location.href = url; // a Flow para pagar con cualquier medio.
    } catch (e: any) {
      this.submitting.set('');
      this.error.set(e?.error?.detail || 'No se pudo iniciar el pago. Intenta nuevamente.');
    }
  }

  // ── PayPal (SDK) ───────────────────────────────────────────────────────────
  /** Carga el SDK de PayPal (una vez) y renderiza el botón de suscripción. */
  private async setupPaypal(m: Membership): Promise<void> {
    if (this.paypalReady || !this.paypalContainer) return;
    const clientId = environment.paypalClientId;
    if (!clientId) return; // sin client-id no se puede cargar el SDK.
    this.paypalLoading.set(true);
    try {
      await this.loadPaypalSdk(clientId);
    } catch {
      this.paypalLoading.set(false);
      this.error.set('No se pudo cargar PayPal. Recarga la página o usa el pago con tarjeta.');
      return;
    }
    this.paypalLoading.set(false);
    if (this.paypalReady || typeof paypal === 'undefined') return;
    this.paypalReady = true;

    paypal.Buttons({
      style: { shape: 'pill', color: 'gold', layout: 'vertical', label: 'subscribe' },
      // Exige nombre + correo antes de abrir PayPal (los necesitamos para el acceso).
      onClick: async (_data: any, actions: any) => {
        if (this.form.invalid) {
          this.error.set('Completa tu nombre y un correo válido antes de pagar con PayPal.');
          this.form.markAllAsTouched();
          return actions.reject();
        }
        this.error.set('');
        // Mismo control que Flow: si no estás logueado y el correo ya tiene
        // membresía, no dejar suscribir (debe iniciar sesión / cambiar de plan).
        if (!(await this.ensureCanSubscribe(this.form.value.email))) {
          return actions.reject();
        }
        return actions.resolve();
      },
      createSubscription: (_data: any, actions: any) =>
        actions.subscription.create({
          plan_id: m.paypalPlanId,
          subscriber: {
            name: { given_name: this.form.value.name },
            email_address: this.form.value.email,
          },
        }),
      onApprove: async (data: any) => {
        try {
          await this.content.recordPaypalSubscription({
            plan_slug: m.slug,
            name: this.form.value.name,
            email: this.form.value.email,
            subscription_id: data.subscriptionID,
          });
          this.checkoutResult.set('ok');
        } catch {
          // El cobro se aprobó en PayPal pero falló el registro: marcamos ok igual
          // (el webhook puede reconciliar) y avisamos por consola.
          console.error('No se pudo registrar la suscripción PayPal en el backend.');
          this.checkoutResult.set('ok');
        }
      },
      onError: () =>
        this.error.set('No se pudo completar el pago con PayPal. Intenta nuevamente.'),
    }).render(this.paypalContainer.nativeElement);
  }

  private loadPaypalSdk(clientId: string): Promise<void> {
    if (typeof paypal !== 'undefined') return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const existing = document.getElementById('paypal-sdk') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const s = document.createElement('script');
      s.id = 'paypal-sdk';
      const locale = environment.paypalLocale ? `&locale=${encodeURIComponent(environment.paypalLocale)}` : '';
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription${locale}`;
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.body.appendChild(s);
    });
  }
}
