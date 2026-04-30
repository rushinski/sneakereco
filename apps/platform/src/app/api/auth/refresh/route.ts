import type { NextRequest } from 'next/server';

import { handleRefresh } from '@/lib/auth/bff';
import { validateBrowserMutation } from '@/lib/auth/csrf';

export function POST(request: NextRequest) {
  const rejected = validateBrowserMutation(request, { requireToken: true });
  if (rejected) {
    return Promise.resolve(rejected);
  }
  
  return handleRefresh(request);
}