import { createHmac, timingSafeEqual } from 'node:crypto';

import type { NextRequest, NextResponse } from 'next/server';

import { authCookieName, refreshTtlSeconds, sessionSigningSecret } from './config';
import type { ActorType, BffSession } from './types';

function sign(value: string) {
  return createHmac('sha256', sessionSigningSecret).update(value).digest('base64url');
}

function encodeSession(session: BffSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decodeSession(raw: string): BffSession | null {
  const [payload, signature] = raw.split('.');

  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as BffSession;
  } catch {
    return null;
  }
}

export function readSessionCookie(request: NextRequest) {
  const raw = request.cookies.get(authCookieName)?.value;
  return raw ? decodeSession(raw) : null;
}

export function writeSessionCookie(response: NextResponse, session: BffSession, actorType: ActorType) {
  response.cookies.set({
    name: authCookieName,
    value: encodeSession(session),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshTtlSeconds[actorType],
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: authCookieName,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}