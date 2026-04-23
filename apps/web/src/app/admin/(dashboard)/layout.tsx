import { headers } from 'next/headers';
import { Sidebar } from '../../../components/admin/Sidebar';
import { TopNavbar } from '../../../components/admin/TopNavbar';
import { DashboardGuard } from '../../../components/admin/DashboardGuard';

async function resolveTenant(slug: string): Promise<{ id: string | null; name: string }> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(
      `${apiBase}/v1/platform/config?slug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return { id: null, name: slug };
    const body = (await res.json()) as { data?: { tenant?: { id?: string; name?: string } } };
    return {
      id: body?.data?.tenant?.id ?? null,
      name: body?.data?.tenant?.name ?? slug,
    };
  } catch {
    return { id: null, name: slug };
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug') ?? '';
  const tenant = slug ? await resolveTenant(slug) : { id: null, name: 'Admin' };

  return (
    <DashboardGuard tenantId={tenant.id}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar tenantName={tenant.name} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNavbar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardGuard>
  );
}
