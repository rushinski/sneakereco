'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useMemo, useState } from 'react';

import { getCsrfToken } from '@/lib/auth/csrf-client';
import { setClientSession } from '@/lib/auth/client-session';

import { AuthStatusBanner } from './auth-shell';

type Field = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
};

interface AuthLink {
  href: string;
  label: string;
}

export function AuthForm(props: {
  endpoint: string;
  title: string;
  description: string;
  fields: Field[];
  submitLabel: string;
  defaultValues?: Record<string, string>;
  links?: AuthLink[];
  hint?: string;
  onSuccess?: (payload: Record<string, unknown>, router: ReturnType<typeof useRouter>) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...props.defaultValues }));
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  const fieldMap = useMemo(() => props.fields.map((field) => field.name), [props.fields]);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(undefined);
        setSuccess(undefined);
        setIsPending(true);

        const payload = fieldMap.reduce<Record<string, string>>((accumulator, key) => {
          accumulator[key] = values[key] ?? '';
          return accumulator;
        }, {});

        startTransition(async () => {
          try {
            const csrfToken = await getCsrfToken();
            const response = await fetch(props.endpoint, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-csrf-token': csrfToken,
              },
              body: JSON.stringify(payload),
            });

            const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
              message?: string;
              accessToken?: string;
            };

            if (!response.ok) {
              setError(data.message ?? 'Request failed');
              return;
            }

            if (typeof data.accessToken === 'string') {
              setClientSession(data.accessToken, data.principal);
            }

            setSuccess(typeof data.message === 'string' ? data.message : 'Success');
            props.onSuccess?.(data, router);
          } finally {
            setIsPending(false);
          }
        });
      }}
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-current">{props.title}</h2>
        <p className="text-sm leading-6 text-zinc-500">{props.description}</p>
      </div>
      <AuthStatusBanner tone="danger" message={error} />
      <AuthStatusBanner tone="success" message={success} />
      <div className="space-y-4">
        {props.fields.map((field) => (
          <label key={field.name} className="block space-y-2">
            <span className="text-sm font-medium text-zinc-500">{field.label}</span>
            <input
              type={field.type ?? 'text'}
              value={values[field.name] ?? ''}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              placeholder={field.placeholder}
              className="w-full rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-white/10"
            />
          </label>
        ))}
      </div>
      {props.hint ? <p className="text-sm text-zinc-500">{props.hint}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#dc2626] dark:text-white dark:hover:bg-[#b91c1c]"
      >
        {isPending ? 'Working...' : props.submitLabel}
      </button>
      {props.links?.length ? (
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-zinc-500">
          {props.links.map((link) => (
            <Link key={`${link.href}-${link.label}`} href={link.href} className="hover:text-zinc-950 dark:hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </form>
  );
}