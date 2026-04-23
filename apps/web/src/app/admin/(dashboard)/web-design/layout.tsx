import type { ReactNode } from 'react';

export default function WebDesignLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-full gap-0">{children}</div>;
}
