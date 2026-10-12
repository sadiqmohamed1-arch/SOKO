import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { BadgeCheck, Building2, Check, CheckCircle2, Clock, IdCard, Link2, Package, Pause, Play, RotateCcw, ScanLine, Share2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { Reveal } from './Reveal';
import { DemoAvatar, PhoneFrame } from './demoUi';

type Side = 'left' | 'right';
interface Step { scene: number; caption: string; ms: number; focus: Side }

const SCENES = [
  { label: 'Digital contact sharing', icon: IdCard },
  { label: 'Supplier visitor tracking', icon: Users },
  { label: 'Company profile sharing', icon: Building2 },
];

const STEPS: Step[] = [
  { scene: 0, caption: 'Layla opens her SOKO digital business card.', ms: 1400, focus: 'left' },
  { scene: 0, caption: 'She taps Share Contact.', ms: 900, focus: 'left' },
  { scene: 0, caption: 'Her personal SOKO QR code appears.', ms: 1100, focus: 'left' },
  { scene: 0, caption: 'Omar scans the code with SOKO.', ms: 1200, focus: 'right' },
  { scene: 0, caption: 'A contact preview appears on his phone.', ms: 1100, focus: 'right' },
  { scene: 0, caption: 'Omar saves Layla to his network.', ms: 1500, focus: 'right' },
  { scene: 1, caption: 'Karim arrives at Bayline Contracting’s office.', ms: 1200, focus: 'left' },
  { scene: 1, caption: 'He checks in on the SOKO visitor kiosk.', ms: 1400, focus: 'left' },
  { scene: 1, caption: 'The visit lands on Bayline’s visitor dashboard.', ms: 1400, focus: 'right' },
  { scene: 1, caption: 'Visitor history updates in real time.', ms: 1500, focus: 'right' },
  { scene: 2, caption: 'Karim opens Al Noor Steel’s company profile.', ms: 1300, focus: 'left' },
  { scene: 2, caption: 'He taps Share Profile.', ms: 900, focus: 'left' },
  { scene: 2, caption: 'A share preview is sent to Layla.', ms: 1200, focus: 'right' },
  { scene: 2, caption: 'Layla opens the profile and explores the products.', ms: 1800, focus: 'right' },
];

const sceneStart = (scene: number) => STEPS.findIndex((s) => s.scene === scene);
const sceneEnd = (scene: number) => STEPS.map((s) => s.scene).lastIndexOf(scene);

const LAYLA = { name: 'Layla Haddad', role: 'Procurement Manager', company: 'Meridian Developments', handle: '@layla.haddad', src: '/images/demo/layla.png' };
const KARIM = { name: 'Karim Nassar', role: 'Sales Director', company: 'Al Noor Steel Trading', handle: '@karim.nassar', src: '/images/demo/karim.png' };

const pop = { initial: { opacity: 0, y: 10, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6 } };

const Tap: React.FC<{ active: boolean; children: React.ReactNode; className?: string; done?: boolean }> = ({ active, children, className = '', done }) => (
  <span
    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 ${
      done ? 'bg-soko-mist text-soko-ink' : 'bg-soko-blue text-white'
    } ${active ? 'scale-95 ring-4 ring-soko-blue/25' : ''} ${className}`}
  >
    {children}
  </span>
);

const DeviceSlot: React.FC<{ side: Side; focus: Side; className?: string; children: React.ReactNode }> = ({ side, focus, className = '', children }) => (
  <div className={`${side === focus ? 'flex' : 'hidden'} justify-center sm:flex ${className}`}>{children}</div>
);

const ContactScene: React.FC<{ s: number; focus: Side }> = ({ s, focus }) => (
  <div className="grid h-full grid-cols-1 items-center gap-10 sm:grid-cols-2">
    <DeviceSlot side="left" focus={focus}>
      <PhoneFrame className="h-[410px] w-[220px]" label="Layla’s phone">
        <div className="relative flex flex-1 flex-col gap-3 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-soko-muted">My SOKO card</p>
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-soko-ink px-3 py-4 text-center">
            <DemoAvatar src={LAYLA.src} initials="LH" className="h-14 w-14 ring-2 ring-white/20" />
            <div>
              <p className="text-sm font-semibold text-white">{LAYLA.name}</p>
              <p className="text-[11px] text-white/70">{LAYLA.role}</p>
              <p className="text-[11px] text-white/70">{LAYLA.company}</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">{LAYLA.handle}</span>
          </div>
          <Tap active={s === 1}><Share2 className="h-3.5 w-3.5" aria-hidden="true" />Share Contact</Tap>
          <AnimatePresence>
            {s >= 2 && (
              <motion.div {...pop} className="absolute inset-x-2 bottom-2 flex flex-col items-center gap-2 rounded-2xl border border-soko-line bg-white p-3 shadow-xl">
                <QRCodeSVG value="soko-demo:@layla.haddad" size={104} fgColor="#0b0d12" aria-label="Illustrative QR code" />
                <p className="text-[10px] font-medium text-soko-muted">Scan to save {LAYLA.handle}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    </DeviceSlot>
    <DeviceSlot side="right" focus={focus}>
      <PhoneFrame className="h-[410px] w-[220px]" label="Omar’s phone">
        <div className="relative flex flex-1 flex-col gap-3 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-soko-muted">SOKO scan</p>
          {s < 4 ? (
            <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-soko-ink">
              {s >= 3 ? (
                <>
                  <div className="rounded-lg bg-white p-2 opacity-90">
                    <QRCodeSVG value="soko-demo:@layla.haddad" size={84} fgColor="#0b0d12" aria-hidden="true" />
                  </div>
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-x-8 h-0.5 bg-soko-blue shadow-[0_0_12px_2px_rgba(37,99,235,0.8)]"
                    initial={{ top: '30%' }}
                    animate={{ top: ['30%', '70%', '30%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center text-white/70">
                  <ScanLine className="h-8 w-8" aria-hidden="true" />
                  <p className="px-4 text-[11px]">Point your camera at a SOKO code</p>
                </div>
              )}
              <span aria-hidden="true" className="absolute inset-6 rounded-xl border-2 border-dashed border-white/25" />
            </div>
          ) : (
            <motion.div {...pop} className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-soko-line p-3 text-center">
                <DemoAvatar src={LAYLA.src} initials="LH" className="h-12 w-12" />
                <div>
                  <p className="text-sm font-semibold text-soko-ink">{LAYLA.name}</p>
                  <p className="text-[11px] text-soko-muted">{LAYLA.role} · {LAYLA.company}</p>
                  <p className="mt-1 text-[10px] font-medium text-soko-blue">{LAYLA.handle}</p>
                </div>
              </div>
              <Tap active={s === 5} done={s >= 5}>
                {s >= 5 ? <><Check className="h-3.5 w-3.5" aria-hidden="true" />Saved</> : <><UserPlus className="h-3.5 w-3.5" aria-hidden="true" />Save Contact</>}
              </Tap>
            </motion.div>
          )}
          <AnimatePresence>
            {s >= 5 && (
              <motion.p {...pop} className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-soko-ink px-3 py-2.5 text-[11px] font-medium text-white shadow-lg">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-soko-blue" aria-hidden="true" />
                Layla saved to your network
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    </DeviceSlot>
  </div>
);

const VISITS = [
  { name: 'Rania Aziz', company: 'Coastline MEP', time: '09:15', purpose: 'Site meeting' },
  { name: 'Yusuf Rahman', company: 'Delta Glazing', time: '10:05', purpose: 'Sample delivery' },
];

const VisitorScene: React.FC<{ s: number; focus: Side }> = ({ s, focus }) => {
  const rows = s >= 2 ? [{ name: KARIM.name, company: KARIM.company, time: '10:42', purpose: 'Product presentation', fresh: true }, ...VISITS] : VISITS;
  return (
    <div className="grid h-full grid-cols-1 items-center gap-6 sm:grid-cols-[0.85fr_1.15fr]">
      <DeviceSlot side="left" focus={focus}>
        <div className="flex h-[330px] w-full max-w-[340px] flex-col rounded-[1.4rem] bg-soko-ink p-2 shadow-[0_24px_60px_-20px_rgba(11,13,18,0.45)]">
          <div className="flex flex-1 flex-col gap-3 rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-soko-ink">Bayline Contracting</p>
              <span className="text-[10px] font-medium text-soko-muted">Visitor kiosk</span>
            </div>
            <AnimatePresence mode="wait">
              {s === 0 ? (
                <motion.div key="welcome" {...pop} className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <DemoAvatar src={KARIM.src} initials="KN" className="h-14 w-14" />
                  <p className="text-sm font-semibold text-soko-ink">Welcome to Bayline</p>
                  <Tap active={false}>Tap to check in</Tap>
                </motion.div>
              ) : (
                <motion.div key="form" {...pop} className="flex flex-1 flex-col gap-2">
                  {[['Name', KARIM.name], ['Company', KARIM.company], ['Purpose', 'Product presentation'], ['Host', 'Sara Ali, Procurement']].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-soko-line px-3 py-1.5">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-soko-muted">{k}</p>
                      <p className="text-xs font-medium text-soko-ink">{v}</p>
                    </div>
                  ))}
                  <Tap active={s === 1} done={s >= 2} className="mt-auto">
                    {s >= 2 ? <><Check className="h-3.5 w-3.5" aria-hidden="true" />Checked in · 10:42</> : 'Check in'}
                  </Tap>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DeviceSlot>
      <DeviceSlot side="right" focus={focus}>
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-soko-line bg-white p-4 shadow-[0_24px_60px_-28px_rgba(11,13,18,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-soko-ink">Visitors today</p>
            <span className="rounded-full bg-soko-mist px-2.5 py-1 text-[11px] font-semibold text-soko-ink">{s >= 2 ? 3 : 2} visits</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-soko-line">
            <div className="grid grid-cols-[1.4fr_0.6fr_1fr_0.8fr] gap-2 bg-soko-mist px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-soko-muted">
              <span>Supplier</span><span>Arrival</span><span>Purpose</span><span>Status</span>
            </div>
            <ul>
              <AnimatePresence initial={false}>
                {rows.map((r, i) => {
                  const status = 'fresh' in r ? 'On site' : i === rows.length - 1 && s >= 3 ? 'Completed' : 'On site';
                  return (
                    <motion.li
                      key={r.name}
                      layout
                      initial={{ opacity: 0, backgroundColor: 'rgba(37,99,235,0.12)' }}
                      animate={{ opacity: 1, backgroundColor: 'rgba(37,99,235,0)' }}
                      transition={{ duration: 1.2 }}
                      className="grid grid-cols-[1.4fr_0.6fr_1fr_0.8fr] items-center gap-2 border-t border-soko-line px-3 py-2 text-[11px]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-soko-ink">{r.name}</span>
                        <span className="block truncate text-soko-muted">{r.company}</span>
                      </span>
                      <span className="text-soko-ink">{r.time}</span>
                      <span className="truncate text-soko-muted">{r.purpose}</span>
                      <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${status === 'Completed' ? 'bg-soko-mist text-soko-muted' : 'bg-soko-blue/10 text-soko-blue'}`}>{status}</span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-soko-muted">Visitor history</p>
            <ul className="flex flex-col gap-1 text-[11px] text-soko-muted">
              <AnimatePresence initial={false}>
                {s >= 3 && (
                  <motion.li key="karim" {...pop} className="flex items-center gap-1.5 font-medium text-soko-ink">
                    <Clock className="h-3 w-3 text-soko-blue" aria-hidden="true" />10:42 · Karim Nassar checked in for Sara Ali
                  </motion.li>
                )}
                {s >= 3 && (
                  <motion.li key="rania-out" {...pop} className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" aria-hidden="true" />10:40 · Rania Aziz checked out
                  </motion.li>
                )}
              </AnimatePresence>
              <li className="flex items-center gap-1.5"><Clock className="h-3 w-3" aria-hidden="true" />10:05 · Yusuf Rahman checked in</li>
            </ul>
          </div>
        </div>
      </DeviceSlot>
    </div>
  );
};

