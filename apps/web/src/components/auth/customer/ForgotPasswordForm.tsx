'use client';

import { type FormEvent, useState } from 'react';

import { ApiClientError, apiClient } from '../../../lib/api-client';
import { Button } from '../../ui/Button';
import { ThemedField } from './ThemedField';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.forgotCustomerPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Request failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Check your email.</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          We sent a reset code to <strong>{email}</strong>. Follow the link to set a new password.
        </p>
        <a
          href={`/reset-password?email=${encodeURIComponent(email)}`}
          className="block text-center text-sm underline underline-offset-2"
          style={{ color: 'var(--color-primary)' }}
        >
          I have a code
        </a>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { void handleSubmit(e); }}>
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Reset your password.</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Enter your email and we&apos;ll send you a reset code.
        </p>
      </div>
      <ThemedField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" loading={submitting}>Send Reset Code</Button>
      <p className="text-center text-xs">
        <a href="/login" className="underline underline-offset-2" style={{ color: 'var(--color-text-muted)' }}>
          Back to sign in
        </a>
      </p>
    </form>
  );
}
