import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users, Search, Plus, Trash2, ExternalLink, Lock,
  ShieldCheck, ShieldQuestion, ChevronRight, ChevronDown, ArrowLeft,
  FileText, Download, Eye, EyeOff, Clock, X,
  Building2, Check, Info, MapPin, StickyNote, UserCheck,
} from 'lucide-react';
import {
  sokoCard, sokoTokens, initialsOf, SokoChip, SokoEmptyState, SokoKpiCell,
  SokoStatusIndicator, SokoStatusTone, SokoTab, SokoTabs,
} from '../sokoDesignSystem/SokoComponents';
import { SokoBreadcrumb } from '../sokoDesignSystem/SokoBreadcrumb';
import { VendorRecord, VendorApprovalStatus, CompanyDocument, DocumentVisibility } from '../../data/supplierTypes';
import { addVendor, updateVendorStatus, removeVendor, addVendorNote, deleteVendorNote, saveCompanyContact, isSavedCorporateContact } from '../../data/supplierService';
import { membersOf } from '../../data/supplierStore';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { StatusPill, btnPrimary, btnSecondary, btnGhost, inputCls, labelCls } from '../NetworkShared';
import { ProfileDialog } from '../ProfileDialog';
import { DemoNote, Field, fmtDate } from '../marketHub/MarketHubShared';
import { SW } from './SupplierShared';
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
const VendorDetailPage: React.FC<{ sw: SW; vendor: VendorRecord; onClose: () => void; onOpenSupplierProfile: (id: string) => void }> = ({ sw, vendor, onClose, onOpenSupplierProfile }) => {
  const [note, setNote] = useState('');
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
    <div className="flex flex-col gap-4">
      <SokoBreadcrumb
        onBack={onClose}
        backLabel="Back to Vendors"
        trail={[
          { label: sw.company.profile.tradingName, onClick: () => sw.go('sw-dashboard') },
          { label: 'Vendors', onClick: onClose },
          { label: vendor.supplierName },
        ]}
      />
      <section className={sokoCard}>
        <header className="flex flex-col gap-4 border-b border-slate-100 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-7">
          <div className="flex min-w-0 items-start gap-4">
            <VendorLogo vendor={vendor} size="lg" />
            <div className="min-w-0">
              <p className={sokoTokens.eyebrow}>Vendor profile · {vendor.tradeCategory}</p>
              <h1 className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight text-slate-900 text-balance">{vendor.supplierName}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <NetworkBadge vendor={vendor} />
                <ApprovalBadge status={vendor.approvalStatus} company={sw.company.profile.tradingName} />
                <SokoChip icon={MapPin}>{vendor.location}</SokoChip>
              </div>
            </div>
          </div>
          {canManage && (
            <ApprovalMenu current={vendor.approvalStatus} company={sw.company.profile.tradingName} vendorName={vendor.supplierName} onChange={changeStatus} />
          )}
        </header>
      <div className="flex flex-col gap-6 px-5 py-6 sm:px-7">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
          <Field label="Trade Category" value={vendor.tradeCategory} />
          <Field label="Location" value={vendor.location} />
          <Field label="Contact Person" value={vendor.contactPerson} />
          {vendor.contactEmail && <Field label="Email" value={vendor.contactEmail} />}
          {vendor.contactPhone && <Field label="Phone" value={vendor.contactPhone} />}
          <Field label="Added" value={`${fmtDate(vendor.addedAt)} by ${vendor.addedBy}`} />
          {vendor.lastVisitDate && <Field label="Last Visit" value={fmtDate(vendor.lastVisitDate)} />}
        </div>

        {/* Save to Company Contacts — only for linked SOKO suppliers */}
        {linkedCompany && vendor.contactPerson && sw.company.kind === 'contractor' && (() => {
          const contactMember = membersOf(sw.store, linkedCompany.id).find((m) => m.status === 'active' && m.name === vendor.contactPerson);
          const sourceUserId = contactMember?.userId;
          const alreadySaved = sourceUserId ? isSavedCorporateContact(sw.store, sw.company.id, sourceUserId) : false;
          if (alreadySaved) {
            return (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
                <BookmarkCheck className="w-4 h-4 text-green-700 shrink-0" />
                <p className="text-sm font-semibold text-green-800">{vendor.contactPerson} is saved to your company contacts</p>
              </div>
            );
          }
          return canManage && contactMember ? (
            <button
              type="button"
              onClick={() => {
                const res = saveCompanyContact(sw.ctx, {
                  name: contactMember.name, title: contactMember.title,
                  company: linkedCompany.profile.tradingName,
                  category: vendor.tradeCategory, emirate: linkedCompany.profile.emirate,
                  email: contactMember.email, phone: vendor.contactPhone,
                  sourceCompanyId: linkedCompany.id, sourceUserId: contactMember.userId,
                });
                if (res.ok) { sw.setStore(res.store); sw.notify(`Saved ${contactMember.name} to company contacts`); }
                else sw.notify(res.error);
              }}
              className={`${btnSecondary} text-sm`}
            >
              <Bookmark className="w-4 h-4" /> Save {vendor.contactPerson} to Company Contacts
            </button>
          ) : null;
        })()}

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
        <footer className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 sm:px-7">
          <span className="font-mono text-[10.5px] text-slate-400">Vendor ID · {vendor.id}</span>
          <span className="text-[11px] text-slate-400">Added {fmtDate(vendor.addedAt)} by {vendor.addedBy}</span>
        </footer>
      </section>

      {previewDoc && <DocPreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
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

// ─── Directory building blocks ─────────────────────────────────────
type NetworkStatus = 'verified' | 'listed' | 'external';

const networkStatusOf = (v: VendorRecord): NetworkStatus =>
  v.sokoVerified ? 'verified' : v.external ? 'external' : 'listed';

const APPROVAL_TONE: Record<VendorApprovalStatus, SokoStatusTone> = {
  'not-reviewed': 'neutral',
  'under-review': 'warning',
  'approved': 'success',
  'conditionally-approved': 'warning',
  'rejected': 'critical',
  'suspended': 'critical',
};

const VendorLogo: React.FC<{ vendor: VendorRecord; size?: 'md' | 'lg' }> = ({ vendor, size = 'md' }) => {
  const dims = size === 'lg' ? 'w-14 h-14 text-base rounded-2xl' : 'w-9 h-9 text-[11px] rounded-xl';
  const onSoko = !vendor.external;
  return (
    <span aria-hidden className={`${dims} shrink-0 flex items-center justify-center font-semibold tracking-tight ${
      onSoko ? 'bg-slate-900 text-white' : 'border border-dashed border-slate-300 bg-white text-slate-500'
    }`}>
      {initialsOf(vendor.supplierName) || vendor.supplierName.slice(0, 2).toUpperCase()}
    </span>
  );
};

/** SOKO network status: set by SOKO, independent of the contractor's internal approval. */
const NetworkBadge: React.FC<{ vendor: VendorRecord }> = ({ vendor }) => {
  const status = networkStatusOf(vendor);
  if (status === 'verified') {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-[11px] font-semibold text-blue-700 whitespace-nowrap">
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden />SOKO Verified
      </span>
    );
  }
  if (status === 'listed') {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 whitespace-nowrap">
        <ShieldQuestion className="w-3.5 h-3.5 text-slate-400" aria-hidden />On SOKO · unverified
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-500 whitespace-nowrap">
      <Building2 className="w-3.5 h-3.5 text-slate-400" aria-hidden />External vendor
    </span>
  );
};

/** Internal approval: set by the contractor's own team. */
const ApprovalBadge: React.FC<{ status: VendorApprovalStatus; company?: string }> = ({ status, company }) => (
  <span className="inline-flex items-center gap-1.5">
    {company && <span className="sr-only">{company} approval:</span>}
    <SokoStatusIndicator label={APPROVAL_META[status].label} tone={APPROVAL_TONE[status]} />
  </span>
);

const ApprovalMenu: React.FC<{
  current: VendorApprovalStatus;
  company: string;
  vendorName: string;
  onChange: (s: VendorApprovalStatus) => void;
  compact?: boolean;
}> = ({ current, company, vendorName, onChange, compact }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? `Manage ${company} approval for ${vendorName}` : undefined}
        onClick={() => setOpen((o) => !o)}
        className={`${sokoTokens.focus} inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer ${
          compact ? 'h-8 px-2 text-xs' : 'h-9 px-3 text-xs font-medium'
        }`}
      >
        <UserCheck className="w-3.5 h-3.5 text-slate-500" aria-hidden />
        {compact ? <span className="hidden xl:inline">Approval</span> : 'Manage approval'}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <>
          <button type="button" tabIndex={-1} aria-hidden className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" aria-label={`${company} approval status`}
            className={`absolute right-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 ${sokoTokens.shadow.raised}`}>
            <p className={`${sokoTokens.eyebrow} px-2 pb-1.5 pt-1`}>{company} approval</p>
            {APPROVAL_OPTIONS.map((st) => {
              const on = st === current;
              return (
                <button key={st} type="button" role="menuitemradio" aria-checked={on}
                  onClick={() => { setOpen(false); if (!on) onChange(st); }}
                  className={`${sokoTokens.focus} flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${on ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <SokoStatusIndicator label={APPROVAL_META[st].label} tone={APPROVAL_TONE[st]} />
                  {on && <Check className="w-3.5 h-3.5 text-blue-600" aria-hidden />}
                </button>
              );
            })}
            <p className="mt-1 border-t border-slate-100 px-2 pt-2 pb-1 text-[10.5px] leading-relaxed text-slate-400">
              Internal only. Does not change the vendor&apos;s SOKO verification.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

const selectCls = `${sokoTokens.focus} h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 hover:border-slate-300 transition-colors cursor-pointer`;

// ─── Vendor URL state (browser Back / Forward) ─────────────────────
const VENDOR_PARAM = 'vendor';
const PROFILE_PARAM = 'vendorProfile';

interface VendorNav { vendorId: string | null; profileId: string | null }
interface VendorHistoryState { sokoVendorDepth?: number; sokoVendorBase?: number }

const depthOf = (n: VendorNav) => (n.profileId ? 2 : n.vendorId ? 1 : 0);

const readVendorNav = (): VendorNav => {
  const p = new URLSearchParams(window.location.search);
  return { vendorId: p.get(VENDOR_PARAM), profileId: p.get(PROFILE_PARAM) };
};

const writeVendorNav = (n: VendorNav, mode: 'push' | 'replace', base: number) => {
  const url = new URL(window.location.href);
  if (n.vendorId) url.searchParams.set(VENDOR_PARAM, n.vendorId); else url.searchParams.delete(VENDOR_PARAM);
  if (n.profileId) url.searchParams.set(PROFILE_PARAM, n.profileId); else url.searchParams.delete(PROFILE_PARAM);
  const state: VendorHistoryState = { ...(window.history.state ?? {}), sokoVendorDepth: depthOf(n), sokoVendorBase: base };
  if (mode === 'push') window.history.pushState(state, '', url);
  else window.history.replaceState(state, '', url);
};

/**
 * Mirrors the open vendor / public profile in the URL so browser Back and Forward
 * move between the directory, a vendor page and its SOKO profile. Entries this hook
 * pushed are popped with history.go so the Forward stack stays intact.
 */
const useVendorNavigation = () => {
  const [nav, setNav] = useState<VendorNav>(readVendorNav);

  useEffect(() => {
    const initial = readVendorNav();
    const state = (window.history.state ?? {}) as VendorHistoryState;
    if (state.sokoVendorDepth === undefined) writeVendorNav(initial, 'replace', depthOf(initial));
    const onPop = () => setNav(readVendorNav());
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      writeVendorNav({ vendorId: null, profileId: null }, 'replace', 0);
    };
  }, []);

  const navigate = (next: VendorNav) => {
    const state = (window.history.state ?? {}) as VendorHistoryState;
    const current = state.sokoVendorDepth ?? depthOf(nav);
    const base = state.sokoVendorBase ?? current;
    const target = depthOf(next);
    if (target > current) {
      writeVendorNav(next, 'push', base);
      setNav(next);
    } else if (target < current && target >= base) {
      window.history.go(target - current);
    } else {
      writeVendorNav(next, 'replace', Math.min(base, target));
      setNav(next);
    }
  };

  return { nav, navigate };
};

// ─── Main Component ────────────────────────────────────────────────
type ApprovalFilter = 'all' | 'approved' | 'review' | 'new' | 'inactive';
type NetworkFilter = 'all' | NetworkStatus;

interface DirectoryFilters { search: string; category: string; approval: ApprovalFilter; network: NetworkFilter }
const NO_FILTERS: DirectoryFilters = { search: '', category: 'all', approval: 'all', network: 'all' };

const matchesApproval = (v: VendorRecord, f: ApprovalFilter) => {
  switch (f) {
    case 'approved': return v.approvalStatus === 'approved';
    case 'review': return v.approvalStatus === 'under-review' || v.approvalStatus === 'conditionally-approved';
    case 'new': return v.approvalStatus === 'not-reviewed';
    case 'inactive': return v.approvalStatus === 'rejected' || v.approvalStatus === 'suspended';
    default: return true;
  }
};

export const VendorDirectory: React.FC<{ sw: SW; pageBack?: { label: string; onBack: () => void } }> = ({ sw, pageBack }) => {
  const [filters, setFilters] = useState<DirectoryFilters>(NO_FILTERS);
  const [showAdd, setShowAdd] = useState(false);
  const { nav, navigate } = useVendorNavigation();
  const listScroll = useRef(0);

  const company = sw.company.profile.tradingName;
  const canManage = sw.can('contacts.manage');
  const vendors = sw.store.vendorRecords.filter((v) => v.companyId === sw.company.id);

  const counts = {
    approved: vendors.filter((v) => matchesApproval(v, 'approved')).length,
    review: vendors.filter((v) => matchesApproval(v, 'review')).length,
    new: vendors.filter((v) => matchesApproval(v, 'new')).length,
    inactive: vendors.filter((v) => matchesApproval(v, 'inactive')).length,
    verified: vendors.filter((v) => networkStatusOf(v) === 'verified').length,
    external: vendors.filter((v) => networkStatusOf(v) === 'external').length,
  };

  const categories = Array.from(new Set(vendors.map((v) => v.tradeCategory))).sort();

  const q = filters.search.trim().toLowerCase();
  const filtered = vendors.filter((v) =>
    matchesApproval(v, filters.approval) &&
    (filters.network === 'all' || networkStatusOf(v) === filters.network) &&
    (filters.category === 'all' || v.tradeCategory === filters.category) &&
    (!q || [v.supplierName, v.tradeCategory, v.location, v.contactPerson].some((f) => f.toLowerCase().includes(q))));

  const hasFilters = filters.search !== '' || filters.category !== 'all' || filters.approval !== 'all' || filters.network !== 'all';
  const setFilter = <K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  const open = nav.vendorId ? vendors.find((v) => v.id === nav.vendorId) : undefined;

  useEffect(() => {
    window.scrollTo({ top: nav.vendorId ? 0 : listScroll.current });
  }, [nav.vendorId]);

  const openVendor = (id: string) => {
    listScroll.current = window.scrollY;
    navigate({ vendorId: id, profileId: null });
  };
  const closeVendor = () => navigate({ vendorId: null, profileId: null });

  const changeStatus = (v: VendorRecord, status: VendorApprovalStatus) =>
    sw.run(updateVendorStatus(sw.ctx, v.id, status), `${v.supplierName}: ${company} approval set to ${APPROVAL_META[status].label}`);

  // Count expiring documents from linked suppliers
  const linkedSupplierIds = vendors.filter((v) => v.supplierCompanyId).map((v) => v.supplierCompanyId!);
  const expiringDocs = sw.store.documents.filter((d) => linkedSupplierIds.includes(d.companyId) && d.expiry && d.shares.some((s) => s.company === company) && new Date(d.expiry) < new Date(Date.now() + 30 * 86400000));

  if (open) {
    return (
      <>
        <VendorDetailPage
          sw={sw}
          vendor={open}
          onClose={closeVendor}
          onOpenSupplierProfile={(id) => navigate({ vendorId: open.id, profileId: id })}
        />
        {nav.profileId && (
          <SupplierProfileModal supplierId={nav.profileId} onClose={() => navigate({ vendorId: open.id, profileId: null })} />
        )}
      </>
    );
  }

  const approvalTabs: SokoTab<ApprovalFilter>[] = [
    { id: 'all', label: 'All', count: vendors.length },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'review', label: 'Under review', count: counts.review },
    { id: 'new', label: 'Not reviewed', count: counts.new },
    { id: 'inactive', label: 'Rejected / suspended', count: counts.inactive },
  ];

  return (
    <div className="flex flex-col gap-5">
      {pageBack && (
        <SokoBreadcrumb
          onBack={pageBack.onBack}
          backLabel={pageBack.label}
          trail={[{ label: company, onClick: () => sw.go('sw-dashboard') }, { label: 'Vendors' }]}
        />
      )}

      {/* Header */}
      <section className={`${sokoCard} overflow-hidden`}>
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-7 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className={sokoTokens.eyebrow}>Vendor management · {company}</p>
            <h1 className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
              Vendor Directory
              <span className="text-base font-medium text-slate-400 tabular-nums">{vendors.length} {vendors.length === 1 ? 'vendor' : 'vendors'}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 text-pretty">
              Your internal register of suppliers and subcontractors. SOKO verification comes from SOKO; approval status is set by your team.
            </p>
          </div>
          {canManage && (
            <button type="button" onClick={() => setShowAdd(true)}
              className={`${sokoTokens.focus} inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-colors cursor-pointer md:self-auto`}>
              <Plus className="w-4 h-4" aria-hidden />Add vendor
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 lg:grid-cols-5">
          <div className="bg-white"><SokoKpiCell label="Approved" value={counts.approved} detail={`by ${company}`} onClick={() => setFilter('approval', 'approved')} /></div>
          <div className="bg-white"><SokoKpiCell label="Under review" value={counts.review} detail="Incl. conditional" onClick={() => setFilter('approval', 'review')} /></div>
          <div className="bg-white"><SokoKpiCell label="Not reviewed" value={counts.new} detail="Awaiting first review" onClick={() => setFilter('approval', 'new')} /></div>
          <div className="bg-white"><SokoKpiCell label="SOKO Verified" value={counts.verified} detail={`${counts.external} external`} onClick={() => setFilter('network', 'verified')} /></div>
          <div className="col-span-2 bg-white lg:col-span-1"><SokoKpiCell label="Expiring documents" value={expiringDocs.length} detail="Shared with you · 30 days" onClick={() => sw.go('sw-documents')} /></div>
        </div>
      </section>

      {/* Directory */}
      <section className={sokoCard} aria-label="Vendor list">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 pt-5 sm:px-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search vendors</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Search by vendor, category, location or contact"
                className={`${sokoTokens.focus} h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-300 transition-colors`} />
            </label>
            <div className="grid grid-cols-2 gap-2 md:flex">
              <label>
                <span className="sr-only">Trade category</span>
                <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)} className={`${selectCls} w-full md:w-44`}>
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">SOKO network status</span>
                <select value={filters.network} onChange={(e) => setFilter('network', e.target.value as NetworkFilter)} className={`${selectCls} w-full md:w-48`}>
                  <option value="all">Any SOKO status</option>
                  <option value="verified">SOKO Verified</option>
                  <option value="listed">On SOKO · unverified</option>
                  <option value="external">External vendor</option>
                </select>
              </label>
            </div>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 overflow-x-auto">
              <SokoTabs variant="underline" label={`${company} approval status`} tabs={approvalTabs} active={filters.approval} onChange={(id) => setFilter('approval', id)} />
            </div>
            {hasFilters && (
              <button type="button" onClick={() => setFilters(NO_FILTERS)}
                className={`${sokoTokens.focus} mb-1.5 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-500 hover:text-blue-700 cursor-pointer`}>
                <X className="w-3.5 h-3.5" aria-hidden />Clear filters
              </button>
            )}
          </div>
        </div>

        {vendors.length === 0 ? (
          <div className="py-10">
            <SokoEmptyState icon={Users} title="No vendors yet"
              description="Add suppliers to your internal vendor register to track approvals, documents and relationships."
              action={canManage ? <button type="button" onClick={() => setShowAdd(true)} className={`${btnPrimary} text-sm`}><Plus className="w-4 h-4" />Add vendor</button> : undefined} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10">
            <SokoEmptyState icon={Search} title="No vendors match these filters"
              description="Try a different search term or clear the filters to see all vendors."
              action={<button type="button" onClick={() => setFilters(NO_FILTERS)} className={`${btnSecondary} text-sm`}>Clear filters</button>} />
          </div>
        ) : (
          <>
            <p className="px-5 pt-3 text-[11px] text-slate-400 sm:px-6" aria-live="polite">
              Showing {filtered.length} of {vendors.length}
            </p>

            {/* Desktop table */}
            <table className="hidden w-full text-sm lg:table">
              <thead>
                <tr className={`${sokoTokens.eyebrow} border-b border-slate-100 text-left`}>
                  <th scope="col" className="px-6 py-3 font-medium">Vendor</th>
                  <th scope="col" className="px-3 py-3 font-medium">SOKO network</th>
                  <th scope="col" className="px-3 py-3 font-medium">{company} approval</th>
                  <th scope="col" className="px-3 py-3 font-medium">Contact</th>
                  <th scope="col" className="px-3 py-3 font-medium">Last visit</th>
                  <th scope="col" className="px-3 py-3 font-medium">Notes</th>
                  <th scope="col" className="px-6 py-3 font-medium text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v) => (
                  <tr key={v.id} onClick={() => openVendor(v.id)} className="group cursor-pointer transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <VendorLogo vendor={v} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 group-hover:text-blue-700 transition-colors">{v.supplierName}</p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                            {v.tradeCategory}<span aria-hidden className="text-slate-300">·</span>{v.location}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5"><NetworkBadge vendor={v} /></td>
                    <td className="px-3 py-3.5"><ApprovalBadge status={v.approvalStatus} company={company} /></td>
                    <td className="px-3 py-3.5">
                      <p className="text-slate-700">{v.contactPerson}</p>
                      {v.contactEmail && <p className="max-w-[180px] truncate text-xs text-slate-400">{v.contactEmail}</p>}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{v.lastVisitDate ? fmtDate(v.lastVisitDate) : '—'}</td>
                    <td className="px-3 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {v.notes.length > 0 ? <span className="inline-flex items-center gap-1"><StickyNote className="w-3.5 h-3.5 text-slate-400" aria-hidden />{v.notes.length}</span> : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && (
                          <ApprovalMenu compact current={v.approvalStatus} company={company} vendorName={v.supplierName} onChange={(s) => changeStatus(v, s)} />
                        )}
                        <button type="button" onClick={(e) => { e.stopPropagation(); openVendor(v.id); }}
                          className={`${sokoTokens.focus} inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer`}>
                          View<span className="sr-only"> {v.supplierName}</span><ChevronRight className="w-3.5 h-3.5" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile / tablet cards */}
            <ul className="flex flex-col divide-y divide-slate-100 lg:hidden">
              {filtered.map((v) => (
                <li key={v.id} className="flex flex-col gap-3 px-5 py-4 sm:px-6">
                  <button type="button" onClick={() => openVendor(v.id)} className={`${sokoTokens.focus} flex items-start gap-3 rounded-lg text-left cursor-pointer`}>
                    <VendorLogo vendor={v} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{v.supplierName}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{v.tradeCategory} · {v.location}</span>
                    </span>
                    <ChevronRight className="mt-2 w-4 h-4 shrink-0 text-slate-400" aria-hidden />
                  </button>
                  <div className="flex flex-wrap items-center gap-2 pl-12">
                    <NetworkBadge vendor={v} />
                    <ApprovalBadge status={v.approvalStatus} company={company} />
                  </div>
                  <div className="flex items-center justify-between gap-3 pl-12">
                    <p className="min-w-0 truncate text-xs text-slate-500">
                      {v.contactPerson}{v.lastVisitDate && <> · Visited {fmtDate(v.lastVisitDate)}</>}
                    </p>
                    {canManage && (
                      <ApprovalMenu compact current={v.approvalStatus} company={company} vendorName={v.supplierName} onChange={(s) => changeStatus(v, s)} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Info className="mt-px w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden />
        SOKO Verification and {company} approval are independent. SOKO Verified does not imply {company} approval, and vice versa. Document sharing is a prototype; real access-controlled storage requires backend integration.
      </p>

      {showAdd && <AddVendorModal sw={sw} onClose={() => setShowAdd(false)} />}
    </div>
  );
};
