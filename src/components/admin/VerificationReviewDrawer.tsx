import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Building2,
  FileBadge,
  Files,
  History,
  StickyNote,
  Gavel,
  CheckCircle2,
  XCircle,
  FileQuestion,
  RotateCcw,
  FolderOpen,
  Lock,
  Circle,
  type LucideIcon,
} from 'lucide-react';
import {
  type AdminCompany,
  type VerificationStage,
  DASH,
  ROLE_LABELS,
  VERIFICATION_STAGE_LABELS,
  formatDate,
  formatDateTime,
  verificationStageOf,
} from './companyShared';
import { AccountBadge, CompanyAvatar, RoleBadge } from './CompanyDirectory';
import { CompletenessMeter, StageBadge, documentCompletenessOf } from './VerificationCenter';

type ReviewSection = 'identity' | 'license' | 'documents' | 'history' | 'notes' | 'decisions';
type SectionSource = 'record' | 'partial' | 'ui_only';

const REVIEW_SECTIONS: { id: ReviewSection; label: string; icon: LucideIcon; source: SectionSource }[] = [
  { id: 'identity', label: 'Company Identity', icon: Building2, source: 'record' },
  { id: 'license', label: 'Trade License', icon: FileBadge, source: 'partial' },
  { id: 'documents', label: 'Supporting Documents', icon: Files, source: 'ui_only' },
  { id: 'history', label: 'Submission History', icon: History, source: 'partial' },
  { id: 'notes', label: 'Review Notes', icon: StickyNote, source: 'ui_only' },
  { id: 'decisions', label: 'Decision History', icon: Gavel, source: 'partial' },
];

interface VerificationReviewDrawerProps {
  company: AdminCompany;
  isLive: boolean;
  onClose: () => void;
}

