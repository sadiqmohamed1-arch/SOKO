import React from 'react';
import { Info } from 'lucide-react';
import { Actor, CampaignStatus, InterestStatus, MarketHubStore, OpportunityView, OwnerCampaignView, ServiceResult } from '../../data/marketHubTypes';
import { StatusPill } from '../NetworkShared';

export type Tone = 'blue' | 'slate' | 'amber' | 'gold';

export interface Hub {
  store: MarketHubStore;
  actor: Actor;
  run: <T>(result: ServiceResult<T>, success?: string | ((value: T) => string)) => boolean;
  notify: (message: string) => void;
  askAi: (query: string) => void;
  openSupplier: (supplierId: string) => void;
  switchWorkspace?: (role: 'buyer' | 'contractor' | 'supplier' | 'admin') => void;
}

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtMonth = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—');

export const daysAgo = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
};

export const INTEREST_LABEL: Record<InterestStatus, { label: string; tone: Tone }> = {
  interested: { label: 'Interested', tone: 'blue' },
  under_review: { label: 'Under Review', tone: 'amber' },
  connection_requested: { label: 'Connection Requested', tone: 'amber' },
  connected: { label: 'Connected', tone: 'blue' },
  declined: { label: 'Not progressed', tone: 'slate' },
};

export const opportunityStatus = (o: OpportunityView): { label: string; tone: Tone } =>
  o.status === 'closed' ? { label: 'Closed', tone: 'slate' } : o.myInterest ? INTEREST_LABEL[o.myInterest.status] : { label: 'Open', tone: 'blue' };

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: Tone | 'green' | 'red' }> = {
  draft: { label: 'Draft', tone: 'slate' },
  pending_review: { label: 'Pending Review', tone: 'amber' },
  approved: { label: 'Approved', tone: 'blue' },
  scheduled: { label: 'Scheduled', tone: 'blue' },
  active: { label: 'Active', tone: 'green' },
  paused: { label: 'Paused', tone: 'amber' },
  completed: { label: 'Completed', tone: 'slate' },
  rejected: { label: 'Rejected', tone: 'red' },
  suspended: { label: 'Suspended', tone: 'red' },
};

export const campaignLocation = (c: OwnerCampaignView['campaign']) => {
  const emirates = (c.kind === 'sourcing' ? c.supplierAudience?.emirates : c.buyerAudience?.emirates) ?? [];
  if (c.kind === 'sourcing' && c.deliveryLocation) return emirates.length ? `${c.deliveryLocation} · suppliers in ${emirates.join(', ')}` : c.deliveryLocation;
  return emirates.length ? emirates.join(', ') : 'All emirates';
};

export const CampaignStatusPill: React.FC<{ status: CampaignStatus }> = ({ status }) => {
  const s = CAMPAIGN_STATUS[status];
  if (s.tone === 'green')
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200">{s.label}</span>;
  if (s.tone === 'red')
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap bg-red-50 text-red-700 border-red-200">{s.label}</span>;
  return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
};

export const UrgencyPill: React.FC<{ urgency: OpportunityView['urgency'] }> = ({ urgency }) =>
  urgency === 'standard' ? null : (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${
        urgency === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'
      }`}
    >
      {urgency === 'urgent' ? 'Urgent' : 'High urgency'}
    </span>
  );

export const PremiumBadge: React.FC<{ label?: string }> = ({ label = 'Premium' }) => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-gold-300 bg-gold-50 text-[10px] font-semibold uppercase tracking-wide text-gold-900">{label}</span>
);

export const DemoNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
    <Info className="w-3.5 h-3.5 mt-px shrink-0 text-slate-400" />
    <span>{children}</span>
  </p>
);

export const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) =>
  value ? (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 break-words">{value}</dd>
    </div>
  ) : null;

export const ChipToggle: React.FC<{ options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number }> = ({ options, value, onChange, max }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => {
      const on = value.includes(o);
      const disabled = !on && max !== undefined && value.length >= max;
      return (
        <button
          key={o}
          type="button"
          disabled={disabled}
          aria-pressed={on}
          onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
          className={`px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            on ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          {o}
        </button>
      );
    })}
  </div>
);

export const KpiCard: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
    {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
  </div>
);

export const ProgressRow: React.FC<{ label: string; value: number; of: number; tone?: 'blue' | 'gold' | 'green' | 'slate' }> = ({ label, value, of, tone = 'blue' }) => {
  const pct = of ? Math.min(100, Math.round((value / of) * 100)) : 0;
  const bar = { blue: 'bg-blue-600', gold: 'bg-gold-500', green: 'bg-emerald-600', slate: 'bg-slate-400' }[tone];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          <span className="font-semibold text-slate-900">{value}</span> · {pct}%
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${bar} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }> = ({ icon, title, text, action }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
    <div className="mx-auto w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">{icon}</div>
    <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
    <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{text}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const SubTabs = <T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void }) => (
  <div className="flex gap-1 overflow-x-auto p-1 rounded-xl bg-slate-100 w-fit max-w-full">
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => onChange(t.id)}
        className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
          value === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        {t.label}
        {t.count !== undefined && (
          <span className={`min-w-5 px-1.5 rounded-full text-[10px] leading-4 text-center tabular-nums ${value === t.id ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>{t.count}</span>
        )}
      </button>
    ))}
  </div>
);
