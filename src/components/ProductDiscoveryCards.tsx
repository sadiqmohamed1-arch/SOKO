import React from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, FileText, Globe, Info, MapPin, MessageSquare, Search } from 'lucide-react';
import { BuyerSupplier, supplierLocation } from '../data/buyerSuppliers';
import { BrandEntry, ProductType, brandRelationship, catalogueInfo } from '../data/productDiscovery';
import { SupplierLogo, SupplierStatusBadge } from './SupplierTrust';

const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer';
const secondaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold text-slate-700 transition-colors cursor-pointer';

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-700">{children}</span>
);

const MatchReason: React.FC<{ text: string }> = ({ text }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-800">
    <Search className="w-3 h-3" />
    {text}
  </span>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">{children}</span>
);

const cardCls = 'bg-white rounded-xl border border-slate-200 p-4 sm:p-5 transition-shadow hover:shadow-md hover:border-slate-300 animate-[fadeIn_0.25s_ease-out]';

interface ProductTypeCardProps {
  product: ProductType;
  reason?: string;
  brands: string[];
  supplierCount: number;
  saved: boolean;
  onViewSuppliers: () => void;
  onToggleSaveSearch: () => void;
  onOpenBrand: (brand: string) => void;
}

export const ProductTypeCard: React.FC<ProductTypeCardProps> = ({ product, reason, brands, supplierCount, saved, onViewSuppliers, onToggleSaveSearch, onOpenBrand }) => (
  <article className={`${cardCls} flex flex-col`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label>Product type · {product.category}</Label>
        <h3 className="mt-1 text-base font-semibold text-slate-900 leading-snug">{product.name}</h3>
      </div>
    </div>
    {reason && (
      <div className="mt-2">
        <MatchReason text={reason} />
      </div>
    )}
    <dl className="mt-3 mb-4 space-y-2 text-sm">
      <div>
        <dt className="text-xs text-slate-500">Related keywords</dt>
        <dd className="mt-1 flex flex-wrap gap-1">
          {product.keywords.map((k) => (
            <Chip key={k}>{k}</Chip>
          ))}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Brands</dt>
        <dd className="mt-0.5 text-slate-800">
          {brands.length === 0
            ? <span className="text-slate-400">No brands declared yet</span>
            : brands.map((b, i) => (
                <React.Fragment key={b}>
                  {i > 0 && <span className="text-slate-300">, </span>}
                  <button type="button" onClick={() => onOpenBrand(b)} className="font-semibold text-slate-800 hover:text-blue-700 hover:underline cursor-pointer">
                    {b}
                  </button>
                </React.Fragment>
              ))}
        </dd>
      </div>
    </dl>
    <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
      <p className="text-sm font-semibold text-slate-900">
        {supplierCount} Matching {supplierCount === 1 ? 'Supplier' : 'Suppliers'}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onToggleSaveSearch} aria-pressed={saved} className={secondaryBtn}>
          {saved ? <BookmarkCheck className="w-4 h-4 text-blue-700" /> : <Bookmark className="w-4 h-4" />}
          {saved ? 'Saved' : 'Save Search'}
        </button>
        <button type="button" onClick={onViewSuppliers} disabled={!supplierCount} className={`${primaryBtn} disabled:bg-slate-300 disabled:cursor-not-allowed`}>
          View Suppliers
        </button>
      </div>
    </div>
  </article>
);

const brandInitials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

interface BrandCardProps {
  brand: BrandEntry;
  reason?: string;
  supplierCount: number;
  onFindSuppliers: () => void;
}

export const BrandCard: React.FC<BrandCardProps> = ({ brand, reason, supplierCount, onFindSuppliers }) => (
  <article className={`${cardCls} flex flex-col`}>
    <div className="flex items-start gap-3">
      <span className="w-10 h-10 shrink-0 rounded-lg bg-slate-900 text-gold-500 text-sm font-semibold flex items-center justify-center" aria-hidden>
        {brandInitials(brand.name)}
      </span>
      <div className="min-w-0">
        <Label>Brand · {brand.category}</Label>
        <h3 className="mt-0.5 text-base font-semibold text-slate-900 leading-snug">{brand.name}</h3>
      </div>
    </div>
    {reason && (
      <div className="mt-2">
        <MatchReason text={reason} />
      </div>
    )}
    {brand.relatedAreas.length > 0 && (
      <div className="mt-3">
        <p className="text-xs text-slate-500">Related areas</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {brand.relatedAreas.map((a) => (
            <Chip key={a}>{a}</Chip>
          ))}
        </div>
      </div>
    )}
    <p className="mt-3 mb-4 text-xs text-slate-500 leading-relaxed">A brand is not a supplier. Suppliers below have declared this brand on their SOKO profile.</p>
    <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
      <p className="text-sm font-semibold text-slate-900">
        Declared by {supplierCount} {supplierCount === 1 ? 'supplier' : 'suppliers'}
      </p>
      <div className="flex gap-2">
        {brand.website && (
          <a href={brand.website} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
            <Globe className="w-4 h-4" />
            Visit Brand Website
          </a>
        )}
        <button type="button" onClick={onFindSuppliers} disabled={!supplierCount} className={`${primaryBtn} disabled:bg-slate-300 disabled:cursor-not-allowed`}>
          Find Suppliers
        </button>
      </div>
    </div>
  </article>
);

