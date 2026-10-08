import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Download, ExternalLink, Eye, FileText, Package, Send } from 'lucide-react';
import { BuyerSupplier, formatDate } from '../data/buyerSuppliers';
import { BuyerVault, VAULT_CATEGORIES, VISIBILITY_META, VaultDocument, expiryState, fileLabel } from '../data/supplierVault';
import { ProfileDialog } from './ProfileDialog';
import { ProfileCard, websiteHref } from './SupplierProfileSections';

type BuyerPack = BuyerVault['packs'][number];

const EXPIRY_META = {
  current: { label: 'Current', cls: 'text-emerald-700' },
  'no-expiry': { label: 'Available', cls: 'text-slate-700' },
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
      <span>{d.expiryDate ? ` · Expires ${formatDate(d.expiryDate)}` : ` · Updated ${formatDate(d.lastUpdated)}`}</span>
    </>
  );
};

const pdfEscape = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, '-');

const demoPdf = (supplier: BuyerSupplier, d: VaultDocument) => {
  const lines = [
    d.name,
    supplier.name,
    `${d.type} - demo document from the SOKO prototype`,
    d.issueDate ? `Issued ${formatDate(d.issueDate)}` : '',
    d.expiryDate ? `Expires ${formatDate(d.expiryDate)}` : '',
  ].filter(Boolean);
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 18 : 11} Tf 56 ${760 - i * 26} Td (${pdfEscape(l)}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  let body = '%PDF-1.4\n';
  const offsets = objects.map((obj, i) => {
    const offset = body.length;
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    return offset;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([body], { type: 'application/pdf' });
};

export const downloadDemoDocument = (supplier: BuyerSupplier, d: VaultDocument) => {
  const url = URL.createObjectURL(demoPdf(supplier, d));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${supplier.name} - ${d.name}.pdf`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer';

interface DocActions {
  onOpen: (d: VaultDocument) => void;
  onDownload: (d: VaultDocument) => void;
}

const DocumentButtons: React.FC<{ doc: VaultDocument } & DocActions> = ({ doc, onOpen, onDownload }) => (
  <div className="flex gap-2 shrink-0">
    <button type="button" onClick={() => onOpen(doc)} aria-label={`View ${doc.name}`} className={btnSecondary}>
      <Eye className="w-4 h-4" />
      <span className="hidden sm:inline">View</span>
    </button>
    <button type="button" onClick={() => onDownload(doc)} aria-label={`Download ${doc.name}`} className={btnSecondary}>
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Download</span>
    </button>
  </div>
);

const summaryRows = (vault: BuyerVault) => {
  const byType = (t: string) => vault.documents.filter((d) => d.type === t);
  const trade = byType('Trade License')[0];
  const iso = byType('ISO Certification').filter((d) => expiryState(d) !== 'expired');
  const has = (t: string) => byType(t).length > 0;
  return [
    { label: 'Trade License', on: !!trade, text: trade?.verification === 'verified' && expiryState(trade) !== 'expired' ? 'Verified' : 'Available' },
    { label: 'VAT Certificate', on: has('VAT Certificate'), text: 'Available' },
    { label: 'ISO Certifications', on: iso.length > 0, text: `${iso.length} Active` },
    { label: 'Company Profile', on: has('Company Profile'), text: 'Available' },
    { label: 'Product Catalogue', on: has('Product Catalogue'), text: 'Available' },
  ].filter((r) => r.on);
};

interface DocumentsSectionProps extends DocActions {
  vault: BuyerVault;
  onViewAll: () => void;
  onRequestPack: () => void;
}

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({ vault, onViewAll, onRequestPack, ...actions }) => {
  const catalogues = vault.documents.filter((d) => d.featuredCatalogue).slice(0, 3);
  const requestablePacks = vault.packs.some((p) => p.visibility === 'on-request' || p.onRequestCount > 0);
  return (
    <ProfileCard
      id="profile-documents"
      title="Documents & Catalogues"
      action={<span className="text-xs font-semibold text-gold-700">{vault.documents.length} documents available</span>}
      className="border-t-2 border-t-gold-500"
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        {summaryRows(vault).map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100">
            <dt className="text-sm text-slate-700">{r.label}</dt>
            <dd className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {r.text}
            </dd>
          </div>
        ))}
      </dl>

      {catalogues.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Catalogues</h3>
          <ul className="mt-1 divide-y divide-slate-100">
            {catalogues.map((d) => (
              <li key={d.id} className="py-2.5 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                  <FileText className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 break-words">{d.name}</p>
                  <p className="text-xs text-slate-500">{fileLabel(d)}</p>
                </div>
                <DocumentButtons doc={d} {...actions} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          type="button"
          onClick={onViewAll}
          className="group inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          View Documents & Catalogues
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
        {requestablePacks && (
          <button type="button" onClick={onRequestPack} className={`${btnSecondary} min-h-11 px-4`}>
            <Package className="w-4 h-4" />
            Request Document Pack
          </button>
        )}
      </div>
    </ProfileCard>
  );
};

const externalLinkCls =
  'flex items-center gap-3 min-h-12 rounded-xl border border-slate-200 px-4 py-2.5 hover:border-blue-200 hover:bg-blue-50 transition-colors group';

export const ExternalCatalogues: React.FC<{ supplier: BuyerSupplier }> = ({ supplier: s }) => {
  const links = s.externalCatalogues ?? [];
  if (!links.length && !s.website) return null;
  return (
    <ProfileCard id="profile-documents" title="Catalogues">
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener noreferrer" className={externalLinkCls}>
              <FileText className="w-4 h-4 text-slate-500 group-hover:text-blue-700" />
              <span className="flex-1 text-sm font-semibold text-slate-900 group-hover:text-blue-700">{l.label}</span>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-700" />
            </a>
          </li>
        ))}
        {s.website && (
          <li>
            <a href={websiteHref(s.website)} target="_blank" rel="noopener noreferrer" className={externalLinkCls}>
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

const PackRow: React.FC<{ pack: BuyerPack; vault: BuyerVault; onView: (p: BuyerPack) => void; onRequest: (label: string) => void }> = ({
  pack,
  vault,
  onView,
  onRequest,
}) => {
  const names = pack.documentIds.map((id) => vault.documents.find((d) => d.id === id)?.name).filter(Boolean);
  const total = names.length + pack.onRequestCount;
  const requestOnly = pack.visibility === 'on-request' || pack.onRequestCount > 0;
  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{pack.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{pack.description}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-500">{total} docs</span>
      </div>
      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
        {names.join(' · ')}
        {pack.onRequestCount > 0 && <span className="text-slate-500">{` · plus ${pack.onRequestCount} shared on request`}</span>}
      </p>
      <div className="mt-3">
        {requestOnly ? (
          <button
            type="button"
            onClick={() => onRequest(pack.name)}
            className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Request {pack.name}
          </button>
        ) : (
          <button type="button" onClick={() => onView(pack)} className={btnSecondary}>
            <Eye className="w-4 h-4" />
            View Pack
          </button>
        )}
      </div>
    </li>
  );
};

export const RequestPackDialog: React.FC<{
  supplier: BuyerSupplier;
  vault: BuyerVault;
  onClose: () => void;
  onViewPack: (p: BuyerPack) => void;
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

export const AllDocumentsDialog: React.FC<{ supplier: BuyerSupplier; vault: BuyerVault; pack?: BuyerPack; onClose: () => void } & DocActions> = ({
  supplier,
  vault,
  pack,
  onClose,
  ...actions
}) => {
  const docs = pack ? vault.documents.filter((d) => pack.documentIds.includes(d.id)) : vault.documents;
  const groups = VAULT_CATEGORIES.map((c) => ({ ...c, docs: docs.filter((d) => d.category === c.id) })).filter((g) => g.docs.length);
  const [openGroup, setOpenGroup] = useState<string | null>(groups[0]?.id ?? null);
  return (
    <ProfileDialog
      size="lg"
      title={pack ? pack.name : 'Documents & Catalogues'}
      subtitle={`${supplier.name} · ${docs.length} documents available to you`}
      onClose={onClose}
      footer={<p className="text-[11px] text-slate-500">Only documents you are allowed to view are listed. Other documents can be requested through a Document Pack.</p>}
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
                    <li key={d.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 break-words">{d.name}</p>
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
    <dl className="px-5 py-4 divide-y divide-slate-100">
      <DetailRow label="Status">{docStatusLine(doc)}</DetailRow>
      <DetailRow label="Issue Date">{doc.issueDate ? formatDate(doc.issueDate) : 'Not provided'}</DetailRow>
      <DetailRow label="Expiry Date">{doc.expiryDate ? formatDate(doc.expiryDate) : 'No expiry'}</DetailRow>
      <DetailRow label="Verification">{VERIFICATION_LABEL[doc.verification]}</DetailRow>
      <DetailRow label="Visibility">{VISIBILITY_META[doc.visibility].label}</DetailRow>
      <DetailRow label="Uploaded By">{doc.uploadedBy}</DetailRow>
      <DetailRow label="Last Updated">{formatDate(doc.lastUpdated)}</DetailRow>
    </dl>
  </ProfileDialog>
);
