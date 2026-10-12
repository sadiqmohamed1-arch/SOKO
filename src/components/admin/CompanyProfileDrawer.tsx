import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  BadgeCheck,
  Building2,
  Users,
  Package,
  FileText,
  Activity,
  CreditCard,
  Settings2,
  LayoutDashboard,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  FileQuestion,
  KeyRound,
  Archive,
  Info,
  Edit3,
  type LucideIcon,
} from 'lucide-react';
import {
  type AdminCompany,
  DASH,
  ROLE_LABELS,
  VERIFICATION_TONE_CLASSES,
  formatDate,
  formatDateTime,
  verificationOf,
} from './companyShared';
import { AccountBadge, CompanyAvatar, RoleBadge } from './CompanyDirectory';

type ProfileTab =
  | 'overview'
  | 'business'
  | 'contacts'
  | 'products'
  | 'documents'
  | 'activity'
  | 'subscription'
  | 'administration';

type TabSource = 'record' | 'partial' | 'ui_only';

const PROFILE_TABS: { id: ProfileTab; label: string; icon: LucideIcon; source: TabSource }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, source: 'record' },
  { id: 'business', label: 'Business Information', icon: Building2, source: 'record' },
  { id: 'contacts', label: 'Contacts & Team', icon: Users, source: 'partial' },
  { id: 'products', label: 'Products & Services', icon: Package, source: 'ui_only' },
  { id: 'documents', label: 'Certifications & Documents', icon: FileText, source: 'ui_only' },
  { id: 'activity', label: 'Visits & Activity', icon: Activity, source: 'partial' },
  { id: 'subscription', label: 'Subscription', icon: CreditCard, source: 'ui_only' },
  { id: 'administration', label: 'Administration', icon: Settings2, source: 'ui_only' },
];

interface CompanyProfileDrawerProps {
  company: AdminCompany;
  isLive: boolean;
  onClose: () => void;
  onDemoToggleVerification: (company: AdminCompany) => void;
  onDemoEditMetrics: (company: AdminCompany) => void;
}

export const CompanyProfileDrawer: React.FC<CompanyProfileDrawerProps> = ({
  company,
  isLive,
  onClose,
  onDemoToggleVerification,
  onDemoEditMetrics,
}) => {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const closeRef = useRef<HTMLButtonElement>(null);
  const verification = verificationOf(company, isLive);
  const isSuspended = company.status === 'suspended';
  const activeTab = PROFILE_TABS.find((t) => t.id === tab) ?? PROFILE_TABS[0];

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setTab('overview');
  }, [company.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close company profile"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-default"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-profile-title"
        className="relative flex h-full w-full max-w-3xl flex-col bg-slate-50 shadow-2xl"
      >
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 pt-5 sm:px-6">
          <div className="flex items-start gap-4">
            <CompanyAvatar name={company.companyName} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Company profile • {isLive ? 'Live record' : 'Demo record'}
              </span>
              <h2 id="company-profile-title" className="flex items-center gap-1.5 text-xl font-bold text-slate-900 text-balance">
                <span className="truncate">{company.companyName}</span>
                {company.isVerified && !isSuspended && <BadgeCheck className="h-5 w-5 shrink-0 text-blue-600" aria-label="Verified" />}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <RoleBadge role={company.role} />
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${VERIFICATION_TONE_CLASSES[verification.tone]}`}>
                  {verification.label}
                </span>
                <AccountBadge suspended={isSuspended} />
                <span className="font-mono text-[11px] text-slate-500">{(isLive ? company.sokoId : null) || 'No SOKO ID'}</span>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close company profile"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="Company profile sections" className="-mb-px flex gap-1 overflow-x-auto">
            {PROFILE_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">{activeTab.label}</h3>
              <SourceBadge source={activeTab.source} isLive={isLive} />
            </div>

            {tab === 'overview' && <OverviewTab company={company} isLive={isLive} />}
            {tab === 'business' && <BusinessTab company={company} isLive={isLive} />}
            {tab === 'contacts' && <ContactsTab company={company} isLive={isLive} />}
            {tab === 'products' && (
              <EmptyState
                icon={Package}
                title="No products or services loaded"
                body="Product and service listings are not connected to the admin panel yet. Nothing is shown here until a secure read endpoint exists."
              />
            )}
            {tab === 'documents' && <DocumentsTab company={company} isLive={isLive} />}
            {tab === 'activity' && <ActivityTab company={company} isLive={isLive} />}
            {tab === 'subscription' && (
              <EmptyState
                icon={CreditCard}
                title="No subscription data"
                body="Subscription plans and billing are not connected to the admin panel. No plan, invoice or renewal date is shown."
              />
            )}
            {tab === 'administration' && (
              <AdministrationTab
                company={company}
                isLive={isLive}
                onDemoToggleVerification={onDemoToggleVerification}
                onDemoEditMetrics={onDemoEditMetrics}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const SourceBadge: React.FC<{ source: TabSource; isLive: boolean }> = ({ source, isLive }) => {
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
        className={`h-1.5 w-1.5 rounded-full ${
          source === 'ui_only' ? 'bg-slate-400' : isLive ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      />
      {config.label}
    </span>
  );
};

