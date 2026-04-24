'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { useTenantConfig } from '../../../../lib/tenant-theme-context';
import { BoldAuth } from '../../../../components/auth/customer/templates/BoldAuth';
import { SimpleAuth } from '../../../../components/auth/customer/templates/SimpleAuth';
import { ConfirmEmailForm } from '../../../../components/auth/customer/ConfirmEmailForm';

function ConfirmEmailContent() {
  const config = useTenantConfig();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const theme = config?.theme;
  const logoUrl = theme?.logoUrl ?? null;
  const tenantName = config?.tenant.name ?? null;

  if (theme?.authVariant === 'bold') {
    return (
      <BoldAuth
        logoUrl={logoUrl}
        tenantName={tenantName}
        headline={theme.authHeadline}
        description={theme.authDescription}
      >
        <ConfirmEmailForm email={email} />
      </BoldAuth>
    );
  }

  return (
    <SimpleAuth logoUrl={logoUrl} tenantName={tenantName}>
      <ConfirmEmailForm email={email} />
    </SimpleAuth>
  );
}

export default function CustomerAuthConfirmEmailPage() {
  return (
    <Suspense>
      <ConfirmEmailContent />
    </Suspense>
  );
}
