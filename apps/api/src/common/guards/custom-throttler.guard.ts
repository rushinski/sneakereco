import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Extends the default ThrottlerGuard with a composite rate-limit key that
 * scopes limits per-tenant and per-user/IP rather than by IP alone.
 *
 * Key strategy:
 *  - Authenticated requests: `{tenantId}:{userId}` — limits are per user, not
 *    per IP, so VPNs/shared IPs don't cause cross-user throttle collisions.
 *  - Unauthenticated requests with a tenant header: `{tenantId}:{ip}` — limits
 *    are scoped to the tenant so a DDoS on one tenant doesn't affect others.
 *  - No tenant context (platform routes, public): IP only.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const userId = (req as Record<string, unknown>)['user']
      ? ((req as Record<string, unknown>)['user'] as Record<string, unknown>)['sub'] as string | undefined
      : undefined;
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';

    if (userId && tenantId) return `${tenantId}:${userId}`;
    if (tenantId) return `${tenantId}:${ip}`;
    return ip;
  }
}
