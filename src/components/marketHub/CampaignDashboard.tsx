import React from 'react';
import { ArrowRight, Coins, Megaphone, MessageSquareText, Plus } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { creditAccount, launchesInLast7Days, ownerCampaigns } from '../../data/marketHubService';
import { CampaignStatus, OwnerCampaignView } from '../../data/marketHubTypes';
import { btnPrimary, btnSecondary } from '../NetworkShared';
import { CampaignNav } from './CampaignCenter';
import { CampaignStatusPill, DemoNote, EmptyState, Hub, KpiCard, campaignLocation, daysAgo, fmtDate } from './MarketHubShared';

export const responsesOf = (v: OwnerCampaignView) => (v.campaign.kind === 'sourcing' ? v.metrics.responded : v.disclosedInterests.length);

export const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

const STATUS_GROUPS: { label: string; statuses: CampaignStatus[]; bar: string }[] = [
  { label: 'Active / Paused', statuses: ['active', 'paused'], bar: 'bg-emerald-600' },
  { label: 'Approved / Scheduled', statuses: ['approved', 'scheduled'], bar: 'bg-blue-600' },
  { label: 'Pending Review', statuses: ['pending_review'], bar: 'bg-amber-500' },
  { label: 'Draft', statuses: ['draft'], bar: 'bg-slate-400' },
  { label: 'Completed', statuses: ['completed'], bar: 'bg-slate-700' },
  { label: 'Rejected / Suspended', statuses: ['rejected', 'suspended'], bar: 'bg-red-500' },
];

const Panel: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, action, children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
    <div className="flex items-center justify-between gap-2 mb-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const LinkBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="group inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
    {children}
    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
  </button>
);

