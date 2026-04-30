import type { NextRequest } from 'next/server';

import { handleAuthCompletion } from '@/lib/auth/bff';
import { validateBrowserMutation } from '@/lib/auth/csrf';

export async function POST(request: NextRequest) {
  const rejected = validateBrowserMutation(request);
  if (rejected) {
    return rejected;
  }
  
  const body = (await request.json()) as Record<string, unknown>;
  return handleAuthCompletion(request, body);
}