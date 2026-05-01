import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import { LoggerService } from '../observability/logging/logger.service';
import { TenantBusinessProfileRepository } from '../../modules/tenants/tenant-business-profile/tenant-business-profile.repository';
import { TenantDomainConfigRepository } from '../../modules/tenants/tenant-domain/tenant-domain-config.repository';
import { TenantRepository } from '../../modules/tenants/tenant-lifecycle/tenant.repository';
import type { ResolvedSenderIdentity } from './email.types';

@Injectable()
export class SenderIdentityService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantBusinessProfileRepository: TenantBusinessProfileRepository,
    private readonly tenantDomainConfigRepository: TenantDomainConfigRepository,
    private readonly logger: LoggerService,
  ) {}

  async resolve(input: { tenantId?: string; purpose: 'auth'; fallbackFromEmail: string; fallbackFromName: string }) {
    if (!input.tenantId) {
      return {
        id: generateId('tenantSenderIdentity'),
        fromEmail: input.fallbackFromEmail,
        fromName: input.fallbackFromName,
        readinessState: 'platform_fallback',
        purpose: input.purpose,
      } satisfies ResolvedSenderIdentity;
    }

    const tenant = await this.tenantRepository.findById(input.tenantId);
    const businessProfile = await this.tenantBusinessProfileRepository.findByTenantId(input.tenantId);
    const domainConfig = await this.tenantDomainConfigRepository.findByTenantId(input.tenantId);

    const fromName = businessProfile?.businessName ?? tenant?.name ?? input.fallbackFromName;

    if (domainConfig?.storefrontCustomDomain && domainConfig.storefrontReadinessState === 'ready') {
      return {
        id: generateId('tenantSenderIdentity'),
        tenantId: input.tenantId,
        purpose: input.purpose,
        fromName,
        fromEmail: `auth@${domainConfig.storefrontCustomDomain}`,
        replyTo: businessProfile?.contactEmail,
        readinessState: 'custom_domain_ready',
      } satisfies ResolvedSenderIdentity;
    }

    if (domainConfig?.subdomain) {
      this.logger.log('Falling back to SneakerEco-managed sender identity', {
        eventName: 'auth.email.sender.fallback_used',
        tenantId: input.tenantId,
        metadata: {
          subdomain: domainConfig.subdomain,
        },
      });

      return {
        id: generateId('tenantSenderIdentity'),
        tenantId: input.tenantId,
        purpose: input.purpose,
        fromName,
        fromEmail: `auth@${domainConfig.subdomain}`,
        replyTo: businessProfile?.contactEmail,
        readinessState: 'managed_subdomain_ready',
      } satisfies ResolvedSenderIdentity;
    }

    return {
      id: generateId('tenantSenderIdentity'),
      tenantId: input.tenantId,
      purpose: input.purpose,
      fromName,
      fromEmail: input.fallbackFromEmail,
      replyTo: businessProfile?.contactEmail,
      readinessState: 'platform_fallback',
    } satisfies ResolvedSenderIdentity;
  }
}
