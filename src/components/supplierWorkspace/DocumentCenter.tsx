import React, { useMemo, useState } from 'react';
import { Archive, Bell, FileText, FolderOpen, Lock, Search, ShieldCheck, Upload } from 'lucide-react';
import { ACCESS_META, DOCUMENT_CATEGORIES, DocumentCategory } from '../../data/supplierTypes';
import { documentExpiry, storageAllocationMb, storageUsedMb } from '../../data/supplierStore';
import { btnPrimary, inputCls } from '../NetworkShared';
import { DemoNote, EmptyState, KpiCard, SubTabs, fmtDate } from '../marketHub/MarketHubShared';
import { Card, Meter, PageHeader, PremiumGate, SW, fmtMb } from './SupplierShared';
import { DocumentDetailDialog, ExpiryPill, UploadDocumentDialog } from './DocumentDialogs';

type Folder = DocumentCategory | 'all' | 'expiring' | 'shared' | 'archived';
type StatusFilter = 'all' | 'valid' | 'reminder' | 'expired' | 'none';

export const DocumentCenter: React.FC<{ sw: SW }> = ({ sw }) => {
  const [folder, setFolder] = useState<Folder>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => sw.documents.filter((d) => ACCESS_META[d.access].roles.includes(sw.role)), [sw.documents, sw.role]);
  const restricted = sw.documents.length - visible.length;
  const live = visible.filter((d) => !d.archived);
  const used = storageUsedMb(sw.documents);
  const alloc = storageAllocationMb(sw.company);
  const expiring = live.filter((d) => ['reminder', 'expired'].includes(documentExpiry(d)));
  const recent = live.filter((d) => Date.now() - new Date(d.uploadedAt).getTime() < 14 * 86400000);
  const shared = live.filter((d) => d.shares.length > 0);

  if (!sw.premium) {
    const verification = sw.documents.filter((d) => d.forVerification);
    return (
      <div>
        <PageHeader eyebrow="Documents" title="Document Center" subtitle="A private, organised home for your company's licenses, certificates and technical files." />
        <PremiumGate
          title="Keep every company document organised and up to date"
          text="Supplier Premium includes a private Document Center with folders, expiry tracking, reminders, version history and controlled sharing with specific buyers."
          benefits={['Private document storage', 'Expiry tracking & reminder indicators', 'Version history', 'Controlled, time-limited sharing', 'Team access permissions', 'Storage usage dashboard']}
          canUpgrade={sw.can('plan.manage')}
          onUpgrade={() => sw.go('sw-plan')}
        />
        <Card className="mt-6" title="Verification documents">
          <p className="text-sm text-slate-600">On Supplier Free you can upload the documents SOKO needs for verification. They are reviewed by SOKO only and are never published.</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {verification.map((d) => (
              <li key={d.id} className="py-2.5 flex items-center gap-3 text-sm">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span className="flex-1 font-medium text-slate-900">{d.name}</span>
                <span className="text-xs text-slate-500">Uploaded {fmtDate(d.uploadedAt)}</span>
              </li>
            ))}
            {verification.length === 0 && <li className="py-2 text-sm text-slate-500">No verification documents uploaded yet.</li>}
          </ul>
          <button type="button" onClick={() => sw.go('sw-profile')} className="mt-3 text-sm font-semibold text-blue-700 hover:underline cursor-pointer">
            Manage verification in Company Profile
          </button>
        </Card>
      </div>
    );
  }

  const inFolder = (folder === 'archived' ? visible.filter((d) => d.archived) : live).filter((d) => {
    if (folder === 'expiring') return expiring.includes(d);
    if (folder === 'shared') return d.shares.length > 0;
    if (folder !== 'all' && folder !== 'archived') return d.category === folder;
    return true;
  });
  const list = inFolder.filter((d) => {
    if (status !== 'all' && documentExpiry(d) !== status) return false;
    const t = q.trim().toLowerCase();
    return !t || `${d.name} ${d.fileName} ${d.category}`.toLowerCase().includes(t);
  });
  const open = sw.documents.find((d) => d.id === openId);

  const folders: { id: Folder; label: string; count: number; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All documents', count: live.length },
    { id: 'expiring', label: 'Expiring & expired', count: expiring.length, icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'shared', label: 'Shared', count: shared.length },
    ...DOCUMENT_CATEGORIES.map((c) => ({ id: c as Folder, label: c, count: live.filter((d) => d.category === c).length })),
    { id: 'archived', label: 'Archived', count: visible.filter((d) => d.archived).length, icon: <Archive className="w-3.5 h-3.5" /> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Documents · Supplier Premium"
        title="Document Center"
        subtitle="Private to your company. Documents never appear on your public profile, in search or in directories unless you explicitly share them."
        actions={
          sw.can('documents.manage') ? (
            <button type="button" onClick={() => setUploading(true)} className={btnPrimary}>
              <Upload className="w-4 h-4" /> Upload document
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Storage used" value={fmtMb(used)} />
        <KpiCard label="Available" value={fmtMb(Math.max(0, alloc - used))} hint={`of ${fmtMb(alloc)}`} />
        <KpiCard label="Total documents" value={live.length} />
        <KpiCard label="Expiring soon" value={expiring.length} hint="Within reminder window or expired" />
        <KpiCard label="Recently uploaded" value={recent.length} hint="Last 14 days" />
        <KpiCard label="Shared" value={shared.length} hint="With specific companies" />
      </div>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex justify-between text-xs text-slate-600 mb-1.5">
          <span>Storage usage</span>
          <span className="tabular-nums">{fmtMb(used)} of {fmtMb(alloc)}</span>
        </div>
        <Meter value={(used / Math.max(1, alloc)) * 100} tone="gold" />
      </div>

      {expiring.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5"><Bell className="w-4 h-4" /> Expiry reminders</p>
          <ul className="mt-1.5 space-y-1">
            {expiring.slice(0, 4).map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setOpenId(d.id)} className="text-sm text-amber-900 hover:underline cursor-pointer text-left">
                  {d.name} — {documentExpiry(d) === 'expired' ? 'Expired' : 'Expires'} {fmtDate(d.expiry)} — Reminder {d.reminderDays} days before expiry
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid lg:grid-cols-[240px_1fr] gap-6">
        <nav aria-label="Document folders" className="hidden lg:block">
          <ul className="space-y-0.5">
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setFolder(f.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${folder === f.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {f.icon ?? <FolderOpen className="w-3.5 h-3.5 opacity-70" />}
                  <span className="flex-1 truncate">{f.label}</span>
                  <span className={`text-xs tabular-nums ${folder === f.id ? 'text-slate-300' : 'text-slate-400'}`}>{f.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-3">
            <select aria-label="Folder" value={folder} onChange={(e) => setFolder(e.target.value as Folder)} className={`${inputCls} lg:hidden`}>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.count})</option>)}
            </select>
            <SubTabs
              tabs={[
                { id: 'all' as StatusFilter, label: 'All' },
                { id: 'valid' as StatusFilter, label: 'Valid' },
                { id: 'reminder' as StatusFilter, label: 'Expiring' },
                { id: 'expired' as StatusFilter, label: 'Expired' },
                { id: 'none' as StatusFilter, label: 'No expiry' },
              ]}
              value={status}
              onChange={setStatus}
            />
            <div className="relative md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" className={`${inputCls} pl-9`} />
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState icon={<FileText className="w-5 h-5" />} title="No documents here" text="Try another folder or filter, or upload a document." />
          ) : (
            <ul className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
              {list.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => setOpenId(d.id)} className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {d.category} · {fmtMb(d.sizeMb)} · v{d.versions.length} · {fmtDate(d.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end shrink-0 pl-12 sm:pl-0">
                      <ExpiryPill doc={d} />
                      {d.shares.length > 0 && <span className="text-xs font-medium text-blue-700">Shared · {d.shares.length}</span>}
                      <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-500"><Lock className="w-3 h-3" />{ACCESS_META[d.access].label}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {restricted > 0 && <p className="mt-3 text-xs text-slate-500">{restricted} document{restricted === 1 ? ' is' : 's are'} restricted to other roles in your company.</p>}
          <div className="mt-3">
            <DemoNote>Storage, uploads, reminders and sharing are simulated in this prototype. Reminder indicators appear in the app; no emails are sent.</DemoNote>
          </div>
        </div>
      </div>

      {uploading && <UploadDocumentDialog sw={sw} available={Math.max(0, alloc - used)} defaultCategory={DOCUMENT_CATEGORIES.find((c) => c === folder)} onClose={() => setUploading(false)} />}
      {open && <DocumentDetailDialog key={open.id + open.versions.length} sw={sw} doc={open} onClose={() => setOpenId(null)} />}
    </div>
  );
};
