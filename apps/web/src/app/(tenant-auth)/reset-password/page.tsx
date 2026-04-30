import { AuthForm } from '@/components/auth/auth-form';
import { AuthFamilyShell } from '@/components/auth/auth-shell';

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ family?: string }>;
}) {
  const searchParams = await props.searchParams;
  const family = searchParams.family === 'b' ? 'b' : 'a';

  return (
    <AuthFamilyShell
      family={family}
      eyebrow="Recovery"
      title="Finish the password reset with the verification code in hand."
      description="This route keeps the recovery affordance present in every family that enables forgot-password."
    >
      <AuthForm
        endpoint="/api/auth/reset-password"
        title="Reset password"
        description="Use the emailed code and choose the next password."
        submitLabel="Reset password"
        fields={[
          { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
          { name: 'code', label: 'Reset code', placeholder: '123456' },
          { name: 'newPassword', label: 'New password', type: 'password', placeholder: 'New password' },
        ]}
        links={[
          { href: '/forgot-password', label: 'Request a new code' },
          { href: '/login', label: 'Back to sign in' },
        ]}
      />
    </AuthFamilyShell>
  );
}