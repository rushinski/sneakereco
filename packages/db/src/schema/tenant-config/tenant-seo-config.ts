import { jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, jsonbEmptyObject, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantSeoConfig = pgTable(
  'tenant_seo_config',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    businessDescription: text('business_description'),
    targetAudience: text('target_audience'),
    geographicFocus: text('geographic_focus'),
    uniqueSellingPoints: text('unique_selling_points').array(),
    primaryKeywords: text('primary_keywords').array(),
    secondaryKeywords: text('secondary_keywords').array(),
    socialLinks: jsonb('social_links').notNull().default(jsonbEmptyObject),
    logoUrl: text('logo_url'),
    faviconUrl: text('favicon_url'),
    ogImageUrl: text('og_image_url'),
    googleSiteVerification: text('google_site_verification'),
    googleAnalyticsId: text('google_analytics_id'),
    robotsTxtOverrides: text('robots_txt_overrides'),
    metaTitleTemplate: text('meta_title_template')
      .notNull()
      .default('{{product_name}} | {{store_name}}'),
    metaDescriptionTemplate: text('meta_description_template')
      .notNull()
      .default('Shop {{product_name}} at {{store_name}}. {{business_description}}'),
    collectionTitleTemplate: text('collection_title_template')
      .notNull()
      .default('{{category}} | {{store_name}}'),
    collectionDescriptionTemplate: text('collection_description_template')
      .notNull()
      .default('Browse our {{category}} collection. {{business_description}}'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex('uniq_tenant_seo_config_tenant').on(table.tenantId)],
);
