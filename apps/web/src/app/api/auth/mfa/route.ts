import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { jsonError, proxyJson } from '@/lib/auth/bff';
import { writeSessionCookie } from '@/lib/auth/session/cookies';
import { validateBrowserMutation } from '@/lib/auth/csrf';
import type { BffAuthResponse, BffSession } from '@/lib/auth/types';

export async function POST(request: NextRequest) {
  const rejected = validateBrowserMutation(request, { requireToken: true });
  if (rejected) {
    return rejected;
  }

  const body = (await request.json()) as Record<string, unknown>;
  const result = await proxyJson<BffAuthResponse>('auth/mfa/challenge', {
    body: {
      ...body,
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