const PRODUCTS = ['Rebar B500B, 8–32 mm', 'Universal steel beams', 'Welded wire mesh'];

const ProfileBody: React.FC<{ highlightProducts?: boolean }> = ({ highlightProducts }) => (
  <div className="flex flex-col gap-2.5">
    <div className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soko-ink text-xs font-bold text-white">AN</span>
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-sm font-semibold text-soko-ink">
          Al Noor Steel <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-soko-blue" aria-label="Verified (demo)" />
        </p>
        <p className="truncate text-[11px] text-soko-muted">Steel supplier · Dubai</p>
      </div>
    </div>
    <div className="flex gap-1 text-[10px] font-semibold">
      {['Products', 'Services', 'Certifications'].map((t, i) => (
        <span key={t} className={`rounded-md px-2 py-1 ${i === 0 && highlightProducts ? 'bg-soko-blue text-white' : 'bg-soko-mist text-soko-muted'}`}>{t}</span>
      ))}
    </div>
    <ul className="flex flex-col gap-1.5">
      {PRODUCTS.map((p, i) => (
        <motion.li
          key={p}
          initial={false}
          animate={{ opacity: 1, x: highlightProducts ? [8, 0] : 0 }}
          transition={{ delay: i * 0.12 }}
          className="flex items-center gap-2 rounded-lg border border-soko-line px-2.5 py-1.5 text-[11px] text-soko-ink"
        >
          <Package className="h-3.5 w-3.5 shrink-0 text-soko-muted" aria-hidden="true" />{p}
        </motion.li>
      ))}
    </ul>
    <p className="flex items-center gap-1.5 text-[10px] text-soko-muted"><ShieldCheck className="h-3 w-3" aria-hidden="true" />ISO 9001 · Cut &amp; bend service</p>
  </div>
);

