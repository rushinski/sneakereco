'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient } from '../../../lib/api-client';
import { Button } from '../../ui/Button';

import { ThemedField } from './ThemedField';

export function ConfirmEmailForm({ email }: { email: string }) {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.confirmCustomerEmail({ email, code });
      router.push('/auth/login');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Verification failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      await apiClient.resendCustomerConfirmation({ email });
      setResent(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not resend. Try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          Verify your email.
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          We sent a code to <strong>{email}</strong>. Enter it below.
        </p>
      </div>
      <ThemedField
        label="Confirmation code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={setCode}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {resent && (
        <p className="text-sm" style={{ color: 'var(--color-success)' }}>
          Code resent.
        </p>
      )}
      <Button type="submit" loading={submitting}>
        Confirm Email
      </Button>
      <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Didn&apos;t get it?{' '}
        <button
          type="button"
          onClick={() => {
            void handleResend();
          }}
          disabled={resending}
          className="underline underline-offset-2 disabled:opacity-50"
          style={{ color: 'var(--color-primary)' }}
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      </p>
    </form>
  );
}
