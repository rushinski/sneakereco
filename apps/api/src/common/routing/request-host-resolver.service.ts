import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ValkeyService } from '../../core/valkey/valkey.service';
import { isPlatformHostname, readPlatformHosts } from './platform-hosts';
import { RequestHostRepository } from './request-host.repository';
import type { ResolvedRequestHost } from './request-host.types';

const REQUEST_HOST_CACHE_TTL_SECONDS = 300;
const REQUEST_HOST_MISS_CACHE_TTL_SECONDS = 60;

@Injectable()
export class RequestHostResolverService {
  private readonly platformHosts;

  constructor(
    config: ConfigService,
    private readonly repository: RequestHostRepository,
    private readonly valkey: ValkeyService,
  ) {
    this.platformHosts = readPlatformHosts(config);
  }

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

    const platformHost = this.resolvePlatformHost(normalizedHost);
    if (platformHost) {
      return platformHost;
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

  isPlatformOrigin(origin: string | undefined | null): boolean {
    const normalizedOriginHost = this.normalizeOrigin(origin);
    if (!normalizedOriginHost) {
      return false;
    }

    return isPlatformHostname(normalizedOriginHost, this.platformHosts);
  }

  buildCacheKey(hostname: string): string {
    return `request-host:${hostname}`;
  }

  private resolvePlatformHost(hostname: string): ResolvedRequestHost | null {
    if (!isPlatformHostname(hostname, this.platformHosts)) {
      return null;
    }

    const isDashboardHost = hostname === this.platformHosts.dashboard;

    return {
      hostname,
      tenantId: null,
      surface: isDashboardHost ? 'platform-admin' : 'platform',
      hostKind: 'platform',
      canonicalHost: this.platformHosts.dashboard,
      isCanonicalHost: hostname === this.platformHosts.dashboard,
      redirectToHostname: isDashboardHost ? null : this.platformHosts.dashboard,
      status: 'active',
    };
  }
}
