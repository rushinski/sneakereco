import { headers } from 'next/headers';

import { Sidebar } from '../../../components/admin/Sidebar';
import { TopNavbar } from '../../../components/admin/TopNavbar';
import { DashboardGuard } from '../../../components/admin/DashboardGuard';

async function resolveTenant(input: {
  host?: string | null;
  slug?: string | null;
}): Promise<{ id: string | null; name: string }> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const query = input.host
      ? `host=${encodeURIComponent(input.host)}`
      : `slug=${encodeURIComponent(input.slug ?? '')}`;
    const res = await fetch(`${apiBase}/v1/platform/config?${query}`, { cache: 'no-store' });
    if (!res.ok) {
      return { id: null, name: input.slug ?? input.host ?? 'Admin' };
    }
    const body = (await res.json()) as { data?: { tenant?: { id?: string; name?: string } } };
    return {
      id: body?.data?.tenant?.id ?? null,
      name: body?.data?.tenant?.name ?? input.slug ?? input.host ?? 'Admin',
    };
  } catch {
    return { id: null, name: input.slug ?? input.host ?? 'Admin' };
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host');
  const slug = headersList.get('x-tenant-slug') ?? '';
  const tenant = await resolveTenant({ host, slug });

  return (
    <DashboardGuard>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar tenantName={tenant.name} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNavbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </DashboardGuard>
  );
}
