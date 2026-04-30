import Link from 'next/link';

export function PlatformAuthShell(props: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a1220] text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-12">
        <section className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(53,114,239,0.22),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.01))] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
          <div className="space-y-8">
            <Link href="/login" className="text-xs uppercase tracking-[0.4em] text-cyan-200">
              dashboard.sneakereco
            </Link>
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-300">{props.eyebrow}</p>
              <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.05em] text-balance md:text-6xl">
                {props.title}
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-300">{props.description}</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-400">
            <p>Platform approvals, onboarding recovery, and system-level auth stay structurally platform controlled.</p>
            <p className="uppercase tracking-[0.35em] text-slate-500">Mode: full</p>
          </div>
        </section>
        <section className="flex items-center justify-center">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#111a2c] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-10">
            {props.children}
          </div>
        </section>
      </div>
    </div>
  );
}