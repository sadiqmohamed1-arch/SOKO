import React from 'react';
import { ArrowRight, Check, Coins, Crown, Inbox, Info, LayoutDashboard, ListChecks, Plus, ShieldCheck, WalletCards } from 'lucide-react';
import { PLANS, UPGRADE_PATHS } from '../../data/marketHubCatalog';
import { activateDemoPlan, campaignKindFor, campaignPermission, creditAccount, inboxFor, ownerCampaigns } from '../../data/marketHubService';
import { OwnerCampaignView } from '../../data/marketHubTypes';
import { btnPrimary, btnSecondary } from '../NetworkShared';
import { CampaignDashboard } from './CampaignDashboard';
import { CampaignDetail } from './CampaignDetail';
import { CampaignInbox } from './CampaignInbox';
import { CampaignModeration } from './CampaignModeration';
import { CampaignPlans } from './CampaignPlans';
import { Hub } from './MarketHubShared';
import { MyCampaigns } from './MyCampaigns';

export type CampaignSection = 'dashboard' | 'campaigns' | 'inbox' | 'plans' | 'moderation';

export interface CampaignNav {
  section: CampaignSection;
  id?: string | null;
  focus?: 'responses';
  compare?: boolean;
}

const SECTION_META: Record<CampaignSection, { label: string; icon: typeof Inbox }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  inbox: { label: 'Inbox', icon: Inbox },
  campaigns: { label: 'Campaigns', icon: ListChecks },
  plans: { label: 'Plans & Credits', icon: WalletCards },
  moderation: { label: 'Moderation', icon: ShieldCheck },
};

export const campaignSectionsFor = (hub: Hub): CampaignSection[] => {
  const kind = campaignKindFor(hub.actor);
  if (hub.actor.workspace.kind === 'soko_admin') return ['moderation'];
  if (kind && campaignPermission(hub.actor, kind).allowed) return ['dashboard', 'campaigns', 'inbox', 'plans'];
  if (hub.actor.workspace.kind === 'personal_buyer') return ['inbox'];
  return ['inbox', 'plans'];
};

const PREMIUM_POINTS = {
  contractor: ['Publish sourcing campaigns to relevant, verified suppliers', 'See delivery, views and supplier responses in one dashboard', 'Shortlist and connect with responders through SOKO'],
  supplier: ['Promote products to buyers following your categories', 'Track delivery, views and buyer interest', 'Recipients stay protected: SOKO handles delivery, no contact lists'],
};

const UpgradeCallout: React.FC<{ hub: Hub; onCompare: () => void }> = ({ hub, onCompare }) => {
  const kind = hub.actor.workspace.kind === 'supplier' ? 'supplier' : 'contractor';
  const premium = UPGRADE_PATHS[hub.actor.workspace.kind][1];
  return (
    <section className="grid gap-4 md:grid-cols-[1fr_auto] items-center rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50 to-white p-5">
      <div>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
          <Crown className="w-3.5 h-3.5" />
          {PLANS[hub.actor.plan].label} · campaigns locked
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">Upgrade to {PLANS[premium].label} to publish {kind === 'contractor' ? 'sourcing' : 'promotional'} campaigns</h3>
        <p className="mt-1 text-sm text-slate-600">You can keep using every free Market Hub feature and receive relevant campaigns below. Launching campaigns requires a premium company plan.</p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-3">
          {PREMIUM_POINTS[kind].map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-xs text-slate-700">
              <Check className="w-3.5 h-3.5 mt-px shrink-0 text-emerald-600" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex md:flex-col gap-2">
        <button type="button" onClick={onCompare} className={btnPrimary}>
          Compare plans
          <ArrowRight className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => hub.run(activateDemoPlan(hub.store, hub.actor, premium), `${PLANS[premium].label} activated (demo, no payment)`)} className={btnSecondary}>
          Try premium (demo)
        </button>
      </div>
    </section>
  );
};

const DemoPlanToggle: React.FC<{ hub: Hub }> = ({ hub }) => {
  const [free, premium] = UPGRADE_PATHS[hub.actor.workspace.kind];
  if (!free || !premium) return null;
  const isFree = hub.actor.plan === free;
  const opt = (on: boolean, label: string, plan: typeof free) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => !on && hub.run(activateDemoPlan(hub.store, hub.actor, plan), `Now viewing ${PLANS[plan].label} (demo)`)}
      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex items-center gap-2" title="Prototype only: switch this workspace between its free and premium plan">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Demo plan</span>
      <div className="inline-flex p-0.5 rounded-lg bg-slate-100">
        {opt(isFree, 'Free', free)}
        {opt(!isFree, 'Premium', hub.actor.plan === free ? premium : hub.actor.plan)}
      </div>
    </div>
  );
};

