import React, { useMemo, useState } from 'react';
import {
  FileText, Search, Lock, Eye, EyeOff, Download, Clock,
  ShieldCheck, AlertTriangle, Building2, ExternalLink, ChevronRight,
} from 'lucide-react';
import { CompanyDocument, DocumentVisibility } from '../../data/supplierTypes';
import { btnPrimary, btnSecondary, btnGhost, inputCls } from '../NetworkShared';
import { DemoNote, EmptyState, KpiCard, SubTabs, fmtDate, Field } from '../marketHub/MarketHubShared';
import { PageHeader, SW } from './SupplierShared';
import { ProfileDialog } from '../ProfileDialog';
import { BUYER_SUPPLIERS } from '../../data/buyerSuppliers';
import { BuyerSupplierProfile, ProfileTab } from '../BuyerSupplierProfile';

type Section = 'own' | 'shared' | 'review' | 'expiring';

const VISIBILITY_META: Record<DocumentVisibility, { label: string; icon: typeof Lock; cls: string }> = {
  'private': { label: 'Private', icon: Lock, cls: 'text-slate-500 bg-slate-50 border-slate-200' },
  'public': { label: 'Public', icon: Eye, cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  'shared': { label: 'Shared', icon: ExternalLink, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

const findValidShare = (doc: CompanyDocument, companyTradingName: string) =>
  doc.shares.find((s) => s.company === companyTradingName && new Date(s.until) > new Date());

const isShareExpired = (doc: CompanyDocument, companyTradingName: string) => {
  const share = doc.shares.find((s) => s.company === companyTradingName);
  return share ? new Date(share.until) <= new Date() : false;
};

const isExpiringSoon = (doc: CompanyDocument) => {
  if (!doc.expiry) return false;
  const days = (new Date(doc.expiry).getTime() - Date.now()) / 86400000;
  return days <= 30;
};

// ─── Document Preview Dialog ───────────────────────────────────────
const DocPreviewDialog: React.FC<{ doc: CompanyDocument; onClose: () => void }> = ({ doc, onClose }) => (
  <ProfileDialog title={doc.name} subtitle={`${doc.category} · ${doc.sizeMb.toFixed(1)} MB`} onClose={onClose} size="md"
    footer={<button type="button" onClick={onClose} className={`${btnGhost} text-sm`}>Close</button>}
  >
    <div className="px-5 py-4 space-y-3">
      <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">{doc.fileName}</p>
        <p className="text-xs text-slate-500 mt-1">Document preview — simulated</p>
        <button type="button" className={`${btnSecondary} text-xs mt-3`} onClick={() => {}}>
          <Download className="w-3.5 h-3.5" />Download
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Field label="Uploaded By" value={doc.uploadedBy} />
        <Field label="Uploaded" value={fmtDate(doc.uploadedAt)} />
        {doc.expiry && <Field label="Expires" value={fmtDate(doc.expiry)} />}
        <Field label="Version" value={`v${doc.versions.length}`} />
      </div>
      <DemoNote>Prototype document preview. Real file storage and secure download links require backend integration with access-controlled storage.</DemoNote>
    </div>
  </ProfileDialog>
);

// ─── Supplier Profile Modal (reused) ───────────────────────────────
const SupplierProfileModal: React.FC<{ supplierId: string; onClose: () => void }> = ({ supplierId, onClose }) => {
  const supplier = useMemo(() => BUYER_SUPPLIERS.find((s) => s.id === supplierId), [supplierId]);
  if (!supplier) return null;
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
          ← Back to Documents
        </button>
        <span className="text-xs text-slate-400">Public Supplier Profile</span>
      </div>
      <BuyerSupplierProfile
        supplier={supplier} matchQuery="" initialTab={'overview' as ProfileTab}
        saved={false} networkContacts={[]}
        onUpdateNetworkContacts={() => {}} onBack={onClose} onToggleSave={() => {}}
        onContact={() => {}} onOpenSupplier={() => {}} onRequestContact={() => {}} onNotify={() => {}}
      />
    </div>
  );
};

// ─── Shared Document Row ───────────────────────────────────────────
const SharedDocRow: React.FC<{ doc: CompanyDocument; sw: SW; onView: () => void; supplierName: string }> = ({ doc, sw, onView, supplierName }) => {
  const share = findValidShare(doc, sw.company.profile.tradingName);
  const expired = isShareExpired(doc, sw.company.profile.tradingName);
  const canAccess = !!share && !expired;
  const visMeta = VISIBILITY_META[doc.visibility];
  const expiring = isExpiringSoon(doc);

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm ${canAccess ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50/50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-900 truncate">{doc.name}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${visMeta.cls}`}>
              <visMeta.icon className="w-2.5 h-2.5" />{visMeta.label}
            </span>
            {expiring && doc.expiry && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700"><Clock className="w-2.5 h-2.5" />Expiring</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            From {supplierName} · {doc.category} · {doc.sizeMb.toFixed(1)} MB
          </p>
          {share && (
            <p className={`text-[10px] mt-0.5 ${expired ? 'text-rose-600' : 'text-slate-400'}`}>
              {expired ? <>Access expired {fmtDate(share.until)}</> : <>Shared by {share.by} · Valid until {fmtDate(share.until)}</>}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {canAccess ? (
            <>
              <button type="button" onClick={onView} className={`${btnGhost} text-xs`}><Eye className="w-3.5 h-3.5" />Preview</button>
              <button type="button" onClick={() => sw.notify(`Downloading "${doc.name}" — simulated`)} className={`${btnGhost} text-xs`}><Download className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-rose-500"><EyeOff className="w-3.5 h-3.5" />No access</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────
export const ContractorDocumentCenter: React.FC<{ sw: SW }> = ({ sw }) => {
  const [section, setSection] = useState<Section>('own');
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<CompanyDocument | null>(null);
  const [profileSupplierId, setProfileSupplierId] = useState<string | null>(null);

  // GEC's own internal documents
  const ownDocs = sw.store.documents.filter((d) => d.companyId === sw.company.id && !d.archived);

  // All supplier documents shared with GEC or public from linked vendors
  const vendors = sw.store.vendorRecords.filter((v) => v.companyId === sw.company.id && v.supplierCompanyId);
  const linkedSupplierIds = vendors.map((v) => v.supplierCompanyId!);

  const allSupplierDocs = sw.store.documents.filter((d) => linkedSupplierIds.includes(d.companyId) && !d.archived);

  // Shared with GEC (valid access)
  const sharedWithGec = allSupplierDocs.filter((d) => findValidShare(d, sw.company.profile.tradingName));

  // Awaiting review: documents from vendors with approval status 'under-review' or 'not-reviewed'
  const reviewVendorIds = vendors.filter((v) => v.approvalStatus === 'under-review' || v.approvalStatus === 'not-reviewed').map((v) => v.supplierCompanyId!);
  const awaitingReview = allSupplierDocs.filter((d) => reviewVendorIds.includes(d.companyId) && (d.visibility === 'shared' || d.visibility === 'public'));

  // Expiring supplier compliance documents
  const expiringSupplierDocs = allSupplierDocs.filter((d) => isExpiringSoon(d) && (findValidShare(d, sw.company.profile.tradingName) || d.visibility === 'public'));

  // Group shared docs by supplier
  const sharedBySupplier = useMemo(() => {
    const map = new Map<string, { supplierId: string; supplierName: string; docs: CompanyDocument[] }>();
    sharedWithGec.forEach((d) => {
      const vendor = vendors.find((v) => v.supplierCompanyId === d.companyId);
      const name = vendor?.supplierName ?? 'Unknown';
      const key = d.companyId;
      if (!map.has(key)) map.set(key, { supplierId: d.companyId, supplierName: name, docs: [] });
      map.get(key)!.docs.push(d);
    });
    return Array.from(map.values());
  }, [sharedWithGec, vendors]);

  // Group awaiting review by supplier
  const reviewBySupplier = useMemo(() => {
    const map = new Map<string, { supplierId: string; supplierName: string; docs: CompanyDocument[] }>();
    awaitingReview.forEach((d) => {
      const vendor = vendors.find((v) => v.supplierCompanyId === d.companyId);
      const name = vendor?.supplierName ?? 'Unknown';
      const key = d.companyId;
      if (!map.has(key)) map.set(key, { supplierId: d.companyId, supplierName: name, docs: [] });
      map.get(key)!.docs.push(d);
    });
    return Array.from(map.values());
  }, [awaitingReview, vendors]);

  // Group expiring by supplier
  const expiringBySupplier = useMemo(() => {
    const map = new Map<string, { supplierId: string; supplierName: string; docs: CompanyDocument[] }>();
    expiringSupplierDocs.forEach((d) => {
      const vendor = vendors.find((v) => v.supplierCompanyId === d.companyId);
      const name = vendor?.supplierName ?? 'Unknown';
      const key = d.companyId;
      if (!map.has(key)) map.set(key, { supplierId: d.companyId, supplierName: name, docs: [] });
      map.get(key)!.docs.push(d);
    });
    return Array.from(map.values());
  }, [expiringSupplierDocs, vendors]);

  const ownFiltered = search
    ? ownDocs.filter((d) => `${d.name} ${d.category} ${d.fileName}`.toLowerCase().includes(search.toLowerCase()))
    : ownDocs;

  return (
    <div>
      <PageHeader
        eyebrow="Documents · Contractor"
        title="Document Center"
        subtitle="Your internal documents, supplier documents shared with you, compliance tracking and review queue."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Internal Documents" value={ownDocs.length} />
        <KpiCard label="Shared with GEC" value={sharedWithGec.length} />
        <KpiCard label="Awaiting Review" value={awaitingReview.length} />
        <KpiCard label="Expiring Soon" value={expiringSupplierDocs.length} />
        <KpiCard label="Linked Suppliers" value={linkedSupplierIds.length} />
        <KpiCard label="Vendors Under Review" value={reviewVendorIds.length} />
      </div>

      {/* Section Tabs */}
      <div className="mb-4">
        <SubTabs
          tabs={[
            { id: 'own' as Section, label: 'Internal Documents', count: ownDocs.length },
            { id: 'shared' as Section, label: 'Shared with GEC', count: sharedWithGec.length },
            { id: 'review' as Section, label: 'Awaiting Review', count: awaitingReview.length },
            { id: 'expiring' as Section, label: 'Expiring Compliance', count: expiringSupplierDocs.length },
          ]}
          value={section}
          onChange={setSection}
        />
      </div>

      {/* ─── Internal Documents ─── */}
      {section === 'own' && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-slate-600">Documents owned by {sw.company.profile.tradingName}. These are separate from any supplier documents.</p>
            <div className="relative w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className={`${inputCls} pl-9`} />
            </div>
          </div>
          {ownFiltered.length === 0 ? (
            <EmptyState icon={<FileText className="w-5 h-5" />} title="No internal documents" text="Your company's own documents will appear here." />
          ) : (
            <ul className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
              {ownFiltered.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => setPreviewDoc(d)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 cursor-pointer">
                    <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                      <p className="text-xs text-slate-500 truncate">{d.category} · {d.sizeMb.toFixed(1)} MB · {fmtDate(d.uploadedAt)}</p>
                    </div>
                    {d.expiry && isExpiringSoon(d) && <span className="text-xs text-amber-700 font-medium">Expiring</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ─── Shared with GEC ─── */}
      {section === 'shared' && (
        <div>
          <div className="mb-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-sm text-blue-900 font-semibold">Documents suppliers have explicitly shared with {sw.company.profile.tradingName}</p>
            <p className="text-xs text-blue-700 mt-0.5">Access is granted by the supplier and can be revoked at any time. Expired shares are shown but cannot be opened.</p>
          </div>
          {sharedBySupplier.length === 0 ? (
            <EmptyState icon={<ExternalLink className="w-5 h-5" />} title="No shared documents" text="When a supplier shares a document with your company, it will appear here." />
          ) : (
            <div className="space-y-4">
              {sharedBySupplier.map((group) => (
                <div key={group.supplierId}>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900">{group.supplierName}</h3>
                    <span className="text-xs text-slate-400">({group.docs.length} document{group.docs.length > 1 ? 's' : ''})</span>
                    <button type="button" onClick={() => setProfileSupplierId(group.supplierId)} className={`${btnGhost} text-xs ml-auto`}>
                      <ExternalLink className="w-3.5 h-3.5" />View Profile
                    </button>
                  </div>
                  <div className="space-y-2">
                    {group.docs.map((d) => (
                      <SharedDocRow key={d.id} doc={d} sw={sw} supplierName={group.supplierName} onView={() => setPreviewDoc(d)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Awaiting Review ─── */}
      {section === 'review' && (
        <div>
          <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-900 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Documents from vendors pending approval</p>
            <p className="text-xs text-amber-700 mt-0.5">These documents are from suppliers whose vendor approval status is "Under Review" or "Not Reviewed". Review them as part of your vendor onboarding process.</p>
          </div>
          {reviewBySupplier.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="w-5 h-5" />} title="Nothing to review" text="Documents from vendors pending approval will appear here." />
          ) : (
            <div className="space-y-4">
              {reviewBySupplier.map((group) => (
                <div key={group.supplierId}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-900">{group.supplierName}</h3>
                    <button type="button" onClick={() => setProfileSupplierId(group.supplierId)} className={`${btnGhost} text-xs ml-auto`}>
                      <ExternalLink className="w-3.5 h-3.5" />View Profile
                    </button>
                  </div>
                  <div className="space-y-2">
                    {group.docs.map((d) => (
                      <SharedDocRow key={d.id} doc={d} sw={sw} supplierName={group.supplierName} onView={() => setPreviewDoc(d)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Expiring Compliance ─── */}
      {section === 'expiring' && (
        <div>
          <div className="mb-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
            <p className="text-sm text-rose-900 font-semibold flex items-center gap-2"><Clock className="w-4 h-4" />Supplier compliance documents expiring within 30 days</p>
            <p className="text-xs text-rose-700 mt-0.5">Track which supplier certifications, licenses and compliance documents are about to expire. Request renewals directly from the supplier.</p>
          </div>
          {expiringBySupplier.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="w-5 h-5" />} title="No expiring documents" text="Supplier compliance documents expiring within 30 days will appear here." />
          ) : (
            <div className="space-y-4">
              {expiringBySupplier.map((group) => (
                <div key={group.supplierId}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-semibold text-slate-900">{group.supplierName}</h3>
                    <button type="button" onClick={() => setProfileSupplierId(group.supplierId)} className={`${btnGhost} text-xs ml-auto`}>
                      <ExternalLink className="w-3.5 h-3.5" />View Profile
                    </button>
                  </div>
                  <div className="space-y-2">
                    {group.docs.map((d) => (
                      <SharedDocRow key={d.id} doc={d} sw={sw} supplierName={group.supplierName} onView={() => setPreviewDoc(d)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <DemoNote>Document sharing and access control are prototype demonstrations using centralized sample records. Real file storage, secure download links and server-enforced access revocation require backend integration with access-controlled storage (e.g. Supabase Storage with RLS policies).</DemoNote>
      </div>

      {previewDoc && <DocPreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      {profileSupplierId && <SupplierProfileModal supplierId={profileSupplierId} onClose={() => setProfileSupplierId(null)} />}
    </div>
  );
};
