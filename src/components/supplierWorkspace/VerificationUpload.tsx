import React, { useRef, useState } from 'react';
import { FileCheck2, ScanText, Upload } from 'lucide-react';
import { CompanyProfile } from '../../data/supplierTypes';
import { submitVerification } from '../../data/supplierService';
import { btnPrimary, btnSecondary } from '../NetworkShared';
import { DemoNote, fmtDate } from '../marketHub/MarketHubShared';
import { SW } from './SupplierShared';

const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const MAX_MB = 10;

export const LicenseUpload: React.FC<{ profile: CompanyProfile; onSubmit: (file: { name: string; sizeMb: number }) => void; onCancel?: () => void; submitLabel: string; cancelLabel?: string }> = ({ profile, onSubmit, onCancel, submitLabel, cancelLabel = 'Cancel' }) => {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; sizeMb: number } | null>(null);
  const [error, setError] = useState('');

  const pick = (f?: File) => {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) return setError('Upload a PDF, JPG or PNG file.');
    const sizeMb = Math.max(0.1, Math.round((f.size / 1048576) * 10) / 10);
    if (sizeMb > MAX_MB) return setError(`Files must be ${MAX_MB} MB or smaller.`);
    setError('');
    setFile({ name: f.name, sizeMb });
  };

  const rows = [
    ['Legal name', profile.legalName],
    ['License number', profile.licenseNo],
    ['Issuing authority', profile.issuingAuthority],
    ['Expiry date', fmtDate(profile.licenseExpiry || undefined)],
  ];

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {!file ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-8 text-center hover:border-blue-400 hover:bg-blue-50/40 transition-colors cursor-pointer"
        >
          <Upload className="w-6 h-6 mx-auto text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-800">Drop your trade license here or click to browse</p>
          <p className="text-xs text-slate-500">PDF, JPG or PNG · up to {MAX_MB} MB</p>
        </button>
      ) : (
        <div>
          <div className="flex items-center gap-3">
            <FileCheck2 className="w-5 h-5 text-blue-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{file.sizeMb} MB</p>
            </div>
            <button type="button" onClick={() => setFile(null)} className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
              Change
            </button>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <ScanText className="w-3.5 h-3.5" /> Extracted details preview (simulated)
            </p>
            <dl className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 text-sm">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-900 text-right">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-slate-500">Check these match your license. A SOKO reviewer confirms them before your profile is marked as verified.</p>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-medium text-rose-700">{error}</p>}
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <DemoNote>Files stay in your browser for this prototype; nothing is uploaded.</DemoNote>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className={btnSecondary}>
              {cancelLabel}
            </button>
          )}
          <button type="button" disabled={!file} onClick={() => file && onSubmit(file)} className={btnPrimary}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const VerificationUpload: React.FC<{ sw: SW; onClose: () => void }> = ({ sw, onClose }) => (
  <LicenseUpload
    profile={sw.company.profile}
    submitLabel="Submit for verification"
    onCancel={onClose}
    onSubmit={(f) => sw.run(submitVerification(sw.ctx, f.name, f.sizeMb), 'Submitted — verification is now pending SOKO review') && onClose()}
  />
);
