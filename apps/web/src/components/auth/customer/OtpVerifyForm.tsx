'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../ui/Button';
import { ThemedField } from './ThemedField';

export function OtpVerifyForm({ email, session }: { email: string; session: string }) {
  const router = useRouter();
  const { storeTokens } = useAuth();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.verifyOtp({ email, session, code });
      if (result.type === 'mfa_required') {
        router.push(`/mfa?session=${encodeURIComponent(result.session)}&email=${encodeURIComponent(email)}`);
        return;
      }
      storeTokens(result.accessToken, result.expiresIn);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Verification failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { void handleSubmit(e); }}>
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Enter your code.</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          We sent a 6-digit code to <strong>{email}</strong>.
        </p>
      </div>
      <ThemedField
        label="One-time code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={setCode}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" loading={submitting}>Verify</Button>
      <p className="text-center text-xs">
        <a href="/otp" className="underline underline-offset-2" style={{ color: 'var(--color-text-muted)' }}>
          Resend code
        </a>
      </p>
    </form>
  );
}
