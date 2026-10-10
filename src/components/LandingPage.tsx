import React, { useEffect, useState } from 'react';
import { PublicHeader } from './landing/PublicHeader';
import { HeroSection } from './landing/HeroSection';
import { AudienceSwitcher } from './landing/AudienceSwitcher';
import { CapabilitiesSection } from './landing/CapabilitiesSection';
import { HowItWorksSection, TrustSection } from './landing/HowItWorksSection';
import { PricingOverview } from './landing/PricingOverview';
import { AboutSection, FinalCta, PublicFooter } from './landing/ClosingSections';
import type { AudienceId } from './landing/landingContent';

interface LandingPageProps {
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onEnterApp?: () => void;
}

const LANDING_TITLE = 'SOKO | The Intelligence Network for Construction';

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onEnterApp }) => {
  const [audience, setAudience] = useState<AudienceId>('buyers');

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

  return (
    <div className="min-h-screen scroll-smooth bg-white font-sans text-soko-ink antialiased selection:bg-soko-blue selection:text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <PublicHeader onLogin={login} onGetStarted={signup} onSelectAudience={setAudience} />
      <main id="main">
        <HeroSection onJoin={signup} />
        <AudienceSwitcher value={audience} onChange={setAudience} />
        <CapabilitiesSection />
        <HowItWorksSection />
        <TrustSection />
        <PricingOverview onGetStarted={signup} />
        <AboutSection />
        <FinalCta onGetStarted={signup} onExplore={() => onEnterApp?.()} />
      </main>
      <PublicFooter onLogin={login} onRegister={signup} onSelectAudience={setAudience} />
    </div>
  );
};

export default LandingPage;
