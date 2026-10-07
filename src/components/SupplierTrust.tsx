import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Info, Circle, Globe } from 'lucide-react';
import { BuyerSupplier, STATUS_META, SupplierStatus } from '../data/buyerSuppliers';

const STATUS_STYLE: Record<SupplierStatus, { cls: string; icon: React.ElementType }> = {
  verified: { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  pending: { cls: 'bg-amber-50 text-amber-800 border-amber-200', icon: Clock },
  listed: { cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: Circle },
  'update-required': { cls: 'bg-red-50 text-red-800 border-red-200', icon: AlertTriangle },
};

export const InfoTooltip: React.FC<{ text: React.ReactNode; label: string; align?: 'left' | 'right' }> = ({
  text,
  label,
  align = 'right',
}) => (
  <span className="relative group/info inline-flex align-middle">
    <button type="button" aria-label={label} className="inline-flex text-slate-400 hover:text-slate-600 cursor-help">
      <Info className="w-3.5 h-3.5" />
    </button>
    <span
      role="tooltip"
      className={`pointer-events-none absolute bottom-full mb-1.5 w-64 rounded-md bg-slate-900 px-3 py-2 text-[11px] font-normal leading-snug text-white shadow-lg opacity-0 group-hover/info:opacity-100 group-focus-within/info:opacity-100 transition-opacity z-30 normal-case tracking-normal ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
    >
      {text}
    </span>
  </span>
);

export const INTELLIGENCE_EXPLAINER = (
  <>
    An informational signal based on available supplier documentation, profile completeness, product information,
    verification signals and SOKO network activity.
    <span className="block mt-1 text-gold-300">Not a commercial, technical or legal approval.</span>
  </>
);

export const SupplierStatusBadge: React.FC<{ status: SupplierStatus; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const { cls, icon: Icon } = STATUS_STYLE[status];
  return (
    <span
      title={STATUS_META[status].description}
      className={`inline-flex items-center gap-1 rounded-md border font-semibold whitespace-nowrap ${cls} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {STATUS_META[status].label}
    </span>
  );
};

export const ExternalSourceBadge: React.FC = () => (
  <span
    title="Identified from public or external sources. Not reviewed by SOKO."
    className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 whitespace-nowrap"
  >
    <Globe className="w-3 h-3" />
    External Source Match
  </span>
);

export const IntelligenceValue: React.FC<{ score: number; align?: 'left' | 'right'; large?: boolean }> = ({
  score,
  align,
  large,
}) => (
  <span className="inline-flex items-center gap-1">
    <span className={`font-semibold text-slate-900 ${large ? 'text-base' : 'text-sm'}`}>
      {score}
      <span className="text-slate-400 font-normal"> / 100</span>
    </span>
    <InfoTooltip text={INTELLIGENCE_EXPLAINER} label="About SOKO Intelligence" align={align} />
  </span>
);

export const SupplierLogo: React.FC<{ supplier: BuyerSupplier; size?: 'sm' | 'md' | 'lg' }> = ({ supplier, size = 'md' }) => {
  const initials = supplier.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  const dims = size === 'lg' ? 'w-20 h-20 text-2xl rounded-xl' : size === 'md' ? 'w-12 h-12 text-base rounded-lg' : 'w-9 h-9 text-xs rounded-md';
  return (
    <div className={`${dims} ${supplier.logoTone} text-white font-semibold flex items-center justify-center shrink-0`} aria-hidden>
      {initials}
    </div>
  );
};
