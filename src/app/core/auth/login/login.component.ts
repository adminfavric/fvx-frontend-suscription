import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { UiSettingsService } from '../../services/ui-settings.service';
import type { SocialUiConfig } from '../../models/ui-settings.model';
import {
  AlertMessageComponent,
  AlertMessageType,
} from '../../../shared/components/alert-message/alert-message.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
    AlertMessageComponent
],
  template: `
    <div class="login-page">
      <aside class="login-brand">
        <div class="login-brand__pattern" aria-hidden="true"></div>

        <div class="login-brand__head">
          <div class="login-brand__mark" aria-hidden="true">
            <mat-icon>apartment</mat-icon>
          </div>
          <div class="login-brand__wordmark">
            <b>{{ 'login.brandTitle' | transloco }}</b>
            <span>{{ 'login.brandKicker' | transloco }}</span>
          </div>
        </div>

        <div class="login-brand__body">
          <h1 class="login-brand__title">{{ 'login.brandHeadline' | transloco }}</h1>
          <p class="login-brand__tagline">{{ 'login.tagline' | transloco }}</p>

          <div class="login-brand__stats">
            <div class="login-brand__stat">
              <div class="v">{{ 'login.stat1Value' | transloco }}</div>
              <div class="k">{{ 'login.stat1Label' | transloco }}</div>
            </div>
            <div class="login-brand__stat">
              <div class="v">{{ 'login.stat2Value' | transloco }}</div>
              <div class="k">{{ 'login.stat2Label' | transloco }}</div>
            </div>
          </div>
        </div>

        <div class="login-brand__foot">
          <span>
            <mat-icon>lock</mat-icon>{{ 'login.footEncrypted' | transloco }}
          </span>
          <span>
            <mat-icon>verified_user</mat-icon>{{ 'login.footSso' | transloco }}
          </span>
        </div>
      </aside>

      <div class="login-panel">
        <div class="login-card">
          <header class="login-card__header">
            <h2 class="login-card__title">{{ 'login.signInTitle' | transloco }}</h2>
            <p class="login-card__subtitle">{{ 'login.signInSubtitle' | transloco }}</p>
          </header>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form fvx-login-form">
            <div class="field-wrapper">
              <label class="field-label" for="login-username">
                {{ 'login.username' | transloco }}<span class="required">*</span>
              </label>
              <mat-form-field appearance="outline" class="login-field" subscriptSizing="dynamic">
                <mat-icon matPrefix class="field-prefix">person_outline</mat-icon>
                <input
                  id="login-username"
                  matInput
                  formControlName="username"
                  autocomplete="username"
                />
              </mat-form-field>
            </div>

            <div class="field-wrapper">
              <label class="field-label" for="login-password">
                {{ 'login.password' | transloco }}<span class="required">*</span>
              </label>
              <mat-form-field appearance="outline" class="login-field" subscriptSizing="dynamic">
                <mat-icon matPrefix class="field-prefix">lock_outline</mat-icon>
                <input
                  id="login-password"
                  matInput
                  [type]="hidePassword() ? 'password' : 'text'"
                  formControlName="password"
                  autocomplete="current-password" />
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  class="suffix-toggle"
                  (click)="hidePassword.set(!hidePassword())"
                  [attr.aria-label]="hidePassword() ? ('login.showPassword' | transloco) : ('login.hidePassword' | transloco)">
                  <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
            </div>

            @if (loginFeedback(); as fb) {
              <app-alert-message
                class="login-feedback"
                [type]="fb.type"
                [message]="fb.message"
                [role]="fb.type === 'warning' ? 'status' : 'alert'"
              />
            }

            <button
              mat-flat-button
              color="primary"
              type="submit"
              class="login-submit"
              [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20" class="login-submit__spinner"></mat-spinner>
                <span>{{ 'login.signingIn' | transloco }}</span>
              } @else {
                <span>{{ 'login.signIn' | transloco }}</span>
              }
            </button>
          </form>

          @if (hasSocial()) {
            <p class="login-or"><span>{{ 'login.orContinue' | transloco }}</span></p>
            <div class="login-social-btns">
              @if (showGoogle()) {
                <div class="login-google-wrap">
                  <div #googleButtonHost class="login-google-host" aria-label="Google Sign-In"></div>
                </div>
              }
              @if (showMicrosoft()) {
                <button
                  type="button"
                  class="login-sso-btn"
                  (click)="onMicrosoftClick()"
                  [disabled]="loading() || microsoftLoading()">
                  <span class="login-sso-logo" aria-hidden="true" [innerHTML]="microsoftLogo"></span>
                  <span class="login-sso-label">{{ 'login.continueWithMicrosoft' | transloco }}</span>
                  <span class="login-sso-arrow">
                    @if (microsoftLoading()) {
                      <mat-icon class="login-sso-spin">progress_activity</mat-icon>
                    } @else {
                      <mat-icon>chevron_right</mat-icon>
                    }
                  </span>
                </button>
              }
              @if (showApple()) {
                <button
                  type="button"
                  class="login-sso-btn"
                  (click)="onAppleClick()"
                  [disabled]="loading() || appleLoading()">
                  <span class="login-sso-logo" aria-hidden="true" [innerHTML]="appleLogo"></span>
                  <span class="login-sso-label">{{ 'login.continueWithApple' | transloco }}</span>
                  <span class="login-sso-arrow">
                    @if (appleLoading()) {
                      <mat-icon class="login-sso-spin">progress_activity</mat-icon>
                    } @else {
                      <mat-icon>chevron_right</mat-icon>
                    }
                  </span>
                </button>
              }
            </div>
          }

          <footer class="login-card__footer">
            <span class="login-card__hint">
              <mat-icon>verified_user</mat-icon>{{ 'login.footerHint' | transloco }}
            </span>
          </footer>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  /** Coincide con el texto del backend (`api/social/views.py`) para alta social pendiente. */
  private static readonly SOCIAL_PENDING_MARKERS = ['pendiente de validación', 'pending validation'];

  private readonly transloco = inject(TranslocoService);
  private readonly uiSettings = inject(UiSettingsService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('googleButtonHost') private googleButtonHost?: ElementRef<HTMLDivElement>;

  /**
   * Logos SSO inline (ver new-login.md §7). Apple es monocromo con
   * ``fill="currentColor"`` → toma el color del texto del botón en todos los
   * temas. Microsoft va a color (logo oficial). SVG estáticos y de confianza,
   * por eso ``bypassSecurityTrustHtml`` (no hay entrada de usuario).
   */
  readonly appleLogo: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(
    '<svg width="15" height="18" viewBox="0 0 14 17" aria-hidden="true">' +
      '<path fill="currentColor" d="M11.6 9.04c-.02-1.82 1.49-2.7 1.56-2.74-.85-1.24-2.17-1.41-2.64-1.43-1.12-.11-2.19.66-2.76.66-.57 0-1.45-.64-2.38-.62-1.22.02-2.35.71-2.98 1.8-1.27 2.2-.32 5.46.91 7.25.6.88 1.32 1.86 2.25 1.83.9-.04 1.25-.58 2.34-.58 1.09 0 1.4.58 2.36.56.97-.02 1.59-.9 2.18-1.78.69-1.02.97-2.01.99-2.06-.02-.01-1.9-.73-1.92-2.89zM9.86 3.6c.5-.61.84-1.45.74-2.3-.72.03-1.59.48-2.11 1.08-.46.53-.87 1.39-.76 2.21.8.06 1.62-.41 2.13-.99z"/>' +
      '</svg>',
  );
  readonly microsoftLogo: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(
    '<svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">' +
      '<path fill="#F25022" d="M1 1h10v10H1z"/>' +
      '<path fill="#7FBA00" d="M12 1h10v10H12z"/>' +
      '<path fill="#00A4EF" d="M1 12h10v10H1z"/>' +
      '<path fill="#FFB900" d="M12 12h10v10H12z"/>' +
      '</svg>',
  );

  form: FormGroup;
  loading = signal(false);
  appleLoading = signal(false);
  microsoftLoading = signal(false);
  loginFeedback = signal<{ type: AlertMessageType; message: string } | null>(null);
  hidePassword = signal(true);
  /** Ajustes sociales (flags + client IDs) desde el API. */
  social = signal<SocialUiConfig | null>(null);
  private readonly scriptLoads = new Map<string, Promise<void>>();

  private readonly route = inject(ActivatedRoute);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  /**
   * Lee `?returnUrl=` del query (lo setea `authGuard` cuando rebota a /login).
   * Si no hay returnUrl válido, va al panel `/admin` (la raíz es el sitio
   * público); `/login` se descarta para no meter al usuario en un bucle.
   */
  private resolveRedirect(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!raw) return '/admin';
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) return '/admin';
    return raw;
  }

  private clearFeedback(): void {
    this.loginFeedback.set(null);
  }

  private setFeedback(message: string, type: AlertMessageType = 'error'): void {
    this.loginFeedback.set({ message, type });
  }

  /** 403 social: mensaje de alta pendiente → warning (amarillo); resto → error. */
  private socialForbiddenFeedbackType(detail: string): AlertMessageType {
    const lower = detail.toLowerCase();
    return LoginComponent.SOCIAL_PENDING_MARKERS.some(m => lower.includes(m.toLowerCase()))
      ? 'warning'
      : 'error';
  }

  ngOnDestroy(): void {
    this.cancelGooglePrompt();
  }

  /** Cierra One Tap / estado GIS para no dejar iframes ni mensajes en segundo plano. */
  private cancelGooglePrompt(): void {
    const w = window as unknown as {
      google?: { accounts: { id: { cancel: () => void } } };
    };
    try {
      w.google?.accounts?.id?.cancel();
    } catch {
      /* ignore */
    }
  }

  ngOnInit(): void {
    this.uiSettings.fetchUiSettings().subscribe(s => {
      this.social.set(s?.social ?? null);
      // Esperar al render de @if (hasSocial) para medir ancho del host de GIS.
      setTimeout(() => {
        if (s?.social?.google && s.social.google_client_id) {
          this.initGoogleButton(s.social.google_client_id!);
        }
      }, 120);
    });
  }

  hasSocial(): boolean {
    const x = this.social();
    if (!x) return false;
    return (
      (x.google && !!x.google_client_id) ||
      (x.apple && !!x.apple_client_id) ||
      (x.microsoft && !!x.microsoft_client_id)
    );
  }

  showGoogle(): boolean {
    const x = this.social();
    return !!(x?.google && x.google_client_id);
  }

  showApple(): boolean {
    const x = this.social();
    return !!(x?.apple && x.apple_client_id);
  }

  showMicrosoft(): boolean {
    const x = this.social();
    return !!(x?.microsoft && x.microsoft_client_id);
  }

  private loadScriptOnce(src: string): Promise<void> {
    if (this.scriptLoads.has(src)) {
      return this.scriptLoads.get(src)!;
    }
    const p = new Promise<void>((res, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      s.onload = () => res();
      s.onerror = () => reject(new Error('Script load error'));
      document.head.appendChild(s);
    });
    this.scriptLoads.set(src, p);
    return p;
  }

  private initGoogleButton(clientId: string): void {
    const el = this.googleButtonHost?.nativeElement;
    if (!el) return;
    const lang = this.transloco.getActiveLang();
    const locale = lang?.startsWith('es') ? 'es' : 'en';

    this.loadScriptOnce('https://accounts.google.com/gsi/client')
      .then(() => {
        const w = window as unknown as { google?: { accounts: { id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (node: HTMLElement, opts: Record<string, unknown>) => void;
        } } } };
        if (!w.google) return;

        el.innerHTML = '';

        const wrap = el.parentElement as HTMLElement | null;
        const measured = Math.floor(wrap?.clientWidth ?? el.offsetWidth ?? 320);
        const widthPx = Math.min(400, Math.max(260, measured));

        // use_fedcm_for_button: false (valor por defecto) — evita el flujo FedCM del botón;
        // así se reduce ruido COOP/postMessage en Chrome con respecto al UX clásico por iframe.
        w.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: { credential: string }) => this.onGoogleCredential(resp.credential),
          auto_select: false,
          locale,
          use_fedcm_for_button: false,
        });

        // Outline (blanco). rectangular = esquinas ligeramente redondeadas en GIS; rematamos con SCSS en el iframe.
        w.google.accounts.id.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: widthPx,
        });
      })
      .catch(() => {
        this.setFeedback(this.transloco.translate('login.errorNetwork'));
      });
  }

  private onGoogleCredential(credential: string): void {
    this.loading.set(true);
    this.clearFeedback();
    this.auth.finishSocialSession('social/google', { id_token: credential }).subscribe({
      next: () => {
        this.cancelGooglePrompt();
        this.loading.set(false);
        this.router.navigateByUrl(this.resolveRedirect());
      },
      error: (err: unknown) =>
        this.onSocialError(err, () => {
          this.loading.set(false);
        }),
    });
  }

  async onAppleClick(): Promise<void> {
    const id = this.social()?.apple_client_id;
    if (!id) return;
    this.clearFeedback();
    this.appleLoading.set(true);
    try {
      await this.loadScriptOnce(
        'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
      );
      const w = window as unknown as {
        AppleID?: {
          auth: {
            init: (cfg: Record<string, unknown>) => void;
            signIn: () => Promise<{
              detail: { authorization?: { id_token?: string }; user?: unknown };
            }>;
          };
        };
      };
      if (!w.AppleID) {
        throw new Error('AppleID missing');
      }
      w.AppleID.auth.init({
        clientId: id,
        scope: 'name email',
        redirectURI: window.location.origin,
        usePopup: true,
      });
      const res = await w.AppleID.auth.signIn();
      const idToken = res?.detail?.authorization?.id_token;
      const u = res?.detail?.user;
      if (!idToken) {
        this.appleLoading.set(false);
        return;
      }
      this.auth.finishSocialSession('social/apple', { id_token: idToken, user: u }).subscribe({
        next: () => {
          this.appleLoading.set(false);
          this.router.navigateByUrl(this.resolveRedirect());
        },
        error: (err: unknown) =>
          this.onSocialError(err, () => {
            this.appleLoading.set(false);
          }),
      });
    } catch (err) {
      this.onSocialError(err, () => {
        this.appleLoading.set(false);
      });
    }
  }

  /**
   * Microsoft Entra ID vía MSAL Browser (popup). Mismo contrato que Apple/Google:
   * obtenemos el ``id_token`` en el cliente y lo canjeamos en el backend
   * (`/api/auth/social/microsoft/`) por las cookies JWT. MSAL se carga bajo
   * demanda por CDN (igual que GIS/AppleID) para no inflar el bundle.
   *
   * La authority usa el tenant que expone el backend en UiSettings
   * (`microsoft_tenant_id`, por defecto `common`), de modo que la config OAuth
   * vive en el backend y el front solo la consume.
   */
  async onMicrosoftClick(): Promise<void> {
    const cfg = this.social();
    const clientId = cfg?.microsoft_client_id;
    if (!clientId) return;
    const tenant = (cfg?.microsoft_tenant_id || 'common').trim();
    this.clearFeedback();
    this.microsoftLoading.set(true);
    try {
      await this.loadScriptOnce(
        'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js',
      );
      const w = window as unknown as {
        msal?: {
          PublicClientApplication: new (cfg: Record<string, unknown>) => {
            initialize: () => Promise<void>;
            loginPopup: (req: Record<string, unknown>) => Promise<{ idToken?: string }>;
          };
        };
      };
      if (!w.msal) {
        throw new Error('MSAL missing');
      }
      const pca = new w.msal.PublicClientApplication({
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${tenant}`,
          redirectUri: window.location.origin,
        },
        cache: { cacheLocation: 'sessionStorage' },
      });
      await pca.initialize();
      const result = await pca.loginPopup({
        scopes: ['openid', 'profile', 'email'],
        prompt: 'select_account',
      });
      const idToken = result?.idToken;
      if (!idToken) {
        this.microsoftLoading.set(false);
        return;
      }
      this.auth.finishSocialSession('social/microsoft', { id_token: idToken }).subscribe({
        next: () => {
          this.microsoftLoading.set(false);
          this.router.navigateByUrl(this.resolveRedirect());
        },
        error: (err: unknown) =>
          this.onSocialError(err, () => {
            this.microsoftLoading.set(false);
          }),
      });
    } catch (err) {
      // El usuario que cierra el popup MSAL lanza un error de interacción
      // cancelada; no es un fallo real → silencioso (solo apaga el loading).
      if (this.isUserCancelledPopup(err)) {
        this.microsoftLoading.set(false);
        return;
      }
      this.onSocialError(err, () => {
        this.microsoftLoading.set(false);
      });
    }
  }

  /** MSAL/popup: distingue "el usuario cerró el popup" de un error real. */
  private isUserCancelledPopup(err: unknown): boolean {
    const code =
      err && typeof err === 'object' && 'errorCode' in err
        ? String((err as { errorCode: unknown }).errorCode)
        : '';
    return code === 'user_cancelled' || code === 'popup_window_error' || code === 'interaction_in_progress';
  }

  private onSocialError(err: unknown, done: () => void): void {
    done();
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      const detail =
        body && typeof body === 'object' && 'detail' in body
          ? String((body as { detail: string }).detail)
          : typeof body === 'string'
            ? body
            : null;
      if (err.status === 401 || err.status === 400 || err.status === 403) {
        const msg =
          detail && String(detail).trim()
            ? String(detail)
            : this.transloco.translate('login.errorInvalidCredentials');
        const kind =
          err.status === 403 && Boolean(detail?.trim())
            ? this.socialForbiddenFeedbackType(msg)
            : 'error';
        this.setFeedback(msg, kind);
      } else if (err.status === 0) {
        this.setFeedback(this.transloco.translate('login.errorNetwork'));
      } else {
        this.setFeedback(
          detail && String(detail).trim()
            ? String(detail)
            : this.transloco.translate('login.errorGeneric'),
        );
      }
      return;
    }
    this.setFeedback(this.transloco.translate('login.errorGeneric'));
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.clearFeedback();

    const { username, password } = this.form.value;
    this.auth.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(this.resolveRedirect());
      },
      error: err => {
        this.loading.set(false);
        const detail =
          typeof err?.error === 'object' && err.error !== null
            ? (err.error.detail ?? err.error.non_field_errors?.[0])
            : typeof err?.error === 'string'
              ? err.error
              : null;
        if (err.status === 401) {
          this.setFeedback(
            detail && String(detail).trim()
              ? String(detail)
              : this.transloco.translate('login.errorInvalidCredentials'),
          );
        } else if (err.status === 0) {
          this.setFeedback(this.transloco.translate('login.errorNetwork'));
        } else {
          this.setFeedback(
            detail && String(detail).trim()
              ? String(detail)
              : this.transloco.translate('login.errorGeneric'),
          );
        }
      },
    });
  }
}
