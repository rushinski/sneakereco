import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function MfaPage(props: {
  searchParams: Promise<{ family?: string; token?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  if (!searchParams.token) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Two-factor authentication"
      title="Verify your identity with your authenticator app."
      description="Enter the 6-digit code from your authenticator app to complete sign-in."
      supportingLine="The code rotates every 30 seconds."
    >
      <AuthForm
        endpoint="/api/auth/mfa"
        title="Authenticator challenge"
        description="Enter your current authenticator code to continue."
        submitLabel="Verify code"
        defaultValues={{ challengeSessionToken: searchParams.token ?? '' }}
        successHref="/account"
        fields={[
          { name: 'challengeSessionToken', type: 'hidden', label: '' },
          { name: 'code', label: 'Authenticator code', placeholder: '123456' },
          { name: 'deviceId', label: 'Device id', placeholder: 'browser-main' },
        ]}
        links={[{ href: '/login', label: 'Back to login' }]}
      />
    </AuthFamilyShell>
  );
}