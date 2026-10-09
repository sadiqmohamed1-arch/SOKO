import React, { useMemo, useState } from 'react';
import {
  FileText, Search, Lock, Eye, EyeOff, Download, Clock,
  ShieldCheck, AlertTriangle, Building2, ExternalLink,
  Upload, HardDrive, Crown, X, Plus, CheckCircle2, Trash2, FileWarning,
} from 'lucide-react';
import { CompanyDocument, DocumentVisibility, DocumentCategory, DocumentAccessLevel, DOCUMENT_CATEGORIES, ACCESS_META, CONTRACTOR_TIER_CONFIG, VendorComplianceDoc, VendorDocStatus } from '../../data/supplierTypes';
import { btnPrimary, btnSecondary, btnGhost, inputCls, labelCls, StatusPill } from '../NetworkShared';
import { DemoNote, EmptyState, KpiCard, SubTabs, fmtDate, Field } from '../marketHub/MarketHubShared';
import { PageHeader, SW } from './SupplierShared';
import { ProfileDialog } from '../ProfileDialog';
import { BUYER_SUPPLIERS } from '../../data/buyerSuppliers';
import { BuyerSupplierProfile, ProfileTab } from '../BuyerSupplierProfile';
import { uploadDocument, addVendorComplianceDoc, reviewVendorComplianceDoc, deleteVendorComplianceDoc } from '../../data/supplierService';
import { storageAllocationMb, storageUsedMb } from '../../data/supplierStore';

type Section = 'own' | 'shared' | 'compliance' | 'review' | 'expiring';

