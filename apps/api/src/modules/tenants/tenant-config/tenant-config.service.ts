import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, or } from 'drizzle-orm';
import { generateId } from '@sneakereco/shared';
import { tenantDomainConfig, tenantThemeConfig, tenants } from '@sneakereco/db';

import { DatabaseService } from '../../../core/database/database.service';

export interface TenantConfigResult {
  tenant: {
    id: string;
    name: string;
    slug: string;
    businessName: string | null;
    status: string;
  };
  theme: {
    colorPrimary: string;
    colorSecondary: string;
    colorAccent: string;
    colorBackground: string;
    colorSurface: string;
    colorText: string;
    colorTextMuted: string;
    colorBorder: string;
    colorError: string;
    colorSuccess: string;
    fontHeading: string;
    fontBody: string;
    logoUrl: string | null;
    logoWidth: number;
    faviconUrl: string | null;
    headerVariant: string;
    heroVariant: string;
    productCardVariant: string;
    footerVariant: string;
    filterVariant: string;
    maxContentWidth: string;
    borderRadius: string;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
    heroCtaText: string | null;
    heroCtaLink: string | null;
    showAboutPage: boolean;
    showContactPage: boolean;
    authVariant: string;
    authHeadline: string | null;
    authDescription: string | null;
  };
  routing: {
    canonicalHost: string;
    canonicalCustomerHost: string;
    managedCustomerHost: string;
    canonicalAdminHost: string | null;
    isCanonicalHost: boolean;
  };
}

export interface UpdateThemeInput {
  colorPrimary?: string;
  colorSecondary?: string;
  colorAccent?: string;
  colorBackground?: string;
  colorSurface?: string;
  colorText?: string;
  colorTextMuted?: string;
  colorBorder?: string;
  fontHeading?: string;
  fontBody?: string;
  borderRadius?: string;
  authVariant?: 'simple' | 'bold';
  authHeadline?: string | null;
  authDescription?: string | null;
}

const THEME_DEFAULTS = {
  colorPrimary: '#000000',
  colorSecondary: '#666666',
  colorAccent: '#2563EB',
  colorBackground: '#FFFFFF',
  colorSurface: '#F9FAFB',
  colorText: '#111827',
  colorTextMuted: '#6B7280',
  colorBorder: '#E5E7EB',
  colorError: '#EF4444',
  colorSuccess: '#22C55E',
  fontHeading: 'Inter',
  fontBody: 'Inter',
  logoUrl: null,
  logoWidth: 120,
  faviconUrl: null,
  headerVariant: 'classic',
  heroVariant: 'full_width',
  productCardVariant: 'standard',
  footerVariant: 'standard',
  filterVariant: 'sidebar',
  maxContentWidth: '1280px',
  borderRadius: '8px',
  heroTitle: null,
  heroSubtitle: null,
  heroImageUrl: null,
  heroCtaText: 'Shop Now',
  heroCtaLink: '/shop',
  showAboutPage: true,
  showContactPage: true,
  authVariant: 'simple' as const satisfies 'simple' | 'bold',
  authHeadline: null as null,
  authDescription: null as null,
} as const;

@Injectable()
export class TenantConfigService {
  private readonly baseDomain: string;

  constructor(
    private readonly db: DatabaseService,
    config: ConfigService,
  ) {
    this.baseDomain = new URL(config.getOrThrow<string>('PLATFORM_URL')).hostname.toLowerCase();
  }

