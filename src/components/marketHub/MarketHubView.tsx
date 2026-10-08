import React, { useMemo, useState } from 'react';
import { Building2, Compass, Crown, ListChecks, Lock, Megaphone, Plus } from 'lucide-react';
import { UserProfile } from '../../types';
import { BUYER_SUPPLIERS, supplierLocation } from '../../data/buyerSuppliers';
import { PLANS } from '../../data/marketHubCatalog';
import { AppRole, actorFor, campaignKindFor, campaignPermission, draftInputOf, inboxFor, listOpportunities, loadMarketStore, saveMarketStore, toggleSaveOpportunity } from '../../data/marketHubService';
import { CampaignDraftInput, CampaignKind, MarketHubStore, OpportunityView, ServiceResult } from '../../data/marketHubTypes';
import { ProfileDialog } from '../ProfileDialog';
import { Toast, VerifiedCompanyBadge, btnPrimary } from '../NetworkShared';
import { CampaignCenter, CampaignNav } from './CampaignCenter';
import { CampaignWizard } from './CampaignWizard';
import { EMPTY_EXPLORE, ExploreState, ExploreTab } from './ExploreTab';
import { Hub } from './MarketHubShared';
import { MyActivityTab } from './MyActivityTab';
import { ExpressInterestDialog, OpportunityDetailDialog, PostOpportunityDialog } from './OpportunityDialogs';

type Destination = 'explore' | 'campaigns' | 'activity';

const DESTINATIONS: { id: Destination; label: string; caption: string; icon: typeof Compass }[] = [
  { id: 'explore', label: 'Explore', caption: 'Requirements, supply, projects', icon: Compass },
  { id: 'campaigns', label: 'Campaign Center', caption: 'Dashboard, inbox and credits', icon: Megaphone },
  { id: 'activity', label: 'My Activity', caption: 'Posts, interests and saved', icon: ListChecks },
];

const WORKSPACE_LABEL = { personal_buyer: 'Personal Buyer Workspace', contractor: 'Contractor Workspace', supplier: 'Supplier Workspace', soko_admin: 'SOKO Admin' };

interface MarketHubViewProps {
  currentUser: UserProfile;
  onNavigateToTab: (tab: string) => void;
  onAskSokoAi: (query: string) => void;
  onSwitchRole?: (role: AppRole) => void;
}

export const MarketHubView: React.FC<MarketHubViewProps> = ({ currentUser, onNavigateToTab, onAskSokoAi, onSwitchRole }) => {
  const [store, setStore] = useState<MarketHubStore>(loadMarketStore);
  const [dest, setDest] = useState<Destination>('explore');
  const [explore, setExplore] = useState<ExploreState>(EMPTY_EXPLORE);
  const [campaignNav, setCampaignNav] = useState<CampaignNav | null>(null);
  const [openOpp, setOpenOpp] = useState<string | null>(null);
  const [interestOpp, setInterestOpp] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [wizard, setWizard] = useState<{ kind: CampaignKind; draft?: { id: string; input: CampaignDraftInput } } | null>(null);
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

  const campaignKind = campaignKindFor(actor);
  const canCreateCampaign = !!campaignKind && campaignPermission(actor, campaignKind).allowed;
  const unread = inboxFor(store, actor).filter((i) => !i.viewed).length;

  const openCampaigns = (n: CampaignNav) => {
    setCampaignNav(n);
    setDest('campaigns');
  };

  const createCampaign = () => {
    if (!campaignKind) return;
    const perm = campaignPermission(actor, campaignKind);
    if (!perm.allowed) {
      notify(perm.reason!);
      openCampaigns({ section: 'plans', compare: true });
      return;
    }
    setWizard({ kind: campaignKind });
  };

  const save = (o: OpportunityView) => run(toggleSaveOpportunity(store, actor, o.id), (saved) => (saved ? 'Saved to My Activity' : 'Removed from saved'));
  const supplier = BUYER_SUPPLIERS.find((s) => s.id === supplierId);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {WORKSPACE_LABEL[ws.kind]} · {ws.companyName ?? ws.personName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 leading-tight">SOKO Market Hub</h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">Discover construction requirements, connect with the right businesses, and unlock new market opportunities.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actor.entitlements.postOpportunity && (
            <button type="button" onClick={() => setPosting(true)} className={btnPrimary}>
              <Plus className="w-4 h-4" />
              Post Opportunity
            </button>
          )}
          {campaignKind && (
            <button
              type="button"
              onClick={createCampaign}
              title={canCreateCampaign ? undefined : `${PLANS[actor.plan].label} cannot launch campaigns. Click to preview upgrades.`}
              className="inline-flex items-center justify-center gap-1.5 min-h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {canCreateCampaign ? <Crown className="w-4 h-4 text-gold-300" /> : <Lock className="w-4 h-4 text-gold-300" />}
              Create Campaign
              <span className="ml-0.5 px-1.5 py-px rounded bg-gold-500/20 text-gold-300 text-[10px] uppercase tracking-wide">Premium</span>
            </button>
          )}
        </div>
      </header>

      <nav aria-label="Market Hub" className="mt-5 grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100">
        {DESTINATIONS.map((d) => {
          const on = dest === d.id;
          const Icon = d.icon;
          return (
            <button
              key={d.id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => {
                if (d.id === 'campaigns') setCampaignNav(null);
                setDest(d.id);
              }}
              className={`relative flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                on ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/60'
              }`}
            >
              <span className={`hidden sm:flex w-9 h-9 shrink-0 rounded-lg items-center justify-center transition-colors ${on ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}>
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold truncate ${on ? 'text-slate-900' : 'text-slate-600'}`}>{d.label}</span>
                <span className="hidden md:block text-[11px] text-slate-500 truncate">{d.caption}</span>
              </span>
              {d.id === 'campaigns' && unread > 0 && (
                <span className="ml-auto shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold leading-5 text-center tabular-nums" aria-label={`${unread} unread campaigns`}>
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div key={dest} className="mt-6 animate-[fadeIn_0.2s_ease-out]">
        {dest === 'explore' && (
          <ExploreTab
            hub={hub}
            all={all}
            state={explore}
            onChange={setExplore}
            onOpen={(o) => setOpenOpp(o.id)}
            onInterest={(o) => setInterestOpp(o.id)}
            onSave={save}
            onCampaigns={openCampaigns}
          />
        )}
        {dest === 'campaigns' && (
          <CampaignCenter
            hub={hub}
            nav={campaignNav}
            onNav={setCampaignNav}
            onCreate={createCampaign}
            onEdit={(v) => setWizard({ kind: v.campaign.kind, draft: { id: v.campaign.id, input: draftInputOf(v.campaign) } })}
          />
        )}
        {dest === 'activity' && (
          <MyActivityTab hub={hub} list={all} onOpen={(o) => setOpenOpp(o.id)} onPost={() => setPosting(true)} onOpenInbox={() => openCampaigns({ section: 'inbox' })} />
        )}
      </div>

      {byId(openOpp) && <OpportunityDetailDialog hub={hub} o={byId(openOpp)!} onClose={() => setOpenOpp(null)} onInterest={() => setInterestOpp(openOpp)} />}
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
            openCampaigns({ section: 'campaigns', id });
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
