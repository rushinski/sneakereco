import { sql } from 'drizzle-orm';
import { boolean, check, index, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, jsonbEmptyObject, timestamptz, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantOnboardingRequestStatusValues = [
  'pending',
  'approved',
  'rejected',
  'invited',
] as const;

export type TenantOnboardingRequestStatus = (typeof tenantOnboardingRequestStatusValues)[number];

export const tenantOnboarding = pgTable(
  'tenant_onboarding',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    requestStatus: text('request_status', {
      enum: tenantOnboardingRequestStatusValues,
    })
      .notNull()
      .default('pending'),
    inviteTokenHash: text('invite_token_hash'),
    inviteSentAt: timestamptz('invite_sent_at'),
    inviteAcceptedAt: timestamptz('invite_accepted_at'),
    requestedByEmail: text('requested_by_email'),
    requestedByName: text('requested_by_name'),
    requestedByPhone: text('requested_by_phone'),
    businessName: text('business_name'),
    instagramUrl: text('instagram_url'),
    requestNotes: text('request_notes'),
    seoQuestionnaireCompleted: boolean('seo_questionnaire_completed').notNull().default(false),
    paymentIntegrationCompleted: boolean('payment_integration_completed').notNull().default(false),
    shippingIntegrationCompleted: boolean('shipping_integration_completed')
      .notNull()
      .default(false),
    domainConfigured: boolean('domain_configured').notNull().default(false),
    themeConfigured: boolean('theme_configured').notNull().default(false),
    seoAnswers: jsonb('seo_answers').notNull().default(jsonbEmptyObject),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenant_onboarding_tenant').on(table.tenantId),
    index('idx_tenant_onboarding_status').on(table.requestStatus),
    index('idx_tenant_onboarding_invite')
      .on(table.inviteTokenHash)
      .where(sql`${table.inviteTokenHash} is not null`),
    check(
      'tenant_onboarding_request_status_check',
      sql`${table.requestStatus} in ('pending', 'approved', 'rejected', 'invited')`,
    ),
  ],
);
