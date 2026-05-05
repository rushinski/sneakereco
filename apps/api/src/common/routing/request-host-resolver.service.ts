import { Injectable } from '@nestjs/common';

import { ValkeyService } from '../../core/valkey/valkey.service';
import { RequestHostRepository } from './request-host.repository';
import type { ResolvedRequestHost } from './request-host.types';

const REQUEST_HOST_CACHE_TTL_SECONDS = 300;
const REQUEST_HOST_MISS_CACHE_TTL_SECONDS = 60;

@Injectable()
export class RequestHostResolverService {
  constructor(
    private readonly repository: RequestHostRepository,
    private readonly valkey: ValkeyService,
  ) {}

  normalizeHost(host: string | undefined | null): string | null {
    if (!host) {
      return null;
    }

    try {
      const parsed = host.includes('://') ? new URL(host) : new URL(`https://${host}`);
      return parsed.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  normalizeOrigin(origin: string | undefined | null): string | null {
    if (!origin) {
      return null;
    }

    try {
      return new URL(origin).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  async resolveHost(host: string | undefined | null): Promise<ResolvedRequestHost | null> {
    const normalizedHost = this.normalizeHost(host);
    if (!normalizedHost) {
      return null;
    }

    const cacheKey = this.buildCacheKey(normalizedHost);
    const cached = await this.valkey.getJson<ResolvedRequestHost | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const row = await this.repository.findByHostname(normalizedHost);
    if (!row) {
      await this.valkey.setJson(cacheKey, null, REQUEST_HOST_MISS_CACHE_TTL_SECONDS);
      return null;
    }

    const resolved: ResolvedRequestHost = {
      hostname: row.hostname,
      tenantId: row.tenantId,
      surface: row.surface,
      hostKind: row.hostKind,
      canonicalHost: row.isCanonical ? row.hostname : (row.redirectToHostname ?? row.hostname),
      isCanonicalHost: row.isCanonical,
      redirectToHostname: row.redirectToHostname,
      status: row.status,
    };

    await this.valkey.setJson(cacheKey, resolved, REQUEST_HOST_CACHE_TTL_SECONDS);
    return resolved;
  }

  async resolveOrigin(origin: string | undefined | null): Promise<ResolvedRequestHost | null> {
    const normalizedOriginHost = this.normalizeOrigin(origin);
    if (!normalizedOriginHost) {
      return null;
    }

    return this.resolveHost(normalizedOriginHost);
  }

  buildCacheKey(hostname: string): string {
    return `request-host:${hostname}`;
  }
}
