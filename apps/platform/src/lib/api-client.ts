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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  accessToken?: string;
  body?: unknown;
  csrfToken?: string | null;
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
  { accessToken, body, csrfToken, headers, ...init }: RequestOptions = {},
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
  accessToken: string;
  adminRedirectUrl: string;
  expiresIn: number;
  idToken: string;
  refreshToken: string;
  secretCode: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const apiClient = {
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
};