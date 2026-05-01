import { SecurityService } from './security.service';

type FindAllowedOriginHost = (host: string) => Promise<boolean>;

export function createCorsOriginValidator(
  securityService: SecurityService,
  findAllowedOriginHost: FindAllowedOriginHost,
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

      return await findAllowedOriginHost(parsed.hostname);
    } catch {
      return false;
    }
  };
}
