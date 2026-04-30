import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function OtpPage(props: {
  searchParams: Promise<{ family?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Email code sign-in"
      title="Offer the optional customer OTP path without exposing it to admins."
      description="Customers can request and complete an email-code sign-in flow; tenant and platform admins cannot."
    >
      <div className="space-y-8">
        <AuthForm
          endpoint="/api/auth/otp/request"
          title="Request email code"
          description="Start the one-time password flow."
          submitLabel="Send code"
          fields={[{ name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' }]}
          links={[
            { href: '/login', label: 'Back to password sign in' },
            { href: '/register', label: 'Create account' },
          ]}
        />
        <div className="border-t border-black/10 pt-8 dark:border-white/10">
          <AuthForm
            endpoint="/api/auth/otp/complete"
            title="Complete email code sign-in"
            description="Finish the OTP challenge and receive a same-site session."
            submitLabel="Complete sign in"
            fields={[
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { name: 'code', label: 'Email code', placeholder: '123456' },
              { name: 'deviceId', label: 'Device id', placeholder: 'browser-main' },
            ]}
            onSuccess={(payload, router) => {
              if (typeof payload.accessToken === 'string') {
                void router.push('/account');
              }
            }}
          />
        </div>
      </div>
    </AuthFamilyShell>
  );
}