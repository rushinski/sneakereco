import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PlatformAuthForm } from '@/components/platform-auth/platform-auth-form';
import { PlatformAuthShell } from '@/components/platform-auth/platform-shell';

export default async function PlatformMfaPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const searchParams = await props.searchParams;
  if (!searchParams.token) {
    redirect('/login');
  }

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
          description="Enter the 6-digit code from your authenticator app."
          submitLabel="Verify code"
          defaultValues={{ challengeSessionToken: searchParams.token }}
          successHref="/"
          fields={[
            { name: 'challengeSessionToken', type: 'hidden', label: '' },
            { name: 'code', label: 'Authenticator code', placeholder: '123456' },
            { name: 'deviceId', label: 'Device id', placeholder: 'dashboard-browser' },
          ]}
        />
        <div className="text-sm text-slate-400">
          Need to restart?{' '}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Back to login
          </Link>
        </div>
      </div>
    </PlatformAuthShell>
  );
}