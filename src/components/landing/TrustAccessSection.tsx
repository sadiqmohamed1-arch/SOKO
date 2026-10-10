import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BadgeCheck, Building2, ChevronDown, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Reveal } from './Reveal';
import { PlanDetails } from './PricingOverview';

const TRUST: { id: string; icon: LucideIcon; label: string; iconClass: string; grantedBy: string; means: string; notMeans: string }[] = [
  {
    id: 'registered',
    icon: Building2,
    label: 'Registered on SOKO',
    iconClass: 'border border-soko-line bg-white text-soko-ink',
    grantedBy: 'the company itself',
    means: 'The company has created a SOKO profile and manages its own details.',
    notMeans: 'It does not mean SOKO has reviewed the company.',
  },
  {
    id: 'verified',
    icon: BadgeCheck,
    label: 'SOKO Verified',
    iconClass: 'bg-soko-blue text-white',
    grantedBy: 'SOKO, after a review',
    means: 'SOKO has reviewed the company’s submitted registration documents, where the company is eligible.',
    notMeans: 'It is never automatic, and it is not a contractor’s approval.',
  },
  {
    id: 'approved',
    icon: ShieldCheck,
    label: 'Approved by Your Contractor',
    iconClass: 'bg-soko-ink text-white',
    grantedBy: 'each contractor, privately',
    means: 'A specific contractor has approved the supplier under its own internal process.',
    notMeans: 'It is visible only inside that contractor’s workspace.',
  },
];

const PRICING = [
  { label: 'Personal accounts', value: 'Free' },
  { label: 'Supplier workspace', value: 'Free plan available' },
  { label: 'Contractor workspace', value: 'Free plan available' },
  { label: 'Premium', value: 'Coming soon' },
];

const collapse = { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 } };

export const TrustAccessSection: React.FC = () => {
  const reduce = useReducedMotion();
  const [openTrust, setOpenTrust] = useState<string | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const motionProps = reduce ? { transition: { duration: 0 } } : { transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <section id="pricing" aria-labelledby="trust-heading" className="scroll-mt-16 border-t border-soko-line bg-soko-mist py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="trust-heading" className="max-w-2xl font-[Outfit] text-3xl font-bold tracking-tight text-soko-ink text-balance sm:text-4xl">
            One identity. Trusted connections. Room to grow.
          </h2>
          <p className="max-w-md leading-relaxed text-soko-muted text-pretty">
            Create one SOKO account. Join multiple company workspaces. Keep your personal network separate.
          </p>
        </Reveal>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <Reveal className="rounded-2xl border border-soko-line bg-white p-2">
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-soko-muted">Three trust signals, never blurred together</p>
            <ul>
              {TRUST.map((t) => {
                const Icon = t.icon;
                const open = openTrust === t.id;
                return (
                  <li key={t.id} className="border-b border-soko-line last:border-b-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`trust-${t.id}`}
                      onClick={() => setOpenTrust(open ? null : t.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-soko-mist"
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.iconClass}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-soko-ink">{t.label}</span>
                        <span className="block text-sm text-soko-muted">{`Granted by ${t.grantedBy}`}</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-soko-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div id={`trust-${t.id}`} {...collapse} {...motionProps} className="overflow-hidden">
                          <div className="flex flex-col gap-1 px-3 pb-4 pl-15 text-sm leading-relaxed">
                            <p className="text-soko-ink">{t.means}</p>
                            <p className="text-soko-muted">{t.notMeans}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <Reveal delay={0.08} className="flex flex-col rounded-2xl border border-soko-line bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-soko-muted">Pricing</p>
            <dl className="mt-3 flex flex-1 flex-col divide-y divide-soko-line">
              {PRICING.map((p) => (
                <div key={p.label} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-soko-ink">{p.label}</dt>
                  <dd className={`text-sm font-semibold ${p.value === 'Coming soon' ? 'text-soko-muted' : 'text-soko-blue'}`}>{p.value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              aria-expanded={plansOpen}
              aria-controls="plan-details"
              onClick={() => setPlansOpen((v) => !v)}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-soko-line py-2.5 text-sm font-semibold text-soko-ink transition-colors hover:border-soko-ink"
            >
              {plansOpen ? 'Hide Plan Details' : 'View Plan Details'}
              <ChevronDown className={`h-4 w-4 transition-transform ${plansOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </Reveal>
        </div>

        <AnimatePresence initial={false}>
          {plansOpen && (
            <motion.div id="plan-details" {...collapse} {...motionProps} className="overflow-hidden">
              <div className="pt-4">
                <PlanDetails />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
