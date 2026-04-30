import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiBaseUrl } from './config';
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from './cookies';
import { principalHeaders } from './principal-codec';
import type { BffAuthResponse, BffSession } from './types';

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

  return {
    ok: response.ok,
    status: response.status,
    payload: (await parseJson(response)) as TResponse | Record<string, unknown> | null,
  };
}

export async function handleAuthCompletion(request: NextRequest, body: Record<string, unknown>) {
  const result = await proxyJson<BffAuthResponse>('auth/mfa/challenge', {
    body: {
      ...body,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    },
  });

  if (!result.ok || !result.payload || typeof result.payload !== 'object' || !('accessToken' in result.payload)) {
    return NextResponse.json(result.payload ?? { code: 'request_failed', message: 'Request failed' }, {
      status: result.status,
    });
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
    writeSessionCookie(response, session);
  }

  return response;
}

export async function handleRefresh(request: NextRequest) {
  const session = readSessionCookie(request);
  if (!session) {
    return NextResponse.json({ code: 'missing_session', message: 'No active session' }, { status: 401 });
  }

  const result = await proxyJson<BffAuthResponse>('auth/refresh', {
    body: {
      sessionId: session.principal.sessionId,
      refreshToken: session.refreshToken,
    },
  });

  if (!result.ok || !result.payload || typeof result.payload !== 'object' || !('accessToken' in result.payload)) {
    const response = NextResponse.json(result.payload ?? { code: 'refresh_failed', message: 'Refresh failed' }, {
      status: result.status,
    });
    clearSessionCookie(response);
    return response;
  }

  const payload = result.payload as BffAuthResponse & { refreshToken?: string };
  const response = NextResponse.json({
    accessToken: payload.accessToken,
    principal: payload.principal,
  });
  writeSessionCookie(response, {
    refreshToken: payload.refreshToken ?? session.refreshToken,
    principal: payload.principal,
  });
  return response;
}

export async function handleSessionAction(request: NextRequest, path: 'auth/session-control/me' | 'auth/session-control/logout' | 'auth/session-control/logout-all') {
  const session = readSessionCookie(request);
  if (!session) {
    return NextResponse.json({ code: 'missing_session', message: 'No active session' }, { status: 401 });
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