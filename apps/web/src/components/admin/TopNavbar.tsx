'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/admin':                    'Dashboard',
  '/admin/theme/palette':      'Palette & Fonts',
  '/admin/theme/auth-pages':   'Auth Pages',
};

function resolveTile(pathname: string): string {
  return PAGE_TITLES[pathname] ?? 'Dashboard';
}

interface TopNavbarProps {
  tenantName: string;
}

export function TopNavbar({ tenantName }: TopNavbarProps) {
  const pathname = usePathname();
  const title = resolveTile(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>

      {/* User section */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-gray-900">{tenantName}</p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
