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

const MAX_PRODUCTS = 3;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

const verificationFreshness = (s: BuyerSupplier) => {
  if (s.status === 'verified') return s.lastVerified ? `Last verified ${formatDate(s.lastVerified)}` : 'SOKO Verified';
  if (s.status === 'pending') return 'Verification in progress';
  if (s.status === 'update-required') return 'Verification update required';
  return 'Not yet verified by SOKO';
};

const Stat: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[11px] text-slate-500 whitespace-nowrap">{label}</dt>
    <dd className="text-sm font-semibold text-slate-900 whitespace-nowrap">{children}</dd>
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
  const shown = ordered.length ? ordered.slice(0, MAX_PRODUCTS).map((prod) => prod.name) : s.capabilities.slice(0, MAX_PRODUCTS);
  const remaining = ordered.length - Math.min(ordered.length, MAX_PRODUCTS);
  const licenseTone =
    s.tradeLicense.status === 'verified' ? 'text-emerald-700' : s.tradeLicense.status === 'expired' ? 'text-red-700' : 'text-slate-700';

  return (
    <article className="w-full bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 hover:shadow-sm transition">
      <div className="flex items-start gap-3 sm:gap-4">
        <SupplierLogo supplier={s} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={onView}
              className="text-left text-base font-semibold text-slate-900 hover:text-blue-700 transition-colors leading-tight cursor-pointer"
            >
              {s.name}
            </button>
            <SupplierStatusBadge status={s.status} />
            {s.externalSourceFields && <ExternalSourceBadge />}
          </div>
          <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3 mt-px shrink-0" />
            <span className="min-w-0">{`${supplierLocation(s)} \u00b7 ${supplierTypeLine(s)}`}</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-700">{s.categories.join(' · ')}</p>
        </div>
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved suppliers' : 'Save supplier'}
          title={saved ? 'Saved to My Saved Suppliers' : 'Save supplier'}
          className={`p-2 -m-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
            saved ? 'text-blue-700 bg-blue-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          {saved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
        </button>
      </div>

      {limited ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Limited information available</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Profile completeness: {s.profileCompletenessPct}% · This supplier has not yet completed SOKO verification.
          </p>
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
          <Stat label="Trade License">
            <span className={licenseTone}>{tradeLicenseLabel(s)}</span>
          </Stat>
          <Stat label="Supplier Documentation">{s.documentationPct}% Complete</Stat>
          <Stat label="Certifications">{activeCertifications(s)} Active</Stat>
          <div className="min-w-0">
            <dt className="text-[11px] text-slate-500 whitespace-nowrap">SOKO Intelligence</dt>
            <dd className="whitespace-nowrap">
              <IntelligenceValue score={s.intelligenceScore} align="right" />
            </dd>
          </div>
        </dl>
      )}

      <p className="mt-1.5 text-[11px] text-slate-500">{verificationFreshness(s)}</p>

      {(shown.length > 0 || s.brands.length > 0) && (
        <dl className="mt-3 grid gap-2.5 text-sm">
          {shown.length > 0 && (
            <div className="min-w-0">
              <dt className="text-[11px] text-slate-500">{ordered.length ? 'Key Products' : 'Capabilities'}</dt>
              <dd className="mt-0.5 text-slate-800">
                {shown.join(' \u00b7 ')}
                {remaining > 0 && (
                  <>
                    {' \u00b7 '}
                    <button type="button" onClick={onViewProducts} className="font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                      +{remaining} more
                    </button>
                  </>
                )}
              </dd>
            </div>
          )}
          {s.brands.length > 0 && (
            <div className="min-w-0">
              <dt className="text-[11px] text-slate-500">Brands</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">{s.brands.join(' \u00b7 ')}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          {limited ? 'View Available Information' : 'View Supplier'}
        </button>
        {s.products.length > 0 && (
          <button
            type="button"
            onClick={onViewProducts}
            className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            View Products
          </button>
        )}
        {s.contacts.length > 0 && (
          <button
            type="button"
            onClick={onContact}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Contact
          </button>
        )}
      </div>
    </article>
  );
};
