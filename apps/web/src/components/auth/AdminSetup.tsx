'use client';

import QRCode from 'qrcode';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  ApiClientError,
  apiClient,
  type CompleteOnboardingResult,
  type InviteSummary,
} from '../../lib/api-client';

type Stage = 'loading' | 'password' | 'mfa' | 'complete' | 'invalid';

export function AdminSetup({ token }: { token: string }) {
  const router = useRouter();

  const [accessToken, setLocalAccessToken] = useState<string | null>(null);
  const [csrfToken, setCsrfToken]   = useState<string | null>(null);
  const [invite, setInvite]         = useState<InviteSummary | null>(null);
  const [result, setResult]         = useState<CompleteOnboardingResult | null>(null);
  const [qrCodeUrl, setQrCodeUrl]   = useState<string | null>(null);
  const [password, setPassword]     = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [mfaCode, setMfaCode]       = useState('');
  const [stage, setStage]           = useState<Stage>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [csrf, inv] = await Promise.all([
          apiClient.getCsrfToken(),
          apiClient.validateInvite(token),
        ]);
        if (cancelled) return;
        setCsrfToken(csrf.token);
        setInvite(inv);
        setStage('password');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiClientError ? err.message : 'Could not validate invite.');
        setStage('invalid');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const otpAuthUri = useMemo(() => {
    if (!invite?.email || !result?.secretCode) return null;
    const issuer = 'SneakerEco';
    const label  = `${issuer}:${invite.email}`;
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(result.secretCode)}&issuer=${encodeURIComponent(issuer)}`;
  }, [invite?.email, result?.secretCode]);

  useEffect(() => {
    let cancelled = false;
    if (!otpAuthUri) { setQrCodeUrl(null); return; }
    void QRCode.toDataURL(otpAuthUri, { errorCorrectionLevel: 'M', margin: 1, width: 220 })
      .then((url: string) => { if (!cancelled) setQrCodeUrl(url); })
      .catch(() => { if (!cancelled) setQrCodeUrl(null); });
    return () => { cancelled = true; };
  }, [otpAuthUri]);

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!csrfToken) return;
    if (password !== passwordConfirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true); setError(null);
    try {
      const r = await apiClient.completeOnboarding({ password, token }, csrfToken);
      setLocalAccessToken(r.accessToken);
      setResult(r);
      setStage('mfa');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Setup failed.');
    } finally { setSubmitting(false); }
  }

  async function handleMfaSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!csrfToken || !accessToken) return;
    setSubmitting(true); setError(null);
    try {
      await apiClient.verifyMfa({ deviceName: 'SneakerEco Admin', mfaCode }, csrfToken, accessToken);
      setStage('complete');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'MFA code invalid.');
    } finally { setSubmitting(false); }
  }

  function Field({ label, type = 'text', value, onChange, autoComplete }: {
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    autoComplete?: string;
  }) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
      </div>
    );
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Validating your invite...</p>
      </div>
    );
  }

  if (stage === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm rounded-2xl border border-red-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-400">Invite Unavailable</p>
          <h1 className="mt-2 text-xl font-bold text-gray-900">This invite can&apos;t be used.</h1>
          <p className="mt-2 text-sm text-gray-500">
            {error ?? 'The token is invalid, expired, or already used.'}
          </p>
        </div>
      </div>
    );
  }

  if (stage === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm rounded-2xl border border-green-200 bg-white px-8 py-10 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-500">Account Ready</p>
          <h1 className="mt-2 text-xl font-bold text-gray-900">Your admin account is set up.</h1>
          <p className="mt-2 text-sm text-gray-500">MFA is active. You can now sign in to your dashboard.</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="mt-6 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'mfa' && result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Step 2</p>
          <h1 className="mt-2 text-xl font-bold text-gray-900">Set up MFA for {invite?.businessName ?? 'your store'}.</h1>
          <p className="mt-2 text-sm text-gray-500">Scan the QR code then enter the 6-digit code.</p>
          <div className="mt-6 flex gap-6 flex-wrap">
            <div>
              {qrCodeUrl ? (
                <img alt="QR code" src={qrCodeUrl} width={200} height={200} className="rounded-lg border border-gray-200" />
              ) : (
                <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-400">
                  QR unavailable
                </div>
              )}
              <p className="mt-2 break-all font-mono text-[10px] text-gray-400">{result.secretCode}</p>
            </div>
            <form className="flex flex-1 flex-col gap-4 min-w-[160px]" onSubmit={(e) => { void handleMfaSubmit(e); }}>
              <Field label="Authenticator code" value={mfaCode} onChange={setMfaCode} autoComplete="one-time-code" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {submitting ? 'Verifying...' : 'Verify MFA'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Stage: password
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Step 1</p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">Create your admin password.</h1>
        <p className="mt-2 text-sm text-gray-500">
          {invite?.businessName
            ? `Finish setting up the first admin account for ${invite.businessName}.`
            : 'Finish setting up your admin account.'}
        </p>
        <form className="mt-6 space-y-4" onSubmit={(e) => { void handlePasswordSubmit(e); }}>
          <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
          <Field label="Confirm password" type="password" value={passwordConfirm} onChange={setPasswordConfirm} autoComplete="new-password" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {submitting ? 'Setting up...' : 'Continue to MFA Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
