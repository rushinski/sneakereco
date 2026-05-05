import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function TenantAdminMfaPage(props: {
  searchParams: Promise<{ family?: string; token?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  if (!searchParams.token) {
    const { redirect } = await import('next/navigation');
    redirect('/admin/login');
  }

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
        description="Enter the 6-digit code from your authenticator app."
        submitLabel="Verify code"
        defaultValues={{ challengeSessionToken: searchParams.token ?? '' }}
        successHref="/admin"
        fields={[
          { name: 'challengeSessionToken', type: 'hidden', label: '' },
          { name: 'code', label: 'Authenticator code', placeholder: '123456' },
          { name: 'deviceId', label: 'Device id', placeholder: 'browser-main' },
        ]}
        links={[{ href: '/admin/login', label: 'Back to admin login' }]}
      />
    </AuthFamilyShell>
  );
}