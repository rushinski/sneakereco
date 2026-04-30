import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function TenantAdminMfaPage(props: {
  searchParams: Promise<{ family?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Tenant admin"
      title="Complete the mandatory authenticator challenge before entering the admin shell."
      description="Tenant admins always complete TOTP before the BFF writes the secure refresh cookie for the active tenant domain."
      supportingLine="One-day admin refresh lifetime. Thirty-minute access lifetime."
    >
      <AuthForm
        endpoint="/api/auth/mfa"
        title="Complete MFA"
        description="Use the challenge token from admin login and the authenticator code."
        submitLabel="Verify code"
        fields={[
          { name: 'challengeSessionToken', label: 'Challenge session token', placeholder: 'challenge_token' },
          { name: 'code', label: 'Authenticator code', placeholder: '123456' },
          { name: 'deviceId', label: 'Device id', placeholder: 'browser-main' },
        ]}
        links={[{ href: '/admin/login', label: 'Back to admin login' }]}
        onSuccess={(payload, router) => {
          if (typeof payload.accessToken === 'string') {
            void router.push('/admin');
          }
        }}
      />
    </AuthFamilyShell>
  );
}