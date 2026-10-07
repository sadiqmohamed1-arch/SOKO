import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Download, ExternalLink, Eye, FileText, Lock, Package, Send } from 'lucide-react';
import { BuyerSupplier, formatDate } from '../data/buyerSuppliers';
import {
  DocumentPack,
  SupplierVault,
  VAULT_CATEGORIES,
  VISIBILITY_META,
  VaultDocument,
  canOpenDocument,
  expiryState,
  fileLabel,
} from '../data/supplierVault';
import { ProfileDialog } from './ProfileDialog';
import { ProfileCard, websiteHref } from './SupplierProfileSections';

const EXPIRY_META = {
  current: { label: 'Current', cls: 'text-emerald-700' },
  'no-expiry': { label: 'Current', cls: 'text-emerald-700' },
  expiring: { label: 'Expiring Soon', cls: 'text-amber-700' },
  expired: { label: 'Expired', cls: 'text-red-700' },
};

const VERIFICATION_LABEL: Record<VaultDocument['verification'], string> = {
  verified: 'Verified by SOKO',
  'supplier-provided': 'Supplier provided',
  pending: 'Review pending',
};

const docStatusLine = (d: VaultDocument) => {
  const meta = EXPIRY_META[expiryState(d)];
  return (
    <>
      <span className={`font-semibold ${meta.cls}`}>{meta.label}</span>
      {d.expiryDate && <span>{` · Expires ${formatDate(d.expiryDate)}`}</span>}
      {!d.expiryDate && <span>{` · Updated ${formatDate(d.lastUpdated)}`}</span>}
    </>
  );
};

const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer';

interface DocActions {
  onOpen: (d: VaultDocument) => void;
  onDownload: (d: VaultDocument) => void;
  onRequest: (label: string) => void;
}

const DocumentButtons: React.FC<{ doc: VaultDocument } & DocActions> = ({ doc, onOpen, onDownload, onRequest }) =>
  canOpenDocument(doc) ? (
    <div className="flex gap-2 shrink-0">
      <button type="button" onClick={() => onOpen(doc)} className={btnSecondary}>
        <Eye className="w-4 h-4" />
        View
      </button>
      <button type="button" onClick={() => onDownload(doc)} aria-label={`Download ${doc.name}`} className={btnSecondary}>
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Download</span>
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => onRequest(doc.name)} className={`${btnSecondary} shrink-0`}>
      <Send className="w-4 h-4" />
      Request
    </button>
  );

