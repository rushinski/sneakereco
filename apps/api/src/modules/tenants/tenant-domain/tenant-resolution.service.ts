import { Injectable } from '@nestjs/common';

import { TrustedHostService } from '../../../core/security/trusted-host.service';
import { TenantDomainConfigRepository } from './domain-config.repository';

export interface TenantResolutionResult {
  tenantId: string | null;
  source: 'subdomain' | 'custom-domain' | 'platform';
  slug: string | null;
}

@Injectable()
export class TenantResolutionService {
  constructor(
    private readonly domainConfigRepo: TenantDomainConfigRepository,
    private readonly trustedHostService: TrustedHostService,
  ) {}

  async resolveFromHost(host: string): Promise<TenantResolutionResult | null> {
    const classification = this.trustedHostService.classify(host);

    if (classification.type === 'platform') {
      return { tenantId: null, source: 'platform', slug: null };
    }

    if (classification.type === 'tenant-storefront' && classification.tenantSlug) {
      const config = await this.domainConfigRepo.findBySubdomain(classification.tenantSlug);
      if (!config) return null;
      return { tenantId: config.tenantId, source: 'subdomain', slug: classification.tenantSlug };
    }

    if (classification.customDomain) {
      const config = await this.domainConfigRepo.findByCustomDomain(host);
      if (!config) return null;
      return { tenantId: config.tenantId, source: 'custom-domain', slug: config.subdomain };
    }

    return null;
  }
}
