import type { NextRequest } from 'next/server';

import { jsonError, proxyJson } from '@/lib/auth/bff';
import { validateBrowserMutation } from '@/lib/auth/csrf';

export async function POST(request: NextRequest) {
  const rejected = validateBrowserMutation(request, { requireToken: true });
  if (rejected) {
    return rejected;
  }

  const body = (await request.json()) as Record<string, unknown>;
  const result = await proxyJson('platform/onboarding/setup-invitations/consume', {
    body: {
      token: body.token,
    },
  });

  if (!result.ok) {
    return jsonError(result.status, result.payload);
  }

  return Response.json({
    ...(typeof result.payload === 'object' && result.payload ? result.payload : {}),
    message: 'Setup invitation verified. Continue to password and MFA setup.',
  });
}