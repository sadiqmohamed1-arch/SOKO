import React, { useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, Clock, Info, MapPin, MessageSquare, Share2, Sparkles } from 'lucide-react';
import {
  BuyerSupplier,
  STATUS_META,
  activeCertifications,
  formatDate,
  freshnessLabel,
  matchSupplier,
  queryTokens,
  similarSuppliers,
  supplierLocation,
  supplierTypeLine,
} from '../data/buyerSuppliers';
import { ExternalSourceBadge, IntelligenceValue, SupplierLogo, SupplierStatusBadge } from './SupplierTrust';
import { CertificationsTab, ContactsTab, IntelligenceTab, ProductsTab } from './SupplierProfileTabs';
import { OverviewTab } from './SupplierProfileOverview';

export type ProfileTab = 'overview' | 'products' | 'documents' | 'contacts' | 'intelligence';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'documents', label: 'Certifications & Documents' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'intelligence', label: 'SOKO Intelligence' },
];

interface BuyerSupplierProfileProps {
  supplier: BuyerSupplier;
  matchQuery: string;
  initialTab: ProfileTab;
  saved: boolean;
  onBack: () => void;
  onToggleSave: () => void;
  onContact: () => void;
  onOpenSupplier: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
  onRequestContact: () => void;
  onNotify: (message: string) => void;
}

const NAVBAR_HEIGHT = 64;

const VERIFIED_EXPLAINER =
  'Supplier information and required documentation have been reviewed according to the SOKO verification process. This is not a commercial approval or a performance guarantee.';

const verificationFreshness = (s: BuyerSupplier) => {
  if (s.status === 'verified') return s.lastVerified ? `Last verified ${formatDate(s.lastVerified)}` : 'Verification date not recorded';
  if (s.status === 'pending') return 'Verification in progress';
  if (s.status === 'update-required') return 'Verification update required';
  return 'Not yet verified by SOKO';
};

