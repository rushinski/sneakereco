'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SEGMENT_LABELS: Record<string, string> = {
  admin:       'Home',
  'web-design': 'Web Design',
  auth:        'Auth Pages',
  palette:     'Palette & Fonts',
  theme:       'Theme',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    return { label: SEGMENT_LABELS[seg] ?? seg, href };
  });

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 px-6 py-2 text-xs text-gray-400 border-b border-gray-100">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span>/</span>}
          {i < crumbs.length - 1 ? (
            <Link href={crumb.href} className="hover:text-gray-700 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-700 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
