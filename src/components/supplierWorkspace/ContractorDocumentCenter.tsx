import React, { useMemo, useState } from 'react';
import {
  FileText, Search, Lock, Eye, Download, Clock,
  ShieldCheck, AlertTriangle, ExternalLink, Info, History,
  Upload, Crown, X, Plus, CheckCircle2, Trash2, FileWarning, type LucideIcon,
} from 'lucide-react';
import { CompanyDocument, DocumentVisibility, DocumentCategory, DocumentAccessLevel, DOCUMENT_CATEGORIES, ACCESS_META, CONTRACTOR_TIER_CONFIG, VendorComplianceDoc, VendorDocStatus, VendorApprovalStatus, VendorRecord } from '../../data/supplierTypes';
import { btnPrimary, btnSecondary, btnGhost, inputCls, labelCls } from '../NetworkShared';
import { DemoNote, fmtDate, Field } from '../marketHub/MarketHubShared';
import { SW } from './SupplierShared';
import {
  sokoCard, sokoTokens, SokoEmptyState, SokoKpiCell, SokoProgress, SokoStatusIndicator,
  SokoStatusTone, SokoTabs, SokoTimelineItem,
} from '../sokoDesignSystem/SokoComponents';
import { ProfileDialog } from '../ProfileDialog';
import { BUYER_SUPPLIERS } from '../../data/buyerSuppliers';
import { BuyerSupplierProfile, ProfileTab } from '../BuyerSupplierProfile';
import { uploadDocument, addVendorComplianceDoc, reviewVendorComplianceDoc, deleteVendorComplianceDoc } from '../../data/supplierService';
import { storageAllocationMb, storageUsedMb } from '../../data/supplierStore';

type DocTab = 'internal' | 'shared' | 'compliance' | 'activity';
type ComplianceFilter = 'queue' | 'all' | VendorDocStatus;

const COMPLIANCE_STATUS_META: Record<VendorDocStatus, { label: string; tone: SokoStatusTone }> = {
  'submitted': { label: 'Submitted', tone: 'info' },
  'missing': { label: 'Missing', tone: 'critical' },
  'under-review': { label: 'Under Review', tone: 'warning' },
  'accepted': { label: 'Accepted', tone: 'success' },
  'rejected': { label: 'Rejected', tone: 'neutral' },
};

/** Supplier documents enter GEC's view only through approval status, never through GEC's own review. */
const VENDOR_REVIEW_META: Record<VendorApprovalStatus, { label: string; tone: SokoStatusTone }> = {
  'not-reviewed': { label: 'Awaiting vendor review', tone: 'warning' },
  'under-review': { label: 'Vendor under review', tone: 'warning' },
  'approved': { label: 'Vendor approved', tone: 'success' },
  'conditionally-approved': { label: 'Conditionally approved', tone: 'warning' },
  'rejected': { label: 'Vendor rejected', tone: 'neutral' },
  'suspended': { label: 'Vendor suspended', tone: 'neutral' },
};

const PENDING_APPROVAL: VendorApprovalStatus[] = ['not-reviewed', 'under-review'];
const REVIEW_QUEUE: VendorDocStatus[] = ['submitted', 'under-review'];

const findValidShare = (doc: CompanyDocument, companyTradingName: string) =>
  doc.shares.find((s) => s.company === companyTradingName && new Date(s.until) > new Date());

/** Public documents, or documents explicitly shared with this company within their access window. Private documents never qualify. */
const isVisibleToCompany = (doc: CompanyDocument, companyTradingName: string) =>
  doc.visibility === 'public' || (doc.visibility === 'shared' && !!findValidShare(doc, companyTradingName));

const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

const isExpiringSoon = (doc: CompanyDocument) => !!doc.expiry && daysUntil(doc.expiry) <= 30;