const ProfileScene: React.FC<{ s: number; focus: Side }> = ({ s, focus }) => (
  <div className="grid h-full grid-cols-1 items-center gap-10 sm:grid-cols-2">
    <DeviceSlot side="left" focus={focus}>
      <PhoneFrame className="h-[410px] w-[220px]" label="Karim’s phone">
        <div className="relative flex flex-1 flex-col gap-3 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-soko-muted">Company profile</p>
          <ProfileBody />
          <Tap active={s === 1}><Share2 className="h-3.5 w-3.5" aria-hidden="true" />Share Profile</Tap>
          <AnimatePresence>
            {s >= 2 && (
              <motion.div {...pop} className="absolute inset-x-2 bottom-2 flex flex-col gap-2 rounded-2xl border border-soko-line bg-white p-3 shadow-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-soko-muted">Share preview</p>
                <div className="flex items-center gap-2 rounded-lg bg-soko-mist p-2">
                  <Link2 className="h-4 w-4 shrink-0 text-soko-blue" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-soko-ink">Al Noor Steel on SOKO</p>
                    <p className="truncate text-[10px] text-soko-muted">Products, services, certifications</p>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-[10px] font-medium text-soko-ink"><Check className="h-3 w-3 text-soko-blue" aria-hidden="true" />Sent to Layla Haddad</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    </DeviceSlot>
    <DeviceSlot side="right" focus={focus}>
      <PhoneFrame className="h-[410px] w-[220px]" label="Layla’s phone">
        <div className="flex flex-1 flex-col gap-3 p-3">
          <AnimatePresence mode="wait">
            {s < 3 ? (
              <motion.div key="inbox" {...pop} className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-soko-muted">Messages</p>
                {s >= 2 && (
                  <motion.div {...pop} className="flex flex-col gap-2 rounded-xl border border-soko-blue/40 bg-soko-blue/5 p-2.5">
                    <div className="flex items-center gap-2">
                      <DemoAvatar src={KARIM.src} initials="KN" className="h-7 w-7" />
                      <p className="text-[11px] font-semibold text-soko-ink">{KARIM.name}</p>
                    </div>
                    <p className="text-[11px] text-soko-muted">Shared a company profile: Al Noor Steel</p>
                    <span className="w-fit rounded-md bg-soko-blue px-2 py-1 text-[10px] font-semibold text-white">Open profile</span>
                  </motion.div>
                )}
                <div className="rounded-xl border border-soko-line p-2.5 text-[11px] text-soko-muted">Omar Siddiqui · See you at the site visit</div>
              </motion.div>
            ) : (
              <motion.div key="profile" {...pop}>
                <ProfileBody highlightProducts />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    </DeviceSlot>
  </div>
);

const SCENE_VIEWS = [ContactScene, VisitorScene, ProfileScene];

export const ProductDemo: React.FC = () => {
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { margin: '-120px' });
  const [index, setIndex] = useState(() => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? sceneEnd(0) : 0));
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (!playing || !inView) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % STEPS.length), STEPS[index].ms);
    return () => window.clearTimeout(t);
  }, [index, playing, inView]);

  const step = STEPS[index];
  const SceneView = SCENE_VIEWS[step.scene];
  const local = index - sceneStart(step.scene);

  const goToScene = (scene: number) => setIndex(playing ? sceneStart(scene) : sceneEnd(scene));
  const replay = () => { setIndex(0); setPlaying(true); };

  return (
    <section id="demo" aria-labelledby="demo-heading" className="scroll-mt-16 border-t border-soko-line bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-soko-blue">Illustrative Product Demo</p>
            <h2 id="demo-heading" className="mt-2 font-[Outfit] text-3xl font-bold tracking-tight text-soko-ink text-balance sm:text-4xl">
              One Identity. Every Business Connection.
            </h2>
          </div>
          <p className="max-w-md leading-relaxed text-soko-muted text-pretty">
            Share your professional identity, manage business visits, and connect through your company profile — all within SOKO.
          </p>
        </Reveal>

        <Reveal className="mt-8 overflow-hidden rounded-3xl border border-soko-line bg-soko-mist">
          <div className="flex flex-col gap-3 border-b border-soko-line bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div role="tablist" aria-label="Demo scenes" className="flex gap-1 overflow-x-auto">
              {SCENES.map(({ label, icon: Icon }, i) => {
                const active = step.scene === i;
                const start = sceneStart(i);
                const total = sceneEnd(i) - start + 1;
                const progress = active ? (local + 1) / total : step.scene > i ? 1 : 0;
                return (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => goToScene(i)}
                    className={`relative flex shrink-0 items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-soko-mist text-soko-ink' : 'text-soko-muted hover:text-soko-ink'}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-soko-blue transition-transform duration-500" style={{ transform: `scaleX(${progress})` }} />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-soko-line px-3 py-2 text-sm font-semibold text-soko-ink transition-colors hover:bg-soko-mist"
              >
                {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                {playing ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={replay}
                className="inline-flex items-center gap-1.5 rounded-lg border border-soko-line px-3 py-2 text-sm font-semibold text-soko-ink transition-colors hover:bg-soko-mist"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />Replay
              </button>
            </div>
          </div>

          <div ref={stageRef} className="relative px-4 py-8 sm:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.scene}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={{ duration: reduce ? 0 : 0.35 }}
                className="min-h-[420px]"
              >
                <SceneView s={local} focus={step.focus} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-1 border-t border-soko-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live={playing ? 'off' : 'polite'} className="text-sm font-medium text-soko-ink">{step.caption}</p>
            <p className="text-xs text-soko-muted">Fictional people and companies. No real data is shown or saved.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
