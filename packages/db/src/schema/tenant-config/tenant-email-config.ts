import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantEmailTemplateVariantValues = ['standard', 'minimal', 'branded'] as const;

export const tenantEmailConfig = pgTable(
  'tenant_email_config',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    fromEmail: text('from_email').notNull(),
    fromName: text('from_name').notNull(),
    replyToEmail: text('reply_to_email'),
    supportEmail: text('support_email'),
    sesDomainVerified: boolean('ses_domain_verified').notNull().default(false),
    sesDomain: text('ses_domain'),
    emailTemplateVariant: text('email_template_variant', {
      enum: tenantEmailTemplateVariantValues,
    })
      .notNull()
      .default('standard'),
    emailAccentColor: text('email_accent_color'),
    emailLogoUrl: text('email_logo_url'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenant_email_config_tenant').on(table.tenantId),
    check(
      'tenant_email_config_template_variant_check',
      sql`${table.emailTemplateVariant} in ('standard', 'minimal', 'branded')`,
    ),
  ],
);
