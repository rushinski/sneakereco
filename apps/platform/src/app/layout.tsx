import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'SneakerEco Platform',
  description: 'Platform admin authentication and tenant approvals.',
};

export default function RootLayout(props: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}