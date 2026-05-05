'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';

import { getCsrfToken } from '@/lib/auth/csrf-client';
import { setClientSession } from '@/lib/auth/client-session';

interface Field {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}

export function PlatformAuthForm(props: {
  endpoint: string;
  title: string;
  description: string;
  submitLabel: string;
  fields: Field[];
  defaultValues?: Record<string, string>;
  successHref?: string;
  onSuccess?: (payload: Record<string, unknown>, router: ReturnType<typeof useRouter>) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...props.defaultValues }));
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(undefined);
        setSuccess(undefined);

        startTransition(async () => {
          try {
            const csrfToken = await getCsrfToken();
            const response = await fetch(props.endpoint, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-csrf-token': csrfToken,
              },
              body: JSON.stringify(values),
            });
            const payload = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
              message?: string;
            };

            if (!response.ok) {
              setError(payload.message ?? 'Request failed');
              return;
            }

            if (typeof payload.accessToken === 'string') {
              setClientSession(payload.accessToken, payload.principal);
            }

            if (props.onSuccess) {
              props.onSuccess(payload, router);
              return;
            }

            setSuccess(payload.message ?? 'Success');
            if (props.successHref) {
              void router.push(props.successHref);
            }
          } finally {
            setPending(false);
          }
        });
      }}
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white">{props.title}</h2>
        <p className="text-sm leading-6 text-slate-400">{props.description}</p>
      </div>
      {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}
      <div className="space-y-4">
        {props.fields.map((field) =>
          field.type === 'hidden' ? (
            <input key={field.name} type="hidden" value={values[field.name] ?? ''} readOnly />
          ) : (
            <label key={field.name} className="block space-y-2">
              <span className="text-sm font-medium text-slate-400">{field.label}</span>
              <input
                type={field.type ?? 'text'}
                value={values[field.name] ?? ''}
                onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                placeholder={field.placeholder}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
              />
            </label>
          ),
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Working...' : props.submitLabel}
      </button>
    </form>
  );
}
