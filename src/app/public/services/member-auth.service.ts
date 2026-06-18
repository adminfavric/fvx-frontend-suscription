import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MemberContentItem {
  id: number;
  title: string;
  kind: 'video' | 'audio' | 'pdf' | 'text' | 'image' | 'zoom' | 'link';
  text: string;
  file_url: string;
  external_url: string;
  image_url: string;
  created: string;
}

export interface MemberContentResponse {
  email: string;
  plans: { slug: string; name: string }[];
  content: MemberContentItem[];
}

export interface MemberSubscription {
  subscription_id: string;
  plan_name: string;
  plan_slug: string;
  amount: number | null;
  interval: number;
  status: number | null;
  period_end: string | null;
  next_invoice_date: string | null;
  cancel_at_period_end: number | null;
  card: { type: string | null; last4: string | null } | null;
}

const TOKEN_KEY = 'fvx_member_token';
const EMAIL_KEY = 'fvx_member_email';

/**
 * Sesión de miembro (suscriptor) sin contraseña: pide un código por email,
 * lo verifica y guarda un token (localStorage) que se envía como Bearer a los
 * endpoints de miembro. Separado del auth del admin (cookies JWT).
 */
@Injectable({ providedIn: 'root' })
export class MemberAuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/public/member`;

  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly email = signal<string | null>(localStorage.getItem(EMAIL_KEY));
  readonly isLoggedIn = computed(() => !!this._token());

  async requestCode(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.base}/request-code/`, { email }));
  }

  async verifyCode(email: string, code: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ token: string; email: string }>(`${this.base}/verify-code/`, { email, code }),
    );
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(EMAIL_KEY, res.email);
    this._token.set(res.token);
    this.email.set(res.email);
  }

  private authHeaders() {
    return { Authorization: `Bearer ${this._token() ?? ''}` };
  }

  async getContent(): Promise<MemberContentResponse> {
    return firstValueFrom(
      this.http.get<MemberContentResponse>(`${this.base}/content/`, { headers: this.authHeaders() }),
    );
  }

  async getAccount(): Promise<{ email: string; subscriptions: MemberSubscription[] }> {
    return firstValueFrom(
      this.http.get<{ email: string; subscriptions: MemberSubscription[] }>(`${this.base}/account/`, {
        headers: this.authHeaders(),
      }),
    );
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${this.base}/subscription/cancel/`,
        { subscription_id: subscriptionId },
        { headers: this.authHeaders() },
      ),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    this._token.set(null);
    this.email.set(null);
  }
}
