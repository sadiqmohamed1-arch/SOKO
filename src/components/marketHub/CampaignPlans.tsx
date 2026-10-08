import React, { useState } from 'react';
import { Check, Coins, Crown, Lock } from 'lucide-react';
import { PLANS, UPGRADE_PATHS } from '../../data/marketHubCatalog';
import { activateDemoPlan, creditAccount, ownerCampaigns } from '../../data/marketHubService';
import { PlanId } from '../../data/marketHubTypes';
import { ProfileDialog } from '../ProfileDialog';
import { btnPrimary, btnSecondary } from '../NetworkShared';
import { Hub, KpiCard } from './MarketHubShared';

export const CampaignPlans: React.FC<{ hub: Hub }> = ({ hub }) => {
  const [preview, setPreview] = useState<PlanId | null>(null);
  const { workspace: ws, plan } = hub.actor;
  const paths = UPGRADE_PATHS[ws.kind];
  const account = creditAccount(hub.store, hub.actor);
  const pendingCredits = ownerCampaigns(hub.store, hub.actor)
    .filter((v) => ['draft', 'pending_review', 'approved', 'scheduled'].includes(v.campaign.status))
    .reduce((n, v) => n + v.campaign.creditsRequired, 0);

  if (!paths.length)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-2xl">
        <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </span>
        <h2 className="mt-3 text-base font-semibold text-slate-900">{ws.kind === 'personal_buyer' ? 'Campaigns are published by company workspaces' : 'Platform workspace'}</h2>
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
          {ws.kind === 'personal_buyer'
            ? `Your Personal Buyer workspace (${PLANS[plan].label}) can browse, post free opportunities and receive relevant campaigns. To publish sourcing or promotional campaigns, switch to a company workspace where you are an authorised campaign user. Personal accounts cannot act on behalf of a company.`
            : 'SOKO administrators moderate campaigns and do not hold a subscription.'}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-700">
          {PLANS[plan].features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {f}
            </li>
          ))}
        </ul>
        {ws.kind === 'personal_buyer' && hub.switchWorkspace && (
          <button type="button" onClick={() => hub.switchWorkspace!('contractor')} className={`${btnSecondary} mt-4`}>
            Switch to Apex Industrial Mechanical GC (demo)
          </button>
        )}
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Current plan" value={<span className="text-base">{PLANS[plan].label}</span>} />
        <KpiCard label="Available credits" value={account.available} hint="Demo credits" />
        <KpiCard label="Credits used" value={account.used} hint="This month" />
        <KpiCard label="Credits required" value={pendingCredits} hint="Drafts and campaigns awaiting launch" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {paths.map((id) => {
          const p = PLANS[id];
          const current = id === plan;
          const premium = p.entitlements.monthlyCredits > 0;
          return (
            <article key={id} className={`relative flex flex-col rounded-2xl border p-5 bg-white transition-shadow ${current ? 'border-blue-600 ring-2 ring-blue-600/15' : premium ? 'border-gold-300 hover:shadow-md' : 'border-slate-200'}`}>
              {premium && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-gold-300 text-[10px] font-semibold uppercase tracking-wide">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              )}
              <h3 className="text-base font-semibold text-slate-900">{p.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{p.tagline}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-700">
                <Coins className="w-4 h-4 text-gold-600" />
                {p.entitlements.monthlyCredits ? `${p.entitlements.monthlyCredits} credits / month · ${p.entitlements.maxLaunchesPer7Days} launches / week` : 'No campaign credits'}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" disabled={current} onClick={() => setPreview(id)} className={`${current ? btnSecondary : premium ? btnPrimary : btnSecondary} mt-4 w-full`}>
                {current ? 'Current plan' : premium ? 'Preview upgrade' : 'Switch to this plan'}
              </button>
            </article>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">Prototype: plans and credits are simulated. No payment is taken.</p>

      {preview && (
        <ProfileDialog
          title={`Upgrade preview: ${PLANS[preview].label}`}
          subtitle={ws.companyName}
          onClose={() => setPreview(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPreview(null)} className={btnSecondary}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  hub.run(activateDemoPlan(hub.store, hub.actor, preview), `${PLANS[preview].label} activated for ${ws.companyName} (demo, no payment)`);
                  setPreview(null);
                }}
                className={btnPrimary}
              >
                Activate demo plan
              </button>
            </div>
          }
        >
          <div className="px-5 py-4 space-y-3 text-sm text-slate-700">
            <p>This would unlock for {ws.companyName}:</p>
            <ul className="space-y-1">
              {PLANS[preview].features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
              No payment gateway is connected. Activating applies the plan's demo credits and permissions so you can test the workflow.
            </p>
          </div>
        </ProfileDialog>
      )}
    </div>
  );
};
