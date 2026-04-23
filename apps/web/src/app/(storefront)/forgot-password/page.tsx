'use client';

import { useTenantConfig } from '../../../lib/tenant-theme-context';
import { SimpleAuth } from '../../../components/auth/customer/templates/SimpleAuth';
import { BoldAuth } from '../../../components/auth/customer/templates/BoldAuth';
import { ForgotPasswordForm } from '../../../components/auth/customer/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const config = useTenantConfig();
  const theme = config?.theme;
  const logoUrl = theme?.logoUrl ?? null;
  const tenantName = config?.tenant.name ?? null;

  if (theme?.authVariant === 'bold') {
    return (
      <BoldAuth logoUrl={logoUrl} tenantName={tenantName} headline={theme.authHeadline} description={theme.authDescription}>
        <ForgotPasswordForm />
      </BoldAuth>
    );
  }

  return (
    <SimpleAuth logoUrl={logoUrl} tenantName={tenantName}>
      <ForgotPasswordForm />
    </SimpleAuth>
  );
}
