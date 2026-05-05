'use client';

import { AuthForm } from './auth-form';

export function AdminLoginForm() {
  return (
    <AuthForm
      endpoint="/api/auth/admin/login"
      title="Admin sign in"
      description="Enter the approved admin account credentials, then continue with TOTP."
      submitLabel="Start MFA challenge"
      fields={[
        { name: 'email', label: 'Email', type: 'email', placeholder: 'admin@example.com' },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Password' },
      ]}
      links={[{ href: '/admin/setup', label: 'Complete invited setup' }]}
      onSuccess={(payload, router) => {
        if (typeof payload.challengeSessionToken === 'string') {
          void router.push(`/admin/mfa?token=${encodeURIComponent(payload.challengeSessionToken)}`);
        }
      }}
    />
  );
}
