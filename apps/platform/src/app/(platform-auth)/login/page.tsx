import Link from 'next/link';

import { PlatformAuthForm } from '@/components/platform-auth/platform-auth-form';
import { PlatformAuthShell } from '@/components/platform-auth/platform-shell';

export default function PlatformLoginPage() {
  return (
    <PlatformAuthShell
      eyebrow="Platform admin"
      title="Approve tenants, recover failed provisioning, and stay behind required MFA."
      description="Platform admins share the central admin pool and always pass through password plus authenticator challenge."
    >
      <div className="space-y-5">
        <PlatformAuthForm
          endpoint="/api/auth/login"
          title="Platform sign in"
          description="Start the central admin login flow."
          submitLabel="Start MFA challenge"
          fields={[
            { name: 'email', label: 'Email', type: 'email', placeholder: 'owner@sneakereco.com' },
            { name: 'password', label: 'Password', type: 'password', placeholder: 'Password' },
          ]}
        />
        <div className="text-sm text-slate-400">
          Already have a challenge token?{' '}
          <Link href="/mfa" className="text-cyan-300 hover:text-cyan-200">
            Continue to MFA
          </Link>
        </div>
      </div>
    </PlatformAuthShell>
  );
}