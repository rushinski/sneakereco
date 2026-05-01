import { TenantDomainConfigRepository } from '../../modules/tenants/tenant-domain-config.repository';
import { SecurityService } from './security.service';

export function createCorsOriginValidator(
  securityService: SecurityService,
  tenantDomainConfigRepository: TenantDomainConfigRepository,
) {
  return async (origin: string | undefined) => {
    if (!origin) {
      return true;
    }

    if (securityService.isKnownPlatformOrigin(origin)) {
      return true;
    }

    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'https:') {
        return false;
      }

      if (securityService.isBaseDomainHost(parsed.hostname)) {
        return true;
      }

      return (await tenantDomainConfigRepository.findByOriginHost(parsed.hostname)) !== null;
    } catch {
      return false;
    }
  };
}
