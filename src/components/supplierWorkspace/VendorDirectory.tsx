import React, { useState, useMemo } from 'react';
import {
  Users, Search, Plus, Trash2, ExternalLink, Lock,
  ShieldCheck, ShieldQuestion, ChevronRight, ArrowLeft,
  FileText, Download, Eye, EyeOff, Clock, X,
} from 'lucide-react';
import { VendorRecord, VendorApprovalStatus, CompanyDocument, DocumentVisibility } from '../../data/supplierTypes';
import { addVendor, updateVendorStatus, removeVendor, addVendorNote, deleteVendorNote } from '../../data/supplierService';
import { StatusPill, btnPrimary, btnSecondary, btnGhost, inputCls, labelCls } from '../NetworkShared';
import { ProfileDialog } from '../ProfileDialog';
import { DemoNote, EmptyState, Field, KpiCard, SubTabs, fmtDate } from '../marketHub/MarketHubShared';
import { PageHeader, SW } from './SupplierShared';
import { BUYER_SUPPLIERS, BuyerSupplier } from '../../data/buyerSuppliers';
import { BuyerSupplierProfile, ProfileTab } from '../BuyerSupplierProfile';

const APPROVAL_META: Record<VendorApprovalStatus, { label: string; tone: 'blue' | 'slate' | 'amber' | 'gold' }> = {
  'not-reviewed': { label: 'Not Reviewed', tone: 'slate' },
  'under-review': { label: 'Under Review', tone: 'amber' },
  'approved': { label: 'Approved', tone: 'blue' },
  'conditionally-approved': { label: 'Conditionally Approved', tone: 'amber' },
  'rejected': { label: 'Rejected', tone: 'slate' },
  'suspended': { label: 'Suspended', tone: 'slate' },
};

const APPROVAL_OPTIONS: VendorApprovalStatus[] = ['not-reviewed', 'under-review', 'approved', 'conditionally-approved', 'rejected', 'suspended'];

