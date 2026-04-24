'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { StoreAdminResetPasswordForm } from '../../../../components/auth/StoreAdminResetPasswordForm';

function StoreAdminResetPasswordContent() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const code = params.get('code') ?? undefined;

  return <StoreAdminResetPasswordForm email={email} code={code} />;
}

export default function StoreAdminAuthResetPasswordPage() {
  return (
    <Suspense>
      <StoreAdminResetPasswordContent />
    </Suspense>
  );
}
