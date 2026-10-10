import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Wordmark } from './PublicHeader';
import { Reveal } from './Reveal';
import { SOLUTIONS, type SolutionId } from './solutions';

interface FinalCtaProps {
  onGetStarted: () => void;
  onExplore: () => void;
}

export const FinalCta: React.FC<FinalCtaProps> = ({ onGetStarted, onExplore }) => (
  <section aria-labelledby="cta-heading" className="px-5 py-12 lg:px-8 lg:py-14">
    <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-soko-ink px-6 py-12 sm:px-12 lg:py-14">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_55%_90%_at_85%_110%,rgba(37,99,235,0.5),transparent_70%)]" />
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 id="cta-heading" className="font-[Outfit] text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
            The next opportunity could start with one connection.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70 text-pretty">
            Discover the people, companies and products shaping construction.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          <button
            type="button"
            onClick={onGetStarted}
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-soko-blue px-6 py-3.5 font-semibold text-white shadow-[0_10px_30px_-8px_rgba(37,99,235,0.8)] transition-all hover:-translate-y-0.5 hover:bg-soko-blue/90"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex flex-col items-center justify-center rounded-lg border border-white/25 px-6 py-2 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
          >
            Explore SOKO Demo
            <span className="text-[11px] font-medium text-white/60">Uses sample data</span>
          </button>
        </div>
      </div>
    </Reveal>
  </section>
);

interface PublicFooterProps {
  onLogin: () => void;
  onRegister: () => void;
  onSelectSolution: (id: SolutionId) => void;
}

const Pending: React.FC<{ label: string }> = ({ label }) => (
  <span className="flex items-center gap-1.5 text-soko-muted">
    {label}
    <span className="rounded bg-soko-mist px-1.5 py-0.5 text-[10px] font-medium text-soko-muted">Coming soon</span>
  </span>
);

export const PublicFooter: React.FC<PublicFooterProps> = ({ onLogin, onRegister, onSelectSolution }) => {
  const linkClass = 'text-soko-muted transition-colors hover:text-soko-ink';
  return (
    <footer id="about" className="scroll-mt-16 border-t border-soko-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Wordmark className="h-9" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-soko-muted text-pretty">
            SOKO is being built in the UAE for the people and companies who design, supply and build — starting with the UAE and designed to work across borders. Currently in pre-launch.
          </p>
        </div>

        <nav aria-label="Solutions">
          <h2 className="text-sm font-semibold text-soko-ink">Solutions</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {SOLUTIONS.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onSelectSolution(s.id)} className={linkClass}>{s.navLabel}</button>
              </li>
            ))}
            <li><a href="#pricing" className={linkClass}>Pricing</a></li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h2 className="text-sm font-semibold text-soko-ink">Company</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Pending label="Contact" /></li>
            <li><Pending label="Privacy Policy" /></li>
            <li><Pending label="Terms of Service" /></li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2 className="text-sm font-semibold text-soko-ink">Account</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><button type="button" onClick={onLogin} className={linkClass}>Log In</button></li>
            <li><button type="button" onClick={onRegister} className={linkClass}>Register</button></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-soko-line">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-soko-muted lg:px-8">
          {`© ${new Date().getFullYear()} SOKO · so.co.ae · Pre-launch product. Legal documents are being finalised.`}
        </p>
      </div>
    </footer>
  );
};
