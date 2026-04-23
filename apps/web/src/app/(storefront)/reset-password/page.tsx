'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { useTenantConfig } from '../../../lib/tenant-theme-context';
import { SimpleAuth } from '../../../components/auth/customer/templates/SimpleAuth';
import { BoldAuth } from '../../../components/auth/customer/templates/BoldAuth';
import { ResetPasswordForm } from '../../../components/auth/customer/ResetPasswordForm';

function ResetPasswordContent() {
  const config = useTenantConfig();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const code = params.get('code') ?? undefined;
  const theme = config?.theme;
  const logoUrl = theme?.logoUrl ?? null;
  const tenantName = config?.tenant.name ?? null;

  if (theme?.authVariant === 'bold') {
    return (
      <BoldAuth logoUrl={logoUrl} tenantName={tenantName} headline={theme.authHeadline} description={theme.authDescription}>
        <ResetPasswordForm email={email} code={code} />
      </BoldAuth>
    );
  }

  return (
    <SimpleAuth logoUrl={logoUrl} tenantName={tenantName}>
      <ResetPasswordForm email={email} code={code} />
    </SimpleAuth>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
