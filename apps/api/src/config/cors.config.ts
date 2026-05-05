import type { FastifyCorsOptions } from '@fastify/cors';
import { eq } from 'drizzle-orm';
import { tenantHostnames } from '@sneakereco/db';

import type { DatabaseService } from '../core/database/database.service';
import type { ValkeyService } from '../core/valkey/valkey.service';
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  CORS_CREDENTIALS,
  ORIGIN_CACHE_TTL_SECONDS,
} from './security.config';

function normalizeOriginHostname(origin: string): string | null {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function buildCorsOptions(
  db: DatabaseService,
  valkey: ValkeyService,
): FastifyCorsOptions {
  return {
    credentials: CORS_CREDENTIALS,
    methods: CORS_ALLOWED_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    origin(origin, cb) {
      void (async () => {
        if (!origin) {
          cb(null, false);
          return;
        }

        const hostname = normalizeOriginHostname(origin);
        if (!hostname) {
          cb(null, false);
          return;
        }

        const cacheKey = `cors-origin:${hostname}`;
        const cached = await valkey.getJson<{ allowed: boolean }>(cacheKey);
        if (cached) {
          cb(null, cached.allowed ? origin : false);
          return;
        }

        const [row] = await db.systemDb
          .select({
            hostname: tenantHostnames.hostname,
            status: tenantHostnames.status,
          })
          .from(tenantHostnames)
          .where(eq(tenantHostnames.hostname, hostname))
          .limit(1);

        const allowed = row?.status === 'active';
        await valkey.setJson(cacheKey, { allowed }, ORIGIN_CACHE_TTL_SECONDS);

        cb(null, allowed ? origin : false);
      })().catch((error: unknown) => {
        cb(error instanceof Error ? error : new Error(String(error)), false);
      });
    },
  };
}
