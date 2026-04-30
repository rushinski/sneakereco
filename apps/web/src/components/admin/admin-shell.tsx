import Link from 'next/link';

function NavLink(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      className="flex items-center rounded-2xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
    >
      {props.label}
    </Link>
  );
}

export function AdminShell(props: {
  title: string;
  trail: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#eef1f5] text-slate-900">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="bg-[#232f45] px-5 py-6 text-white">
          <div className="mb-8 flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="h-11 w-11 rounded-2xl bg-white/10" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-300">Tenant</p>
              <h1 className="text-base font-semibold">Heatkings</h1>
            </div>
          </div>
          <nav className="space-y-2">
            <NavLink href="/admin" label="Dashboard" />
            <NavLink href="/admin/web-design" label="Web design" />
          </nav>
        </aside>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white/85 px-6 py-5 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-slate-400">
                  {props.trail.map((item, index) => (
                    <span key={`${item}-${index}`} className="flex items-center gap-2">
                      {index ? <span>/</span> : null}
                      {item}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">{props.title}</h2>
              </div>
              <div className="w-full max-w-md">
                <input
                  readOnly
                  value="Search pages"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </div>
            </div>
          </header>
          <main className="flex-1 px-6 py-6">{props.children}</main>
        </div>
      </div>
    </div>
  );
}