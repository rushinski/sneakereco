import { requirePlatformAdmin } from '@/lib/auth/server-auth';
import { DashboardShell } from '@/components/platform-shell/dashboard-shell';

export default async function PlatformDashboardPage() {
  await requirePlatformAdmin();
  return (
    <DashboardShell title="Dashboard" trail={['Home', 'Dashboard']}>
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Platform control</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-900">Tenant approvals start here.</h3>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          The platform dashboard stays structurally controlled. Its concern here is approval and operational oversight,
          not tenant-level customization.
        </p>
      </div>
    </DashboardShell>
  );
}