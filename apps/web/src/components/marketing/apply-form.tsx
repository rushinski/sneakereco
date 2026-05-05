'use client';

import { startTransition, useState } from 'react';

export function ApplyForm() {
  const [values, setValues] = useState({ requestedByName: '', requestedByEmail: '', businessName: '', instagramHandle: '' });
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-[1.75rem] border border-stone-200 bg-white/90 p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.45em] text-stone-500">Application received</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-900">We'll be in touch.</h2>
          <p className="text-sm leading-6 text-stone-600">
            Your application is under review. If it's approved, you'll receive a setup invitation at{' '}
            <strong>{values.requestedByEmail}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-stone-200 bg-white/90 p-8 shadow-sm">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setError(undefined);

          startTransition(async () => {
            try {
              const response = await fetch('/api/onboarding/apply', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  requestedByName: values.requestedByName,
                  requestedByEmail: values.requestedByEmail,
                  businessName: values.businessName,
                  instagramHandle: values.instagramHandle || undefined,
                }),
              });

              if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as { message?: string };
                setError(data.message ?? 'Something went wrong. Please try again.');
                return;
              }

              setSubmitted(true);
            } finally {
              setPending(false);
            }
          });
        }}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-900">Apply to sell on SneakerEco</h2>
          <p className="text-sm leading-6 text-stone-600">Tell us about your brand. We review every application.</p>
        </div>
        {error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-600">Your name</span>
            <input
              type="text"
              required
              value={values.requestedByName}
              onChange={(e) => setValues((v) => ({ ...v, requestedByName: e.target.value }))}
              placeholder="Jane Smith"
              className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-base outline-none transition focus:border-stone-900 focus:ring-4 focus:ring-stone-900/10"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-600">Email address</span>
            <input
              type="email"
              required
              value={values.requestedByEmail}
              onChange={(e) => setValues((v) => ({ ...v, requestedByEmail: e.target.value }))}
              placeholder="jane@yourbrand.com"
              className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-base outline-none transition focus:border-stone-900 focus:ring-4 focus:ring-stone-900/10"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-600">Brand name</span>
            <input
              type="text"
              required
              value={values.businessName}
              onChange={(e) => setValues((v) => ({ ...v, businessName: e.target.value }))}
              placeholder="Your Sneaker Brand"
              className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-base outline-none transition focus:border-stone-900 focus:ring-4 focus:ring-stone-900/10"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-600">Instagram handle <span className="text-stone-400">(optional)</span></span>
            <input
              type="text"
              value={values.instagramHandle}
              onChange={(e) => setValues((v) => ({ ...v, instagramHandle: e.target.value }))}
              placeholder="@yourbrand"
              className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-base outline-none transition focus:border-stone-900 focus:ring-4 focus:ring-stone-900/10"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Submitting...' : 'Apply now'}
        </button>
      </form>
    </div>
  );
}
