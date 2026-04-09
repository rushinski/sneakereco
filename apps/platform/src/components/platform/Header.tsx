import Link from 'next/link';

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand-mark" href="/">
          SneakerEco
        </Link>
        <nav className="site-nav" aria-label="Primary">
          <Link className="button button--ghost" href="/request">
            Join Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
