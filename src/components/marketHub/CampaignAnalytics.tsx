import React from 'react';
import { CheckCircle2, ChartColumn, FilePen, Flag, Rocket, Send, ShieldCheck, Star } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ownerCampaigns } from '../../data/marketHubService';
import { OwnerCampaignView } from '../../data/marketHubTypes';
import { CampaignNav } from './CampaignCenter';
import { pct, responsesOf } from './CampaignDashboard';
import { CampaignStatusPill, DemoNote, EmptyState, Hub, KpiCard, fmtDate } from './MarketHubShared';

const DAY = 86_400_000;

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
    <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>
    {children}
  </section>
);

const Breakdown: React.FC<{ rows: [string, number][]; empty: string }> = ({ rows, empty }) => {
  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <ul className="space-y-2.5">
      {rows.map(([label, n]) => (
        <li key={label} className="grid grid-cols-[120px_1fr_28px] items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700 truncate">{label}</span>
          <span className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <span className="block h-full rounded-full bg-blue-600 transition-[width] duration-700" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums font-semibold text-slate-900">{n}</span>
        </li>
      ))}
    </ul>
  );
};

const tally = (values: string[]): [string, number][] =>
  Object.entries(values.reduce<Record<string, number>>((m, v) => ({ ...m, [v]: (m[v] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

const Funnel: React.FC<{ v: OwnerCampaignView }> = ({ v }) => {
  const m = v.metrics;
  const sourcing = v.campaign.kind === 'sourcing';
  const steps = [
    { label: 'Eligible audience', n: m.eligible, bar: 'bg-slate-300' },
    { label: 'Delivered', n: m.delivered, bar: 'bg-slate-500' },
    { label: 'Viewed', n: m.viewed, bar: 'bg-blue-600' },
    { label: 'Interested', n: m.interested, bar: 'bg-gold-500' },
    sourcing ? { label: 'Responded', n: m.responded, bar: 'bg-slate-900' } : { label: 'Shared identity', n: responsesOf(v), bar: 'bg-slate-900' },
    ...(sourcing ? [{ label: 'Shortlisted', n: m.shortlisted, bar: 'bg-emerald-600' }] : []),
  ];
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={s.label} className="grid grid-cols-[110px_1fr_88px] items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700">{s.label}</span>
          <span className="h-7 rounded-md bg-slate-50 overflow-hidden">
            <span className={`block h-full rounded-md ${s.bar} transition-[width] duration-700`} style={{ width: `${Math.max(2, pct(s.n, m.eligible))}%` }} />
          </span>
          <span className="text-right tabular-nums">
            <span className="font-semibold text-slate-900">{s.n}</span>
            {i > 0 && <span className="text-slate-400"> · {pct(s.n, steps[i - 1].n)}%</span>}
          </span>
        </li>
      ))}
    </ol>
  );
};

export const CampaignAnalytics: React.FC<{ hub: Hub; selectedId?: string | null; onNav: (n: CampaignNav) => void }> = ({ hub, selectedId, onNav }) => {
  const launched = ownerCampaigns(hub.store, hub.actor)
    .filter((v) => v.campaign.launchedAt)
    .sort((a, b) => b.campaign.launchedAt!.localeCompare(a.campaign.launchedAt!));

  if (!launched.length)
    return <EmptyState icon={<ChartColumn className="w-5 h-5" />} title="No analytics yet" text="Analytics become available once a campaign has been approved by SOKO and launched." />;

  const v = launched.find((x) => x.campaign.id === selectedId) ?? launched[0];
  const { campaign: c, metrics: m } = v;
  const sourcing = c.kind === 'sourcing';
  const responses = responsesOf(v);

  const start = new Date(c.launchedAt!);
  start.setHours(0, 0, 0, 0);
  const end = c.closedAt ? new Date(c.closedAt) : new Date();
  const days = Math.min(30, Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY)));
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getTime() + i * DAY);
    const same = (iso: string) => new Date(iso).toDateString() === d.toDateString();
    return {
      day: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      [sourcing ? 'Responses' : 'Shared identity']: sourcing ? c.responses.filter((r) => same(r.at)).length : v.disclosedInterests.filter((x) => same(x.at)).length,
    };
  });

  const milestones = [
    { at: c.createdAt, label: 'Draft created', icon: FilePen },
    c.submittedAt && { at: c.submittedAt, label: 'Submitted for SOKO review', icon: Send },
    c.reviewedAt && { at: c.reviewedAt, label: c.status === 'rejected' ? 'Rejected by SOKO review' : 'Approved by SOKO review', icon: ShieldCheck },
    { at: c.launchedAt!, label: `Launched to ${m.delivered} Campaign Inboxes`, icon: Rocket },
    sourcing && c.responses.length && { at: [...c.responses].sort((a, b) => a.at.localeCompare(b.at))[0].at, label: 'First supplier response received', icon: CheckCircle2 },
    sourcing && m.shortlisted && { at: c.responses.filter((r) => r.shortlisted).sort((a, b) => b.at.localeCompare(a.at))[0].at, label: `${m.shortlisted} suppliers shortlisted`, icon: Star },
    c.closedAt && { at: c.closedAt, label: c.status === 'suspended' ? 'Suspended by SOKO moderation' : 'Campaign closed', icon: Flag },
  ]
    .filter((x): x is { at: string; label: string; icon: typeof Flag } => !!x)
    .sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Campaign
          <select
            value={c.id}
            onChange={(e) => onNav({ section: 'analytics', id: e.target.value })}
            className="min-h-9 max-w-[320px] pl-2.5 pr-7 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            {launched.map((x) => (
              <option key={x.campaign.id} value={x.campaign.id}>
                {x.campaign.title}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CampaignStatusPill status={c.status} />
          {c.category} · launched {fmtDate(c.launchedAt)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Delivered" value={m.delivered} hint={`of ${m.eligible} eligible`} />
        <KpiCard label="View Rate" value={`${pct(m.viewed, m.delivered)}%`} hint="Viewed ÷ delivered" />
        <KpiCard label="Interest Rate" value={`${pct(m.interested, m.delivered)}%`} hint="Interested ÷ delivered" />
        <KpiCard label="Response Rate" value={`${pct(responses, m.delivered)}%`} hint={sourcing ? 'Responses ÷ delivered' : 'Shared identity ÷ delivered'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Delivery Funnel">
          <Funnel v={v} />
          <p className="mt-3 text-[11px] text-slate-400">Percentages after each step are conversion from the previous step.</p>
        </Card>
        <Card title="Campaign Activity Timeline">
          <div className="h-36 -ml-4 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={12} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey={sourcing ? 'Responses' : 'Shared identity'} fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ol className="relative border-l border-slate-200 ml-2 space-y-3">
            {milestones.map((x, i) => (
              <li key={i} className="pl-5 relative">
                <span className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center">
                  <x.icon className="w-3 h-3" />
                </span>
                <p className="text-sm text-slate-800">{x.label}</p>
                <p className="text-[11px] text-slate-400">{fmtDate(x.at)}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Responses by Category">
          <Breakdown rows={sourcing ? tally(c.responses.map((r) => r.category)) : []} empty={sourcing ? 'No responses yet.' : 'Promotional offers do not collect structured responses. Interest is counted anonymously.'} />
        </Card>
        <Card title="Responses by Location">
          <Breakdown rows={sourcing ? tally(c.responses.map((r) => r.location)) : []} empty={sourcing ? 'No responses yet.' : 'Location breakdowns are available for sourcing campaign responses.'} />
        </Card>
      </div>

      <DemoNote>
        Views are counted only when a recipient opens the campaign in their Campaign Inbox{m.includesDemoValues ? '; this campaign also includes a labelled demo baseline and sample responses that do not represent real performance' : ''}. Individual recipients are never listed.
      </DemoNote>
    </div>
  );
};