const VerificationBadge: React.FC<{ supplier: BuyerSupplier }> = ({ supplier: s }) => {
  const [open, setOpen] = useState(false);
  const text = s.status === 'verified' ? VERIFIED_EXPLAINER : STATUS_META[s.status].description;
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-describedby={open ? 'verification-explainer' : undefined}
        className="inline-flex cursor-help rounded-md focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        <SupplierStatusBadge status={s.status} size="md" />
      </button>
      {open && (
        <span
          id="verification-explainer"
          role="tooltip"
          className="absolute left-0 top-full mt-1.5 z-40 w-72 rounded-md bg-slate-900 px-3 py-2 text-xs leading-snug text-white shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
};

const SummaryItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0 px-4 py-3 border-slate-100 border-b lg:border-b-0 lg:border-r last:border-r-0">
    <dt className="text-[11px] text-slate-500">{label}</dt>
    <dd className="mt-0.5 text-sm font-semibold text-slate-900">{children}</dd>
  </div>
);

const StatusNotice: React.FC<{ supplier: BuyerSupplier }> = ({ supplier: s }) => {
  if (s.status === 'verified') return null;
  const tone =
    s.status === 'update-required'
      ? { cls: 'bg-red-50 border-red-200 text-red-900', icon: AlertTriangle }
      : s.status === 'pending'
        ? { cls: 'bg-amber-50 border-amber-200 text-amber-900', icon: Clock }
        : { cls: 'bg-slate-50 border-slate-200 text-slate-800', icon: Info };
  const Icon = tone.icon;
  return (
    <div className={`mt-4 rounded-lg border px-4 py-3 flex gap-3 ${tone.cls}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">
          {STATUS_META[s.status].label}
          {s.status === 'listed' && ' · Limited information available'}
        </p>
        <p className="mt-0.5 opacity-90">
          {s.status === 'listed'
            ? `Profile completeness: ${s.profileCompletenessPct}%. This supplier has not yet completed SOKO verification.`
            : STATUS_META[s.status].description}
        </p>
        {s.externalSourceFields && (
          <p className="mt-1 text-xs opacity-80">
            Identified from external sources: {s.externalSourceFields.join(', ')}. This information has not been reviewed by SOKO.
          </p>
        )}
      </div>
    </div>
  );
};

const WhyMatched: React.FC<{ supplier: BuyerSupplier; query: string }> = ({ supplier: s, query }) => {
  const match = matchSupplier(s, queryTokens(query));
  if (!match || !queryTokens(query).length) return null;
  const docsAvailable = s.documentationPct >= 70;
  const factors = [
    { label: 'Category Match', on: match.categoryMatch || match.capabilityMatch },
    { label: match.relevantProducts.length ? `Product Match (${match.relevantProducts.length})` : 'Product Match', on: match.relevantProducts.length > 0 },
    { label: 'Brand Match', on: match.brandMatch },
    { label: 'Documentation Availability', on: docsAvailable },
    { label: 'Verification Status', on: s.status === 'verified' },
  ];
  const parts = [
    match.relevantProducts.length
      ? `it lists ${match.relevantProducts.length} relevant ${match.relevantProducts.length === 1 ? 'product' : 'products'}`
      : match.categoryMatch || match.capabilityMatch
        ? 'its categories and capabilities match'
        : match.brandMatch
          ? 'it carries a matching brand'
          : 'its company information matches',
    `operates in ${s.regionsServed.slice(0, 2).join(' and ')}`,
    docsAvailable ? 'has available technical documentation' : 'has limited documentation on SOKO',
  ];
  return (
    <section className="mt-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3">
      <p className="text-xs font-semibold text-gold-900 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Why this supplier matched
      </p>
      <p className="mt-1 text-sm text-slate-700">
        This supplier matched your search for "{query}" because {parts.slice(0, -1).join(', ')} and {parts[parts.length - 1]}.
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {factors.map((f) => (
          <li
            key={f.label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
              f.on ? 'bg-white border-gold-200 text-slate-800' : 'bg-transparent border-slate-200 text-slate-400'
            }`}
          >
            {f.on && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
            {f.label}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const BuyerSupplierProfile: React.FC<BuyerSupplierProfileProps> = ({
  supplier: s,
  matchQuery,
  initialTab,
  saved,
  onBack,
  onToggleSave,
  onContact,
  onOpenSupplier,
  onNavigateToTab,
  onRequestContact,
  onNotify,
}) => {
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  const tabsAnchorRef = useRef<HTMLDivElement>(null);
  const similar = similarSuppliers(s);

  const share = async () => {
    const text = `${s.name} on SOKO: ${s.categories.join(', ')} supplier in ${supplierLocation(s)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: s.name, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      onNotify('Supplier details copied to clipboard');
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) onNotify('Sharing is not available on this device');
    }
  };

  const openTab = (next: ProfileTab) => {
    setTab(next);
    const anchor = tabsAnchorRef.current;
    if (!anchor) return;
    const top = anchor.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        Back to suppliers
      </button>

      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
          <SupplierLogo supplier={s} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">{s.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <VerificationBadge supplier={s} />
              {s.externalSourceFields && <ExternalSourceBadge />}
              <span className="text-xs text-slate-500">{verificationFreshness(s)}</span>
            </div>
            <p className="mt-2 flex items-start gap-1 text-sm text-slate-600">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{`${supplierLocation(s)} \u00b7 ${supplierTypeLine(s)}`}</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{s.categories.join(' \u00b7 ')}</p>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-3xl">{s.description}</p>
          </div>
          <div className="flex flex-wrap md:flex-col md:items-stretch gap-2 md:w-48 shrink-0">
            {s.contacts.length > 0 && (
              <button type="button" onClick={onContact} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer">
                <MessageSquare className="w-4 h-4" />
                Contact Supplier
              </button>
            )}
            <button
              type="button"
              onClick={onToggleSave}
              aria-pressed={saved}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                saved ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {saved ? 'Saved' : 'Save Supplier'}
            </button>
            <button type="button" onClick={share} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
        <StatusNotice supplier={s} />
      </section>

      <dl className="mt-3 bg-white rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryItem label="SOKO Intelligence">
          <IntelligenceValue score={s.intelligenceScore} align="left" />
        </SummaryItem>
        <SummaryItem label="Supplier Documentation">{s.documentationPct}% Complete</SummaryItem>
        <SummaryItem label="Certifications">{activeCertifications(s)} Active</SummaryItem>
        <SummaryItem label="Products">{s.products.length}</SummaryItem>
        <SummaryItem label="Information Freshness">{freshnessLabel(s.updatedDaysAgo)}</SummaryItem>
      </dl>

      {matchQuery && <WhyMatched supplier={s} query={matchQuery} />}

      <div ref={tabsAnchorRef} />
      <div className="sticky top-16 z-30 mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-slate-100/95 backdrop-blur-sm">
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Supplier profile sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => openTab(t.id)}
              className={`px-3 sm:px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
                tab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-5" role="tabpanel">
        {tab === 'overview' && (
          <OverviewTab supplier={s} onOpenTab={openTab} onViewProduct={() => onNavigateToTab('products')} onRequestContact={onRequestContact} />
        )}
        {tab === 'products' && <ProductsTab supplier={s} onNavigateToTab={onNavigateToTab} onContact={onContact} onNotify={onNotify} />}
        {tab === 'documents' && <CertificationsTab supplier={s} />}
        {tab === 'contacts' && <ContactsTab supplier={s} onNavigateToTab={onNavigateToTab} onRequestContact={onRequestContact} onNotify={onNotify} />}
        {tab === 'intelligence' && <IntelligenceTab supplier={s} />}
      </div>

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-slate-900">Similar Suppliers</h2>
          <p className="text-xs text-slate-500 mt-0.5">Based on category, products, brands and location. Not influenced by paid placement.</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {similar.map((sim) => (
              <article key={sim.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start gap-3">
                  <SupplierLogo supplier={sim} size="sm" />
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenSupplier(sim.id)}
                      className="block max-w-full text-left text-sm font-semibold text-slate-900 hover:text-blue-700 truncate cursor-pointer"
                    >
                      {sim.name}
                    </button>
                    <p className="text-xs text-slate-500 truncate">
                      {supplierLocation(sim)} · {sim.categories.join(' | ')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <SupplierStatusBadge status={sim.status} />
                  <IntelligenceValue score={sim.intelligenceScore} />
                </div>
                <button
                  type="button"
                  onClick={() => onOpenSupplier(sim.id)}
                  className="mt-3 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                >
                  View Supplier
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
