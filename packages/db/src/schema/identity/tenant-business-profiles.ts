import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';

import { tenants } from './tenants';

export const tenantBusinessProfiles = pgTable(
  'tenant_business_profiles',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    businessName: text('business_name').notNull(),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    instagramHandle: text('instagram_handle'),
    logoAssetId: text('logo_asset_id'),
    supportEmail: text('support_email'),
    supportPhone: text('support_phone'),
    locationSummary: text('location_summary'),
    footerLinkSet: text('footer_link_set'),
    socialLinks: text('social_links'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex('uniq_tenant_business_profiles_tenant').on(table.tenantId)],
);