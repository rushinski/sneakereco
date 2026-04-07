export interface ApiEnvelope<T> {
  data: T;
  success: boolean;
}

export interface ApiErrorPayload {
  error?: {
    message?: string | { message?: string };
    statusCode?: number;
  };
  success?: boolean;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: ApiErrorPayload,
  ) {
    super(message);
  }
}

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  accessToken?: string;
  body?: unknown;
  csrfToken?: string | null;
}

function isSuccessEnvelope<T>(
  payload: ApiEnvelope<T> | ApiErrorPayload | null,
): payload is ApiEnvelope<T> {
  return Boolean(payload && 'success' in payload && payload.success && 'data' in payload);
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
    throw new ApiClientError(message, response.status, payload ?? undefined);
  }

  return payload.data;
}

function extractErrorMessage(payload: ApiErrorPayload | ApiEnvelope<unknown> | null) {
  if (!payload || !('error' in payload) || !payload.error) {
    return null;
  }

  const { message } = payload.error;
  if (typeof message === 'string') {
    return message;
  }

  if (message && typeof message === 'object' && 'message' in message) {
    return typeof message.message === 'string' ? message.message : null;
  }

  return null;
}

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