export const CampaignCenter: React.FC<{
  hub: Hub;
  nav: CampaignNav | null;
  onNav: (n: CampaignNav) => void;
  onCreate: () => void;
  onEdit: (v: OwnerCampaignView) => void;
}> = ({ hub, nav, onNav, onCreate, onEdit }) => {
  const sections = campaignSectionsFor(hub);
  const active = nav && sections.includes(nav.section) ? nav.section : sections[0];
  const kind = campaignKindFor(hub.actor);
  const canCreate = !!kind && campaignPermission(hub.actor, kind).allowed;
  const unread = inboxFor(hub.store, hub.actor).filter((i) => !i.viewed).length;
  const account = creditAccount(hub.store, hub.actor);
  const ws = hub.actor.workspace;
  const detail = active === 'campaigns' && nav?.id ? ownerCampaigns(hub.store, hub.actor).find((v) => v.campaign.id === nav.id) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 leading-tight">{ws.kind === 'personal_buyer' ? 'Campaign Inbox' : 'Campaign Center'}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {ws.kind === 'soko_admin' ? (
              'Review campaigns for relevance and handle spam reports'
            ) : (
              <>
                {ws.companyName ?? ws.displayName} · <span className="font-semibold text-slate-700">{PLANS[hub.actor.plan].label}</span>
                {canCreate && (
                  <>
                    {' '}
                    · <Coins className="inline w-3.5 h-3.5 -mt-0.5 text-gold-600" /> <span className="tabular-nums font-semibold text-slate-700">{account.available}</span> credits
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(ws.kind === 'contractor' || ws.kind === 'supplier') && <DemoPlanToggle hub={hub} />}
          {canCreate && (
            <button type="button" onClick={onCreate} className={btnPrimary}>
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          )}
        </div>
      </div>

      {sections.length > 1 && (
        <nav aria-label="Campaign Center" className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {sections.map((s) => {
            const { label, icon: Icon } = SECTION_META[s];
            const on = s === active;
            return (
              <button
                key={s}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => onNav({ section: s })}
                className={`relative shrink-0 inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${on ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {s === 'inbox' && unread > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold leading-5 text-center tabular-nums" aria-label={`${unread} unread`}>
                    {unread}
                  </span>
                )}
                {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-700" />}
              </button>
            );
          })}
        </nav>
      )}

      {!canCreate && ws.kind === 'personal_buyer' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gold-200 bg-gold-50/60 px-4 py-3">
          <Crown className="hidden sm:block w-4 h-4 shrink-0 text-gold-700" />
          <p className="flex-1 text-sm text-slate-700 leading-relaxed">
            You receive relevant sourcing requirements and supplier offers here, and can post free opportunities from Explore. Publishing company campaigns requires an authorised premium company workspace.
          </p>
          {hub.switchWorkspace && (
            <button type="button" onClick={() => hub.switchWorkspace!('contractor')} className={`${btnSecondary} shrink-0`}>
              View a premium company (demo)
            </button>
          )}
        </div>
      )}
      {!canCreate && (ws.kind === 'contractor' || ws.kind === 'supplier') && active === 'inbox' && <UpgradeCallout hub={hub} onCompare={() => onNav({ section: 'plans', compare: true })} />}

      <div key={`${active}_${nav?.id ?? ''}`} className="animate-[fadeIn_0.2s_ease-out]">
        {active === 'dashboard' && <CampaignDashboard hub={hub} canCreate={canCreate} onCreate={onCreate} onNav={onNav} />}
        {active === 'inbox' && <CampaignInbox key={nav?.id ?? 'inbox'} hub={hub} initialOpen={nav?.id} />}
        {active === 'campaigns' &&
          (detail ? (
            <CampaignDetail
              hub={hub}
              view={detail}
              focusResponses={nav?.focus === 'responses'}
              onBack={() => onNav({ section: 'campaigns' })}
              onEdit={() => onEdit(detail)}
            />
          ) : (
            <MyCampaigns hub={hub} canCreate={canCreate} onCreate={onCreate} onNav={onNav} />
          ))}
        {active === 'plans' && <CampaignPlans hub={hub} showComparison={!!nav?.compare} />}
        {active === 'moderation' && <CampaignModeration hub={hub} />}
      </div>

      {active !== 'moderation' && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5" />
          Prototype: campaign delivery, credits and SOKO review are simulated. No emails, messages or payments are sent.
        </p>
      )}
    </div>
  );
};