const SummaryStatus: React.FC<{ tone: 'green' | 'slate'; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-flex items-center gap-1 text-sm font-semibold ${tone === 'green' ? 'text-emerald-700' : 'text-slate-500'}`}>
    {tone === 'green' && <CheckCircle2 className="w-3.5 h-3.5" />}
    {children}
  </span>
);

const summaryRows = (vault: SupplierVault) => {
  const byType = (t: string) => vault.documents.filter((d) => d.type === t);
  const trade = byType('Trade License')[0];
  const iso = byType('ISO Certification').filter((d) => expiryState(d) !== 'expired');
  const available = (t: string) => (byType(t).length ? { tone: 'green' as const, text: 'Available' } : { tone: 'slate' as const, text: 'Not provided' });
  return [
    {
      label: 'Trade License',
      ...(trade
        ? trade.verification === 'verified' && expiryState(trade) !== 'expired'
          ? { tone: 'green' as const, text: 'Verified' }
          : { tone: 'slate' as const, text: EXPIRY_META[expiryState(trade)].label }
        : { tone: 'slate' as const, text: 'Not provided' }),
    },
    { label: 'VAT Certificate', ...available('VAT Certificate') },
    { label: 'ISO Certifications', ...(iso.length ? { tone: 'green' as const, text: `${iso.length} Active` } : { tone: 'slate' as const, text: 'None listed' }) },
    { label: 'Company Profile', ...available('Company Profile') },
    { label: 'Product Catalogue', ...available('Product Catalogue') },
  ];
};

interface DocumentsSectionProps extends DocActions {
  vault: SupplierVault;
  onViewAll: () => void;
  onRequestPack: () => void;
}

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({ vault, onViewAll, onRequestPack, ...actions }) => {
  const catalogues = vault.documents.filter((d) => d.featuredCatalogue).slice(0, 3);
  return (
    <ProfileCard
      id="profile-documents"
      title="Documents & Catalogues"
      action={<span className="text-xs font-semibold text-gold-700">{vault.documents.length} documents available</span>}
      className="border-t-2 border-t-gold-500"
    >
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {summaryRows(vault).map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt className="text-sm text-slate-700">{r.label}</dt>
            <dd>
              <SummaryStatus tone={r.tone}>{r.text}</SummaryStatus>
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          View Documents & Catalogues
        </button>
        <button type="button" onClick={onRequestPack} className={`${btnSecondary} min-h-11 px-4`}>
          <Package className="w-4 h-4" />
          Request Document Pack
        </button>
      </div>

      {catalogues.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Catalogues</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {catalogues.map((d) => (
              <li key={d.id} className="py-3 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                  <FileText className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                  <p className="text-xs text-slate-500">{fileLabel(d)}</p>
                </div>
                <DocumentButtons doc={d} {...actions} />
              </li>
            ))}
          </ul>
          <button type="button" onClick={onViewAll} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800 cursor-pointer group">
            View All Documents & Catalogues
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}
    </ProfileCard>
  );
};

export const ExternalCatalogues: React.FC<{ supplier: BuyerSupplier }> = ({ supplier: s }) => {
  const links = s.externalCatalogues ?? [];
  if (!links.length && !s.website) return null;
  return (
    <ProfileCard id="profile-documents" title="Catalogues">
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 min-h-12 rounded-xl border border-slate-200 px-4 py-2.5 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <FileText className="w-4 h-4 text-slate-500 group-hover:text-blue-700" />
              <span className="flex-1 text-sm font-semibold text-slate-900 group-hover:text-blue-700">{l.label}</span>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-700" />
            </a>
          </li>
        ))}
        {s.website && (
          <li>
            <a
              href={websiteHref(s.website)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 min-h-12 rounded-xl border border-slate-200 px-4 py-2.5 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-700" />
              <span className="flex-1 text-sm font-semibold text-slate-900 group-hover:text-blue-700">{s.website}</span>
              <span className="text-xs text-slate-500">Website</span>
            </a>
          </li>
        )}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Catalogues open on the supplier's own website.</p>
    </ProfileCard>
  );
};

const VisibilityTag: React.FC<{ doc: VaultDocument }> = ({ doc }) => (
  <span
    title={VISIBILITY_META[doc.visibility].description}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600"
  >
    {doc.visibility === 'on-request' && <Lock className="w-3 h-3" />}
    {VISIBILITY_META[doc.visibility].label}
  </span>
);

const PackRow: React.FC<{ pack: DocumentPack; vault: SupplierVault; onView: (p: DocumentPack) => void; onRequest: (label: string) => void }> = ({
  pack,
  vault,
  onView,
  onRequest,
}) => {
  const names = pack.documentIds.map((id) => vault.documents.find((d) => d.id === id)?.name).filter(Boolean);
  const accessible = pack.visibility !== 'on-request';
  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{pack.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{pack.description}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-500">{names.length} docs</span>
      </div>
      <p className="mt-2 text-xs text-slate-600 leading-relaxed">{names.join(' · ')}</p>
      <div className="mt-3">
        {accessible ? (
          <button type="button" onClick={() => onView(pack)} className={btnSecondary}>
            <Eye className="w-4 h-4" />
            View Pack
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRequest(pack.name)}
            className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Request {pack.name}
          </button>
        )}
      </div>
    </li>
  );
};

export const RequestPackDialog: React.FC<{
  supplier: BuyerSupplier;
  vault: SupplierVault;
  onClose: () => void;
  onViewPack: (p: DocumentPack) => void;
  onRequest: (label: string) => void;
}> = ({ supplier, vault, onClose, onViewPack, onRequest }) => (
  <ProfileDialog title="Document Packs" subtitle={`Ready-made document sets shared by ${supplier.name}`} onClose={onClose}>
    <ul className="px-5 py-5 space-y-3">
      {vault.packs.map((p) => (
        <PackRow key={p.id} pack={p} vault={vault} onView={onViewPack} onRequest={onRequest} />
      ))}
    </ul>
  </ProfileDialog>
);

export const AllDocumentsDialog: React.FC<
  { supplier: BuyerSupplier; vault: SupplierVault; pack?: DocumentPack; onClose: () => void } & DocActions
> = ({ supplier, vault, pack, onClose, ...actions }) => {
  const docs = pack ? vault.documents.filter((d) => pack.documentIds.includes(d.id)) : vault.documents;
  const groups = VAULT_CATEGORIES.map((c) => ({ ...c, docs: docs.filter((d) => d.category === c.id) })).filter((g) => g.docs.length);
  const [openGroup, setOpenGroup] = useState<string | null>(groups[0]?.id ?? null);
  return (
    <ProfileDialog
      size="lg"
      title={pack ? pack.name : 'Documents & Catalogues'}
      subtitle={`${supplier.name} · ${docs.length} documents available`}
      onClose={onClose}
      footer={<p className="text-[11px] text-slate-500">Confidential documents are never shown. Items marked On Request are shared by the supplier after you ask.</p>}
    >
      <div className="px-5 py-4 space-y-2">
        {groups.map((g) => {
          const open = openGroup === g.id;
          return (
            <section key={g.id} className="rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setOpenGroup(open ? null : g.id)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-3 px-4 min-h-12 text-left cursor-pointer"
              >
                <span className="text-sm font-semibold text-slate-900">{g.id}</span>
                <span className="text-xs text-slate-500">{g.docs.length}</span>
              </button>
              {open && (
                <ul className="border-t border-slate-100 divide-y divide-slate-100">
                  {g.docs.map((d) => (
                    <li key={d.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                          <VisibilityTag doc={d} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{docStatusLine(d)}</p>
                      </div>
                      <DocumentButtons doc={d} {...actions} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </ProfileDialog>
  );
};

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-2">
    <dt className="text-sm text-slate-500">{label}</dt>
    <dd className="text-sm font-semibold text-slate-900 text-right">{children}</dd>
  </div>
);

export const DocumentDetailDialog: React.FC<{ doc: VaultDocument; onClose: () => void; onDownload: (d: VaultDocument) => void }> = ({ doc, onClose, onDownload }) => (
  <ProfileDialog
    title={doc.name}
    subtitle={`${doc.type} · ${fileLabel(doc)}`}
    onClose={onClose}
    footer={
      <button
        type="button"
        onClick={() => onDownload(doc)}
        className="w-full inline-flex items-center justify-center gap-1.5 min-h-11 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold cursor-pointer"
      >
        <Download className="w-4 h-4" />
        Download
      </button>
    }
  >
    <div className="px-5 py-4">
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
        <div>
          <FileText className="mx-auto w-8 h-8 text-slate-400" />
          <p className="mt-2 text-xs text-slate-500">Document preview is not available in this demo.</p>
        </div>
      </div>
      <dl className="mt-4 divide-y divide-slate-100">
        <DetailRow label="Status">{docStatusLine(doc)}</DetailRow>
        <DetailRow label="Issue Date">{doc.issueDate ? formatDate(doc.issueDate) : 'Not provided'}</DetailRow>
        <DetailRow label="Expiry Date">{doc.expiryDate ? formatDate(doc.expiryDate) : 'No expiry'}</DetailRow>
        <DetailRow label="Verification">{VERIFICATION_LABEL[doc.verification]}</DetailRow>
        <DetailRow label="Visibility">{VISIBILITY_META[doc.visibility].label}</DetailRow>
        <DetailRow label="Uploaded By">{doc.uploadedBy}</DetailRow>
        <DetailRow label="Last Updated">{formatDate(doc.lastUpdated)}</DetailRow>
      </dl>
    </div>
  </ProfileDialog>
);
