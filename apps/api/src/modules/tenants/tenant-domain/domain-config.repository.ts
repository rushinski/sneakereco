import { Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { tenantDomainConfig } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

export interface TenantDomainConfigRecord {
  id: string;
  tenantId: string;
  subdomain: string;
  dnsVerificationToken?: string;
  storefrontCustomDomain?: string;
  storefrontReadinessState:
    | 'not_configured'
    | 'pending_dns'
    | 'verified'
    | 'ssl_provisioning'
    | 'ready'
    | 'failed';
  adminDomain?: string;
  adminReadinessState:
    | 'not_configured'
    | 'pending_dns'
    | 'verified'
    | 'ssl_provisioning'
    | 'ready'
    | 'failed';
}

type DomainConfigRow = typeof tenantDomainConfig.$inferSelect;

@Injectable()
export class TenantDomainConfigRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(record: Omit<TenantDomainConfigRecord, 'id'>): Promise<TenantDomainConfigRecord> {
    const id = generateId('tenantDomainConfig');
    const [row] = await this.database.db
      .insert(tenantDomainConfig)
      .values({
        id,
        tenantId: record.tenantId,
        subdomain: record.subdomain,
        dnsVerificationToken: record.dnsVerificationToken ?? null,
        storefrontCustomDomain: record.storefrontCustomDomain ?? null,
        storefrontReadinessState: record.storefrontReadinessState,
        adminDomain: record.adminDomain ?? null,
        adminReadinessState: record.adminReadinessState,
      })
      .returning();
    return this.toRecord(row!);
  }

  async findByTenantId(tenantId: string): Promise<TenantDomainConfigRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenantDomainConfig)
      .where(eq(tenantDomainConfig.tenantId, tenantId))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findBySubdomain(subdomain: string): Promise<TenantDomainConfigRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenantDomainConfig)
      .where(eq(tenantDomainConfig.subdomain, subdomain))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findByCustomDomain(host: string): Promise<TenantDomainConfigRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenantDomainConfig)
      .where(
        or(
          and(
            eq(tenantDomainConfig.storefrontCustomDomain, host),
            eq(tenantDomainConfig.storefrontReadinessState, 'ready'),
          ),
          and(
            eq(tenantDomainConfig.adminDomain, host),
            eq(tenantDomainConfig.adminReadinessState, 'ready'),
          ),
        ),
      )
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findByOriginHost(host: string): Promise<TenantDomainConfigRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenantDomainConfig)
      .where(
        or(
          eq(tenantDomainConfig.subdomain, host),
          and(
            eq(tenantDomainConfig.storefrontCustomDomain, host),
            eq(tenantDomainConfig.storefrontReadinessState, 'ready'),
          ),
          and(
            eq(tenantDomainConfig.adminDomain, host),
            eq(tenantDomainConfig.adminReadinessState, 'ready'),
          ),
        ),
      )
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: DomainConfigRow): TenantDomainConfigRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      subdomain: row.subdomain,
      dnsVerificationToken: row.dnsVerificationToken ?? undefined,
      storefrontCustomDomain: row.storefrontCustomDomain ?? undefined,
      storefrontReadinessState: row.storefrontReadinessState,
      adminDomain: row.adminDomain ?? undefined,
      adminReadinessState: row.adminReadinessState,
    };
  }
}
