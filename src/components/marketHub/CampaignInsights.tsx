import React from 'react';
import { CheckCircle2, FilePen, Flag, Pause, Rocket, Send, ShieldCheck, Star } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { OwnerCampaignView } from '../../data/marketHubTypes';
import { pct, responsesOf } from './CampaignDashboard';
import { fmtDate } from './MarketHubShared';

const DAY = 86_400_000;

export const InsightCard: React.FC<{ title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }> = ({ title, children, className = '', action }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
    <div className="flex items-center justify-between gap-2 mb-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

export const Breakdown: React.FC<{ rows: [string, number][]; empty: string }> = ({ rows, empty }) => {
  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <ul className="space-y-2.5">
      {rows.map(([label, n]) => (
        <li key={label} className="grid grid-cols-[120px_1fr_28px] items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700 truncate" title={label}>
            {label}
          </span>
          <span className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <span className="block h-full rounded-full bg-blue-600 transition-[width] duration-700" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums font-semibold text-slate-900">{n}</span>
        </li>
      ))}
    </ul>
  );
};

export const tally = (values: string[]): [string, number][] =>
  Object.entries(values.reduce<Record<string, number>>((m, v) => ({ ...m, [v]: (m[v] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

export const Funnel: React.FC<{ v: OwnerCampaignView }> = ({ v }) => {
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
    <>
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
      <p className="mt-3 text-[11px] text-slate-400">Percentages after each step are conversion from the previous step.</p>
    </>
  );
};

export const ActivityTimeline: React.FC<{ v: OwnerCampaignView }> = ({ v }) => {
  const { campaign: c, metrics: m } = v;
  const sourcing = c.kind === 'sourcing';
  const series = sourcing ? 'Responses' : 'Shared identity';
  const start = new Date(c.launchedAt ?? c.createdAt);
  start.setHours(0, 0, 0, 0);
  const end = c.closedAt ? new Date(c.closedAt) : new Date();
  const days = Math.min(30, Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY)));
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getTime() + i * DAY);
    const same = (iso: string) => new Date(iso).toDateString() === d.toDateString();
    return {
      day: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      [series]: sourcing ? c.responses.filter((r) => same(r.at)).length : v.disclosedInterests.filter((x) => same(x.at)).length,
    };
  });

  const milestones = [
    { at: c.createdAt, label: 'Draft created', icon: FilePen },
    c.submittedAt && { at: c.submittedAt, label: 'Submitted for SOKO review', icon: Send },
    c.reviewedAt && { at: c.reviewedAt, label: c.status === 'rejected' ? 'Rejected by SOKO review' : 'Approved by SOKO review', icon: ShieldCheck },
    c.launchedAt && { at: c.launchedAt, label: `Delivered to ${m.delivered} Campaign Inboxes (simulated)`, icon: Rocket },
    sourcing && c.responses.length && { at: [...c.responses].sort((a, b) => a.at.localeCompare(b.at))[0].at, label: 'First supplier response received', icon: CheckCircle2 },
    sourcing && m.shortlisted && { at: c.responses.filter((r) => r.shortlisted).sort((a, b) => b.at.localeCompare(a.at))[0].at, label: `${m.shortlisted} suppliers shortlisted`, icon: Star },
    c.status === 'paused' && { at: new Date().toISOString(), label: 'Paused by your team', icon: Pause },
    c.closedAt && { at: c.closedAt, label: c.status === 'suspended' ? 'Suspended by SOKO moderation' : 'Campaign closed', icon: Flag },
  ]
    .filter((x): x is { at: string; label: string; icon: typeof Flag } => !!x)
    .sort((a, b) => a.at.localeCompare(b.at));

  return (
    <>
      {c.launchedAt && (
        <div className="h-36 -ml-4 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={12} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey={series} fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
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
    </>
  );
};
