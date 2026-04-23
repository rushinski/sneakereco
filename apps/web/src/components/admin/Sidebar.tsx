'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { clearAccessToken, getAccessToken, readCsrfTokenCookie, apiClient } from '../../lib/api-client';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function NavItem({ href, label, icon }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-gray-700 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white',
      ].join(' ')}
    >
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function IconDashboard() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconWebDesign() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}

export function Sidebar({ tenantName }: { tenantName: string }) {
  const router = useRouter();

  async function handleLogout() {
    try {
      const token = getAccessToken();
      const csrf = readCsrfTokenCookie();
      if (token && csrf) {
        await apiClient.logoutCustomer(csrf, token).catch(() => {});
      }
    } finally {
      clearAccessToken();
      router.replace('/admin/login');
    }
  }

  return (
    <aside className="relative z-10 flex h-screen w-60 shrink-0 flex-col bg-gray-900">
      {/* Branding */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-700">
          <span className="text-xs font-bold uppercase text-gray-400">
            {tenantName.charAt(0)}
          </span>
        </div>
        <span className="truncate text-sm font-semibold text-white">{tenantName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <NavItem href="/admin" label="Dashboard" icon={<IconDashboard />} />
        <NavItem href="/admin/web-design" label="Web Design" icon={<IconWebDesign />} />
      </nav>

      {/* Footer: avatar + logout */}
      <div className="border-t border-gray-800 px-3 py-4">
        <button
          onClick={() => { void handleLogout(); }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </span>
          <span className="flex-1 text-left text-xs">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
