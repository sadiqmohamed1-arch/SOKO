import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CHAIN } from './landingContent';

const NetworkChain: React.FC = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % CHAIN.length), 2600);
    return () => window.clearInterval(t);
  }, [paused]);

  const node = CHAIN[active];
  const prev = active > 0 ? CHAIN[active - 1] : null;
  const next = active < CHAIN.length - 1 ? CHAIN[active + 1] : null;
  const progress = (active / (CHAIN.length - 1)) * 100;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-soko-line bg-white shadow-[0_24px_60px_-24px_rgba(11,13,18,0.25)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-center justify-between border-b border-soko-line px-5 py-3">
        <p className="text-sm font-semibold text-soko-ink">How one relationship connects</p>
        <span className="rounded-full bg-soko-mist px-2.5 py-1 text-xs font-medium text-soko-muted">Illustrative example</span>
      </div>

      <div className="grid md:grid-cols-[1fr_1fr]">
        <ol className="relative flex flex-col gap-1 p-4" aria-label="Network chain">
          <span aria-hidden="true" className="absolute bottom-9 left-[35px] top-9 w-px bg-soko-line" />
          <span
            aria-hidden="true"
            className="absolute left-[35px] top-9 w-px bg-soko-blue transition-[height] duration-500 ease-out"
            style={{ height: `calc((100% - 4.5rem) * ${progress / 100})` }}
          />
          {CHAIN.map((n, i) => {
            const Icon = n.icon;
            const isActive = i === active;
            const isPast = i < active;
            return (
              <li key={n.id} className="relative">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-pressed={isActive}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${isActive ? 'bg-soko-blue/[0.06]' : 'hover:bg-soko-mist'}`}
                >
                  <span
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      isActive
                        ? 'border-soko-blue bg-soko-blue text-white'
                        : isPast
                          ? 'border-soko-blue/40 bg-white text-soko-blue'
                          : 'border-soko-line bg-white text-soko-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[11px] font-semibold uppercase tracking-wider ${isActive ? 'text-soko-blue' : 'text-soko-muted'}`}>{n.type}</span>
                    <span className="block truncate text-sm font-medium text-soko-ink">{n.title}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col border-t border-soko-line bg-soko-mist/60 p-5 md:border-l md:border-t-0" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wider text-soko-blue">{node.type}</p>
          <h3 className="mt-1 text-xl font-semibold leading-snug text-soko-ink text-balance">{node.title}</h3>
          <p className="text-sm text-soko-muted">{node.meta}</p>

          <dl className="mt-5 flex flex-col gap-3">
            {node.detail.map((d) => (
              <div key={d.label} className="rounded-lg border border-soko-line bg-white px-3 py-2.5">
                <dt className="text-xs text-soko-muted">{d.label}</dt>
                <dd className="text-sm font-medium text-soko-ink">{d.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5 text-xs text-soko-muted">
            {prev && <span className="rounded-full border border-soko-line bg-white px-2 py-0.5">{prev.type}</span>}
            {prev && <ArrowRight className="h-3 w-3" aria-hidden="true" />}
            <span className="rounded-full bg-soko-ink px-2 py-0.5 font-medium text-white">{node.type}</span>
            {next && <ArrowRight className="h-3 w-3" aria-hidden="true" />}
            {next && <span className="rounded-full border border-soko-line bg-white px-2 py-0.5">{next.type}</span>}
          </div>
        </div>
      </div>

      <p className="border-t border-soko-line px-5 py-2.5 text-xs text-soko-muted">
        Example records for illustration. No live data is shown.
      </p>
    </div>
  );
};

interface HeroSectionProps {
  onJoin: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onJoin }) => (
  <section
    id="top"
    aria-labelledby="hero-heading"
    className="relative bg-[radial-gradient(ellipse_80%_60%_at_70%_0%,rgba(37,99,235,0.09),transparent_70%)]"
  >
    <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-20">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-soko-line bg-white px-3 py-1 text-xs font-medium text-soko-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-soko-blue" aria-hidden="true" />
          Pre-launch · Built in the UAE
        </p>
        <h1 id="hero-heading" className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-soko-ink text-balance sm:text-6xl lg:text-7xl">
          The Intelligence Network for Construction.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-soko-muted text-pretty">
          Discover suppliers, connect with industry professionals, explore construction products and manage business relationships, all in one connected platform.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-soko-blue px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-soko-blue/90"
          >
            Join SOKO
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <a
            href="#platform"
            className="inline-flex items-center justify-center rounded-lg border border-soko-line bg-white px-6 py-3.5 text-base font-semibold text-soko-ink transition-colors hover:border-soko-ink/30"
          >
            Explore the Platform
          </a>
        </div>
        <p className="mt-8 text-sm font-medium text-soko-ink">One Network. Every Construction Connection.</p>
      </div>

      <NetworkChain />
    </div>
  </section>
);
