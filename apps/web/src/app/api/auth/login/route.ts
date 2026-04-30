import type { NextRequest } from 'next/server';

import { handleAuthCompletion } from '@/lib/auth/bff';

export function POST(request: NextRequest) {
  return request.json().then((body) => handleAuthCompletion(request, 'auth/login', body as Record<string, unknown>));
}