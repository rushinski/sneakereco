'use client';

import { useState } from 'react';

import { ApiClientError, apiClient, getAccessToken } from '../../lib/api-client';
import { AuthPreviewSimple } from '../theme/AuthPreviewSimple';
import { AuthPreviewBold } from '../theme/AuthPreviewBold';

import { ViewportToggle, type Viewport } from './ViewportToggle';
import { PreviewFrame } from './PreviewFrame';

type Variant = 'simple' | 'bold';

interface Props {
  tenantId: string;
  initialVariant: Variant;
  initialHeadline: string | null;
  initialDescription: string | null;
}

const VIEWPORT_ASPECT: Record<Viewport, string> = {
  desktop: 'aspect-[16/9]',
  tablet: 'aspect-[4/3]',
  mobile: 'aspect-[9/16]',
};

export function AuthPagePickerWithPreview({
  tenantId,
  initialVariant,
  initialHeadline,
  initialDescription,
}: Props) {
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const [headline, setHeadline] = useState(initialHeadline ?? '');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [viewport, setViewport] = useState<Viewport>('desktop');
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
    { id: 'simple', label: 'Simple', description: 'Centered card, clean and minimal.' },
    { id: 'bold', label: 'Bold', description: 'Split layout with a branded left panel.' },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Auth Pages</h2>
        <ViewportToggle value={viewport} onChange={setViewport} />
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden p-6">
        {/* Config panel */}
        <div className="w-64 shrink-0 space-y-5 overflow-y-auto">
          {/* Template cards */}
          <div className="space-y-2.5">
            {templates.map((t) => {
              const active = variant === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setVariant(t.id)}
                  className={[
                    'group relative w-full overflow-hidden rounded-xl border-2 text-left transition-all',
                    active ? 'border-gray-900 shadow-md' : 'border-gray-200 hover:border-gray-400',
                  ].join(' ')}
                >
                  <div className={`w-full bg-gray-100 ${VIEWPORT_ASPECT[viewport]}`}>
                    {t.id === 'simple' ? (
                      <AuthPreviewSimple />
                    ) : (
                      <AuthPreviewBold
                        headline={headline || null}
                        description={description || null}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-white px-3 py-2.5">
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

          {/* Bold config */}
          {variant === 'bold' && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700">Bold content</p>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Headline</label>
                <input
                  type="text"
                  maxLength={120}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Authentic sneakers."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Description</label>
                <textarea
                  maxLength={300}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Sign in to pick up where you left off."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                />
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saved && <span className="text-sm text-green-600">Saved.</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>

        {/* Live preview */}
        <PreviewFrame viewport={viewport}>
          <div className="h-[500px]">
            {variant === 'simple' ? (
              <AuthPreviewSimple />
            ) : (
              <AuthPreviewBold headline={headline || null} description={description || null} />
            )}
          </div>
        </PreviewFrame>
      </div>
    </div>
  );
}