const VISIBILITY_META: Record<DocumentVisibility, { label: string; icon: typeof Lock; cls: string }> = {
  'private': { label: 'Private', icon: Lock, cls: 'text-slate-500 bg-slate-50 border-slate-200' },
  'public': { label: 'Public', icon: Eye, cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  'shared': { label: 'Shared', icon: ExternalLink, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

const COMPLIANCE_STATUS_META: Record<VendorDocStatus, { label: string; tone: 'blue' | 'amber' | 'emerald' | 'rose' | 'slate' }> = {
  'submitted': { label: 'Submitted', tone: 'blue' },
  'missing': { label: 'Missing', tone: 'rose' },
  'under-review': { label: 'Under Review', tone: 'amber' },
  'accepted': { label: 'Accepted', tone: 'emerald' },
  'rejected': { label: 'Rejected', tone: 'rose' },
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

// ─── Storage Meter ──────────────────────────────────────────────────
const StorageMeter: React.FC<{ sw: SW; onUpgrade: () => void }> = ({ sw, onUpgrade }) => {
  const ownDocs = sw.store.documents.filter((d) => d.companyId === sw.company.id && !d.archived);
  const used = storageUsedMb(ownDocs);
  const total = storageAllocationMb(sw.company);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const available = Math.max(0, Math.round((total - used) * 10) / 10);
  const tierConfig = CONTRACTOR_TIER_CONFIG[sw.company.tier];

  const isWarning = pct >= 80 && pct < 95;
  const isCritical = pct >= 95 && pct < 100;
  const isFull = pct >= 100;

  const barColor = isFull ? 'bg-rose-600' : isCritical ? 'bg-amber-500' : isWarning ? 'bg-amber-400' : 'bg-blue-600';
  const bgColor = isFull ? 'bg-rose-50 border-rose-200' : isCritical ? 'bg-amber-50 border-amber-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200';

  return (
    <div className={`rounded-xl border ${bgColor} px-4 py-3 mb-4`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <HardDrive className={`w-5 h-5 ${isFull || isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-500'}`} />
          <div>
            <p className="text-sm font-semibold text-slate-900">{tierConfig.label}</p>
            <p className="text-xs text-slate-500">{used.toFixed(1)} MB used of {total.toLocaleString()} MB · {available.toFixed(1)} MB available · {pct}%</p>
          </div>
        </div>
        {sw.can('plan.manage') && sw.company.tier !== 'premium' && (
          <button type="button" onClick={onUpgrade} className={`${btnPrimary} text-xs`}>
            <Crown className="w-3.5 h-3.5" /> Upgrade to Premium
          </button>
        )}
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      {isWarning && (
        <p className="mt-2 text-xs text-amber-800 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Storage usage is at {pct}%. Consider upgrading to Premium for 25 GB.
        </p>
      )}
      {isCritical && (
        <p className="mt-2 text-xs text-amber-900 font-semibold flex items-center gap-1.5">
          <FileWarning className="w-3.5 h-3.5" /> Storage is nearly full ({pct}%). New uploads may be blocked soon.
        </p>
      )}
      {isFull && (
        <p className="mt-2 text-xs text-rose-800 font-semibold flex items-center gap-1.5">
          <FileWarning className="w-3.5 h-3.5" /> Storage is full. New uploads are blocked. Existing documents can still be viewed and downloaded. {sw.can('plan.manage') && 'Upgrade to Premium to continue uploading.'}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-slate-400">Storage counts only documents owned by {sw.company.profile.tradingName}. Supplier documents shared with you do not consume your quota.</p>
    </div>
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

// ─── Vendor Compliance Row ──────────────────────────────────────────
const ComplianceRow: React.FC<{ doc: VendorComplianceDoc; sw: SW }> = ({ doc, sw }) => {
  const [showReview, setShowReview] = useState(false);
  const [reviewNotes, setReviewNotes] = useState(doc.reviewNotes ?? '');
  const canManage = sw.can('documents.manage');
  const canDelete = sw.can('records.delete');
  const meta = COMPLIANCE_STATUS_META[doc.status];

  const handleReview = (status: VendorDocStatus) => {
    const res = reviewVendorComplianceDoc(sw.ctx, doc.id, status, reviewNotes);
    if (sw.run(res, `Reviewed "${doc.documentType}" from ${doc.supplierName}: ${COMPLIANCE_STATUS_META[status].label}`)) {
      setShowReview(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-900 truncate">{doc.documentType}</span>
            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {doc.supplierName}
            {doc.issueDate && ` · Issued ${fmtDate(doc.issueDate)}`}
            {doc.expiryDate && ` · Expires ${fmtDate(doc.expiryDate)}`}
            {doc.fileName && ` · ${doc.fileName}`}
          </p>
          {doc.reviewer && <p className="text-[10px] text-slate-400 mt-0.5">Reviewed by {doc.reviewer}{doc.reviewedAt ? ` · ${fmtDate(doc.reviewedAt)}` : ''}{doc.reviewNotes ? ` · ${doc.reviewNotes}` : ''}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {canManage && !showReview && doc.status !== 'accepted' && doc.status !== 'rejected' && (
            <button type="button" onClick={() => setShowReview(true)} className={`${btnGhost} text-xs`}>Review</button>
          )}
          {canDelete && (
            <button type="button" aria-label="Delete" onClick={() => sw.run(deleteVendorComplianceDoc(sw.ctx, doc.id), `Removed compliance document`)} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {showReview && (
        <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
          <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Review notes (optional)…" rows={2} className={inputCls} />
          <div className="flex gap-1.5 flex-wrap">
            <button type="button" onClick={() => handleReview('accepted')} className={`${btnPrimary} text-xs`}><CheckCircle2 className="w-3.5 h-3.5" /> Accept</button>
            <button type="button" onClick={() => handleReview('rejected')} className={`${btnSecondary} text-xs`}>Reject</button>
            <button type="button" onClick={() => handleReview('under-review')} className={`${btnSecondary} text-xs`}>Mark Under Review</button>
            <button type="button" onClick={() => setShowReview(false)} className={`${btnGhost} text-xs`}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Document Preview Dialog ────────────────────────────────────────
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

// ─── Shared Document Row ────────────────────────────────────────────
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

// ─── Main Component ─────────────────────────────────────────────────
export const ContractorDocumentCenter: React.FC<{ sw: SW }> = ({ sw }) => {
  const [section, setSection] = useState<Section>('own');
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<CompanyDocument | null>(null);
  const [profileSupplierId, setProfileSupplierId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAddCompliance, setShowAddCompliance] = useState(false);

  const ownDocs = sw.store.documents.filter((d) => d.companyId === sw.company.id && !d.archived);
  const used = storageUsedMb(ownDocs);
  const total = storageAllocationMb(sw.company);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const isFull = pct >= 100;

  const canUpload = sw.can('documents.manage');

  const vendors = sw.store.vendorRecords.filter((v) => v.companyId === sw.company.id && v.supplierCompanyId);
  const linkedSupplierIds = vendors.map((v) => v.supplierCompanyId!);

  const allSupplierDocs = sw.store.documents.filter((d) => linkedSupplierIds.includes(d.companyId) && !d.archived);
  const sharedWithGec = allSupplierDocs.filter((d) => findValidShare(d, sw.company.profile.tradingName));

  const reviewVendorIds = vendors.filter((v) => v.approvalStatus === 'under-review' || v.approvalStatus === 'not-reviewed').map((v) => v.supplierCompanyId!);
  const awaitingReview = allSupplierDocs.filter((d) => reviewVendorIds.includes(d.companyId) && (d.visibility === 'shared' || d.visibility === 'public'));

  const expiringSupplierDocs = allSupplierDocs.filter((d) => isExpiringSoon(d) && (findValidShare(d, sw.company.profile.tradingName) || d.visibility === 'public'));

  const complianceDocs = sw.store.vendorComplianceDocs.filter((d) => d.companyId === sw.company.id);

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

  const complianceByVendor = useMemo(() => {
    const map = new Map<string, { vendorName: string; docs: VendorComplianceDoc[] }>();
    complianceDocs.forEach((d) => {
      if (!map.has(d.vendorId)) map.set(d.vendorId, { vendorName: d.supplierName, docs: [] });
      map.get(d.vendorId)!.docs.push(d);
    });
    return Array.from(map.values());
  }, [complianceDocs]);

  const ownFiltered = search
    ? ownDocs.filter((d) => `${d.name} ${d.category} ${d.fileName}`.toLowerCase().includes(search.toLowerCase()))
    : ownDocs;

  return (
    <div>
      <PageHeader
        eyebrow="Documents · Contractor"
        title="Document Center"
        subtitle="Internal company documents, vendor compliance tracking, shared supplier documents and review queue."
        actions={
          canUpload && (
            <button type="button" onClick={() => isFull ? sw.notify('Storage is full. Upgrade to Premium to upload more documents.') : setShowUpload(true)} className={btnPrimary}>
              <Upload className="w-4 h-4" /> Upload Document
            </button>
          )
        }
      />

      <StorageMeter sw={sw} onUpgrade={() => setShowUpgrade(true)} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Internal Documents" value={ownDocs.length} />
        <KpiCard label="Compliance Tracked" value={complianceDocs.length} />
        <KpiCard label="Shared with GEC" value={sharedWithGec.length} />
        <KpiCard label="Awaiting Review" value={awaitingReview.length} />
        <KpiCard label="Expiring Soon" value={expiringSupplierDocs.length} />
        <KpiCard label="Storage Used" value={`${pct}%`} />
      </div>

      {/* Section Tabs */}
      <div className="mb-4">
        <SubTabs
          tabs={[
            { id: 'own' as Section, label: 'Internal Documents', count: ownDocs.length },
            { id: 'compliance' as Section, label: 'Vendor Compliance', count: complianceDocs.length },
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
            <EmptyState
              icon={<FileText className="w-5 h-5" />}
              title="No internal documents"
              text="Upload your company's own documents — contracts, policies, project records and more."
              action={canUpload && !isFull ? <button type="button" onClick={() => setShowUpload(true)} className={btnPrimary}><Upload className="w-4 h-4" /> Upload Document</button> : undefined}
            />
          ) : (
            <ul className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
              {ownFiltered.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => setPreviewDoc(d)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 cursor-pointer">
                    <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                      <p className="text-xs text-slate-500 truncate">{d.category} · {d.sizeMb.toFixed(1)} MB · Uploaded {fmtDate(d.uploadedAt)}{d.expiry ? ` · Expires ${fmtDate(d.expiry)}` : ''}</p>
                    </div>
                    {d.expiry && isExpiringSoon(d) && <span className="text-xs text-amber-700 font-medium">Expiring</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ─── Vendor Compliance ─── */}
      {section === 'compliance' && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-slate-600">Track required supplier documents from your vendor register.</p>
              <p className="text-xs text-slate-400 mt-0.5">Accepting a document here is GEC's internal review — it does not constitute SOKO global supplier verification.</p>
            </div>
            {canUpload && (
              <button type="button" onClick={() => setShowAddCompliance(true)} className={`${btnSecondary} text-sm whitespace-nowrap`}>
                <Plus className="w-4 h-4" /> Add Compliance Document
              </button>
            )}
          </div>

          {/* Compliance status summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {(['submitted', 'missing', 'under-review', 'accepted', 'rejected'] as VendorDocStatus[]).map((s) => {
              const count = complianceDocs.filter((d) => d.status === s).length;
              const meta = COMPLIANCE_STATUS_META[s];
              return (
                <div key={s} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
                  <p className="text-lg font-bold text-slate-900 tabular-nums">{count}</p>
                  <p className="text-[10px] text-slate-500">{meta.label}</p>
                </div>
              );
            })}
          </div>

          {complianceByVendor.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="w-5 h-5" />} title="No compliance documents tracked" text="Add compliance documents from your vendor register to track submissions, reviews and expiries." />
          ) : (
            <div className="space-y-4">
              {complianceByVendor.map((group) => (
                <div key={group.vendorName}>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900">{group.vendorName}</h3>
                    <span className="text-xs text-slate-400">({group.docs.length} document{group.docs.length > 1 ? 's' : ''})</span>
                  </div>
                  <div className="space-y-2">
                    {group.docs.map((d) => <ComplianceRow key={d.id} doc={d} sw={sw} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Shared with GEC ─── */}
      {section === 'shared' && (
        <div>
          <div className="mb-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-sm text-blue-900 font-semibold">Documents suppliers have explicitly shared with {sw.company.profile.tradingName}</p>
            <p className="text-xs text-blue-700 mt-0.5">Access is granted by the supplier and can be revoked at any time. These documents do not consume GEC's storage quota.</p>
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
        <DemoNote>Document sharing and access control are prototype demonstrations using centralized sample records. Real file storage, secure download links and server-enforced access revocation require backend integration with access-controlled storage (e.g. Supabase Storage with RLS policies). Company documents are isolated between workspaces — ABC Waterproofing cannot access GEC's internal files.</DemoNote>
      </div>

      {showUpload && <UploadDialog sw={sw} onClose={() => setShowUpload(false)} />}
      {showUpgrade && <UpgradeModal sw={sw} onClose={() => setShowUpgrade(false)} />}
      {showAddCompliance && <AddComplianceDialog sw={sw} onClose={() => setShowAddCompliance(false)} />}
      {previewDoc && <DocPreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      {profileSupplierId && <SupplierProfileModal supplierId={profileSupplierId} onClose={() => setProfileSupplierId(null)} />}
    </div>
  );
};
