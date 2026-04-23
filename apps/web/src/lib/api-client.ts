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
const CSRF_COOKIE_NAME = '__Secure-sneakereco-csrf';

// ---------------------------------------------------------------------------
// In-memory access token store (never persisted to localStorage/sessionStorage)
// ---------------------------------------------------------------------------
let _accessToken: string | null = null;
export function setAccessToken(token: string): void { _accessToken = token; }
export function getAccessToken(): string | null { return _accessToken; }
export function clearAccessToken(): void { _accessToken = null; }

interface RequestOptions extends Omit<RequestInit, 'body'> {
  accessToken?: string;
  body?: unknown;
  clientContext?: 'admin';
  csrfToken?: string | null;
  tenantId?: string;
}

export function readCsrfTokenCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const prefix = `${CSRF_COOKIE_NAME}=`;
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix));

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
  { accessToken, body, clientContext, csrfToken, tenantId, headers, ...init }: RequestOptions = {},
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
    const message =
      (isErrorEnvelope(payload) ? payload.error.message : null) ?? 'Request failed';
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
  accessToken: string;
  adminRedirectUrl: string;
  expiresIn: number;
  idToken: string;
  refreshToken: string;
  secretCode: string;
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
  getCsrfToken: () => request<{ token: string }>('/csrf-token', { method: 'GET' }),

  getTenantConfig: (slugOrId: string) =>
    request<TenantConfig>(`/platform/config?slug=${encodeURIComponent(slugOrId)}`, {
      method: 'GET',
    }),

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

  loginAdmin: (
    input: { email: string; password: string; tenantId: string },
    csrfToken: string,
  ) => {
    const { tenantId, ...body } = input;
    return request<AdminSignInResult>('/auth/login', {
      body,
      clientContext: 'admin',
      csrfToken,
      method: 'POST',
      tenantId,
    });
  },

  refreshAdmin: (tenantId: string, csrfToken: string) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/refresh', {
      clientContext: 'admin',
      csrfToken,
      method: 'POST',
      tenantId,
    }),

  completeAdminMfaChallenge: (
    input: { email: string; mfaCode: string; session: string; tenantId: string },
    csrfToken: string,
  ) => {
    const { tenantId, ...body } = input;
    return request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/mfa/challenge', {
      body,
      clientContext: 'admin',
      csrfToken,
      method: 'POST',
      tenantId,
    });
  },

  beginMfaSetup: (session: string) =>
    request<{ secretCode: string; session: string }>('/auth/mfa/setup/associate', {
      body: { session },
      method: 'POST',
    }),

  completeMfaSetup: (
    input: { email: string; session: string; mfaCode: string; tenantId: string },
    csrfToken: string,
  ) => {
    const { tenantId, ...body } = input;
    return request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/mfa/setup/complete', {
      body,
      clientContext: 'admin',
      csrfToken,
      method: 'POST',
      tenantId,
    });
  },

  // ---------------------------------------------------------------------------
  // Customer auth
  // ---------------------------------------------------------------------------

  loginCustomer: (input: { email: string; password: string }) =>
    request<CustomerSignInResult>('/auth/login', { body: input, method: 'POST' }),

  registerCustomer: (input: { email: string; password: string }) =>
    request<{ userSub: string; userConfirmed: boolean }>('/auth/register', {
      body: input,
      method: 'POST',
    }),

  confirmCustomerEmail: (input: { email: string; code: string }) =>
    request<{ success: true }>('/auth/confirm', { body: input, method: 'POST' }),

  resendCustomerConfirmation: (input: { email: string }) =>
    request<{ success: true }>('/auth/confirm/resend', { body: input, method: 'POST' }),

  requestOtp: (input: { email: string }) =>
    request<OtpRequestResult>('/auth/otp/request', { body: input, method: 'POST' }),

  verifyOtp: (input: { email: string; session: string; code: string }) =>
    request<OtpVerifyResult>('/auth/otp/verify', { body: input, method: 'POST' }),

  forgotCustomerPassword: (input: { email: string }) =>
    request<void>('/auth/forgot-password', { body: input, method: 'POST' }),

  resetCustomerPassword: (input: { email: string; code: string; newPassword: string }) =>
    request<void>('/auth/reset-password', { body: input, method: 'POST' }),

  completeMfaChallenge: (input: { email: string; session: string; mfaCode: string }, csrfToken: string) =>
    request<CustomerSignInResult>('/auth/mfa/challenge', {
      body: input,
      csrfToken,
      method: 'POST',
    }),

  refreshCustomer: (csrfToken: string) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/refresh', {
      csrfToken,
      method: 'POST',
    }),

  logoutCustomer: (csrfToken: string, accessToken: string) =>
    request<void>('/auth/logout', { accessToken, csrfToken, method: 'POST' }),

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
    }),
};
