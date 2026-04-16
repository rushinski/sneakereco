'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiClientError,
  apiClient,
  clearAccessToken,
  getAccessToken,
  readCsrfTokenCookie,
  setAccessToken,
} from '../../lib/api-client';

/**
 * Client-side auth gate for dashboard pages.
 * If no access token is in memory (e.g. after a hard refresh), attempts to
 * restore the session from the httpOnly refresh cookie before redirecting.
 * The access token is kept in a module-level variable — never in localStorage.
 */
export function DashboardGuard({
  children,
  tenantId,
}: {
  children: React.ReactNode;
  tenantId: string | null;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const allowAuthReady = () => {
      if (!cancelled) setChecked(true);
    };

    const redirectToLogin = () => {
      clearAccessToken();
      if (!cancelled) router.replace('/admin/login');
    };

    const restoreSession = async () => {
      const stored = getAccessToken();
      if (stored) {
        allowAuthReady();
        return;
      }

      try {
        const csrfToken = readCsrfTokenCookie();
        if (!csrfToken || !tenantId) {
          redirectToLogin();
          return;
        }

        const result = await apiClient.refreshAdmin(tenantId, csrfToken);
        setAccessToken(result.accessToken);
        allowAuthReady();
      } catch {
        redirectToLogin();
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [router, tenantId]);

  if (!checked) return null;

  return <>{children}</>;
}
