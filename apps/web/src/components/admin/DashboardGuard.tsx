'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '../../lib/api-client';

/**
 * Client-side auth gate for dashboard pages.
 * If no access token is in memory (e.g. after a hard refresh), redirects to login.
 * The access token is kept in a module-level variable — never in localStorage.
 */
export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/admin/login');
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return <>{children}</>;
}
