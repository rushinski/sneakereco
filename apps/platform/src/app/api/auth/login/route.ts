import type { NextRequest } from 'next/server';

import { proxyJson } from '@/lib/auth/bff';
import { validateBrowserMutation } from '@/lib/auth/csrf';

export async function POST(request: NextRequest) {
  const rejected = validateBrowserMutation(request);
  if (rejected) {
    return rejected;
  }
  
  const body = (await request.json()) as Record<string, unknown>;
  const result = await proxyJson('auth/admin/login', { body });

  return Response.json(result.payload ?? {}, { status: result.status });
}