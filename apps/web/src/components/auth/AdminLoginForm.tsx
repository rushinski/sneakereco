'use client';

import QRCode from 'qrcode';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient, setAccessToken } from '../../lib/api-client';
import { AuthField } from './AuthField';

type Stage = 'login' | 'mfa' | 'mfa_setup';

type FormShellProps = {
  title: string;
  eyebrow: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  error: string | null;
  ready: boolean;
  submitting: boolean;
  children: ReactNode;
};

function FormShell({
  title,
  eyebrow,
  onSubmit,
  submitLabel,
  error,
  ready,
  submitting,
  children,
}: FormShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{eyebrow}</p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">{title}</h1>
        <form className="mt-6 space-y-4" onSubmit={(e) => { void onSubmit(e); }}>
          {children}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={!ready || submitting}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminLoginForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();

  const [csrfToken, setCsrfToken]   = useState<string | null>(null);
  const [tenantId, setTenantId]     = useState<string | null>(null);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [mfaCode, setMfaCode]       = useState('');
  const [mfaSession, setMfaSession] = useState<string | null>(null);
  const [setupSession, setSetupSession]       = useState<string | null>(null);
  const [setupSecretCode, setSetupSecretCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl]             = useState<string | null>(null);
  const [stage, setStage]           = useState<Stage>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const otpAuthUri = useMemo(() => {
    if (!setupSecretCode || !email) return null;
    const issuer = 'SneakerEco';
    const label  = `${issuer}:${email}`;
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
    void (async () => {
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
    })();
  }, [tenantSlug]);

  const ready = Boolean(csrfToken && tenantId);

  async function handleLoginSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!csrfToken || !tenantId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.loginAdmin({ email, password, tenantId }, csrfToken);
      if (result.type === 'mfa_required') {
        setMfaSession(result.session);
        setStage('mfa');
        return;
      }
      if (result.type === 'mfa_setup') {
        const associated = await apiClient.beginMfaSetup(result.session);
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

  async function handleMfaSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!csrfToken || !mfaSession || !tenantId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.completeAdminMfaChallenge(
        { email, mfaCode, session: mfaSession, tenantId },
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

  async function handleMfaSetupSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!csrfToken || !setupSession || !tenantId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.completeMfaSetup(
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">First-time Setup</p>
          <h1 className="mt-2 text-xl font-bold text-gray-900">Set up your authenticator app.</h1>
          <p className="mt-2 text-sm text-gray-500">
            Scan the QR code, then enter the 6-digit code to continue.
          </p>
          <div className="mt-6 flex gap-6 flex-wrap">
            <div>
              {qrCodeUrl ? (
                <img alt="Authenticator QR" src={qrCodeUrl} width={180} height={180} className="rounded-lg border border-gray-200" />
              ) : (
                <div className="flex h-[180px] w-[180px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-400">
                  QR unavailable
                </div>
              )}
              <p className="mt-2 break-all font-mono text-[10px] text-gray-400">{setupSecretCode}</p>
            </div>
            <form
              className="flex flex-1 flex-col gap-4 min-w-[160px]"
              onSubmit={(e) => { void handleMfaSetupSubmit(e); }}
            >
              <AuthField
                label="Authenticator code"
                type="text"
                value={mfaCode}
                onChange={setMfaCode}
                autoComplete="one-time-code"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {submitting ? 'Verifying...' : 'Activate MFA'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'mfa') {
    return (
      <FormShell
        eyebrow="Two-Factor Authentication"
        title="Enter your authenticator code."
        onSubmit={handleMfaSubmit}
        submitLabel={submitting ? 'Verifying...' : 'Verify'}
        error={error}
        ready={ready}
        submitting={submitting}
      >
        <AuthField
          label="6-digit code"
          type="text"
          value={mfaCode}
          onChange={setMfaCode}
          autoComplete="one-time-code"
        />
      </FormShell>
    );
  }

  return (
    <FormShell
      eyebrow="Admin"
      title="Sign in to your store."
      onSubmit={handleLoginSubmit}
      submitLabel={submitting ? 'Signing in...' : 'Sign In'}
      error={error}
      ready={ready}
      submitting={submitting}
    >
      <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <AuthField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
    </FormShell>
  );
}
