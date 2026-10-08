import React from 'react';
import { ChartColumn, Coins, Crown, Inbox, Info, LayoutDashboard, ListChecks, Plus, ShieldCheck, WalletCards } from 'lucide-react';
import { PLANS } from '../../data/marketHubCatalog';
import { campaignKindFor, campaignPermission, creditAccount, inboxFor, ownerCampaigns } from '../../data/marketHubService';
import { OwnerCampaignView } from '../../data/marketHubTypes';
import { btnPrimary } from '../NetworkShared';
import { CampaignAnalytics } from './CampaignAnalytics';
import { CampaignDashboard } from './CampaignDashboard';
import { CampaignDetail } from './CampaignDetail';
import { CampaignInbox } from './CampaignInbox';
import { CampaignModeration } from './CampaignModeration';
import { CampaignPlans } from './CampaignPlans';
import { Hub } from './MarketHubShared';
import { MyCampaigns } from './MyCampaigns';

export type CampaignSection = 'dashboard' | 'inbox' | 'campaigns' | 'analytics' | 'plans' | 'moderation';

export interface CampaignNav {
  section: CampaignSection;
  id?: string | null;
  focus?: 'responses';
  compare?: boolean;
}

const SECTION_META: Record<CampaignSection, { label: string; icon: typeof Inbox }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  inbox: { label: 'Inbox', icon: Inbox },
  campaigns: { label: 'My Campaigns', icon: ListChecks },
  analytics: { label: 'Analytics', icon: ChartColumn },
  plans: { label: 'Plans & Credits', icon: WalletCards },
  moderation: { label: 'Moderation', icon: ShieldCheck },
};

export const campaignSectionsFor = (hub: Hub): CampaignSection[] => {
  const kind = campaignKindFor(hub.actor);
  if (hub.actor.workspace.kind === 'soko_admin') return ['moderation'];
  if (kind && campaignPermission(hub.actor, kind).allowed) return ['dashboard', 'inbox', 'campaigns', 'analytics', 'plans'];
  return ['inbox', 'plans'];
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
          <h2 className="text-lg font-semibold text-slate-900 leading-tight">Campaign Center</h2>
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
        {canCreate && (
          <button type="button" onClick={onCreate} className={btnPrimary}>
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        )}
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

      {!canCreate && ws.kind !== 'soko_admin' && active === 'inbox' && (
        <div className="flex items-start gap-3 rounded-xl border border-gold-200 bg-gold-50/60 px-4 py-3">
          <Crown className="w-4 h-4 mt-0.5 shrink-0 text-gold-700" />
          <p className="text-sm text-slate-700 leading-relaxed">
            {ws.kind === 'personal_buyer'
              ? 'You receive relevant sourcing requirements and supplier offers here. Publishing campaigns requires an authorised premium company workspace.'
              : `${PLANS[hub.actor.plan].label} receives relevant campaigns here. Publishing campaigns requires a premium plan.`}{' '}
            <button type="button" onClick={() => onNav({ section: 'plans', compare: ws.kind !== 'personal_buyer' })} className="font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
              {ws.kind === 'personal_buyer' ? 'Learn more' : 'Preview upgrade'}
            </button>
          </p>
        </div>
      )}

      <div key={`${active}_${nav?.id ?? ''}`} className="animate-[fadeIn_0.2s_ease-out]">
        {active === 'dashboard' && <CampaignDashboard hub={hub} canCreate={canCreate} onCreate={onCreate} onNav={onNav} />}
        {active === 'inbox' && <CampaignInbox hub={hub} />}
        {active === 'campaigns' &&
          (detail ? (
            <CampaignDetail
              hub={hub}
              view={detail}
              focusResponses={nav?.focus === 'responses'}
              onBack={() => onNav({ section: 'campaigns' })}
              onEdit={() => onEdit(detail)}
              onAnalytics={() => onNav({ section: 'analytics', id: detail.campaign.id })}
            />
          ) : (
            <MyCampaigns hub={hub} canCreate={canCreate} onCreate={onCreate} onNav={onNav} />
          ))}
        {active === 'analytics' && <CampaignAnalytics hub={hub} selectedId={nav?.id} onNav={onNav} />}
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
