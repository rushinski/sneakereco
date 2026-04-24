'use client';

import type { ReactNode } from 'react';

import type { Viewport } from './ViewportToggle';

const MAX_WIDTH: Record<Viewport, number> = {
  desktop: 1200,
  tablet: 768,
  mobile: 375,
};

export function PreviewFrame({ viewport, children }: { viewport: Viewport; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      <div className="flex-1 overflow-auto p-4">
        <div
          className="mx-auto overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300"
          style={{ maxWidth: MAX_WIDTH[viewport] }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
