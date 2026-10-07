import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, CheckCircle2, FileText, Lock, Search, Share2, ShieldCheck } from 'lucide-react';
import {
  BuyerSupplier,
  SupplierCertification,
  formatDate,
  intelligenceSignals,
  supplierLocation,
  supplierTypeLine,
  tradeLicenseLabel,
} from '../data/buyerSuppliers';
import { ContactActions } from './ContactSupplierModal';
import { ExternalSourceBadge, InfoTooltip, INTELLIGENCE_EXPLAINER } from './SupplierTrust';

const PRODUCT_INTELLIGENCE_INFO =
  'Based on documentation completeness, supplier verification, product information and SOKO network activity.';

const Panel: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode; className?: string }> = ({ title, children, aside, className = '' }) => (
  <section className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

const Chips: React.FC<{ items: string[]; empty?: string }> = ({ items, empty = 'Not provided' }) =>
  items.length ? (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <li key={i} className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
          {i}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-400">{empty}</p>
  );

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0">
    <dt className="text-sm text-slate-500">{label}</dt>
    <dd className="text-sm font-semibold text-slate-900 text-right">{children}</dd>
  </div>
);

const useStoredIds = (key: string) => {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(ids)), [key, ids]);
  const toggle = (id: string) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  return [ids, toggle] as const;
};

export const OverviewTab: React.FC<{ supplier: BuyerSupplier }> = ({ supplier: s }) => {
  const external = (field: string) => s.externalSourceFields?.includes(field) && <ExternalSourceBadge />;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Panel title="About">
          <p className="text-sm text-slate-700 leading-relaxed">{s.description}</p>
        </Panel>
        <Panel title="Supplier Capabilities">
          <Chips items={s.capabilities} />
        </Panel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Panel title="Categories">
            <Chips items={[...s.categories, ...s.subcategories.slice(0, 2)]} />
          </Panel>
          <Panel title="Brands">
            <Chips items={s.brands} empty="No brands listed" />
          </Panel>
          <Panel title="Markets Served">
            <Chips items={[s.countryCode === 'AE' ? 'UAE' : s.country, ...s.regionsServed]} />
          </Panel>
        </div>
      </div>
      <div className="space-y-4">
        <Panel title="Company Information">
          <dl>
            <Row label="Company Type">{supplierTypeLine(s)}</Row>
            <Row label="Established">{s.established ?? 'Not provided'}</Row>
            <Row label="Headquarters">
              <span className="inline-flex flex-col items-end gap-1">
                {supplierLocation(s)}
                {external('Location')}
              </span>
            </Row>
            <Row label="Website">{s.website ?? 'Not provided'}</Row>
            <Row label="General Email">{s.generalEmail ?? 'Not provided'}</Row>
          </dl>
        </Panel>
        <Panel title="Verification Summary">
          <dl>
            <Row label="Trade License">{tradeLicenseLabel(s)}</Row>
            <Row label="Company Information">{s.companyInfoVerified ? 'Verified' : 'Not yet verified'}</Row>
            <Row label="Documentation">{s.documentationPct}% Complete</Row>
            <Row label="Last Verification">{formatDate(s.lastVerified)}</Row>
          </dl>
          <p className="mt-3 text-[11px] text-slate-400">Confidential company documents are never shown to buyers.</p>
        </Panel>
      </div>
    </div>
  );
};

