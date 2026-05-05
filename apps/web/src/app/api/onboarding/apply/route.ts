import type { NextRequest } from 'next/server';

import { jsonError, proxyJson } from '@/lib/auth/bff';
import { validateBrowserMutation } from '@/lib/auth/csrf';

export async function POST(request: NextRequest) {
  const rejected = validateBrowserMutation(request, { requireToken: false });
  if (rejected) {
    return rejected;
  }

  const body = (await request.json()) as Record<string, unknown>;
  const result = await proxyJson('platform/onboarding/applications', { body });

  if (!result.ok) {
    return jsonError(result.status, result.payload);
  }

  return Response.json({ status: 'submitted' }, { status: 201 });
}
