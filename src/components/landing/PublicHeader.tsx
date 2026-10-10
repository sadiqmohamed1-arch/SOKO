import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { SOLUTIONS, type SolutionId } from './solutions';

interface PublicHeaderProps {
  onLogin: () => void;
  onGetStarted: () => void;
  onSelectSolution: (id: SolutionId) => void;
}

export const Wordmark: React.FC<{ className?: string }> = ({ className = 'h-9' }) => (
  <img src="/soko-lockup.png" alt="SOKO" width={720} height={156} className={`w-auto select-none ${className}`} draggable={false} />
);

const LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
];

const linkClass = 'rounded-md px-3 py-2 text-sm font-medium text-soko-muted transition-colors hover:text-soko-ink';

export const PublicHeader: React.FC<PublicHeaderProps> = ({ onLogin, onGetStarted, onSelectSolution }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!solutionsOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !dropdownRef.current?.contains(e.target as Node)) {
        setSolutionsOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [solutionsOpen]);

  const pickSolution = (id: SolutionId) => {
    setSolutionsOpen(false);
    setMobileOpen(false);
    onSelectSolution(id);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-soko-line/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
        <a href="#top" aria-label="SOKO home" className="flex items-center">
          <Wordmark className="h-8" />
        </a>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <a href="#platform" className={linkClass}>Platform</a>
            </li>
            <li ref={dropdownRef} className="relative">
              <button
                type="button"
                aria-expanded={solutionsOpen}
                aria-controls="solutions-menu"
                onClick={() => setSolutionsOpen((v) => !v)}
                className={`${linkClass} inline-flex items-center gap-1`}
              >
                Solutions
                <ChevronDown className={`h-4 w-4 transition-transform ${solutionsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {solutionsOpen && (
                <ul id="solutions-menu" className="absolute left-0 top-full mt-2 w-52 rounded-xl border border-soko-line bg-white p-1.5 shadow-lg">
                  {SOLUTIONS.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => pickSolution(s.id)}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-soko-ink transition-colors hover:bg-soko-mist"
                      >
                        {s.navLabel}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            {LINKS.slice(1).map((l) => (
              <li key={l.label}>
                <a href={l.href} className={linkClass}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <button type="button" onClick={onLogin} className="rounded-md px-3 py-2 text-sm font-semibold text-soko-ink transition-colors hover:bg-soko-mist">
            Log In
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="rounded-md bg-soko-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-soko-blue/90 hover:shadow-md"
          >
            Get Started
          </button>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-soko-ink lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-soko-line bg-white px-5 pb-5 lg:hidden">
          <ul className="flex flex-col py-2">
            <li>
              <a href="#platform" onClick={() => setMobileOpen(false)} className="block py-2.5 text-base font-medium text-soko-ink">Platform</a>
            </li>
            <li className="py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-soko-muted">Solutions</span>
              <ul className="mt-1 flex flex-col">
                {SOLUTIONS.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => pickSolution(s.id)} className="block w-full py-2 pl-3 text-left text-base font-medium text-soko-ink">
                      {s.navLabel}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
            {LINKS.slice(1).map((l) => (
              <li key={l.label}>
                <a href={l.href} onClick={() => setMobileOpen(false)} className="block py-2.5 text-base font-medium text-soko-ink">{l.label}</a>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setMobileOpen(false); onLogin(); }} className="flex-1 rounded-md border border-soko-line py-2.5 text-sm font-semibold text-soko-ink">
              Log In
            </button>
            <button type="button" onClick={() => { setMobileOpen(false); onGetStarted(); }} className="flex-1 rounded-md bg-soko-blue py-2.5 text-sm font-semibold text-white">
              Get Started
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};