const Panel: React.FC<{ title?: string; children: React.ReactNode; uiOnly?: boolean }> = ({ title, children, uiOnly }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
    {title && (
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
        {uiOnly && <span className="text-[11px] font-semibold text-slate-400">UI only</span>}
      </div>
    )}
    {children}
  </div>
);

const FieldGrid: React.FC<{ fields: { term: string; value?: React.ReactNode; mono?: boolean }[] }> = ({ fields }) => (
  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
    {fields.map((field) => {
      const isEmpty = field.value == null || field.value === '';
      return (
        <div key={field.term} className="flex flex-col gap-0.5">
          <dt className="text-[11px] font-medium text-slate-500">{field.term}</dt>
          <dd className={`text-sm ${isEmpty ? 'text-slate-400' : 'text-slate-900'} ${field.mono ? 'font-mono' : 'font-medium'}`}>
            {isEmpty ? DASH : field.value}
          </dd>
        </div>
      );
    })}
  </dl>
);

const EmptyState: React.FC<{ icon: LucideIcon; title: string; body: string }> = ({ icon: Icon, title, body }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    <p className="max-w-md text-xs leading-relaxed text-slate-500 text-pretty">{body}</p>
  </div>
);

const OverviewTab: React.FC<{ company: AdminCompany; isLive: boolean }> = ({ company, isLive }) => {
  const verification = verificationOf(company, isLive);
  const highlights = [
    { label: 'Verification', value: verification.label },
    { label: 'Account', value: company.status === 'suspended' ? 'Suspended' : 'Active' },
    { label: 'Registered', value: formatDate(company.registeredDate) },
  ];
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.label} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4">
            <span className="text-[11px] font-medium text-slate-500">{item.label}</span>
            <span className="text-base font-bold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
      <Panel title="Company summary">
        <FieldGrid
          fields={[
            { term: 'Display name', value: company.companyName },
            { term: 'Company type', value: ROLE_LABELS[company.role] ?? company.role },
            { term: 'SOKO ID', value: isLive ? company.sokoId : null, mono: true },
            { term: 'Location', value: company.location },
            { term: 'General email', value: company.email },
            { term: 'Phone', value: company.phone, mono: true },
          ]}
        />
      </Panel>
      {!isLive && company.auditNotes && (
        <Panel title="Auditor notes (demo)">
          <p className="text-sm leading-relaxed text-slate-700">{company.auditNotes}</p>
        </Panel>
      )}
    </>
  );
};

const BusinessTab: React.FC<{ company: AdminCompany; isLive: boolean }> = ({ company, isLive }) => (
  <>
    <Panel title="Registration">
      <FieldGrid
        fields={
          isLive
            ? [
                { term: 'Legal name', value: company.legalName },
                { term: 'Trading name', value: company.tradingName },
                { term: 'SOKO ID', value: company.sokoId, mono: true },
                { term: 'Company type', value: ROLE_LABELS[company.role] ?? company.role },
                { term: 'Emirate', value: company.emirate },
                { term: 'Country', value: company.country },
                { term: 'Registered on SOKO', value: formatDate(company.registeredDate) },
                { term: 'Verified on', value: company.verifiedAt ? formatDate(company.verifiedAt) : null },
              ]
            : [
                { term: 'Company name', value: company.companyName },
                { term: 'Company type', value: ROLE_LABELS[company.role] ?? company.role },
                { term: 'Location', value: company.location },
                { term: 'Registered on SOKO', value: formatDate(company.registeredDate) },
                { term: 'DUNS number', value: company.dunsNumber, mono: true },
                { term: 'Trade licence', value: company.tradeLicenseNo, mono: true },
                { term: 'VAT TRN', value: company.vatTrn, mono: true },
                { term: 'Annual sourcing volume', value: company.annualProcureVolume },
              ]
        }
      />
    </Panel>
    {isLive ? (
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-slate-600 text-pretty">
          Trade licence, VAT and other private registration fields are restricted at the database level and are not loaded in
          this view.
        </p>
      </div>
    ) : (
      <Panel title="Compliance metrics (demo)">
        <FieldGrid
          fields={[
            { term: 'ICV score', value: `${company.icvScore}%` },
            { term: 'Risk rating', value: company.riskRating },
          ]}
        />
      </Panel>
    )}
  </>
);

