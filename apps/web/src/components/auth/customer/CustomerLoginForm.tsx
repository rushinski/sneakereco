'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../ui/Button';
import { ThemedField } from './ThemedField';

type Stage = 'password' | 'mfa';

export function CustomerLoginForm() {
  const router = useRouter();
  const { storeTokens } = useAuth();

  const [stage, setStage] = useState<Stage>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSession, setMfaSession] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.loginCustomer({ email, password });
      if (result.type === 'mfa_required') {
        setMfaSession(result.session);
        setStage('mfa');
        return;
      }
      if (result.type === 'mfa_setup') {
        router.push(`/mfa-setup?session=${encodeURIComponent(result.session)}&email=${encodeURIComponent(result.email)}`);
        return;
      }
      storeTokens(result.accessToken, result.expiresIn);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Sign in failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.completeMfaChallenge(
        { email, session: mfaSession, mfaCode },
        '',
      );
      if (result.type === 'tokens') {
        storeTokens(result.accessToken, result.expiresIn);
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Verification failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'mfa') {
    return (
      <form className="space-y-4" onSubmit={(e) => { void handleMfaSubmit(e); }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Enter your code.
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Open your authenticator app and enter the 6-digit code.
          </p>
        </div>
        <ThemedField
          label="Authenticator code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={mfaCode}
          onChange={setMfaCode}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" loading={submitting}>Verify</Button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { void handlePasswordSubmit(e); }}>
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Sign in.</h2>
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
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" loading={submitting}>Sign In</Button>
      <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <a href="/otp" className="underline underline-offset-2">Sign in with email code</a>
        <a href="/forgot-password" className="underline underline-offset-2">Forgot password?</a>
      </div>
      <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        No account?{' '}
        <a href="/register" className="underline underline-offset-2" style={{ color: 'var(--color-primary)' }}>
          Create one
        </a>
      </p>
    </form>
  );
}