export const VerificationReviewDrawer: React.FC<VerificationReviewDrawerProps> = ({ company, isLive, onClose }) => {
  const [section, setSection] = useState<ReviewSection>('identity');
  const closeRef = useRef<HTMLButtonElement>(null);
  const stage = verificationStageOf(company, isLive);
  const isSuspended = company.status === 'suspended';
  const active = REVIEW_SECTIONS.find((s) => s.id === section) ?? REVIEW_SECTIONS[0];

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setSection('identity');
  }, [company.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close verification review"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-default"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-review-title"
        className="relative flex h-full w-full max-w-4xl flex-col bg-slate-50 shadow-2xl"
      >
        <header className="flex items-start gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <CompanyAvatar name={company.companyName} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Verification review • {isLive ? 'Live record' : 'Demo record'}
            </span>
            <h2 id="verification-review-title" className="truncate text-xl font-bold text-slate-900 text-balance">
              {company.companyName}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <RoleBadge role={company.role} />
              <StageBadge stage={stage} />
              <AccountBadge suspended={isSuspended} />
              <span className="font-mono text-[11px] text-slate-500">{(isLive ? company.sokoId : null) || 'No SOKO ID'}</span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close verification review"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav
            aria-label="Verification review sections"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4"
          >
            {REVIEW_SECTIONS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === section;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.source === 'ui_only' && (
                    <span className="hidden h-1.5 w-1.5 rounded-full bg-slate-300 md:block" aria-label="UI only" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">{active.label}</h3>
                <SourceBadge source={active.source} isLive={isLive} />
              </div>

              {section === 'identity' && <IdentitySection company={company} isLive={isLive} stage={stage} />}
              {section === 'license' && <LicenseSection company={company} isLive={isLive} />}
              {section === 'documents' && <DocumentsSection company={company} isLive={isLive} />}
              {section === 'history' && <HistorySection company={company} isLive={isLive} stage={stage} />}
              {section === 'notes' && <NotesSection company={company} isLive={isLive} />}
              {section === 'decisions' && <DecisionsSection company={company} isLive={isLive} stage={stage} />}
            </div>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-700">Administrator actions</span>
            <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              UI only
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:inline">Disabled until secure review workflows exist.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={CheckCircle2} label="Approve" tone="primary" />
            <ActionButton icon={XCircle} label="Reject" tone="danger" />
            <ActionButton icon={FileQuestion} label="Request More Information" />
            <ActionButton icon={RotateCcw} label="Revoke Verification" tone="danger" />
            <ActionButton icon={FolderOpen} label="View supporting documents" />
          </div>
        </footer>
      </section>
    </div>
  );
};

const ActionButton: React.FC<{ icon: LucideIcon; label: string; tone?: 'primary' | 'danger' | 'neutral' }> = ({
  icon: Icon,
  label,
  tone = 'neutral',
}) => {
  const toneClasses =
    tone === 'primary'
      ? 'border-blue-200 bg-blue-50 text-blue-400'
      : tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-400'
      : 'border-slate-200 bg-slate-50 text-slate-400';
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={`${label} — UI only, not connected`}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold cursor-not-allowed ${toneClasses}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
};

const SourceBadge: React.FC<{ source: SectionSource; isLive: boolean }> = ({ source, isLive }) => {
  const recordLabel = isLive ? 'Live data' : 'Demo data';
  const config =
    source === 'record'
      ? { label: recordLabel, classes: isLive ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800' }
      : source === 'partial'
      ? { label: `${recordLabel} + UI only`, classes: 'border-slate-200 bg-white text-slate-600' }
      : { label: 'UI only • not connected', classes: 'border-slate-300 bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.classes}`}>
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${source === 'ui_only' ? 'bg-slate-400' : isLive ? 'bg-emerald-500' : 'bg-amber-500'}`}
      />
      {config.label}
    </span>
  );
};

const Panel: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
    {title && <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>}
    {children}
  </div>
);

const Field: React.FC<{ label: string; value?: React.ReactNode; mono?: boolean; hint?: string }> = ({ label, value, mono, hint }) => {
  const isEmpty = value === undefined || value === null || value === '' || value === DASH;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className={`text-sm ${isEmpty ? 'text-slate-400' : 'text-slate-900'} ${mono ? 'font-mono text-xs' : ''}`} title={isEmpty ? hint : undefined}>
        {isEmpty ? DASH : value}
      </dd>
    </div>
  );
};

const EmptyState: React.FC<{ icon: LucideIcon; title: string; body: string }> = ({ icon: Icon, title, body }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    <p className="max-w-md text-xs leading-relaxed text-slate-500 text-pretty">{body}</p>
  </div>
);

const IdentitySection: React.FC<{ company: AdminCompany; isLive: boolean; stage: VerificationStage }> = ({ company, isLive, stage }) => (
  <>
    <Panel title="Company">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Display name" value={company.companyName} />
        <Field label="SOKO ID" value={isLive ? company.sokoId : null} mono hint="Demo records have no SOKO ID" />
        <Field label="Company type" value={ROLE_LABELS[company.role] ?? company.role} />
        <Field label="Location" value={company.location} />
      </dl>
    </Panel>
    <Panel title="Registration">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLive ? (
          <>
            <Field label="Legal name" value={company.legalName} />
            <Field label="Trading name" value={company.tradingName} />
            <Field label="Emirate" value={company.emirate} />
            <Field label="Country" value={company.country} />
          </>
        ) : (
          <>
            <Field label="Lead contact" value={company.contactPerson} />
            <Field label="VAT TRN" value={company.vatTrn} mono />
            <Field label="DUNS number" value={company.dunsNumber} mono />
            <Field label="Business email" value={company.email} />
          </>
        )}
        <Field label="Registered on SOKO" value={formatDate(company.registeredDate)} />
      </dl>
    </Panel>
    <Panel title="Verification status">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <StageBadge stage={stage} />
          {stage === 'not_submitted' && <span className="text-xs text-slate-500">Not in the administrator review queue.</span>}
          {stage === 'pending' && <span className="text-xs text-slate-500">Submitted and awaiting an administrator decision.</span>}
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <span className="text-[11px] font-medium text-slate-500">Document completeness</span>
          <CompletenessMeter value={documentCompletenessOf(company, isLive)} />
        </div>
      </div>
    </Panel>
  </>
);

const LicenseSection: React.FC<{ company: AdminCompany; isLive: boolean }> = ({ company, isLive }) => (
  <>
    <Panel title="Licence details">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Licence number"
          value={isLive ? null : company.tradeLicenseNo}
          mono
          hint={isLive ? 'Licence fields are private and not loaded by this panel' : 'No licence number on the demo record'}
        />
        <Field label="Issuing authority" value={null} hint="Not recorded" />
        <Field label="Expiry date" value={null} hint="Not recorded" />
      </dl>
      {isLive && (
        <p className="text-[11px] leading-relaxed text-slate-500">
          Licence fields are stored as private company data and are not loaded into the admin panel.
        </p>
      )}
    </Panel>
    <EmptyState
      icon={FileBadge}
      title="No licence document to preview"
      body="Document storage is not connected to the admin panel yet. The licence file preview appears here once uploads can be read securely."
    />
  </>
);

const DocumentsSection: React.FC<{ company: AdminCompany; isLive: boolean }> = ({ company, isLive }) => (
  <>
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-2.5">Document</th>
            <th scope="col" className="px-3 py-2.5">Type</th>
            <th scope="col" className="px-3 py-2.5">Submission</th>
            <th scope="col" className="px-3 py-2.5">Expiry</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">
              No uploaded documents are available.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState
      icon={Files}
      title="No supporting documents loaded"
      body={
        isLive
          ? 'Uploaded documents are not connected to the admin panel. Nothing is listed until a secure document read exists.'
          : `The demo record lists ${company.complianceCertCount} compliance certificate${
              company.complianceCertCount === 1 ? '' : 's'
            } as a count only. No document files exist to show.`
      }
    />
  </>
);

interface TimelineEntry {
  label: string;
  detail: string;
  time?: string | null;
  state: 'done' | 'current' | 'untracked';
}

const Timeline: React.FC<{ entries: TimelineEntry[] }> = ({ entries }) => (
  <ol className="flex flex-col">
    {entries.map((entry, index) => {
      const isLast = index === entries.length - 1;
      const dotClasses =
        entry.state === 'done'
          ? 'border-emerald-500 bg-emerald-500'
          : entry.state === 'current'
          ? 'border-blue-600 bg-white ring-4 ring-blue-100'
          : 'border-slate-300 bg-white';
      return (
        <li key={`${entry.label}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${dotClasses}`} aria-hidden="true" />
            {!isLast && <span className="w-px flex-1 bg-slate-200" aria-hidden="true" />}
          </div>
          <div className={`flex flex-1 flex-col gap-0.5 ${isLast ? '' : 'pb-5'}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className={`text-sm font-semibold ${entry.state === 'untracked' ? 'text-slate-400' : 'text-slate-900'}`}>{entry.label}</span>
              <span className="font-mono text-[11px] text-slate-500">{entry.time ? formatDateTime(entry.time) : 'Time not recorded'}</span>
            </div>
            <span className="text-xs leading-relaxed text-slate-500">{entry.detail}</span>
          </div>
        </li>
      );
    })}
  </ol>
);

