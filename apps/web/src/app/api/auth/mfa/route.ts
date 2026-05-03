import type { NextRequest } from 'next/server';

import { handleSessionAction } from '@/lib/auth/bff';
import { validateBrowserMutation } from '@/lib/auth/csrf';

export function GET(request: NextRequest) {
  const rejected = validateBrowserMutation(request, { requireToken: true });
  if (rejected) {
    return rejected;
  }

  return handleSessionAction(request, 'auth/session-control/me');
}