import React from 'react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

/* ============================================================
 * SOKO Design System 2.0 — Design Tokens
 * Centralized color, spacing, radius, and shadow tokens.
 * Used by all SOKO 2.0 presentation components.
 * ============================================================ */

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
    card: 'rounded-2xl',       // 16px
    cardLg: 'rounded-[18px]',  // 18px
    button: 'rounded-xl',      // 12px
    pill: 'rounded-full',
  },
  shadow: {
    card: 'shadow-[0_1px_3px_rgba(17,24,39,0.06),0_1px_2px_rgba(17,24,39,0.04)]',
    cardHover: 'shadow-[0_4px_12px_rgba(17,24,39,0.08),0_2px_4px_rgba(17,24,39,0.04)]',
    elevated: 'shadow-[0_8px_24px_rgba(17,24,39,0.10),0_4px_8px_rgba(17,24,39,0.04)]',
  },
} as const;

/* ============================================================
 * SokoPageHeader
 * Section A: Workspace identity + greeting (NOT dark navy banner)
 * ============================================================ */

export interface SokoPageHeaderProps {
  companyName: string;
  companyInitials: string;
  logoTone: string;
  greeting: string;
  userName: string;
  dateLabel: string;
  verificationBadge?: React.ReactNode;
  planBadge?: React.ReactNode;
}

export const SokoPageHeader: React.FC<SokoPageHeaderProps> = ({
  companyName,
  companyInitials,
  logoTone,
  greeting,
  userName,
  dateLabel,
  verificationBadge,
  planBadge,
}) => (
  <header className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
    <div className={`${logoTone} w-14 h-14 rounded-2xl text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm`}>
      {companyInitials}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{companyName}</h1>
        {verificationBadge}
        {planBadge}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        <span className="font-semibold text-slate-700">{greeting}, {userName}</span> · {dateLabel}
      </p>
    </div>
  </header>
);

/* ============================================================
 * SokoMetricCard
 * Section B: KPI cards (6 metrics)
 * ============================================================ */

export type MetricTone = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gold';

const metricToneStyles: Record<MetricTone, { iconBg: string; iconText: string; accent: string }> = {
  blue:   { iconBg: 'bg-blue-50',   iconText: 'text-blue-600',   accent: 'text-blue-600' },
  green:  { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', accent: 'text-emerald-600' },
  amber:  { iconBg: 'bg-amber-50',  iconText: 'text-amber-600',  accent: 'text-amber-600' },
  red:    { iconBg: 'bg-rose-50',   iconText: 'text-rose-600',   accent: 'text-rose-600' },
  purple: { iconBg: 'bg-violet-50', iconText: 'text-violet-600', accent: 'text-violet-600' },
  gold:   { iconBg: 'bg-amber-50',  iconText: 'text-amber-700',  accent: 'text-amber-700' },
};

export interface SokoMetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: MetricTone;
  sublabel?: string;
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  onClick?: () => void;
}

