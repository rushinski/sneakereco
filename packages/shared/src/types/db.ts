/**
 * Database entity types derived from the Drizzle schema.
 *
 * All types here are inferred directly from the table definitions in @sneakereco/db.
 * Never hand-write these — if the schema changes, these change automatically.
 *
 * Select types = what you get back from a SELECT query.
 * Insert types = what you pass to an INSERT query (id, createdAt etc. are optional).
 */
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
  authSessionLineageRevocations,
  authSubjectRevocations,
  auditEvents,
  chargebackEvidence,
  contactMessages,
  emailAuditLog,
  emailSubscribers,
  featuredItems,
  nexusRegistrations,
  orderAccessTokens,
  orderAddresses,
  orderLineItems,
  orders,
  paymentTransactions,
  productFilterEntries,
  productFilters,
  productImages,
  productVariants,
  products,
  shippingTrackingEvents,
  stateSalesTracking,
  tagAliases,
  tagBrands,
  tagModels,
  tenantDomainConfig,
  tenantEmailConfig,
  tenantMembers,
  tenantOnboarding,
  tenantSeoConfig,
  tenantShippingConfig,
  tenantTaxSettings,
  tenantThemeConfig,
  tenants,
  userAddresses,
  users,
  webhookEvents,
} from '@sneakereco/db';

// --- Identity ---
export type Tenant = InferSelectModel<typeof tenants>;
export type NewTenant = InferInsertModel<typeof tenants>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type TenantMember = InferSelectModel<typeof tenantMembers>;
export type NewTenantMember = InferInsertModel<typeof tenantMembers>;

export type AuthSubjectRevocation = InferSelectModel<typeof authSubjectRevocations>;
export type NewAuthSubjectRevocation = InferInsertModel<typeof authSubjectRevocations>;

export type AuthSessionLineageRevocation = InferSelectModel<typeof authSessionLineageRevocations>;
export type NewAuthSessionLineageRevocation = InferInsertModel<
  typeof authSessionLineageRevocations
>;

// --- Tenant Config ---
export type TenantOnboarding = InferSelectModel<typeof tenantOnboarding>;
export type NewTenantOnboarding = InferInsertModel<typeof tenantOnboarding>;

export type TenantDomainConfig = InferSelectModel<typeof tenantDomainConfig>;
export type NewTenantDomainConfig = InferInsertModel<typeof tenantDomainConfig>;

export type TenantThemeConfig = InferSelectModel<typeof tenantThemeConfig>;
export type NewTenantThemeConfig = InferInsertModel<typeof tenantThemeConfig>;

export type TenantSeoConfig = InferSelectModel<typeof tenantSeoConfig>;
export type NewTenantSeoConfig = InferInsertModel<typeof tenantSeoConfig>;

export type TenantEmailConfig = InferSelectModel<typeof tenantEmailConfig>;
export type NewTenantEmailConfig = InferInsertModel<typeof tenantEmailConfig>;

// --- Catalog ---
export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type ProductVariant = InferSelectModel<typeof productVariants>;
export type NewProductVariant = InferInsertModel<typeof productVariants>;

export type ProductImage = InferSelectModel<typeof productImages>;
export type NewProductImage = InferInsertModel<typeof productImages>;

export type ProductFilter = InferSelectModel<typeof productFilters>;
export type NewProductFilter = InferInsertModel<typeof productFilters>;

export type ProductFilterEntry = InferSelectModel<typeof productFilterEntries>;
export type NewProductFilterEntry = InferInsertModel<typeof productFilterEntries>;

export type TagBrand = InferSelectModel<typeof tagBrands>;
export type NewTagBrand = InferInsertModel<typeof tagBrands>;

export type TagModel = InferSelectModel<typeof tagModels>;
export type NewTagModel = InferInsertModel<typeof tagModels>;

export type TagAlias = InferSelectModel<typeof tagAliases>;
export type NewTagAlias = InferInsertModel<typeof tagAliases>;

// --- Orders ---
export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

export type OrderLineItem = InferSelectModel<typeof orderLineItems>;
export type NewOrderLineItem = InferInsertModel<typeof orderLineItems>;

export type OrderAddress = InferSelectModel<typeof orderAddresses>;
export type NewOrderAddress = InferInsertModel<typeof orderAddresses>;

export type OrderAccessToken = InferSelectModel<typeof orderAccessTokens>;
export type NewOrderAccessToken = InferInsertModel<typeof orderAccessTokens>;

export type PaymentTransaction = InferSelectModel<typeof paymentTransactions>;
export type NewPaymentTransaction = InferInsertModel<typeof paymentTransactions>;

// --- Operations ---
export type AuditEvent = InferSelectModel<typeof auditEvents>;
export type NewAuditEvent = InferInsertModel<typeof auditEvents>;

export type WebhookEvent = InferSelectModel<typeof webhookEvents>;
export type NewWebhookEvent = InferInsertModel<typeof webhookEvents>;

export type ChargebackEvidence = InferSelectModel<typeof chargebackEvidence>;
export type NewChargebackEvidence = InferInsertModel<typeof chargebackEvidence>;

export type UserAddress = InferSelectModel<typeof userAddresses>;
export type NewUserAddress = InferInsertModel<typeof userAddresses>;

export type FeaturedItem = InferSelectModel<typeof featuredItems>;
export type NewFeaturedItem = InferInsertModel<typeof featuredItems>;

// --- Communications ---
export type ContactMessage = InferSelectModel<typeof contactMessages>;
export type NewContactMessage = InferInsertModel<typeof contactMessages>;

export type EmailAuditLog = InferSelectModel<typeof emailAuditLog>;
export type NewEmailAuditLog = InferInsertModel<typeof emailAuditLog>;

export type EmailSubscriber = InferSelectModel<typeof emailSubscribers>;
export type NewEmailSubscriber = InferInsertModel<typeof emailSubscribers>;

// --- Tax ---
export type NexusRegistration = InferSelectModel<typeof nexusRegistrations>;
export type NewNexusRegistration = InferInsertModel<typeof nexusRegistrations>;

export type StateSalesTracking = InferSelectModel<typeof stateSalesTracking>;
export type NewStateSalesTracking = InferInsertModel<typeof stateSalesTracking>;

export type TenantTaxSettings = InferSelectModel<typeof tenantTaxSettings>;
export type NewTenantTaxSettings = InferInsertModel<typeof tenantTaxSettings>;

// --- Shipping ---
export type TenantShippingConfig = InferSelectModel<typeof tenantShippingConfig>;
export type NewTenantShippingConfig = InferInsertModel<typeof tenantShippingConfig>;

export type ShippingTrackingEvent = InferSelectModel<typeof shippingTrackingEvents>;
export type NewShippingTrackingEvent = InferInsertModel<typeof shippingTrackingEvents>;
