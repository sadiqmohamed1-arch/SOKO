import React, { useMemo, useState } from 'react';
import {
  FileX2,
  Clock,
  ScanSearch,
  BadgeCheck,
  XCircle,
  CalendarClock,
  Search,
  X,
  Eye,
  ShieldCheck,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import {
  type AdminCompany,
  type VerificationStage,
  DASH,
  VERIFICATION_STAGE_LABELS,
  VERIFICATION_STAGE_TONE,
  VERIFICATION_TONE_CLASSES,
  verificationStageOf,
} from './companyShared';
import { CompanyAvatar, RoleBadge } from './CompanyDirectory';

type TypeFilter = 'all' | 'supplier' | 'contractor' | 'buyer';
type StageFilter = 'all' | VerificationStage;

interface VerificationCenterProps {
  companies: AdminCompany[];
  isLive: boolean;
  syncState: 'idle' | 'loading' | 'success' | 'error';
  initialStage?: StageFilter;
  onReview: (company: AdminCompany) => void;
}

interface StageCard {
  id: string;
  label: string;
  value: number | null;
  icon: LucideIcon;
  tone: string;
  stage?: VerificationStage;
  unavailableReason?: string;
}

export interface DocumentCompleteness {
  provided: number;
  total: number;
}

// Demo records hold three registration identifiers; live rows carry no document data at all.
export function documentCompletenessOf(company: AdminCompany, isLive: boolean): DocumentCompleteness | null {
  if (isLive) return null;
  const identifiers = [company.tradeLicenseNo, company.vatTrn, company.dunsNumber];
  return { provided: identifiers.filter((value) => Boolean(value && value.trim())).length, total: identifiers.length };
}

export const VerificationCenter: React.FC<VerificationCenterProps> = ({
  companies,
  isLive,
  syncState,
  initialStage = 'all',
  onReview,
}) => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>(initialStage);
  const [searchQuery, setSearchQuery] = useState('');

  const stageCounts = useMemo(() => {
    const counts: Record<VerificationStage, number> = { not_submitted: 0, pending: 0, verified: 0, rejected: 0 };
    for (const company of companies) counts[verificationStageOf(company, isLive)] += 1;
    return counts;
  }, [companies, isLive]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return companies.filter((company) => {
      if (typeFilter !== 'all' && company.role !== typeFilter) return false;
      if (stageFilter !== 'all' && verificationStageOf(company, isLive) !== stageFilter) return false;
      if (!query) return true;
      return [company.companyName, company.legalName, company.sokoId, company.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [companies, isLive, typeFilter, stageFilter, searchQuery]);

  const isInitialLoad = syncState === 'loading' && companies.length === 0;
  const hasActiveFilters = typeFilter !== 'all' || stageFilter !== 'all' || searchQuery.trim() !== '';

  const resetFilters = () => {
    setTypeFilter('all');
    setStageFilter('all');
    setSearchQuery('');
  };

  const cards: StageCard[] = [
    { id: 'not_submitted', stage: 'not_submitted', label: 'Not submitted', value: stageCounts.not_submitted, icon: FileX2, tone: 'bg-slate-100 text-slate-600' },
    { id: 'pending', stage: 'pending', label: 'Pending review', value: stageCounts.pending, icon: Clock, tone: 'bg-amber-50 text-amber-700' },
    {
      id: 'under_review',
      label: 'Under review',
      value: null,
      icon: ScanSearch,
      tone: 'bg-blue-50 text-blue-700',
      unavailableReason: 'Review assignment is not tracked yet',
    },
    { id: 'verified', stage: 'verified', label: 'Verified', value: stageCounts.verified, icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700' },
    { id: 'rejected', stage: 'rejected', label: 'Rejected', value: stageCounts.rejected, icon: XCircle, tone: 'bg-rose-50 text-rose-700' },
    {
      id: 'expiring',
      label: 'Expiring soon',
      value: null,
      icon: CalendarClock,
      tone: 'bg-orange-50 text-orange-700',
      unavailableReason: 'Licence expiry dates are not loaded',
    },
  ];

  const typeOptions: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'All types' },
    { id: 'supplier', label: 'Suppliers' },
    { id: 'contractor', label: 'Contractors' },
    ...(isLive ? [] : [{ id: 'buyer' as const, label: 'Buyers' }]),
  ];

  const emptyMessage = isInitialLoad
    ? 'Loading verification records…'
    : syncState === 'error' && companies.length === 0
    ? 'Verification records could not be loaded. Use Sync to try again.'
    : companies.length === 0
    ? 'No companies are registered yet.'
    : stageFilter === 'pending'
    ? 'No companies are waiting for review.'
    : 'No companies match the current filters.';

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">Administrator review queue</span>
            <span className="text-sm font-bold text-slate-900">
              {isInitialLoad ? DASH : stageCounts.pending.toLocaleString()}{' '}
              {stageCounts.pending === 1 ? 'company' : 'companies'} awaiting a decision
            </span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 sm:max-w-sm sm:text-right text-pretty">
          Only submitted applications count as pending. Companies that have not submitted are tracked separately.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          const isFilterable = Boolean(card.stage);
          const isActive = isFilterable && stageFilter === card.stage;
          const content = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {!isFilterable && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Unavailable
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={`font-mono text-2xl font-bold leading-none ${card.value === null ? 'text-slate-300' : 'text-slate-900'}`}>
                  {card.value === null || isInitialLoad ? DASH : card.value.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                {card.unavailableReason && <span className="text-[11px] leading-snug text-slate-400">{card.unavailableReason}</span>}
              </span>
            </>
          );

          if (!isFilterable) {
            return (
              <div key={card.id} className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
                {content}
              </div>
            );
          }

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setStageFilter(isActive ? 'all' : (card.stage as VerificationStage))}
              aria-pressed={isActive}
              className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                isActive ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {content}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1" role="group" aria-label="Filter by company type">
          {typeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTypeFilter(option.id)}
              aria-pressed={typeFilter === option.id}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === option.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="verification-stage-filter">
            Filter by verification status
          </label>
          <select
            id="verification-stage-filter"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as StageFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All statuses</option>
            <option value="not_submitted">Not submitted</option>
            <option value="pending">Pending review</option>
            <option value="under_review" disabled>
              Under review (not tracked)
            </option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>

          <label className="sr-only" htmlFor="verification-date-filter">
            Filter by submission date
          </label>
          <select
            id="verification-date-filter"
            disabled
            defaultValue="any"
            title="Submission dates are not recorded yet"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed"
          >
            <option value="any">Submitted: any time (not recorded)</option>
          </select>

          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <label className="sr-only" htmlFor="verification-search">
              Search verification records
            </label>
            <input
              id="verification-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, SOKO ID or location"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-900">{filtered.length}</strong> of {companies.length}{' '}
          {companies.length === 1 ? 'company' : 'companies'}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      {isInitialLoad ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading verification records">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
          <ShieldCheck className="h-6 w-6 text-slate-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Company</th>
                  <th scope="col" className="px-3 py-3">SOKO ID</th>
                  <th scope="col" className="px-3 py-3">Type</th>
                  <th scope="col" className="px-3 py-3">Location</th>
                  <th scope="col" className="px-3 py-3">Submitted</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">Documents</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((company) => {
                  const stage = verificationStageOf(company, isLive);
                  return (
                    <tr key={company.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CompanyAvatar name={company.companyName} />
                          <span className="font-semibold text-slate-900">{company.companyName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-600">{(isLive && company.sokoId) || DASH}</td>
                      <td className="px-3 py-3">
                        <RoleBadge role={company.role} />
                      </td>
                      <td className="px-3 py-3 text-slate-600">{company.location || DASH}</td>
                      <td className="px-3 py-3 text-slate-400" title="Submission dates are not recorded yet">
                        {DASH}
                      </td>
                      <td className="px-3 py-3">
                        <StageBadge stage={stage} />
                      </td>
                      <td className="px-3 py-3">
                        <CompletenessMeter value={documentCompletenessOf(company, isLive)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => onReview(company)}
                            aria-label={`${stage === 'pending' ? 'Review' : 'View'} verification for ${company.companyName}`}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                              stage === 'pending'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {stage === 'pending' ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                            {stage === 'pending' ? 'Review' : 'View'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {filtered.map((company) => {
              const stage = verificationStageOf(company, isLive);
              return (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => onReview(company)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 cursor-pointer"
                  >
                    <CompanyAvatar name={company.companyName} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate text-sm font-semibold text-slate-900">{company.companyName}</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={company.role} />
                        <StageBadge stage={stage} />
                      </span>
                      <span className="truncate text-[11px] text-slate-500">
                        {company.location || 'Location not set'}
                        {isLive && company.sokoId ? ` • ${company.sokoId}` : ''}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export const StageBadge: React.FC<{ stage: VerificationStage }> = ({ stage }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
      VERIFICATION_TONE_CLASSES[VERIFICATION_STAGE_TONE[stage]]
    }`}
  >
    {VERIFICATION_STAGE_LABELS[stage]}
  </span>
);

export const CompletenessMeter: React.FC<{ value: DocumentCompleteness | null }> = ({ value }) => {
  if (!value) {
    return (
      <span className="text-[11px] text-slate-400" title="Document records are not connected yet">
        Not tracked
      </span>
    );
  }
  const percent = Math.round((value.provided / value.total) * 100);
  const barTone = percent === 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <span className="flex min-w-24 flex-col gap-1" title="Registration identifiers on the demo record">
      <span className="text-[11px] font-semibold text-slate-700">
        {value.provided}/{value.total} identifiers
      </span>
      <span className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <span className={`block h-full rounded-full ${barTone}`} style={{ width: `${percent}%` }} />
      </span>
    </span>
  );
};
