import { type NextRequest, NextResponse } from 'next/server';

import {
  getStoreAdminExternalPath,
  isDedicatedStoreAdminHost,
  normalizeHost,
} from './lib/routing/store-admin-paths';

const MANAGED_TENANT_HOST = /^([a-z0-9-]+)\.sneakereco\.(?:com|test)$/;

function buildTenantHeaders(request: NextRequest, host: string): Headers {
  const requestHeaders = new Headers(request.headers);
  const slug = host.match(MANAGED_TENANT_HOST)?.[1];

  if (slug && slug !== 'www' && slug !== 'dashboard' && slug !== 'admin') {
    requestHeaders.set('x-tenant-slug', slug);
  } else {
    requestHeaders.delete('x-tenant-slug');
  }

  return requestHeaders;
}

async function fetchTenantRouting(host: string, appSurface: 'customer' | 'store-admin') {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    return null;
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/v1/platform/config?host=${encodeURIComponent(host)}`,
      {
        cache: 'no-store',
        headers: { 'X-App-Surface': appSurface },
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      data?: {
        routing?: {
          canonicalAdminHost?: string | null;
          canonicalCustomerHost?: string | null;
          canonicalHost?: string | null;
        };
      };
    };

    return payload.data?.routing ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const host = normalizeHost(request.headers.get('host') ?? '');
  const pathname = request.nextUrl.pathname;
  const dedicatedAdminHost = isDedicatedStoreAdminHost(host);
  const managedAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const appSurface = dedicatedAdminHost || managedAdminPath ? 'store-admin' : 'customer';
  const requestHeaders = buildTenantHeaders(request, host);

  if (dedicatedAdminHost && managedAdminPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getStoreAdminExternalPath(pathname, host);
    return NextResponse.redirect(redirectUrl);
  }

  const routing = await fetchTenantRouting(host, appSurface);
  const canonicalHost =
    appSurface === 'store-admin'
      ? (routing?.canonicalAdminHost ?? routing?.canonicalHost ?? null)
      : (routing?.canonicalCustomerHost ?? routing?.canonicalHost ?? null);

  if (canonicalHost && normalizeHost(canonicalHost) !== host) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.host = canonicalHost;
    redirectUrl.pathname =
      appSurface === 'store-admin' ? getStoreAdminExternalPath(pathname, canonicalHost) : pathname;
    return NextResponse.redirect(redirectUrl);
  }

  if (dedicatedAdminHost) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`;
    return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
