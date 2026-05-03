import { TrustedHostService } from './trusted-host.service';

type FindAllowedOriginHost = (host: string) => Promise<boolean>;

export function createCorsOriginValidator(
  trustedHostService: TrustedHostService,
  findAllowedOriginHost: FindAllowedOriginHost,
) {
  return async (origin: string | undefined) => {
    if (!origin) {
      return false;
    }

    let host: string;
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'https:') return false;
      host = parsed.hostname;
    } catch {
      return false;
    }

    const classification = trustedHostService.classify(host);

    if (classification.type === 'platform' || classification.type === 'tenant-storefront') {
      return true;
    }

    if (classification.customDomain) {
      try {
        return await findAllowedOriginHost(host);
      } catch {
        return false;
      }
    }

    return false;
  };
}
