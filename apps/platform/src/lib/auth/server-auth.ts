import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { authCookieName, getSessionSigningSecret } from './boundary/config';
import type { BffSession } from './types';

function decodeSession(raw: string): BffSession | null {
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;

  const expected = createHmac('sha256', getSessionSigningSecret()).update(payload).digest('base64url');
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(actualBuf, expectedBuf)) return null;

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as BffSession;
  } catch {
    return null;
  }
}

export async function requirePlatformAdmin(): Promise<BffSession['principal']> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(authCookieName)?.value;
  if (!raw) redirect('/login');

  const session = decodeSession(raw);
  if (!session || session.principal.actorType !== 'platform_admin') redirect('/login');

  return session.principal;
}
