import { headers } from 'next/headers';
import type { CSSProperties } from 'react';

import type { TenantTheme } from '../../lib/api-client';

async function fetchTenantTheme(input: {
  host?: string | null;
  slug?: string | null;
}): Promise<TenantTheme | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const query = input.host
      ? `host=${encodeURIComponent(input.host)}`
      : `slug=${encodeURIComponent(input.slug ?? '')}`;
    const res = await fetch(`${apiBase}/v1/platform/config?${query}`, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
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
    '--font-heading': `${theme.fontHeading}, sans-serif`,
    '--font-body': `${theme.fontBody}, sans-serif`,
    '--border-radius': theme.borderRadius,
    '--max-content-width': theme.maxContentWidth,
  } as CSSProperties;
}

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host');
  const slug = headersList.get('x-tenant-slug');
  const theme = await fetchTenantTheme({ host, slug });
  const cssVars = theme ? themeToVars(theme) : {};

  return (
    <div style={cssVars} className="min-h-screen">
      {children}
    </div>
  );
}
