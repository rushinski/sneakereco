import { Injectable } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { generateId } from '@sneakereco/shared';
import { tenantThemeConfig, tenants } from '@sneakereco/db';

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
  constructor(private readonly db: DatabaseService) {}

  /**
   * Fetch tenant config by tenant ID or slug.
   * Used by the web app admin login page (public, no auth).
   * Returns default theme values if no tenant_theme_config row exists yet.
   */
  async getConfig(tenantIdOrSlug: string): Promise<TenantConfigResult | null> {
    const result = await this.db.withSystemContext(async (tx) => {
      // Resolve tenant by id or slug (id has prefix 'tnt_', slug is plain text)
      const [tenantRow] = await tx
        .select()
        .from(tenants)
        .where(
          or(
            eq(tenants.id, tenantIdOrSlug),
            eq(tenants.slug, tenantIdOrSlug),
          ),
        )
        .limit(1);

      if (!tenantRow) return null;

      const [themeRow] = await tx
        .select()
        .from(tenantThemeConfig)
        .where(eq(tenantThemeConfig.tenantId, tenantRow.id))
        .limit(1);

      return { tenant: tenantRow, theme: themeRow ?? null };
    });

    if (!result) return null;

    const { tenant, theme } = result;

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
}
