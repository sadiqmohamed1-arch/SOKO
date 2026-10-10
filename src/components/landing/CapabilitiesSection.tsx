import React from 'react';
import { CAPABILITIES, type PreviewRow } from './landingContent';

const toneClass: Record<NonNullable<PreviewRow['tone']>, string> = {
  blue: 'bg-soko-blue/10 text-soko-blue',
  ink: 'bg-soko-ink text-white',
  muted: 'bg-soko-mist text-soko-muted',
};

export const CapabilitiesSection: React.FC = () => (
  <section id="platform" aria-labelledby="platform-heading" className="scroll-mt-20 py-20 lg:py-28">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-soko-blue">Platform</p>
        <h2 id="platform-heading" className="mt-2 text-4xl font-bold tracking-tight text-soko-ink text-balance">
          Seven capabilities. One connected record.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-soko-muted text-pretty">
          Every card, product, document and visit links back to the people and companies involved, so nothing lives in isolation.
        </p>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((c) => {
          const Icon = c.icon;
          return (
            <li
              key={c.id}
              className={`flex flex-col rounded-2xl border border-soko-line bg-white p-6 transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(11,13,18,0.2)] ${c.wide ? 'lg:col-span-2' : ''}`}
            >
              <div className={`flex flex-1 flex-col gap-6 ${c.wide ? 'lg:flex-row lg:items-start' : ''}`}>
                <div className={c.wide ? 'lg:flex-1' : ''}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soko-mist text-soko-ink">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-soko-ink">{c.title}</h3>
                  <p className="mt-2 leading-relaxed text-soko-muted text-pretty">{c.body}</p>
                </div>

                <div aria-hidden="true" className={`mt-auto rounded-xl border border-soko-line bg-soko-mist/70 p-3 ${c.wide ? 'lg:mt-0 lg:flex-1' : ''}`}>
                  <p className="px-1 pb-2 text-xs font-semibold text-soko-ink">{c.preview.title}</p>
                  <div className="flex flex-col gap-1.5">
                    {c.preview.rows.map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                        <span className="text-xs text-soko-muted">{r.label}</span>
                        <span className={`truncate rounded-md px-2 py-0.5 text-xs font-medium ${r.tone ? toneClass[r.tone] : 'text-soko-ink'}`}>
                          {r.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-sm text-soko-muted">
        Market Hub connects businesses around opportunities. It is not a tendering, bid-award or procurement system.
      </p>
    </div>
  </section>
);
