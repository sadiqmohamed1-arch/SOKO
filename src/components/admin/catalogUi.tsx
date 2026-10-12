import React from 'react';
import { Lock, type LucideIcon } from 'lucide-react';
import { UiOnlyTag } from './visitBadges';

export const SectionCard: React.FC<{ title: string; description?: string; source?: React.ReactNode; children: React.ReactNode }> = ({ title, description, source, children }) => (
  <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && <p className="text-xs leading-relaxed text-slate-500 text-pretty">{description}</p>}
      </div>
      {source}
    </header>
    {children}
  </section>
);

export const EmptyState: React.FC<{ icon: LucideIcon; title: string; body?: string; compact?: boolean }> = ({ icon: Icon, title, body, compact }) => (
  <div className={`flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 text-center ${compact ? 'py-6' : 'py-10'}`}>
    <Icon className="h-6 w-6 text-slate-400" aria-hidden="true" />
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {body && <p className="max-w-md text-xs leading-relaxed text-slate-500 text-pretty">{body}</p>}
  </div>
);

export const BarList: React.FC<{ rows: { key: string; label: string; value: number; bar?: string }[]; emptyText: string }> = ({ rows, emptyText }) => {
  if (rows.length === 0) return <p className="text-xs text-slate-500">{emptyText}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-1">
          <span className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-slate-600">{r.label}</span>
            <span className="font-mono font-bold text-slate-900">{r.value}</span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100">
            <span className={`block h-full rounded-full ${r.bar ?? 'bg-blue-600'}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
};

export const FilterSelect: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }> = ({ id, label, value, onChange, children }) => (
  <>
    <label className="sr-only" htmlFor={id}>
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
    >
      {children}
    </select>
  </>
);

export const DisabledAction: React.FC<{ icon: LucideIcon; label: string; description: string; tone?: 'default' | 'danger' }> = ({ icon: Icon, label, description, tone = 'default' }) => (
  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-white text-slate-600'}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-900">
        {label}
        <UiOnlyTag />
      </span>
      <span className="text-[11px] leading-relaxed text-slate-500">{description}</span>
    </div>
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="UI only. Requires a secure backend function."
      className="inline-flex shrink-0 cursor-not-allowed items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-400"
    >
      <Lock className="h-3 w-3" aria-hidden="true" />
      {label}
    </button>
  </div>
);

export const DisabledButton: React.FC<{ icon: LucideIcon; label: string }> = ({ icon: Icon, label }) => (
  <button
    type="button"
    disabled
    aria-disabled="true"
    title="UI only. Requires a secure backend function."
    className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400"
  >
    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    {label}
    <UiOnlyTag />
  </button>
);
