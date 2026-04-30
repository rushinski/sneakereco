import type { NextRequest } from 'next/server';

import { proxyJson, jsonError } from '@/lib/auth/bff';
import { resolveTenantContext } from '@/lib/auth/tenant';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const tenant = resolveTenantContext(request, typeof body.tenantId === 'string' ? body.tenantId : undefined);
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