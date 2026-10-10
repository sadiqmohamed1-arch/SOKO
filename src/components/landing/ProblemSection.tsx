import React from 'react';
import { ArrowRight, Building2, CircleUser, Factory, type LucideIcon } from 'lucide-react';
import { Reveal } from './Reveal';
import type { SolutionId } from './solutions';

const PROBLEMS: { id: SolutionId; icon: LucideIcon; audience: string; pain: string; solution: string; action: string }[] = [
  {
    id: 'professionals',
    icon: CircleUser,
    audience: 'Professionals',
    pain: 'Your business contacts shouldn’t disappear when you change companies.',
    solution: 'One professional identity. A network that stays with you.',
    action: 'See it for professionals',
  },
  {
    id: 'suppliers',
    icon: Factory,
    audience: 'Suppliers',
    pain: 'Great products mean little if the right buyers never discover them.',
    solution: 'Make your company, capabilities and products discoverable.',
    action: 'See it for suppliers',
  },
  {
    id: 'contractors',
    icon: Building2,
    audience: 'Contractors',
    pain: 'Supplier information is everywhere. The complete picture is nowhere.',
    solution: 'Bring vendors, documents, visits and relationships into one workspace.',
    action: 'See it for contractors',
  },
];

export const ProblemSection: React.FC<{ onSelect: (id: SolutionId) => void }> = ({ onSelect }) => (
  <section aria-labelledby="problem-heading" className="border-t border-soko-line bg-soko-mist py-14 lg:py-16">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <Reveal>
        <h2 id="problem-heading" className="max-w-2xl font-[Outfit] text-3xl font-bold tracking-tight text-soko-ink text-balance sm:text-4xl">
          Construction is connected. Its information isn&apos;t.
        </h2>
      </Reveal>

      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {PROBLEMS.map((p, i) => {
          const Icon = p.icon;
          return (
            <Reveal as="li" key={p.id} delay={0.08 * i}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="group flex h-full w-full flex-col rounded-2xl border border-soko-line bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-soko-blue/40 hover:shadow-[0_18px_40px_-20px_rgba(11,13,18,0.35)] sm:p-6"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-soko-ink">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-soko-mist text-soko-ink transition-colors duration-300 group-hover:bg-soko-blue group-hover:text-white">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {p.audience}
                </span>
                <p className="mt-4 text-base font-medium leading-relaxed text-soko-muted transition-colors duration-300 group-hover:text-soko-muted/70">
                  {`“${p.pain}”`}
                </p>
                <div className="mt-4 flex flex-1 items-start gap-2 border-t border-dashed border-soko-line pt-4">
                  <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-soko-blue">SOKO</span>
                  <p className="text-base font-semibold leading-relaxed text-soko-ink">{p.solution}</p>
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-soko-blue">
                  {p.action}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </button>
            </Reveal>
          );
        })}
      </ul>
    </div>
  </section>
);
