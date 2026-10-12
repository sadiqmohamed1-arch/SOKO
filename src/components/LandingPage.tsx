import React, { useEffect, useState } from 'react';
import { PublicHeader } from './landing/PublicHeader';
import { HeroSection } from './landing/HeroSection';
import { ProblemSection } from './landing/ProblemSection';
import { ProductShowcase } from './landing/ProductShowcase';
import { ProductDemo } from './landing/ProductDemo';
import { TrustAccessSection } from './landing/TrustAccessSection';
import { MobileAppBanner } from './landing/MobileAppBanner';
import { ContactPage } from './landing/ContactPage';
import { FinalCta, PublicFooter } from './landing/ClosingSections';
import { scrollToSection, type SolutionId } from './landing/solutions';

interface LandingPageProps {
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onEnterApp?: () => void;
}

const LANDING_TITLE = 'SOKO | Your Construction Network. Finally Connected.';
const CONTACT_TITLE = 'Contact SOKO';
const CONTACT_HASH = '#contact';

const isContactHash = () => window.location.hash === CONTACT_HASH;

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onEnterApp }) => {
  const [solution, setSolution] = useState<SolutionId>('professionals');
  const [onContact, setOnContact] = useState(isContactHash);
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    if (!window.location.hash) window.scrollTo(0, 0);
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    document.title = onContact ? CONTACT_TITLE : LANDING_TITLE;
  }, [onContact]);

  useEffect(() => {
    const sync = () => {
      const contact = isContactHash();
      setOnContact((was) => {
        if (contact && !was) window.scrollTo(0, 0);
        if (!contact && was) {
          const target = window.location.hash.slice(1);
          setPendingScroll(target || 'top');
        }
        return contact;
      });
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    if (onContact || !pendingScroll) return;
    if (pendingScroll === 'top') window.scrollTo(0, 0);
    else scrollToSection(pendingScroll);
    setPendingScroll(null);
  }, [onContact, pendingScroll]);

  const login = () => onOpenAuth?.('login');
  const signup = () => onOpenAuth?.('signup');
  const explore = () => onEnterApp?.();
  const goHome = () => { window.location.hash = ''; };
  const showSolution = (id: SolutionId) => {
    setSolution(id);
    if (onContact) {
      window.location.hash = 'platform';
      return;
    }
    scrollToSection('platform');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-soko-ink antialiased selection:bg-soko-blue selection:text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <PublicHeader onLogin={login} onGetStarted={signup} onSelectSolution={showSolution} />
      <main id="main">
        {onContact ? (
          <ContactPage onBack={goHome} />
        ) : (
          <>
            <HeroSection onExplore={explore} onJoin={signup} />
            <ProblemSection onSelect={showSolution} />
            <ProductShowcase value={solution} onChange={setSolution} onSignup={signup} onDemo={explore} />
            <ProductDemo />
            <TrustAccessSection />
            <MobileAppBanner />
            <FinalCta onGetStarted={signup} onExplore={explore} />
          </>
        )}
      </main>
      <PublicFooter onLogin={login} onRegister={signup} onSelectSolution={showSolution} />
    </div>
  );
};

export default LandingPage;
