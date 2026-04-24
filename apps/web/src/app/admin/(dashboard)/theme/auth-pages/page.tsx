import { headers } from 'next/headers';

import { AuthPagePicker } from '../../../../../components/theme/AuthPagePicker';

interface TenantConfigResponse {
  data?: {
    tenant?: { id: string };
    theme?: {
      authVariant?: string;
      authHeadline?: string | null;
      authDescription?: string | null;
    };
  };
}

async function fetchConfig(slug: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(`${apiBase}/v1/platform/config?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    const body = (await res.json()) as TenantConfigResponse;
    return body?.data ?? null;
  } catch {
    return null;
  }
}

export default async function AuthPagesPage() {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug') ?? '';
  const config = slug ? await fetchConfig(slug) : null;

  const tenantId = config?.tenant?.id ?? '';
  const theme = config?.theme;

  return (
    <AuthPagePicker
      tenantId={tenantId}
      initialVariant={(theme?.authVariant as 'simple' | 'bold') ?? 'simple'}
      initialHeadline={theme?.authHeadline ?? null}
      initialDescription={theme?.authDescription ?? null}
    />
  );
}