export const CampaignDashboard: React.FC<{ hub: Hub; canCreate: boolean; onCreate: () => void; onNav: (n: CampaignNav) => void }> = ({ hub, canCreate, onCreate, onNav }) => {
  const views = ownerCampaigns(hub.store, hub.actor);
  const account = creditAccount(hub.store, hub.actor);
  const launches = launchesInLast7Days(hub.store, hub.actor.workspace.id);
  const sourcing = hub.actor.workspace.kind === 'contractor';

  if (!views.length)
    return (
      <EmptyState
        icon={<Megaphone className="w-5 h-5" />}
        title="Your Campaign Dashboard is ready"
        text={`You have ${account.available} demo credits. Create your first ${sourcing ? 'sourcing' : 'promotional'} campaign to reach relevant SOKO members through their Campaign Inbox. Performance appears here once it launches.`}
        action={
          canCreate ? (
            <button type="button" onClick={onCreate} className={btnPrimary}>
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          ) : undefined
        }
      />
    );

  const sum = (f: (v: OwnerCampaignView) => number) => views.reduce((n, v) => n + f(v), 0);
  const delivered = sum((v) => v.metrics.delivered);
  const responses = sum(responsesOf);
  const viewed = sum((v) => v.metrics.viewed);
  const paused = views.filter((v) => v.campaign.status === 'paused').length;
  const launched = views.filter((v) => v.campaign.launchedAt).sort((a, b) => b.campaign.launchedAt!.localeCompare(a.campaign.launchedAt!));
  const chartData = launched.slice(0, 5).map((v) => ({
    name: v.campaign.title.length > 22 ? `${v.campaign.title.slice(0, 21)}…` : v.campaign.title,
    Delivered: v.metrics.delivered,
    Viewed: v.metrics.viewed,
    Interested: v.metrics.interested,
    Responses: responsesOf(v),
  }));
  const recent = [...views].sort((a, b) => (b.campaign.launchedAt ?? b.campaign.createdAt).localeCompare(a.campaign.launchedAt ?? a.campaign.createdAt)).slice(0, 5);
  const recentResponses = sourcing
    ? views
        .flatMap((v) => v.campaign.responses.map((r) => ({ id: r.id, campaignId: v.campaign.id, campaign: v.campaign.title, company: r.companyName, detail: `${r.category} · ${r.location}`, at: r.at, shortlisted: r.shortlisted })))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 5)
    : views
        .flatMap((v) => v.disclosedInterests.map((d, i) => ({ id: `${v.campaign.id}_${i}`, campaignId: v.campaign.id, campaign: v.campaign.title, company: d.companyName, detail: 'Interested, shared identity', at: d.at, shortlisted: false })))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 5);
  const anyDemo = views.some((v) => v.metrics.includesDemoValues);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-900 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-white">{sourcing ? 'Reach relevant suppliers for your next requirement' : 'Promote your products to relevant buyers and companies'}</p>
          <p className="mt-0.5 text-xs text-slate-300">
            {sourcing ? 'Sourcing campaigns are delivered to matching suppliers\u2019 Campaign Inbox after SOKO review.' : 'Promotional campaigns reach opted-in buyers following your categories, after SOKO review.'}
          </p>
        </div>
        {canCreate && (
          <button type="button" onClick={onCreate} className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-10 px-4 rounded-lg bg-gold-500 hover:bg-gold-300 text-slate-900 text-sm font-semibold transition-colors cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Total Campaigns" value={views.length} />
        <KpiCard label="Active Campaigns" value={views.filter((v) => v.campaign.status === 'active').length} hint={paused ? `${paused} paused` : undefined} />
        <KpiCard label="Delivered" value={delivered} hint="Campaign Inboxes reached" />
        <KpiCard label="Viewed" value={viewed} hint={`${pct(viewed, delivered)}% of delivered`} />
        <KpiCard label="Responses Received" value={responses} hint={sourcing ? `${pct(responses, delivered)}% · responses ÷ delivered` : 'Buyers who shared identity'} />
        <KpiCard label="Interested Recipients" value={sum((v) => v.metrics.interested)} hint="Mostly anonymous" />
        <KpiCard label="Available Credits" value={account.available} hint={`${account.used} used · demo`} />
      </div>
      {anyDemo && <DemoNote>Simulated: figures include labelled demo values for sample campaigns (for example, {sourcing ? 'Waterproofing Material Requirement' : 'the ProSeal membrane launch'}). They do not represent real campaign performance.</DemoNote>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Campaign Performance" className="lg:col-span-2" action={launched.length ? <LinkBtn onClick={() => onNav({ section: 'campaigns', id: launched[0].campaign.id })}>Latest campaign</LinkBtn> : undefined}>
          {chartData.length ? (
            <div className="h-64 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Delivered" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Viewed" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Interested" fill="#c8a951" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Responses" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Performance appears once a campaign is launched.</p>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Campaign Status">
            <ul className="space-y-2.5">
              {STATUS_GROUPS.map((g) => {
                const n = views.filter((v) => g.statuses.includes(v.campaign.status)).length;
                return (
                  <li key={g.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{g.label}</span>
                      <span className="tabular-nums font-semibold text-slate-900">{n}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${g.bar} transition-[width] duration-700`} style={{ width: `${pct(n, views.length)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Available Credits" action={<LinkBtn onClick={() => onNav({ section: 'plans' })}>Plans & Credits</LinkBtn>}>
            <p className="flex items-baseline gap-2">
              <Coins className="w-5 h-5 text-gold-600 self-center" />
              <span className="text-2xl font-semibold text-slate-900 tabular-nums">{account.available}</span>
              <span className="text-xs text-slate-500">{account.used} used this month</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {launches} of {hub.actor.entitlements.maxLaunchesPer7Days} launches used in the last 7 days · demo credits
            </p>
            {canCreate && (
              <button type="button" onClick={onCreate} className={`${btnPrimary} mt-4 w-full`}>
                <Plus className="w-4 h-4" />
                Create Campaign
              </button>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Recent Campaigns" action={<LinkBtn onClick={() => onNav({ section: 'campaigns' })}>All campaigns</LinkBtn>}>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-y border-slate-100 bg-slate-50">
                <th className="px-5 py-2">Campaign</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2 text-right">Sent</th>
                <th className="px-3 py-2 text-right">Viewed</th>
                <th className="px-3 py-2 text-right">Responses</th>
                <th className="px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((v) => (
                <tr key={v.campaign.id} onClick={() => onNav({ section: 'campaigns', id: v.campaign.id })} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-5 py-2.5 min-w-[220px]">
                    <button type="button" className="text-left font-semibold text-slate-900 hover:text-blue-700 cursor-pointer">
                      {v.campaign.title}
                    </button>
                    <span className="block text-[11px] text-slate-500">
                      {v.campaign.category} · {v.campaign.launchedAt ? `Launched ${fmtDate(v.campaign.launchedAt)}` : `Created ${fmtDate(v.campaign.createdAt)}`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{campaignLocation(v.campaign)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{v.campaign.launchedAt ? v.metrics.delivered : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{v.campaign.launchedAt ? v.metrics.viewed : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{v.campaign.launchedAt ? responsesOf(v) : '—'}</td>
                  <td className="px-5 py-2.5">
                    <CampaignStatusPill status={v.campaign.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4">
        <Panel title={sourcing ? 'Recent Supplier Responses' : 'Recent Buyer Interest'}>
          {recentResponses.length ? (
            <ul className="-mx-2 divide-y divide-slate-100">
              {recentResponses.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onNav({ section: 'campaigns', id: r.campaignId, focus: 'responses' })}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                      <MessageSquareText className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 truncate">{r.company}</span>
                      <span className="block text-xs text-slate-500 truncate">
                        {r.campaign} · {r.detail}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{r.shortlisted ? <span className="font-semibold text-gold-700">Shortlisted</span> : daysAgo(r.at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{sourcing ? 'Supplier responses to your sourcing campaigns appear here.' : 'Buyers who express interest and choose to share their identity appear here.'}</p>
          )}
        </Panel>
      </div>
      {!canCreate && (
        <p className="text-xs text-slate-500">
          Your current plan can view existing campaigns but cannot launch new ones.{' '}
          <button type="button" onClick={() => onNav({ section: 'plans' })} className={`${btnSecondary} !min-h-0 !px-2 !py-0.5 text-xs`}>
            View plans
          </button>
        </p>
      )}
    </div>
  );
};
