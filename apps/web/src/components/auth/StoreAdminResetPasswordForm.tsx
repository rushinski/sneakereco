'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient } from '../../lib/api-client';
import { getStoreAdminExternalPath } from '../../lib/routing/store-admin-paths';

import { AuthField } from './AuthField';

export function StoreAdminResetPasswordForm({
  email,
  code: initialCode,
}: {
  email: string;
  code?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.resetStoreAdminPassword({ email, code, newPassword });
      router.push(getStoreAdminExternalPath('/admin/auth/login', window.location.host));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Reset failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Store Admin</p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">Set a new password.</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          {!initialCode && (
            <AuthField
              label="Reset code"
              type="text"
              value={code}
              onChange={setCode}
              autoComplete="one-time-code"
            />
          )}
          <AuthField
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <AuthField
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
