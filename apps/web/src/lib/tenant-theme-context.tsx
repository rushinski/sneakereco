'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { TenantConfig } from './api-client';

const TenantThemeContext = createContext<TenantConfig | null>(null);

export function TenantThemeProvider({
  config,
  children,
}: {
  config: TenantConfig | null;
  children: ReactNode;
}) {
  return (
    <TenantThemeContext.Provider value={config}>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantConfig(): TenantConfig | null {
  return useContext(TenantThemeContext);
}
