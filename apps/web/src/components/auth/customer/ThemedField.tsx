'use client';

import type { InputHTMLAttributes } from 'react';

interface ThemedFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  onChange: (value: string) => void;
}

export function ThemedField({ label, onChange, ...rest }: ThemedFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <input
        {...rest}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
    </div>
  );
}
