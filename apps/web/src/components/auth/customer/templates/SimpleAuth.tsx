'use client';

import type { ReactNode } from 'react';

export function SimpleAuth({
  children,
  logoUrl,
  tenantName,
}: {
  children: ReactNode;
  logoUrl?: string | null;
  tenantName?: string | null;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-background)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-sm"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="mb-6 text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName ?? ''} className="mx-auto h-8 w-auto object-contain" />
          ) : (
            <div
              className="mx-auto h-8 w-24 rounded"
              style={{ background: 'var(--color-border)' }}
            />
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
