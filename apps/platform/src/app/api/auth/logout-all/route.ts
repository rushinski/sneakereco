import type { NextRequest } from 'next/server';

import { handleSessionAction } from '@/lib/auth/bff';
import { validateBrowserMutation } from '@/lib/auth/csrf';

export function POST(request: NextRequest) {
  const rejected = validateBrowserMutation(request, { requireToken: true });
  if (rejected) {
    return Promise.resolve(rejected);
  }
  
  return handleSessionAction(request, 'auth/session-control/logout-all');
}