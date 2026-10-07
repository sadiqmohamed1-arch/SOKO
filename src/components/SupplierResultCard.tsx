import React from 'react';
import { Bookmark, BookmarkCheck, MapPin, MessageSquare } from 'lucide-react';
import {
  BuyerSupplier,
  SupplierProduct,
  activeCertifications,
  supplierLocation,
  supplierTypeLine,
  tradeLicenseLabel,
} from '../data/buyerSuppliers';
import { ExternalSourceBadge, IntelligenceValue, SupplierLogo, SupplierStatusBadge } from './SupplierTrust';

interface SupplierResultCardProps {
  supplier: BuyerSupplier;
  relevantProducts: SupplierProduct[];
  saved: boolean;
  onView: () => void;
  onViewProducts: () => void;
  onToggleSave: () => void;
  onContact: () => void;
}

const MAX_CHIPS = 4;

const Stat: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={`min-w-0 ${className}`}>
    <dt className="text-[11px] text-slate-500">{label}</dt>
    <dd className="text-sm font-semibold text-slate-900 truncate">{children}</dd>
  </div>
);

export const SupplierResultCard: React.FC<SupplierResultCardProps> = ({
  supplier: s,
  relevantProducts,
  saved,
  onView,
  onViewProducts,
  onToggleSave,
  onContact,
}) => {
  const limited = s.status === 'listed';
  const ordered = [...relevantProducts, ...s.products.filter((prod) => !relevantProducts.includes(prod))];
  const chips = ordered.length ? ordered.slice(0, MAX_CHIPS).map((prod) => prod.name) : s.capabilities.slice(0, MAX_CHIPS);
  const remaining = ordered.length - Math.min(ordered.length, MAX_CHIPS);
  const licenseTone =
    s.tradeLicense.status === 'verified' ? 'text-emerald-700' : s.tradeLicense.status === 'expired' ? 'text-red-700' : 'text-slate-600';

  return (
    <article className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3 sm:gap-4">
        <SupplierLogo supplier={s} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={onView}
                className="text-left text-base font-semibold text-slate-900 hover:text-blue-700 transition-colors leading-tight cursor-pointer"
              >
                {s.name}
              </button>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <SupplierStatusBadge status={s.status} />
                {s.externalSourceFields && <ExternalSourceBadge />}
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {supplierLocation(s)}
                </span>
                <span className="hidden sm:inline">{supplierTypeLine(s)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleSave}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from saved suppliers' : 'Save supplier'}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                saved ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <p className="mt-1.5 text-xs font-semibold text-slate-700">{s.categories.join(' | ')}</p>
        </div>
      </div>

      {limited ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
          <p className="text-sm font-semibold text-slate-800">Limited information available</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Profile completeness: {s.profileCompletenessPct}% · This supplier has not yet completed SOKO verification.
          </p>
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
          <Stat label="Trade License" className="hidden sm:block">
            <span className={licenseTone}>{tradeLicenseLabel(s)}</span>
          </Stat>
          <Stat label="Supplier Documentation" className="hidden sm:block">{s.documentationPct}% Complete</Stat>
          <Stat label="Certifications">{activeCertifications(s)} Active</Stat>
          <div className="min-w-0">
            <dt className="text-[11px] text-slate-500">SOKO Intelligence</dt>
            <dd>
              <IntelligenceValue score={s.intelligenceScore} />
            </dd>
          </div>
        </dl>
      )}

      {chips.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] text-slate-500 mb-1.5">{ordered.length ? 'Key Products' : 'Capabilities'}</p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-xs text-slate-700">
                {c}
              </span>
            ))}
            {remaining > 0 && (
              <button
                type="button"
                onClick={onViewProducts}
                className="px-2 py-0.5 rounded-md text-xs font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
              >
                +{remaining} more products
              </button>
            )}
          </div>
        </div>
      )}

      {s.brands.length > 0 && (
        <p className="mt-2.5 text-xs text-slate-500 hidden sm:block">
          Brands: <span className="text-slate-700 font-semibold">{s.brands.join(' · ')}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          {limited ? 'View Available Information' : 'View Supplier'}
        </button>
        {s.products.length > 0 && (
          <button
            type="button"
            onClick={onViewProducts}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            View Products
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            className={`sm:hidden inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              saved ? 'text-blue-700' : 'text-slate-600'
            }`}
          >
            {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            {saved ? 'Saved' : 'Save'}
          </button>
          {s.contacts.length > 0 && (
            <button
              type="button"
              onClick={onContact}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Contact
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
