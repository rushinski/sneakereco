import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function LoginPage(props: {
  searchParams: Promise<{ family?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Customer login"
      title="Pick up where the storefront left off."
      description="Same-origin auth keeps refresh and session control on the active tenant domain while still using the central Nest auth engine."
      supportingLine="Password sign-in, email-code sign-in, and protected recovery paths."
    >
      <AuthForm
        endpoint="/api/auth/login"
        title="Sign in"
        description="Use your email and password, or switch to email code from the alternate route."
        submitLabel="Sign in"
        fields={[
          { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
          { name: 'password', label: 'Password', type: 'password', placeholder: 'Password' },
          { name: 'deviceId', label: 'Device id', placeholder: 'browser-main' },
        ]}
        links={[
          { href: '/register', label: 'Create account' },
          { href: '/forgot-password', label: 'Forgot password' },
          { href: '/otp', label: 'Sign in with email code instead' },
        ]}
        onSuccess={(payload, router) => {
          if (typeof payload.accessToken === 'string') {
            void router.push('/account');
          }
        }}
      />
    </AuthFamilyShell>
  );
}