import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function ForgotPasswordPage(props: {
  searchParams: Promise<{ family?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Recovery"
      title="Reset the account without leaving the tenant domain."
      description="Request a reset code, then continue through the same-site BFF boundary."
    >
      <AuthForm
        endpoint="/api/auth/forgot-password"
        title="Forgot password"
        description="Request a reset code for the current tenant account."
        submitLabel="Send reset code"
        fields={[{ name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' }]}
        links={[
          { href: '/reset-password', label: 'Already have a reset code' },
          { href: '/login', label: 'Back to sign in' },
        ]}
      />
    </AuthFamilyShell>
  );
}