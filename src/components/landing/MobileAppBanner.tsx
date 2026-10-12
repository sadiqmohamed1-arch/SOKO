import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { BadgeCheck, Bell, Building2, Search, Share2, UserPlus } from 'lucide-react';
import { Reveal } from './Reveal';
import { AppleIcon, DemoAvatar, GooglePlayIcon, PhoneFrame } from './demoUi';
import { MOBILE_APP_BANNER, isStoreLive, type MobileAppBannerConfig } from './mobileAppConfig';

const StoreButton: React.FC<{ store: MobileAppBannerConfig['ios']; icon: React.ReactNode; overline: string; name: string }> = ({ store, icon, overline, name }) => {
  const inner = (
    <>
      {icon}
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium text-white/70">{overline}</span>
        <span className="text-base font-semibold text-white">{name}</span>
      </span>
    </>
  );
  const base = 'flex min-w-[190px] items-center gap-3 rounded-xl border px-4 py-2.5';
  if (isStoreLive(store)) {
    return (
      <a href={store.url!} target="_blank" rel="noopener noreferrer" className={`${base} border-white/30 bg-white/10 transition-colors hover:bg-white/15`}>
        {inner}
      </a>
    );
  }
  return (
    <div role="img" aria-label={`${overline} ${name} — coming soon, not yet available`} className={`${base} relative cursor-not-allowed border-white/15 bg-white/5 opacity-80`}>
      {inner}
      <span className="absolute -right-2 -top-2.5 rounded-full bg-soko-blue px-2 py-0.5 text-[10px] font-semibold text-white shadow">Coming soon</span>
    </div>
  );
};

const Float: React.FC<{ className: string; delay?: number; children: React.ReactNode }> = ({ className, delay = 0, children }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className={`absolute z-20 rounded-xl border border-soko-line bg-white px-3 py-2 shadow-lg ${className}`}
      animate={reduce ? undefined : { y: [0, -6, 0] }}
      transition={{ duration: 4, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
};

const NETWORK = [
  { name: 'Karim Nassar', note: 'Al Noor Steel · shared a profile', src: '/images/demo/karim.png', initials: 'KN' },
  { name: 'Omar Siddiqui', note: 'Bayline Contracting · saved your card', initials: 'OS' },
  { name: 'Rania Aziz', note: 'Coastline MEP · new connection', initials: 'RA' },
];

const Phones: React.FC = () => (
  <div className="relative mx-auto h-[440px] w-full max-w-[420px]">
    <div className="absolute left-0 top-6 z-10 -rotate-3">
    <PhoneFrame className="h-[400px] w-[210px]" label="SOKO digital business card screen">
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-soko-ink px-3 py-4 text-center">
          <DemoAvatar src="/images/demo/layla.png" initials="LH" className="h-12 w-12 ring-2 ring-white/20" />
          <p className="text-sm font-semibold text-white">Layla Haddad</p>
          <p className="-mt-1.5 text-[11px] text-white/70">Procurement Manager</p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white">@layla.haddad</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-soko-line p-3">
          <QRCodeSVG value="soko-demo:@layla.haddad" size={92} fgColor="#0b0d12" aria-hidden="true" />
          <p className="text-[10px] text-soko-muted">Scan to save contact</p>
        </div>
        <span className="flex items-center justify-center gap-1.5 rounded-lg bg-soko-blue py-2 text-xs font-semibold text-white">
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />Share Contact
        </span>
      </div>
    </PhoneFrame>
    </div>
    <div className="absolute right-0 top-0 rotate-3">
    <PhoneFrame className="h-[410px] w-[215px]" label="SOKO network activity screen">
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex items-center gap-2 rounded-lg bg-soko-mist px-2.5 py-2 text-[11px] text-soko-muted">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />Search suppliers, products
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-soko-muted">Network activity</p>
        <ul className="flex flex-col gap-2">
          {NETWORK.map((n) => (
            <li key={n.name} className="flex items-center gap-2 rounded-xl border border-soko-line p-2">
              <DemoAvatar src={n.src} initials={n.initials} className="h-8 w-8" />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold text-soko-ink">{n.name}</span>
                <span className="block truncate text-[10px] text-soko-muted">{n.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-soko-muted">Suggested suppliers</p>
        <div className="flex items-center gap-2 rounded-xl border border-soko-line p-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-soko-ink text-[10px] font-bold text-white">DG</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-soko-ink">Delta Glazing <BadgeCheck className="h-3 w-3 text-soko-blue" aria-hidden="true" /></span>
            <span className="block text-[10px] text-soko-muted">Façades · Sharjah</span>
          </span>
        </div>
      </div>
    </PhoneFrame>
    </div>
    <Float className="-left-4 bottom-16 hidden sm:block" delay={0.4}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-soko-ink"><UserPlus className="h-3.5 w-3.5 text-soko-blue" />Contact saved</p>
    </Float>
    <Float className="-right-4 top-24 hidden sm:block" delay={1.2}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-soko-ink"><Bell className="h-3.5 w-3.5 text-soko-blue" />Visitor checked in</p>
    </Float>
    <Float className="bottom-2 right-10 hidden sm:block" delay={2}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-soko-ink"><Building2 className="h-3.5 w-3.5 text-soko-blue" />Profile viewed</p>
    </Float>
  </div>
);

export const MobileAppBanner: React.FC<{ config?: MobileAppBannerConfig }> = ({ config = MOBILE_APP_BANNER }) => {
  if (!config.enabled) return null;
  const anyLive = isStoreLive(config.ios) || isStoreLive(config.android);
  return (
    <section id="mobile-app" aria-labelledby="mobile-app-heading" className="scroll-mt-16 px-5 pt-12 lg:px-8 lg:pt-14">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-soko-ink">
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative grid items-center gap-10 px-6 py-12 sm:px-12 lg:grid-cols-[1.05fr_1fr] lg:py-14">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/80">
              {anyLive ? 'SOKO mobile app' : 'SOKO mobile app · Coming soon'}
            </span>
            <h2 id="mobile-app-heading" className="font-[Outfit] text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
              {config.heading}
            </h2>
            <p className="max-w-lg text-lg leading-relaxed text-white/70 text-pretty">{config.description}</p>
            {config.showDownloadButtons && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-4">
                  <StoreButton store={config.ios} icon={<AppleIcon className="h-7 w-7 text-white" />} overline="Download on the" name="App Store" />
                  <StoreButton store={config.android} icon={<GooglePlayIcon className="h-7 w-7 text-white" />} overline="Get it on" name="Google Play" />
                </div>
                {!anyLive && (
                  <p className="text-sm text-white/60">The iOS and Android apps are in development and not yet available to download.</p>
                )}
              </div>
            )}
          </div>
          <Phones />
        </div>
      </Reveal>
    </section>
  );
};
