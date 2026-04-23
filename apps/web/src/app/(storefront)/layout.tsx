import { headers } from 'next/headers';
import type { CSSProperties } from 'react';

import { TenantThemeProvider } from '../../lib/tenant-theme-context';
import type { TenantConfig, TenantTheme } from '../../lib/api-client';

async function fetchTenantConfig(slug: string): Promise<TenantConfig | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(
      `${apiBase}/v1/platform/config?slug=${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: TenantConfig };
    return body?.data ?? null;
  } catch {
    return null;
  }
}

function themeToVars(theme: TenantTheme): CSSProperties {
  return {
    '--color-primary':     theme.colorPrimary,
    '--color-secondary':   theme.colorSecondary,
    '--color-accent':      theme.colorAccent,
    '--color-background':  theme.colorBackground,
    '--color-surface':     theme.colorSurface,
    '--color-text':        theme.colorText,
    '--color-text-muted':  theme.colorTextMuted,
    '--color-border':      theme.colorBorder,
    '--color-error':       theme.colorError,
    '--color-success':     theme.colorSuccess,
    '--font-heading':      `${theme.fontHeading}, sans-serif`,
    '--font-body':         `${theme.fontBody}, sans-serif`,
    '--border-radius':     theme.borderRadius,
    '--max-content-width': theme.maxContentWidth,
  } as CSSProperties;
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug');
  const config = slug ? await fetchTenantConfig(slug) : null;
  const cssVars = config ? themeToVars(config.theme) : {};

  return (
    <TenantThemeProvider config={config}>
      <div style={cssVars} className="min-h-screen">
        {children}
      </div>
    </TenantThemeProvider>
  );
}
