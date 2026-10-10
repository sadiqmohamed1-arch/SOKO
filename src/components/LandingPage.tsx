import React, { useEffect, useState } from 'react';
import { PublicHeader } from './landing/PublicHeader';
import { HeroSection } from './landing/HeroSection';
import { ProblemSection } from './landing/ProblemSection';
import { ProductShowcase } from './landing/ProductShowcase';
import { TrustAccessSection } from './landing/TrustAccessSection';
import { FinalCta, PublicFooter } from './landing/ClosingSections';
import { scrollToSection, type SolutionId } from './landing/solutions';

interface LandingPageProps {
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onEnterApp?: () => void;
}

const LANDING_TITLE = 'SOKO | Your Construction Network. Finally Connected.';

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onEnterApp }) => {
  const [solution, setSolution] = useState<SolutionId>('professionals');

  useEffect(() => {
    const previousTitle = document.title;
    document.title = LANDING_TITLE;
    if (!window.location.hash) window.scrollTo(0, 0);
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const login = () => onOpenAuth?.('login');
  const signup = () => onOpenAuth?.('signup');
  const explore = () => onEnterApp?.();
  const showSolution = (id: SolutionId) => {
    setSolution(id);
    scrollToSection('platform');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-soko-ink antialiased selection:bg-soko-blue selection:text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <PublicHeader onLogin={login} onGetStarted={signup} onSelectSolution={showSolution} />
      <main id="main">
        <HeroSection onExplore={explore} onJoin={signup} />
        <ProblemSection onSelect={showSolution} />
        <ProductShowcase value={solution} onChange={setSolution} onSignup={signup} onDemo={explore} />
        <TrustAccessSection />
        <FinalCta onGetStarted={signup} onExplore={explore} />
      </main>
      <PublicFooter onLogin={login} onRegister={signup} onSelectSolution={showSolution} />
    </div>
  );
};

export default LandingPage;
