import { headers } from 'next/headers';
import { AdminLoginForm } from '../../../components/AdminLoginForm';

async function resolveTenantId(slug: string): Promise<string | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(
      `${apiBase}/v1/platform/config?slug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { tenant?: { id?: string } } };
    return body?.data?.tenant?.id ?? null;
  } catch {
    return null;
  }
}

export default async function AdminLoginPage() {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug') ?? '';
  const tenantId = slug ? await resolveTenantId(slug) : null;
  return <AdminLoginForm tenantId={tenantId} />;
}
