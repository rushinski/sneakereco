import Link from 'next/link';

import { PlatformAuthForm } from '@/components/platform-auth/platform-auth-form';
import { PlatformAuthShell } from '@/components/platform-auth/platform-shell';

export default function PlatformMfaPage() {
  return (
    <PlatformAuthShell
      eyebrow="Platform admin"
      title="Complete the authenticator challenge inside the same-site BFF boundary."
      description="The refresh token never enters browser storage. It is written only to the dashboard origin cookie after a successful MFA exchange."
    >
      <div className="space-y-5">
        <PlatformAuthForm
          endpoint="/api/auth/mfa"
          title="Complete MFA"
          description="Use the Cognito challenge token and authenticator code."
          submitLabel="Verify code"
          successHref="/"
          fields={[
            { name: 'challengeSessionToken', label: 'Challenge session token', placeholder: 'challenge_token' },
            { name: 'code', label: 'Authenticator code', placeholder: '123456' },
            { name: 'deviceId', label: 'Device id', placeholder: 'dashboard-browser' },
          ]}
        />
        <div className="text-sm text-slate-400">
          Need to restart the flow?{' '}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Back to login
          </Link>
        </div>
      </div>
    </PlatformAuthShell>
  );
}