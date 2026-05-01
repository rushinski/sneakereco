import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CacheService } from '../cache/cache.service';
import { MetricsService } from '../observability/metrics/metrics.service';
import { AUTH_RATE_LIMIT_PROFILE } from '../../modules/auth/principals/auth-rate-limit.decorator';
import { SecurityService } from './security.service';

interface RateLimitState {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly records = new Map<string, RateLimitState>();

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    private readonly securityService: SecurityService,
    private readonly metricsService: MetricsService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const profile = this.reflector.getAllAndOverride<string>(AUTH_RATE_LIMIT_PROFILE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!profile) {
      return true;
    }

    const profiles = this.securityService.getRateLimitConfig().profiles as Record<
      string,
      { ttlSeconds: number; limit: number }
    >;
    const profileConfig = profiles[profile];
    if (!profileConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ ip?: string; headers: Record<string, string | undefined> }>();
    const key = `${profile}:${request.ip ?? request.headers['x-forwarded-for'] ?? 'unknown'}`;
    const now = Date.now();
    if (process.env.NODE_ENV === 'test') {
      const current = this.records.get(key);

      if (!current || current.resetAt <= now) {
        this.records.set(key, {
          count: 1,
          resetAt: now + profileConfig.ttlSeconds * 1000,
        });
        return true;
      }

      if (current.count >= profileConfig.limit) {
        this.metricsService.increment('security.rate_limit.triggered');
        throw new HttpException(`Rate limit exceeded for profile ${profile}`, 429);
      }

      current.count += 1;
      this.records.set(key, current);
      return true;
    }

    const redisKey = `rate-limit:${key}`;
    const multi = this.cacheService.client.multi();
    multi.incr(redisKey);
    multi.ttl(redisKey);
    const result = await multi.exec();
    const countTuple = result?.[0];
    const ttlTuple = result?.[1];
    const count = Number(countTuple?.[1] ?? 0);
    const ttl = Number(ttlTuple?.[1] ?? -1);

    if (ttl < 0) {
      await this.cacheService.client.expire(redisKey, profileConfig.ttlSeconds);
    }

    if (count > profileConfig.limit) {
      this.metricsService.increment('security.rate_limit.triggered');
      throw new HttpException(`Rate limit exceeded for profile ${profile}`, 429);
    }

    return true;
  }
}
