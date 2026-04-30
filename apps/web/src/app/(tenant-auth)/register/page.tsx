import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function RegisterPage(props: {
  searchParams: Promise<{ family?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Customer signup"
      title="Create a tenant-local account without colliding with any other store."
      description="Each customer pool stays tenant-owned, so this account is scoped cleanly to the current storefront."
      supportingLine="Email verification is required before a local customer record exists."
    >
      <AuthForm
        endpoint="/api/auth/register"
        title="Create account"
        description="Register now, then confirm your email before first sign-in."
        submitLabel="Create account"
        fields={[
          { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
          { name: 'password', label: 'Password', type: 'password', placeholder: 'Create a password' },
          { name: 'fullName', label: 'Full name', placeholder: 'Jordan Rush' },
        ]}
        links={[
          { href: '/verify-email', label: 'I already have a verification code' },
          { href: '/login', label: 'Back to sign in' },
        ]}
      />
    </AuthFamilyShell>
  );
}