'use client';

import { type FormEvent, useState } from 'react';

import { ApiClientError, apiClient } from '../../lib/api-client';
import { getStoreAdminExternalPath } from '../../lib/routing/store-admin-paths';

import { AuthField } from './AuthField';

export function StoreAdminForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.forgotStoreAdminPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Request failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Store Admin
          </p>
          <h1 className="mt-2 text-xl font-bold text-gray-900">Check your email.</h1>
          <p className="mt-2 text-sm text-gray-500">
            We sent a reset code to <strong>{email}</strong>.
          </p>
          <a
            href={`${getStoreAdminExternalPath('/admin/auth/reset-password', typeof window === 'undefined' ? '' : window.location.host)}?email=${encodeURIComponent(email)}`}
            className="mt-6 block text-center text-sm underline underline-offset-2 text-gray-900"
          >
            I have a code
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Store Admin</p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">Reset your password.</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <AuthField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send Reset Code'}
          </button>
          <p className="text-center text-xs text-gray-500">
            <a
              href={getStoreAdminExternalPath(
                '/admin/auth/login',
                typeof window === 'undefined' ? '' : window.location.host,
              )}
              className="underline underline-offset-2"
            >
              Back to sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
