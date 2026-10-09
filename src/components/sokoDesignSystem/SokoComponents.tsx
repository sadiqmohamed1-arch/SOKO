import React from 'react';
import { ArrowUpRight, ChevronRight, type LucideIcon } from 'lucide-react';

export const sokoTokens = {
  color: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    bg: '#F5F7FB',
    card: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    border: '#E6EBF2',
    verifiedGreen: '#16A34A',
    premiumGold: '#D6A64A',
    warningAmber: '#F59E0B',
    criticalRed: '#EF4444',
  },
  radius: { card: 'rounded-2xl', button: 'rounded-xl', pill: 'rounded-full' },
  shadow: {
    card: 'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_2px_6px_rgba(15,23,42,0.04)]',
    cardHover: 'hover:shadow-[0_8px_24px_rgba(15,23,42,0.08),0_2px_4px_rgba(15,23,42,0.04)]',
  },
  border: 'border border-[#E6EBF2]',
  headerSurface: 'bg-gradient-to-br from-blue-50 via-white to-sky-50/60',
  focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
} as const;

export type MetricTone = 'blue' | 'sky' | 'green' | 'amber' | 'red' | 'slate' | 'gold';

const toneStyles: Record<MetricTone, { soft: string; text: string; bar: string; ring: string }> = {
  blue:  { soft: 'bg-blue-50',    text: 'text-blue-600',    bar: 'bg-blue-600',    ring: 'ring-blue-100' },
  sky:   { soft: 'bg-sky-50',     text: 'text-sky-600',     bar: 'bg-sky-400',     ring: 'ring-sky-100' },
  green: { soft: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', ring: 'ring-emerald-100' },
  amber: { soft: 'bg-amber-50',   text: 'text-amber-600',   bar: 'bg-amber-400',   ring: 'ring-amber-100' },
  red:   { soft: 'bg-rose-50',    text: 'text-rose-600',    bar: 'bg-rose-500',    ring: 'ring-rose-100' },
  slate: { soft: 'bg-slate-100',  text: 'text-slate-600',   bar: 'bg-slate-300',   ring: 'ring-slate-200' },
  gold:  { soft: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-[#D6A64A]',   ring: 'ring-amber-100' },
};

export const sokoTone = (tone: MetricTone) => toneStyles[tone];

const cardBase = `${sokoTokens.radius.card} ${sokoTokens.shadow.card} ${sokoTokens.border} bg-white`;

export interface SokoWorkspaceHeaderProps {
  companyName: string;
  companyInitials: string;
  logoTone: string;
  workspaceType: string;
  workspaceId: string;
  greeting: string;
  userName: string;
  dateLabel: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
}

export const SokoWorkspaceHeader: React.FC<SokoWorkspaceHeaderProps> = ({ companyName, companyInitials, logoTone, workspaceType, workspaceId, greeting, userName, dateLabel, badges, actions }) => (
  <header className={`${sokoTokens.radius.card} ${sokoTokens.border} ${sokoTokens.headerSurface} relative overflow-hidden px-5 py-5 sm:px-6`}>
    <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-100/50 blur-3xl" />
    <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className={`${logoTone} w-14 h-14 rounded-2xl text-white font-semibold text-lg flex items-center justify-center shrink-0 ring-4 ring-white shadow-sm`} aria-hidden>
          {companyInitials}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-600">
            {greeting}, <span className="font-semibold text-slate-900">{userName}</span>
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight leading-tight">{companyName}</h1>
            {badges}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{workspaceType}</span> workspace · {workspaceId} · {dateLabel}
          </p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  </header>
);

export interface SokoMetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: MetricTone;
  sublabel?: string;
  emphasis?: 'primary' | 'supporting';
  footer?: React.ReactNode;
  onClick?: () => void;
}

export const SokoMetricCard: React.FC<SokoMetricCardProps> = ({ label, value, icon: Icon, tone = 'blue', sublabel, emphasis = 'primary', footer, onClick }) => {
  const ts = toneStyles[tone];
  const interactive = onClick ? `cursor-pointer hover:-translate-y-0.5 ${sokoTokens.shadow.cardHover} ${sokoTokens.focus}` : '';
  if (emphasis === 'supporting') {
    return (
      <button type="button" onClick={onClick} className={`${cardBase} ${interactive} w-full text-left flex items-center gap-3 px-4 py-3.5 transition-all duration-200 group`}>
        <div className={`${ts.soft} ${ts.text} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          <p className="text-xl font-semibold text-slate-900 tabular-nums leading-tight">{value}</p>
        </div>
        {sublabel && <span className="text-[11px] text-slate-500 text-right shrink-0 max-w-[45%] truncate">{sublabel}</span>}
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${cardBase} ${interactive} w-full text-left p-5 transition-all duration-200 group flex flex-col`}>
      <div className="flex items-center gap-3">
        <div className={`${ts.soft} ${ts.text} ring-4 ${ts.ring} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-slate-600 flex-1">{label}</p>
        {onClick && <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />}
      </div>
      <p className="mt-4 text-4xl font-semibold text-slate-900 tabular-nums leading-none tracking-tight">{value}</p>
      {sublabel && <p className="mt-2 text-xs text-slate-500">{sublabel}</p>}
      {footer && <div className="mt-4 pt-3 border-t border-slate-100">{footer}</div>}
    </button>
  );
};

export interface SokoSectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SokoSectionCard: React.FC<SokoSectionCardProps> = ({ title, subtitle, icon: Icon, action, children, className = '' }) => (
  <section className={`${cardBase} flex flex-col ${className}`}>
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px]" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900 leading-tight truncate">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className="px-5 pb-5 flex-1">{children}</div>
  </section>
);

export const SokoStatTile: React.FC<{ label: string; value: number | string; tone?: MetricTone }> = ({ label, value, tone = 'slate' }) => {
  const ts = toneStyles[tone];
  return (
    <div className={`${ts.soft} rounded-xl px-3 py-2.5`}>
      <p className={`text-xl font-semibold tabular-nums leading-tight ${tone === 'slate' ? 'text-slate-900' : ts.text}`}>{value}</p>
      <p className="text-[11px] text-slate-600 mt-0.5 truncate">{label}</p>
    </div>
  );
};

export const SokoSubheading: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
  <div className="flex items-center justify-between gap-2 mb-2.5">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</p>
    {aside && <span className="text-[11px] text-slate-500">{aside}</span>}
  </div>
);

export type SokoButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface SokoActionButtonProps {
  label: string;
  icon?: LucideIcon;
  variant?: SokoButtonVariant;
  onClick?: () => void;
  fullWidth?: boolean;
}

export const SokoActionButton: React.FC<SokoActionButtonProps> = ({ label, icon: Icon, variant = 'secondary', onClick, fullWidth = false }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    ghost: 'text-blue-600 hover:bg-blue-50',
  };
  return (
    <button type="button" onClick={onClick} className={`${sokoTokens.radius.button} ${sokoTokens.focus} inline-flex items-center gap-2 text-sm font-semibold transition-all duration-200 cursor-pointer min-h-10 px-4 ${fullWidth ? 'w-full justify-center' : ''} ${variants[variant]}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
};

export interface SokoQuickActionProps {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

export const SokoQuickAction: React.FC<SokoQuickActionProps> = ({ label, description, icon: Icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${sokoTokens.focus} group w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white text-left hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-200 cursor-pointer`}
  >
    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-slate-900 truncate">{label}</p>
      <p className="text-xs text-slate-500 truncate">{description}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
  </button>
);

export interface SokoActionRowProps {
  label: string;
  description: string;
  count: number;
  icon: LucideIcon;
  tone: MetricTone;
  onClick: () => void;
}

export const SokoActionRow: React.FC<SokoActionRowProps> = ({ label, description, count, icon: Icon, tone, onClick }) => {
  const ts = toneStyles[count > 0 ? tone : 'slate'];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${sokoTokens.focus} group w-full flex items-center gap-3 px-2 py-2.5 -mx-2 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer`}
    >
      <div className={`${ts.soft} ${ts.text} w-8 h-8 rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 truncate">{label}</p>
        <p className="text-[11px] text-slate-500 truncate">{description}</p>
      </div>
      <span className={`min-w-[28px] h-6 px-2 rounded-full text-xs font-semibold tabular-nums flex items-center justify-center ${count > 0 ? `${ts.soft} ${ts.text}` : 'bg-slate-100 text-slate-400'}`}>
        {count}
      </span>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
    </button>
  );
};

export type SokoStatusTone = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

const statusToneStyles: Record<SokoStatusTone, { bg: string; text: string; dot: string }> = {
  success:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning:  { bg: 'bg-amber-50',   text: 'text-amber-800',   dot: 'bg-amber-500' },
  critical: { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500' },
  info:     { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  neutral:  { bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400' },
};

export const SokoStatusIndicator: React.FC<{ label: string; tone: SokoStatusTone }> = ({ label, tone }) => {
  const s = statusToneStyles[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${s.bg} ${s.text} text-[11px] font-semibold whitespace-nowrap capitalize`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
};

export interface SokoEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SokoEmptyState: React.FC<SokoEmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-6 px-4">
    <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-slate-400" />
    </div>
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {description && <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export interface SokoTimelineItemProps {
  icon: LucideIcon;
  tone: MetricTone;
  title: string;
  record: string;
  author: string;
  timestamp: string;
  last?: boolean;
  onClick?: () => void;
}

export const SokoTimelineItem: React.FC<SokoTimelineItemProps> = ({ icon: Icon, tone, title, record, author, timestamp, last, onClick }) => {
  const ts = toneStyles[tone];
  return (
    <li className="relative pl-11">
      {!last && <span aria-hidden className="absolute left-[15px] top-9 bottom-0 w-px bg-slate-200" />}
      <span className={`absolute left-0 top-2 w-8 h-8 rounded-full ${ts.soft} ${ts.text} ring-4 ring-white flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={`${sokoTokens.focus} w-full flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-lg text-left transition-colors ${onClick ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 leading-snug">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            <span className="font-medium text-slate-600">{record}</span> · {author}
          </p>
        </div>
        <time className="text-[11px] font-medium text-slate-400 shrink-0 whitespace-nowrap pt-0.5">{timestamp}</time>
      </button>
    </li>
  );
};

export interface SokoBarDatum {
  label: string;
  value: number;
  tone?: MetricTone;
}

export const SokoBarChart: React.FC<{ data: SokoBarDatum[]; total: number; unit: string }> = ({ data, total, unit }) => {
  const scale = Math.max(total, 1);
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = Math.round((d.value / scale) * 100);
        return (
          <li key={d.label}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium text-slate-700 truncate">{d.label}</span>
              <span className="text-xs text-slate-500 tabular-nums shrink-0">
                <span className="font-semibold text-slate-900">{d.value}</span> {unit} · {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="presentation">
              <div className={`h-full rounded-full ${toneStyles[d.tone ?? 'blue'].bar} transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export interface SokoSegment {
  label: string;
  value: number;
  tone: MetricTone;
}

export const SokoSegmentBar: React.FC<{ segments: SokoSegment[]; size?: 'sm' | 'md'; legend?: 'inline' | 'list' }> = ({ segments, size = 'md', legend = 'inline' }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <div className={`flex ${size === 'sm' ? 'h-1.5' : 'h-2.5'} rounded-full overflow-hidden bg-slate-100 gap-0.5`} role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        {total > 0 && segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className={`${toneStyles[s.tone].bar} h-full transition-all duration-500`} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      {legend === 'inline' ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {segments.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span className={`w-2 h-2 rounded-full ${toneStyles[s.tone].bar}`} />
              {s.label} <span className="font-semibold text-slate-900 tabular-nums">{s.value}</span>
            </span>
          ))}
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-2 text-slate-600">
                <span className={`w-2 h-2 rounded-full ${toneStyles[s.tone].bar}`} />
                {s.label}
              </span>
              <span className={`font-semibold tabular-nums ${s.value > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{s.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export interface SokoTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export function SokoTabs<T extends string>({ tabs, active, onChange, label }: { tabs: SokoTab<T>[]; active: T; onChange: (id: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex p-1 rounded-xl bg-slate-100 gap-0.5">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`${sokoTokens.focus} px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
            {t.count !== undefined && <span className={`ml-1.5 tabular-nums ${on ? 'text-blue-600' : 'text-slate-400'}`}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export interface SokoProductRowProps {
  name: string;
  supplier: string;
  category: string;
  imageUrl?: string;
  placeholderIcon: LucideIcon;
  meta?: string;
  onClick: () => void;
}

export const SokoProductRow: React.FC<SokoProductRowProps> = ({ name, supplier, category, imageUrl, placeholderIcon: Icon, meta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${sokoTokens.focus} group w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer`}
  >
    {imageUrl ? (
      <img src={imageUrl} alt="" loading="lazy" className="w-12 h-12 rounded-xl object-cover bg-slate-100 ring-1 ring-slate-100 shrink-0" />
    ) : (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 ring-1 ring-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
    )}
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-700 transition-colors">{name}</p>
      <p className="text-xs text-slate-500 truncate">{supplier}</p>
      <p className="mt-0.5 text-[11px] text-slate-400 truncate">{category}{meta ? ` · ${meta}` : ''}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
  </button>
);

export const SokoLinkAction: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${sokoTokens.focus} inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer`}
  >
    {label}
    <ArrowUpRight className="w-3.5 h-3.5" />
  </button>
);
