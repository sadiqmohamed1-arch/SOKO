import React from 'react';
import { ArrowRight } from 'lucide-react';
import { AUDIENCES, type AudienceId } from './landingContent';
import { Wordmark } from './PublicHeader';

export const AboutSection: React.FC = () => (
  <section id="about" aria-labelledby="about-heading" className="scroll-mt-20 border-t border-soko-line bg-soko-mist py-20 lg:py-28">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:px-8">
      <div>
        <p className="text-sm font-semibold text-soko-blue">About SOKO</p>
        <h2 id="about-heading" className="mt-2 text-4xl font-bold tracking-tight text-soko-ink text-balance">
          UAE-first, with global ambitions.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-soko-muted text-pretty">
          SOKO is being built in the UAE for the people and companies who design, supply and build. We are in pre-launch, starting with the UAE market and designing the platform to work across borders as it grows.
        </p>
      </div>

      <dl className="flex flex-col gap-4">
        <div className="rounded-2xl border border-soko-line bg-white p-6 sm:p-8">
          <dt className="text-xs font-semibold uppercase tracking-wider text-soko-blue">Vision</dt>
          <dd className="mt-3 text-xl font-medium leading-relaxed text-soko-ink text-pretty">
            To create a globally connected construction industry where trusted business relationships and useful intelligence are accessible through one network.
          </dd>
        </div>
        <div className="rounded-2xl border border-soko-line bg-white p-6 sm:p-8">
          <dt className="text-xs font-semibold uppercase tracking-wider text-soko-blue">Mission</dt>
          <dd className="mt-3 text-xl font-medium leading-relaxed text-soko-ink text-pretty">
            To simplify how construction professionals and businesses discover, connect, verify, showcase and manage industry relationships.
          </dd>
        </div>
      </dl>
    </div>
  </section>
);

interface FinalCtaProps {
  onGetStarted: () => void;
  onExplore: () => void;
}

export const FinalCta: React.FC<FinalCtaProps> = ({ onGetStarted, onExplore }) => (
  <section aria-labelledby="cta-heading" className="py-20 lg:py-28">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-soko-ink px-6 py-16 text-center sm:px-12 lg:py-24">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,rgba(37,99,235,0.45),transparent_70%)]" />
        <div className="relative mx-auto max-w-2xl">
          <h2 id="cta-heading" className="text-4xl font-bold tracking-tight text-white text-balance sm:text-5xl">
            Your Construction Network Starts Here.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/75 text-pretty">
            Join the network connecting construction professionals, suppliers, products and opportunities.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-soko-blue px-6 py-3.5 font-semibold text-white transition-colors hover:bg-soko-blue/90"
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onExplore}
              className="inline-flex items-center justify-center rounded-lg border border-white/25 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Explore SOKO
            </button>
          </div>
          <p className="mt-5 text-sm text-white/60">Explore SOKO opens the interactive demo with sample data.</p>
        </div>
      </div>
    </div>
  </section>
);

interface PublicFooterProps {
  onLogin: () => void;
  onRegister: () => void;
  onSelectAudience: (id: AudienceId) => void;
}

const Pending: React.FC<{ label: string }> = ({ label }) => (
  <span className="flex items-center gap-2 text-soko-muted">
    {label}
    <span className="rounded bg-soko-mist px-1.5 py-0.5 text-[11px] font-medium text-soko-muted">Coming soon</span>
  </span>
);

export const PublicFooter: React.FC<PublicFooterProps> = ({ onLogin, onRegister, onSelectAudience }) => {
  const linkClass = 'text-soko-muted transition-colors hover:text-soko-ink';
  return (
    <footer className="border-t border-soko-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:px-8">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-soko-muted">The Intelligence Network for Construction.</p>
          <p className="mt-2 text-sm text-soko-muted">so.co.ae</p>
        </div>

        <nav aria-label="Platform">
          <h2 className="text-sm font-semibold text-soko-ink">Platform</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            <li><a href="#platform" className={linkClass}>Platform</a></li>
            <li><a href="#how-it-works" className={linkClass}>How It Works</a></li>
            <li><a href="#pricing" className={linkClass}>Pricing</a></li>
          </ul>
        </nav>

        <nav aria-label="Solutions">
          <h2 className="text-sm font-semibold text-soko-ink">Solutions</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {AUDIENCES.map((a) => (
              <li key={a.id}>
                <a href="#audiences" onClick={() => onSelectAudience(a.id)} className={linkClass}>{a.navLabel}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <h2 className="text-sm font-semibold text-soko-ink">Company</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            <li><a href="#about" className={linkClass}>About</a></li>
            <li><Pending label="Contact" /></li>
            <li><Pending label="Privacy Policy" /></li>
            <li><Pending label="Terms of Service" /></li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2 className="text-sm font-semibold text-soko-ink">Account</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            <li><button type="button" onClick={onLogin} className={linkClass}>Log In</button></li>
            <li><button type="button" onClick={onRegister} className={linkClass}>Register</button></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-soko-line">
        <p className="mx-auto max-w-7xl px-5 py-6 text-xs text-soko-muted lg:px-8">
          {`© ${new Date().getFullYear()} SOKO. Pre-launch product. Legal documents are being finalised.`}
        </p>
      </div>
    </footer>
  );
};
