'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { useTenantConfig } from '../../../../lib/tenant-theme-context';
import { SimpleAuth } from '../../../../components/auth/customer/templates/SimpleAuth';
import { BoldAuth } from '../../../../components/auth/customer/templates/BoldAuth';
import { OtpVerifyForm } from '../../../../components/auth/customer/OtpVerifyForm';

function OtpVerifyContent() {
  const config = useTenantConfig();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const session = params.get('session') ?? '';
  const theme = config?.theme;
  const logoUrl = theme?.logoUrl ?? null;
  const tenantName = config?.tenant.name ?? null;

  if (theme?.authVariant === 'bold') {
    return (
      <BoldAuth logoUrl={logoUrl} tenantName={tenantName} headline={theme.authHeadline} description={theme.authDescription}>
        <OtpVerifyForm email={email} session={session} />
      </BoldAuth>
    );
  }

  return (
    <SimpleAuth logoUrl={logoUrl} tenantName={tenantName}>
      <OtpVerifyForm email={email} session={session} />
    </SimpleAuth>
  );
}

export default function OtpVerifyPage() {
  return (
    <Suspense>
      <OtpVerifyContent />
    </Suspense>
  );
}
