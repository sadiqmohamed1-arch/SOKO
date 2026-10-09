import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight, Bookmark, BookmarkCheck, Boxes, Building, Building2, Clock, DoorOpen, Droplets, FileText, FlaskConical,
  History, Layers, LayoutGrid, Lock, Mail, MapPin, MessageSquare, Package, Paintbrush, Search, ShieldCheck, Truck, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';
import { CompanyProduct, CompanyRecord } from '../../data/supplierTypes';
import { companyById, documentsOf, membersOf } from '../../data/supplierStore';
import { toggleSavedProduct, trackProductView } from '../../data/supplierService';
import { BUYER_SUPPLIERS, IMG } from '../../data/buyerSuppliers';
import { BuyerSupplierProfile, ProfileTab } from '../BuyerSupplierProfile';
import { daysAgo, fmtDate } from '../marketHub/MarketHubShared';
import { SokoBreadcrumb } from '../sokoDesignSystem/SokoBreadcrumb';
import {
  SokoEmptyState, SokoKpiCell, SokoStatusIndicator, SokoTabs, initialsOf, sokoCard, sokoTokens,
} from '../sokoDesignSystem/SokoComponents';
import { SW } from './SupplierShared';

type Collection = 'all' | 'saved' | 'recent';
type View = 'grid' | 'list';

const selectCls = `${sokoTokens.focus} h-10 w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 hover:border-slate-300 transition-colors cursor-pointer`;
const secondaryBtn = `${sokoTokens.focus} inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer`;
const primaryBtn = `${sokoTokens.focus} inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer`;

const PrototypeTag = () => (
  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-wider text-amber-800">Prototype</span>
);

const isVerified = (c?: CompanyRecord) => c?.verification.status === 'verified';

const VerificationStatus: React.FC<{ supplier?: CompanyRecord }> = ({ supplier }) =>
  isVerified(supplier)
    ? <SokoStatusIndicator label="SOKO verified" tone="success" />
    : <SokoStatusIndicator label="Not verified" tone="neutral" />;

// Shared stock category photography is not a photograph of any specific product, so it is never shown as one.
const STOCK_PHOTOS = new Set<string>(Object.values(IMG));
const productPhotos = (p: CompanyProduct) => p.images.filter((src) => src && !STOCK_PHOTOS.has(src));

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Steel & Rebar': Layers,
  Waterproofing: Droplets,
  'Construction Chemicals': FlaskConical,
  Doors: DoorOpen,
  Equipment: Wrench,
  'Façade': Building,
  Finishes: Paintbrush,
  MEP: Zap,
  Precast: Boxes,
  'Ready Mix Concrete': Truck,
};

const CategoryPlaceholder: React.FC<{ category: string; size?: 'sm' | 'md' }> = ({ category, size = 'md' }) => {
  const Icon = CATEGORY_ICONS[category] ?? Package;
  return (
    <div
      role="img"
      aria-label={`No product photo · ${category || 'Product'}`}
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400"
      style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgb(241 245 249) 0 1px, transparent 1px 12px)' }}
    >
      <span className={`flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm ${size === 'sm' ? 'h-7 w-7' : 'h-11 w-11'}`}>
        <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'} aria-hidden />
      </span>
      {size === 'md' && (
        <span className="flex flex-col items-center gap-0.5 px-3 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{category || 'Product'}</span>
          <span className="text-[11px] text-slate-400">No product photo</span>
        </span>
      )}
    </div>
  );
};

const ProductImage: React.FC<{ product: CompanyProduct; src?: string; className?: string; size?: 'sm' | 'md' }> = ({ product, src, className = '', size = 'md' }) => {
  const photo = src ?? productPhotos(product)[0];
  return (
    <div className={`aspect-[4/3] overflow-hidden bg-slate-100 ${className}`}>
      {photo
        ? <img src={photo} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        : <CategoryPlaceholder category={product.category} size={size} />}
    </div>
  );
};

