'use client';

import QRCode from 'qrcode';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  ApiClientError,
  apiClient,
  type CompleteOnboardingResult,
  type InviteSummary,
} from '../lib/api-client';

type Stage = 'loading' | 'password' | 'mfa' | 'complete' | 'invalid';

interface AdminSetupProps {
  token: string;
}

export function AdminSetup({ token }: AdminSetupProps) {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteSummary | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteOnboardingResult | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [csrf, inviteSummary] = await Promise.all([
          apiClient.getCsrfToken(),
          apiClient.validateInvite(token),
        ]);

        if (cancelled) return;

        setCsrfToken(csrf.token);
        setInvite(inviteSummary);
        setStage('password');
      } catch (caughtError) {
        if (cancelled) return;

        setError(
          caughtError instanceof ApiClientError
            ? caughtError.message
            : 'We could not validate this invite.',
        );
        setStage('invalid');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const otpAuthUri = useMemo(() => {
    if (!invite?.email || !result?.secretCode) return null;
    const issuer = 'SneakerEco';
    const label = `${issuer}:${invite.email}`;
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(
      result.secretCode,
    )}&issuer=${encodeURIComponent(issuer)}`;
  }, [invite?.email, result?.secretCode]);

  useEffect(() => {
    let cancelled = false;

    if (!otpAuthUri) {
      setQrCodeUrl(null);
      return;
    }

    void QRCode.toDataURL(otpAuthUri, { errorCorrectionLevel: 'M', margin: 1, width: 220 })
      .then((url: string) => {
        if (!cancelled) setQrCodeUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrCodeUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [otpAuthUri]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken) {
      setError('Security setup is still loading. Try again in a moment.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const onboardingResult = await apiClient.completeOnboarding({ password, token }, csrfToken);
      setAccessToken(onboardingResult.accessToken);
      setResult(onboardingResult);
      setStage('mfa');
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : 'We could not finish account setup.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || !accessToken) {
      setError('Your setup session is incomplete. Refresh and try again.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.verifyMfa({ deviceName: 'SneakerEco Admin', mfaCode }, csrfToken, accessToken);
      setStage('complete');
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : 'The MFA code could not be verified.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'loading') {
    return (
      <section className="panel">
        <p className="eyebrow">Invite Setup</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
          Validating your invite...
        </h1>
      </section>
    );
  }

  if (stage === 'invalid') {
    return (
      <section className="panel" style={{ borderColor: 'var(--color-error)' }}>
        <p className="eyebrow">Invite Unavailable</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
          This invite can&apos;t be used.
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          {error ?? 'The token is invalid, expired, or has already been used.'}
        </p>
      </section>
    );
  }

  if (stage === 'complete' && result) {
    return (
      <section className="panel" style={{ borderColor: 'var(--color-success)' }}>
        <p className="eyebrow">Account Ready</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
          Your admin account is set up.
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          MFA is active. You can now sign in to your store dashboard.
        </p>
        <button
          className="button button--primary"
          onClick={() => router.push('/admin')}
          style={{ marginTop: '1.5rem' }}
          type="button"
        >
          Go to your dashboard
        </button>
      </section>
    );
  }

  if (stage === 'mfa' && invite && result) {
    return (
      <section className="panel">
        <p className="eyebrow">Step 2</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
          Set up MFA for {invite.businessName ?? 'your store'}.
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          Scan the QR code with your authenticator app, then enter the 6-digit code below.
        </p>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            {qrCodeUrl ? (
              <img alt="Authenticator QR code" height={220} src={qrCodeUrl} width={220} />
            ) : (
              <div
                style={{
                  width: 220,
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                QR unavailable
              </div>
            )}
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                marginTop: '0.5rem',
                wordBreak: 'break-all',
                color: 'var(--color-text-muted)',
              }}
            >
              {result.secretCode}
            </p>
          </div>
          <form
            className="stack"
            onSubmit={(e) => {
              void handleMfaSubmit(e);
            }}
            style={{ flex: 1, minWidth: 200 }}
          >
            <label className="field">
              <span>Authenticator code</span>
              <input
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
              {submitting ? 'Verifying...' : 'Verify MFA'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  // Stage: password
  return (
    <section className="panel">
      <p className="eyebrow">Step 1</p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
        Create your admin password.
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
        {invite?.businessName
          ? `Finish setting up the first admin account for ${invite.businessName}.`
          : 'Finish setting up your first admin account.'}
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          void handlePasswordSubmit(e);
        }}
        style={{ marginTop: '1.5rem' }}
      >
        <label className="field">
          <span>Password</span>
          <input
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input
            autoComplete="new-password"
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            type="password"
            value={passwordConfirm}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button button--primary" disabled={submitting} type="submit">
          {submitting ? 'Creating Account...' : 'Continue to MFA Setup'}
        </button>
      </form>
    </section>
  );
}
