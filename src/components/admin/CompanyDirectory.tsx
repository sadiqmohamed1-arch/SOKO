import React from 'react';
import {
  Building2,
  Truck,
  HardHat,
  BadgeCheck,
  Ban,
  Search,
  ChevronRight,
  ShieldCheck,
  Edit3,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  type AdminCompany,
  DASH,
  ROLE_LABELS,
  ROLE_TONE_CLASSES,
  VERIFICATION_TONE_CLASSES,
  companyInitials,
  formatDate,
  verificationOf,
} from './companyShared';

type RoleFilter = 'all' | 'buyer' | 'supplier' | 'contractor';
type StatusFilter = 'all' | 'verified' | 'pending' | 'suspended';

interface CompanyDirectoryProps {
  companies: AdminCompany[];
  filteredCompanies: AdminCompany[];
  isLive: boolean;
  syncState: 'idle' | 'loading' | 'success' | 'error';
  roleFilter: RoleFilter;
  onRoleFilterChange: (value: RoleFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onViewCompany: (company: AdminCompany) => void;
  onToggleSuspension: (company: AdminCompany) => void;
  onEditDemoMetrics: (company: AdminCompany) => void;
}

interface SummaryCard {
  id: string;
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  isActive: boolean;
  onSelect: () => void;
}

export const CompanyDirectory: React.FC<CompanyDirectoryProps> = ({
  companies,
  filteredCompanies,
  isLive,
  syncState,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  onViewCompany,
  onToggleSuspension,
  onEditDemoMetrics,
}) => {
  const suppliers = companies.filter((c) => c.role === 'supplier').length;
  const contractors = companies.filter((c) => c.role === 'contractor').length;
  const verified = companies.filter((c) => c.isVerified && c.status !== 'suspended').length;
  const suspended = companies.filter((c) => c.status === 'suspended').length;
  const hasActiveFilters = roleFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';

  const resetFilters = () => {
    onRoleFilterChange('all');
    onStatusFilterChange('all');
    onSearchQueryChange('');
  };

  const cards: SummaryCard[] = [
    {
      id: 'total',
      label: 'Total companies',
      value: companies.length,
      icon: Building2,
      tone: 'bg-slate-100 text-slate-700',
      isActive: !hasActiveFilters,
      onSelect: resetFilters,
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      value: suppliers,
      icon: Truck,
      tone: 'bg-emerald-50 text-emerald-700',
      isActive: roleFilter === 'supplier',
      onSelect: () => onRoleFilterChange(roleFilter === 'supplier' ? 'all' : 'supplier'),
    },
    {
      id: 'contractors',
      label: 'Contractors',
      value: contractors,
      icon: HardHat,
      tone: 'bg-blue-50 text-blue-700',
      isActive: roleFilter === 'contractor',
      onSelect: () => onRoleFilterChange(roleFilter === 'contractor' ? 'all' : 'contractor'),
    },
    {
      id: 'verified',
      label: 'Verified',
      value: verified,
      icon: BadgeCheck,
      tone: 'bg-emerald-50 text-emerald-700',
      isActive: statusFilter === 'verified',
      onSelect: () => onStatusFilterChange(statusFilter === 'verified' ? 'all' : 'verified'),
    },
    {
      id: 'suspended',
      label: 'Suspended',
      value: suspended,
      icon: Ban,
      tone: 'bg-rose-50 text-rose-700',
      isActive: statusFilter === 'suspended',
      onSelect: () => onStatusFilterChange(statusFilter === 'suspended' ? 'all' : 'suspended'),
    },
  ];

  const roleOptions: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'All types' },
    { id: 'supplier', label: 'Suppliers' },
    { id: 'contractor', label: 'Contractors' },
    ...(isLive ? [] : [{ id: 'buyer' as const, label: 'Buyers' }]),
  ];

  const emptyMessage =
    syncState === 'loading'
      ? 'Loading company records…'
      : syncState === 'error' && companies.length === 0
      ? 'Company records could not be loaded. Use Sync to try again.'
      : companies.length === 0
      ? 'No companies are registered yet.'
      : 'No companies match the current filters.';

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={card.onSelect}
              aria-pressed={card.isActive}
              className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                card.isActive
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.tone}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-mono text-2xl font-bold leading-none text-slate-900">
                  {syncState === 'loading' && companies.length === 0 ? DASH : card.value.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1" role="group" aria-label="Filter by company type">
          {roleOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onRoleFilterChange(option.id)}
              aria-pressed={roleFilter === option.id}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === option.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="company-status-filter">
            Filter by status
          </label>
          <select
            id="company-status-filter"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending verification</option>
            <option value="suspended">Suspended</option>
          </select>

          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <label className="sr-only" htmlFor="company-search">
              Search companies
            </label>
            <input
              id="company-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search name, SOKO ID or email"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-900">{filteredCompanies.length}</strong> of {companies.length}{' '}
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

      {filteredCompanies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
          <Building2 className="h-6 w-6 text-slate-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Company</th>
                  <th scope="col" className="px-3 py-3">SOKO ID</th>
                  <th scope="col" className="px-3 py-3">Type</th>
                  <th scope="col" className="px-3 py-3">Location</th>
                  <th scope="col" className="px-3 py-3">Verification</th>
                  <th scope="col" className="px-3 py-3">Account</th>
                  <th scope="col" className="px-3 py-3">Registered</th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map((company) => (
                  <CompanyRow
                    key={company.id}
                    company={company}
                    isLive={isLive}
                    onView={onViewCompany}
                    onToggleSuspension={onToggleSuspension}
                    onEditDemoMetrics={onEditDemoMetrics}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {filteredCompanies.map((company) => {
              const verification = verificationOf(company, isLive);
              return (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => onViewCompany(company)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 cursor-pointer"
                  >
                    <CompanyAvatar name={company.companyName} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-semibold text-slate-900">{company.companyName}</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={company.role} />
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${VERIFICATION_TONE_CLASSES[verification.tone]}`}>
                          {verification.label}
                        </span>
                        {company.status === 'suspended' && <AccountBadge suspended />}
                      </span>
                      <span className="truncate font-mono text-[11px] text-slate-500">
                        {(isLive ? company.sokoId : null) || DASH} • {company.location || DASH}
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

const CompanyRow: React.FC<{
  company: AdminCompany;
  isLive: boolean;
  onView: (company: AdminCompany) => void;
  onToggleSuspension: (company: AdminCompany) => void;
  onEditDemoMetrics: (company: AdminCompany) => void;
}> = ({ company, isLive, onView, onToggleSuspension, onEditDemoMetrics }) => {
  const verification = verificationOf(company, isLive);
  const isSuspended = company.status === 'suspended';
  const secondaryName = isLive && company.legalName && company.legalName !== company.companyName ? company.legalName : null;

  return (
    <tr className="transition-colors hover:bg-slate-50">
      <td className="px-4 py-3">
        <button type="button" onClick={() => onView(company)} className="flex items-center gap-3 text-left cursor-pointer group">
          <CompanyAvatar name={company.companyName} />
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1 text-sm font-semibold text-slate-900 group-hover:text-blue-700">
              <span className="truncate">{company.companyName}</span>
              {company.isVerified && !isSuspended && (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-label="Verified" />
              )}
            </span>
            <span className="truncate text-[11px] text-slate-500">{secondaryName || company.email || DASH}</span>
          </span>
        </button>
      </td>
      <td className="px-3 py-3 font-mono text-[11px] text-slate-600">{(isLive ? company.sokoId : null) || DASH}</td>
      <td className="px-3 py-3">
        <RoleBadge role={company.role} />
      </td>
      <td className="px-3 py-3 text-slate-600">{company.location || DASH}</td>
      <td className="px-3 py-3">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${VERIFICATION_TONE_CLASSES[verification.tone]}`}>
          {verification.label}
        </span>
      </td>
      <td className="px-3 py-3">
        <AccountBadge suspended={isSuspended} />
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(company.registeredDate)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {isLive ? (
            <button
              type="button"
              onClick={() => onToggleSuspension(company)}
              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                isSuspended ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
              title={isSuspended ? 'Reinstate company' : 'Suspend company'}
              aria-label={`${isSuspended ? 'Reinstate' : 'Suspend'} ${company.companyName}`}
            >
              {isSuspended ? <ShieldCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onEditDemoMetrics(company)}
              className="rounded-lg bg-slate-100 p-1.5 text-slate-700 transition-colors hover:bg-slate-200 cursor-pointer"
              title="Edit demo audit metrics"
              aria-label={`Edit demo audit metrics for ${company.companyName}`}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onView(company)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
            aria-label={`Open profile for ${company.companyName}`}
          >
            Profile
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const CompanyAvatar: React.FC<{ name: string; size?: 'sm' | 'lg' }> = ({ name, size = 'sm' }) => (
  <span
    aria-hidden="true"
    className={`flex shrink-0 items-center justify-center rounded-lg bg-slate-900 font-bold text-slate-50 ${
      size === 'lg' ? 'h-14 w-14 text-lg' : 'h-9 w-9 text-xs'
    }`}
  >
    {companyInitials(name)}
  </span>
);

export const RoleBadge: React.FC<{ role: string }> = ({ role }) => (
  <span
    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
      ROLE_TONE_CLASSES[role] ?? ROLE_TONE_CLASSES.admin
    }`}
  >
    {ROLE_LABELS[role] ?? role}
  </span>
);

export const AccountBadge: React.FC<{ suspended: boolean }> = ({ suspended }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
      suspended ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${suspended ? 'bg-rose-500' : 'bg-emerald-500'}`} aria-hidden="true" />
    {suspended ? 'Suspended' : 'Active'}
  </span>
);
