import type { NextRequest } from 'next/server';

import { handleRefresh } from '@/lib/auth/bff';

export function POST(request: NextRequest) {
  return handleRefresh(request);
}