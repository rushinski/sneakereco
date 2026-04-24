'use client';

import type { ReactNode } from 'react';

export function BoldAuth({
  children,
  logoUrl,
  tenantName,
  headline,
  description,
}: {
  children: ReactNode;
  logoUrl?: string | null;
  tenantName?: string | null;
  headline?: string | null;
  description?: string | null;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Branding panel — hidden on mobile */}
      <div
        className="hidden md:flex w-1/2 flex-col justify-between p-12"
        style={{ background: 'var(--color-primary)' }}
      >
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={tenantName ?? ''}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-white/20" />
          )}
          {tenantName && <span className="text-sm font-semibold text-white/80">{tenantName}</span>}
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight text-white">
            {headline ?? 'Welcome back.'}
          </h1>
          {description && <p className="text-base leading-relaxed text-white/60">{description}</p>}
        </div>
        <div />
      </div>

      {/* Form panel */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12"
        style={{ background: 'var(--color-background)' }}
      >
        {/* Mobile logo */}
        {logoUrl && (
          <div className="mb-8 md:hidden">
            <img src={logoUrl} alt={tenantName ?? ''} className="h-8 w-auto object-contain" />
          </div>
        )}
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
