/**
 * Web app API client.
 * Mirrors the same request() pattern as the platform client.
 */

export interface ApiEnvelope<T> {
  data: T;
  meta: { requestId?: string; timestamp: string };
}

export interface ApiErrorPayload {
  error: { code: string; message: string; details?: unknown };
  meta?: { requestId?: string; timestamp: string };
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type AppSurface = 'customer' | 'store-admin';

function normalizeHost(host: string): string {
  return host.split(':')[0]?.toLowerCase() ?? '';
}

function buildSurfaceCookieNames(surface: AppSurface, host: string) {
  const suffix = `${surface}:${normalizeHost(host)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return {
    csrf: `__Secure-sneakereco-csrf-${suffix}`,
  };
}

// ---------------------------------------------------------------------------
// In-memory access token store (never persisted to localStorage/sessionStorage)
// ---------------------------------------------------------------------------
let _accessToken: string | null = null;
export function setAccessToken(token: string): void {
  _accessToken = token;
}
export function getAccessToken(): string | null {
  return _accessToken;
}
export function clearAccessToken(): void {
  _accessToken = null;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  accessToken?: string;
  appSurface?: AppSurface;
  body?: unknown;
  clientContext?: 'admin';
  csrfToken?: string | null;
  tenantId?: string;
}

export function readCsrfTokenCookie(appSurface: AppSurface = 'customer'): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${buildSurfaceCookieNames(appSurface, window.location.host).csrf}=`;
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function isSuccessEnvelope<T>(
  payload: ApiEnvelope<T> | ApiErrorPayload | null,
): payload is ApiEnvelope<T> {
  return Boolean(payload && 'data' in payload && !('error' in payload));
}

function isErrorEnvelope(
  payload: ApiEnvelope<unknown> | ApiErrorPayload | null,
): payload is ApiErrorPayload {
  return Boolean(payload && 'error' in payload);
}

async function request<T>(
  path: string,
  {
    accessToken,
    appSurface,
    body,
    clientContext,
    csrfToken,
    tenantId,
    headers,
    ...init
  }: RequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (csrfToken) {
    requestHeaders.set('X-CSRF-Token', csrfToken);
  }

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  if (appSurface) {
    requestHeaders.set('X-App-Surface', appSurface);
  }

  if (tenantId) {
    requestHeaders.set('X-Tenant-ID', tenantId);
  }

  if (clientContext) {
    requestHeaders.set('X-Client-Context', clientContext);
  }

  const response = await fetch(`${API_BASE_URL}/v1${path}`, {
    ...init,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    credentials: 'include',
    headers: requestHeaders,
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | ApiErrorPayload
    | null;

  if (!response.ok || !isSuccessEnvelope(payload)) {
    const message = (isErrorEnvelope(payload) ? payload.error.message : null) ?? 'Request failed';
    const code = isErrorEnvelope(payload) ? payload.error.code : undefined;
    const details = isErrorEnvelope(payload) ? payload.error.details : undefined;
    throw new ApiClientError(message, response.status, code, details);
  }

  return payload.data;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TenantTheme {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorSurface: string;
  colorText: string;
  colorTextMuted: string;
  colorBorder: string;
  colorError: string;
  colorSuccess: string;
  fontHeading: string;
  fontBody: string;
  logoUrl: string | null;
  logoWidth: number;
  faviconUrl: string | null;
  headerVariant: string;
  heroVariant: string;
  productCardVariant: string;
  footerVariant: string;
  filterVariant: string;
  maxContentWidth: string;
  borderRadius: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  heroCtaText: string | null;
  heroCtaLink: string | null;
  showAboutPage: boolean;
  showContactPage: boolean;
  authVariant: string;
  authHeadline: string | null;
  authDescription: string | null;
}

export interface UpdateThemePayload {
  colorPrimary?: string;
  colorSecondary?: string;
  colorAccent?: string;
  colorBackground?: string;
  colorSurface?: string;
  colorText?: string;
  colorTextMuted?: string;
  colorBorder?: string;
  fontHeading?: string;
  fontBody?: string;
  borderRadius?: string;
  authVariant?: 'simple' | 'bold';
  authHeadline?: string | null;
  authDescription?: string | null;
}

export interface TenantConfig {
  tenant: {
    id: string;
    name: string;
    slug: string;
    businessName: string | null;
    status: string;
  };
  theme: TenantTheme;
}

export interface InviteSummary {
  businessName: string | null;
  email: string | null;
  fullName: string | null;
  tenantId: string;
}

export interface CompleteOnboardingResult {
  adminRedirectUrl: string;
  email: string;
  secretCode: string;
  session: string;
}

export type AdminSignInResult =
  | {
      type: 'tokens';
      accessToken: string;
      csrfToken: string;
      idToken: string;
      expiresIn: number;
    }
  | { type: 'mfa_required'; session: string }
  | { type: 'mfa_setup'; session: string; email: string };

export type CustomerSignInResult =
  | { type: 'tokens'; accessToken: string; csrfToken: string; idToken: string; expiresIn: number }
  | { type: 'mfa_required'; session: string }
  | { type: 'mfa_setup'; session: string; email: string };

export type OtpRequestResult = { type: 'otp_sent'; session: string };

export type OtpVerifyResult =
  | { type: 'tokens'; accessToken: string; csrfToken: string; idToken: string; expiresIn: number }
  | { type: 'mfa_required'; session: string };

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const apiClient = {
  getCsrfToken: (appSurface: AppSurface = 'customer') =>
    request<{ token: string }>('/csrf-token', { appSurface, method: 'GET' }),

  getTenantConfig: (input: string | { slug?: string; host?: string }) => {
    const query =
      typeof input === 'string'
        ? `slug=${encodeURIComponent(input)}`
        : input.host
          ? `host=${encodeURIComponent(input.host)}`
          : `slug=${encodeURIComponent(input.slug ?? '')}`;

    return request<TenantConfig>(`/platform/config?${query}`, { method: 'GET' });
  },

  validateInvite: (token: string) =>
    request<InviteSummary>(`/onboarding/invite/${token}`, { method: 'GET' }),

  completeOnboarding: (input: { password: string; token: string }, csrfToken: string) =>
    request<CompleteOnboardingResult>('/onboarding/complete', {
      body: input,
      csrfToken,
      method: 'POST',
    }),

  verifyMfa: (
    input: { deviceName?: string; mfaCode: string },
    csrfToken: string,
    accessToken: string,
  ) =>
    request<{ status?: string }>('/auth/mfa/verify', {
      accessToken,
      body: input,
      csrfToken,
      method: 'POST',
    }),

  loginStoreAdmin: (input: { email: string; password: string }, csrfToken: string) =>
    request<AdminSignInResult>('/auth/login', {
      appSurface: 'store-admin',
      body: input,
      csrfToken,
      method: 'POST',
    }),

  refreshStoreAdmin: (csrfToken: string) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/refresh', {
      appSurface: 'store-admin',
      csrfToken,
      method: 'POST',
    }),

  completeStoreAdminMfaChallenge: (
    input: { email: string; mfaCode: string; session: string },
    csrfToken: string,
  ) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/mfa/challenge', {
      appSurface: 'store-admin',
      body: input,
      csrfToken,
      method: 'POST',
    }),

  beginMfaSetup: (session: string) =>
    request<{ secretCode: string; session: string }>('/auth/mfa/setup/associate', {
      body: { session },
      method: 'POST',
    }),

  completeStoreAdminMfaSetup: (
    input: { email: string; session: string; mfaCode: string },
    csrfToken: string,
  ) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>(
      '/auth/mfa/setup/complete',
      {
        appSurface: 'store-admin',
        body: input,
        csrfToken,
        method: 'POST',
      },
    ),

  forgotStoreAdminPassword: (input: { email: string }) =>
    request<void>('/auth/forgot-password', {
      appSurface: 'store-admin',
      body: input,
      method: 'POST',
    }),

  resetStoreAdminPassword: (input: { email: string; code: string; newPassword: string }) =>
    request<void>('/auth/reset-password', {
      appSurface: 'store-admin',
      body: input,
      method: 'POST',
    }),

  logoutStoreAdmin: (csrfToken: string, accessToken: string) =>
    request<void>('/auth/logout', {
      accessToken,
      appSurface: 'store-admin',
      csrfToken,
      method: 'POST',
    }),

  loginAdmin: (input: { email: string; password: string }, csrfToken: string) =>
    apiClient.loginStoreAdmin(input, csrfToken),

  refreshAdmin: (_tenantId: string, csrfToken: string) => apiClient.refreshStoreAdmin(csrfToken),

  completeAdminMfaChallenge: (
    input: { email: string; mfaCode: string; session: string; tenantId?: string },
    csrfToken: string,
  ) =>
    apiClient.completeStoreAdminMfaChallenge(
      { email: input.email, mfaCode: input.mfaCode, session: input.session },
      csrfToken,
    ),

  completeMfaSetup: (
    input: { email: string; session: string; mfaCode: string; tenantId?: string },
    csrfToken: string,
  ) =>
    apiClient.completeStoreAdminMfaSetup(
      { email: input.email, session: input.session, mfaCode: input.mfaCode },
      csrfToken,
    ),

  // ---------------------------------------------------------------------------
  // Customer auth
  // ---------------------------------------------------------------------------

  loginCustomer: (input: { email: string; password: string }) =>
    request<CustomerSignInResult>('/auth/login', {
      appSurface: 'customer',
      body: input,
      method: 'POST',
    }),

  registerCustomer: (input: { email: string; password: string }) =>
    request<{ userSub: string; userConfirmed: boolean }>('/auth/register', {
      appSurface: 'customer',
      body: input,
      method: 'POST',
    }),

  confirmCustomerEmail: (input: { email: string; code: string }) =>
    request<{ success: true }>('/auth/confirm', {
      appSurface: 'customer',
      body: input,
      method: 'POST',
    }),

  resendCustomerConfirmation: (input: { email: string }) =>
    request<{ success: true }>('/auth/confirm/resend', {
      appSurface: 'customer',
      body: input,
      method: 'POST',
    }),

  requestOtp: (input: { email: string }) =>
    request<OtpRequestResult>('/auth/otp/request', {
      appSurface: 'customer',
      body: input,
      method: 'POST',
    }),

  verifyOtp: (input: { email: string; session: string; code: string }) =>
    request<OtpVerifyResult>('/auth/otp/verify', {
      appSurface: 'customer',
      body: input,
      method: 'POST',
    }),

  forgotCustomerPassword: (input: { email: string }) =>
    request<void>('/auth/forgot-password', {
      appSurface: 'customer',
      body: input,
      method: 'POST',
    }),

  resetCustomerPassword: (input: { email: string; code: string; newPassword: string }) =>
    request<void>('/auth/reset-password', {
      appSurface: 'customer',
      body: input,
      method: 'POST',
    }),

  completeMfaChallenge: (
    input: { email: string; session: string; mfaCode: string },
    csrfToken: string,
  ) =>
    request<CustomerSignInResult>('/auth/mfa/challenge', {
      appSurface: 'customer',
      body: input,
      csrfToken,
      method: 'POST',
    }),

  refreshCustomer: (csrfToken: string) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/refresh', {
      appSurface: 'customer',
      csrfToken,
      method: 'POST',
    }),

  logoutCustomer: (csrfToken: string, accessToken: string) =>
    request<void>('/auth/logout', {
      accessToken,
      appSurface: 'customer',
      csrfToken,
      method: 'POST',
    }),

  // ---------------------------------------------------------------------------

  updateTheme: (
    payload: UpdateThemePayload,
    tenantId: string,
    accessToken: string,
    csrfToken: string,
  ) =>
    request<{ success: boolean }>('/tenant/theme', {
      body: payload,
      csrfToken,
      method: 'PATCH',
      tenantId,
      accessToken,
      appSurface: 'store-admin',
    }),
};
