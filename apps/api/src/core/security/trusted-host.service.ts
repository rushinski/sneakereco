import { Inject, Injectable } from '@nestjs/common';

import { DOMAIN_CONFIG } from '../config/config.module';
import type { DomainConfig } from '../config/domain.config';

export interface HostClassification {
  type: 'platform' | 'api' | 'tenant-storefront' | 'unknown';
  tenantSlug: string | null;
  customDomain: boolean;
}

const RESERVED_SUBDOMAINS = new Set(['api', 'dashboard', 'www']);

@Injectable()
export class TrustedHostService {
  private readonly baseDomain: string;
  private readonly platformDashboardHost: string;

  constructor(@Inject(DOMAIN_CONFIG) domainConfig: DomainConfig) {
    this.baseDomain = domainConfig.baseDomain;
    try {
      this.platformDashboardHost = new URL(domainConfig.platformDashboardUrl).hostname;
    } catch {
      this.platformDashboardHost = domainConfig.baseDomain;
    }
  }

  classify(host: string): HostClassification {
    const bare = (host.split(':')[0] ?? host).toLowerCase();

    if (bare === this.platformDashboardHost) {
      return { type: 'platform', tenantSlug: null, customDomain: false };
    }

    if (bare === `api.${this.baseDomain}`) {
      return { type: 'api', tenantSlug: null, customDomain: false };
    }

    if (bare.endsWith(`.${this.baseDomain}`)) {
      const slug = bare.slice(0, bare.length - this.baseDomain.length - 1);
      if (RESERVED_SUBDOMAINS.has(slug)) {
        return { type: 'unknown', tenantSlug: null, customDomain: false };
      }
      return { type: 'tenant-storefront', tenantSlug: slug, customDomain: false };
    }

    return { type: 'unknown', tenantSlug: null, customDomain: true };
  }
}
