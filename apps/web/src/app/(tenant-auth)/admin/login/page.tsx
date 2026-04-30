import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function TenantAdminLoginPage(props: {
  searchParams: Promise<{ family?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Tenant admin"
      title="Route tenant admins into password plus mandatory authenticator MFA."
      description="Tenant admins share the central admin pool, but the browser boundary still lives on the active tenant domain."
      supportingLine="No signup. No email OTP. Setup arrives only from approved onboarding."
    >
      <AuthForm
        endpoint="/api/auth/admin/login"
        title="Admin sign in"
        description="Enter the approved admin account credentials, then continue with TOTP."
        submitLabel="Start MFA challenge"
        fields={[
          { name: 'email', label: 'Email', type: 'email', placeholder: 'admin@example.com' },
          { name: 'password', label: 'Password', type: 'password', placeholder: 'Password' },
        ]}
        links={[
          { href: '/admin/setup', label: 'Complete invited setup' },
          { href: '/mfa', label: 'I already have a challenge token' },
        ]}
      />
    </AuthFamilyShell>
  );
}