import { AuthFamilyShell } from '@/components/auth/auth-shell';
import { AdminLoginForm } from '@/components/auth/admin-login-form';

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
      <AdminLoginForm />
    </AuthFamilyShell>
  );
}