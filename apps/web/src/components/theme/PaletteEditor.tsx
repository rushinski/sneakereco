'use client';

import { useState } from 'react';

import { ApiClientError, apiClient, getAccessToken } from '../../lib/api-client';

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Poppins',
  'Montserrat',
  'Playfair Display',
  'Oswald',
  'Lato',
  'Nunito',
];

const RADIUS_OPTIONS = [
  { label: 'None', value: '0px' },
  { label: 'Small', value: '4px' },
  { label: 'Medium', value: '8px' },
  { label: 'Large', value: '16px' },
  { label: 'Full', value: '9999px' },
];

interface PaletteEditorProps {
  tenantId: string;
  initial: {
    colorPrimary: string;
    colorSecondary: string;
    colorAccent: string;
    colorBackground: string;
    colorSurface: string;
    colorText: string;
    colorTextMuted: string;
    colorBorder: string;
    fontHeading: string;
    fontBody: string;
    borderRadius: string;
  };
}

export function PaletteEditor({ tenantId, initial }: PaletteEditorProps) {
  const [values, setValues] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const token = getAccessToken();
      const csrf = await apiClient.getCsrfToken();
      await apiClient.updateTheme(values, tenantId, token!, csrf.token);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Colors */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Colors</h2>
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ['colorPrimary', 'Primary'],
              ['colorSecondary', 'Secondary'],
              ['colorAccent', 'Accent'],
              ['colorBackground', 'Background'],
              ['colorSurface', 'Surface'],
              ['colorText', 'Text'],
              ['colorTextMuted', 'Text muted'],
              ['colorBorder', 'Border'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600 shrink-0">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={values[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
                />
                <input
                  type="text"
                  value={values[key]}
                  onChange={(e) => set(key, e.target.value)}
                  maxLength={7}
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-xs font-mono outline-none focus:border-gray-900"
                />
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Typography</h2>
        <div className="space-y-3">
          {(['fontHeading', 'fontBody'] as const).map((key) => (
            <label key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600 shrink-0">
                {key === 'fontHeading' ? 'Heading font' : 'Body font'}
              </span>
              <select
                value={values[key]}
                onChange={(e) => set(key, e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-900"
                style={{ fontFamily: values[key] }}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      {/* Border radius */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Border radius</h2>
        <div className="flex gap-2 flex-wrap">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => set('borderRadius', opt.value)}
              className={[
                'rounded border px-3 py-1.5 text-sm transition-colors',
                values.borderRadius === opt.value
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-gray-500',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Live preview swatch */}
        <div className="mt-5 flex gap-3">
          <div
            className="h-10 w-24 flex items-center justify-center text-xs text-white font-medium shadow-sm"
            style={{
              background: 'var(--color-primary)',
              borderRadius: values.borderRadius,
            }}
          >
            Button
          </div>
          <div
            className="h-10 w-24 border"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface)',
              borderRadius: values.borderRadius,
            }}
          />
        </div>
      </section>

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
