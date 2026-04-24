'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  apiClient,
  clearAccessToken,
  getAccessToken,
  readCsrfTokenCookie,
  setAccessToken,
} from '../../lib/api-client';
import { getStoreAdminExternalPath } from '../../lib/routing/store-admin-paths';

/**
 * Client-side auth gate for dashboard pages.
 * If no access token is in memory (e.g. after a hard refresh), attempts to
 * restore the session from the httpOnly refresh cookie before redirecting.
 * The access token is kept in a module-level variable — never in localStorage.
 */
export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const allowAuthReady = () => {
      if (!cancelled) {
        setChecked(true);
      }
    };

    const redirectToLogin = () => {
      clearAccessToken();
      if (!cancelled) {
        router.replace(getStoreAdminExternalPath('/auth/login', window.location.host));
      }
    };

    const restoreSession = async () => {
      const stored = getAccessToken();
      if (stored) {
        allowAuthReady();
        return;
      }

      try {
        const csrfToken = readCsrfTokenCookie('store-admin');
        if (!csrfToken) {
          redirectToLogin();
          return;
        }

        const result = await apiClient.refreshStoreAdmin(csrfToken);
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
  }, [router]);

  if (!checked) {
    return null;
  }

  return <>{children}</>;
}
