import { pgPolicy } from 'drizzle-orm/pg-core';

import { sneakerecoAppRole } from '../shared/roles';
import { currentTenantScope, tenantAdminScope } from '../shared/rls';

import { tenantDomainConfig } from './tenant-domain-config';
import { tenantEmailConfig } from './tenant-email-config';
import { tenantOnboarding } from './tenant-onboarding';
import { tenantSeoConfig } from './tenant-seo-config';
import { tenantThemeConfig } from './tenant-theme-config';

export const tenantOnboardingAdminManagePolicy = pgPolicy('tenant_onboarding_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantOnboarding.tenantId),
  withCheck: tenantAdminScope(tenantOnboarding.tenantId),
}).link(tenantOnboarding);

export const tenantSeoConfigPublicReadPolicy = pgPolicy('tenant_seo_config_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentTenantScope(tenantSeoConfig.tenantId),
}).link(tenantSeoConfig);

export const tenantSeoConfigAdminManagePolicy = pgPolicy('tenant_seo_config_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantSeoConfig.tenantId),
  withCheck: tenantAdminScope(tenantSeoConfig.tenantId),
}).link(tenantSeoConfig);

export const tenantThemeConfigPublicReadPolicy = pgPolicy('tenant_theme_config_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentTenantScope(tenantThemeConfig.tenantId),
}).link(tenantThemeConfig);

export const tenantThemeConfigAdminManagePolicy = pgPolicy('tenant_theme_config_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantThemeConfig.tenantId),
  withCheck: tenantAdminScope(tenantThemeConfig.tenantId),
}).link(tenantThemeConfig);

export const tenantEmailConfigAdminManagePolicy = pgPolicy('tenant_email_config_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantEmailConfig.tenantId),
  withCheck: tenantAdminScope(tenantEmailConfig.tenantId),
}).link(tenantEmailConfig);

export const tenantDomainConfigAdminManagePolicy = pgPolicy('tenant_domain_config_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantDomainConfig.tenantId),
  withCheck: tenantAdminScope(tenantDomainConfig.tenantId),
}).link(tenantDomainConfig);
