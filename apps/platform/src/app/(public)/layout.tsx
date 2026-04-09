import { Header } from '../../components/platform/Header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <Header />
      <main className="page-frame">{children}</main>
    </div>
  );
}
