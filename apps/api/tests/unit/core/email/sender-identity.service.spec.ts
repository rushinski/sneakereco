import { Test } from '@nestjs/testing';

import { LoggerService } from '../../../../src/core/observability/logging/logger.service';
import { SenderIdentityService } from '../../../../src/core/email/sender-identity.service';
import { TenantBusinessProfileRepository } from '../../../../src/modules/tenants/tenant-business-profile.repository';
import { TenantDomainConfigRepository } from '../../../../src/modules/tenants/tenant-domain-config.repository';
import { TenantRepository } from '../../../../src/modules/tenants/tenant.repository';

describe('SenderIdentityService', () => {
  async function createService() {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SenderIdentityService,
        TenantRepository,
        TenantBusinessProfileRepository,
        TenantDomainConfigRepository,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    return {
      service: moduleRef.get(SenderIdentityService),
      tenantRepository: moduleRef.get(TenantRepository),
      businessProfileRepository: moduleRef.get(TenantBusinessProfileRepository),
      domainConfigRepository: moduleRef.get(TenantDomainConfigRepository),
    };
  }

  it('uses the custom domain sender when the storefront custom domain is ready', async () => {
    const { service, tenantRepository, businessProfileRepository, domainConfigRepository } =
      await createService();

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
      await createService();

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