'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient } from '../../../lib/api-client';
import { Button } from '../../ui/Button';

import { ThemedField } from './ThemedField';

export function CustomerRegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.registerCustomer({ email, password });
      router.push(`/auth/confirm-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Registration failed. Try again.');
    } finally {
      setSubmitting(false);
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
          Create an account.
        </h2>
      </div>
      <ThemedField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <ThemedField
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" loading={submitting}>
        Create Account
      </Button>
      <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Already have an account?{' '}
        <a
          href="/auth/login"
          className="underline underline-offset-2"
          style={{ color: 'var(--color-primary)' }}
        >
          Sign in
        </a>
      </p>
    </form>
  );
}
