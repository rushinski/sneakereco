import { AdminSetupFlow } from '@/components/auth/admin-setup-flow';
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
      <AdminSetupFlow />
    </AuthFamilyShell>
  );
}