export const SokoMetricCard: React.FC<SokoMetricCardProps> = ({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  sublabel,
  trend,
  onClick,
}) => {
  const ts = metricToneStyles[tone];
  const trendColor = trend?.direction === 'up' ? 'text-emerald-600' : trend?.direction === 'down' ? 'text-rose-600' : 'text-slate-400';
  return (
    <div
      onClick={onClick}
      className={`${sokoTokens.radius.card} ${sokoTokens.shadow.card} bg-white border border-slate-200/80 p-5 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(17,24,39,0.08)]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`${ts.iconBg} ${ts.iconText} w-10 h-10 rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold ${trendColor}`}>{trend.value}</span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
};

/* ============================================================
 * SokoSectionCard
 * Generic container for dashboard sections C-H
 * ============================================================ */

export interface SokoSectionCardProps {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const SokoSectionCard: React.FC<SokoSectionCardProps> = ({
  title,
  icon: Icon,
  action,
  children,
  className = '',
  noPadding = false,
}) => (
  <section className={`${sokoTokens.radius.card} ${sokoTokens.shadow.card} bg-white border border-slate-200/80 ${className}`}>
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
        <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className={noPadding ? '' : 'px-5 pb-5'}>{children}</div>
  </section>
);

/* ============================================================
 * SokoActionButton
 * Quick actions and CTA buttons
 * ============================================================ */

export type SokoButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface SokoActionButtonProps {
  label: string;
  icon?: LucideIcon;
  variant?: SokoButtonVariant;
  onClick?: () => void;
  fullWidth?: boolean;
}

export const SokoActionButton: React.FC<SokoActionButtonProps> = ({
  label,
  icon: Icon,
  variant = 'secondary',
  onClick,
  fullWidth = false,
}) => {
  const base = `${sokoTokens.radius.button} inline-flex items-center gap-2 text-sm font-semibold transition-all duration-200 cursor-pointer min-h-10 px-4 ${fullWidth ? 'w-full justify-center' : ''}`;
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    ghost: 'text-blue-600 hover:bg-blue-50',
  };
  return (
    <button type="button" onClick={onClick} className={`${base} ${variants[variant]}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
};

/* ============================================================
 * SokoStatusIndicator
 * Status pills for compliance, verification, etc.
 * ============================================================ */

export type SokoStatusTone = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

const statusToneStyles: Record<SokoStatusTone, { bg: string; text: string; border: string; dot: string }> = {
  success:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  warning:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  critical: { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
  info:     { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  neutral:  { bg: 'bg-slate-100',  text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-400' },
};

export interface SokoStatusIndicatorProps {
  label: string;
  tone: SokoStatusTone;
  dot?: boolean;
}

export const SokoStatusIndicator: React.FC<SokoStatusIndicatorProps> = ({ label, tone, dot = true }) => {
  const s = statusToneStyles[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 ${sokoTokens.radius.button} ${s.bg} ${s.text} ${s.border} border text-xs font-semibold`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      {label}
    </span>
  );
};

/* ============================================================
 * SokoEmptyState
 * Empty placeholder for sections with no data
 * ============================================================ */

export interface SokoEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SokoEmptyState: React.FC<SokoEmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-8 px-4">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
      <Icon className="w-6 h-6 text-slate-400" />
    </div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {description && <p className="mt-1 text-xs text-slate-500 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/* ============================================================
 * SokoActivityItem
 * Recent activity feed rows
 * ============================================================ */

export interface SokoActivityItemData {
  id: string;
  icon: LucideIcon;
  iconTone: MetricTone;
  title: string;
  detail?: string;
  timestamp: string;
}

export const SokoActivityItem: React.FC<SokoActivityItemData> = ({ icon: Icon, iconTone, title, detail, timestamp }) => {
  const ts = metricToneStyles[iconTone];
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`${ts.iconBg} ${ts.iconText} w-8 h-8 rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800 leading-snug">{title}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
      <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">{timestamp}</span>
    </div>
  );
};

/* ============================================================
 * SokoChartContainer
 * Lightweight bar chart container for Vendor Network etc.
 * ============================================================ */

export interface SokoBarDatum {
  label: string;
  value: number;
  tone?: MetricTone;
}

const barToneColors: Record<MetricTone, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  purple: 'bg-violet-500',
  gold: 'bg-amber-600',
};

export const SokoBarChart: React.FC<{ data: SokoBarDatum[]; maxValue?: number; unit?: string }> = ({ data, maxValue, unit }) => {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-slate-600 w-28 sm:w-32 truncate shrink-0">{d.label}</span>
          <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
            <div
              className={`h-full ${barToneColors[d.tone ?? 'blue']} rounded-lg transition-all duration-500 ease-out flex items-center justify-end pr-1.5`}
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
            >
              {d.value > 0 && (
                <span className="text-[10px] font-bold text-white tabular-nums">
                  {d.value}{unit ?? ''}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ============================================================
 * SokoLinkAction
 * "View all" link used in section card headers
 * ============================================================ */

export const SokoLinkAction: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
  >
    {label}
    <ArrowUpRight className="w-3.5 h-3.5" />
  </button>
);