const HistorySection: React.FC<{ company: AdminCompany; isLive: boolean; stage: VerificationStage }> = ({ company, isLive, stage }) => {
  const entries: TimelineEntry[] = [
    { label: 'Company registered', detail: 'Account created on SOKO.', time: company.registeredDate, state: 'done' },
    {
      label: 'Verification submitted',
      detail: stage === 'not_submitted' ? 'The company has not submitted verification.' : 'Submission timestamp is not recorded.',
      time: null,
      state: stage === 'not_submitted' ? 'untracked' : 'done',
    },
    {
      label: 'Administrator review',
      detail: 'Review stages and reviewer assignment are not tracked yet.',
      time: null,
      state: 'untracked',
    },
    {
      label: `Current status: ${VERIFICATION_STAGE_LABELS[stage]}`,
      detail: isLive ? 'From the live company record.' : 'From the demo record.',
      time: stage === 'verified' && isLive ? company.verifiedAt : isLive ? company.updatedAt : null,
      state: 'current',
    },
  ];
  return (
    <Panel title="Submission timeline">
      <Timeline entries={entries} />
    </Panel>
  );
};

const NotesSection: React.FC<{ company: AdminCompany; isLive: boolean }> = ({ company, isLive }) => (
  <>
    {!isLive && company.auditNotes && (
      <Panel title="Existing demo audit note">
        <p className="text-sm leading-relaxed text-slate-700">{company.auditNotes}</p>
      </Panel>
    )}
    <Panel title="Internal notes">
      <label htmlFor="verification-review-note" className="sr-only">
        Internal review note
      </label>
      <textarea
        id="verification-review-note"
        disabled
        rows={4}
        placeholder="Internal notes are visible to platform administrators only. Saving notes is not connected yet."
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 placeholder:text-slate-400 cursor-not-allowed"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">Notes are not stored. UI only.</span>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
        >
          <Lock className="h-3 w-3" aria-hidden="true" />
          Save note
        </button>
      </div>
    </Panel>
    <EmptyState icon={StickyNote} title="No review notes yet" body="Saved administrator notes for this company will be listed here once notes can be stored." />
  </>
);

const DecisionsSection: React.FC<{ company: AdminCompany; isLive: boolean; stage: VerificationStage }> = ({ company, isLive, stage }) => {
  if (isLive && stage === 'verified' && company.verifiedAt) {
    return (
      <>
        <Panel title="Recorded decisions">
          <ul className="flex flex-col divide-y divide-slate-100">
            <li className="flex items-center gap-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-semibold text-slate-900">Verified</span>
                <span className="text-[11px] text-slate-500">Taken from the live record&apos;s verified-at timestamp. Reviewer is not recorded.</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">{formatDateTime(company.verifiedAt)}</span>
            </li>
          </ul>
        </Panel>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Circle className="h-2 w-2 fill-slate-300 text-slate-300" aria-hidden="true" />
          Earlier decisions are not kept as a separate history.
        </p>
      </>
    );
  }
  return (
    <EmptyState
      icon={Gavel}
      title="No decisions recorded"
      body={
        stage === 'rejected'
          ? 'This company is marked rejected, but the decision time and reviewer are not recorded.'
          : isLive
          ? 'No verification decision has been recorded for this company.'
          : 'Demo records do not carry decision timestamps.'
      }
    />
  );
};
