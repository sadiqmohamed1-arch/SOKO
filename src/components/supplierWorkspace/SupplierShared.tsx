import React from 'react';
import { Clock, Crown, Lock, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { CompanyDocument, CompanyMembership, CompanyProduct, CompanyRecord, CompanyRole, CONTRACTOR_TIER_CONFIG, Permission, SessionUser, SupplierResult, SupplierStore } from '../../data/supplierTypes';
import { SupplierCtx } from '../../data/supplierService';
import { MarketWorkspace } from '../../data/marketHubTypes';

export type SupplierTab =
  | 'sw-dashboard'
  | 'sw-profile'
  | 'sw-products'
  | 'sw-documents'
  | 'sw-contacts'
  | 'sw-visits'
  | 'sw-insights'
  | 'sw-team'
  | 'sw-plan'
  | 'sw-settings'
  | 'sw-vendors';

export interface SW {
  store: SupplierStore;
  user: SessionUser;
  company: CompanyRecord;
  membership: CompanyMembership;
  role: CompanyRole;
  ctx: SupplierCtx;
  products: CompanyProduct[];
  documents: CompanyDocument[];
  members: CompanyMembership[];
  premium: boolean;
  marketWorkspace: MarketWorkspace;
  can: (p: Permission) => boolean;
  run: <T>(r: SupplierResult<T>, success?: string | ((v: T) => string)) => boolean;
  setStore: (s: SupplierStore) => void;
  notify: (m: string) => void;
  go: (tab: string) => void;
}

const initials = (name: string) =>
  name
    .replace(/\b(LLC|L\.L\.C\.?|FZE|PJSC)\b/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

export const CompanyLogo: React.FC<{ company: CompanyRecord; size?: 'sm' | 'md' | 'lg' }> = ({ company, size = 'md' }) => {
  const dims = size === 'lg' ? 'w-16 h-16 text-xl rounded-xl' : size === 'md' ? 'w-11 h-11 text-sm rounded-lg' : 'w-8 h-8 text-[11px] rounded-md';
  if (company.profile.logoUrl)
    return <img src={company.profile.logoUrl} alt={`${company.profile.tradingName} logo`} className={`${dims} object-cover border border-slate-200 bg-white shrink-0`} />;
  return (
    <div className={`${dims} ${company.profile.logoTone} text-white font-semibold flex items-center justify-center shrink-0`} aria-hidden>
      {initials(company.profile.tradingName)}
    </div>
  );
};

export const VerificationBadge: React.FC<{ company: CompanyRecord }> = ({ company }) => {
  const s = company.verification.status;
  if (s === 'verified')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
        <ShieldCheck className="w-3.5 h-3.5" /> SOKO Verified
      </span>
    );
  if (s === 'pending')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
        <Clock className="w-3.5 h-3.5" /> Verification pending
      </span>
    );
  if (s === 'rejected')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
        <ShieldAlert className="w-3.5 h-3.5" /> Action required
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
      <ShieldQuestion className="w-3.5 h-3.5" /> Not verified
    </span>
  );
};

export const PlanBadge: React.FC<{ premium: boolean; kind?: CompanyRecord['kind'] }> = ({ premium, kind = 'supplier' }) => {
  const label = kind === 'contractor' ? CONTRACTOR_TIER_CONFIG[premium ? 'premium' : 'free'].label : premium ? 'Supplier Premium' : 'Supplier Free';
  return premium ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-gold-300 text-[11px] font-semibold">
      <Crown className="w-3.5 h-3.5" /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700">{label}</span>
  );
};

export const Card: React.FC<{ title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, action, children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 mb-4">
        {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

export const PageHeader: React.FC<{ eyebrow: string; title: string; subtitle?: string; actions?: React.ReactNode }> = ({ eyebrow, title, subtitle, actions }) => (
  <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900 leading-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
  </header>
);

export const PremiumGate: React.FC<{ title: string; text: string; benefits: string[]; onUpgrade: () => void; canUpgrade: boolean }> = ({ title, text, benefits, onUpgrade, canUpgrade }) => (
  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 text-white">
    <div className="p-6 sm:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
      <div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold-300">
          <Lock className="w-3.5 h-3.5" /> Supplier Premium
        </span>
        <h2 className="mt-2 text-xl font-semibold leading-tight">{title}</h2>
        <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">{text}</p>
        <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col items-start md:items-end gap-2">
        <button type="button" onClick={onUpgrade} className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-lg bg-gold-500 hover:bg-gold-300 text-slate-900 text-sm font-semibold transition-colors cursor-pointer">
          <Crown className="w-4 h-4" /> {canUpgrade ? 'Compare plans' : 'View plans'}
        </button>
        {!canUpgrade && <p className="text-[11px] text-slate-400">Only a Supplier Admin can change the plan.</p>}
      </div>
    </div>
  </div>
);

export const NoPermission: React.FC<{ text: string }> = ({ text }) => (
  <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    {text}
  </p>
);

export const Meter: React.FC<{ value: number; tone?: 'blue' | 'gold' | 'green' | 'amber' }> = ({ value, tone = 'blue' }) => {
  const bar = { blue: 'bg-blue-600', gold: 'bg-gold-500', green: 'bg-emerald-600', amber: 'bg-amber-500' }[tone];
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
};

export const completenessOf = (p: CompanyProduct) => {
  const checks = [p.description.length >= 40, p.specs.length >= 3, p.images.length > 0, !!p.brand, !!p.subcategory, p.regions.length > 0, p.attachments.length > 0];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

export const missingOf = (p: CompanyProduct) =>
  [
    p.description.length < 40 && 'description',
    p.specs.length < 3 && 'specifications',
    !p.images.length && 'image',
    !p.subcategory && 'subcategory',
    !p.regions.length && 'regions',
  ].filter(Boolean) as string[];

export const fmtMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`);
