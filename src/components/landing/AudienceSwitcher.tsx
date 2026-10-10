import React, { useRef } from 'react';
import { Check } from 'lucide-react';
import { AUDIENCES, type AudienceId } from './landingContent';

interface AudienceSwitcherProps {
  value: AudienceId;
  onChange: (id: AudienceId) => void;
}

export const AudienceSwitcher: React.FC<AudienceSwitcherProps> = ({ value, onChange }) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const audience = AUDIENCES.find((a) => a.id === value) ?? AUDIENCES[0];

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const nextIndex = (index + (e.key === 'ArrowRight' ? 1 : -1) + AUDIENCES.length) % AUDIENCES.length;
    onChange(AUDIENCES[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section id="audiences" aria-labelledby="audiences-heading" className="scroll-mt-20 border-t border-soko-line bg-soko-mist py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-soko-blue">Who SOKO is for</p>
            <h2 id="audiences-heading" className="mt-2 text-4xl font-bold tracking-tight text-soko-ink text-balance">
              Built for every side of a construction relationship.
            </h2>
          </div>

          <div role="tablist" aria-label="Audience" className="inline-flex w-full rounded-lg border border-soko-line bg-white p-1 sm:w-auto">
            {AUDIENCES.map((a, i) => {
              const selected = a.id === value;
              return (
                <button
                  key={a.id}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  role="tab"
                  id={`audience-tab-${a.id}`}
                  aria-selected={selected}
                  aria-controls="audience-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onChange(a.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-4 ${
                    selected ? 'bg-soko-ink text-white' : 'text-soko-muted hover:text-soko-ink'
                  }`}
                >
                  {a.navLabel.replace('For ', '')}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="audience-panel"
          role="tabpanel"
          aria-labelledby={`audience-tab-${audience.id}`}
          className="mt-10 grid gap-6 rounded-2xl border border-soko-line bg-white p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12"
        >
          <div>
            <p className="text-sm font-semibold text-soko-muted">{audience.label}</p>
            <h3 className="mt-2 text-2xl font-semibold leading-snug text-soko-ink text-balance sm:text-3xl">{audience.headline}</h3>
            <p className="mt-4 leading-relaxed text-soko-muted text-pretty">{audience.summary}</p>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-soko-muted">Where you&apos;ll work</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {audience.modules.map((m) => (
                  <li key={m} className="rounded-full border border-soko-line px-3 py-1 text-sm text-soko-ink">{m}</li>
                ))}
              </ul>
            </div>
          </div>

          <ul className="flex flex-col divide-y divide-soko-line border-t border-soko-line lg:border-t-0">
            {audience.points.map((p) => (
              <li key={p} className="flex items-start gap-3 py-3.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-soko-blue/10 text-soko-blue">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="leading-relaxed text-soko-ink">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
