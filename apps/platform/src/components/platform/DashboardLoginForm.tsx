'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient, setAccessToken } from '../../lib/api-client';

type Stage = 'login' | 'mfa';

export function DashboardLoginForm() {
  const router = useRouter();

  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSession, setMfaSession] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [stage, setStage] = useState<Stage>('login');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.getCsrfToken().then((data) => setCsrfToken(data.token)).catch(() => {
      setError('Could not initialise security token. Try refreshing.');
    });
  }, []);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.signInAdmin({ email, password }, csrfToken);

      if (result.type === 'mfa_required') {
        setMfaSession(result.session);
        setStage('mfa');
        return;
      }

      setAccessToken(result.accessToken);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Sign in failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || !mfaSession) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.mfaChallenge(
        { email, mfaCode, session: mfaSession },
        csrfToken,
      );

      setAccessToken(result.accessToken);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'MFA verification failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'mfa') {
    return (
      <section className="panel">
        <p className="eyebrow">Two-Factor Authentication</p>
        <h1>Enter your authenticator code.</h1>
        <form
          className="stack"
          onSubmit={(e) => {
            void handleMfaSubmit(e);
          }}
        >
          <label className="field">
            <span>Authenticator code</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setMfaCode(e.target.value)}
              pattern="[0-9]{6}"
              required
              value={mfaCode}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button button--primary" disabled={submitting} type="submit">
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="eyebrow">Platform Admin</p>
      <h1>Sign in to the dashboard.</h1>
      <form
        className="stack"
        onSubmit={(e) => {
          void handleLoginSubmit(e);
        }}
      >
        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button button--primary" disabled={!csrfToken || submitting} type="submit">
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </section>
  );
}
