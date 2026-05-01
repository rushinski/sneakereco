import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { NextRequest, NextResponse } from 'next/server';
import { NextResponse as ResponseBuilder } from 'next/server';

export const csrfCookieName = '__Host-sneakereco.csrf';
export const csrfHeaderName = 'x-csrf-token';

function tokensMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function getOrCreateCsrfToken(request: NextRequest) {
  return request.cookies.get(csrfCookieName)?.value ?? randomBytes(24).toString('hex');
}

export function writeCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: csrfCookieName,
    value: token,
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
}

export function csrfResponse(request: NextRequest) {
  const token = getOrCreateCsrfToken(request);
  const response = ResponseBuilder.json({ csrfToken: token });
  writeCsrfCookie(response, token);
  return response;
}

export function validateBrowserMutation(request: NextRequest, options?: { requireToken?: boolean }) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
      const requestProto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
      if (parsedOrigin.host !== requestHost || parsedOrigin.protocol !== `${requestProto}:`) {
        return ResponseBuilder.json(
          { code: 'invalid_origin', message: 'Origin check failed' },
          { status: 403 },
        );
      }
    } catch {
      return ResponseBuilder.json({ code: 'invalid_origin', message: 'Origin check failed' }, { status: 403 });
    }
  }

  if (!options?.requireToken) {
    return null;
  }

  const cookieToken = request.cookies.get(csrfCookieName)?.value;
  const headerToken = request.headers.get(csrfHeaderName);

  if (!cookieToken || !headerToken || !tokensMatch(cookieToken, headerToken)) {
    return ResponseBuilder.json({ code: 'invalid_csrf', message: 'CSRF validation failed' }, { status: 403 });
  }

  return null;
}