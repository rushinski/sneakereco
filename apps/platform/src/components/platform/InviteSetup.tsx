'use client';

import QRCode from 'qrcode';
import { type FormEvent, useEffect, useMemo, useState } from 'react';

import {
  ApiClientError,
  apiClient,
  type CompleteOnboardingResult,
  type InviteSummary,
} from '../../lib/api-client';

type Stage = 'loading' | 'password' | 'mfa' | 'complete' | 'invalid';

interface InviteSetupProps {
  token: string;
}

export function InviteSetup({ token }: InviteSetupProps) {
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

        if (cancelled) {
          return;
        }

        setCsrfToken(csrf.token);
        setInvite(inviteSummary);
        setStage('password');
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        if (caughtError instanceof ApiClientError) {
          setError(caughtError.message);
        } else {
          setError('We could not validate this invite.');
        }
        setStage('invalid');
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const otpAuthUri = useMemo(() => {
    if (!invite?.email || !result?.secretCode) {
      return null;
    }

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

    void QRCode.toDataURL(otpAuthUri, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
    })
      .then((url: string) => {
        if (!cancelled) {
          setQrCodeUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrCodeUrl(null);
        }
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
      if (caughtError instanceof ApiClientError) {
        setError(caughtError.message);
      } else {
        setError('We could not finish account setup.');
      }
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
      await apiClient.verifyMfa(
        {
          deviceName: 'SneakerEco Admin',
          mfaCode,
        },
        csrfToken,
        accessToken,
      );

      setStage('complete');
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        setError(caughtError.message);
      } else {
        setError('The MFA code could not be verified.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'loading') {
    return (
      <section className="panel">
        <p className="eyebrow">Invite Setup</p>
        <h1>Validating your invite...</h1>
      </section>
    );
  }

  if (stage === 'invalid') {
    return (
      <section className="panel panel--danger">
        <p className="eyebrow">Invite Unavailable</p>
        <h1>This invite can&apos;t be used.</h1>
        <p className="lede">
          {error ?? 'The token is invalid, expired, or has already been used.'}
        </p>
      </section>
    );
  }

  if (stage === 'complete' && result) {
    return (
      <section className="panel panel--success">
        <p className="eyebrow">Account Ready</p>
        <h1>Your admin account is set up.</h1>
        <p className="lede">MFA is active and your dashboard entrypoint has been generated.</p>
        <div className="result-stack">
          <p className="result-line">
            <strong>Dashboard URL</strong>
            <span>{result.adminRedirectUrl}</span>
          </p>
          <a
            className="button button--primary"
            href={result.adminRedirectUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open Dashboard URL
          </a>
        </div>
      </section>
    );
  }

  if (stage === 'mfa' && invite && result) {
    return (
      <section className="panel">
        <p className="eyebrow">Step 2</p>
        <h1>Set up MFA for {invite.businessName ?? 'your store'}.</h1>
        <p className="lede">
          Scan the QR code with your authenticator app, then enter the 6-digit code below.
        </p>
        <div className="mfa-layout">
          <div className="mfa-card">
            {qrCodeUrl ? (
              <img
                alt="Authenticator QR code"
                className="qr-code"
                height={220}
                src={qrCodeUrl}
                width={220}
              />
            ) : (
              <div className="qr-code qr-code--fallback">QR generation unavailable</div>
            )}
            <p className="secret-code">{result.secretCode}</p>
          </div>
          <form
            className="stack mfa-form"
            onSubmit={(event) => {
              void handleMfaSubmit(event);
            }}
          >
            <label className="field">
              <span>Authenticator code</span>
              <input
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setMfaCode(event.target.value)}
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

  return (
    <section className="panel">
      <p className="eyebrow">Step 1</p>
      <h1>Create your admin password.</h1>
      <p className="lede">
        {invite?.businessName
          ? `Finish setting up the first admin account for ${invite.businessName}.`
          : 'Finish setting up your first admin account.'}
      </p>
      <form
        className="stack"
        onSubmit={(event) => {
          void handlePasswordSubmit(event);
        }}
      >
        <label className="field">
          <span>Password</span>
          <input
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input
            autoComplete="new-password"
            onChange={(event) => setPasswordConfirm(event.target.value)}
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
