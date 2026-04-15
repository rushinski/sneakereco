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
  csrfToken?: string | null;
  tenantId?: string;
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
  { accessToken, body, csrfToken, tenantId, headers, ...init }: RequestOptions = {},
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
      idToken: string;
      expiresIn: number;
      // refreshToken is no longer returned in the body — it is set as an
      // httpOnly cookie by the API so JavaScript cannot read it.
    }
  | { type: 'mfa_required'; session: string; usePlatformPool?: true }
  | { type: 'mfa_setup'; session: string; email: string; usePlatformPool?: true };

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

  signIn: (
    input: { email: string; password: string; clientType: 'admin'; tenantId: string },
    csrfToken: string,
  ) => {
    const { tenantId, ...body } = input;
    return request<AdminSignInResult>('/auth/sign-in', {
      body,
      csrfToken,
      method: 'POST',
      tenantId,
    });
  },

  refreshTenantAdmin: (tenantId: string, csrfToken: string) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/refresh', {
      body: { clientType: 'admin' },
      csrfToken,
      method: 'POST',
      tenantId,
    }),

  refreshPlatformAdmin: (csrfToken: string) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/platform/auth/refresh', {
      csrfToken,
      method: 'POST',
    }),

  mfaChallenge: (
    input: { email: string; mfaCode: string; session: string; tenantId: string; clientType?: 'customer' | 'admin' },
    csrfToken: string,
  ) => {
    const { tenantId, ...body } = input;
    return request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/mfa/challenge', {
      body,
      csrfToken,
      method: 'POST',
      tenantId,
    });
  },

  // Platform pool MFA — used when super admin authenticates via tenant login (platform pool fallback).
  mfaChallengePlatform: (
    input: { email: string; mfaCode: string; session: string },
    csrfToken: string,
  ) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/platform/auth/mfa/challenge', {
      body: input,
      csrfToken,
      method: 'POST',
    }),

  mfaSetupAssociatePlatform: (session: string) =>
    request<{ secretCode: string; session: string }>('/platform/auth/mfa/setup/associate', {
      body: { session },
      method: 'POST',
    }),

  mfaSetupCompletePlatform: (
    input: { email: string; session: string; mfaCode: string },
    csrfToken: string,
  ) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/platform/auth/mfa/setup/complete', {
      body: input,
      csrfToken,
      method: 'POST',
    }),

  mfaSetupAssociate: (session: string, tenantId: string) =>
    request<{ secretCode: string; session: string }>('/auth/mfa/setup/associate', {
      body: { session },
      method: 'POST',
      tenantId,
    }),

  mfaSetupComplete: (
    input: { email: string; session: string; mfaCode: string; tenantId: string },
    csrfToken: string,
  ) => {
    const { tenantId, ...body } = input;
    return request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/mfa/setup/complete', {
      body,
      csrfToken,
      method: 'POST',
      tenantId,
    });
  },

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
