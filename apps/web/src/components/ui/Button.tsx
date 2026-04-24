'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  loading,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const base =
    'w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed';
  const styles: Record<Variant, string> = {
    primary: '',
    ghost: '',
  };

  const inlineStyle =
    variant === 'primary'
      ? { background: 'var(--color-primary)', color: '#fff' }
      : {
          background: 'transparent',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${styles[variant]} ${className}`}
      style={inlineStyle}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
