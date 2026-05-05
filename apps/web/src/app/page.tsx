import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { resolveTenantFromHost } from '@/lib/auth/tenant';
import { ApplyForm } from '@/components/marketing/apply-form';

export default async function HomePage() {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? '';

  const tenant = await resolveTenantFromHost(host);
  if (tenant) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-stone-900">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-[0.45em] text-stone-500">SneakerEco</p>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Sell your sneakers on the platform built for independent brands.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
            SneakerEco gives independent sneaker brands their own storefront, checkout, and customer auth — all under your domain, all in your brand identity.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-stone-600">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
              Your own storefront subdomain from day one
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
              Fully white-labeled customer login and email flows
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
              Design your auth pages and emails from a visual editor
            </li>
          </ul>
        </section>
        <section className="flex flex-col justify-center">
          <ApplyForm />
        </section>
      </div>
    </main>
  );
}
