'use client';

export type Viewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORTS: Viewport[] = ['desktop', 'tablet', 'mobile'];

export function ViewportToggle({
  value,
  onChange,
}: {
  value: Viewport;
  onChange: (v: Viewport) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {VIEWPORTS.map((vp) => (
        <button
          key={vp}
          onClick={() => onChange(vp)}
          className={[
            'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
            value === vp
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          {vp}
        </button>
      ))}
    </div>
  );
}
