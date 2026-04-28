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

export interface TenantHostContext {
  tenantId: string;
  tenantSlug: string;
  subdomain: string;
  customDomain: string | null;
  adminDomain: string | null;
}

const CACHE_KEY_PREFIX = 'cors:origin:';

@Injectable()
export class OriginResolverService {
  private readonly platformOrigins: Set<string>;
  private readonly baseDomain: string;
  private readonly platformHost: string;
  private readonly dashboardHost: string;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly valkey: ValkeyService,
  ) {
    const platformUrl = this.normalizeOrigin(this.config.getOrThrow<string>('PLATFORM_URL'));
    const dashboardUrl = this.normalizeOrigin(
      this.config.get<string>('PLATFORM_DASHBOARD_URL') ?? '',
    );

    this.platformOrigins = new Set(
      [platformUrl, dashboardUrl].filter((v): v is string => Boolean(v)),
    );

    this.platformHost = new URL(
      this.config.getOrThrow<string>('PLATFORM_URL'),
    ).hostname.toLowerCase();
    this.dashboardHost = dashboardUrl
      ? new URL(dashboardUrl).hostname.toLowerCase()
      : this.platformHost;
    this.baseDomain = this.platformHost;
  }

  normalizeOrigin(origin: string | undefined | null): string | null {
    if (!origin) {
      return null;
    }

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

  getPlatformHosts(): { platform: string; dashboard: string } {
    return {
      platform: this.platformHost,
      dashboard: this.dashboardHost,
    };
  }

  async classifyOrigin(origin: string | undefined | null): Promise<OriginContext> {
    const normalized = this.normalizeOrigin(origin);
    if (!normalized) {
      return { origin: 'unknown', tenantId: null, tenantSlug: null };
    }

    if (this.platformOrigins.has(normalized)) {
      return { origin: 'platform', tenantId: null, tenantSlug: null };
    }

    const hostname = new URL(normalized).hostname.toLowerCase();
    const cacheKey = `${CACHE_KEY_PREFIX}${hostname}`;

    const cached = await this.valkey.getJson<OriginContext>(cacheKey);
    if (cached) {
      return cached;
    }

    const context = await this.resolveFromDb(hostname);

    await this.valkey.setJson(cacheKey, context, ORIGIN_CACHE_TTL_SECONDS);

    return context;
  }

  async invalidateOriginCache(hostname: string): Promise<void> {
    await this.valkey.del(`${CACHE_KEY_PREFIX}${hostname.toLowerCase()}`);
  }

  async resolveTenantByHost(hostname: string): Promise<TenantHostContext | null> {
    const normalizedHost = this.normalizeHost(hostname);
    if (
      !normalizedHost ||
      normalizedHost === this.platformHost ||
      normalizedHost === this.dashboardHost
    ) {
      return null;
    }

    return this.resolveTenantRecord(normalizedHost);
  }

  private async resolveFromDb(hostname: string): Promise<OriginContext> {
    const tenant = await this.resolveTenantRecord(hostname);
    if (!tenant) {
      return { origin: 'unknown', tenantId: null, tenantSlug: null };
    }

    if (
      (tenant.adminDomain && tenant.adminDomain.toLowerCase() === hostname) ||
      this.isManagedAdminHostname(hostname, tenant.subdomain)
    ) {
      return { origin: 'tenant-admin', tenantId: tenant.tenantId, tenantSlug: tenant.tenantSlug };
    }

    return { origin: 'customer', tenantId: tenant.tenantId, tenantSlug: tenant.tenantSlug };
  }

  private isManagedAdminHostname(hostname: string, subdomain: string): boolean {
    return hostname === `admin.${subdomain}.${this.baseDomain}`.toLowerCase();
  }

  private async resolveTenantRecord(hostname: string): Promise<TenantHostContext | null> {
    const normalizedHostname = hostname.toLowerCase();

    if (normalizedHostname.endsWith(`.${this.baseDomain}`)) {
      const withoutAdminPrefix = normalizedHostname.startsWith('admin.')
        ? normalizedHostname.slice('admin.'.length)
        : normalizedHostname;
      const subdomain = withoutAdminPrefix.replace(new RegExp(`\\.${this.baseDomain}$`, 'i'), '');

      if (!subdomain || subdomain === 'www' || subdomain === 'dashboard') {
        return null;
      }

      const [match] = await this.db.systemDb
        .select({
          tenantId: tenantDomainConfig.tenantId,
          tenantSlug: tenantDomainConfig.subdomain,
          subdomain: tenantDomainConfig.subdomain,
          customDomain: tenantDomainConfig.customDomain,
          adminDomain: tenantDomainConfig.adminDomain,
        })
        .from(tenantDomainConfig)
        .where(
          or(
            eq(tenantDomainConfig.subdomain, subdomain),
            sql`lower(${tenantDomainConfig.adminDomain}) = ${normalizedHostname}`,
            sql`lower(${tenantDomainConfig.customDomain}) = ${normalizedHostname}`,
          ),
        )
        .limit(1);

      return match ?? null;
    }

    const baseHost = normalizedHostname.startsWith('admin.')
      ? normalizedHostname.slice('admin.'.length)
      : normalizedHostname;

    const [match] = await this.db.systemDb
      .select({
        tenantId: tenantDomainConfig.tenantId,
        tenantSlug: tenantDomainConfig.subdomain,
        subdomain: tenantDomainConfig.subdomain,
        customDomain: tenantDomainConfig.customDomain,
        adminDomain: tenantDomainConfig.adminDomain,
      })
      .from(tenantDomainConfig)
      .where(
        normalizedHostname.startsWith('admin.')
          ? or(
              sql`lower(${tenantDomainConfig.adminDomain}) = ${normalizedHostname}`,
              sql`lower(${tenantDomainConfig.customDomain}) = ${baseHost}`,
            )
          : or(
              sql`lower(${tenantDomainConfig.customDomain}) = ${normalizedHostname}`,
              sql`lower(${tenantDomainConfig.adminDomain}) = ${normalizedHostname}`,
            ),
      )
      .limit(1);

    return match ?? null;
  }
}
