import React from 'react';
import { ArrowUpRight, Bookmark, type LucideIcon } from 'lucide-react';

export const sokoTokens = {
  radius: { card: 'rounded-2xl', control: 'rounded-xl', pill: 'rounded-full' },
  shadow: {
    card: 'shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
    raised: 'shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.12)]',
  },
  border: 'border border-slate-200/80',
  focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  eyebrow: 'font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-slate-500',
} as const;

export type MetricTone = 'blue' | 'blueMid' | 'blueSoft' | 'navy' | 'sky' | 'green' | 'amber' | 'red' | 'slate';

const toneStyles: Record<MetricTone, { soft: string; text: string; bar: string; dot: string; border: string }> = {
  blue:  { soft: 'bg-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-600',    dot: 'bg-blue-600',    border: 'border-blue-500' },
  blueMid:  { soft: 'bg-blue-50', text: 'text-blue-700',    bar: 'bg-blue-400',    dot: 'bg-blue-400',    border: 'border-blue-400' },
  blueSoft: { soft: 'bg-blue-50', text: 'text-blue-600',    bar: 'bg-blue-200',    dot: 'bg-blue-200',    border: 'border-blue-200' },
  navy:  { soft: 'bg-slate-100',  text: 'text-slate-800',   bar: 'bg-slate-800',   dot: 'bg-slate-800',   border: 'border-slate-800' },
  sky:   { soft: 'bg-sky-50',     text: 'text-sky-700',     bar: 'bg-sky-300',     dot: 'bg-sky-400',     border: 'border-sky-300' },
  green: { soft: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', dot: 'bg-emerald-500', border: 'border-emerald-500' },
  amber: { soft: 'bg-amber-50',   text: 'text-amber-800',   bar: 'bg-amber-400',   dot: 'bg-amber-500',   border: 'border-amber-400' },
  red:   { soft: 'bg-rose-50',    text: 'text-rose-700',    bar: 'bg-rose-500',    dot: 'bg-rose-500',    border: 'border-rose-500' },
  slate: { soft: 'bg-slate-100',  text: 'text-slate-600',   bar: 'bg-slate-300',   dot: 'bg-slate-400',   border: 'border-slate-300' },
};

export const sokoTone = (tone: MetricTone) => toneStyles[tone];

export const sokoCard = `${sokoTokens.radius.card} ${sokoTokens.border} ${sokoTokens.shadow.card} bg-white`;

export const initialsOf = (name: string) =>
  name.replace(/\b(LLC|L\.L\.C\.?|FZE|PJSC|Co\.?)\b/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export const SokoEyebrow: React.FC<{ children: React.ReactNode; aside?: React.ReactNode; className?: string }> = ({ children, aside, className = '' }) => (
  <div className={`flex items-center justify-between gap-3 ${className}`}>
    <p className={sokoTokens.eyebrow}>{children}</p>
    {aside && <span className="text-[11px] text-slate-500 text-right">{aside}</span>}
  </div>
);

export const SokoPanelLink: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" onClick={onClick} className={`${sokoTokens.focus} inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-700 transition-colors cursor-pointer whitespace-nowrap`}>
    {label}
    <ArrowUpRight className="w-3.5 h-3.5" />
  </button>
);

export interface SokoPanelProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}

export const SokoPanel: React.FC<SokoPanelProps> = ({ title, subtitle, icon: Icon, action, children, className = '', flush = false }) => (
  <section className={`${sokoCard} flex flex-col overflow-hidden ${className}`}>
    <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
      <div className="flex items-start gap-3 min-w-0">
        <span className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 -mr-1.5">{action}</div>}
    </header>
    <div className={`flex-1 ${flush ? '' : 'px-5 pb-5'}`}>{children}</div>
  </section>
);

