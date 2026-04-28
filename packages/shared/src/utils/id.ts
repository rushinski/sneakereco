import { ulid } from 'ulid';

// Every entity type has a 3-4 character prefix
const PREFIXES = {
  tenant: 'tnt',
  adminUser: 'adm',
  customerUser: 'cus',
  adminTenantRelationship: 'atr',
  authSession: 'ses',
  order: 'ord',
  orderLineItem: 'oli',
  product: 'prd',
  variant: 'var',
  paymentTransaction: 'ptx',
  tagBrand: 'tbr',
  tagModel: 'tmd',
  tagAlias: 'tal',
  productFilter: 'pfl',
  productImage: 'img',
  contactMessage: 'msg',
  emailLog: 'eml',
  auditEvent: 'evt',
  webhookEvent: 'whk',
  nexusRegistration: 'nxr',
  stateSales: 'ssr',
  chargebackEvidence: 'cbe',
  featuredItem: 'fti',
  shippingTracking: 'stk',
  orderAccessToken: 'oat',
  tenantApplication: 'tap',
  tenantSetupInvitation: 'tsi',
  tenantBusinessProfile: 'tbp',
  tenantDomainConfig: 'tdc',
  tenantCognitoConfig: 'tcc',
  tenantThemeConfig: 'thm',
  tenantThemeVersion: 'thv',
  tenantPageConfig: 'pgc',
  tenantPageConfigVersion: 'pgv',
  tenantAuthShellConfig: 'ash',
  tenantAuthPageConfig: 'apg',
  tenantEmailConfig: 'emc',
  tenantEmailConfigVersion: 'emv',
  tenantSenderIdentity: 'eti',
  tenantReleaseSet: 'rls',
  tenantReleaseHistory: 'rlh',
  designFamily: 'dsg',
  componentVariant: 'cvr',
  componentVariantVersion: 'cvv',
  emailTemplateVariant: 'etv',
  customerAddress: 'adr',
  authSubjectRevocation: 'asr',
  authSessionLineageRevocation: 'slr',
} as const;

export type EntityType = keyof typeof PREFIXES;

/**
 * Generate a prefixed ULID for an entity.
 *
 * Example: generateId("order") => "ord_01HXYZ..."
 */
export function generateId(entityType: EntityType): string {
  const prefix = PREFIXES[entityType];
  return `${prefix}_${ulid()}`;
}

/**
 * Extract the entity type from a prefixed ID.
 *
 * Example: getEntityType("ord_01HXYZ...") => "order"
 */
export function getEntityType(id: string): EntityType | null {
  const prefix = id.split('_')[0];
  const entry = Object.entries(PREFIXES).find(([, p]) => p === prefix);
  return entry ? (entry[0] as EntityType) : null;
}
