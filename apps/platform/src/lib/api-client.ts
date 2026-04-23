/**
 * API response envelope for successful responses:
 * { data: T, meta: { requestId?, timestamp } }
 */
export interface ApiEnvelope<T> {
  data: T;
  meta: {
    requestId?: string;
    timestamp: string;
  };
}

/**
 * API response envelope for error responses:
 * { error: { code, message, details? }, meta: { requestId?, timestamp } }
 */
export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
  };
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
  body?: unknown;
  clientContext?: 'admin';
  csrfToken?: string | null;
  tenantId?: string;
}

export function readCsrfTokenCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const prefix = `${CSRF_COOKIE_NAME}=`;
  const cookie = document.cookie.split('; ').find((entry: string) => entry.startsWith(prefix));

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
    const message = extractErrorMessage(payload) ?? 'Request failed';
    const code = isErrorEnvelope(payload) ? payload.error.code : undefined;
    const details = isErrorEnvelope(payload) ? payload.error.details : undefined;
    throw new ApiClientError(message, response.status, code, details);
  }

  return payload.data;
}

function extractErrorMessage(
  payload: ApiEnvelope<unknown> | ApiErrorPayload | null,
): string | null {
  if (!payload || !isErrorEnvelope(payload)) return null;
  return payload.error.message;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RequestAccountInput {
  businessName: string;
  email: string;
  fullName: string;
  instagramHandle: string;
  phoneNumber: string;
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
      // refreshToken is no longer returned in the body — it is set as an
      // httpOnly cookie by the API so JavaScript cannot read it.
    }
  | { type: 'mfa_required'; session: string }
  | { type: 'mfa_setup'; session: string; email: string };

export interface MfaChallengeResult {
  accessToken: string;
  csrfToken: string;
  idToken: string;
  expiresIn: number;
  // refreshToken is no longer returned in the body — set as httpOnly cookie.
}

export interface RequestSummary {
  tenantId: string;
  businessName: string | null;
  requestedByName: string | null;
  requestedByEmail: string | null;
  instagramUrl: string | null;
  requestStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListRequestsParams {
  status?: 'pending' | 'approved' | 'rejected' | 'invited';
  page?: number;
  pageSize?: number;
}

export interface ListRequestsResult {
  items: RequestSummary[];
  total: number;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const apiClient = {
  // ---- Onboarding (public) ------------------------------------------------

  completeOnboarding: (input: { password: string; token: string }, csrfToken: string) =>
    request<CompleteOnboardingResult>('/onboarding/complete', {
      body: input,
      csrfToken,
      method: 'POST',
    }),

  getCsrfToken: () =>
    request<{ token: string }>('/csrf-token', {
      method: 'GET',
    }),

  requestAccount: (input: RequestAccountInput, csrfToken: string) =>
    request<{ submitted: boolean }>('/onboarding/request', {
      body: input,
      csrfToken,
      method: 'POST',
    }),

  validateInvite: (token: string) =>
    request<InviteSummary>(`/onboarding/invite/${token}`, {
      method: 'GET',
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

  // ---- Platform admin -----------------------------------------------------

  signInAdmin: (input: { email: string; password: string }, csrfToken: string) =>
    request<AdminSignInResult>('/auth/login', {
      body: input,
      csrfToken,
      method: 'POST',
    }),

  refreshAdmin: (csrfToken: string) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/refresh', {
      csrfToken,
      method: 'POST',
    }),

  mfaChallenge: (input: { email: string; mfaCode: string; session: string }, csrfToken: string) =>
    request<MfaChallengeResult>('/auth/mfa/challenge', {
      body: input,
      csrfToken,
      method: 'POST',
    }),

  mfaSetupAssociate: (session: string) =>
    request<{ secretCode: string; session: string }>('/auth/mfa/setup/associate', {
      body: { session },
      method: 'POST',
    }),

  mfaSetupComplete: (
    input: { email: string; session: string; mfaCode: string },
    csrfToken: string,
  ) =>
    request<MfaChallengeResult>('/auth/mfa/setup/complete', {
      body: input,
      csrfToken,
      method: 'POST',
    }),

  completeTenantAdminMfaSetup: (
    input: { email: string; session: string; mfaCode: string; tenantId: string },
    csrfToken: string,
  ) => {
    const { tenantId, ...body } = input;
    return request<MfaChallengeResult>('/auth/mfa/setup/complete', {
      body,
      clientContext: 'admin',
      csrfToken,
      method: 'POST',
      tenantId,
    });
  },

  listRequests: (params: ListRequestsParams, accessToken: string) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return request<ListRequestsResult>(`/platform/requests?${query.toString()}`, {
      accessToken,
      method: 'GET',
    });
  },

  approveRequest: (tenantId: string, csrfToken: string, accessToken: string) =>
    request<{ approved: boolean }>(`/platform/requests/${tenantId}/approve`, {
      accessToken,
      csrfToken,
      method: 'POST',
    }),

  denyRequest: (tenantId: string, csrfToken: string, accessToken: string) =>
    request<{ denied: boolean }>(`/platform/requests/${tenantId}/deny`, {
      accessToken,
      csrfToken,
      method: 'POST',
    }),
};
