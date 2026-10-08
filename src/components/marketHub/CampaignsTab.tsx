import React from 'react';
import { Crown, Lock } from 'lucide-react';
import { PLANS } from '../../data/marketHubCatalog';
import { campaignKindFor, campaignPermission, inboxFor } from '../../data/marketHubService';
import { OwnerCampaignView } from '../../data/marketHubTypes';
import { btnPrimary } from '../NetworkShared';
import { CampaignDashboard } from './CampaignDashboard';
import { CampaignInbox } from './CampaignInbox';
import { CampaignModeration } from './CampaignModeration';
import { CampaignPlans } from './CampaignPlans';
import { Hub, SubTabs } from './MarketHubShared';

export type CampaignSection = 'dashboard' | 'inbox' | 'plans' | 'moderation';

export const campaignSectionsFor = (hub: Hub): CampaignSection[] => {
  const kind = hub.actor.workspace.kind;
  if (kind === 'soko_admin') return ['moderation'];
  if (kind === 'personal_buyer') return ['inbox', 'plans'];
  return ['dashboard', 'inbox', 'plans'];
};

const LABEL: Record<CampaignSection, string> = { dashboard: 'Campaign Dashboard', inbox: 'Campaign Inbox', plans: 'Plans & Credits', moderation: 'Moderation' };

export const CampaignsTab: React.FC<{
  hub: Hub;
  section: CampaignSection;
  onSection: (s: CampaignSection) => void;
  openId: string | null;
  onOpen: (id: string | null) => void;
  onCreate: () => void;
  onEdit: (v: OwnerCampaignView) => void;
}> = ({ hub, section, onSection, openId, onOpen, onCreate, onEdit }) => {
  const sections = campaignSectionsFor(hub);
  const active = sections.includes(section) ? section : sections[0];
  const kind = campaignKindFor(hub.actor);
  const perm = kind ? campaignPermission(hub.actor, kind) : { allowed: false };
  const unread = inboxFor(hub.store, hub.actor).filter((i) => !i.viewed).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-900 text-white px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold-300">
            <Crown className="w-3.5 h-3.5" />
            Premium Campaigns
          </p>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
            {hub.actor.workspace.kind === 'contractor'
              ? 'Send one sourcing requirement to every relevant registered supplier, then manage responses in one place.'
              : hub.actor.workspace.kind === 'supplier'
                ? 'Reach opted-in buyers who follow your categories with targeted, moderated offers.'
                : hub.actor.workspace.kind === 'soko_admin'
                  ? 'Review campaigns for relevance, handle spam reports and keep the network trusted.'
                  : 'Relevant sourcing requirements and supplier offers delivered to your Campaign Inbox, never to the Home Feed.'}
          </p>
        </div>
        {kind && (
          <span className="shrink-0 text-xs text-slate-400">
            {hub.actor.workspace.companyName} · <span className="text-white font-semibold">{PLANS[hub.actor.plan].label}</span>
          </span>
        )}
      </div>

      {sections.length > 1 && (
        <SubTabs
          value={active}
          onChange={(s) => {
            onOpen(null);
            onSection(s);
          }}
          tabs={sections.map((s) => ({ id: s, label: LABEL[s], count: s === 'inbox' && unread ? unread : undefined }))}
        />
      )}

      <div key={active} className="animate-[fadeIn_0.2s_ease-out]">
        {active === 'dashboard' &&
          (perm.allowed || hub.actor.entitlements.campaignAnalytics ? (
            <CampaignDashboard hub={hub} onCreate={onCreate} onEdit={onEdit} openId={openId} onOpen={onOpen} />
          ) : (
            <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-6 max-w-2xl">
              <span className="w-10 h-10 rounded-xl bg-white border border-gold-200 text-gold-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </span>
              <h2 className="mt-3 text-base font-semibold text-slate-900">Campaigns are a premium feature</h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{perm.reason}</p>
              <button type="button" onClick={() => onSection('plans')} className={`${btnPrimary} mt-4`}>
                View plans
              </button>
            </div>
          ))}
        {active === 'inbox' && <CampaignInbox hub={hub} />}
        {active === 'plans' && <CampaignPlans hub={hub} />}
        {active === 'moderation' && <CampaignModeration hub={hub} />}
      </div>
    </div>
  );
};
