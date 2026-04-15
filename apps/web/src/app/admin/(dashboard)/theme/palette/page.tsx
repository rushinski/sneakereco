import { headers } from 'next/headers';
import { PaletteEditor } from '../../../../../components/theme/PaletteEditor';

interface TenantConfigResponse {
  data?: {
    tenant?: { id: string };
    theme?: {
      colorPrimary: string;
      colorSecondary: string;
      colorAccent: string;
      colorBackground: string;
      colorSurface: string;
      colorText: string;
      colorTextMuted: string;
      colorBorder: string;
      fontHeading: string;
      fontBody: string;
      borderRadius: string;
    };
  };
}

async function fetchConfig(slug: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(
      `${apiBase}/v1/platform/config?slug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as TenantConfigResponse;
    return body?.data ?? null;
  } catch {
    return null;
  }
}

export default async function PalettePage() {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug') ?? '';
  const config = slug ? await fetchConfig(slug) : null;

  const tenantId = config?.tenant?.id ?? '';
  const theme = config?.theme;

  const initial = {
    colorPrimary:    theme?.colorPrimary    ?? '#000000',
    colorSecondary:  theme?.colorSecondary  ?? '#666666',
    colorAccent:     theme?.colorAccent     ?? '#2563EB',
    colorBackground: theme?.colorBackground ?? '#FFFFFF',
    colorSurface:    theme?.colorSurface    ?? '#F9FAFB',
    colorText:       theme?.colorText       ?? '#111827',
    colorTextMuted:  theme?.colorTextMuted  ?? '#6B7280',
    colorBorder:     theme?.colorBorder     ?? '#E5E7EB',
    fontHeading:     theme?.fontHeading     ?? 'Inter',
    fontBody:        theme?.fontBody        ?? 'Inter',
    borderRadius:    theme?.borderRadius    ?? '8px',
  };

  return <PaletteEditor tenantId={tenantId} initial={initial} />;
}
