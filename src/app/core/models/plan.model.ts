/**
 * Subscription plan (membership) — mirror of the backend `Plan` model
 * (subscriptions app). Display fields drive the public membership cards; the
 * Flow fields are pushed to Flow.cl on save by the backend.
 */
export interface Plan {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  flow_plan_id: string;

  // Pricing / billing (sent to Flow)
  amount: number | null;
  currency: string;
  interval: number; // 1 daily · 2 weekly · 3 monthly · 4 yearly
  interval_count: number;
  trial_period_days: number;
  days_until_due: number;
  periods_number: number | null;
  charges_retries_number: number;

  // Membership presentation
  tagline: string;
  description: string;
  cadence: string;
  recorded: boolean;
  features: string[];
  icon: string;
  featured: boolean;
  is_public: boolean;
  order: number;
  is_active: boolean;

  // Flow sync state (read-only)
  flow_synced_at: string | null;
  flow_status: number | null;
  last_sync_error: string;
  created: string;
  modified: string;
}
