'use client';

import { useState } from 'react';

import { ApiClientError, apiClient, getAccessToken } from '../../lib/api-client';

import { AuthPreviewSimple } from './AuthPreviewSimple';
import { AuthPreviewBold } from './AuthPreviewBold';

type Variant = 'simple' | 'bold';

interface AuthPagePickerProps {
  tenantId: string;
  initialVariant: Variant;
  initialHeadline: string | null;
  initialDescription: string | null;
}

export function AuthPagePicker({
  tenantId,
  initialVariant,
  initialHeadline,
  initialDescription,
}: AuthPagePickerProps) {
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const [headline, setHeadline] = useState(initialHeadline ?? '');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const token = getAccessToken();
      const csrf = await apiClient.getCsrfToken();
      await apiClient.updateTheme(
        {
          authVariant: variant,
          authHeadline: variant === 'bold' ? headline || null : null,
          authDescription: variant === 'bold' ? description || null : null,
        },
        tenantId,
        token!,
        csrf.token,
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const templates: { id: Variant; label: string; description: string }[] = [
    {
      id: 'simple',
      label: 'Simple',
      description: 'Centered card, clean and minimal.',
    },
    {
      id: 'bold',
      label: 'Bold',
      description: 'Split layout with a branded left panel.',
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Auth page template</h2>
        <p className="text-sm text-gray-500">
          Choose the layout used for sign in, sign up, forgot password, and MFA pages. Previewed in
          your current palette.
        </p>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-2 gap-5">
        {templates.map((t) => {
          const active = variant === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setVariant(t.id)}
              className={[
                'group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all',
                active ? 'border-gray-900 shadow-md' : 'border-gray-200 hover:border-gray-400',
              ].join(' ')}
            >
              {/* Preview area */}
              <div className="h-52 w-full bg-gray-100">
                {t.id === 'simple' ? (
                  <AuthPreviewSimple />
                ) : (
                  <AuthPreviewBold headline={headline || null} description={description || null} />
                )}
              </div>

              {/* Label row */}
              <div className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </div>
                {active && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bold template config */}
      {variant === 'bold' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Bold template content</h3>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Headline</label>
            <input
              type="text"
              maxLength={120}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Authentic sneakers. Verified sellers."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Description</label>
            <textarea
              maxLength={300}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Sign in to pick up right where you left off."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none"
            />
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
