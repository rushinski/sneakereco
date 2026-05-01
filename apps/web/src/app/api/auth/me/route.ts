import type { NextRequest } from 'next/server';

import { handleSessionAction } from '@/lib/auth/bff';

export function GET(request: NextRequest) {
  return handleSessionAction(request, 'auth/session-control/me');
}
