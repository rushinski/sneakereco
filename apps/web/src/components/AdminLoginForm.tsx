'use client';

import QRCode from 'qrcode';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient, setAccessToken } from '../lib/api-client';

type Stage = 'login' | 'mfa' | 'mfa_setup';

export function AdminLoginForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();

  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSession, setMfaSession] = useState<string | null>(null);
  const [setupSession, setSetupSession] = useState<string | null>(null);
  const [setupSecretCode, setSetupSecretCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [stage, setStage] = useState<Stage>('login');
  const [submitting, setSubmitting] = useState(false);

  const otpAuthUri = useMemo(() => {
    if (!setupSecretCode || !email) return null;
    const issuer = 'SneakerEco';
    const label = `${issuer}:${email}`;
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(setupSecretCode)}&issuer=${encodeURIComponent(issuer)}`;
  }, [setupSecretCode, email]);

  useEffect(() => {
    let cancelled = false;
    if (!otpAuthUri) { setQrCodeUrl(null); return; }
    void QRCode.toDataURL(otpAuthUri, { errorCorrectionLevel: 'M', margin: 1, width: 200 })
      .then((url: string) => { if (!cancelled) setQrCodeUrl(url); })
      .catch(() => { if (!cancelled) setQrCodeUrl(null); });
    return () => { cancelled = true; };
  }, [otpAuthUri]);

  useEffect(() => {
    const init = async () => {
      try {
        const [csrfData, configData] = await Promise.all([
          apiClient.getCsrfToken(),
          apiClient.getTenantConfig(tenantSlug),
        ]);
        setCsrfToken(csrfData.token);
        setTenantId(configData.tenant.id);
      } catch {
        setError('Could not initialise. Try refreshing.');
      }
    };
    void init();
  }, [tenantSlug]);

  const ready = Boolean(csrfToken && tenantId);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || !tenantId) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.signIn(
        { email, password, clientType: 'admin', tenantId },
        csrfToken,
      );

      if (result.type === 'mfa_required') {
        setMfaSession(result.session);
        setStage('mfa');
        return;
      }

      if (result.type === 'mfa_setup') {
        const associated = await apiClient.mfaSetupAssociate(result.session, tenantId);
        setSetupSecretCode(associated.secretCode);
        setSetupSession(associated.session);
        setStage('mfa_setup');
        return;
      }

      setAccessToken(result.accessToken);
      router.push('/admin');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Sign in failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || !mfaSession || !tenantId) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.mfaChallenge(
        { email, mfaCode, session: mfaSession, tenantId, clientType: 'admin' },
        csrfToken,
      );

      setAccessToken(result.accessToken);
      router.push('/admin');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'MFA verification failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || !setupSession || !tenantId) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.mfaSetupComplete(
        { email, session: setupSession, mfaCode, tenantId },
        csrfToken,
      );

      setAccessToken(result.accessToken);
      router.push('/admin');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'MFA setup failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'mfa_setup') {
    return (
      <section className="panel">
        <p className="eyebrow">First-Time Setup</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 1rem' }}>
          Set up your authenticator app.
        </h1>
        <p style={{ color: 'var(--color-text-muted, #666)', marginTop: '0.5rem' }}>
          Scan the QR code with your authenticator app, then enter the 6-digit code to continue.
        </p>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            {qrCodeUrl ? (
              <img alt="Authenticator QR code" height={200} src={qrCodeUrl} width={200} />
            ) : (
              <div style={{ width: 200, height: 200, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', color: '#666' }}>
                QR unavailable
              </div>
            )}
            <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.5rem', wordBreak: 'break-all', color: '#666' }}>
              {setupSecretCode}
            </p>
          </div>
          <form
            className="stack"
            onSubmit={(e) => { void handleMfaSetupSubmit(e); }}
            style={{ flex: 1, minWidth: 200 }}
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
              {submitting ? 'Verifying...' : 'Activate MFA'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  if (stage === 'mfa') {
    return (
      <section className="panel">
        <p className="eyebrow">Two-Factor Authentication</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 1rem' }}>
          Enter your authenticator code.
        </h1>
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
      <p className="eyebrow">Admin Login</p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 1rem' }}>
        Sign in to your store.
      </h1>
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
        <button className="button button--primary" disabled={!ready || submitting} type="submit">
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </section>
  );
}