interface MatchingSupplierCardProps {
  supplier: BuyerSupplier;
  reasons: string[];
  focusBrand?: string;
  saved: boolean;
  onView: () => void;
  onContact: () => void;
  onViewCatalogue: () => void;
  onToggleSave: () => void;
}

const MAX_CAPABILITIES = 4;

export const MatchingSupplierCard: React.FC<MatchingSupplierCardProps> = ({ supplier: s, reasons, focusBrand, saved, onView, onContact, onViewCatalogue, onToggleSave }) => {
  const catalogue = catalogueInfo(s);
  const catalogueLabel = catalogue.vault.length
    ? 'Available on SOKO'
    : catalogue.external.length
      ? 'External Link Available'
      : null;
  return (
    <article className={cardCls}>
      <div className="flex items-start gap-3 sm:gap-4">
        <SupplierLogo supplier={s} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button type="button" onClick={onView} className="text-base font-semibold text-slate-900 hover:text-blue-700 text-left cursor-pointer">
              {s.name}
            </button>
            <SupplierStatusBadge status={s.status} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {supplierLocation(s)}
            </span>
            <span>{s.categories.join(' · ')}</span>
            <span>{s.types.join(' · ')}</span>
          </p>
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <MatchReason key={r} text={r} />
          ))}
        </div>
      )}

      <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">Brands</dt>
          <dd className="mt-0.5 text-slate-800">{s.brands.length ? s.brands.join(', ') : <span className="text-slate-400">None declared</span>}</dd>
          {focusBrand && <dd className="mt-0.5 text-xs text-slate-500">{focusBrand}: {brandRelationship(s, focusBrand)}</dd>}
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">Capabilities</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {s.capabilities.slice(0, MAX_CAPABILITIES).map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
            {s.capabilities.length > MAX_CAPABILITIES && <span className="text-xs text-slate-500 self-center">+{s.capabilities.length - MAX_CAPABILITIES} more</span>}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <dt className="text-xs text-slate-500">Catalogue:</dt>
          <dd className={`inline-flex items-center gap-1 font-semibold ${catalogueLabel ? 'text-slate-800' : 'text-slate-400 font-normal'}`}>
            {catalogueLabel ? <FileText className="w-3.5 h-3.5 text-blue-700" /> : null}
            {catalogueLabel ?? 'Not provided'}
          </dd>
          {catalogue.external[0] && (
            <dd>
              <a href={catalogue.external[0].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline">
                Open External Catalogue
                <ExternalLink className="w-3 h-3" />
              </a>
            </dd>
          )}
        </div>
      </dl>

      <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
        <Info className="w-3 h-3 shrink-0" />
        Brands, capabilities and catalogues are declared by the supplier. Verification status is assessed by SOKO.
      </p>

      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
        <button type="button" onClick={onView} className={primaryBtn}>
          View Supplier
        </button>
        <button type="button" onClick={onContact} className={secondaryBtn}>
          <MessageSquare className="w-4 h-4" />
          Contact
        </button>
        {catalogueLabel && (
          <button type="button" onClick={onViewCatalogue} className={secondaryBtn}>
            <FileText className="w-4 h-4" />
            {catalogue.vault.length ? 'View Supplier Documents' : 'View Catalogue'}
          </button>
        )}
        <button type="button" onClick={onToggleSave} aria-pressed={saved} className={`${secondaryBtn} sm:ml-auto`}>
          {saved ? <BookmarkCheck className="w-4 h-4 text-blue-700" /> : <Bookmark className="w-4 h-4" />}
          {saved ? 'Saved' : 'Save Supplier'}
        </button>
      </div>
    </article>
  );
};
