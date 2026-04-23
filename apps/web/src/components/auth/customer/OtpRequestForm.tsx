'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient } from '../../../lib/api-client';
import { Button } from '../../ui/Button';
import { ThemedField } from './ThemedField';

export function OtpRequestForm() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.requestOtp({ email });
      router.push(
        `/otp/verify?email=${encodeURIComponent(email)}&session=${encodeURIComponent(result.session)}`,
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not send code. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { void handleSubmit(e); }}>
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Sign in with email code.</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          We&apos;ll send a one-time code to your email.
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
      <Button type="submit" loading={submitting}>Send Code</Button>
      <p className="text-center text-xs">
        <a href="/login" className="underline underline-offset-2" style={{ color: 'var(--color-text-muted)' }}>
          Sign in with password instead
        </a>
      </p>
    </form>
  );
}
