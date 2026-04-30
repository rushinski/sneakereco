import { createHmac, timingSafeEqual } from 'node:crypto';

export function signPrincipalPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function verifyPrincipalPayload(payload: string, signature: string, secret: string) {
  const expected = signPrincipalPayload(payload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}