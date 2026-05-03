import type { NextRequest } from 'next/server';

import { proxyJson, jsonError } from '@/lib/auth/bff';
import { validateBrowserMutation } from '@/lib/auth/csrf';
import { getRequestHost, resolveTenantFromHost } from '@/lib/auth/tenant';

export async function POST(request: NextRequest) {
  const rejected = validateBrowserMutation(request, { requireToken: true });
  if (rejected) {
    return rejected;
  }

  const tenant = await resolveTenantFromHost(getRequestHost(request));
  if (!tenant) {
    return Response.json({ code: 'TENANT_NOT_FOUND', message: 'Unknown host' }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const result = await proxyJson('auth/register', {
    body: {
      ...body,
      tenantId: tenant.tenantId,
    },
  });

  if (!result.ok) {
    return jsonError(result.status, result.payload);
  }

  return Response.json({
    ...(typeof result.payload === 'object' && result.payload ? result.payload : {}),
    message: 'Registration submitted. Confirm your email to continue.',
  });
}