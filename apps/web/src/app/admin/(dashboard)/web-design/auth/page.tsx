import { headers } from 'next/headers';

import { ComponentSection } from '../../../../../components/web-design/ComponentSection';
import { AuthPagePickerWithPreview } from '../../../../../components/web-design/AuthPagePickerWithPreview';

interface TenantConfigResponse {
  data?: {
    tenant?: { id: string };
    theme?: {
      authVariant?: string;
      authHeadline?: string | null;
      authDescription?: string | null;
    };
  };
}

async function fetchConfig(slug: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(`${apiBase}/v1/platform/config?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    const body = (await res.json()) as TenantConfigResponse;
    return body?.data ?? null;
  } catch {
    return null;
  }
}

const CATEGORIES = [
  { label: 'Auth Pages', href: '/admin/web-design/auth', comingSoon: false },
  { label: 'Headers', href: '/admin/web-design/headers', comingSoon: true },
  { label: 'Heroes', href: '/admin/web-design/heroes', comingSoon: true },
  { label: 'Footers', href: '/admin/web-design/footers', comingSoon: true },
  { label: 'Storefront', href: '/admin/web-design/storefront', comingSoon: true },
  { label: 'Product Page', href: '/admin/web-design/product', comingSoon: true },
  { label: 'Cart & Checkout', href: '/admin/web-design/cart', comingSoon: true },
];

export default async function WebDesignAuthPage() {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug') ?? '';
  const config = slug ? await fetchConfig(slug) : null;

  const tenantId = config?.tenant?.id ?? '';
  const theme = config?.theme;

  return (
    <>
      {/* Category list */}
      <aside className="w-52 shrink-0 border-r border-gray-200 bg-white p-3 space-y-0.5">
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Components
        </p>
        {CATEGORIES.map((cat) => (
          <ComponentSection
            key={cat.href}
            label={cat.label}
            href={cat.href}
            comingSoon={cat.comingSoon}
            isSelected={cat.href === '/admin/web-design/auth'}
          />
        ))}
      </aside>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AuthPagePickerWithPreview
          tenantId={tenantId}
          initialVariant={(theme?.authVariant as 'simple' | 'bold') ?? 'simple'}
          initialHeadline={theme?.authHeadline ?? null}
          initialDescription={theme?.authDescription ?? null}
        />
      </div>
    </>
  );
}