export const ProductsTab: React.FC<{
  supplier: BuyerSupplier;
  onNavigateToTab: (tab: string) => void;
  onContact: () => void;
  onNotify: (message: string) => void;
}> = ({ supplier: s, onNavigateToTab, onContact, onNotify }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [brand, setBrand] = useState('all');
  const [docs, setDocs] = useState<'all' | 'tds' | 'missing'>('all');
  const [savedProducts, toggleProduct] = useStoredIds('soko_buyer_saved_products_v1');

  const categories = Array.from(new Set(s.products.map((p) => p.category)));
  const brands = Array.from(new Set(s.products.map((p) => p.brand)));
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return s.products.filter(
      (p) =>
        (!q || `${p.name} ${p.type} ${p.brand}`.toLowerCase().includes(q)) &&
        (category === 'all' || p.category === category) &&
        (brand === 'all' || p.brand === brand) &&
        (docs === 'all' || (docs === 'tds' ? p.technicalDatasheet : !p.technicalDatasheet))
    );
  }, [s.products, query, category, brand, docs]);

  if (!s.products.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-slate-900">No products listed yet</p>
        <p className="text-sm text-slate-500 mt-1">This supplier has not added products to SOKO.</p>
      </div>
    );
  }

  const selectCls = 'px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer';

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <h3 className="text-base font-semibold text-slate-900 shrink-0">{s.products.length} Products</h3>
        <label className="relative flex-1">
          <span className="sr-only">Search this supplier's products</span>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this supplier's products..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={selectCls}>
            <option value="all">All brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select aria-label="Documentation" value={docs} onChange={(e) => setDocs(e.target.value as typeof docs)} className={selectCls}>
            <option value="all">All documentation</option>
            <option value="tds">Datasheet available</option>
            <option value="missing">Datasheet missing</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="bg-white rounded-xl border border-slate-200 px-6 py-8 text-center text-sm text-slate-500">No products match these filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((p) => {
            const saved = savedProducts.includes(p.id);
            return (
              <article key={p.id} className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col">
                <img src={p.imageUrl} alt={p.name} className="h-32 w-full object-cover rounded-t-xl" loading="lazy" />
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.type}</p>
                  <dl className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between"><dt className="text-slate-500">Brand</dt><dd className="font-semibold text-slate-800">{p.brand}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Technical Datasheet</dt><dd className={`font-semibold ${p.technicalDatasheet ? 'text-emerald-700' : 'text-slate-500'}`}>{p.technicalDatasheet ? 'Available' : 'Not available'}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Certifications</dt><dd className={`font-semibold ${p.certifications ? 'text-emerald-700' : 'text-slate-500'}`}>{p.certifications ? 'Available' : 'Not available'}</dd></div>
                    {p.intelligenceScore !== undefined && (
                      <div className="flex justify-between items-center">
                        <dt className="text-slate-500 inline-flex items-center gap-1">
                          Product Intelligence
                          <InfoTooltip text={PRODUCT_INTELLIGENCE_INFO} label="About Product Intelligence" align="left" />
                        </dt>
                        <dd className="font-semibold text-slate-900">{p.intelligenceScore} <span className="text-slate-400 font-normal">/ 100</span></dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 mt-auto">
                    <button type="button" onClick={() => onNavigateToTab('products')} className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer">
                      View Product
                    </button>
                    <button
                      type="button"
                      aria-pressed={saved}
                      onClick={() => {
                        toggleProduct(p.id);
                        onNotify(saved ? `Removed ${p.name} from saved products` : `Saved ${p.name}`);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${saved ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                      {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      {saved ? 'Saved' : 'Save'}
                    </button>
                    {s.contacts.length > 0 && (
                      <button type="button" onClick={onContact} className="ml-auto text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                        Contact Supplier
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CERT_STATUS: Record<SupplierCertification['status'], { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'text-emerald-700' },
  pending: { label: 'Pending review', cls: 'text-amber-700' },
  expired: { label: 'Expired', cls: 'text-red-700' },
};

export const CertificationsTab: React.FC<{ supplier: BuyerSupplier }> = ({ supplier: s }) => {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const productsWithDocs = s.products.filter((p) => p.technicalDatasheet);
  return (
    <div className="space-y-4">
      <Panel title="Company Documents">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'Trade License', status: tradeLicenseLabel(s), expiry: s.tradeLicense.expiry },
            { name: 'Company Registration Information', status: s.companyInfoVerified ? 'Verified' : 'Not yet verified' },
          ].map((d) => (
            <div key={d.name} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                {d.name}
              </p>
              <dl className="mt-2 text-xs space-y-1">
                <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-slate-800">{d.status}</dd></div>
                {d.expiry && <div className="flex justify-between"><dt className="text-slate-500">Expiry</dt><dd className="font-semibold text-slate-800">{formatDate(d.expiry)}</dd></div>}
                <div className="flex justify-between"><dt className="text-slate-500">Access</dt><dd className="text-slate-600 inline-flex items-center gap-1"><Lock className="w-3 h-3" />Verification status only</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Certifications">
        {s.certifications.length ? (
          <ul className="divide-y divide-slate-100">
            {s.certifications.map((c) => (
              <li key={c.name} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.issuer}</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <span>Status: <span className={`font-semibold ${CERT_STATUS[c.status].cls}`}>{CERT_STATUS[c.status].label}</span></span>
                  {c.validUntil && <span className="text-slate-500">{c.status === 'expired' ? 'Expired' : 'Valid until'}: <span className="font-semibold text-slate-800">{formatDate(c.validUntil)}</span></span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No certifications submitted to SOKO yet.</p>
        )}
      </Panel>

      <Panel title="Product / Technical Documentation">
        {s.technicalDocuments.length ? (
          <ul className="divide-y divide-slate-100">
            {s.technicalDocuments.map((g) => (
              <li key={g.label} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold">{g.label}</span>
                    <span className="text-slate-500">({g.count})</span>
                  </p>
                  {g.access === 'public' && g.count > 0 ? (
                    <button
                      type="button"
                      onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                    >
                      {openGroup === g.label ? 'Hide' : 'View Documents'}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 inline-flex items-center gap-1"><Lock className="w-3 h-3" />{g.count ? 'Status only' : 'None submitted'}</span>
                  )}
                </div>
                {openGroup === g.label && (
                  <ul className="mt-2 ml-6 space-y-1">
                    {productsWithDocs.slice(0, g.count).map((p) => (
                      <li key={p.id} className="text-xs text-slate-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {p.name} · {g.label.replace(/s$/, '')} · Shared publicly by supplier
                      </li>
                    ))}
                    {g.count > productsWithDocs.length && (
                      <li className="text-xs text-slate-400">+{g.count - productsWithDocs.length} more in the full SOKO Product Profiles</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No technical documentation submitted to SOKO yet.</p>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Only documents the supplier has chosen to share publicly can be opened. Confidential documents show their status only.
        </p>
      </Panel>
    </div>
  );
};

export const ContactsTab: React.FC<{
  supplier: BuyerSupplier;
  onNavigateToTab: (tab: string) => void;
  onRequestContact: () => void;
  onNotify: (m: string) => void;
}> = ({ supplier: s, onNavigateToTab, onRequestContact, onNotify }) => {
  const [savedContacts, toggleContact] = useStoredIds('soko_buyer_saved_contacts_v1');
  if (!s.contacts.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-slate-900">No representatives shared yet</p>
        <p className="text-sm text-slate-500 mt-1">This supplier has not added contacts to SOKO.</p>
      </div>
    );
  }
  const share = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify('Contact details copied to clipboard');
    } catch {
      onNotify('Copying is not available on this device');
    }
  };
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {s.contacts.map((c) => {
          const saved = savedContacts.includes(c.id);
          return (
            <article key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {c.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-600">{c.title}</p>
                  <p className="text-xs text-slate-500">{s.name} · {c.location}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Category: <span className="font-semibold text-slate-700">{c.category}</span></p>
                </div>
              </div>
              <div className="mt-3">
                <ContactActions contact={c} onViewContact={() => onNavigateToTab('contacts')} onRequestContact={onRequestContact}>
                  {c.visibility !== 'on-request' && (
                    <>
                      <button
                        type="button"
                        aria-pressed={saved}
                        onClick={() => {
                          toggleContact(c.id);
                          onNotify(saved ? `Removed ${c.name} from saved contacts` : `Saved ${c.name} to My Network contacts`);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${saved ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        {saved ? 'Saved' : 'Save Contact'}
                      </button>
                      <button
                        type="button"
                        onClick={() => share(`${c.name}, ${c.title} at ${s.name}${c.email ? ` · ${c.email}` : ''}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </button>
                    </>
                  )}
                </ContactActions>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Contact details are shown according to each representative's privacy settings.</p>
    </div>
  );
};

const TONE: Record<string, string> = {
  good: 'text-emerald-700',
  warn: 'text-amber-700',
  neutral: 'text-slate-600',
};

export const IntelligenceTab: React.FC<{ supplier: BuyerSupplier }> = ({ supplier: s }) => (
  <div className="space-y-4">
    <section className="rounded-xl bg-slate-900 border border-gold-500/40 text-white p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gold-500" />
      <p className="text-[11px] font-semibold tracking-wider uppercase text-gold-300 flex items-center gap-1.5">
        SOKO Supplier Intelligence
        <InfoTooltip text={INTELLIGENCE_EXPLAINER} label="About SOKO Intelligence" align="left" />
      </p>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6">
        <p className="text-4xl font-semibold leading-none">
          {s.intelligenceScore}
          <span className="text-lg text-slate-400 font-normal"> / 100</span>
        </p>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          SOKO Intelligence summarizes available supplier information and activity to help Buyers research suppliers. It does not
          constitute supplier approval or a performance guarantee.
        </p>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Overall informational signal · Demo scoring for the prototype</p>
    </section>

    <Panel title="Contributing Signals">
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {intelligenceSignals(s).map((sig) => (
          <div key={sig.label} className="rounded-lg border border-slate-200 px-3 py-2.5">
            <dt className="text-[11px] text-slate-500">{sig.label}</dt>
            <dd className={`text-sm font-semibold ${TONE[sig.tone]}`}>{sig.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-500 leading-relaxed">
        SOKO does not currently rate financial health, delivery performance, product quality or safety, because it does not yet hold
        evidence for those dimensions. Paid visibility on SOKO never changes this signal or a supplier's verification status.
      </p>
    </Panel>
  </div>
);
