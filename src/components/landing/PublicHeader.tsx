import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AUDIENCES, type AudienceId } from './landingContent';

interface PublicHeaderProps {
  onLogin: () => void;
  onGetStarted: () => void;
  onSelectAudience: (id: AudienceId) => void;
}

export const Wordmark: React.FC<{ className?: string }> = ({ className = 'h-9' }) => (
  <img src="/soko-lockup.png" alt="SOKO" width={720} height={197} className={`w-auto select-none ${className}`} draggable={false} />
);

export const PublicHeader: React.FC<PublicHeaderProps> = ({ onLogin, onGetStarted, onSelectAudience }) => {
  const [open, setOpen] = useState(false);

  const links: { label: string; href: string; audience?: AudienceId }[] = [
    { label: 'Platform', href: '#platform' },
    ...AUDIENCES.map((a) => ({ label: a.navLabel, href: '#audiences', audience: a.id })),
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'About', href: '#about' },
  ];

  const handleLink = (audience?: AudienceId) => {
    if (audience) onSelectAudience(audience);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-soko-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
        <a href="#top" aria-label="SOKO home" className="flex items-center">
          <Wordmark />
        </a>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  onClick={() => handleLink(l.audience)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-soko-muted transition-colors hover:text-soko-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <button type="button" onClick={onLogin} className="rounded-md px-3 py-2 text-sm font-semibold text-soko-ink hover:bg-soko-mist">
            Log In
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="rounded-md bg-soko-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-soko-blue/90"
          >
            Get Started
          </button>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-soko-ink lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-soko-line bg-white px-5 pb-5 lg:hidden">
          <ul className="flex flex-col py-2">
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} onClick={() => handleLink(l.audience)} className="block py-3 text-base font-medium text-soko-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setOpen(false); onLogin(); }} className="flex-1 rounded-md border border-soko-line py-2.5 text-sm font-semibold text-soko-ink">
              Log In
            </button>
            <button type="button" onClick={() => { setOpen(false); onGetStarted(); }} className="flex-1 rounded-md bg-soko-blue py-2.5 text-sm font-semibold text-white">
              Get Started
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};
