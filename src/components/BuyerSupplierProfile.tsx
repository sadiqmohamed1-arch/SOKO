import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, Clock, ExternalLink, Info, MapPin, MessageSquare, Share2, Sparkles } from 'lucide-react';
import { CommunityContact } from '../types';
import {
  BuyerSupplier,
  STATUS_META,
  SupplierContact,
  formatDate,
  matchSupplier,
  queryTokens,
  supplierLocation,
  supplierPlan,
  SUPPLIER_SHARE_PARAM,
  supplierSokoId,
} from '../data/buyerSuppliers';
import { BuyerVault, VaultDocument, buyerVault } from '../data/supplierVault';
import { ExternalSourceBadge, SupplierLogo, SupplierStatusBadge } from './SupplierTrust';
import { ShareProfileDialog, SokoIdCard } from './SupplierIdentityCard';
import { CompanyAtAGlance, KeyContacts, SimilarSuppliers, SokoInformation, WhatWeSupply, websiteHref } from './SupplierProfileSections';
import { AllDocumentsDialog, DocumentDetailDialog, DocumentsSection, ExternalCatalogues, RequestPackDialog, downloadDemoDocument } from './SupplierDocuments';

export type ProfileTab = 'overview' | 'products' | 'documents' | 'contacts' | 'intelligence';

const SECTION_FOR_TAB: Record<ProfileTab, string | null> = {
  overview: null,
  products: 'profile-supply',
  documents: 'profile-documents',
  contacts: 'profile-contacts',
  intelligence: 'profile-soko-info',
};

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

interface BuyerSupplierProfileProps {
  supplier: BuyerSupplier;
  matchQuery: string;
  initialTab: ProfileTab;
  saved: boolean;
  networkContacts: CommunityContact[];
  onUpdateNetworkContacts: (contacts: CommunityContact[]) => void;
  onBack: () => void;
  onToggleSave: () => void;
  onContact: () => void;
  onOpenSupplier: (id: string) => void;
  onRequestContact: () => void;
  onNotify: (message: string) => void;
}

const VERIFIED_EXPLAINER =
  'Supplier information and required documentation have been reviewed according to the SOKO verification process. This is not a commercial approval or a performance guarantee.';

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
        <span id="verification-explainer" role="tooltip" className="absolute left-0 top-full mt-1.5 z-40 w-72 rounded-md bg-slate-900 px-3 py-2 text-xs leading-snug text-white shadow-lg">
          {text}
          {s.status === 'verified' && s.lastVerified && <span className="block mt-1 text-slate-300">Last verified {formatDate(s.lastVerified)}</span>}
        </span>
      )}
    </span>
  );
};

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
        <p className="font-semibold">{STATUS_META[s.status].label}</p>
        <p className="mt-0.5 opacity-90">{STATUS_META[s.status].description}</p>
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
  const tokens = queryTokens(query);
  const match = matchSupplier(s, tokens);
  if (!match || !tokens.length) return null;
  const factors = [
    { label: 'Category Match', on: match.categoryMatch || match.capabilityMatch },
    { label: 'Product Match', on: match.relevantProducts.length > 0 },
    { label: 'Brand Match', on: match.brandMatch },
    { label: 'Verification Status', on: s.status === 'verified' },
  ];
  return (
    <section className="mt-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-xs font-semibold text-gold-900 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Matched your search for "{query}"
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {factors
          .filter((f) => f.on)
          .map((f) => (
            <li key={f.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-white border-gold-200 text-slate-800">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {f.label}
            </li>
          ))}
      </ul>
    </section>
  );
};

const networkId = (s: BuyerSupplier, c: SupplierContact) => `supplier_${s.id}_${c.id}`;

const toNetworkContact = (s: BuyerSupplier, c: SupplierContact): CommunityContact => {
  const phone = c.visibility === 'public' ? c.phone ?? '' : '';
  return {
    id: networkId(s, c),
    name: c.name,
    title: c.title,
    company: s.name,
    role: 'supplier',
    category: c.category,
    avatarUrl: DEFAULT_AVATAR,
    location: c.location,
    phone,
    whatsappNumber: phone,
    email: c.email ?? '',
    website: s.website,
    verified: s.status === 'verified',
    bio: `${c.title} at ${s.name}.`,
    isMaintained: true,
    tags: ['Supplier Directory'],
    accessStatus: 'direct',
    connectionStatus: 'connected',
    connectedDate: 'Saved just now',
    products: s.capabilities.slice(0, 3),
  };
};

const actionBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer';

