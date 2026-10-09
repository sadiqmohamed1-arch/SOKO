import React, { useState, useMemo } from 'react';
import { Search, Bookmark, BookmarkCheck, ShieldCheck, Eye, Building2, X, FileText, ArrowLeft, Mail } from 'lucide-react';
import { CompanyProduct, CompanyRecord } from '../../data/supplierTypes';
import { companyById, documentsOf } from '../../data/supplierStore';
import { isProductSaved, toggleSavedProduct, trackProductView } from '../../data/supplierService';
import { BUYER_SUPPLIERS } from '../../data/buyerSuppliers';
import { BuyerSupplierProfile, ProfileTab } from '../BuyerSupplierProfile';
import { StatusPill, btnPrimary, btnSecondary, btnGhost, inputCls, labelCls } from '../NetworkShared';
import { DemoNote, EmptyState, KpiCard, SubTabs, fmtDate } from '../marketHub/MarketHubShared';
import { Card, PageHeader, SW, VerificationBadge } from './SupplierShared';

type FilterTab = 'all' | 'saved' | 'verified';

const ProductDetailModal: React.FC<{ sw: SW; product: CompanyProduct; onClose: () => void; onOpenSupplier: (id: string) => void }> = ({ sw, product, onClose, onOpenSupplier }) => {
  const supplier = companyById(sw.store, product.companyId);
  const supplierDocs = documentsOf(sw.store, product.companyId).filter((d) => !d.archived && (d.visibility === 'public' || d.visibility === 'shared'));
  const saved = isProductSaved(sw.store, sw.company.id, product.id);
  const canSave = sw.can('contacts.manage');

  const handleSave = () => {
    const res = toggleSavedProduct(sw.ctx, product.id);
    if (res.ok) { sw.setStore(res.store); sw.notify(saved ? `Removed "${product.name}" from saved` : `Saved "${product.name}" to company workspace`); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />Back to Discovery
        </button>
        <span className="text-xs text-slate-400">Product Details</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48 h-48 rounded-xl bg-slate-100 overflow-hidden shrink-0">
            {product.images[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300"><FileText className="w-12 h-12" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
            <p className="text-sm text-slate-500 mt-1">{product.type} · {product.brand}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{product.category}</span>
              {product.subcategory && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">{product.subcategory}</span>}
              {product.variations.length > 0 && <span className="text-xs text-slate-500">{product.variations.length} variations</span>}
            </div>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{product.description}</p>
            <div className="flex items-center gap-2 mt-4">
              {canSave && (
                <button type="button" onClick={handleSave} className={saved ? btnSecondary : btnPrimary}>
                  {saved ? <><BookmarkCheck className="w-4 h-4" /> Saved to Company</> : <><Bookmark className="w-4 h-4" /> Save to Company</>}
                </button>
              )}
              {supplier && (
                <button type="button" onClick={() => onOpenSupplier(supplier.id)} className={btnSecondary}>
                  <Building2 className="w-4 h-4" /> View Supplier Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Specifications */}
        {product.specs.length > 0 && (
          <Card title="Specifications">
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
              {product.specs.map((s, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-slate-50 py-1.5">
                  <span className="text-slate-500">{s.label}</span>
                  <span className="font-medium text-slate-900 text-right">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Attachments */}
        {product.attachments.length > 0 && (
          <Card title="Technical Documents">
            <ul className="space-y-2">
              {product.attachments.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <FileText className="w-4 h-4 text-slate-400" /> {a.name} <span className="text-xs text-slate-400">({a.kind})</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Available documents from supplier */}
        {supplierDocs.length > 0 && (
          <Card title={`Available documents from ${supplier?.profile.tradingName ?? 'supplier'}`}>
            <ul className="space-y-1.5">
              {supplierDocs.slice(0, 8).map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-700"><FileText className="w-4 h-4 text-slate-400" /> {d.name}</span>
                  <span className="text-xs text-slate-400">{d.category}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Supplier info */}
        {supplier && (
          <Card title="Supplier">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-lg ${supplier.profile.logoTone} text-white font-semibold flex items-center justify-center shrink-0 text-sm`}>
                {supplier.profile.tradingName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{supplier.profile.tradingName}</p>
                <p className="text-xs text-slate-500">{supplier.profile.types.join(' · ')} · {supplier.profile.emirate}</p>
                <div className="mt-1"><VerificationBadge company={supplier} /></div>
              </div>
              <button type="button" onClick={() => onOpenSupplier(supplier.id)} className={btnGhost}>
                <Eye className="w-4 h-4" /> View Profile
              </button>
            </div>
            {supplier.profile.certifications.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {supplier.profile.certifications.map((c, i) => (
                  <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${c.status === 'active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                    <ShieldCheck className="w-2.5 h-2.5 inline mr-0.5" />{c.name}
                  </span>
                ))}
              </div>
            )}
          </Card>
        )}

        <DemoNote>This is a product discovery view. SOKO does not facilitate online purchases. Contact the supplier directly for quotations and orders.</DemoNote>
      </div>
    </div>
  );
};

const SupplierProfileModal: React.FC<{ supplierId: string; onClose: () => void }> = ({ supplierId, onClose }) => {
  const supplier = useMemo(() => BUYER_SUPPLIERS.find((s) => s.id === supplierId), [supplierId]);
  if (!supplier) return null;
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />Back to Product Discovery
        </button>
        <span className="text-xs text-slate-400">Supplier Profile</span>
      </div>
      <BuyerSupplierProfile
        supplier={supplier} matchQuery="" initialTab={'overview' as ProfileTab} saved={false}
        networkContacts={[]} onUpdateNetworkContacts={() => {}} onBack={onClose}
        onToggleSave={() => {}} onContact={() => {}} onOpenSupplier={() => {}} onRequestContact={() => {}} onNotify={() => {}}
      />
    </div>
  );
};

const ProductCard: React.FC<{ sw: SW; product: CompanyProduct; onView: () => void; onToggleSave: () => void }> = ({ sw, product, onView, onToggleSave }) => {
  const supplier = companyById(sw.store, product.companyId);
  const saved = isProductSaved(sw.store, sw.company.id, product.id);
  const canSave = sw.can('contacts.manage');

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 transition-colors flex flex-col">
      <div className="h-32 bg-slate-100 overflow-hidden cursor-pointer" onClick={onView}>
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300"><FileText className="w-10 h-10" /></div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-sm font-semibold text-slate-900 truncate cursor-pointer hover:text-blue-700" onClick={onView}>{product.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{product.type} · {product.brand}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{product.category}</span>
          {supplier?.verification.status === 'verified' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5" />Verified</span>
          )}
        </div>
        {supplier && <p className="text-xs text-slate-400 mt-1.5 truncate">{supplier.profile.tradingName} · {supplier.profile.emirate}</p>}
        {product.specs.length > 0 && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{product.specs.slice(0, 2).map((s) => `${s.label}: ${s.value}`).join(' · ')}</p>}
        <div className="flex items-center gap-1.5 mt-3 pt-1">
          <button type="button" onClick={onView} className={`${btnGhost} text-xs flex-1`}>
            <Eye className="w-3.5 h-3.5" /> Details
          </button>
          {canSave && (
            <button type="button" onClick={onToggleSave} className={`${btnGhost} text-xs`} title={saved ? 'Remove from saved' : 'Save to company'}>
              {saved ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Bookmark className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProductDiscovery: React.FC<{ sw: SW; onStartMessageWith: (userId: string, name: string) => void }> = ({ sw }) => {
  const [tab, setTab] = useState<FilterTab>('all');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [viewProduct, setViewProduct] = useState<CompanyProduct | null>(null);
  const [profileSupplierId, setProfileSupplierId] = useState<string | null>(null);

  // All published products from all supplier companies (not own company)
  const allProducts = useMemo(() =>
    sw.store.products.filter((p) => p.status === 'active' && p.companyId !== sw.company.id),
    [sw.store.products, sw.company.id],
  );

  const categories = useMemo(() => Array.from(new Set(allProducts.map((p) => p.category))).sort(), [allProducts]);
  const brands = useMemo(() => Array.from(new Set(allProducts.map((p) => p.brand).filter(Boolean))).sort(), [allProducts]);
  const suppliers = useMemo(() =>
    sw.store.companies.filter((c) => c.kind === 'supplier' && allProducts.some((p) => p.companyId === c.id)),
    [sw.store.companies, allProducts],
  );

  const savedProductIds = useMemo(() =>
    new Set(sw.store.savedProducts.filter((s) => s.companyId === sw.company.id).map((s) => s.productId)),
    [sw.store.savedProducts, sw.company.id],
  );

  const filtered = useMemo(() => {
    let results = allProducts;
    if (tab === 'saved') results = results.filter((p) => savedProductIds.has(p.id));
    if (verifiedOnly) {
      results = results.filter((p) => {
        const c = companyById(sw.store, p.companyId);
        return c?.verification.status === 'verified';
      });
    }
    if (category) results = results.filter((p) => p.category === category);
    if (brand) results = results.filter((p) => p.brand === brand);
    if (supplierId) results = results.filter((p) => p.companyId === supplierId);
    if (q.trim()) {
      const query = q.toLowerCase();
      results = results.filter((p) => {
        const supplier = companyById(sw.store, p.companyId);
        return p.name.toLowerCase().includes(query) ||
          p.type.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.specs.some((s) => `${s.label} ${s.value}`.toLowerCase().includes(query)) ||
          (supplier?.profile.tradingName.toLowerCase().includes(query) ?? false);
      });
    }
    return results;
  }, [allProducts, tab, savedProductIds, verifiedOnly, category, brand, supplierId, q, sw.store]);

  const handleView = (product: CompanyProduct) => {
    const updatedStore = trackProductView(sw.ctx, product.id);
    sw.setStore(updatedStore);
    setViewProduct(product);
  };

  const handleToggleSave = (product: CompanyProduct) => {
    const res = toggleSavedProduct(sw.ctx, product.id);
    if (res.ok) {
      sw.setStore(res.store);
      const wasSaved = savedProductIds.has(product.id);
      sw.notify(wasSaved ? `Removed "${product.name}" from saved` : `Saved "${product.name}" to company workspace`);
    }
  };

  const hasFilters = q.trim() || category || brand || supplierId || verifiedOnly || tab === 'saved';

  return (
    <div>
      <PageHeader
        eyebrow="Discovery"
        title="Product & Supplier Discovery"
        subtitle="Discover construction products, materials and services from suppliers across the SOKO network."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Available Products" value={allProducts.length} />
        <KpiCard label="Verified Suppliers" value={suppliers.filter((s) => s.verification.status === 'verified').length} />
        <KpiCard label="Categories" value={categories.length} />
        <KpiCard label="Saved Products" value={savedProductIds.size} />
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products, brands, specifications or suppliers..."
          className={`${inputCls} pl-11 text-base`}
        />
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <SubTabs
          tabs={[
            { id: 'all' as FilterTab, label: 'All Products', count: allProducts.length },
            { id: 'saved' as FilterTab, label: 'Saved', count: savedProductIds.size },
            { id: 'verified' as FilterTab, label: 'Verified Suppliers', count: allProducts.filter((p) => companyById(sw.store, p.companyId)?.verification.status === 'verified').length },
          ]}
          value={tab}
          onChange={(t) => { setTab(t); setVerifiedOnly(t === 'verified'); }}
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} py-1.5 text-sm w-auto`}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={brand} onChange={(e) => setBrand(e.target.value)} className={`${inputCls} py-1.5 text-sm w-auto`}>
          <option value="">All brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${inputCls} py-1.5 text-sm w-auto`}>
          <option value="">All suppliers</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.profile.tradingName}</option>)}
        </select>
        {hasFilters && (
          <button type="button" onClick={() => { setQ(''); setCategory(''); setBrand(''); setSupplierId(''); setVerifiedOnly(false); setTab('all'); }} className={`${btnGhost} text-sm`}>
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-5 h-5" />}
          title={hasFilters ? 'No products match your filters' : 'No products available'}
          text={hasFilters ? 'Try adjusting your search or filters.' : 'No published supplier products are available yet. Try browsing by category below.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              sw={sw}
              product={p}
              onView={() => handleView(p)}
              onToggleSave={() => handleToggleSave(p)}
            />
          ))}
        </div>
      )}

      {/* Category suggestions when empty */}
      {filtered.length === 0 && !hasFilters && categories.length > 0 && (
        <Card title="Browse by category" className="mt-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-sm text-slate-700 font-medium transition-colors cursor-pointer">
                {c}
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-4">
        <DemoNote>SOKO is a supplier intelligence and professional discovery platform. Product discovery helps you find and save products — it is not an ecommerce marketplace. Contact suppliers directly for quotations.</DemoNote>
      </div>

      {viewProduct && (
        <ProductDetailModal
          sw={sw}
          product={viewProduct}
          onClose={() => setViewProduct(null)}
          onOpenSupplier={(id) => { setViewProduct(null); setProfileSupplierId(id); }}
        />
      )}
      {profileSupplierId && (
        <SupplierProfileModal supplierId={profileSupplierId} onClose={() => setProfileSupplierId(null)} />
      )}
    </div>
  );
};
