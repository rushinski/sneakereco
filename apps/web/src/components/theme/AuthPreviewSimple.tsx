/**
 * Thumbnail preview of the "simple" auth template.
 * Centered card, form fields, full-width button.
 * Renders in the tenant's palette (CSS vars injected by AdminRootLayout).
 */
export function AuthPreviewSimple() {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg"
      style={{ background: 'var(--color-background)' }}
    >
      {/* Centered card */}
      <div
        className="absolute inset-0 flex items-center justify-center p-6"
      >
        <div
          className="w-full max-w-[220px] rounded-lg p-5 shadow-sm"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {/* Logo placeholder */}
          <div
            className="mx-auto mb-4 h-6 w-16 rounded"
            style={{ background: 'var(--color-border)' }}
          />
          {/* Title */}
          <div
            className="mx-auto mb-4 h-3 w-20 rounded"
            style={{ background: 'var(--color-text-muted)' }}
          />
          {/* Fields */}
          <div className="space-y-2">
            <div
              className="h-7 w-full rounded"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-background)' }}
            />
            <div
              className="h-7 w-full rounded"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-background)' }}
            />
          </div>
          {/* Button */}
          <div
            className="mt-3 h-7 w-full rounded"
            style={{ background: 'var(--color-primary)' }}
          />
          {/* Forgot */}
          <div
            className="mx-auto mt-3 h-2 w-16 rounded"
            style={{ background: 'var(--color-border)' }}
          />
        </div>
      </div>
    </div>
  );
}
