import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, or, sql } from 'drizzle-orm';
import { tenantDomainConfig } from '@sneakereco/db';

import { DatabaseService } from '../../core/database/database.service';
import { ValkeyService } from '../../core/valkey/valkey.service';
import { ORIGIN_CACHE_TTL_SECONDS } from '../../config/security.config';

export type OriginType = 'platform' | 'tenant-admin' | 'customer' | 'unknown';

export interface OriginContext {
  origin: OriginType;
  tenantId: string | null;
  tenantSlug: string | null;
}

const CACHE_KEY_PREFIX = 'cors:origin:';

@Injectable()
export class OriginResolverService {
  private readonly platformOrigins: Set<string>;
  private readonly baseDomain: string;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly valkey: ValkeyService,
  ) {
    const platformUrl = this.normalizeOrigin(this.config.getOrThrow<string>('PLATFORM_URL'));
    const dashboardUrl = this.normalizeOrigin(this.config.get<string>('PLATFORM_DASHBOARD_URL') ?? '');

    this.platformOrigins = new Set(
      [platformUrl, dashboardUrl].filter((v): v is string => Boolean(v)),
    );

    this.baseDomain = new URL(this.config.getOrThrow<string>('PLATFORM_URL')).hostname.toLowerCase();
  }

  normalizeOrigin(origin: string | undefined | null): string | null {
    if (!origin) return null;

    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return `${parsed.protocol}//${parsed.host}`.toLowerCase();
    } catch {
      return null;
    }
  }

  isPlatformOrigin(origin: string | undefined | null): boolean {
    const normalized = this.normalizeOrigin(origin);
    return normalized ? this.platformOrigins.has(normalized) : false;
  }

  async classifyOrigin(origin: string | undefined | null): Promise<OriginContext> {
    const normalized = this.normalizeOrigin(origin);
    if (!normalized) return { origin: 'unknown', tenantId: null, tenantSlug: null };

    if (this.platformOrigins.has(normalized)) {
      return { origin: 'platform', tenantId: null, tenantSlug: null };
    }

    const hostname = new URL(normalized).hostname.toLowerCase();
    const cacheKey = `${CACHE_KEY_PREFIX}${hostname}`;

    const cached = await this.valkey.getJson<OriginContext>(cacheKey);
    if (cached) return cached;

    const context = await this.resolveFromDb(hostname);

    await this.valkey.setJson(cacheKey, context, ORIGIN_CACHE_TTL_SECONDS);

    return context;
  }

  async invalidateOriginCache(hostname: string): Promise<void> {
    await this.valkey.del(`${CACHE_KEY_PREFIX}${hostname.toLowerCase()}`);
  }

  private async resolveFromDb(hostname: string): Promise<OriginContext> {
    const adminResult = await this.resolveAdminHostname(hostname);
    if (adminResult) return { origin: 'tenant-admin', ...adminResult };

    const tenantResult = await this.resolveTenantHostname(hostname);
    if (tenantResult) return { origin: 'customer', ...tenantResult };

    return { origin: 'unknown', tenantId: null, tenantSlug: null };
  }

  private async resolveAdminHostname(
    hostname: string,
  ): Promise<{ tenantId: string; tenantSlug: string } | null> {
    if (!hostname.startsWith('admin.')) return null;

    const baseHost = hostname.slice('admin.'.length);

    if (hostname.endsWith(`.${this.baseDomain}`)) {
      const subdomain = baseHost.replace(new RegExp(`\\.${this.baseDomain}$`, 'i'), '');
      const [match] = await this.db.systemDb
        .select({ tenantId: tenantDomainConfig.tenantId, subdomain: tenantDomainConfig.subdomain })
        .from(tenantDomainConfig)
        .where(
          or(
            eq(tenantDomainConfig.subdomain, subdomain),
            sql`lower(${tenantDomainConfig.adminDomain}) = ${hostname}`,
          ),
        )
        .limit(1);

      return match ? { tenantId: match.tenantId, tenantSlug: match.subdomain } : null;
    }

    const [match] = await this.db.systemDb
      .select({ tenantId: tenantDomainConfig.tenantId, subdomain: tenantDomainConfig.subdomain })
      .from(tenantDomainConfig)
      .where(
        or(
          sql`lower(${tenantDomainConfig.adminDomain}) = ${hostname}`,
          sql`lower(${tenantDomainConfig.customDomain}) = ${baseHost}`,
        ),
      )
      .limit(1);

    return match ? { tenantId: match.tenantId, tenantSlug: match.subdomain } : null;
  }

  private async resolveTenantHostname(
    hostname: string,
  ): Promise<{ tenantId: string; tenantSlug: string } | null> {
    if (hostname.endsWith(`.${this.baseDomain}`)) {
      const subdomain = hostname.replace(new RegExp(`\\.${this.baseDomain}$`, 'i'), '');
      if (!subdomain || subdomain === 'www' || subdomain === 'dashboard') {
        return null;
      }

      const [match] = await this.db.systemDb
        .select({ tenantId: tenantDomainConfig.tenantId, subdomain: tenantDomainConfig.subdomain })
        .from(tenantDomainConfig)
        .where(eq(tenantDomainConfig.subdomain, subdomain))
        .limit(1);

      return match ? { tenantId: match.tenantId, tenantSlug: match.subdomain } : null;
    }

    const [match] = await this.db.systemDb
      .select({ tenantId: tenantDomainConfig.tenantId, subdomain: tenantDomainConfig.subdomain })
      .from(tenantDomainConfig)
      .where(sql`lower(${tenantDomainConfig.customDomain}) = ${hostname}`)
      .limit(1);

    return match ? { tenantId: match.tenantId, tenantSlug: match.subdomain } : null;
  }
}
