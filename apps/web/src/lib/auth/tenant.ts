import type { NextRequest } from 'next/server';

import { apiBaseUrl } from './boundary/config';
import type { TenantContext } from './types';

export async function resolveTenantFromHost(host: string): Promise<TenantContext | null> {
  const res = await fetch(`${apiBaseUrl}/tenants/resolve?host=${encodeURIComponent(host)}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { tenantId: string; slug: string; source: string };
  if (!data.tenantId) return null;
  return {
    tenantId: data.tenantId,
    slug: data.slug ?? '',
    host,
  };
}

export function getRequestHost(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    ''
  );
}