const ContactsTab: React.FC<{ company: AdminCompany; isLive: boolean }> = ({ company, isLive }) => {
  const channels = [
    { icon: Mail, label: 'General email', value: company.email },
    { icon: Phone, label: 'Phone', value: company.phone },
    { icon: MapPin, label: 'Location', value: company.location },
  ];
  return (
    <>
      <Panel title="Company contact">
        <ul className="flex flex-col divide-y divide-slate-100">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <li key={channel.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[11px] font-medium text-slate-500">{channel.label}</span>
                  <span className={`truncate text-sm ${channel.value ? 'font-medium text-slate-900' : 'text-slate-400'}`}>
                    {channel.value || DASH}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
      {!isLive && company.contactPerson ? (
        <Panel title="Lead contact (demo)">
          <p className="text-sm font-medium text-slate-900">{company.contactPerson}</p>
        </Panel>
      ) : (
        <EmptyState
          icon={Users}
          title="Team members not loaded"
          body="Company members and roles are not connected to this view yet. No team members are shown."
        />
      )}
    </>
  );
};

const DocumentsTab: React.FC<{ company: AdminCompany; isLive: boolean }> = ({ company, isLive }) => (
  <>
    {!isLive && company.complianceCertCount > 0 && (
      <Panel title="Certificate count (demo)">
        <p className="text-sm text-slate-700">
          The demo record lists <strong className="text-slate-900">{company.complianceCertCount}</strong> compliance certificates. No
          files are attached.
        </p>
      </Panel>
    )}
    <EmptyState
      icon={FileText}
      title="No documents available"
      body="Certifications, licences and uploaded documents are not connected to the admin panel. Document review will appear here once a secure storage workflow is in place."
    />
  </>
);

const ActivityTab: React.FC<{ company: AdminCompany; isLive: boolean }> = ({ company, isLive }) => {
  const events = [
    { label: 'Company registered on SOKO', at: company.registeredDate, icon: Building2 },
    ...(company.verifiedAt ? [{ label: 'Verification approved', at: company.verifiedAt, icon: CheckCircle2 }] : []),
    ...(isLive && company.updatedAt && company.updatedAt !== company.registeredDate
      ? [{ label: 'Record last updated', at: company.updatedAt, icon: Activity }]
      : []),
    ...(!isLive ? [{ label: 'Last active (demo)', at: company.lastActive, icon: Activity }] : []),
  ].sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));

  return (
    <>
      <Panel title="Record timeline">
        <ol className="flex flex-col gap-3">
          {events.map((event) => {
            const Icon = event.icon;
            return (
              <li key={event.label} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900">{event.label}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(event.at)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>
      <EmptyState
        icon={Activity}
        title="No visit or engagement analytics"
        body="Profile visits, logins and engagement are not tracked for the admin panel yet. Only the record timestamps above are real."
      />
    </>
  );
};

const ADMIN_ACTIONS: { label: string; description: string; icon: LucideIcon; danger?: boolean }[] = [
  { label: 'Verify company', description: 'Approve submitted verification and issue the verified badge.', icon: CheckCircle2 },
  { label: 'Reject verification', description: 'Decline a verification request with a recorded reason.', icon: XCircle, danger: true },
  { label: 'Suspend account', description: 'Hide the company and block member access pending review.', icon: Ban, danger: true },
  { label: 'Restore account', description: 'Lift a suspension and restore visibility and access.', icon: RotateCcw },
  { label: 'Request documents', description: 'Ask the company to upload missing licences or certificates.', icon: FileQuestion },
  { label: 'Reset owner access', description: 'Transfer or reset the company owner account.', icon: KeyRound, danger: true },
  { label: 'Archive company', description: 'Permanently retire the company record.', icon: Archive, danger: true },
];

const AdministrationTab: React.FC<{
  company: AdminCompany;
  isLive: boolean;
  onDemoToggleVerification: (company: AdminCompany) => void;
  onDemoEditMetrics: (company: AdminCompany) => void;
}> = ({ company, isLive, onDemoToggleVerification, onDemoEditMetrics }) => (
  <>
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-amber-900">Sensitive actions are locked</p>
        <p className="text-xs leading-relaxed text-amber-800 text-pretty">
          These controls are placeholders. They stay disabled until secure, audited backend workflows are implemented.
          {isLive && ' Suspend and reinstate remain available from the directory row, which uses the existing admin RPC.'}
        </p>
      </div>
    </div>

    <Panel title="Account controls" uiOnly>
      <ul className="flex flex-col divide-y divide-slate-100">
        {ADMIN_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  action.danger ? 'bg-rose-50 text-rose-400' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-slate-700">{action.label}</span>
                <span className="text-xs text-slate-500 text-pretty">{action.description}</span>
              </span>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Requires a secure backend workflow"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 cursor-not-allowed"
              >
                <Lock className="h-3 w-3" aria-hidden="true" />
                Locked
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>

    {!isLive && (
      <Panel title="Demo controls">
        <p className="text-xs leading-relaxed text-slate-500">
          These change local demo data only and never touch live records.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDemoToggleVerification(company)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-50 hover:bg-slate-800 cursor-pointer"
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {company.isVerified ? 'Revoke demo verification' : 'Grant demo verification'}
          </button>
          <button
            type="button"
            onClick={() => onDemoEditMetrics(company)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            Edit demo audit metrics
          </button>
        </div>
      </Panel>
    )}

    <div className="flex items-start gap-2 text-xs text-slate-500">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Record ID: <span className="font-mono">{company.id}</span></span>
    </div>
  </>
);