export const BuyerSupplierProfile: React.FC<BuyerSupplierProfileProps> = ({
  supplier: s,
  matchQuery,
  initialTab,
  saved,
  networkContacts,
  onUpdateNetworkContacts,
  onBack,
  onToggleSave,
  onContact,
  onOpenSupplier,
  onRequestContact,
  onNotify,
}) => {
  const vault = buyerVault(s);
  const isPro = supplierPlan(s) === 'pro';
  const [shareOpen, setShareOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState<{ pack?: BuyerVault['packs'][number] } | null>(null);
  const [packsOpen, setPacksOpen] = useState(false);
  const [openDoc, setOpenDoc] = useState<VaultDocument | null>(null);

  useEffect(() => {
    const sectionId = SECTION_FOR_TAB[initialTab];
    if (!sectionId) return;
    const t = window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => window.clearTimeout(t);
  }, [initialTab]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(SUPPLIER_SHARE_PARAM, supplierSokoId(s));
    window.history.replaceState(window.history.state, '', url);
    return () => {
      const current = new URL(window.location.href);
      current.searchParams.delete(SUPPLIER_SHARE_PARAM);
      window.history.replaceState(window.history.state, '', current);
    };
  }, [s]);

  const isContactSaved = (c: SupplierContact) => networkContacts.some((n) => n.id === networkId(s, c) && n.connectionStatus === 'connected');

  const toggleContact = (c: SupplierContact) => {
    const id = networkId(s, c);
    const existing = networkContacts.find((n) => n.id === id);
    if (!existing) {
      onUpdateNetworkContacts([toNetworkContact(s, c), ...networkContacts]);
      onNotify(`${c.name} saved to My Network`);
      return;
    }
    const nowSaved = existing.connectionStatus !== 'connected';
    onUpdateNetworkContacts(
      networkContacts.map((n) =>
        n.id === id ? (nowSaved ? toNetworkContact(s, c) : { ...n, connectionStatus: 'not_connected', isMaintained: false }) : n
      )
    );
    onNotify(nowSaved ? `${c.name} saved to My Network` : `${c.name} removed from My Network`);
  };

  const requestDocument = (label: string) => onNotify(`Request for ${label} sent to ${s.name}`);
  const downloadDocument = (d: VaultDocument) => {
    downloadDemoDocument(s, d);
    onNotify(`Downloading ${d.name}`);
  };

  const docActions = { onOpen: setOpenDoc, onDownload: downloadDocument };
  const idCard = <SokoIdCard supplier={s} onShare={() => setShareOpen(true)} onNotify={onNotify} />;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 min-h-10 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        Back to suppliers
      </button>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <SupplierLogo supplier={s} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">{s.name}</h1>
                <VerificationBadge supplier={s} />
                {s.externalSourceFields && <ExternalSourceBadge />}
                {isPro && (
                  <span className="inline-flex items-center rounded-md border border-gold-200 bg-gold-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-700">
                    SOKO Pro
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-800">
                {s.types.join(', ')} · {s.categories.join(', ')}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-600">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {supplierLocation(s)}
                {s.website && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <a
                      href={websiteHref(s.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      Visit Website
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl line-clamp-3">{s.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2 shrink-0">
            {s.contacts.length > 0 && (
              <button type="button" onClick={onContact} className={`${actionBtn} col-span-2 bg-blue-700 hover:bg-blue-800 text-white`}>
                <MessageSquare className="w-4 h-4" />
                Contact
              </button>
            )}
            <button
              type="button"
              onClick={onToggleSave}
              aria-pressed={saved}
              className={`${actionBtn} border ${saved ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {saved ? 'Saved' : 'Save Supplier'}
            </button>
            <button type="button" onClick={() => setShareOpen(true)} className={`${actionBtn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
              <Share2 className="w-4 h-4" />
              Share Profile
            </button>
          </div>
        </div>
        <StatusNotice supplier={s} />
      </section>

      {matchQuery && <WhyMatched supplier={s} query={matchQuery} />}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="lg:hidden">{idCard}</div>
          <CompanyAtAGlance supplier={s} />
          <WhatWeSupply supplier={s} />
          <KeyContacts supplier={s} initiallyExpanded={initialTab === 'contacts'} isSaved={isContactSaved} onToggleSave={toggleContact} onRequestContact={onRequestContact} />
          {vault ? (
            <DocumentsSection vault={vault} onViewAll={() => setDocsOpen({})} onRequestPack={() => setPacksOpen(true)} {...docActions} />
          ) : (
            <ExternalCatalogues supplier={s} />
          )}
        </div>
        <aside className="space-y-6 min-w-0 lg:sticky lg:top-20">
          <div className="hidden lg:block">{idCard}</div>
          <SokoInformation supplier={s} vault={vault} />
        </aside>
      </div>

      <SimilarSuppliers supplier={s} onOpenSupplier={onOpenSupplier} />

      {shareOpen && <ShareProfileDialog supplier={s} onClose={() => setShareOpen(false)} onNotify={onNotify} />}
      {vault && packsOpen && (
        <RequestPackDialog
          supplier={s}
          vault={vault}
          onClose={() => setPacksOpen(false)}
          onViewPack={(pack) => {
            setPacksOpen(false);
            setDocsOpen({ pack });
          }}
          onRequest={(label) => {
            setPacksOpen(false);
            requestDocument(label);
          }}
        />
      )}
      {vault && docsOpen && !openDoc && <AllDocumentsDialog supplier={s} vault={vault} pack={docsOpen.pack} onClose={() => setDocsOpen(null)} {...docActions} />}
      {openDoc && <DocumentDetailDialog doc={openDoc} onClose={() => setOpenDoc(null)} onDownload={downloadDocument} />}
    </div>
  );
};
