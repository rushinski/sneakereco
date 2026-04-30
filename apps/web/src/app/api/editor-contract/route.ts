import { jsonError, proxyJson } from '@/lib/auth/bff';

export async function GET() {
  const result = await proxyJson('web-builder/editor-contract', {
    method: 'GET',
  });

  if (!result.ok) {
    return jsonError(result.status, result.payload);
  }

  return Response.json(result.payload ?? {});
}