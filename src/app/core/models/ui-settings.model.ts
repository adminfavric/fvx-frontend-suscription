/**
 * Respuesta esperada de `GET {apiUrl}/settings/ui/`
 * (modelo Django `UiSettings` — se implementará en backend).
 */
export interface SocialUiConfig {
  google: boolean;
  apple: boolean;
  microsoft: boolean;
  google_client_id: string | null;
  apple_client_id: string | null;
  microsoft_client_id: string | null;
  /** Tenant para la authority de MSAL ('common' por defecto). */
  microsoft_tenant_id?: string | null;
}

export interface UiSettingsResponse {
  theme_key?: string;
  app_title?: string;
  logo_url?: string | null;
  /** Solo claves allowlist en backend; el front aplica con `setProperty` controlado. */
  theme_overrides?: Record<string, string>;
  /** Origen de verdad: activación de proveedores sociales (flags en backend) + client IDs públicos. */
  social?: SocialUiConfig;
}
