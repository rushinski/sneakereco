import { envSchema } from './env.schema';

function splitOrigins(value?: string) {
  return value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
}

export function getDomainConfig(env: Record<string, string | undefined>) {
  const parsed = envSchema.parse(env);

  return {
    baseDomain: parsed.BASE_DOMAIN,
    apiBaseUrl: parsed.API_BASE_URL,
    platformUrl: parsed.PLATFORM_URL,
    platformDashboardUrl: parsed.PLATFORM_DASHBOARD_URL,
    staticAllowedOrigins: splitOrigins(parsed.STATIC_ALLOWED_ORIGINS),
  };
}

export type DomainConfig = ReturnType<typeof getDomainConfig>;