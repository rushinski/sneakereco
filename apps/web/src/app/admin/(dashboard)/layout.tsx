import { headers } from 'next/headers';
import { Sidebar } from '../../../components/admin/Sidebar';
import { TopNavbar } from '../../../components/admin/TopNavbar';
import { DashboardGuard } from '../../../components/admin/DashboardGuard';

async function resolveTenantName(slug: string): Promise<string> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(
      `${apiBase}/v1/platform/config?slug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return slug;
    const body = (await res.json()) as { data?: { tenant?: { name?: string } } };
    return body?.data?.tenant?.name ?? slug;
  } catch {
    return slug;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug') ?? '';
  const tenantName = slug ? await resolveTenantName(slug) : 'Admin';

  return (
    <DashboardGuard>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar tenantName={tenantName} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNavbar tenantName={tenantName} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardGuard>
  );
}
