/**
 * Thumbnail preview of the "bold" auth template.
 * Split layout: left branding panel (primary color), right form panel (white).
 */
export function AuthPreviewBold({
  headline,
  description,
}: {
  headline?: string | null;
  description?: string | null;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg flex">
      {/* Left — branding panel */}
      <div
        className="flex w-1/2 flex-col justify-between p-4"
        style={{ background: 'var(--color-primary)' }}
      >
        {/* Logo + name row */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-white/20" />
          <div className="h-2 w-14 rounded bg-white/40" />
        </div>
        {/* Hero text */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold leading-tight text-white line-clamp-3">
            {headline || 'Your brand headline here.'}
          </p>
          <p className="text-[10px] leading-snug text-white/60 line-clamp-3">
            {description || 'A short description about your store.'}
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div
        className="flex w-1/2 flex-col justify-center p-4 space-y-2"
        style={{ background: 'var(--color-background)' }}
      >
        {/* Sign in label */}
        <div
          className="h-2.5 w-10 rounded"
          style={{ background: 'var(--color-text)' }}
        />
        {/* Fields */}
        <div
          className="h-6 w-full rounded"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
        />
        <div
          className="h-6 w-full rounded"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
        />
        {/* Button */}
        <div
          className="h-6 w-full rounded"
          style={{ background: 'var(--color-primary)' }}
        />
        {/* Forgot */}
        <div
          className="h-2 w-14 rounded mx-auto"
          style={{ background: 'var(--color-border)' }}
        />
      </div>
    </div>
  );
}
