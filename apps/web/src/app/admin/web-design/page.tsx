import { AdminShell } from '@/components/admin/admin-shell';

export default function TenantAdminDashboardPage() {
  return (
    <AdminShell title="Dashboard" trail={['Home', 'Dashboard']}>
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Overview</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-900">Blank by design for now.</h3>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          This page intentionally stays minimal. The important locked direction here is the sidebar, the search-led
          header, and the breadcrumb trail beneath it.
        </p>
      </div>
    </AdminShell>
  );
}