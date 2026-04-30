import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function TenantAdminSetupPage(props: {
  searchParams: Promise<{ family?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Invited setup"
      title="Validate the SneakerEco-issued setup session before password and MFA completion."
      description="The invitation token is verified in your system first so the flow stays revocable, auditable, and tenant-aware."
    >
      <AuthForm
        endpoint="/api/auth/admin/setup/consume"
        title="Consume setup invitation"
        description="Use the token from the approval email to enter the setup flow."
        submitLabel="Verify invitation"
        fields={[{ name: 'token', label: 'Invitation token', placeholder: 'setup_token' }]}
        links={[
          { href: '/admin/login', label: 'Back to admin sign in' },
          { href: '/mfa', label: 'Skip to MFA challenge' },
        ]}
      />
    </AuthFamilyShell>
  );
}