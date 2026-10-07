import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, Clock, Info, MapPin, MessageSquare, Share2, Sparkles, Users } from 'lucide-react';
import {
  BuyerSupplier,
  STATUS_META,
  activeCertifications,
  formatDate,
  matchSupplier,
  queryTokens,
  similarSuppliers,
  supplierLocation,
  supplierTypeLine,
  tradeLicenseLabel,
} from '../data/buyerSuppliers';
import { ExternalSourceBadge, IntelligenceValue, SupplierLogo, SupplierStatusBadge } from './SupplierTrust';
import { CertificationsTab, ContactsTab, IntelligenceTab, OverviewTab, ProductsTab } from './SupplierProfileTabs';

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

const SignalCard: React.FC<{ label: string; children: React.ReactNode; allowOverflow?: boolean }> = ({ label, children, allowOverflow }) => (
  <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 min-w-0">
    <p className="text-[11px] text-slate-500">{label}</p>
    <div className={`text-sm font-semibold text-slate-900 ${allowOverflow ? '' : 'truncate'}`}>{children}</div>
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        Back to suppliers
      </button>

      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <SupplierLogo supplier={s} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
              {s.name}
              {s.status === 'verified' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-label="SOKO Verified" />}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-600">
              <SupplierStatusBadge status={s.status} size="md" />
              {s.externalSourceFields && <ExternalSourceBadge />}
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {supplierLocation(s)}
              </span>
              <span>{supplierTypeLine(s)}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-800">{s.categories.join(' | ')}</p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">{s.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {s.contacts.length > 0 && (
                <button type="button" onClick={onContact} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer">
                  <MessageSquare className="w-4 h-4" />
                  Contact Supplier
                </button>
              )}
              <button
                type="button"
                onClick={onToggleSave}
                aria-pressed={saved}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                  saved ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {saved ? 'Saved' : 'Save Supplier'}
              </button>
              <button type="button" onClick={share} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              {s.contacts.length > 0 && (
                <button type="button" onClick={() => setTab('contacts')} className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                  <Users className="w-4 h-4" />
                  View Digital Business Card / Contacts
                </button>
              )}
            </div>
          </div>
        </div>
        <StatusNotice supplier={s} />
      </section>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <SignalCard label="SOKO Intelligence" allowOverflow>
          <IntelligenceValue score={s.intelligenceScore} align="left" />
        </SignalCard>
        <SignalCard label="Trade License">
          <span className={s.tradeLicense.status === 'verified' ? 'text-emerald-700' : s.tradeLicense.status === 'expired' ? 'text-red-700' : ''}>
            {tradeLicenseLabel(s)}
          </span>
        </SignalCard>
        <SignalCard label="Supplier Documentation">{s.documentationPct}%</SignalCard>
        <SignalCard label="Active Certifications">{activeCertifications(s)}</SignalCard>
        <SignalCard label="Products">{s.products.length}</SignalCard>
        <SignalCard label="Last Verified">{formatDate(s.lastVerified)}</SignalCard>
      </div>

      {matchQuery && <WhyMatched supplier={s} query={matchQuery} />}

      <div className="mt-6 border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max" role="tablist" aria-label="Supplier profile sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 sm:px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
                tab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-5" role="tabpanel">
        {tab === 'overview' && <OverviewTab supplier={s} />}
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
