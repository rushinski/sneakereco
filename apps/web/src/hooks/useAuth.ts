'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiClient, type AppSurface, readCsrfTokenCookie } from '../lib/api-client';
import {
  clearTokens,
  getStoredToken,
  setTokens,
  subscribeToAuthChanges,
} from '../lib/auth/token-store';
import { withRefreshLock } from '../lib/auth/refresh-lock';

export function useAuth(appSurface: AppSurface = 'customer') {
  const [accessToken, setAccessToken] = useState<string | null>(getStoredToken);

  useEffect(() => subscribeToAuthChanges(setAccessToken), []);

  const storeTokens = useCallback((token: string, expiresIn: number) => {
    setTokens(token, expiresIn);
    setAccessToken(token);
  }, []);

  const signOut = useCallback(async () => {
    const token = getStoredToken();
    const csrf = readCsrfTokenCookie(appSurface);
    if (token && csrf) {
      const logout =
        appSurface === 'store-admin' ? apiClient.logoutStoreAdmin : apiClient.logoutCustomer;
      await logout(csrf, token).catch(() => {});
    }
    clearTokens();
    setAccessToken(null);
  }, [appSurface]);

  const refresh = useCallback(async (): Promise<string | null> => {
    const csrf = readCsrfTokenCookie(appSurface);
    if (!csrf) {
      return null;
    }

    try {
      const result = await withRefreshLock(async () => {
        const res =
          appSurface === 'store-admin'
            ? await apiClient.refreshStoreAdmin(csrf)
            : await apiClient.refreshCustomer(csrf);
        setTokens(res.accessToken, res.expiresIn);
        return res.accessToken;
      });
      setAccessToken(result);
      return result;
    } catch {
      clearTokens();
      setAccessToken(null);
      return null;
    }
  }, [appSurface]);

  return {
    accessToken,
    isAuthenticated: !!accessToken,
    signOut,
    refresh,
    storeTokens,
  };
}
