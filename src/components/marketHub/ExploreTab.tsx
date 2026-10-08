import React from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { opportunityGroup } from '../../data/marketHubCatalog';
import { inboxFor, ownerCampaigns } from '../../data/marketHubService';
import { OpportunityGroup, OpportunityView } from '../../data/marketHubTypes';
import { btnSecondary } from '../NetworkShared';
import { CampaignNav } from './CampaignCenter';
import { CampaignCard } from './CampaignInbox';
import { MarketSignalsPanel, SokoAiPrompts } from './MarketInsights';
import { Hub, SubTabs } from './MarketHubShared';
import { EMPTY_OPP_FILTERS, OpportunityFilterBar, OpportunityFilters, OpportunityGrid, filterOpportunities } from './OpportunityBrowser';

export interface ExploreState {
  query: string;
  filters: OpportunityFilters;
  scope: 'workspace' | 'all';
  group: OpportunityGroup | '';
}

export const EMPTY_EXPLORE: ExploreState = { query: '', filters: EMPTY_OPP_FILTERS, scope: 'workspace', group: '' };

const GROUPS: { id: OpportunityGroup | ''; label: string }[] = [
  { id: '', label: 'All types' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'supply', label: 'Supply & Offers' },
  { id: 'projects', label: 'Projects & Partnerships' },
];

const FOCUS: Record<string, OpportunityGroup[]> = {
  personal_buyer: ['requirements', 'supply'],
  contractor: ['requirements', 'supply', 'projects'],
  supplier: ['requirements', 'projects'],
};

export const ExploreTab: React.FC<{
  hub: Hub;
  all: OpportunityView[];
  state: ExploreState;
  onChange: (s: ExploreState) => void;
  onOpen: (o: OpportunityView) => void;
  onInterest: (o: OpportunityView) => void;
  onSave: (o: OpportunityView) => void;
  onCampaigns: (n: CampaignNav) => void;
}> = ({ hub, all, state, onChange, onOpen, onInterest, onSave, onCampaigns }) => {
  const { store, actor } = hub;
  const ws = actor.workspace;
  const set = (patch: Partial<ExploreState>) => onChange({ ...state, ...patch });

  const relevantCats = ws.supplierProfile
    ? ws.supplierProfile.categories
    : store.buyerPrefs[ws.id]
      ? [...new Set([...store.buyerPrefs[ws.id].followedCategories, ...store.buyerPrefs[ws.id].interestedCategories])]
      : [];

  const personalised = state.scope === 'workspace' && ws.kind !== 'soko_admin';
  const base = personalised
    ? all.filter((o) => !o.isMine && FOCUS[ws.kind].includes(opportunityGroup(o.type)) && (!relevantCats.length || relevantCats.includes(o.category)))
    : all;
  const shown = filterOpportunities(base, state.query, state.filters, state.group || undefined);
  const countFor = (g: OpportunityGroup | '') => filterOpportunities(base, state.query, { ...state.filters, type: '' }, g || undefined).length;

  const inbox = personalised ? inboxFor(store, actor) : [];
  const ownActive = personalised ? ownerCampaigns(store, actor).filter((v) => v.campaign.status === 'active') : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {ws.kind !== 'soko_admin' ? (
            <SubTabs
              value={state.scope}
              onChange={(scope) => set({ scope })}
              tabs={[
                { id: 'workspace', label: 'For You' },
                { id: 'all', label: 'All Market Activity' },
              ]}
            />
          ) : (
            <span />
          )}
          {personalised && relevantCats.length > 0 && <p className="text-xs text-slate-500">Matched to {relevantCats.join(', ')}</p>}
        </div>

        <label className="flex items-center gap-3 h-12 px-4 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-shadow">
          <Search className="w-5 h-5 shrink-0 text-slate-400" aria-hidden />
          <input
            type="text"
            inputMode="search"
            value={state.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Search materials, subcontract packages, services, projects or opportunities..."
            aria-label="Search Market Hub"
            className="flex-1 min-w-0 h-full bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          {state.query && (
            <button type="button" aria-label="Clear search" onClick={() => set({ query: '' })} className="p-1 -mr-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Opportunity group">
          {GROUPS.map((g) => {
            const on = state.group === g.id;
            return (
              <button
                key={g.id || 'all'}
                type="button"
                aria-pressed={on}
                onClick={() => set({ group: g.id, filters: { ...state.filters, type: '' } })}
                className={`inline-flex items-center gap-2 min-h-9 px-3.5 rounded-full border text-sm font-semibold transition-colors cursor-pointer ${
                  on ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {g.label}
                <span className={`min-w-5 px-1.5 rounded-full text-[11px] leading-5 text-center tabular-nums ${on ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{countFor(g.id)}</span>
              </button>
            );
          })}
        </div>

        <OpportunityFilterBar filters={state.filters} onChange={(filters) => set({ filters })} group={state.group || undefined} />

        {(ownActive.length > 0 || inbox.length > 0) && (
          <section className="grid gap-3 md:grid-cols-2">
            {ownActive.slice(0, 1).map((v) => (
              <button
                key={v.campaign.id}
                type="button"
                onClick={() => onCampaigns({ section: 'campaigns', id: v.campaign.id })}
                className="group text-left rounded-xl border border-gold-200 bg-gradient-to-br from-gold-50 to-white p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-700">Your active campaign</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{v.campaign.title}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {v.metrics.delivered} delivered · {v.metrics.viewed} viewed · {v.campaign.kind === 'sourcing' ? `${v.metrics.responded} responses` : `${v.metrics.interested} interested`}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                  Open campaign <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            ))}
            {inbox.slice(0, ownActive.length ? 1 : 2).map((i) => (
              <div
                key={i.id}
                role="button"
                tabIndex={0}
                onClick={() => onCampaigns({ section: 'inbox' })}
                onKeyDown={(e) => e.key === 'Enter' && onCampaigns({ section: 'inbox' })}
                className="text-left cursor-pointer rounded-xl hover:shadow-md transition-shadow"
              >
                <CampaignCard item={i} />
              </div>
            ))}
          </section>
        )}

        {ws.kind === 'soko_admin' && (
          <button type="button" onClick={() => onCampaigns({ section: 'moderation' })} className={btnSecondary}>
            Open campaign moderation queue
          </button>
        )}

        <p className="text-xs text-slate-500">
          {shown.length} {shown.length === 1 ? 'opportunity' : 'opportunities'}
          {personalised && ' matched to your workspace'}
        </p>
        <OpportunityGrid list={shown} onOpen={onOpen} onInterest={onInterest} onSave={onSave} onReset={() => onChange({ ...EMPTY_EXPLORE, scope: state.scope })} />
      </div>
      <aside className="space-y-4">
        <MarketSignalsPanel store={store} onPickCategory={(c) => onChange({ ...EMPTY_EXPLORE, scope: 'all', filters: { ...EMPTY_OPP_FILTERS, category: c } })} />
        <SokoAiPrompts kind={ws.kind} onAsk={hub.askAi} />
      </aside>
    </div>
  );
};
