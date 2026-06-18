/**
 * Notificación dirigida al usuario autenticado. Distinto de los toasts
 * (`NotificationService` del shell) — este modelo viene de
 * `GET /api/v1/notifications/` y se muestra en el panel del topbar.
 */
export type InboxNotificationKind = 'system' | 'operational' | 'critical';

export interface InboxNotification {
  id: number;
  kind: InboxNotificationKind;
  title: string;
  body: string;
  link: string;
  /** ISO datetime, o `null` si aún no leída. */
  read_at: string | null;
  created: string;
  modified: string;
}
