import { headers } from 'next/headers';
import type { CSSProperties } from 'react';

import type { TenantTheme } from '../../lib/api-client';

// Tenant config is fetched server-side so we can inject CSS vars into the
// HTML without a client-side flash. Falls back to defaults on any error.
async function fetchTenantConfig(slug: string): Promise<TenantTheme | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(
      `${apiBase}/v1/platform/config?slug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { theme?: TenantTheme } };
    return body?.data?.theme ?? null;
  } catch {
    return null;
  }
}

function themeToVars(theme: TenantTheme): CSSProperties {
  return {
    '--color-primary': theme.colorPrimary,
    '--color-secondary': theme.colorSecondary,
    '--color-accent': theme.colorAccent,
    '--color-background': theme.colorBackground,
    '--color-surface': theme.colorSurface,
    '--color-text': theme.colorText,
    '--color-text-muted': theme.colorTextMuted,
    '--color-border': theme.colorBorder,
    '--color-error': theme.colorError,
    '--color-success': theme.colorSuccess,
    '--font-heading': theme.fontHeading,
    '--font-body': theme.fontBody,
    '--border-radius': theme.borderRadius,
    '--max-content-width': theme.maxContentWidth,
  } as CSSProperties;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug');

  const theme = slug ? await fetchTenantConfig(slug) : null;
  const cssVars = theme ? themeToVars(theme) : {};

  return (
    <div className="admin-shell" style={cssVars}>
      <header className="admin-header">
        {theme?.logoUrl ? (
          <img
            alt="Store logo"
            height={40}
            src={theme.logoUrl}
            style={{ width: theme.logoWidth, height: 'auto', objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>
            {theme ? '' : 'Admin'}
          </span>
        )}
      </header>
      <main className="admin-content">{children}</main>
    </div>
  );
}
