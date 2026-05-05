import type { ConfigService } from '@nestjs/config';

export interface PlatformHosts {
  platform: string;
  dashboard: string;
}

function normalizeHost(value: string): string {
  const parsed = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
  return parsed.hostname.toLowerCase();
}

export function readPlatformHosts(config: ConfigService): PlatformHosts {
  const platform = normalizeHost(config.getOrThrow<string>('PLATFORM_URL'));
  const dashboardUrl = config.get<string>('PLATFORM_DASHBOARD_URL');

  return {
    platform,
    dashboard: dashboardUrl ? normalizeHost(dashboardUrl) : platform,
  };
}

export function isPlatformHostname(hostname: string, platformHosts: PlatformHosts): boolean {
  return hostname === platformHosts.platform || hostname === platformHosts.dashboard;
}
