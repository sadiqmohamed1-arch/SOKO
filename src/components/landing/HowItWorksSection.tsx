import React from 'react';
import { BadgeCheck, Building2, CircleUser, ShieldCheck, User } from 'lucide-react';
import { STEPS } from './landingContent';

const WORKSPACES = [
  { name: 'Personal workspace', role: 'Card, network and saved products' },
  { name: 'ABC Waterproofing LLC', role: 'Supplier · Company Admin' },
  { name: 'GEC Dubai', role: 'Contractor · Procurement' },
];

export const HowItWorksSection: React.FC = () => (
  <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 border-t border-soko-line py-20 lg:py-28">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-soko-blue">How it works</p>
        <h2 id="how-heading" className="mt-2 text-4xl font-bold tracking-tight text-soko-ink text-balance">
          Three steps from sign-up to useful insight.
        </h2>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <ol className="flex flex-col">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-5 border-t border-soko-line py-6 first:border-t-0 first:pt-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-soko-ink font-[Outfit] text-sm font-bold text-soko-ink">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-soko-ink">{s.title}</h3>
                <p className="mt-1.5 leading-relaxed text-soko-muted text-pretty">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <figure className="rounded-2xl border border-soko-line bg-soko-mist p-6 sm:p-8">
          <figcaption>
            <p className="text-lg font-semibold text-soko-ink">One identity, many workspaces</p>
            <p className="mt-1.5 leading-relaxed text-soko-muted text-pretty">
              You register once as yourself. Each company you belong to adds a separate workspace with its own role and records, and leaving a company never deletes your personal account.
            </p>
          </figcaption>

          <div className="mt-6 flex flex-col gap-3" aria-hidden="true">
            <div className="flex items-center gap-3 rounded-xl bg-soko-ink px-4 py-3 text-white">
              <User className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Ahmed Khan</p>
                <p className="text-xs text-white/70">One SOKO account</p>
              </div>
            </div>
            <div className="ml-5 flex flex-col gap-2 border-l border-dashed border-soko-ink/30 pl-5">
              {WORKSPACES.map((w, i) => (
                <div key={w.name} className="flex items-center gap-3 rounded-xl border border-soko-line bg-white px-4 py-3">
                  {i === 0 ? <CircleUser className="h-4 w-4 text-soko-muted" /> : <Building2 className="h-4 w-4 text-soko-muted" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-soko-ink">{w.name}</p>
                    <p className="truncate text-xs text-soko-muted">{w.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs text-soko-muted">Illustrative example.</p>
        </figure>
      </div>
    </div>
  </section>
);

const TRUST_LEVELS = [
  {
    badge: 'Registered on SOKO',
    badgeClass: 'border border-soko-line bg-white text-soko-ink',
    icon: Building2,
    grantedBy: 'The company itself',
    means: 'The company has created a SOKO profile and manages its own details.',
    notMeans: 'It does not mean SOKO has reviewed the company.',
  },
  {
    badge: 'SOKO Verified',
    badgeClass: 'bg-soko-blue text-white',
    icon: BadgeCheck,
    grantedBy: 'SOKO, after a review',
    means: 'SOKO has reviewed the company’s submitted registration documents, where the company is eligible.',
    notMeans: 'It is never automatic, and it is not a contractor’s approval.',
  },
  {
    badge: 'Approved vendor',
    badgeClass: 'bg-soko-ink text-white',
    icon: ShieldCheck,
    grantedBy: 'Each contractor, privately',
    means: 'A specific contractor has approved the supplier under its own internal process.',
    notMeans: 'It is visible only inside that contractor’s workspace.',
  },
];

export const TrustSection: React.FC = () => (
  <section aria-labelledby="trust-heading" className="border-t border-soko-line bg-soko-mist py-20 lg:py-28">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-soko-blue">Trust & verification</p>
        <h2 id="trust-heading" className="mt-2 text-4xl font-bold tracking-tight text-soko-ink text-balance">
          Three different signals, never blurred together.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-soko-muted text-pretty">
          Being on SOKO, being verified by SOKO, and being approved by a contractor mean different things, and SOKO always shows which one applies.
        </p>
      </div>

      <ul className="mt-12 grid gap-4 lg:grid-cols-3">
        {TRUST_LEVELS.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.badge} className="flex flex-col rounded-2xl border border-soko-line bg-white p-6">
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${t.badgeClass}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t.badge}
              </span>
              <dl className="mt-6 flex flex-col gap-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-soko-muted">Granted by</dt>
                  <dd className="mt-1 font-medium text-soko-ink">{t.grantedBy}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-soko-muted">What it means</dt>
                  <dd className="mt-1 leading-relaxed text-soko-ink">{t.means}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-soko-muted">Keep in mind</dt>
                  <dd className="mt-1 leading-relaxed text-soko-muted">{t.notMeans}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  </section>
);
