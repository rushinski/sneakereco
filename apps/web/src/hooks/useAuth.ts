'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiClient, readCsrfTokenCookie } from '../lib/api-client';
import {
  clearTokens,
  getStoredToken,
  setTokens,
  subscribeToAuthChanges,
} from '../lib/auth/token-store';
import { withRefreshLock } from '../lib/auth/refresh-lock';

export function useAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(getStoredToken);

  useEffect(() => subscribeToAuthChanges(setAccessToken), []);

  const storeTokens = useCallback((token: string, expiresIn: number) => {
    setTokens(token, expiresIn);
    setAccessToken(token);
  }, []);

  const signOut = useCallback(async () => {
    const token = getStoredToken();
    const csrf = readCsrfTokenCookie();
    if (token && csrf) {
      await apiClient.logoutCustomer(csrf, token).catch(() => {});
    }
    clearTokens();
    setAccessToken(null);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    const csrf = readCsrfTokenCookie();
    if (!csrf) return null;

    try {
      const result = await withRefreshLock(async () => {
        const res = await apiClient.refreshCustomer(csrf);
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
  }, []);

  return {
    accessToken,
    isAuthenticated: !!accessToken,
    signOut,
    refresh,
    storeTokens,
  };
}
