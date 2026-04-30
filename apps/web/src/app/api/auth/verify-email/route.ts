import type { NextRequest } from 'next/server';

import { jsonError, proxyJson } from '@/lib/auth/bff';
import { resolveTenantContext } from '@/lib/auth/tenant';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const tenant = resolveTenantContext(request, typeof body.tenantId === 'string' ? body.tenantId : undefined);
  const result = await proxyJson('auth/password-reset/reset', {
    body: {
      tenantId: tenant.tenantId,
      email: body.email,
      code: body.code,
      newPassword: body.newPassword,
    },
  });

  if (!result.ok) {
    return jsonError(result.status, result.payload);
  }

  return Response.json({
    ...(typeof result.payload === 'object' && result.payload ? result.payload : {}),
    message: 'Password reset complete. Sign in with your new password.',
  });
}