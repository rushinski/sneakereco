import { SenderIdentityService } from '../../../../src/core/email/sender-identity.service';
import type { TenantRecord } from '../../../../src/modules/tenants/tenant-lifecycle/tenant.repository';
import type { TenantBusinessProfileRecord } from '../../../../src/modules/tenants/tenant-business-profile/tenant-business-profile.repository';
import type { TenantDomainConfigRecord } from '../../../../src/modules/tenants/tenant-domain/tenant-domain-config.repository';
import { generateId } from '@sneakereco/shared';

class FakeTenantRepository {
  private records = new Map<string, TenantRecord>();
  async create(record: Omit<TenantRecord, 'id'>) {
    const tenant: TenantRecord = { id: generateId('tenant'), ...record };
    this.records.set(tenant.id, tenant);
    return tenant;
  }
  async findById(id: string) { return this.records.get(id) ?? null; }
  async findBySlug(slug: string) { return [...this.records.values()].find((r) => r.slug === slug) ?? null; }
  async update() { return null; }
}

class FakeTenantBusinessProfileRepository {
  private records = new Map<string, TenantBusinessProfileRecord>();
  async create(record: Omit<TenantBusinessProfileRecord, 'id'>) {
    const profile: TenantBusinessProfileRecord = { id: generateId('tbp'), ...record };
    this.records.set(profile.id, profile);
    return profile;
  }
  async findByTenantId(tenantId: string) {
    return [...this.records.values()].find((r) => r.tenantId === tenantId) ?? null;
  }
}

class FakeTenantDomainConfigRepository {
  private records = new Map<string, TenantDomainConfigRecord>();
  async create(record: Omit<TenantDomainConfigRecord, 'id'>) {
    const config: TenantDomainConfigRecord = { id: generateId('tdc'), ...record };
    this.records.set(config.id, config);
    return config;
  }
  async findByTenantId(tenantId: string) {
    return [...this.records.values()].find((r) => r.tenantId === tenantId) ?? null;
  }
  async findBySubdomain() { return null; }
  async findByCustomDomain() { return null; }
  async findByOriginHost() { return null; }
}

function makeService() {
  const tenantRepository = new FakeTenantRepository();
  const businessProfileRepository = new FakeTenantBusinessProfileRepository();
  const domainConfigRepository = new FakeTenantDomainConfigRepository();
  const logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  const service = new SenderIdentityService(
    tenantRepository as never,
    businessProfileRepository as never,
    domainConfigRepository as never,
    logger as never,
  );
  return { service, tenantRepository, businessProfileRepository, domainConfigRepository };
}

describe('SenderIdentityService', () => {
  it('uses the custom domain sender when the storefront custom domain is ready', async () => {
    const { service, tenantRepository, businessProfileRepository, domainConfigRepository } =
      makeService();

    const tenant = await tenantRepository.create({
      name: 'Heat Kings',
      slug: 'heat-kings',
      email: 'owner@heatkings.com',
      status: 'active',
    });
    await businessProfileRepository.create({
      tenantId: tenant.id,
      businessName: 'Heat Kings',
      contactEmail: 'support@heatkings.com',
    });
    await domainConfigRepository.create({
      tenantId: tenant.id,
      subdomain: 'heat-kings.sneakereco.com',
      storefrontCustomDomain: 'heatkings.com',
      storefrontReadinessState: 'ready',
      adminReadinessState: 'not_configured',
    });

    await expect(
      service.resolve({
        tenantId: tenant.id,
        purpose: 'auth',
        fallbackFromEmail: 'noreply@sneakereco.com',
        fallbackFromName: 'SneakerEco',
      }),
    ).resolves.toMatchObject({
      fromEmail: 'auth@heatkings.com',
      fromName: 'Heat Kings',
      readinessState: 'custom_domain_ready',
      replyTo: 'support@heatkings.com',
    });
  });

  it('falls back to the SneakerEco-managed subdomain sender when the custom domain is not ready', async () => {
    const { service, tenantRepository, businessProfileRepository, domainConfigRepository } =
      makeService();

    const tenant = await tenantRepository.create({
      name: 'Heat Kings',
      slug: 'heat-kings',
      email: 'owner@heatkings.com',
      status: 'active',
    });
    await businessProfileRepository.create({
      tenantId: tenant.id,
      businessName: 'Heat Kings',
      contactEmail: 'support@heatkings.com',
    });
    await domainConfigRepository.create({
      tenantId: tenant.id,
      subdomain: 'heat-kings.sneakereco.com',
      storefrontCustomDomain: 'heatkings.com',
      storefrontReadinessState: 'pending_dns',
      adminReadinessState: 'not_configured',
    });

    await expect(
      service.resolve({
        tenantId: tenant.id,
        purpose: 'auth',
        fallbackFromEmail: 'noreply@sneakereco.com',
        fallbackFromName: 'SneakerEco',
      }),
    ).resolves.toMatchObject({
      fromEmail: 'auth@heat-kings.sneakereco.com',
      fromName: 'Heat Kings',
      readinessState: 'managed_subdomain_ready',
    });
  });
});
