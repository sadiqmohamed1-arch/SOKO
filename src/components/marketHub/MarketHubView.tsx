import React, { useMemo, useState } from 'react';
import { ArrowRight, Building2, Compass, Crown, Lock, Plus, Search, X } from 'lucide-react';
import { UserProfile } from '../../types';
import { BUYER_SUPPLIERS, supplierLocation } from '../../data/buyerSuppliers';
import { OPPORTUNITY_TYPES } from '../../data/marketHubCatalog';
import { AppRole, actorFor, campaignKindFor, campaignPermission, inboxFor, listOpportunities, loadMarketStore, ownerCampaigns, saveMarketStore, toggleSaveOpportunity } from '../../data/marketHubService';
import { CampaignKind, CampaignDraftInput, MarketHubStore, OpportunityGroup, OpportunityView, ServiceResult } from '../../data/marketHubTypes';
import { ProfileDialog } from '../ProfileDialog';
import { Toast, VerifiedCompanyBadge, btnPrimary, btnSecondary } from '../NetworkShared';
import { CampaignSection, CampaignsTab } from './CampaignsTab';
import { CampaignWizard } from './CampaignWizard';
import { CampaignCard } from './CampaignInbox';
import { MarketSignalsPanel, SokoAiPrompts } from './MarketInsights';
import { Hub, SubTabs } from './MarketHubShared';
import { MyActivityTab } from './MyActivityTab';
import { EMPTY_OPP_FILTERS, OpportunityFilterBar, OpportunityFilters, OpportunityGrid, filterOpportunities } from './OpportunityBrowser';
import { ExpressInterestDialog, OpportunityDetailDialog, PostOpportunityDialog } from './OpportunityDialogs';

type HubTab = 'for-you' | 'explore' | 'requirements' | 'supply' | 'projects' | 'campaigns' | 'activity';

const TABS: { id: HubTab; label: string }[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'explore', label: 'Explore Opportunities' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'supply', label: 'Supply & Offers' },
  { id: 'projects', label: 'Projects & Partnerships' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'activity', label: 'My Activity' },
];

const GROUP_FOR: Partial<Record<HubTab, OpportunityGroup>> = { requirements: 'requirements', supply: 'supply', projects: 'projects' };

const WORKSPACE_LABEL = { personal_buyer: 'Personal Buyer Workspace', contractor: 'Contractor Workspace', supplier: 'Supplier Workspace', soko_admin: 'SOKO Admin' };

interface MarketHubViewProps {
  currentUser: UserProfile;
  onNavigateToTab: (tab: string) => void;
  onAskSokoAi: (query: string) => void;
  onSwitchRole?: (role: AppRole) => void;
}

