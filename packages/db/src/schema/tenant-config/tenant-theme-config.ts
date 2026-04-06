import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createdAtColumn, updatedAtColumn } from "../shared/columns";
import { tenants } from "../identity/tenants";

export const tenantThemeHeaderVariantValues = [
  "classic",
  "minimal",
  "centered",
] as const;

export const tenantThemeHeroVariantValues = [
  "full_width",
  "split",
  "slider",
  "none",
] as const;

export const tenantThemeProductCardVariantValues = [
  "standard",
  "minimal",
  "detailed",
] as const;

export const tenantThemeFooterVariantValues = [
  "standard",
  "minimal",
  "extended",
] as const;

export const tenantThemeFilterVariantValues = [
  "sidebar",
  "top_bar",
  "drawer",
] as const;

export const tenantThemeConfig = pgTable(
  "tenant_theme_config",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    colorPrimary: text("color_primary").notNull().default("#000000"),
    colorSecondary: text("color_secondary").notNull().default("#666666"),
    colorAccent: text("color_accent").notNull().default("#2563EB"),
    colorBackground: text("color_background").notNull().default("#FFFFFF"),
    colorSurface: text("color_surface").notNull().default("#F9FAFB"),
    colorText: text("color_text").notNull().default("#111827"),
    colorTextMuted: text("color_text_muted").notNull().default("#6B7280"),
    colorBorder: text("color_border").notNull().default("#E5E7EB"),
    colorError: text("color_error").notNull().default("#EF4444"),
    colorSuccess: text("color_success").notNull().default("#22C55E"),
    fontHeading: text("font_heading").notNull().default("Inter"),
    fontBody: text("font_body").notNull().default("Inter"),
    fontMono: text("font_mono").notNull().default("JetBrains Mono"),
    headerVariant: text("header_variant", {
      enum: tenantThemeHeaderVariantValues,
    })
      .notNull()
      .default("classic"),
    heroVariant: text("hero_variant", { enum: tenantThemeHeroVariantValues })
      .notNull()
      .default("full_width"),
    productCardVariant: text("product_card_variant", {
      enum: tenantThemeProductCardVariantValues,
    })
      .notNull()
      .default("standard"),
    footerVariant: text("footer_variant", {
      enum: tenantThemeFooterVariantValues,
    })
      .notNull()
      .default("standard"),
    filterVariant: text("filter_variant", {
      enum: tenantThemeFilterVariantValues,
    })
      .notNull()
      .default("sidebar"),
    maxContentWidth: text("max_content_width").notNull().default("1280px"),
    borderRadius: text("border_radius").notNull().default("8px"),
    showAboutPage: boolean("show_about_page").notNull().default(true),
    showContactPage: boolean("show_contact_page").notNull().default(true),
    heroTitle: text("hero_title"),
    heroSubtitle: text("hero_subtitle"),
    heroImageUrl: text("hero_image_url"),
    heroCtaText: text("hero_cta_text").default("Shop Now"),
    heroCtaLink: text("hero_cta_link").default("/shop"),
    aboutContent: text("about_content"),
    aboutImageUrl: text("about_image_url"),
    logoUrl: text("logo_url"),
    logoWidth: integer("logo_width").default(120),
    faviconUrl: text("favicon_url"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_tenant_theme_config_tenant").on(table.tenantId),
    check(
      "tenant_theme_config_header_variant_check",
      sql`${table.headerVariant} in ('classic', 'minimal', 'centered')`,
    ),
    check(
      "tenant_theme_config_hero_variant_check",
      sql`${table.heroVariant} in ('full_width', 'split', 'slider', 'none')`,
    ),
    check(
      "tenant_theme_config_product_card_variant_check",
      sql`${table.productCardVariant} in ('standard', 'minimal', 'detailed')`,
    ),
    check(
      "tenant_theme_config_footer_variant_check",
      sql`${table.footerVariant} in ('standard', 'minimal', 'extended')`,
    ),
    check(
      "tenant_theme_config_filter_variant_check",
      sql`${table.filterVariant} in ('sidebar', 'top_bar', 'drawer')`,
    ),
  ],
);
