import type { NextRequest } from 'next/server';

import type { TenantContext } from './types';

function stripPort(host: string) {
  return host.split(':')[0] ?? host;
}

export function resolveTenantContext(request: NextRequest, explicitTenantId?: string): TenantContext {
  const host = stripPort(request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'tenant.sneakereco.test');
  const firstLabel = host.split('.')[0] ?? 'tenant';
  const slug = firstLabel === 'www' || firstLabel === 'admin' || firstLabel === 'dashboard' ? 'tenant' : firstLabel;

  return {
    slug,
    tenantId: explicitTenantId ?? `tnt_${slug}`,
    host,
  };
}