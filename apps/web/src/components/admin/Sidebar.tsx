'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItemProps {
  href?: string;
  label: string;
  icon: React.ReactNode;
  children?: { href: string; label: string }[];
}

function NavItem({ href, label, icon, children }: NavItemProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (!children) return false;
    return children.some((c) => pathname === c.href || pathname.startsWith(c.href));
  });

  const isActive = href ? pathname === href : false;

  if (children) {
    return (
      <div>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className={[
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            'text-gray-300 hover:bg-gray-800 hover:text-white',
          ].join(' ')}
        >
          <span className="text-gray-400 shrink-0">{icon}</span>
          <span className="flex-1 text-left">{label}</span>
          <svg
            className={['h-4 w-4 text-gray-500 transition-transform', open ? 'rotate-90' : ''].join(' ')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-700 pl-3">
            {children.map((child) => {
              const childActive = pathname === child.href || pathname.startsWith(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={[
                    'block rounded-md px-3 py-1.5 text-sm transition-colors',
                    childActive
                      ? 'bg-gray-700 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  ].join(' ')}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href!}
      className={[
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-gray-700 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white',
      ].join(' ')}
    >
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

// ---- Icons ----

function IconDashboard() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconTheme() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}

interface SidebarProps {
  tenantName: string;
}

export function Sidebar({ tenantName }: SidebarProps) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-gray-900">
      {/* Branding */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        {/* Logo placeholder — R2 upload not yet wired */}
        <div className="h-8 w-8 shrink-0 rounded-md bg-gray-700 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-400 uppercase">
            {tenantName.charAt(0)}
          </span>
        </div>
        <span className="text-sm font-semibold text-white truncate">{tenantName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <NavItem href="/admin" label="Dashboard" icon={<IconDashboard />} />
        <NavItem
          label="Site Theme"
          icon={<IconTheme />}
          children={[
            { href: '/admin/theme/palette', label: 'Palette & Fonts' },
            { href: '/admin/theme/auth-pages', label: 'Auth Pages' },
          ]}
        />
      </nav>
    </aside>
  );
}
