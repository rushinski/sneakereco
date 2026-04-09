import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, or, sql } from 'drizzle-orm';
import { tenantDomainConfig } from '@sneakereco/db';

import { DatabaseService } from '../database/database.service';

export type OriginGroup = 'platform' | 'tenant' | 'admin' | 'unknown';

@Injectable()
export class OriginResolverService {
  private readonly platformOrigins: Set<string>;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    const platformUrl = this.normalizeOrigin(this.config.getOrThrow<string>('PLATFORM_URL'));
    const dashboardUrl = this.normalizeOrigin(this.config.get<string>('PLATFORM_DASHBOARD_URL') ?? '');

    this.platformOrigins = new Set(
      [platformUrl, dashboardUrl].filter((v): v is string => Boolean(v)),
    );
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

  async classifyOrigin(origin: string | undefined | null): Promise<OriginGroup> {
    const normalized = this.normalizeOrigin(origin);
    if (!normalized) return 'unknown';

    if (this.platformOrigins.has(normalized)) return 'platform';

    const hostname = new URL(normalized).hostname.toLowerCase();
    if (await this.isAdminHostname(hostname)) return 'admin';
    if (await this.isTenantHostname(hostname)) return 'tenant';

    return 'unknown';
  }

  private async isAdminHostname(hostname: string): Promise<boolean> {
    if (!hostname.startsWith('admin.')) return false;

    const baseHost = hostname.slice('admin.'.length);

    if (hostname.endsWith('.sneakereco.com')) {
      const subdomain = baseHost.replace(/\.sneakereco\.com$/i, '');
      const [match] = await this.db.systemDb
        .select({ id: tenantDomainConfig.id })
        .from(tenantDomainConfig)
        .where(
          or(
            eq(tenantDomainConfig.subdomain, subdomain),
            sql`lower(${tenantDomainConfig.adminDomain}) = ${hostname}`,
          ),
        )
        .limit(1);

      return Boolean(match);
    }

    const [match] = await this.db.systemDb
      .select({ id: tenantDomainConfig.id })
      .from(tenantDomainConfig)
      .where(
        or(
          sql`lower(${tenantDomainConfig.adminDomain}) = ${hostname}`,
          sql`lower(${tenantDomainConfig.customDomain}) = ${baseHost}`,
        ),
      )
      .limit(1);

    return Boolean(match);
  }

  private async isTenantHostname(hostname: string): Promise<boolean> {
    if (hostname.endsWith('.sneakereco.com')) {
      const subdomain = hostname.replace(/\.sneakereco\.com$/i, '');
      if (!subdomain || subdomain === 'sneakereco' || subdomain === 'www') {
        return false;
      }

      const [match] = await this.db.systemDb
        .select({ id: tenantDomainConfig.id })
        .from(tenantDomainConfig)
        .where(eq(tenantDomainConfig.subdomain, subdomain))
        .limit(1);

      return Boolean(match);
    }

    const [match] = await this.db.systemDb
      .select({ id: tenantDomainConfig.id })
      .from(tenantDomainConfig)
      .where(sql`lower(${tenantDomainConfig.customDomain}) = ${hostname}`)
      .limit(1);

    return Boolean(match);
  }
}