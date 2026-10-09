import React from 'react';
import { ArrowUpRight, ChevronRight, type LucideIcon } from 'lucide-react';

export const sokoTokens = {
  color: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    bg: '#F5F7FB',
    card: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#64748B',
    border: '#E5EAF1',
    verifiedGreen: '#16A34A',
    premiumGold: '#D6A64A',
    warningAmber: '#F59E0B',
    criticalRed: '#EF4444',
    softBlue: '#EFF6FF',
    softGreen: '#F0FDF4',
    softAmber: '#FFFBEB',
    softRed: '#FEF2F2',
    softPurple: '#F5F3FF',
  },
  radius: {
    card: 'rounded-2xl',
    button: 'rounded-xl',
    pill: 'rounded-full',
  },
  shadow: {
    card: 'shadow-[0_1px_2px_rgba(17,24,39,0.04),0_1px_3px_rgba(17,24,39,0.05)]',
    cardHover: 'hover:shadow-[0_6px_16px_rgba(17,24,39,0.07),0_2px_4px_rgba(17,24,39,0.04)]',
  },
  border: 'border border-[#E5EAF1]',
  focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
} as const;

export type MetricTone = 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'gold';

const toneStyles: Record<MetricTone, { soft: string; text: string; bar: string; accent: string }> = {
  blue:  { soft: 'bg-blue-50',    text: 'text-blue-600',    bar: 'bg-blue-500',    accent: 'bg-blue-500' },
  green: { soft: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', accent: 'bg-emerald-500' },
  amber: { soft: 'bg-amber-50',   text: 'text-amber-600',   bar: 'bg-amber-500',   accent: 'bg-amber-500' },
  red:   { soft: 'bg-rose-50',    text: 'text-rose-600',    bar: 'bg-rose-500',    accent: 'bg-rose-500' },
  slate: { soft: 'bg-slate-100',  text: 'text-slate-600',   bar: 'bg-slate-400',   accent: 'bg-slate-400' },
  gold:  { soft: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-[#D6A64A]',   accent: 'bg-[#D6A64A]' },
};

const cardBase = `${sokoTokens.radius.card} ${sokoTokens.shadow.card} ${sokoTokens.border} bg-white`;

export interface SokoPageHeaderProps {
  companyName: string;
  companyInitials: string;
  logoTone: string;
  workspaceLabel: string;
  greeting: string;
  userName: string;
  dateLabel: string;
  badges?: React.ReactNode;
}

export const SokoPageHeader: React.FC<SokoPageHeaderProps> = ({ companyName, companyInitials, logoTone, workspaceLabel, greeting, userName, dateLabel, badges }) => (
  <header className="flex flex-col sm:flex-row sm:items-center gap-4">
    <div className={`${logoTone} w-12 h-12 rounded-xl text-white font-semibold text-base flex items-center justify-center shrink-0`} aria-hidden>
      {companyInitials}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{workspaceLabel}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight leading-tight">{companyName}</h1>
        {badges}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {greeting}, <span className="font-medium text-slate-700">{userName}</span> · {dateLabel}
      </p>
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
  onClick?: () => void;
}

export const SokoMetricCard: React.FC<SokoMetricCardProps> = ({ label, value, icon: Icon, tone = 'blue', sublabel, emphasis = 'primary', onClick }) => {
  const ts = toneStyles[tone];
  const interactive = onClick ? `cursor-pointer hover:border-slate-300 ${sokoTokens.shadow.cardHover} ${sokoTokens.focus}` : '';
  if (emphasis === 'supporting') {
    return (
      <button type="button" onClick={onClick} className={`${cardBase} ${interactive} w-full text-left flex items-center gap-3 px-4 py-3 transition-all duration-200 group`}>
        <div className={`${ts.soft} ${ts.text} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 truncate">{label}</p>
          <p className="text-lg font-semibold text-slate-900 tabular-nums leading-tight">{value}</p>
        </div>
        {sublabel && <span className="text-[11px] text-slate-500 text-right shrink-0 max-w-[45%] truncate">{sublabel}</span>}
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${cardBase} ${interactive} relative overflow-hidden w-full text-left p-5 transition-all duration-200 group`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${ts.accent}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <div className={`${ts.soft} ${ts.text} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums leading-none">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        {sublabel && <p className="text-xs text-slate-500 truncate">{sublabel}</p>}
        {onClick && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />}
      </div>
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
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
      <div className="flex items-start gap-2.5 min-w-0">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-slate-500" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 leading-8 truncate">{title}</h2>
          {subtitle && <p className="-mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 pt-1.5">{action}</div>}
    </div>
    <div className="px-5 pb-5 flex-1">{children}</div>
  </section>
);

export const SokoStatTile: React.FC<{ label: string; value: number | string; tone?: MetricTone }> = ({ label, value, tone = 'slate' }) => {
  const ts = toneStyles[tone];
  return (
    <div className={`${ts.soft} rounded-xl px-3 py-2.5`}>
      <p className={`text-lg font-semibold tabular-nums leading-tight ${tone === 'slate' ? 'text-slate-900' : ts.text}`}>{value}</p>
      <p className="text-[11px] text-slate-600 mt-0.5 truncate">{label}</p>
    </div>
  );
};

export const SokoSubheading: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
  <div className="flex items-center justify-between gap-2 mb-2">
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
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
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
    className={`${sokoTokens.focus} group w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white text-left hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer`}
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
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${s.bg} ${s.text} text-[11px] font-semibold whitespace-nowrap capitalize`}>
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
    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-slate-400" />
    </div>
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {description && <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export interface SokoActivityItemData {
  id: string;
  icon: LucideIcon;
  iconTone: MetricTone;
  title: string;
  record: string;
  author: string;
  timestamp: string;
  onClick?: () => void;
}

export const SokoActivityItem: React.FC<SokoActivityItemData> = ({ icon: Icon, iconTone, title, record, author, timestamp, onClick }) => {
  const ts = toneStyles[iconTone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${sokoTokens.focus} w-full flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg text-left transition-colors ${onClick ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`${ts.soft} ${ts.text} w-8 h-8 rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 leading-snug">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          <span className="text-slate-600">{record}</span> · {author}
        </p>
      </div>
      <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap pt-0.5">{timestamp}</span>
    </button>
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
    <ul className="space-y-2.5">
      {data.map((d) => {
        const pct = Math.round((d.value / scale) * 100);
        return (
          <li key={d.label}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-xs text-slate-700 truncate">{d.label}</span>
              <span className="text-xs text-slate-500 tabular-nums shrink-0">
                <span className="font-semibold text-slate-900">{d.value}</span> {unit} · {pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" role="presentation">
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

export const SokoSegmentBar: React.FC<{ segments: SokoSegment[] }> = ({ segments }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 gap-0.5">
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className={`${toneStyles[s.tone].bar} h-full transition-all duration-500`} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`w-2 h-2 rounded-full ${toneStyles[s.tone].bar}`} />
            {s.label} <span className="font-semibold text-slate-900 tabular-nums">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

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
    className={`${sokoTokens.focus} group w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer`}
  >
    {imageUrl ? (
      <img src={imageUrl} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover bg-slate-100 border border-slate-100 shrink-0" />
    ) : (
      <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-slate-400" />
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
    className={`${sokoTokens.focus} inline-flex items-center gap-0.5 rounded-md text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer`}
  >
    {label}
    <ArrowUpRight className="w-3.5 h-3.5" />
  </button>
);
