'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient } from '../../../lib/api-client';
import { Button } from '../../ui/Button';
import { ThemedField } from './ThemedField';

export function ResetPasswordForm({ email, code: initialCode }: { email: string; code?: string }) {
  const router = useRouter();

  const [code, setCode] = useState(initialCode ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.resetCustomerPassword({ email, code, newPassword });
      router.push('/login');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Reset failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { void handleSubmit(e); }}>
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Set a new password.</h2>
      </div>
      {!initialCode && (
        <ThemedField
          label="Reset code"
          type="text"
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
        />
      )}
      <ThemedField
        label="New password"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={setNewPassword}
      />
      <ThemedField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" loading={submitting}>Set Password</Button>
    </form>
  );
}
