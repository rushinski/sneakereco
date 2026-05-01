'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useState } from 'react';

import { getCsrfToken } from '@/lib/auth/csrf-client';
import { setClientSession } from '@/lib/auth/client-session';

import { AuthStatusBanner } from '../shell/auth-shell';

type SetupStep = 'consume' | 'password' | 'mfa';

export function AdminSetupFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<SetupStep>('consume');
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [setupSessionToken, setSetupSessionToken] = useState('');
  const [password, setPassword] = useState('');
  const [challengeSessionToken, setChallengeSessionToken] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(path: string, payload: Record<string, unknown>) {
    const csrfToken = await getCsrfToken();
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(payload),
    });

    return {
      ok: response.ok,
      payload: (await response.json().catch(() => ({}))) as Record<string, unknown>,
    };
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-current">Complete your admin account</h2>
        <p className="text-sm leading-6 text-zinc-500">
          Verify the invitation, create your password, connect your authenticator app, and then continue straight into the admin dashboard.
        </p>
      </div>
      <AuthStatusBanner tone="danger" message={error} />
      <AuthStatusBanner tone="success" message={success} />

      {step === 'consume' ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(undefined);
            setSuccess(undefined);

            startTransition(async () => {
              try {
                const result = await submit('/api/auth/admin/setup/consume', { token });
                if (!result.ok) {
                  setError(String(result.payload.message ?? 'Invitation verification failed'));
                  return;
                }

                setSetupSessionToken(String(result.payload.setupSessionToken ?? ''));
                setSuccess(String(result.payload.message ?? 'Invitation verified'));
                setStep('password');
              } finally {
                setPending(false);
              }
            });
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-500">Invitation token</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-white/10"
              placeholder="setup_token"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#dc2626] dark:hover:bg-[#b91c1c]"
          >
            {pending ? 'Verifying...' : 'Verify invitation'}
          </button>
        </form>
      ) : null}

      {step === 'password' ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(undefined);
            setSuccess(undefined);

            startTransition(async () => {
              try {
                const result = await submit('/api/auth/admin/setup/begin', {
                  setupSessionToken,
                  password,
                });
                if (!result.ok) {
                  setError(String(result.payload.message ?? 'Password setup failed'));
                  return;
                }

                setChallengeSessionToken(String(result.payload.challengeSessionToken ?? ''));
                setTotpSecret(String(result.payload.totpSecret ?? ''));
                setOtpauthUri(String(result.payload.otpauthUri ?? ''));
                setSuccess(String(result.payload.message ?? 'Password saved. Continue with MFA.'));
                setStep('mfa');
              } finally {
                setPending(false);
              }
            });
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-500">Create password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-white/10"
              placeholder="Create a strong password"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#dc2626] dark:hover:bg-[#b91c1c]"
          >
            {pending ? 'Saving...' : 'Save password'}
          </button>
        </form>
      ) : null}

      {step === 'mfa' ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(undefined);
            setSuccess(undefined);

            startTransition(async () => {
              try {
                const result = await submit('/api/auth/admin/setup/complete', {
                  challengeSessionToken,
                  code,
                  deviceId: 'tenant-admin-web',
                });
                if (!result.ok) {
                  setError(String(result.payload.message ?? 'MFA completion failed'));
                  return;
                }

                if (typeof result.payload.accessToken === 'string') {
                  setClientSession(result.payload.accessToken, result.payload.principal);
                }

                void router.push('/admin');
              } finally {
                setPending(false);
              }
            });
          }}
        >
          <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
            <p className="font-medium text-zinc-900 dark:text-white">Authenticator app setup</p>
            <p className="mt-2">Secret: <span className="font-mono">{totpSecret}</span></p>
            <p className="mt-2 break-all text-xs text-zinc-500">URI: {otpauthUri}</p>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-500">Authenticator code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-white/10"
              placeholder="123456"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#dc2626] dark:hover:bg-[#b91c1c]"
          >
            {pending ? 'Finishing...' : 'Complete setup and sign in'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
