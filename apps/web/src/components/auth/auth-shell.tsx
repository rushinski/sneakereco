import type { ReactNode } from 'react';

function shellClasses(family: 'a' | 'b') {
  return family === 'b'
    ? {
        page: 'min-h-screen bg-[#050505] text-white',
        card: 'border border-white/10 bg-[#0d0d10]',
        eyebrow: 'text-red-400',
        body: 'text-zinc-300',
      }
    : {
        page: 'min-h-screen bg-[#f6f3ec] text-stone-900',
        card: 'border border-stone-200 bg-white/90',
        eyebrow: 'text-stone-500',
        body: 'text-stone-600',
      };
}

export function AuthStatusBanner(props: {
  tone: 'danger' | 'success';
  message?: string;
}) {
  if (!props.message) {
    return null;
  }

  return (
    <div
      className={
        props.tone === 'danger'
          ? 'rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700'
          : 'rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
      }
    >
      {props.message}
    </div>
  );
}

export function AuthFamilyShell(props: {
  family: 'a' | 'b';
  eyebrow: string;
  title: string;
  description: string;
  supportingLine?: string;
  children: ReactNode;
}) {
  const classes = shellClasses(props.family);

  return (
    <main className={classes.page}>
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="flex flex-col justify-center">
          <p className={`text-xs uppercase tracking-[0.45em] ${classes.eyebrow}`}>{props.eyebrow}</p>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {props.title}
          </h1>
          <p className={`mt-4 max-w-xl text-base leading-7 ${classes.body}`}>{props.description}</p>
          {props.supportingLine ? (
            <p className={`mt-6 text-sm ${classes.body}`}>{props.supportingLine}</p>
          ) : null}
        </section>
        <section className={`rounded-[1.75rem] p-6 shadow-sm sm:p-8 ${classes.card}`}>{props.children}</section>
      </div>
    </main>
  );
}
