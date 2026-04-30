import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function VerifyEmailPage(props: {
  searchParams: Promise<{ family?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Email verification"
      title="Verify the account before it becomes a real tenant customer."
      description="The platform creates the local customer record only after a successful confirmation code exchange."
    >
      <AuthForm
        endpoint="/api/auth/verify-email"
        title="Verify email"
        description="Enter the confirmation code from the auth email."
        submitLabel="Verify email"
        fields={[
          { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
          { name: 'code', label: 'Verification code', placeholder: '123456' },
        ]}
        links={[
          { href: '/login', label: 'Back to sign in' },
          { href: '/register', label: 'Create account' },
        ]}
      />
    </AuthFamilyShell>
  );
}