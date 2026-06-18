import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { APP_CONFIG } from '../config/app-config.token';
import type { PaginatedResponse } from '../models/api.model';
import type { InboxNotification } from '../models/inbox-notification.model';
import { AuthService } from './auth.service';

/**
 * Inbox de notificaciones (panel campana del topbar). Polling configurable
 * vía `environment.inboxPollMs` (default 3 min); `start()` se llama tras
 * login, `stop()` al logout.
 *
 * Distinto de `NotificationService` (toasts globales del shell). Aquí se
 * habla con `/api/v1/notifications/`.
 */
@Injectable({ providedIn: 'root' })
export class InboxService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly config = inject(APP_CONFIG);
  private readonly apiUrl = this.config.apiUrl;

  readonly items = signal<InboxNotification[]>([]);
  readonly loading = signal(false);
  readonly unreadCount = computed(
    () => this.items().filter((n) => n.read_at === null).length,
  );

  private pollHandle: number | null = null;

  /**
   * Arranca polling. Idempotente: si ya está corriendo, no duplica.
   * Refresca inmediatamente y luego cada `pollMs` (default = `inboxPollMs` del environment).
   */
  start(pollMs: number = this.config.inboxPollMs): void {
    if (this.pollHandle !== null) return;
    if (!this.auth.hasToken()) return;
    this.refresh();
    this.pollHandle = window.setInterval(() => {
      if (!this.auth.hasToken()) {
        this.stop();
        return;
      }
      this.refresh();
    }, pollMs);
  }

  /** Detiene polling y limpia estado. Llamar en logout. */
  stop(): void {
    if (this.pollHandle !== null) {
      window.clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    this.items.set([]);
    this.loading.set(false);
  }

  /** Fetch manual (también lo dispara el intervalo). */
  refresh(): void {
    if (!this.auth.hasToken()) return;
    this.loading.set(true);
    this.http
      .get<PaginatedResponse<InboxNotification>>(`${this.apiUrl}/notifications/`)
      .subscribe({
        next: (res) => {
          this.items.set(res.results ?? []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /** Marca una notificación como leída (optimista + reconcilia con API). */
  markRead(id: number): void {
    const now = new Date().toISOString();
    this.items.update((arr) =>
      arr.map((n) => (n.id === id && n.read_at === null ? { ...n, read_at: now } : n)),
    );
    this.http
      .post<InboxNotification>(`${this.apiUrl}/notifications/${id}/read/`, {})
      .subscribe({ error: () => this.refresh() });
  }

  /** Marca todas como leídas (optimista + reconcilia). */
  markAllRead(): void {
    const now = new Date().toISOString();
    this.items.update((arr) =>
      arr.map((n) => (n.read_at === null ? { ...n, read_at: now } : n)),
    );
    this.http
      .post<{ updated: number }>(`${this.apiUrl}/notifications/mark-all-read/`, {})
      .subscribe({ error: () => this.refresh() });
  }
}