const VISIBILITY_META: Record<DocumentVisibility, { label: string; icon: typeof Lock; cls: string }> = {
  'private': { label: 'Private', icon: Lock, cls: 'text-slate-500 bg-slate-50 border-slate-200' },
  'public': { label: 'Public', icon: Eye, cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  'shared': { label: 'Shared', icon: ExternalLink, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

type Filter = 'all' | 'approved' | 'review' | 'external' | 'new';

// ─── Document Access Check ─────────────────────────────────────────
/**
 * Checks if a contractor company can access a supplier document.
 * Access is granted if:
 * - The document is shared with the contractor's trading name
 * - The share has not expired
 * Returns the matching share if access is granted, undefined otherwise.
 */
const findValidShare = (doc: CompanyDocument, companyTradingName: string) => {
  return doc.shares.find((s) => {
    if (s.company !== companyTradingName) return false;
    const until = new Date(s.until);
    return until > new Date();
  });
};

const isShareExpired = (doc: CompanyDocument, companyTradingName: string) => {
  const share = doc.shares.find((s) => s.company === companyTradingName);
  if (!share) return false;
  return new Date(share.until) <= new Date();
};

// ─── Shared Document Row ───────────────────────────────────────────
const SharedDocRow: React.FC<{ doc: CompanyDocument; sw: SW; onView: () => void }> = ({ doc, sw, onView }) => {
  const share = findValidShare(doc, sw.company.profile.tradingName);
  const expired = isShareExpired(doc, sw.company.profile.tradingName);
  const canAccess = !!share && !expired;
  const visMeta = VISIBILITY_META[doc.visibility];

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
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {doc.category} · {doc.sizeMb.toFixed(1)} MB · Shared by {doc.uploadedBy} on {fmtDate(share?.at ?? doc.uploadedAt)}
          </p>
          {share && (
            <p className={`text-[10px] mt-0.5 ${expired ? 'text-rose-600' : 'text-slate-400'}`}>
              {expired ? <><Clock className="w-2.5 h-2.5 inline" /> Access expired {fmtDate(share.until)}</> : <>Access valid until {fmtDate(share.until)}</>}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {canAccess ? (
            <>
              <button type="button" onClick={onView} className={`${btnGhost} text-xs`}>
                <Eye className="w-3.5 h-3.5" />Preview
              </button>
              <button type="button" onClick={() => sw.notify(`Downloading "${doc.name}" — simulated file download`)} className={`${btnGhost} text-xs`}>
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-rose-500">
              <EyeOff className="w-3.5 h-3.5" />No access
            </span>
          )}
        </div>
      </div>
    </div>
  );
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
      <DemoNote>This is a prototype document preview. Real file storage and secure download links require backend integration with access-controlled storage.</DemoNote>
    </div>
  </ProfileDialog>
);

// ─── Public Supplier Profile Modal ─────────────────────────────────
const SupplierProfileModal: React.FC<{ supplierId: string; onClose: () => void }> = ({ supplierId, onClose }) => {
  const supplier = useMemo(() => BUYER_SUPPLIERS.find((s) => s.id === supplierId), [supplierId]);
  if (!supplier) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />Back to Vendor Register
        </button>
        <span className="text-xs text-slate-400">Public Supplier Profile</span>
      </div>
      <BuyerSupplierProfile
        supplier={supplier}
        matchQuery=""
        initialTab={'overview' as ProfileTab}
        saved={false}
        networkContacts={[]}
        onUpdateNetworkContacts={() => {}}
        onBack={onClose}
        onToggleSave={() => {}}
        onContact={() => {}}
        onOpenSupplier={() => {}}
        onRequestContact={() => {}}
        onNotify={() => {}}
      />
    </div>
  );
};

// ─── Vendor Detail Modal ───────────────────────────────────────────
const VendorDetailModal: React.FC<{ sw: SW; vendor: VendorRecord; onClose: () => void; onOpenSupplierProfile: (id: string) => void }> = ({ sw, vendor, onClose, onOpenSupplierProfile }) => {
  const [note, setNote] = useState('');
  const [showApproval, setShowApproval] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CompanyDocument | null>(null);
  const canManage = sw.can('contacts.manage');

  const linkedCompany = vendor.supplierCompanyId
    ? sw.store.companies.find((c) => c.id === vendor.supplierCompanyId)
    : undefined;

  const saveNote = () => {
    if (sw.run(addVendorNote(sw.ctx, vendor.id, note), 'Internal note added')) setNote('');
  };

  const removeNote = (noteId: string) => {
    sw.run(deleteVendorNote(sw.ctx, vendor.id, noteId), 'Note deleted');
  };

  const changeStatus = (status: VendorApprovalStatus) => {
    sw.run(updateVendorStatus(sw.ctx, vendor.id, status), `Vendor status updated to ${APPROVAL_META[status].label}`);
    setShowApproval(false);
  };

  // Find visit history for this vendor
  const vendorVisits = sw.store.visits.filter((v) =>
    (v.companyId === sw.company.id || v.hostCompanyId === sw.company.id) &&
    (v.hostCompany === vendor.supplierName || v.companyId === vendor.supplierCompanyId)
  );

  // Find documents from this supplier that are accessible to GEC
  const supplierDocs = vendor.supplierCompanyId
    ? sw.store.documents.filter((d) => d.companyId === vendor.supplierCompanyId && !d.archived)
    : [];

  // Categorize: shared with us, public, and private (inaccessible)
  const sharedWithUs = supplierDocs.filter((d) => findValidShare(d, sw.company.profile.tradingName));
  const publicDocs = supplierDocs.filter((d) => d.visibility === 'public' && !findValidShare(d, sw.company.profile.tradingName));
  const privateDocs = supplierDocs.filter((d) => d.visibility === 'private' && !findValidShare(d, sw.company.profile.tradingName));
  const expiredShared = supplierDocs.filter((d) => isShareExpired(d, sw.company.profile.tradingName) && !findValidShare(d, sw.company.profile.tradingName));

  // Products from this supplier
  const supplierProducts = vendor.supplierCompanyId
    ? sw.store.products.filter((p) => p.companyId === vendor.supplierCompanyId && p.status === 'active')
    : [];

  return (
    <ProfileDialog
      title={vendor.supplierName}
      subtitle={vendor.tradeCategory}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">Vendor ID: {vendor.id}</span>
          <button type="button" onClick={onClose} className={`${btnGhost} text-sm`}>Close</button>
        </div>
      }
    >
      <div className="px-5 py-4 space-y-5">
        {/* Overview */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <StatusPill tone={APPROVAL_META[vendor.approvalStatus].tone}>{APPROVAL_META[vendor.approvalStatus].label}</StatusPill>
            {vendor.sokoVerified ? (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                <ShieldCheck className="w-3 h-3" />SOKO Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 font-semibold">
                <ShieldQuestion className="w-3 h-3" />Not SOKO Verified
              </span>
            )}
            {vendor.external && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">External</span>}
          </div>
          {canManage && (
            <div className="relative">
              <button type="button" onClick={() => setShowApproval(!showApproval)} className={`${btnSecondary} text-xs`}>
                Change Approval <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showApproval ? 'rotate-90' : ''}`} />
              </button>
              {showApproval && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-white rounded-lg border border-slate-200 shadow-xl py-1 min-w-[200px]">
                  {APPROVAL_OPTIONS.map((st) => (
                    <button key={st} type="button" onClick={() => changeStatus(st)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer">
                      {APPROVAL_META[st].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-200 p-3">
          <Field label="Trade Category" value={vendor.tradeCategory} />
          <Field label="Location" value={vendor.location} />
          <Field label="Contact Person" value={vendor.contactPerson} />
          {vendor.contactEmail && <Field label="Email" value={vendor.contactEmail} />}
          {vendor.contactPhone && <Field label="Phone" value={vendor.contactPhone} />}
          <Field label="Added" value={`${fmtDate(vendor.addedAt)} by ${vendor.addedBy}`} />
          {vendor.lastVisitDate && <Field label="Last Visit" value={fmtDate(vendor.lastVisitDate)} />}
        </div>

        {/* View Public Profile */}
        {linkedCompany && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5">
            <ExternalLink className="w-4 h-4 text-blue-700 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900">SOKO Company Profile Available</p>
              <p className="text-xs text-blue-700">View {vendor.supplierName}'s public profile, products, contacts and certifications.</p>
            </div>
            <button type="button" onClick={() => onOpenSupplierProfile(linkedCompany.id)} className={`${btnPrimary} text-xs whitespace-nowrap`}>
              View Profile
            </button>
          </div>
        )}

        {/* Products */}
        {supplierProducts.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Products ({supplierProducts.length})</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {supplierProducts.slice(0, 6).map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.type} · {p.brand}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visits */}
        {vendorVisits.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Visit History ({vendorVisits.length})</p>
            <div className="space-y-2">
              {vendorVisits.map((v) => (
                <div key={v.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{fmtDate(v.date)} · {v.time}</span>
                    <StatusPill tone={v.status === 'completed' ? 'slate' : 'blue'}>{v.status}</StatusPill>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{v.purpose} · {v.representative} → {v.hostContact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {supplierDocs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Documents from {vendor.supplierName}</p>
              <span className="text-[10px] text-slate-400">{sharedWithUs.length} accessible · {publicDocs.length} public · {privateDocs.length} private</span>
            </div>

            {/* Shared with GEC */}
            {sharedWithUs.length > 0 && (
              <div className="space-y-2 mb-2">
                <p className="text-xs font-semibold text-emerald-700">Shared with {sw.company.profile.tradingName}</p>
                {sharedWithUs.map((d) => (
                  <SharedDocRow key={d.id} doc={d} sw={sw} onView={() => setPreviewDoc(d)} />
                ))}
              </div>
            )}

            {/* Public documents */}
            {publicDocs.length > 0 && (
              <div className="space-y-2 mb-2">
                <p className="text-xs font-semibold text-blue-700">Public Documents</p>
                {publicDocs.map((d) => (
                  <SharedDocRow key={d.id} doc={d} sw={sw} onView={() => setPreviewDoc(d)} />
                ))}
              </div>
            )}

            {/* Expired shares */}
            {expiredShared.length > 0 && (
              <div className="space-y-2 mb-2">
                <p className="text-xs font-semibold text-rose-600">Access Expired</p>
                {expiredShared.map((d) => (
                  <SharedDocRow key={d.id} doc={d} sw={sw} onView={() => {}} />
                ))}
              </div>
            )}

            {/* Private (inaccessible) */}
            {privateDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" />Private — Not Shared with {sw.company.profile.tradingName}</p>
                {privateDocs.map((d) => (
                  <div key={d.id} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="text-slate-400 truncate">{d.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{d.category}</span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400">These documents are private to {vendor.supplierName}. Request access directly from the supplier.</p>
              </div>
            )}
          </div>
        )}

        {/* Internal Notes — Contractor Only */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Internal Notes ({vendor.notes.length})</p>
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" />Private to {sw.company.profile.tradingName}</span>
          </div>
          <div className="space-y-2">
            {vendor.notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{n.note}</p>
                    <p className="mt-1 text-xs text-slate-500">{n.by} · {fmtDate(n.at)}</p>
                  </div>
                  {canManage && n.byId === sw.user.id && (
                    <button type="button" onClick={() => removeNote(n.id)} className="text-slate-400 hover:text-rose-600 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {vendor.notes.length === 0 && <p className="text-sm text-slate-500">No internal notes yet.</p>}
          </div>
          {canManage && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add an internal note (visible only to your company)" className={`${inputCls} flex-1`} />
              <button type="button" onClick={saveNote} className={`${btnPrimary} sm:self-end`}>Save Note</button>
            </div>
          )}
        </div>

        {/* Remove vendor */}
        {canManage && (
          <div className="pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { if (confirm(`Remove ${vendor.supplierName} from your vendor register? This does not delete their SOKO profile.`)) { sw.run(removeVendor(sw.ctx, vendor.id), 'Vendor removed from register'); onClose(); } }} className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-semibold">
              Remove from Vendor Register
            </button>
          </div>
        )}
      </div>

      {previewDoc && <DocPreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </ProfileDialog>
  );
};

// ─── Add Vendor Modal ──────────────────────────────────────────────
const AddVendorModal: React.FC<{ sw: SW; onClose: () => void }> = ({ sw, onClose }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedId, setLinkedId] = useState<string | undefined>(undefined);

  // Search SOKO directory for existing suppliers
  const searchResults = useMemo(() => {
    if (name.trim().length < 2) return [];
    return sw.store.companies
      .filter((c) => c.kind === 'supplier' && c.profile.tradingName.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 5);
  }, [name, sw.store.companies]);

  const save = () => {
    const linked = linkedId ? sw.store.companies.find((c) => c.id === linkedId) : undefined;
    const r = addVendor(sw.ctx, {
      supplierCompanyId: linked?.id,
      supplierName: linked?.profile.tradingName || name,
      tradeCategory: category || linked?.profile.categories[0] || 'General',
      location: location || linked?.profile.emirate || 'UAE',
      sokoVerified: linked?.verification.status === 'verified' || false,
      contactPerson: contact || 'TBD',
      contactEmail: email || undefined,
      contactPhone: phone || undefined,
      external: !linked,
    });
    if (sw.run(r, 'Vendor added to register')) onClose();
  };

  return (
    <ProfileDialog title="Add Vendor" subtitle="Add a supplier to your internal vendor register" onClose={onClose} size="lg"
      footer={<div className="flex items-center justify-end gap-2"><button type="button" onClick={onClose} className={btnGhost}>Cancel</button><button type="button" onClick={save} className={btnPrimary}>Add Vendor</button></div>}
    >
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className={labelCls}>Search SOKO Directory or Enter Manually</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setLinkedId(undefined); }} placeholder="Type a supplier name…" className={inputCls} />
        </div>
        {searchResults.length > 0 && !linkedId && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Found in SOKO directory:</p>
            {searchResults.map((c) => (
              <button key={c.id} type="button" onClick={() => { setLinkedId(c.id); setName(c.profile.tradingName); setCategory(c.profile.categories[0] || ''); setLocation(c.profile.emirate); }}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold">{c.profile.tradingName.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.profile.tradingName}</p>
                  <p className="text-xs text-slate-500">{c.profile.categories[0]} · {c.profile.emirate}</p>
                </div>
                {c.verification.status === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>
            ))}
          </div>
        )}
        {linkedId && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
            <ShieldCheck className="w-4 h-4" />Linked to SOKO company profile. Public details will sync automatically.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Trade Category</label><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Waterproofing" className={inputCls} /></div>
          <div><label className={labelCls}>Location</label><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Dubai" className={inputCls} /></div>
          <div><label className={labelCls}>Contact Person</label><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. Ahmed Khan" className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="optional" className={inputCls} /></div>
        </div>
        <DemoNote>If the supplier is not on SOKO, they will be marked as an external vendor. You can invite them to register later.</DemoNote>
      </div>
    </ProfileDialog>
  );
};

// ─── Main Component ────────────────────────────────────────────────
export const VendorDirectory: React.FC<{ sw: SW }> = ({ sw }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [profileSupplierId, setProfileSupplierId] = useState<string | null>(null);

  const vendors = sw.store.vendorRecords.filter((v) => v.companyId === sw.company.id);

  const approved = vendors.filter((v) => v.approvalStatus === 'approved');
  const review = vendors.filter((v) => v.approvalStatus === 'under-review' || v.approvalStatus === 'conditionally-approved');
  const external = vendors.filter((v) => v.external);
  const newVendors = vendors.filter((v) => v.approvalStatus === 'not-reviewed');

  const shown = filter === 'approved' ? approved : filter === 'review' ? review : filter === 'external' ? external : filter === 'new' ? newVendors : vendors;
  const filtered = search
    ? shown.filter((v) =>
        v.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        v.tradeCategory.toLowerCase().includes(search.toLowerCase()) ||
        v.location.toLowerCase().includes(search.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(search.toLowerCase()))
    : shown;

  const open = vendors.find((v) => v.id === openId);

  // Count expiring documents from linked suppliers
  const linkedSupplierIds = vendors.filter((v) => v.supplierCompanyId).map((v) => v.supplierCompanyId!);
  const expiringDocs = sw.store.documents.filter((d) => linkedSupplierIds.includes(d.companyId) && d.expiry && d.shares.some((s) => s.company === sw.company.profile.tradingName) && new Date(d.expiry) < new Date(Date.now() + 30 * 86400000));

  return (
    <div>
      <PageHeader
        eyebrow="Vendor Management"
        title="Vendor Register"
        subtitle="Manage your internal supplier directory, approvals and vendor relationships."
        actions={sw.can('contacts.manage') && <button type="button" onClick={() => setShowAdd(true)} className={`${btnPrimary} text-sm`}><Plus className="w-4 h-4" />Add Vendor</button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Total Vendors" value={vendors.length} />
        <KpiCard label="Approved" value={approved.length} />
        <KpiCard label="Under Review" value={review.length} />
        <KpiCard label="Not Reviewed" value={newVendors.length} />
        <KpiCard label="External" value={external.length} />
        <KpiCard label="Expiring Docs" value={expiringDocs.length} />
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <SubTabs
          tabs={[
            { id: 'all' as Filter, label: 'All', count: vendors.length },
            { id: 'approved' as Filter, label: 'Approved', count: approved.length },
            { id: 'review' as Filter, label: 'Under Review', count: review.length },
            { id: 'new' as Filter, label: 'New', count: newVendors.length },
            { id: 'external' as Filter, label: 'External', count: external.length },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors…" className={`${inputCls} sm:w-56 sm:ml-auto`} />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-5 h-5" />} title="No vendors" text="Add suppliers to your internal vendor register to track approvals and relationships." />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 font-semibold">Supplier Name</th>
                <th className="px-3 py-2.5 font-semibold">Category</th>
                <th className="px-3 py-2.5 font-semibold">Location</th>
                <th className="px-3 py-2.5 font-semibold">SOKO Status</th>
                <th className="px-3 py-2.5 font-semibold">Approval</th>
                <th className="px-3 py-2.5 font-semibold">Contact</th>
                <th className="px-3 py-2.5 font-semibold">Last Visit</th>
                <th className="px-4 py-2.5 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => (
                <tr key={v.id} onClick={() => setOpenId(v.id)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">{v.supplierName.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <p className="font-medium text-slate-900">{v.supplierName}</p>
                        {v.external && <p className="text-[10px] text-amber-600">External</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{v.tradeCategory}</td>
                  <td className="px-3 py-3 text-slate-600">{v.location}</td>
                  <td className="px-3 py-3">
                    {v.sokoVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><ShieldCheck className="w-3.5 h-3.5" />Verified</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3"><StatusPill tone={APPROVAL_META[v.approvalStatus].tone}>{APPROVAL_META[v.approvalStatus].label}</StatusPill></td>
                  <td className="px-3 py-3 text-slate-700">{v.contactPerson}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{v.lastVisitDate ? fmtDate(v.lastVisitDate) : '—'}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-blue-700">{v.notes.length > 0 ? `${v.notes.length} note${v.notes.length > 1 ? 's' : ''}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <DemoNote>SOKO Verification and internal vendor approval are independent. SOKO Verified does not imply GEC Dubai approval, and vice versa. Document sharing is a prototype — real access-controlled storage requires backend integration.</DemoNote>
      </div>

      {open && <VendorDetailModal sw={sw} vendor={open} onClose={() => setOpenId(null)} onOpenSupplierProfile={(id) => { setOpenId(null); setProfileSupplierId(id); }} />}
      {showAdd && <AddVendorModal sw={sw} onClose={() => setShowAdd(false)} />}
      {profileSupplierId && <SupplierProfileModal supplierId={profileSupplierId} onClose={() => setProfileSupplierId(null)} />}
    </div>
  );
};