  /**
   * Fetch tenant config by tenant ID, slug, or public host.
   * Used by the web app admin login page (public, no auth).
   * Returns default theme values if no tenant_theme_config row exists yet.
   */
  async getConfig(
    input: string | { host?: string; slug?: string },
  ): Promise<TenantConfigResult | null> {
    const normalizedInput = typeof input === 'string' ? { slug: input } : input;
    const normalizedHost = this.normalizeHost(normalizedInput.host);

    const result = await this.db.withSystemContext(async (tx) => {
      const domainRow = normalizedHost ? await this.resolveDomainByHost(tx, normalizedHost) : null;

      const [tenantRow] = domainRow
        ? await tx.select().from(tenants).where(eq(tenants.id, domainRow.tenantId)).limit(1)
        : await tx
            .select()
            .from(tenants)
            .where(
              or(
                eq(tenants.id, normalizedInput.slug ?? ''),
                eq(tenants.slug, normalizedInput.slug ?? ''),
              ),
            )
            .limit(1);

      if (!tenantRow) {
        return null;
      }

      const [themeRow] = await tx
        .select()
        .from(tenantThemeConfig)
        .where(eq(tenantThemeConfig.tenantId, tenantRow.id))
        .limit(1);

      const [resolvedDomainRow] = domainRow
        ? [domainRow]
        : await tx
            .select({
              tenantId: tenantDomainConfig.tenantId,
              subdomain: tenantDomainConfig.subdomain,
              customDomain: tenantDomainConfig.customDomain,
              adminDomain: tenantDomainConfig.adminDomain,
            })
            .from(tenantDomainConfig)
            .where(eq(tenantDomainConfig.tenantId, tenantRow.id))
            .limit(1);

      return { tenant: tenantRow, theme: themeRow ?? null, domain: resolvedDomainRow ?? null };
    });

    if (!result) {
      return null;
    }

    const { tenant, theme, domain } = result;
    const managedCustomerHost =
      `${domain?.subdomain ?? tenant.slug}.${this.baseDomain}`.toLowerCase();
    const canonicalCustomerHost = (domain?.customDomain ?? managedCustomerHost).toLowerCase();
    const canonicalAdminHost = domain?.adminDomain?.toLowerCase() ?? null;
    const canonicalHost =
      normalizedHost && canonicalAdminHost && normalizedHost === canonicalAdminHost
        ? canonicalAdminHost
        : canonicalCustomerHost;
    const isCanonicalHost = normalizedHost ? normalizedHost === canonicalHost : true;

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        businessName: tenant.businessName,
        status: tenant.status,
      },
      theme: {
        colorPrimary: theme?.colorPrimary ?? THEME_DEFAULTS.colorPrimary,
        colorSecondary: theme?.colorSecondary ?? THEME_DEFAULTS.colorSecondary,
        colorAccent: theme?.colorAccent ?? THEME_DEFAULTS.colorAccent,
        colorBackground: theme?.colorBackground ?? THEME_DEFAULTS.colorBackground,
        colorSurface: theme?.colorSurface ?? THEME_DEFAULTS.colorSurface,
        colorText: theme?.colorText ?? THEME_DEFAULTS.colorText,
        colorTextMuted: theme?.colorTextMuted ?? THEME_DEFAULTS.colorTextMuted,
        colorBorder: theme?.colorBorder ?? THEME_DEFAULTS.colorBorder,
        colorError: theme?.colorError ?? THEME_DEFAULTS.colorError,
        colorSuccess: theme?.colorSuccess ?? THEME_DEFAULTS.colorSuccess,
        fontHeading: theme?.fontHeading ?? THEME_DEFAULTS.fontHeading,
        fontBody: theme?.fontBody ?? THEME_DEFAULTS.fontBody,
        logoUrl: theme?.logoUrl ?? THEME_DEFAULTS.logoUrl,
        logoWidth: theme?.logoWidth ?? THEME_DEFAULTS.logoWidth,
        faviconUrl: theme?.faviconUrl ?? THEME_DEFAULTS.faviconUrl,
        headerVariant: theme?.headerVariant ?? THEME_DEFAULTS.headerVariant,
        heroVariant: theme?.heroVariant ?? THEME_DEFAULTS.heroVariant,
        productCardVariant: theme?.productCardVariant ?? THEME_DEFAULTS.productCardVariant,
        footerVariant: theme?.footerVariant ?? THEME_DEFAULTS.footerVariant,
        filterVariant: theme?.filterVariant ?? THEME_DEFAULTS.filterVariant,
        maxContentWidth: theme?.maxContentWidth ?? THEME_DEFAULTS.maxContentWidth,
        borderRadius: theme?.borderRadius ?? THEME_DEFAULTS.borderRadius,
        heroTitle: theme?.heroTitle ?? THEME_DEFAULTS.heroTitle,
        heroSubtitle: theme?.heroSubtitle ?? THEME_DEFAULTS.heroSubtitle,
        heroImageUrl: theme?.heroImageUrl ?? THEME_DEFAULTS.heroImageUrl,
        heroCtaText: theme?.heroCtaText ?? THEME_DEFAULTS.heroCtaText,
        heroCtaLink: theme?.heroCtaLink ?? THEME_DEFAULTS.heroCtaLink,
        showAboutPage: theme?.showAboutPage ?? THEME_DEFAULTS.showAboutPage,
        showContactPage: theme?.showContactPage ?? THEME_DEFAULTS.showContactPage,
        authVariant: theme?.authVariant ?? THEME_DEFAULTS.authVariant,
        authHeadline: theme?.authHeadline ?? THEME_DEFAULTS.authHeadline,
        authDescription: theme?.authDescription ?? THEME_DEFAULTS.authDescription,
      },
      routing: {
        canonicalHost,
        canonicalCustomerHost,
        managedCustomerHost,
        canonicalAdminHost,
        isCanonicalHost,
      },
    };
  }

  /**
   * Upsert tenant theme config. Creates the row if it doesn't exist yet.
   * Must be called with system context to bypass RLS (the caller supplies tenantId).
   */
  async updateTheme(tenantId: string, input: UpdateThemeInput): Promise<void> {
    await this.db.withSystemContext(async (tx) => {
      const [existing] = await tx
        .select({ id: tenantThemeConfig.id })
        .from(tenantThemeConfig)
        .where(eq(tenantThemeConfig.tenantId, tenantId))
        .limit(1);

      if (existing) {
        await tx
          .update(tenantThemeConfig)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(tenantThemeConfig.tenantId, tenantId));
      } else {
        await tx.insert(tenantThemeConfig).values({
          id: generateId('tenantThemeConfig'),
          tenantId,
          ...input,
        });
      }
    });
  }

  private normalizeHost(host: string | undefined): string | null {
    if (!host) {
      return null;
    }

    try {
      const parsed = host.includes('://') ? new URL(host) : new URL(`https://${host}`);
      return parsed.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  private async resolveDomainByHost(
    tx: Parameters<Parameters<DatabaseService['withSystemContext']>[0]>[0],
    host: string,
  ): Promise<{
    tenantId: string;
    subdomain: string;
    customDomain: string | null;
    adminDomain: string | null;
  } | null> {
    if (host.endsWith(`.${this.baseDomain}`)) {
      const withoutAdminPrefix = host.startsWith('admin.') ? host.slice('admin.'.length) : host;
      const subdomain = withoutAdminPrefix.replace(new RegExp(`\\.${this.baseDomain}$`, 'i'), '');

      if (!subdomain || subdomain === 'www' || subdomain === 'dashboard') {
        return null;
      }

      const [domainRow] = await tx
        .select({
          tenantId: tenantDomainConfig.tenantId,
          subdomain: tenantDomainConfig.subdomain,
          customDomain: tenantDomainConfig.customDomain,
          adminDomain: tenantDomainConfig.adminDomain,
        })
        .from(tenantDomainConfig)
        .where(eq(tenantDomainConfig.subdomain, subdomain))
        .limit(1);

      return domainRow ?? null;
    }

    const [domainRow] = await tx
      .select({
        tenantId: tenantDomainConfig.tenantId,
        subdomain: tenantDomainConfig.subdomain,
        customDomain: tenantDomainConfig.customDomain,
        adminDomain: tenantDomainConfig.adminDomain,
      })
      .from(tenantDomainConfig)
      .where(
        or(eq(tenantDomainConfig.customDomain, host), eq(tenantDomainConfig.adminDomain, host)),
      )
      .limit(1);

    return domainRow ?? null;
  }
}
