import type { NextRequest } from 'next/server';

import { csrfResponse } from '@/lib/auth/csrf';

export function GET(request: NextRequest) {
  return csrfResponse(request);
}