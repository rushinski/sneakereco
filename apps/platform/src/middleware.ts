import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';

  // dashboard.sneakereco.com/* → rewrite to /dashboard/*
  if (hostname.startsWith('dashboard.')) {
    const url = request.nextUrl.clone();
    const pathname = url.pathname === '/' ? '' : url.pathname;
    url.pathname = `/dashboard${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