// ─── Upload Dialog ──────────────────────────────────────────────────
const UploadDialog: React.FC<{ sw: SW; onClose: () => void }> = ({ sw, onClose }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Company Brochures');
  const [fileName, setFileName] = useState('');
  const [sizeMb, setSizeMb] = useState(1.0);
  const [issueDate, setIssueDate] = useState('');
  const [expiry, setExpiry] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<DocumentVisibility>('private');
  const [access, setAccess] = useState<DocumentAccessLevel>('team');
  const [reminderDays, setReminderDays] = useState(30);

  const canUpload = sw.can('documents.manage');

  const handleFileSim = () => {
    const simName = `document-${Date.now()}.pdf`;
    setFileName(simName);
    setSizeMb(Math.round((Math.random() * 5 + 0.5) * 10) / 10);
    if (!name) setName(simName.replace(/\.pdf$/, '').replace(/-/g, ' '));
  };

  const handleSave = () => {
    if (!name.trim()) { sw.notify('Document title is required'); return; }
    if (!fileName) { sw.notify('Please select a file to upload'); return; }
    const res = uploadDocument(sw.ctx, {
      name: name.trim(),
      category,
      fileName,
      sizeMb,
      expiry: expiry || undefined,
      reminderDays,
      access,
    });
    if (sw.run(res, `Uploaded "${name.trim()}" to ${sw.company.profile.tradingName}`)) {
      onClose();
    }
  };

  return (
    <ProfileDialog
      title="Upload Company Document"
      subtitle={`Owned by ${sw.company.profile.tradingName}`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className={`${btnGhost} text-sm`}>Cancel</button>
          {canUpload ? (
            <button type="button" onClick={handleSave} className={`${btnPrimary} text-sm`}>
              <Upload className="w-4 h-4" /> Save Document
            </button>
          ) : (
            <span className="text-xs text-slate-500">Your role cannot upload documents.</span>
          )}
        </>
      }
    >
      <div className="px-5 py-4 space-y-4">
        <div>
          <label className={labelCls}>Document Title *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GEC Quality Manual 2026" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>File *</label>
          <div className="flex gap-2">
            <button type="button" onClick={handleFileSim} className={`${btnSecondary} text-sm whitespace-nowrap`}>
              <FileText className="w-4 h-4" /> Select file (simulated)
            </button>
            {fileName && (
              <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700 truncate">{fileName}</span>
                <span className="text-xs text-slate-400">{sizeMb.toFixed(1)} MB</span>
                <button type="button" onClick={() => { setFileName(''); }} className="ml-auto"><X className="w-3.5 h-3.5 text-slate-400" /></button>
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">File selection is simulated for this prototype. Real uploads require backend storage integration.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)} className={inputCls}>
              {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Size (MB)</label>
            <input type="number" value={sizeMb} onChange={(e) => setSizeMb(Math.max(0.1, parseFloat(e.target.value) || 0.1))} step="0.1" min="0.1" className={inputCls} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Issue Date (optional)</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Expiry Date (optional)</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief description of this document…" className={inputCls} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Visibility</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as DocumentVisibility)} className={inputCls}>
              <option value="private">Private (company only)</option>
              <option value="shared">Shared (specific companies)</option>
              <option value="public">Public (all SOKO users)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Access Level</label>
            <select value={access} onChange={(e) => setAccess(e.target.value as DocumentAccessLevel)} className={inputCls}>
              {(Object.keys(ACCESS_META) as DocumentAccessLevel[]).map((a) => (
                <option key={a} value={a}>{ACCESS_META[a].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Expiry Reminder (days before)</label>
          <input type="number" value={reminderDays} onChange={(e) => setReminderDays(parseInt(e.target.value) || 30)} className={inputCls} />
        </div>

        <DemoNote>Uploaded documents belong to {sw.company.profile.tradingName}, not to your personal account. Real file storage and access-controlled downloads require backend integration.</DemoNote>
      </div>
    </ProfileDialog>
  );
};

// ─── Upgrade Modal ──────────────────────────────────────────────────
const UpgradeModal: React.FC<{ sw: SW; onClose: () => void }> = ({ sw, onClose }) => {
  const freeConfig = CONTRACTOR_TIER_CONFIG.free;
  const premiumConfig = CONTRACTOR_TIER_CONFIG.premium;
  const currentTier = sw.company.tier;

  return (
    <ProfileDialog
      title="Upgrade Contractor Plan"
      subtitle="Compare plans for GEC Dubai"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className={`${btnGhost} text-sm`}>Close</button>
          <button type="button" onClick={() => { sw.notify('Premium upgrade is a demo preview — payment integration is Coming Soon'); onClose(); }} className={`${btnPrimary} text-sm`}>
            <Crown className="w-4 h-4" /> Upgrade to Premium
          </button>
        </>
      }
    >
      <div className="px-5 py-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className={`rounded-xl border p-4 ${currentTier === 'free' ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">{freeConfig.label}</p>
              {currentTier === 'free' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Current</span>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{freeConfig.tagline}</p>
            <ul className="mt-3 space-y-1.5">
              {freeConfig.features.map((f, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-700"><CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />{f}</li>
              ))}
            </ul>
          </div>
          <div className={`rounded-xl border p-4 ${currentTier === 'premium' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50'}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">{premiumConfig.label}</p>
              {currentTier === 'premium' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Current</span>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{premiumConfig.tagline}</p>
            <ul className="mt-3 space-y-1.5">
              {premiumConfig.features.map((f, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-700"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{f}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs text-amber-900 font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Coming Soon — Demo Preview
          </p>
          <p className="text-xs text-amber-700 mt-1">Payment integration is not yet available. This plan comparison is for preview purposes only. No subscription will be activated or charged.</p>
        </div>
        <DemoNote>Storage allowances and features are demo values and may change when commercial pricing is finalized.</DemoNote>
      </div>
    </ProfileDialog>
  );
};

// ─── Vendor Compliance Dialog ───────────────────────────────────────
const AddComplianceDialog: React.FC<{ sw: SW; onClose: () => void }> = ({ sw, onClose }) => {
  const vendors = sw.store.vendorRecords.filter((v) => v.companyId === sw.company.id);
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? '');
  const [docType, setDocType] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [fileName, setFileName] = useState('');

  const handleSave = () => {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) { sw.notify('Select a vendor'); return; }
    if (!docType.trim()) { sw.notify('Document type is required'); return; }
    const res = addVendorComplianceDoc(sw.ctx, {
      vendorId: vendor.id,
      supplierName: vendor.supplierName,
      documentType: docType.trim(),
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      fileName: fileName || undefined,
    });
    if (sw.run(res, `Added compliance document for ${vendor.supplierName}`)) onClose();
  };

  return (
    <ProfileDialog
      title="Add Vendor Compliance Document"
      subtitle="Track required supplier documents from your vendor register"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className={`${btnGhost} text-sm`}>Cancel</button>
          <button type="button" onClick={handleSave} className={`${btnPrimary} text-sm`}>Add Document</button>
        </>
      }
    >
      <div className="px-5 py-4 space-y-4">
        <div>
          <label className={labelCls}>Vendor *</label>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputCls}>
            <option value="">Select a vendor…</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.supplierName} ({v.tradeCategory})</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Document Type *</label>
          <input value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="e.g. ISO 9001 Certificate, Trade License" className={inputCls} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Issue Date</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Expiry Date</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>File Name (optional)</label>
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. supplier-iso9001.pdf" className={inputCls} />
        </div>
        <DemoNote>Vendor compliance tracking is GEC's internal process. Accepting a document here does not constitute SOKO global supplier verification.</DemoNote>
      </div>
    </ProfileDialog>
  );
};

// ─── Document Preview Dialog ────────────────────────────────────────
const DocPreviewDialog: React.FC<{ doc: CompanyDocument; onClose: () => void; onDownload: () => void }> = ({ doc, onClose, onDownload }) => (
  <ProfileDialog title={doc.name} subtitle={`${doc.category} · ${doc.sizeMb.toFixed(1)} MB`} onClose={onClose} size="md"
    footer={<button type="button" onClick={onClose} className={`${btnGhost} text-sm`}>Close</button>}
  >
    <div className="px-5 py-4 space-y-3">
      <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">{doc.fileName}</p>
        <p className="text-xs text-slate-500 mt-1">Document preview — simulated</p>
        <button type="button" className={`${btnSecondary} text-xs mt-3`} onClick={onDownload}>
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

// ─── Supplier Profile Modal ─────────────────────────────────────────
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

// ─── Table primitives ───────────────────────────────────────────────
const thCls = `px-4 py-2.5 text-left whitespace-nowrap ${sokoTokens.eyebrow}`;
const tdCls = 'px-4 py-3 align-middle';
const controlCls = `h-9 ${sokoTokens.radius.control} border border-slate-200 bg-white px-3 text-sm text-slate-700 ${sokoTokens.focus}`;

const VisibilityBadge: React.FC<{ icon: LucideIcon; label: string; tone: 'private' | 'shared' | 'public'; note?: string }> = ({ icon: Icon, label, tone, note }) => {
  const cls = tone === 'private'
    ? 'border-slate-200 bg-slate-50 text-slate-600'
    : tone === 'shared'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-slate-200 bg-white text-slate-700';
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex w-fit items-center gap-1 h-5 px-1.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${cls}`}>
        <Icon className="w-3 h-3" aria-hidden />{label}
      </span>
      {note && <span className="text-[11px] text-slate-400 whitespace-nowrap">{note}</span>}
    </div>
  );
};

const INTERNAL_VISIBILITY: Record<DocumentVisibility, { label: string; icon: LucideIcon; tone: 'private' | 'shared' | 'public' }> = {
  private: { label: 'Private', icon: Lock, tone: 'private' },
  shared: { label: 'Shared externally', icon: ExternalLink, tone: 'shared' },
  public: { label: 'Public', icon: Eye, tone: 'public' },
};

const ExpiryCell: React.FC<{ date?: string }> = ({ date }) => {
  if (!date) return <span className="text-slate-400" aria-label="No expiry">—</span>;
  const days = daysUntil(date);
  if (days < 0) return <SokoStatusIndicator label={`Expired ${fmtDate(date)}`} tone="critical" />;
  if (days <= 30) return (
    <div className="flex flex-col gap-1">
      <SokoStatusIndicator label={`In ${days} day${days === 1 ? '' : 's'}`} tone="warning" />
      <span className="text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(date)}</span>
    </div>
  );
  return <span className="text-sm text-slate-600 tabular-nums whitespace-nowrap">{fmtDate(date)}</span>;
};

const IconAction: React.FC<{ icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }> = ({ icon: Icon, label, onClick, danger }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label}
    className={`${sokoTokens.focus} w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 transition-colors cursor-pointer ${danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-slate-100 hover:text-slate-900'}`}>
    <Icon className="w-4 h-4" aria-hidden />
  </button>
);

const DocNameCell: React.FC<{ doc: CompanyDocument; onPreview: () => void }> = ({ doc, onPreview }) => (
  <button type="button" onClick={onPreview} title={doc.name} className={`${sokoTokens.focus} flex w-full max-w-[300px] items-center gap-3 text-left min-w-0 rounded-lg cursor-pointer group`}>
    <span className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
      <FileText className="w-4 h-4" aria-hidden />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-medium text-slate-900 truncate group-hover:text-blue-700">{doc.name}</span>
      <span className="block text-[11px] text-slate-500 truncate font-mono">{doc.fileName} · {doc.sizeMb.toFixed(1)} MB</span>
    </span>
  </button>
);

interface ActivityEntry { id: string; at: string; actor: string; text: string; tag: string }

// ─── Main Component ─────────────────────────────────────────────────
export const ContractorDocumentCenter: React.FC<{ sw: SW }> = ({ sw }) => {
  const [tab, setTab] = useState<DocTab>('internal');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | DocumentCategory>('all');
  const [visibility, setVisibility] = useState<'all' | DocumentVisibility>('all');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('queue');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [previewDoc, setPreviewDoc] = useState<CompanyDocument | null>(null);
  const [profileSupplierId, setProfileSupplierId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAddCompliance, setShowAddCompliance] = useState(false);

  const gecName = sw.company.profile.tradingName;
  const canUpload = sw.can('documents.manage');
  const canDelete = sw.can('records.delete');
  const canUpgrade = sw.can('plan.manage') && sw.company.tier !== 'premium';

  const ownDocs = sw.store.documents.filter((d) => d.companyId === sw.company.id && !d.archived);
  const used = storageUsedMb(ownDocs);
  const total = storageAllocationMb(sw.company);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const isFull = pct >= 100;
  const tierConfig = CONTRACTOR_TIER_CONFIG[sw.company.tier];

  const vendorBySupplier = new Map<string, VendorRecord>();
  sw.store.vendorRecords
    .filter((v) => v.companyId === sw.company.id && v.supplierCompanyId)
    .forEach((v) => vendorBySupplier.set(v.supplierCompanyId!, v));

  const supplierDocs = sw.store.documents.filter((d) => vendorBySupplier.has(d.companyId) && !d.archived && isVisibleToCompany(d, gecName));
  const sharedWithGec = supplierDocs.filter((d) => d.visibility === 'shared');
  const publicSupplierDocs = supplierDocs.length - sharedWithGec.length;
  const pendingVendorDocs = supplierDocs.filter((d) => PENDING_APPROVAL.includes(vendorBySupplier.get(d.companyId)!.approvalStatus));
  const supplierCount = new Set(supplierDocs.map((d) => d.companyId)).size;

  const complianceDocs = sw.store.vendorComplianceDocs.filter((d) => d.companyId === sw.company.id);
  const reviewQueue = complianceDocs.filter((d) => REVIEW_QUEUE.includes(d.status));

  const expiringInternal = ownDocs.filter(isExpiringSoon).length;
  const expiringSupplier = supplierDocs.filter(isExpiringSoon).length;
  const expiringCompliance = complianceDocs.filter((d) => d.expiryDate && d.status !== 'rejected' && daysUntil(d.expiryDate) <= 30).length;
  const expiringTotal = expiringInternal + expiringSupplier + expiringCompliance;

  const q = search.trim().toLowerCase();
  const matches = (...parts: (string | undefined)[]) => !q || parts.filter(Boolean).join(' ').toLowerCase().includes(q);
  const supplierName = (doc: CompanyDocument) => vendorBySupplier.get(doc.companyId)?.supplierName ?? 'Supplier';

  const internalRows = ownDocs.filter((d) =>
    (category === 'all' || d.category === category) &&
    (visibility === 'all' || d.visibility === visibility) &&
    matches(d.name, d.fileName, d.category, d.uploadedBy));

  const supplierRows = supplierDocs.filter((d) =>
    (category === 'all' || d.category === category) &&
    (visibility === 'all' || d.visibility === visibility) &&
    matches(d.name, d.fileName, d.category, supplierName(d)));

  const complianceRows = complianceDocs.filter((d) =>
    (complianceFilter === 'all' || (complianceFilter === 'queue' ? REVIEW_QUEUE.includes(d.status) : d.status === complianceFilter)) &&
    matches(d.documentType, d.supplierName, d.fileName, d.reviewer));

  const activity = useMemo<ActivityEntry[]>(() => {
    const entries: ActivityEntry[] = [];
    sw.store.audit
      .filter((a) => a.companyId === sw.company.id && a.kind === 'document')
      .forEach((a) => entries.push({ id: `audit-${a.id}`, at: a.at, actor: a.actor, text: a.action, tag: 'Audit log' }));
    sw.store.documents
      .filter((d) => d.companyId === sw.company.id)
      .forEach((d) => {
        if (d.versions.length === 0) {
          entries.push({ id: `doc-${d.id}`, at: d.uploadedAt, actor: d.uploadedBy, text: `Uploaded "${d.name}"`, tag: 'Internal' });
          return;
        }
        d.versions.forEach((v) => entries.push({
          id: `doc-${d.id}-v${v.version}`, at: v.at, actor: v.by, tag: 'Internal',
          text: v.version === 1 ? `Uploaded "${d.name}"` : `Uploaded version ${v.version} of "${d.name}"`,
        }));
      });
    sw.store.vendorComplianceDocs
      .filter((d) => d.companyId === sw.company.id)
      .forEach((d) => {
        entries.push({ id: `cmp-${d.id}`, at: d.createdAt, actor: d.createdBy, tag: 'Compliance', text: `Started tracking ${d.documentType} for ${d.supplierName}` });
        if (d.reviewedAt && d.reviewer) {
          entries.push({ id: `rev-${d.id}`, at: d.reviewedAt, actor: d.reviewer, tag: 'Review', text: `Marked ${d.documentType} from ${d.supplierName} as ${COMPLIANCE_STATUS_META[d.status].label}` });
        }
      });
    return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [sw.store.audit, sw.store.documents, sw.store.vendorComplianceDocs, sw.company.id]);

  const activityRows = activity.filter((e) => matches(e.text, e.actor, e.tag));

  const changeTab = (next: DocTab) => {
    setTab(next);
    setCategory('all');
    setVisibility('all');
    setReviewingId(null);
  };

  const openUpload = () => {
    if (isFull) { sw.notify('Storage is full. Existing documents remain available; upgrade to Premium to upload more.'); return; }
    setShowUpload(true);
  };

  const requestDownload = (doc: CompanyDocument) =>
    sw.notify(`Secure download of "${doc.name}" requires backend file storage, which is not connected in this prototype.`);

  const startReview = (doc: VendorComplianceDoc) => {
    setReviewingId(doc.id);
    setReviewNotes(doc.reviewNotes ?? '');
  };

  const submitReview = (doc: VendorComplianceDoc, status: VendorDocStatus) => {
    const res = reviewVendorComplianceDoc(sw.ctx, doc.id, status, reviewNotes);
    if (sw.run(res, `Reviewed "${doc.documentType}" from ${doc.supplierName}: ${COMPLIANCE_STATUS_META[status].label}`)) setReviewingId(null);
  };

  const storageTone = pct >= 95 ? 'red' : pct >= 80 ? 'amber' : 'blue';
  const resultCount = tab === 'internal' ? internalRows.length : tab === 'shared' ? supplierRows.length : tab === 'compliance' ? complianceRows.length : activityRows.length;

  const complianceFilters: { id: ComplianceFilter; label: string; count: number }[] = [
    { id: 'queue', label: 'Review queue', count: reviewQueue.length },
    { id: 'missing', label: 'Missing', count: complianceDocs.filter((d) => d.status === 'missing').length },
    { id: 'accepted', label: 'Accepted', count: complianceDocs.filter((d) => d.status === 'accepted').length },
    { id: 'rejected', label: 'Rejected', count: complianceDocs.filter((d) => d.status === 'rejected').length },
    { id: 'all', label: 'All', count: complianceDocs.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className={sokoTokens.eyebrow}>Contractor workspace · Documents</p>
          <h1 className="mt-2 text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 text-balance">Documents &amp; Compliance</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500 leading-relaxed text-pretty">
            Internal records owned by {gecName}, documents suppliers have made available to you, and your vendor compliance review queue.
          </p>
        </div>
        {canUpload && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onClick={() => setShowAddCompliance(true)} className={`${btnSecondary} text-sm`}>
              <Plus className="w-4 h-4" aria-hidden /> Track compliance document
            </button>
            <button type="button" onClick={openUpload} aria-disabled={isFull} className={`${btnPrimary} text-sm ${isFull ? 'opacity-60' : ''}`}>
              <Upload className="w-4 h-4" aria-hidden /> Upload document
            </button>
          </div>
        )}
      </header>

      <section aria-label="Document overview" className={`${sokoCard} grid grid-cols-2 lg:grid-cols-5 gap-px bg-slate-200/80 overflow-hidden`}>
        <div className="bg-white">
          <SokoKpiCell label="Internal documents" value={ownDocs.length} detail={`Owned by ${gecName}`} onClick={() => changeTab('internal')} />
        </div>
        <div className="bg-white">
          <SokoKpiCell label={`Shared with ${gecName}`} value={sharedWithGec.length}
            detail={`${publicSupplierDocs} public · ${supplierCount} supplier${supplierCount === 1 ? '' : 's'}`}
            hint="Supplier documents explicitly shared with you and still within their access window. Supplier-private documents are never shown."
            onClick={() => changeTab('shared')} />
        </div>
        <div className="bg-white">
          <SokoKpiCell label="Awaiting review" value={reviewQueue.length}
            detail={`${pendingVendorDocs.length} supplier doc${pendingVendorDocs.length === 1 ? '' : 's'} from vendors pending approval`}
            hint="Compliance documents with Submitted or Under Review status in your vendor compliance tracker."
            onClick={() => { setComplianceFilter('queue'); changeTab('compliance'); }} />
        </div>
        <div className="bg-white">
          <SokoKpiCell label="Expiring soon" value={expiringTotal}
            detail={`${expiringInternal} internal · ${expiringSupplier} supplier · ${expiringCompliance} tracked`}
            hint="Documents expiring within 30 days, including any already expired."
            onClick={() => { setComplianceFilter('all'); changeTab('compliance'); }} />
        </div>
        <div className="bg-white col-span-2 lg:col-span-1">
          <SokoKpiCell label="Storage usage" value={`${pct}%`}
            detail={`${used.toFixed(1)} of ${total.toLocaleString()} MB · ${tierConfig.label}`}
            hint={`Only documents owned by ${gecName} count toward storage. Supplier documents shared with you stay in the supplier's storage.`}
            visual={<SokoProgress value={total > 0 ? used / total : 0} tone={storageTone} className="w-full" />}
            onClick={canUpgrade ? () => setShowUpgrade(true) : undefined} />
        </div>
      </section>

      {pct >= 80 && (
        <div role="status" className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${sokoTokens.radius.control} border px-4 py-3 ${pct >= 95 ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          <p className="flex items-start gap-2 text-sm">
            <FileWarning className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            {isFull
              ? 'Storage is full. New uploads are blocked; existing documents can still be viewed.'
              : `Storage is at ${pct}%. New uploads may be blocked when it reaches 100%.`}
          </p>
          {canUpgrade && (
            <button type="button" onClick={() => setShowUpgrade(true)} className={`${btnPrimary} text-xs shrink-0`}>
              <Crown className="w-3.5 h-3.5" aria-hidden /> Compare plans
            </button>
          )}
        </div>
      )}

      <section className={`${sokoCard} overflow-hidden`}>
        <div className="px-5 pt-4 overflow-x-auto">
          <SokoTabs<DocTab> variant="underline" label="Document sections" active={tab} onChange={changeTab}
            tabs={[
              { id: 'internal', label: 'Internal documents', count: ownDocs.length },
              { id: 'shared', label: 'Supplier shared documents', count: supplierDocs.length },
              { id: 'compliance', label: 'Compliance reviews', count: complianceDocs.length },
              { id: 'activity', label: 'Document activity', count: activity.length },
            ]} />
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative sm:w-72">
              <span className="sr-only">Search documents</span>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
              <input value={search} onChange={(e) => setSearch(e.target.value)} type="search"
                placeholder={tab === 'activity' ? 'Search activity' : tab === 'compliance' ? 'Search type, supplier, reviewer' : 'Search name, file, supplier'}
                className={`${controlCls} w-full pl-9`} />
            </label>
            {(tab === 'internal' || tab === 'shared') && (
              <>
                <label>
                  <span className="sr-only">Category</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value as 'all' | DocumentCategory)} className={`${controlCls} w-full sm:w-52`}>
                    <option value="all">All categories</option>
                    {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Visibility</span>
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'all' | DocumentVisibility)} className={`${controlCls} w-full sm:w-48`}>
                    <option value="all">All visibility</option>
                    {tab === 'internal' && <option value="private">Private</option>}
                    <option value="shared">{tab === 'internal' ? 'Shared externally' : `Shared with ${gecName}`}</option>
                    <option value="public">Public</option>
                  </select>
                </label>
              </>
            )}
          </div>
          {tab === 'compliance' ? (
            <div role="group" aria-label="Compliance status" className="flex flex-wrap gap-1.5">
              {complianceFilters.map((f) => {
                const on = complianceFilter === f.id;
                return (
                  <button key={f.id} type="button" aria-pressed={on} onClick={() => { setComplianceFilter(f.id); setReviewingId(null); }}
                    className={`${sokoTokens.focus} h-8 px-3 rounded-full border text-xs font-medium transition-colors cursor-pointer ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                    {f.label} <span className={`ml-0.5 tabular-nums ${on ? 'text-slate-300' : 'text-slate-400'}`}>{f.count}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 tabular-nums" aria-live="polite">{resultCount} result{resultCount === 1 ? '' : 's'}</p>
          )}
        </div>

        {tab === 'shared' && (
          <p className="mx-5 mb-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600 leading-relaxed">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" aria-hidden />
            Each supplier controls access and can revoke it at any time. Documents stay in the supplier&apos;s storage and are not copied into {gecName}&apos;s workspace.
          </p>
        )}
        {tab === 'compliance' && (
          <p className="mx-5 mb-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600 leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" aria-hidden />
            Compliance reviews are {gecName}&apos;s internal process. Accepting a document here does not grant SOKO supplier verification.
          </p>
        )}

        {tab === 'internal' && (
          <div className="overflow-x-auto border-t border-slate-200/80">
            {internalRows.length === 0 ? (
              <SokoEmptyState icon={FileText} title={ownDocs.length === 0 ? 'No internal documents yet' : 'No documents match these filters'}
                description={ownDocs.length === 0 ? 'Upload contracts, policies and project records owned by your company.' : 'Try a different search, category or visibility.'}
                action={ownDocs.length === 0 && canUpload && !isFull ? <button type="button" onClick={openUpload} className={`${btnPrimary} text-sm`}><Upload className="w-4 h-4" aria-hidden /> Upload document</button> : undefined} />
            ) : (
              <table className="w-full min-w-[880px]">
                <thead className="bg-slate-50/70">
                  <tr>
                    <th scope="col" className={thCls}>Document</th>
                    <th scope="col" className={thCls}>Owner</th>
                    <th scope="col" className={thCls}>Category</th>
                    <th scope="col" className={thCls}>Visibility</th>
                    <th scope="col" className={thCls}>Review status</th>
                    <th scope="col" className={thCls}>Expiry</th>
                    <th scope="col" className={`${thCls} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {internalRows.map((d) => {
                    const vis = INTERNAL_VISIBILITY[d.visibility];
                    const shareCount = d.shares.filter((s) => new Date(s.until) > new Date()).length;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60">
                        <td className={`${tdCls} max-w-xs`}><DocNameCell doc={d} onPreview={() => setPreviewDoc(d)} /></td>
                        <td className={`${tdCls} text-sm text-slate-700 whitespace-nowrap`}>{gecName}</td>
                        <td className={`${tdCls} text-sm text-slate-600 whitespace-nowrap`}>{d.category}</td>
                        <td className={tdCls}>
                          <VisibilityBadge icon={vis.icon} label={vis.label} tone={vis.tone}
                            note={d.visibility === 'shared' ? `${shareCount} active share${shareCount === 1 ? '' : 's'}` : d.visibility === 'private' ? ACCESS_META[d.access].label : undefined} />
                        </td>
                        <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>Not required</td>
                        <td className={tdCls}><ExpiryCell date={d.expiry} /></td>
                        <td className={`${tdCls} text-right whitespace-nowrap`}>
                          <IconAction icon={Eye} label={`Preview ${d.name}`} onClick={() => setPreviewDoc(d)} />
                          <IconAction icon={Download} label={`Download ${d.name}`} onClick={() => requestDownload(d)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'shared' && (
          <div className="overflow-x-auto border-t border-slate-200/80">
            {supplierRows.length === 0 ? (
              <SokoEmptyState icon={ExternalLink} title={supplierDocs.length === 0 ? 'No supplier documents available' : 'No documents match these filters'}
                description={supplierDocs.length === 0 ? `When a supplier in your vendor register shares or publishes a document, it appears here.` : 'Try a different search, category or visibility.'} />
            ) : (
              <table className="w-full min-w-[960px]">
                <thead className="bg-slate-50/70">
                  <tr>
                    <th scope="col" className={thCls}>Document</th>
                    <th scope="col" className={thCls}>Supplier</th>
                    <th scope="col" className={thCls}>Category</th>
                    <th scope="col" className={thCls}>Visibility</th>
                    <th scope="col" className={thCls}>Review status</th>
                    <th scope="col" className={thCls}>Expiry</th>
                    <th scope="col" className={`${thCls} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierRows.map((d) => {
                    const vendor = vendorBySupplier.get(d.companyId)!;
                    const review = VENDOR_REVIEW_META[vendor.approvalStatus];
                    const share = d.visibility === 'shared' ? findValidShare(d, gecName) : undefined;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60">
                        <td className={`${tdCls} max-w-xs`}><DocNameCell doc={d} onPreview={() => setPreviewDoc(d)} /></td>
                        <td className={tdCls}>
                          <button type="button" onClick={() => setProfileSupplierId(d.companyId)}
                            className={`${sokoTokens.focus} text-sm font-medium text-slate-800 hover:text-blue-700 rounded whitespace-nowrap cursor-pointer`}>
                            {vendor.supplierName}
                          </button>
                          <p className="text-[11px] text-slate-400 whitespace-nowrap">{vendor.tradeCategory}</p>
                        </td>
                        <td className={`${tdCls} text-sm text-slate-600 whitespace-nowrap`}>{d.category}</td>
                        <td className={tdCls}>
                          {share
                            ? <VisibilityBadge icon={ExternalLink} label={`Shared with ${gecName}`} tone="shared" note={`Until ${fmtDate(share.until)}`} />
                            : <VisibilityBadge icon={Eye} label="Public" tone="public" note="All SOKO users" />}
                        </td>
                        <td className={tdCls}><SokoStatusIndicator label={review.label} tone={review.tone} /></td>
                        <td className={tdCls}><ExpiryCell date={d.expiry} /></td>
                        <td className={`${tdCls} text-right whitespace-nowrap`}>
                          <IconAction icon={Eye} label={`Preview ${d.name}`} onClick={() => setPreviewDoc(d)} />
                          <IconAction icon={Download} label={`Download ${d.name}`} onClick={() => requestDownload(d)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'compliance' && (
          <div className="overflow-x-auto border-t border-slate-200/80">
            {complianceRows.length === 0 ? (
              <SokoEmptyState icon={ShieldCheck}
                title={complianceDocs.length === 0 ? 'No compliance documents tracked' : complianceFilter === 'queue' ? 'Review queue is clear' : 'Nothing in this status'}
                description={complianceDocs.length === 0 ? 'Track required supplier documents from your vendor register to manage submissions, reviews and expiries.' : undefined}
                action={complianceDocs.length === 0 && canUpload ? <button type="button" onClick={() => setShowAddCompliance(true)} className={`${btnPrimary} text-sm`}><Plus className="w-4 h-4" aria-hidden /> Track compliance document</button> : undefined} />
            ) : (
              <table className="w-full min-w-[960px]">
                <thead className="bg-slate-50/70">
                  <tr>
                    <th scope="col" className={thCls}>Document</th>
                    <th scope="col" className={thCls}>Supplier</th>
                    <th scope="col" className={thCls}>Review status</th>
                    <th scope="col" className={thCls}>Issued</th>
                    <th scope="col" className={thCls}>Expiry</th>
                    <th scope="col" className={thCls}>Reviewer</th>
                    <th scope="col" className={`${thCls} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complianceRows.map((d) => {
                    const meta = COMPLIANCE_STATUS_META[d.status];
                    const reviewable = canUpload && d.status !== 'accepted' && d.status !== 'rejected';
                    const open = reviewingId === d.id;
                    return (
                      <React.Fragment key={d.id}>
                        <tr className={open ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}>
                          <td className={tdCls}>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-4 h-4" aria-hidden />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-slate-900 truncate">{d.documentType}</span>
                                <span className="block text-[11px] text-slate-500 truncate font-mono">{d.fileName ?? 'No file attached'}</span>
                              </span>
                            </div>
                          </td>
                          <td className={`${tdCls} text-sm text-slate-700 whitespace-nowrap`}>{d.supplierName}</td>
                          <td className={tdCls}><SokoStatusIndicator label={meta.label} tone={meta.tone} /></td>
                          <td className={`${tdCls} text-sm text-slate-600 tabular-nums whitespace-nowrap`}>{d.issueDate ? fmtDate(d.issueDate) : <span className="text-slate-400">—</span>}</td>
                          <td className={tdCls}><ExpiryCell date={d.expiryDate} /></td>
                          <td className={tdCls}>
                            {d.reviewer ? (
                              <>
                                <p className="text-sm text-slate-700 whitespace-nowrap">{d.reviewer}</p>
                                {d.reviewedAt && <p className="text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(d.reviewedAt)}</p>}
                              </>
                            ) : <span className="text-xs text-slate-400">Unassigned</span>}
                          </td>
                          <td className={`${tdCls} text-right whitespace-nowrap`}>
                            {reviewable && !open && (
                              <button type="button" onClick={() => startReview(d)} className={`${btnSecondary} text-xs`}>Review</button>
                            )}
                            {canDelete && (
                              <IconAction icon={Trash2} label={`Stop tracking ${d.documentType}`} danger
                                onClick={() => sw.run(deleteVendorComplianceDoc(sw.ctx, d.id), 'Removed compliance document')} />
                            )}
                            {!reviewable && !canDelete && <span className="text-xs text-slate-400">—</span>}
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-blue-50/40">
                            <td colSpan={7} className="px-4 pb-4">
                              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                                <label className="flex flex-col gap-1.5">
                                  <span className="text-xs font-medium text-slate-700">Review notes for {d.documentType} · {d.supplierName}</span>
                                  <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} placeholder="Optional notes recorded with this decision" className={inputCls} />
                                </label>
                                {d.reviewNotes && <p className="text-[11px] text-slate-500">Previous note: {d.reviewNotes}</p>}
                                <div className="flex flex-wrap gap-2">
                                  <button type="button" onClick={() => submitReview(d, 'accepted')} className={`${btnPrimary} text-xs`}><CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> Accept</button>
                                  <button type="button" onClick={() => submitReview(d, 'rejected')} className={`${btnSecondary} text-xs`}>Reject</button>
                                  {d.status !== 'under-review' && (
                                    <button type="button" onClick={() => submitReview(d, 'under-review')} className={`${btnSecondary} text-xs`}>Mark under review</button>
                                  )}
                                  <button type="button" onClick={() => setReviewingId(null)} className={`${btnGhost} text-xs`}>
                                    <X className="w-3.5 h-3.5" aria-hidden /> Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="border-t border-slate-200/80 px-5 py-4">
            {activityRows.length === 0 ? (
              <SokoEmptyState icon={History} title={activity.length === 0 ? 'No document activity yet' : 'No activity matches this search'}
                description={activity.length === 0 ? 'Uploads, new versions and compliance reviews will be listed here.' : undefined} />
            ) : (
              <ol className="max-w-3xl">
                {activityRows.map((e, i) => (
                  <SokoTimelineItem key={e.id} actor={e.actor} tag={e.tag} timestamp={fmtDate(e.at)} last={i === activityRows.length - 1}>
                    <span className="font-medium text-slate-900">{e.actor}</span> {e.text.charAt(0).toLowerCase() + e.text.slice(1)}
                  </SokoTimelineItem>
                ))}
              </ol>
            )}
          </div>
        )}
      </section>

      {expiringTotal > 0 && tab !== 'compliance' && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5 text-amber-500" aria-hidden />
          {expiringTotal} document{expiringTotal === 1 ? '' : 's'} expire within 30 days.
        </p>
      )}

      <DemoNote>
        File selection, previews and downloads are simulated. Secure storage, signed download links and server-enforced access revocation require backend integration. Company documents stay isolated between workspaces: suppliers cannot see {gecName}&apos;s internal files.
      </DemoNote>

      {showUpload && <UploadDialog sw={sw} onClose={() => setShowUpload(false)} />}
      {showUpgrade && <UpgradeModal sw={sw} onClose={() => setShowUpgrade(false)} />}
      {showAddCompliance && <AddComplianceDialog sw={sw} onClose={() => setShowAddCompliance(false)} />}
      {previewDoc && <DocPreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} onDownload={() => requestDownload(previewDoc)} />}
      {profileSupplierId && <SupplierProfileModal supplierId={profileSupplierId} onClose={() => setProfileSupplierId(null)} />}
    </div>
  );
};

