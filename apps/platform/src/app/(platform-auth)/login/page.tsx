'use client';

import { PlatformAuthForm } from '@/components/platform-auth/platform-auth-form';
import { PlatformAuthShell } from '@/components/platform-auth/platform-shell';

export default function PlatformLoginPage() {
  return (
    <PlatformAuthShell
      eyebrow="Platform admin"
      title="Approve tenants, recover failed provisioning, and stay behind required MFA."
      description="Platform admins share the central admin pool and always pass through password plus authenticator challenge."
    >
      <PlatformAuthForm
        endpoint="/api/auth/login"
        title="Platform sign in"
        description="Enter your credentials to start the MFA challenge."
        submitLabel="Continue to MFA"
        fields={[
          { name: 'email', label: 'Email', type: 'email', placeholder: 'owner@sneakereco.com' },
          { name: 'password', label: 'Password', type: 'password', placeholder: 'Password' },
        ]}
        onSuccess={(payload, router) => {
          if (typeof payload.challengeSessionToken === 'string') {
            void router.push(`/mfa?token=${encodeURIComponent(payload.challengeSessionToken)}`);
          }
        }}
      />
    </PlatformAuthShell>
  );
}