export const MarketHubView: React.FC<MarketHubViewProps> = ({ currentUser, onNavigateToTab, onAskSokoAi, onSwitchRole }) => {
  const [store, setStore] = useState<MarketHubStore>(loadMarketStore);
  const [tab, setTab] = useState<HubTab>('for-you');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<OpportunityFilters>(EMPTY_OPP_FILTERS);
  const [scope, setScope] = useState<'workspace' | 'all'>('workspace');
  const [openOpp, setOpenOpp] = useState<string | null>(null);
  const [interestOpp, setInterestOpp] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [wizard, setWizard] = useState<{ kind: CampaignKind; draft?: { id: string; input: CampaignDraftInput } } | null>(null);
  const [section, setSection] = useState<CampaignSection>('dashboard');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const role = (['buyer', 'contractor', 'supplier', 'admin'].includes(currentUser.role) ? currentUser.role : 'buyer') as AppRole;
  const actor = useMemo(() => actorFor(store, role), [store, role]);
  const ws = actor.workspace;

  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 3200);
  };

  const run = <T,>(r: ServiceResult<T>, success?: string | ((v: T) => string)) => {
    if (!r.ok) {
      notify(r.error);
      return false;
    }
    setStore(r.store);
    saveMarketStore(r.store);
    if (success) notify(typeof success === 'function' ? success(r.value) : success);
    return true;
  };

  const hub: Hub = { store, actor, run, notify, askAi: onAskSokoAi, openSupplier: setSupplierId, switchWorkspace: onSwitchRole };

  const all = useMemo(() => listOpportunities(store, actor), [store, actor]);
  const byId = (id: string | null) => all.find((o) => o.id === id);

  const relevantCats = useMemo(() => {
    const prefs = store.buyerPrefs[ws.id];
    if (ws.supplierProfile) return ws.supplierProfile.categories;
    return prefs ? [...prefs.followedCategories, ...prefs.interestedCategories] : [];
  }, [store.buyerPrefs, ws]);

  const forYou = (list: OpportunityView[]) => {
    if (scope === 'all' || ws.kind === 'soko_admin') return list;
    const focus: Record<string, OpportunityGroup[]> = { personal_buyer: ['requirements', 'supply'], contractor: ['requirements', 'supply', 'projects'], supplier: ['requirements', 'projects'] };
    const groups = focus[ws.kind];
    return list.filter((o) => !o.isMine && groups.includes(OPPORTUNITY_TYPES.find((t) => t.id === o.type)!.group) && (!relevantCats.length || relevantCats.includes(o.category)));
  };

  const group = GROUP_FOR[tab];
  const base = tab === 'for-you' ? forYou(all) : all;
  const shown = filterOpportunities(base, query, filters, group);

  const campaignKind = campaignKindFor(actor);
  const showCreateCampaign = ws.kind === 'contractor' || ws.kind === 'supplier';

  const createCampaign = () => {
    if (!campaignKind) return;
    const perm = campaignPermission(actor, campaignKind);
    if (!perm.allowed) {
      notify(perm.reason!);
      setTab('campaigns');
      setSection('plans');
      return;
    }
    setWizard({ kind: campaignKind });
  };

  const openCampaigns = (s: CampaignSection, id: string | null = null) => {
    setTab('campaigns');
    setSection(s);
    setCampaignId(id);
  };

  const save = (o: OpportunityView) => run(toggleSaveOpportunity(store, actor, o.id), (saved) => (saved ? 'Saved to My Activity' : 'Removed from saved'));
  const reset = () => {
    setQuery('');
    setFilters(EMPTY_OPP_FILTERS);
  };

  const isOppTab = tab !== 'campaigns' && tab !== 'activity';
  const inbox = inboxFor(store, actor);
  const ownActive = ownerCampaigns(store, actor).filter((v) => v.campaign.status === 'active');
  const supplier = BUYER_SUPPLIERS.find((s) => s.id === supplierId);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {WORKSPACE_LABEL[ws.kind]} · {ws.companyName ?? ws.personName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 leading-tight">SOKO Market Hub</h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">Discover construction requirements, connect with the right businesses, and unlock new market opportunities.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab('explore')} className={btnSecondary}>
            <Compass className="w-4 h-4" />
            Explore Opportunities
          </button>
          {actor.entitlements.postOpportunity && (
            <button type="button" onClick={() => setPosting(true)} className={btnPrimary}>
              <Plus className="w-4 h-4" />
              Post Opportunity
            </button>
          )}
          {showCreateCampaign && (
            <button
              type="button"
              onClick={createCampaign}
              className="inline-flex items-center justify-center gap-1.5 min-h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {campaignKind && campaignPermission(actor, campaignKind).allowed ? <Crown className="w-4 h-4 text-gold-300" /> : <Lock className="w-4 h-4 text-gold-300" />}
              Create Campaign
              <span className="ml-0.5 px-1.5 py-px rounded bg-gold-500/20 text-gold-300 text-[10px] uppercase tracking-wide">Premium</span>
            </button>
          )}
        </div>
      </header>

      <div className="mt-5 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOppTab) setTab('explore');
          }}
          placeholder="Search materials, subcontract packages, services, projects or opportunities..."
          aria-label="Search Market Hub"
          className="w-full h-12 pl-12 pr-10 rounded-xl border border-slate-200 bg-white text-[15px] text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-hidden focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-shadow"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="mt-4 border-b border-slate-200 flex overflow-x-auto" aria-label="Market Hub sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`relative shrink-0 px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${tab === t.id ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {t.label}
            {t.id === 'campaigns' && inbox.some((i) => !i.viewed) && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-600 align-middle" />}
            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-700" />}
          </button>
        ))}
      </nav>

      <div key={tab} className="mt-5 animate-[fadeIn_0.2s_ease-out]">
        {isOppTab && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-4">
              {tab === 'for-you' && ws.kind !== 'soko_admin' && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SubTabs
                    value={scope}
                    onChange={setScope}
                    tabs={[
                      { id: 'workspace', label: ws.kind === 'personal_buyer' ? 'Relevant to you' : `For ${ws.companyName}` },
                      { id: 'all', label: 'All Market Activity' },
                    ]}
                  />
                  {scope === 'workspace' && relevantCats.length > 0 && <p className="text-xs text-slate-500">Based on {[...new Set(relevantCats)].join(', ')}</p>}
                </div>
              )}

              {tab === 'for-you' && (inbox.length > 0 || ownActive.length > 0) && (
                <section className="grid gap-3 md:grid-cols-2">
                  {ownActive.slice(0, 1).map((v) => (
                    <button
                      key={v.campaign.id}
                      type="button"
                      onClick={() => openCampaigns('dashboard', v.campaign.id)}
                      className="group text-left rounded-xl border border-gold-200 bg-gradient-to-br from-gold-50 to-white p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-700">Your active campaign</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{v.campaign.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {v.metrics.delivered} delivered · {v.metrics.viewed} viewed · {v.campaign.kind === 'sourcing' ? `${v.metrics.responded} responses` : `${v.metrics.interested} interested`}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                        Open dashboard <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </button>
                  ))}
                  {inbox.slice(0, ownActive.length ? 1 : 2).map((i) => (
                    <div
                      key={i.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openCampaigns('inbox')}
                      onKeyDown={(e) => e.key === 'Enter' && openCampaigns('inbox')}
                      className="text-left cursor-pointer rounded-xl hover:shadow-md transition-shadow"
                    >
                      <CampaignCard item={i} />
                    </div>
                  ))}
                </section>
              )}

              {tab === 'for-you' && ws.kind === 'soko_admin' && (
                <button type="button" onClick={() => openCampaigns('moderation')} className={btnSecondary}>
                  Open campaign moderation queue
                </button>
              )}

              <OpportunityFilterBar filters={filters} onChange={setFilters} group={group} />
              <p className="text-xs text-slate-500">
                {shown.length} {shown.length === 1 ? 'opportunity' : 'opportunities'}
              </p>
              <OpportunityGrid list={shown} onOpen={(o) => setOpenOpp(o.id)} onInterest={(o) => setInterestOpp(o.id)} onSave={save} onReset={reset} />
            </div>
            <aside className="space-y-4">
              <MarketSignalsPanel
                store={store}
                onPickCategory={(c) => {
                  setFilters({ ...EMPTY_OPP_FILTERS, category: c });
                  setTab('explore');
                }}
              />
              <SokoAiPrompts kind={ws.kind} onAsk={onAskSokoAi} />
            </aside>
          </div>
        )}

        {tab === 'campaigns' && (
          <CampaignsTab
            hub={hub}
            section={section}
            onSection={setSection}
            openId={campaignId}
            onOpen={setCampaignId}
            onCreate={createCampaign}
            onEdit={(v) => setWizard({ kind: v.campaign.kind, draft: { id: v.campaign.id, input: v.campaign } })}
          />
        )}

        {tab === 'activity' && <MyActivityTab hub={hub} list={all} onOpen={(o) => setOpenOpp(o.id)} onPost={() => setPosting(true)} onOpenInbox={() => openCampaigns('inbox')} />}
      </div>

      {byId(openOpp) && (
        <OpportunityDetailDialog
          hub={hub}
          o={byId(openOpp)!}
          onClose={() => setOpenOpp(null)}
          onInterest={() => {
            setInterestOpp(openOpp);
          }}
        />
      )}
      {byId(interestOpp) && <ExpressInterestDialog hub={hub} o={byId(interestOpp)!} onClose={() => setInterestOpp(null)} />}
      {posting && (
        <PostOpportunityDialog
          hub={hub}
          onClose={() => setPosting(false)}
          onPosted={(id) => {
            setPosting(false);
            setOpenOpp(id);
          }}
        />
      )}
      {wizard && (
        <CampaignWizard
          hub={hub}
          kind={wizard.kind}
          draft={wizard.draft}
          onClose={() => setWizard(null)}
          onDone={(id) => {
            setWizard(null);
            openCampaigns('dashboard', id);
          }}
        />
      )}
      {supplier && (
        <ProfileDialog
          title={supplier.name}
          subtitle={supplier.types.join(' · ')}
          onClose={() => setSupplierId(null)}
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSupplierId(null);
                  onNavigateToTab('suppliers');
                }}
                className={btnPrimary}
              >
                <Building2 className="w-4 h-4" />
                Open Suppliers directory
              </button>
            </div>
          }
        >
          <div className="px-5 py-4 space-y-3">
            {supplier.status === 'verified' && <VerifiedCompanyBadge />}
            <p className="text-sm text-slate-700 leading-relaxed">{supplier.description}</p>
            <p className="text-xs text-slate-500">
              {supplier.categories.join(', ')} · {supplierLocation(supplier)}
            </p>
            <p className="text-[11px] text-slate-400">Contact this supplier through their SOKO profile. Campaign recipients' private contact details are never shared.</p>
          </div>
        </ProfileDialog>
      )}
      <Toast message={toast} />
    </div>
  );
};
