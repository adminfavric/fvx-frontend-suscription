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
  /** Sesión Zoom: inicio/fin de la franja en vivo (ISO) y banderas calculadas. */
  live_start?: string | null;
  live_end?: string | null;
  /** ``true`` si la sala se puede abrir ahora (dentro de la franja). */
  live_open?: boolean;
  /** ``true`` si la sesión tiene una reunión Zoom configurada en el servidor. */
  has_zoom?: boolean;
  /** Momento exacto (ISO) en que la sala abre (incluye el margen previo) y cierra. */
  opens_at?: string | null;
  closes_at?: string | null;
}

/** Datos para unirse a la sesión Zoom embebida (firma de vida corta del SDK).
 * El link nunca viaja: solo esta firma, emitida por el backend al miembro
 * habilitado y dentro de la franja horaria. */
export interface ZoomJoinInfo {
  signature: string;
  sdkKey: string;
  meetingNumber: string;
  passcode: string;
  userName: string;
  userEmail: string;
  topic: string;
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

  /** Pide la firma para unirse a la sesión Zoom embebida. El backend valida plan
   * activo + franja horaria; lanza 403/409/503 si no corresponde. */
  async getZoomSignature(contentId: number): Promise<ZoomJoinInfo> {
    return firstValueFrom(
      this.http.post<ZoomJoinInfo>(
        `${this.base}/content/${contentId}/zoom/`,
        {},
        { headers: this.authHeaders() },
      ),
    );
  }

  /** Latido que mantiene la presencia en la sala (candado de entrada única). */
  async zoomHeartbeat(contentId: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.base}/content/${contentId}/zoom/heartbeat/`, {}, { headers: this.authHeaders() }),
    );
  }

  /** Libera la presencia al salir de la sala (best-effort). */
  async zoomLeave(contentId: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.base}/content/${contentId}/zoom/leave/`, {}, { headers: this.authHeaders() }),
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
