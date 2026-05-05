import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

type TrackerRequest = {
  user?: { sub?: string };
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

/**
 * Extends the default ThrottlerGuard with a composite rate-limit key that
 * scopes limits per-tenant and per-user/IP rather than by IP alone.
 *
 * Key strategy:
 *  - Authenticated requests: `{tenantId}:{userId}` â€” limits are per user, not
 *    per IP, so VPNs/shared IPs don't cause cross-user throttle collisions.
 *  - Unauthenticated requests with a tenant header: `{tenantId}:{ip}` â€” limits
 *    are scoped to the tenant so a DDoS on one tenant doesn't affect others.
 *  - No tenant context (platform routes, public): IP only.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: TrackerRequest): Promise<string> {
    const userId = req.user?.sub;
    const tenantHeader = req.headers['x-tenant-id'];
    const forwardedHeader = req.headers['x-forwarded-for'];
    const tenantId = typeof tenantHeader === 'string' ? tenantHeader : tenantHeader?.[0];
    const forwardedFor = typeof forwardedHeader === 'string' ? forwardedHeader : forwardedHeader?.[0];
    const ip =
      forwardedFor?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';

    if (userId && tenantId) {
      return Promise.resolve(`${tenantId}:${userId}`);
    }
    if (tenantId) {
      return Promise.resolve(`${tenantId}:${ip}`);
    }
    return Promise.resolve(ip);
  }
}
