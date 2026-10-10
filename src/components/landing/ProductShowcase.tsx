import React, { useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { SOLUTIONS, type SolutionId } from './solutions';
import { SHOWCASE_PREVIEWS } from './ShowcasePreviews';
import { Reveal } from './Reveal';

const CONTENT: Record<SolutionId, { headline: string; description: string; benefits: string[]; cta: string; ctaAction: 'signup' | 'demo' }> = {
  professionals: {
    headline: 'Your network belongs to you.',
    description: 'A personal SOKO identity with a shareable digital business card, saved contacts and product discovery that move with you between companies.',
    benefits: ['One permanent SOKO identity', 'Share your digital business card', 'Keep your professional connections'],
    cta: 'Create your free profile',
    ctaAction: 'signup',
  },
  suppliers: {
    headline: 'Be discovered by the businesses that matter.',
    description: 'A supplier company profile with your products and capabilities, plus supplier visits and Market Hub visibility.',
    benefits: ['Showcase products and capabilities', 'Build discoverability', 'Connect with potential buyers'],
    cta: 'List your company free',
    ctaAction: 'signup',
  },
  contractors: {
    headline: 'Know your suppliers. Manage every relationship.',
    description: 'A contractor workspace for your vendor directory, supplier documents and visits, with insight across every relationship.',
    benefits: ['Centralize vendor relationships', 'Track documents and visits', 'Gain actionable supplier insights'],
    cta: 'Try the contractor demo',
    ctaAction: 'demo',
  },
};

interface ProductShowcaseProps {
  value: SolutionId;
  onChange: (id: SolutionId) => void;
  onSignup: () => void;
  onDemo: () => void;
}

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({ value, onChange, onSignup, onDemo }) => {
  const reduce = useReducedMotion();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const content = CONTENT[value];
  const Preview = SHOWCASE_PREVIEWS[value];

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = SOLUTIONS[(index + (e.key === 'ArrowRight' ? 1 : -1) + SOLUTIONS.length) % SOLUTIONS.length];
    onChange(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const fade = reduce
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <section id="platform" aria-labelledby="platform-heading" className="scroll-mt-16 py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <h2 id="platform-heading" className="font-[Outfit] text-3xl font-bold tracking-tight text-soko-ink text-balance sm:text-4xl">
            One platform. Built around how you work.
          </h2>
          <div role="tablist" aria-label="Choose your role" className="inline-flex w-full rounded-xl border border-soko-line bg-soko-mist p-1 md:w-auto">
            {SOLUTIONS.map((s, i) => {
              const selected = s.id === value;
              return (
                <button
                  key={s.id}
                  ref={(el) => { tabRefs.current[s.id] = el; }}
                  type="button"
                  role="tab"
                  id={`tab-${s.id}`}
                  aria-selected={selected}
                  aria-controls="showcase-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onChange(s.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className="relative flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors md:flex-none"
                >
                  {selected && (
                    <motion.span
                      layoutId="showcase-tab"
                      className="absolute inset-0 rounded-lg bg-white shadow-sm"
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  <span className={`relative ${selected ? 'text-soko-ink' : 'text-soko-muted hover:text-soko-ink'}`}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div
          id="showcase-panel"
          role="tabpanel"
          aria-labelledby={`tab-${value}`}
          className="mt-8 grid gap-8 rounded-3xl border border-soko-line bg-white p-5 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={value} {...fade} className="flex flex-col justify-center">
              <h3 className="font-[Outfit] text-2xl font-bold tracking-tight text-soko-ink text-balance sm:text-3xl">{content.headline}</h3>
              <p className="mt-3 leading-relaxed text-soko-muted text-pretty">{content.description}</p>
              <ul className="mt-6 flex flex-col gap-3">
                {content.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-3 font-medium text-soko-ink">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-soko-blue/10 text-soko-blue">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                <button
                  type="button"
                  onClick={content.ctaAction === 'signup' ? onSignup : onDemo}
                  className="group inline-flex items-center gap-2 rounded-lg bg-soko-ink px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-soko-ink/90"
                >
                  {content.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
                {content.ctaAction === 'signup' && (
                  <button type="button" onClick={onDemo} className="text-sm font-semibold text-soko-blue hover:underline">
                    or explore the demo
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="relative rounded-2xl bg-soko-mist p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-soko-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-soko-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-soko-line" />
              </span>
              <span className="rounded-full border border-soko-line bg-white px-2 py-0.5 text-[10px] font-semibold text-soko-muted">Sample data</span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={value} {...fade}>
                <Preview />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