export const SokoChip: React.FC<{ icon?: LucideIcon; children: React.ReactNode; tone?: 'neutral' | 'blue' | 'mono' }> = ({ icon: Icon, children, tone = 'neutral' }) => {
  const styles = {
    neutral: 'border-slate-200 bg-white text-slate-600',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    mono: 'border-slate-200 bg-white text-slate-500 font-mono text-[10.5px]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-medium ${styles[tone]}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
};

export type SokoStatusTone = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

const statusStyles: Record<SokoStatusTone, { bg: string; text: string; dot: string }> = {
  success:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning:  { bg: 'bg-amber-50',   text: 'text-amber-800',   dot: 'bg-amber-500' },
  critical: { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500' },
  info:     { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  neutral:  { bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400' },
};

export const SokoStatusIndicator: React.FC<{ label: string; tone: SokoStatusTone }> = ({ label, tone }) => {
  const s = statusStyles[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 h-5 px-2 rounded-full ${s.bg} ${s.text} text-[11px] font-medium whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
};

export interface SokoQuickActionTileProps {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
  shortcut?: string;
}

export const SokoQuickActionTile: React.FC<SokoQuickActionTileProps> = ({ label, description, icon: Icon, onClick, primary, shortcut }) => (
  <button
    type="button"
    onClick={onClick}
    aria-keyshortcuts={shortcut}
    className={`${sokoTokens.focus} group flex items-center gap-3 w-full min-h-[60px] px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${
      primary
        ? 'bg-blue-600 text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.7)] hover:bg-blue-700'
        : 'bg-white/90 border border-slate-200 text-slate-900 hover:border-blue-300 hover:shadow-sm'
    }`}
  >
    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${primary ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-600'}`}>
      <Icon className="w-4 h-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] font-semibold leading-tight truncate">{label}</span>
      <span className={`block mt-0.5 text-[11px] truncate ${primary ? 'text-blue-100' : 'text-slate-500'}`}>{description}</span>
    </span>
    {shortcut && (
      <kbd className={`hidden sm:inline-flex h-5 min-w-5 px-1 items-center justify-center rounded border font-mono text-[10px] shrink-0 ${
        primary ? 'border-white/30 text-white/90' : 'border-slate-200 text-slate-500'
      }`}>{shortcut}</kbd>
    )}
  </button>
);

export interface SokoKpiCellProps {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  delta?: { label: string; tone: 'up' | 'down' | 'warn'; title?: string };
  visual?: React.ReactNode;
  onClick?: () => void;
}

const deltaStyles = {
  up: 'bg-emerald-50 text-emerald-700',
  down: 'bg-rose-50 text-rose-700',
  warn: 'bg-amber-50 text-amber-700',
};

export const SokoKpiCell: React.FC<SokoKpiCellProps> = ({ label, value, detail, delta, visual, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${sokoTokens.focus} focus-visible:ring-offset-0 group w-full text-left px-6 sm:px-8 py-5 flex items-end justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer`}
  >
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 flex items-center gap-2">
        <span className="text-[28px] font-semibold text-slate-900 leading-none tabular-nums tracking-tight">{value}</span>
        {delta && (
          <span title={delta.title} className={`inline-flex h-5 items-center px-1.5 rounded-md font-mono text-[10.5px] font-medium tabular-nums ${deltaStyles[delta.tone]}`}>
            {delta.label}
            {delta.title && <span className="sr-only"> {delta.title}</span>}
          </span>
        )}
      </p>
      {detail && <p className="mt-2 text-[11px] text-slate-500 truncate">{detail}</p>}
    </div>
    {visual && <div className="w-24 lg:w-28 shrink-0">{visual}</div>}
  </button>
);

export const SokoProgress: React.FC<{ value: number; tone?: MetricTone; className?: string }> = ({ value, tone = 'blue', className = 'w-20' }) => (
  <div className={`h-1.5 rounded-full bg-slate-100 overflow-hidden ${className}`} role="presentation">
    <div className={`h-full rounded-full ${toneStyles[tone].bar} transition-all duration-500`} style={{ width: `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%` }} />
  </div>
);

export interface SokoTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export function SokoTabs<T extends string>({ tabs, active, onChange, label, variant = 'segmented' }: {
  tabs: SokoTab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
  variant?: 'segmented' | 'underline';
}) {
  if (variant === 'underline') {
    return (
      <div role="tablist" aria-label={label} className="flex gap-5 border-b border-slate-200">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.id)}
              className={`${sokoTokens.focus} relative -mb-px pb-2 text-xs transition-colors cursor-pointer whitespace-nowrap ${on ? 'text-slate-900 font-semibold' : 'text-slate-500 font-medium hover:text-slate-800'}`}>
              {t.label}
              {t.count !== undefined && <span className="ml-1 text-slate-400 tabular-nums">{t.count}</span>}
              {on && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="tablist" aria-label={label} className="grid grid-flow-col auto-cols-fr p-1 rounded-xl bg-slate-100">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.id)}
            className={`${sokoTokens.focus} px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${on ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'text-slate-500 font-medium hover:text-slate-800'}`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className={`ml-1 tabular-nums ${on ? 'text-blue-600' : 'text-slate-400'}`}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const SokoAvatar: React.FC<{ name: string; tone?: 'dark' | 'light'; size?: 'sm' | 'md' }> = ({ name, tone = 'light', size = 'md' }) => (
  <span aria-hidden className={`${size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-[11px]'} rounded-full font-semibold flex items-center justify-center shrink-0 ${
    tone === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
  }`}>
    {initialsOf(name)}
  </span>
);

export interface SokoTimelineItemProps {
  actor: string;
  children: React.ReactNode;
  tag: string;
  timestamp: string;
  last?: boolean;
  onClick?: () => void;
}

export const SokoTimelineItem: React.FC<SokoTimelineItemProps> = ({ actor, children, tag, timestamp, last, onClick }) => (
  <li className="relative pl-11">
    {!last && <span aria-hidden className="absolute left-[15px] top-10 bottom-0 w-px bg-slate-200" />}
    <span className="absolute left-0 top-2.5"><SokoAvatar name={actor} tone="dark" /></span>
    <button type="button" onClick={onClick} disabled={!onClick}
      className={`${sokoTokens.focus} w-full text-left py-2.5 px-2 -mx-2 rounded-lg transition-colors ${onClick ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}>
      <p className="text-[13px] text-slate-700 leading-snug">{children}</p>
      <p className="mt-1.5 flex items-center gap-2">
        <span className="inline-flex h-5 items-center px-1.5 rounded-md border border-slate-200 bg-white text-[10.5px] font-medium text-slate-600">{tag}</span>
        <time className="font-mono text-[10.5px] text-slate-400">{timestamp}</time>
      </p>
    </button>
  </li>
);

export interface SokoProductCardProps {
  name: string;
  supplier: string;
  category: string;
  spec?: string;
  imageUrl?: string;
  placeholderIcon: LucideIcon;
  saved?: boolean;
  onClick: () => void;
}

export const SokoProductCard: React.FC<SokoProductCardProps> = ({ name, supplier, category, spec, imageUrl, placeholderIcon: Icon, saved, onClick }) => (
  <button type="button" onClick={onClick}
    className={`${sokoTokens.focus} group w-full text-left rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer`}>
    <div className="relative h-36 bg-slate-50 border-b border-slate-100">
      {imageUrl
        ? <img src={imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center"><Icon className="w-7 h-7 text-slate-300" /></div>}
      <span className="absolute top-2 left-2 max-w-[70%] truncate rounded-md bg-white/90 backdrop-blur px-1.5 py-0.5 font-mono text-[10px] text-slate-600 border border-slate-200/70">{category}</span>
      {saved && (
        <span className="absolute top-2 right-2 w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center" aria-label="Saved">
          <Bookmark className="w-3 h-3 fill-current" />
        </span>
      )}
    </div>
    <div className="px-3 py-2.5">
      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{name}</p>
      <p className="text-[11px] text-slate-500 truncate">{supplier}</p>
      {spec && <p className="mt-1.5 font-mono text-[10.5px] text-slate-400 truncate">{spec}</p>}
    </div>
  </button>
);

export interface SokoEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SokoEmptyState: React.FC<SokoEmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-6 px-4">
    <span className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-slate-400" />
    </span>
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {description && <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
