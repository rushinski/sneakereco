import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="hero">
      <div className="hero__content">
        <p className="eyebrow">Platform Onboarding</p>
        <h1>Launch a sneaker storefront that feels owned, not rented.</h1>
        <p className="lede">
          SneakerEco handles the platform layer so independent resale brands can move faster,
          onboard cleanly, and grow under their own name.
        </p>
        <div className="hero__actions">
          <Link className="button button--primary" href="/request">
            Request an Account
          </Link>
        </div>
      </div>
      <div className="hero__aside panel panel--compact">
        <p className="eyebrow">Phase 1</p>
        <h2>What happens next</h2>
        <ul className="list">
          <li>You submit a store request.</li>
          <li>The platform team reviews the application.</li>
          <li>You receive a private invite link to create your admin account.</li>
          <li>MFA is required before dashboard access.</li>
        </ul>
      </div>
    </section>
  );
}
