import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiBaseUrl } from './config';
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from './cookies';
import { principalHeaders } from './principal-codec';
import { resolveTenantContext } from './tenant';
import type { ApiErrorPayload, BffAuthResponse, BffSession } from './types';

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { code: 'invalid_json', message: text };
  }
}

export async function proxyJson<TResponse>(
  path: string,
  init: {
    method?: 'GET' | 'POST';
    body?: unknown;
    headers?: Record<string, string>;
  },
) {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/${path}`, {
    method: init.method ?? 'POST',
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });

  const payload = (await parseJson(response)) as TResponse | ApiErrorPayload | null;
  return { ok: response.ok, status: response.status, payload };
}

export function jsonError(status: number, payload?: ApiErrorPayload | unknown) {
  const body =
    payload && typeof payload === 'object'
      ? payload
      : {
          code: 'request_failed',
          message: 'Request failed',
        };

  return NextResponse.json(body, { status });
}

export async function handleAuthCompletion(
  request: NextRequest,
  path: string,
  body: Record<string, unknown>,
) {
  const tenant = resolveTenantContext(request, typeof body.tenantId === 'string' ? body.tenantId : undefined);
  const result = await proxyJson<BffAuthResponse>(path, {
    body: {
      ...body,
      tenantId: tenant.tenantId,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    },
  });

  if (!result.ok || !result.payload || typeof result.payload !== 'object' || !('accessToken' in result.payload)) {
    return jsonError(result.status, result.payload);
  }

  const payload = result.payload as BffAuthResponse & { refreshToken?: string };
  const response = NextResponse.json({
    accessToken: payload.accessToken,
    principal: payload.principal,
  });

  if (payload.refreshToken) {
    const session: BffSession = {
      refreshToken: payload.refreshToken,
      principal: payload.principal,
    };
    writeSessionCookie(response, session, payload.principal.actorType);
  }

  return response;
}

export async function handleRefresh(request: NextRequest) {
  const session = readSessionCookie(request);
  if (!session) {
    return jsonError(401, { code: 'missing_session', message: 'No active session' });
  }

  const result = await proxyJson<BffAuthResponse>('auth/refresh', {
    body: {
      sessionId: session.principal.sessionId,
      refreshToken: session.refreshToken,
    },
  });

  if (!result.ok || !result.payload || typeof result.payload !== 'object' || !('accessToken' in result.payload)) {
    const response = jsonError(result.status, result.payload);
    clearSessionCookie(response);
    return response;
  }

  const payload = result.payload as BffAuthResponse & { refreshToken?: string };
  const response = NextResponse.json({
    accessToken: payload.accessToken,
    principal: payload.principal,
  });

  writeSessionCookie(
    response,
    {
      refreshToken: payload.refreshToken ?? session.refreshToken,
      principal: payload.principal,
    },
    payload.principal.actorType,
  );

  return response;
}

export async function handleSessionAction(request: NextRequest, path: 'auth/session-control/me' | 'auth/session-control/logout' | 'auth/session-control/logout-all') {
  const session = readSessionCookie(request);
  if (!session) {
    return jsonError(401, { code: 'missing_session', message: 'No active session' });
  }

  const result = await proxyJson<Record<string, unknown>>(path, {
    method: path.endsWith('/me') ? 'GET' : 'POST',
    headers: principalHeaders(session.principal),
  });

  const response = NextResponse.json(result.payload ?? {}, { status: result.status });
  if (path !== 'auth/session-control/me' || result.status === 401) {
    clearSessionCookie(response);
  }

  return response;
}