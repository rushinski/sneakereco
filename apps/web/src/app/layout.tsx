import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'SneakerEco Web',
  description: 'Tenant storefront authentication and design surfaces.',
};

export default function RootLayout(props: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}