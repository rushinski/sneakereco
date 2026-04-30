import type { NextRequest } from 'next/server';

import { handleAuthCompletion } from '@/lib/auth/bff';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  return handleAuthCompletion(request, body);
}