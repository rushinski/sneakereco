'use client';

import { useEffect, useMemo, useState } from 'react';

type FamilyRecord = {
  id: string;
  key: string;
  name: string;
};

type EditorContract = {
  previewModes: Array<'desktop' | 'tablet' | 'mobile'>;
  defaultPreviewMode: 'desktop' | 'tablet' | 'mobile';
  authPreviewStates: string[];
  designFamilies: FamilyRecord[];
};

const viewportClasses: Record<string, string> = {
  desktop: 'w-full max-w-5xl',
  tablet: 'mx-auto w-full max-w-2xl',
  mobile: 'mx-auto w-full max-w-sm',
};

export function WebDesignStudio() {
  const [contract, setContract] = useState<EditorContract | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewState, setPreviewState] = useState('default_sign_in');
  const [familyKey, setFamilyKey] = useState('auth-family-a');

  useEffect(() => {
    void fetch('/api/editor-contract')
      .then(async (response) => (await response.json()) as EditorContract)
      .then((payload) => {
        setContract(payload);
        setPreviewMode(payload.defaultPreviewMode);
        setPreviewState(payload.authPreviewStates[0] ?? 'default_sign_in');
        setFamilyKey(payload.designFamilies[0]?.key ?? 'auth-family-a');
      });
  }, []);

  const family = useMemo(
    () => contract?.designFamilies.find((entry) => entry.key === familyKey) ?? null,
    [contract, familyKey],
  );

  const isDark = family?.key === 'auth-family-b';

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <section className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Controls</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900">Web design</h3>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">Design family</span>
          <select
            value={familyKey}
            onChange={(event) => setFamilyKey(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          >
            {contract?.designFamilies.map((entry) => (
              <option key={entry.id} value={entry.key}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-600">State</span>
          <select
            value={previewState}
            onChange={(event) => setPreviewState(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          >
            {contract?.authPreviewStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-600">Viewport</p>
          <div className="flex gap-2">
            {(contract?.previewModes ?? ['desktop', 'tablet', 'mobile']).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPreviewMode(mode)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  previewMode === mode
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="rounded-[1.5rem] bg-slate-100 p-4">
          <div className={viewportClasses[previewMode]}>
            <div
              className={`overflow-hidden rounded-[1.75rem] border ${
                isDark ? 'border-white/10 bg-[#050505] text-white' : 'border-stone-200 bg-[#f6f3ec] text-stone-900'
              }`}
            >
              <div className={`grid min-h-[620px] ${isDark ? 'lg:grid-cols-[1.1fr_0.9fr]' : 'lg:grid-cols-[0.9fr_1.1fr]'}`}>
                <div className={`p-8 sm:p-10 ${isDark ? 'border-b border-white/10 lg:border-b-0 lg:border-r lg:border-r-white/10' : ''}`}>
                  <p className={`text-xs uppercase tracking-[0.45em] ${isDark ? 'text-red-400' : 'text-stone-500'}`}>
                    {previewState.replaceAll('_', ' ')}
                  </p>
                  <h4 className="mt-6 max-w-lg text-4xl font-semibold tracking-[-0.05em]">
                    {isDark ? 'Authentic sneakers. Verified sellers.' : 'A quieter way to return to your store.'}
                  </h4>
                  <p className={`mt-4 max-w-lg text-base leading-7 ${isDark ? 'text-zinc-300' : 'text-stone-600'}`}>
                    {isDark
                      ? 'Family B keeps the split editorial layout and the bolder call to action for high-brand storefronts.'
                      : 'Family A keeps the minimal editorial shell with soft surfaces and simple pathfinding across auth flows.'}
                  </p>
                </div>
                <div className={`flex items-center justify-center p-6 sm:p-10 ${isDark ? 'bg-[#0d0d10]' : 'bg-white/80'}`}>
                  <div className={`w-full max-w-md rounded-[1.5rem] p-6 ${isDark ? 'border border-white/10 bg-black/20' : 'border border-stone-200 bg-white'}`}>
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-2xl font-semibold tracking-[-0.03em]">
                          {previewState === 'otp_sent' ? 'Check your email' : 'Sign in'}
                        </h5>
                        <p className={`mt-2 text-sm ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                          {previewState === 'validation_error'
                            ? 'Previewing a validation error state.'
                            : previewState === 'otp_sent'
                              ? 'Previewing the email-code continuation state.'
                              : 'Previewing the default sign-in form.'}
                        </p>
                      </div>
                      {previewState === 'validation_error' ? (
                        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                          The password you entered was rejected.
                        </div>
                      ) : null}
                      {['Email', previewState === 'otp_sent' ? 'Verification code' : 'Password'].map((label) => (
                        <div key={label} className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-white/10 bg-white/5 text-zinc-400' : 'border-stone-200 bg-stone-50 text-stone-400'}`}>
                          {label}
                        </div>
                      ))}
                      <div className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold ${isDark ? 'bg-[#dc2626] text-white' : 'bg-[#111111] text-white'}`}>
                        {previewState === 'otp_sent' ? 'Continue' : 'Sign in'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
