import React from 'react';
import { ArrowRight, Minus, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { marketSignals } from '../../data/marketHubService';
import { MarketHubStore, WorkspaceKind } from '../../data/marketHubTypes';
import { DemoNote } from './MarketHubShared';

const TREND = {
  up: { icon: TrendingUp, cls: 'text-emerald-700 bg-emerald-50', label: 'Rising' },
  steady: { icon: Minus, cls: 'text-slate-600 bg-slate-100', label: 'Steady' },
  down: { icon: TrendingDown, cls: 'text-amber-800 bg-amber-50', label: 'Slowing' },
};

export const MarketSignalsPanel: React.FC<{ store: MarketHubStore; onPickCategory: (c: string) => void }> = ({ store, onPickCategory }) => {
  const signals = marketSignals(store);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Market Signals</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Demo data</span>
      </div>
      <ul className="mt-3 space-y-1">
        {signals.map((s) => {
          const t = TREND[s.trend];
          const Icon = t.icon;
          return (
            <li key={s.category}>
              <button type="button" onClick={() => onPickCategory(s.category)} className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.cls}`} title={t.label}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800 truncate">{s.category}</span>
                  <span className="block text-[11px] text-slate-500">
                    {s.opportunities} open {s.opportunities === 1 ? 'opportunity' : 'opportunities'} · {s.campaigns} active {s.campaigns === 1 ? 'campaign' : 'campaigns'}
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums whitespace-nowrap">{s.recent} this week</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3">
        <DemoNote>Derived from SOKO demo opportunities and campaigns. Trends compare the last 7 days with the week before and are not verified market statistics.</DemoNote>
      </div>
    </section>
  );
};

const PROMPTS: Record<WorkspaceKind, string[]> = {
  personal_buyer: ['Find waterproofing requirements in Dubai.', 'Find available steel suppliers in Abu Dhabi.', 'Which categories have the most active requirements?'],
  contractor: ['Show suppliers relevant to my waterproofing campaign.', 'Summarize responses to my campaign.', 'Find available steel suppliers in Abu Dhabi.'],
  supplier: ['Find waterproofing requirements in Dubai.', 'Which categories have the most active requirements?', 'Find contractors sourcing construction chemicals.'],
  soko_admin: ['Which categories have the most active requirements?', 'Find waterproofing requirements in Dubai.'],
};

export const SokoAiPrompts: React.FC<{ kind: WorkspaceKind; onAsk: (q: string) => void }> = ({ kind, onAsk }) => (
  <section className="rounded-2xl bg-slate-900 text-white p-4">
    <div className="flex items-center gap-2">
      <span className="w-7 h-7 rounded-lg bg-gold-500/20 text-gold-300 flex items-center justify-center">
        <Sparkles className="w-4 h-4" />
      </span>
      <h2 className="text-sm font-semibold">Ask SOKO AI</h2>
    </div>
    <ul className="mt-3 space-y-1.5">
      {PROMPTS[kind].map((p) => (
        <li key={p}>
          <button
            type="button"
            onClick={() => onAsk(p)}
            className="group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left text-xs text-slate-200 transition-colors cursor-pointer"
          >
            <span>{p}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-gold-300 group-hover:translate-x-0.5 transition-all" />
          </button>
        </li>
      ))}
    </ul>
    <p className="mt-3 text-[11px] text-slate-400 leading-snug">Opens SOKO AI with this question. AI answers are suggestions to verify, not confirmed facts.</p>
  </section>
);
