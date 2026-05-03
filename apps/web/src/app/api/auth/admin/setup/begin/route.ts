import type { NextRequest } from 'next/server';

import { jsonError, proxyJson } from '@/lib/auth/bff';
import { validateBrowserMutation } from '@/lib/auth/csrf';

export async function POST(request: NextRequest) {
  const rejected = validateBrowserMutation(request, { requireToken: true });
  if (rejected) {
    return rejected;
  }

  const body = (await request.json()) as Record<string, unknown>;
  const result = await proxyJson('auth/admin/setup/begin', {
    body: {
      setupSessionToken: body.setupSessionToken,
      password: body.password,
    },
  });

  if (!result.ok) {
    return jsonError(result.status, result.payload);
  }

  return Response.json({
    ...(typeof result.payload === 'object' && result.payload ? result.payload : {}),
    message: 'Password saved. Complete authenticator setup to finish onboarding.',
  });
}