const SpecList: React.FC<{ specs: CompanyProduct['specs']; limit?: number; compact?: boolean }> = ({ specs, limit, compact }) => {
  const shown = limit ? specs.slice(0, limit) : specs;
  if (shown.length === 0) {
    return <p className={`text-slate-400 ${compact ? 'text-xs leading-5' : 'text-sm'}`}>No technical specifications published by the supplier.</p>;
  }
  if (compact) {
    return (
      <dl className="flex flex-col gap-1 rounded-lg bg-slate-50 px-2.5 py-2">
        {shown.map((s, i) => (
          <div key={i} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-2 text-xs leading-5">
            <dt className="truncate text-slate-500" title={s.label}>{s.label}</dt>
            <dd className="truncate font-medium tabular-nums text-slate-800" title={s.value}>{s.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      {shown.map((s, i) => (
        <div key={i} className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5">
          <dt className="text-xs text-slate-500">{s.label}</dt>
          <dd className="text-sm font-medium leading-relaxed tabular-nums text-slate-900 text-pretty">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
};

// ─── Supplier profile (legacy buyer profile, only for suppliers present in that dataset) ───
const SupplierProfileModal: React.FC<{ supplierId: string; onClose: () => void }> = ({ supplierId, onClose }) => {
  const supplier = useMemo(() => BUYER_SUPPLIERS.find((s) => s.id === supplierId), [supplierId]);
  if (!supplier) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <BuyerSupplierProfile
        supplier={supplier} matchQuery="" initialTab={'overview' as ProfileTab} saved={false}
        networkContacts={[]} onUpdateNetworkContacts={() => {}} onBack={onClose}
        onToggleSave={() => {}} onContact={() => {}} onOpenSupplier={() => {}} onRequestContact={() => {}} onNotify={() => {}}
      />
    </div>
  );
};

// ─── Product detail ────────────────────────────────────────────────
const ProductDetail: React.FC<{
  sw: SW;
  product: CompanyProduct;
  saved: boolean;
  onBack: () => void;
  onToggleSave: () => void;
  onOpenSupplier: (s: CompanyRecord) => void;
  onMessage: (userId: string, name: string) => void;
}> = ({ sw, product, saved, onBack, onToggleSave, onOpenSupplier, onMessage }) => {
  const supplier = companyById(sw.store, product.companyId);
  const canSave = sw.can('contacts.manage');
  const supplierDocs = documentsOf(sw.store, product.companyId).filter((d) => !d.archived && (d.visibility === 'public' || d.visibility === 'shared'));
  const contact = supplier ? membersOf(sw.store, supplier.id).find((m) => m.status === 'active') : undefined;
  const activeCerts = supplier?.profile.certifications.filter((c) => c.status === 'active') ?? [];
  const [activeImage, setActiveImage] = useState(0);
  const photos = productPhotos(product);

  return (
    <div className="flex flex-col gap-6">
      <SokoBreadcrumb
        onBack={onBack}
        backLabel="Back to Product Discovery"
        trail={[{ label: 'Product Discovery', onClick: onBack }, { label: product.category, onClick: onBack }, { label: product.name }]}
      />

      <header className={`${sokoCard} grid grid-cols-1 gap-6 overflow-hidden p-5 sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}>
        <div className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <ProductImage product={product} src={photos[activeImage]} />
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2" role="group" aria-label="Product images">
              {photos.map((src, i) => (
                <button key={i} type="button" onClick={() => setActiveImage(i)} aria-label={`Show image ${i + 1}`} aria-pressed={i === activeImage}
                  className={`${sokoTokens.focus} h-14 w-16 overflow-hidden rounded-lg border-2 cursor-pointer ${i === activeImage ? 'border-blue-600' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className={sokoTokens.eyebrow}>{[product.category, product.subcategory].filter(Boolean).join(' · ')}</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 text-balance">{product.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{product.brand ? `${product.brand} · ` : ''}{product.type}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <VerificationStatus supplier={supplier} />
            {saved && <SokoStatusIndicator label={`Saved to ${sw.company.profile.tradingName}`} tone="info" />}
          </div>
          {product.description && <p className="text-sm leading-relaxed text-slate-600 text-pretty">{product.description}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {canSave && (
              <button type="button" onClick={onToggleSave} className={saved ? secondaryBtn : primaryBtn}>
                {saved ? <><BookmarkCheck className="w-4 h-4" aria-hidden />Saved to company</> : <><Bookmark className="w-4 h-4" aria-hidden />Save to company</>}
              </button>
            )}
            {contact && (
              <button type="button" onClick={() => onMessage(contact.userId, contact.name)} className={secondaryBtn}>
                <MessageSquare className="w-4 h-4" aria-hidden />Message supplier
              </button>
            )}
            {contact?.email && (
              <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Enquiry: ${product.name}`)}`} className={secondaryBtn}>
                <Mail className="w-4 h-4" aria-hidden />Email
              </a>
            )}
          </div>
          <p className="font-mono text-[11px] text-slate-500">Listing updated {fmtDate(product.updatedAt)}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className={`${sokoCard} p-5`} aria-labelledby="pd-specs">
            <h2 id="pd-specs" className="text-[15px] font-semibold text-slate-900">Technical specifications</h2>
            <p className="mt-0.5 text-xs text-slate-500">As published by the supplier. Verify against the datasheet before specifying.</p>
            <div className="mt-3"><SpecList specs={product.specs} /></div>
            {(product.variations.length > 0 || product.regions.length > 0) && (
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {product.variations.length > 0 && (
                  <div>
                    <dt className="text-xs text-slate-500">Variations</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">{product.variations.map((v) => <span key={v} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{v}</span>)}</dd>
                  </div>
                )}
                {product.regions.length > 0 && (
                  <div>
                    <dt className="text-xs text-slate-500">Supply regions</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">{product.regions.map((r) => <span key={r} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{r}</span>)}</dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          <section className={`${sokoCard} p-5`} aria-labelledby="pd-docs">
            <h2 id="pd-docs" className="text-[15px] font-semibold text-slate-900">Documents</h2>
            {product.attachments.length === 0 && supplierDocs.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">The supplier has not published documents for this product yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {product.attachments.map((a, i) => (
                  <li key={`a${i}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700"><FileText className="w-4 h-4 shrink-0 text-blue-600" aria-hidden /><span className="truncate">{a.name}</span></span>
                    <span className="shrink-0 text-xs text-slate-500">{a.kind}</span>
                  </li>
                ))}
                {supplierDocs.slice(0, 8).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700"><FileText className="w-4 h-4 shrink-0 text-slate-400" aria-hidden /><span className="truncate">{d.name}</span></span>
                    <span className="shrink-0 text-xs text-slate-500">Company · {d.category}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
              <Lock className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />Only public and shared supplier documents are listed. Request files directly from the supplier.
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          {supplier && (
            <section className={`${sokoCard} p-5`} aria-labelledby="pd-supplier">
              <h2 id="pd-supplier" className="text-[15px] font-semibold text-slate-900">Supplier</h2>
              <div className="mt-3 flex items-center gap-3">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700">
                  {initialsOf(supplier.profile.tradingName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{supplier.profile.tradingName}</p>
                  <p className="truncate text-xs text-slate-500">{[supplier.profile.types.join(' · '), supplier.profile.emirate].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-slate-500">SOKO ID</dt><dd className="mt-0.5 font-mono text-slate-800">{supplier.sokoId}</dd></div>
                <div><dt className="text-slate-500">Verification</dt><dd className="mt-0.5 inline-flex items-center gap-1 text-slate-800">{isVerified(supplier) && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden />}{isVerified(supplier) ? 'Verified' : 'Not verified'}</dd></div>
              </dl>
              {activeCerts.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Active certifications">
                  {activeCerts.map((c, i) => <li key={i} className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800">{c.name}</li>)}
                </ul>
              )}
              <button type="button" onClick={() => onOpenSupplier(supplier)} className={`${secondaryBtn} mt-4 w-full justify-center`}>
                <Building2 className="w-4 h-4" aria-hidden />View supplier
              </button>
            </section>
          )}

          <section className={`${sokoCard} p-5`} aria-labelledby="pd-intel">
            <div className="flex items-center justify-between gap-2">
              <h2 id="pd-intel" className="text-[15px] font-semibold text-slate-900">Product intelligence</h2>
              <PrototypeTag />
            </div>
            <dl className="mt-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between"><dt className="text-slate-500">Supplier verification</dt><dd className="text-slate-800">{isVerified(supplier) ? 'Verified' : 'Not verified'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Active certifications</dt><dd className="font-mono tabular-nums text-slate-800">{activeCerts.length}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Published documents</dt><dd className="font-mono tabular-nums text-slate-800">{product.attachments.length + supplierDocs.length}</dd></div>
            </dl>
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
              Product Intelligence Scores, compliance checks and performance ratings are not available yet. Only facts recorded on SOKO are shown.
            </p>
          </section>
        </aside>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">SOKO is a discovery platform and does not process orders or payments. Contact the supplier directly for quotations.</p>
    </div>
  );
};

// ─── Product card / row ─────���──────────────────────────────────────
interface CardProps {
  product: CompanyProduct;
  supplier?: CompanyRecord;
  saved: boolean;
  canSave: boolean;
  meta?: string;
  onView: () => void;
  onToggleSave: () => void;
}

const SaveButton: React.FC<{ saved: boolean; name: string; onClick: () => void; className?: string }> = ({ saved, name, onClick, className = '' }) => (
  <button type="button" onClick={onClick} aria-pressed={saved} aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
    className={`${sokoTokens.focus} inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
      saved ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${className}`}>
    {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
  </button>
);

const ProductCard: React.FC<CardProps> = ({ product, supplier, saved, canSave, meta, onView, onToggleSave }) => (
  <li className={`${sokoCard} group flex flex-col overflow-hidden`}>
    <button type="button" onClick={onView} className={`${sokoTokens.focus} block cursor-pointer`} tabIndex={-1} aria-hidden>
      <ProductImage product={product} className="transition-opacity group-hover:opacity-95" />
    </button>
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-500">{product.category}</p>
          <button type="button" onClick={onView} className={`${sokoTokens.focus} mt-0.5 block max-w-full rounded text-left cursor-pointer`}>
            <span className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-blue-700">{product.name}</span>
          </button>
          {product.brand && <p className="mt-0.5 truncate text-xs text-slate-500">{product.brand}</p>}
        </div>
        {canSave && <SaveButton saved={saved} name={product.name} onClick={onToggleSave} />}
      </div>
      <SpecList specs={product.specs} limit={3} compact />
      <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600"><Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden /><span className="truncate">{supplier?.profile.tradingName ?? 'Unknown supplier'}</span></span>
          {isVerified(supplier) && <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" aria-label="SOKO verified supplier" />}
        </div>
        {meta && <p className="font-mono text-[11px] text-slate-500">{meta}</p>}
      </div>
    </div>
  </li>
);

// ─── Main page ─────────────────────────────────────────────────────
export const ProductDiscovery: React.FC<{ sw: SW; onStartMessageWith: (userId: string, name: string) => void }> = ({ sw, onStartMessageWith }) => {
  const [collection, setCollection] = useState<Collection>('all');
  const [view, setView] = useState<View>('grid');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [location, setLocation] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [profileSupplierId, setProfileSupplierId] = useState<string | null>(null);

  const companyName = sw.company.profile.tradingName;
  const canSave = sw.can('contacts.manage');

  const allProducts = useMemo(
    () => sw.store.products.filter((p) => p.status === 'active' && p.companyId !== sw.company.id),
    [sw.store.products, sw.company.id],
  );
  const supplierOf = (p: CompanyProduct) => companyById(sw.store, p.companyId);

  const categories = useMemo(() => [...new Set(allProducts.map((p) => p.category))].sort(), [allProducts]);
  const brands = useMemo(() => [...new Set(allProducts.map((p) => p.brand).filter(Boolean))].sort(), [allProducts]);
  const suppliers = useMemo(
    () => sw.store.companies.filter((c) => allProducts.some((p) => p.companyId === c.id)).sort((a, b) => a.profile.tradingName.localeCompare(b.profile.tradingName)),
    [sw.store.companies, allProducts],
  );
  const locationsOf = (p: CompanyProduct) => {
    const s = companyById(sw.store, p.companyId);
    return [...p.regions, ...(s?.profile.emirate ? [s.profile.emirate] : [])];
  };
  const locations = useMemo(() => [...new Set(allProducts.flatMap(locationsOf))].filter(Boolean).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allProducts, sw.store.companies]);

  const savedEntries = useMemo(
    () => sw.store.savedProducts.filter((s) => s.companyId === sw.company.id),
    [sw.store.savedProducts, sw.company.id],
  );
  const savedIds = useMemo(() => new Set(savedEntries.map((s) => s.productId)), [savedEntries]);
  const recentEntries = useMemo(
    () => sw.store.recentlyViewedProducts.filter((r) => r.companyId === sw.company.id && allProducts.some((p) => p.id === r.productId)),
    [sw.store.recentlyViewedProducts, sw.company.id, allProducts],
  );

  const base = useMemo(() => {
    const byId = new Map(allProducts.map((p) => [p.id, p]));
    if (collection === 'saved') return savedEntries.map((s) => byId.get(s.productId)).filter(Boolean) as CompanyProduct[];
    if (collection === 'recent') return recentEntries.map((r) => byId.get(r.productId)).filter(Boolean) as CompanyProduct[];
    return allProducts;
  }, [collection, allProducts, savedEntries, recentEntries]);

  const filtered = base.filter((p) => {
    const s = supplierOf(p);
    if (verifiedOnly && !isVerified(s)) return false;
    if (category && p.category !== category) return false;
    if (brand && p.brand !== brand) return false;
    if (supplierId && p.companyId !== supplierId) return false;
    if (location && !locationsOf(p).includes(location)) return false;
    if (q.trim()) {
      const hay = [p.name, p.type, p.brand, p.category, p.subcategory, p.description, s?.profile.tradingName ?? '', ...p.specs.map((x) => `${x.label} ${x.value}`)]
        .join(' ').toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  const hasFilters = !!(q.trim() || category || brand || supplierId || location || verifiedOnly);
  const clearFilters = () => { setQ(''); setCategory(''); setBrand(''); setSupplierId(''); setLocation(''); setVerifiedOnly(false); };

  const metaFor = (p: CompanyProduct) => {
    if (collection === 'saved') {
      const e = savedEntries.find((s) => s.productId === p.id);
      return e ? `Saved by ${e.savedBy} · ${daysAgo(e.at)}` : undefined;
    }
    if (collection === 'recent') {
      const e = recentEntries.find((r) => r.productId === p.id);
      return e ? `Viewed by ${e.viewedBy} · ${daysAgo(e.at)}` : undefined;
    }
    return undefined;
  };

  const open = (p: CompanyProduct) => {
    sw.setStore(trackProductView(sw.ctx, p.id));
    setOpenId(p.id);
    window.scrollTo({ top: 0 });
  };

  const toggleSave = (p: CompanyProduct) => {
    const wasSaved = savedIds.has(p.id);
    const res = toggleSavedProduct(sw.ctx, p.id);
    if (res.ok) {
      sw.setStore(res.store);
      sw.notify(wasSaved ? `Removed "${p.name}" from ${companyName} saved products` : `Saved "${p.name}" to ${companyName}`);
    } else sw.notify(res.error);
  };

  const openSupplier = (s: CompanyRecord) => {
    const vendor = sw.store.vendorRecords.find((vr) => vr.companyId === sw.company.id && vr.supplierCompanyId === s.id);
    if (vendor) {
      const url = new URL(window.location.href);
      url.searchParams.set('vendor', vendor.id);
      window.history.replaceState(window.history.state, '', url);
      sw.go('sw-vendors');
      return;
    }
    if (BUYER_SUPPLIERS.some((b) => b.id === s.id)) { setProfileSupplierId(s.id); return; }
    sw.notify('Prototype: public SOKO supplier profiles open from the Vendor Register once a vendor record exists.');
  };

  const message = (userId: string, name: string) => {
    onStartMessageWith(userId, name);
    sw.notify(`Opening a conversation with ${name}`);
  };

  const openProduct = allProducts.find((p) => p.id === openId);
  if (openProduct) {
    return (
      <>
        <ProductDetail
          sw={sw}
          product={openProduct}
          saved={savedIds.has(openProduct.id)}
          onBack={() => setOpenId(null)}
          onToggleSave={() => toggleSave(openProduct)}
          onOpenSupplier={openSupplier}
          onMessage={message}
        />
        {profileSupplierId && <SupplierProfileModal supplierId={profileSupplierId} onClose={() => setProfileSupplierId(null)} />}
      </>
    );
  }

  const recentRail = collection === 'all' && !hasFilters ? recentEntries.slice(0, 4) : [];
  const verifiedSupplierCount = suppliers.filter(isVerified).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={sokoTokens.eyebrow}>Contractor workspace · Products</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 text-balance">Product Discovery</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 text-pretty">
            Construction products, materials and systems published by suppliers on SOKO. Save products to {companyName} to build a shared shortlist for your team.
          </p>
        </div>
      </header>

      <section aria-label="Products overview" className={`${sokoCard} grid grid-cols-2 md:grid-cols-4 overflow-hidden [&>*]:border-slate-100 [&>*:nth-child(-n+2)]:border-b md:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r md:[&>*:not(:last-child)]:border-r`}>
        <SokoKpiCell label="Published products" value={allProducts.length} detail={`${categories.length} trade categories`} onClick={() => { clearFilters(); setCollection('all'); }} />
        <SokoKpiCell label="Verified suppliers" value={verifiedSupplierCount} detail={`of ${suppliers.length} with listings`} onClick={() => { clearFilters(); setCollection('all'); setVerifiedOnly(true); }}
          hint="Suppliers whose company verification has been approved by SOKO." />
        <SokoKpiCell label="Saved to company" value={savedIds.size} detail={`Shared with ${companyName}`} onClick={() => { clearFilters(); setCollection('saved'); }}
          hint="Products saved into this company workspace. Visible to authorized team members." />
        <SokoKpiCell label="Recently viewed" value={recentEntries.length} detail="By your company team" onClick={() => { clearFilters(); setCollection('recent'); }} />
      </section>

      <section className={`${sokoCard} flex flex-col gap-4 p-4 sm:p-5`} aria-label="Search and filter products">
        <label className="relative">
          <span className="sr-only">Search products</span>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, brands, trade categories, suppliers or specifications…"
            className={`${sokoTokens.focus} h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-300 transition-colors`} />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select aria-label="Trade category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={selectCls}>
            <option value="">All brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select aria-label="Supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={selectCls}>
            <option value="">All suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.profile.tradingName}</option>)}
          </select>
          <select aria-label="Location" value={location} onChange={(e) => setLocation(e.target.value)} className={selectCls}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <label className={`${sokoTokens.focus} flex h-10 items-center gap-2 rounded-xl border px-3 text-sm cursor-pointer transition-colors ${
            verifiedOnly ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="h-4 w-4 accent-blue-600" />
            <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden />SOKO verified only
          </label>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="overflow-x-auto">
            <SokoTabs<Collection>
              label="Product collection"
              variant="underline"
              active={collection}
              onChange={setCollection}
              tabs={[
                { id: 'all', label: 'All products', count: allProducts.length },
                { id: 'saved', label: `Saved to ${companyName}`, count: savedIds.size },
                { id: 'recent', label: 'Recently viewed', count: recentEntries.length },
              ]}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{filtered.length} of {base.length}</span>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={`${sokoTokens.focus} rounded-md px-1 text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer`}>Clear filters</button>
            )}
            <div className="w-40">
              <SokoTabs<View> label="Layout" active={view} onChange={setView} tabs={[{ id: 'grid', label: 'Grid' }, { id: 'list', label: 'List' }]} />
            </div>
          </div>
        </div>
      </section>

      {recentRail.length > 0 && (
        <section aria-labelledby="pd-recent" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="pd-recent" className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><History className="w-4 h-4 text-slate-400" aria-hidden />Recently viewed</h2>
            <button type="button" onClick={() => setCollection('recent')} className={`${sokoTokens.focus} inline-flex items-center gap-1 rounded-md text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer`}>
              View all<ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recentRail.map((r) => {
              const p = allProducts.find((x) => x.id === r.productId)!;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => open(p)} className={`${sokoCard} ${sokoTokens.focus} group flex w-full items-center gap-3 p-2.5 text-left cursor-pointer hover:border-slate-300`}>
                    <span className="w-16 shrink-0 overflow-hidden rounded-lg"><ProductImage product={p} size="sm" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900 group-hover:text-blue-700">{p.name}</span>
                      <span className="block truncate text-xs text-slate-500">{supplierOf(p)?.profile.tradingName}</span>
                      <span className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-slate-400"><Clock className="w-3 h-3" aria-hidden />{daysAgo(r.at)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {base.length === 0 ? (
        <div className={`${sokoCard} py-10`}>
          {collection === 'saved' ? (
            <SokoEmptyState icon={Bookmark} title="No saved products yet"
              description={canSave ? `Save products while browsing to build a shortlist shared with ${companyName}.` : `Products saved by ${companyName} will appear here.`}
              action={<button type="button" onClick={() => setCollection('all')} className={secondaryBtn}><LayoutGrid className="w-4 h-4" aria-hidden />Browse products</button>} />
          ) : collection === 'recent' ? (
            <SokoEmptyState icon={History} title="Nothing viewed yet" description="Products your company team opens will be listed here."
              action={<button type="button" onClick={() => setCollection('all')} className={secondaryBtn}><LayoutGrid className="w-4 h-4" aria-hidden />Browse products</button>} />
          ) : (
            <SokoEmptyState icon={Package} title="No products published yet" description="Suppliers on SOKO have not published active product listings yet." />
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${sokoCard} py-10`}>
          <SokoEmptyState icon={Search} title="No products match these filters" description="Try another category, supplier or search term."
            action={<button type="button" onClick={clearFilters} className={secondaryBtn}>Clear filters</button>} />
        </div>
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-label="Products">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} supplier={supplierOf(p)} saved={savedIds.has(p.id)} canSave={canSave}
              meta={metaFor(p)} onView={() => open(p)} onToggleSave={() => toggleSave(p)} />
          ))}
        </ul>
      ) : (
        <ul className={`${sokoCard} divide-y divide-slate-100`} aria-label="Products">
          {filtered.map((p) => {
            const s = supplierOf(p);
            const meta = metaFor(p);
            return (
              <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                <button type="button" onClick={() => open(p)} tabIndex={-1} aria-hidden className="hidden w-28 shrink-0 overflow-hidden rounded-lg sm:block cursor-pointer">
                  <ProductImage product={p} size="sm" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-500">{p.category}</p>
                  <button type="button" onClick={() => open(p)} className={`${sokoTokens.focus} block max-w-full rounded text-left cursor-pointer`}>
                    <span className="block truncate text-sm font-semibold text-slate-900 hover:text-blue-700">{p.name}</span>
                  </button>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {p.brand && <span>{p.brand}</span>}
                    <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" aria-hidden />{s?.profile.tradingName}</span>
                    {s?.profile.emirate && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" aria-hidden />{s.profile.emirate}</span>}
                  </p>
                  {meta && <p className="mt-1 font-mono text-[11px] text-slate-500">{meta}</p>}
                </div>
                <div className="w-full sm:w-64 lg:w-72"><SpecList specs={p.specs} limit={2} compact /></div>
                <div className="flex shrink-0 items-center gap-2 sm:w-44 sm:justify-end">
                  <VerificationStatus supplier={s} />
                  {canSave && <SaveButton saved={savedIds.has(p.id)} name={p.name} onClick={() => toggleSave(p)} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Lock className="w-3.5 h-3.5 mt-px shrink-0 text-slate-400" aria-hidden />
        Saved products belong to {companyName} and are visible to authorized team members. Suppliers manage their own listings from the Supplier workspace; SOKO does not process orders or payments.
      </p>
    </div>
  );
};
