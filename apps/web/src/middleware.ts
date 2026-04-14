import { type NextRequest, NextResponse } from 'next/server';

/**
 * Resolves the tenant slug from the hostname and injects it as a
 * response header so server components can read it via `headers()`.
 *
 * {slug}.sneakereco.com → x-tenant-slug: {slug}
 * localhost / unknown domains → no header
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  const response = NextResponse.next();

  // Strip port suffix (e.g. localhost:3001)
  const host = hostname.split(':')[0] ?? '';

  // {slug}.sneakereco.com (prod) or {slug}.sneakereco.test (dev)
  const sneakerecoMatch = host.match(/^([a-z0-9-]+)\.sneakereco\.(?:com|test)$/);
  if (sneakerecoMatch) {
    const slug = sneakerecoMatch[1];
    // Exclude 'www' and 'dashboard' — not tenant subdomains
    if (slug && slug !== 'www' && slug !== 'dashboard') {
      response.headers.set('x-tenant-slug', slug);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
