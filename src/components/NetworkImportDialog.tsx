import React, { useRef, useState } from 'react';
import { CheckCircle2, Download, FileUp, Lock } from 'lucide-react';
import { CommunityContact } from '../types';
import { ContactDraft, draftToContact, findDuplicate } from '../data/myNetwork';

import { CSV_TEMPLATE, downloadText, parseContactFile } from '../data/networkImport';
import { ProfileDialog } from './ProfileDialog';
import { StatusPill, btnPrimary, btnSecondary } from './NetworkShared';

interface PreviewRow {
  draft: ContactDraft;
  duplicateOf?: CommunityContact;
  missingMethod: boolean;
  include: boolean;
}

const FORMATS = [
  { label: 'CSV (.csv)', available: true },
  { label: 'vCard (.vcf)', available: true },
  { label: 'Excel (.xlsx)', available: false },
  { label: 'Phone contacts sync', available: false },
];

export const NetworkImportDialog: React.FC<{ contacts: CommunityContact[]; onClose: () => void; onImport: (next: CommunityContact[], message: string) => void }> = ({
  contacts,
  onClose,
  onImport,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const readFile = async (file: File) => {
    setError('');
    try {
      const drafts = parseContactFile(file.name, await file.text());
      if (!drafts.length) throw new Error('No contacts were found in this file.');
      const seen: CommunityContact[] = [];
      setRows(
        drafts.map((draft) => {
          const missingMethod = !(draft.phone || draft.whatsappNumber || draft.email);
          const duplicateOf = findDuplicate(contacts, draft);
          const repeated = !!findDuplicate(seen, draft);
          seen.push(draftToContact(draft, 'import'));
          return { draft, duplicateOf, missingMethod, include: !duplicateOf && !missingMethod && !repeated };
        })
      );
      setFileName(file.name);
    } catch (e) {
      setRows(null);
      setError(e instanceof Error ? e.message : 'This file could not be read.');
    }
  };

  const selected = rows?.filter((r) => r.include) ?? [];

  const confirm = () => {
    const records = selected.map((r) => draftToContact(r.draft, 'import'));
    onImport([...records, ...contacts], `${records.length} contact${records.length === 1 ? '' : 's'} imported privately`);
  };

  return (
    <ProfileDialog
      title="Import Contacts"
      subtitle={rows ? `Preview · ${fileName}` : 'Upload → Preview → Check duplicates → Confirm'}
      size="lg"
      onClose={onClose}
      footer={
        rows && (
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setRows(null)} className={btnSecondary}>
              Choose another file
            </button>
            <button type="button" onClick={confirm} disabled={!selected.length} className={btnPrimary}>
              Import {selected.length} contact{selected.length === 1 ? '' : 's'}
            </button>
          </div>
        )
      }
    >
      <div className="px-5 py-4 space-y-4">
        <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Lock className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">Imported contacts stay private to you. Nobody is invited or notified.</p>
        </div>

        {!rows && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 transition-colors px-4 py-8 flex flex-col items-center gap-2 cursor-pointer"
            >
              <FileUp className="w-6 h-6 text-blue-700" />
              <span className="text-sm font-semibold text-slate-900">Choose a CSV or vCard file</span>
              <span className="text-xs text-slate-500">Columns: Name, Designation, Company, Mobile, WhatsApp, Email, Location, Trade Category, Notes</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.vcf,.vcard,text/csv,text/vcard"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
                e.target.value = '';
              }}
            />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap items-center gap-2">
              {FORMATS.map((f) => (
                <span key={f.label} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${f.available ? 'border-slate-200 text-slate-700' : 'border-dashed border-slate-200 text-slate-400'}`}>
                  {f.available && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  {f.label}
                  {!f.available && ' — not available yet'}
                </span>
              ))}
            </div>
            <button type="button" onClick={() => downloadText('soko_contacts_template.csv', CSV_TEMPLATE, 'text/csv')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              Download CSV template
            </button>
          </>
        )}

        {rows && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {rows.map((r, i) => {
              const blocked = !!r.duplicateOf || r.missingMethod;
              return (
                <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={r.include}
                    disabled={blocked}
                    onChange={() => setRows((prev) => prev && prev.map((x, j) => (j === i ? { ...x, include: !x.include } : x)))}
                    aria-label={`Import ${r.draft.name}`}
                    className="w-4 h-4 accent-blue-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{r.draft.name}</p>
                    <p className="text-xs text-slate-500 truncate">{[r.draft.title, r.draft.company, r.draft.phone || r.draft.email].filter(Boolean).join(' · ')}</p>
                  </div>
                  {r.duplicateOf ? (
                    <StatusPill tone="amber">Already saved as {r.duplicateOf.name}</StatusPill>
                  ) : r.missingMethod ? (
                    <StatusPill tone="slate">No phone or email</StatusPill>
                  ) : r.include ? (
                    <StatusPill tone="blue">New</StatusPill>
                  ) : (
                    <StatusPill tone="slate">Skipped</StatusPill>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ProfileDialog>
  );
};
