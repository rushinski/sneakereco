import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

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

@Injectable()
export class TenantDomainConfigRepository {
  private readonly records = new Map<string, TenantDomainConfigRecord>();

  async create(record: Omit<TenantDomainConfigRecord, 'id'>) {
    const created: TenantDomainConfigRecord = {
      id: generateId('tenantDomainConfig'),
      ...record,
    };
    this.records.set(created.id, created);
    return created;
  }

  async findByTenantId(tenantId: string) {
    return [...this.records.values()].find((record) => record.tenantId === tenantId) ?? null;
  }

  async findByOriginHost(host: string) {
    return (
      [...this.records.values()].find(
        (record) =>
          record.subdomain === host ||
          (record.storefrontCustomDomain === host && record.storefrontReadinessState === 'ready') ||
          (record.adminDomain === host && record.adminReadinessState === 'ready'),
      ) ?? null
    );
  }
}