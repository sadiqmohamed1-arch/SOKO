import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Copy, Loader2, MailCheck, Search, ShieldAlert, UserPlus, X } from 'lucide-react';
import { BUYER_SUPPLIERS, supplierShareUrl } from '../../data/buyerSuppliers';
import { EMIRATES } from '../../data/marketHubCatalog';
import { CompanyProfile, CompanyRecord, roleMeta, SessionUser, CompanyRole, SupplierStore, SUPPLIER_ROLES, CONTRACTOR_ROLES } from '../../data/supplierTypes';
import { findDuplicateCompanies, profileChecklist, searchCompanies } from '../../data/supplierStore';
import { registerCompany, requestAccess } from '../../data/supplierService';
import { CONTRACTOR_CLASSIFICATIONS, normalizeContractorProfile } from '../../data/contractorTaxonomy';
import {
  clearOnboardingDraft,
  fetchCompanyOrgClassification,
  fetchOwnIdentityProfile,
  findLiveDuplicateCompanies,
  loadOnboardingDraft,
  registerLiveCompany,
  requestLiveJoin,
  saveOnboardingDraft,
  searchLiveCompanies,
  updateOwnProfile,
  type LiveCompanyHit,
  type OnboardingIntent,
} from '../../lib/companyOnboarding';
import {
  PROFESSIONAL_CLASSIFICATIONS,
  clearOrgBootstrap,
  clearProfessionalRole,
  isProfessionalClassification,
  loadOrgBootstrap,
  loadProfessionalRole,
  parseOrgClassificationLabel,
  saveProfessionalRole,
  type ProfessionalClassification,
} from '../../data/registrationIdentity';
import { btnPrimary, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { ChipToggle, DemoNote } from '../marketHub/MarketHubShared';
import {
  CompanyInfoFields,
  ContractorTaxonomyFields,
  MARKET_OPTIONS,
  SUPPLIER_TYPE_OPTIONS,
  TaxonomyFields,
  TextField,
} from './ProfileEditors';
import { LicenseUpload } from './VerificationUpload';

type StepId =
  | 'account'
  | 'find'
  | 'identity'
  | 'supplier_type'
  | 'trade_categories'
  | 'brands_products'
  | 'services'
  | 'locations'
  | 'contractor_type'
  | 'specializations'
  | 'sectors'
  | 'verification'
  | 'complete'
  | 'pro_profile'
  | 'pro_path'
  | 'join_done';

const FLOW: Record<OnboardingIntent, StepId[]> = {
  supplier: ['account', 'find', 'identity', 'supplier_type', 'trade_categories', 'brands_products', 'services', 'locations', 'verification', 'complete'],
  contractor: ['account', 'find', 'identity', 'contractor_type', 'specializations', 'sectors', 'locations', 'verification', 'complete'],
  join: ['account', 'find'],
  personal: ['account', 'pro_profile', 'pro_path'],
};

const STEP_LABEL: Partial<Record<StepId, string>> = {
  account: 'Account',
  find: 'Company',
  identity: 'Identity',
  supplier_type: 'Type',
  trade_categories: 'Categories',
  brands_products: 'Brands',
  services: 'Services',
  locations: 'Locations',
  contractor_type: 'Type',
  specializations: 'Specialisms',
  sectors: 'Sectors',
  verification: 'Verify',
  complete: 'Done',
  pro_profile: 'Profile',
  pro_path: 'Next',
  join_done: 'Done',
};

const blankProfile = (): CompanyProfile => ({
  legalName: '', tradingName: '', types: [], licenseNo: '', issuingAuthority: 'Dubai Economy and Tourism (DET)', licenseExpiry: '', country: 'United Arab Emirates',
  emirate: 'Dubai', address: '', website: '', generalEmail: '', phone: '', description: '', categories: [], subcategories: [], brands: [], capabilities: [],
  regionsServed: [], marketsServed: ['UAE'], contacts: [], certifications: [], logoTone: 'bg-slate-800',
});

type Props = {
  store: SupplierStore;
  user: SessionUser;
  onStoreChange: (s: SupplierStore) => void;
  onOpenWorkspace: (companyId: string) => void;
  onCancel: () => void;
  notify: (m: string) => void;
  intent?: OnboardingIntent;
  isLive?: boolean;
  emailVerified?: boolean;
  onRefreshAccess?: () => Promise<void>;
};

const INTENT_COPY: Record<OnboardingIntent, { eyebrow: string; title: string }> = {
  join: { eyebrow: 'Join a company', title: 'Find your company on SOKO' },
  supplier: { eyebrow: 'Supplier onboarding', title: 'Set up your supplier company on SOKO' },
  contractor: { eyebrow: 'Contractor / buyer onboarding', title: 'Set up your contractor or developer company on SOKO' },
  personal: { eyebrow: 'Individual professional', title: 'Complete your professional profile' },
};

function addTag(list: string[], raw: string): string[] {
  const v = raw.trim().slice(0, 120);
  if (!v || list.includes(v)) return list;
  return [...list, v];
}

export const SupplierOnboarding: React.FC<Props> = ({
  store,
  user,
  onStoreChange,
  onOpenWorkspace,
  onCancel,
  notify,
  intent = 'supplier',
  isLive = false,
  emailVerified = false,
  onRefreshAccess,
}) => {
  const companyKind = intent === 'contractor' ? 'contractor' : 'supplier';
  const copy = INTENT_COPY[intent];
  const steps = FLOW[intent];
  const joinRoles = companyKind === 'contractor'
    ? CONTRACTOR_ROLES.filter((r) => r !== 'contractor_admin')
    : SUPPLIER_ROLES.filter((r) => r !== 'supplier_admin');

  const [stepId, setStepId] = useState<StepId>(steps[0]);
  const [verified, setVerified] = useState(Boolean(isLive && emailVerified));
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string; managed: boolean } | null>(null);
  const [role, setRole] = useState<CompanyRole>(companyKind === 'contractor' ? 'procurement_officer' : 'sales_rep');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<'requested' | 'claimed' | null>(null);
  const [profile, setProfile] = useState<CompanyProfile>(blankProfile);
  const [error, setError] = useState('');
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveHits, setLiveHits] = useState<LiveCompanyHit[]>([]);
  const [liveDupes, setLiveDupes] = useState<{ id: string; name: string; reason: string }[]>([]);
  const [draftReady, setDraftReady] = useState(!isLive);
  const [proRole, setProRole] = useState<ProfessionalClassification | ''>(() => loadProfessionalRole() || '');
  const [proTitle, setProTitle] = useState(() =>
    user.title && !isProfessionalClassification(user.title) ? user.title : '',
  );
  const [proPhone, setProPhone] = useState(user.phone || '');
  const [proLocation, setProLocation] = useState('');
  const [brandDraft, setBrandDraft] = useState('');
  const [serviceDraft, setServiceDraft] = useState('');
  /** When Individual Professional chooses “join”, we temporarily run the find-company step. */
  const [proJoining, setProJoining] = useState(false);
  /** Organization already bootstrapped at signup — skip find/re-create. */
  const [existingCompanyId, setExistingCompanyId] = useState<string | null>(null);
  const [orgPrefillDone, setOrgPrefillDone] = useState(false);
  const [identityPrefillDone, setIdentityPrefillDone] = useState(false);

  const activeSteps = useMemo(() => {
    if (intent === 'personal' && proJoining) return ['account', 'pro_profile', 'find', 'join_done'] as StepId[];
    return steps;
  }, [intent, proJoining, steps]);

  const stepIndex = Math.max(0, activeSteps.indexOf(stepId));

  const go = (id: StepId) => {
    setError('');
    setStepId(id);
  };
  const nextAfter = (id: StepId) => {
    const i = activeSteps.indexOf(id);
    if (i >= 0 && i < activeSteps.length - 1) go(activeSteps[i + 1]);
  };
  const backBefore = (id: StepId) => {
    const i = activeSteps.indexOf(id);
    if (i > 0) go(activeSteps[i - 1]);
  };

  useEffect(() => {
    if (emailVerified) setVerified(true);
    const sessionPro = loadProfessionalRole();
    if (sessionPro && intent === 'personal') setProRole(sessionPro);

    const boot = loadOrgBootstrap();
    if (boot && (intent === 'supplier' || intent === 'contractor') && !orgPrefillDone) {
      setExistingCompanyId(boot.companyId);
      const classLabel = parseOrgClassificationLabel(boot.classification);
      setProfile((prev) => ({
        ...prev,
        legalName: boot.legalName || prev.legalName,
        tradingName: boot.tradingName || prev.tradingName,
        emirate: boot.emirate || prev.emirate,
        country: boot.countryLabel || prev.country,
        generalEmail: boot.generalEmail || prev.generalEmail,
        description: boot.description || prev.description,
        types: classLabel ? [classLabel] : prev.types,
      }));
      // Org signup created the company shell (or failed soft) — collect license/details then taxonomy.
      setVerified(true);
      setStepId('identity');
      setOrgPrefillDone(true);
      setDraftReady(true);
      return;
    }

    if (!isLive) {
      setDraftReady(true);
      return;
    }
    const draft = loadOnboardingDraft(user.id);
    if (draft && draft.intent === intent && draft.step >= 0 && draft.step < FLOW[intent].length) {
      const restored = FLOW[intent][draft.step] ?? FLOW[intent][0];
      setStepId(restored);
      setProfile(intent === 'contractor' ? normalizeContractorProfile(draft.profile) : draft.profile);
      setQ(draft.q);
    }
    setDraftReady(true);
  }, [isLive, user.id, intent, emailVerified, orgPrefillDone]);

  // Returning users: hydrate org / professional classifications from permanent columns.
  useEffect(() => {
    if (!isLive || identityPrefillDone || !draftReady) return;
    let cancelled = false;
    void (async () => {
      if (intent === 'personal') {
        const r = await fetchOwnIdentityProfile();
        if (cancelled) return;
        if (r.ok && r.value) {
          if (r.value.professional_classification) setProRole(r.value.professional_classification);
          if (r.value.title && !isProfessionalClassification(r.value.title)) setProTitle(r.value.title);
          if (r.value.phone) setProPhone(r.value.phone);
          if (r.value.location) setProLocation(r.value.location);
        }
      }
      const companyId = existingCompanyId;
      if (companyId && (intent === 'supplier' || intent === 'contractor')) {
        const r = await fetchCompanyOrgClassification(companyId);
        if (!cancelled && r.ok && r.value) {
          setProfile((prev) => ({
            ...prev,
            types: prev.types.length ? prev.types : [r.value as string],
          }));
        }
      }
      if (!cancelled) setIdentityPrefillDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLive, identityPrefillDone, draftReady, intent, existingCompanyId]);

  useEffect(() => {
    if (!isLive || !draftReady || stepId === 'complete' || stepId === 'join_done') return;
    const idx = FLOW[intent].indexOf(stepId);
    if (idx < 0) return;
    saveOnboardingDraft(user.id, { intent, step: idx, profile, q });
  }, [isLive, draftReady, user.id, intent, stepId, profile, q]);

  const demoResults = useMemo(() => (isLive ? [] : searchCompanies(store, q)), [isLive, store, q]);
  const demoDuplicates = !isLive && (profile.tradingName || profile.licenseNo)
    ? findDuplicateCompanies(store, profile.tradingName || profile.legalName, profile.licenseNo)
    : [];
  const duplicates = isLive ? liveDupes : demoDuplicates;
  const results = isLive
    ? liveHits.map((r) => ({ id: r.id, name: r.name, location: r.location, sokoId: r.sokoId, managed: r.managed }))
    : demoResults;

  useEffect(() => {
    if (!isLive || (stepId !== 'find' && !proJoining)) return;
    const qTrim = q.trim();
    if (qTrim.length < 2) {
      setLiveHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        const r = await searchLiveCompanies(qTrim);
        if (cancelled) return;
        if (!r.ok) {
          setError(r.error);
          setLiveHits([]);
          return;
        }
        setError('');
        setLiveHits(r.value);
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isLive, q, stepId, proJoining]);

  useEffect(() => {
    if (!isLive || stepId !== 'identity') return;
    const name = profile.tradingName.trim() || profile.legalName.trim();
    if (name.length < 3) {
      setLiveDupes([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        const r = await findLiveDuplicateCompanies(profile.tradingName, profile.legalName);
        if (cancelled) return;
        if (r.ok) setLiveDupes(r.value);
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isLive, stepId, profile.tradingName, profile.legalName]);

  const sendRequest = async () => {
    if (!selected) return;
    if (isLive) {
      setBusy(true);
      setError('');
      const r = await requestLiveJoin(selected.id);
      setBusy(false);
      if (!r.ok) return setError(r.error);
      if (onRefreshAccess) await onRefreshAccess();
      clearOnboardingDraft(user.id);
      setOutcome('requested');
      if (intent === 'personal' || proJoining) go('join_done');
      else setOutcome('requested');
      notify(`Access request sent to ${selected.name}. An admin must approve before you join.`);
      return;
    }
    const r = requestAccess(store, user, selected.id, role, note);
    if (!r.ok) return setError(r.error);
    onStoreChange(r.store);
    setOutcome('requested');
    if (intent === 'personal' || proJoining) go('join_done');
    notify(`Access request sent to ${selected.name}`);
  };

  const validateIdentity = () => {
    if (!profile.legalName.trim() || !profile.tradingName.trim()) {
      setError('Legal name and trading name are required.');
      return false;
    }
    // License can be added at verification; encourage it here when not yet on an existing org shell.
    if (!existingCompanyId && !profile.licenseNo.trim()) {
      setError('Trade license number is required to register a new company.');
      return false;
    }
    if (duplicates.length) {
      setError('This company already appears to exist on SOKO.');
      return false;
    }
    return true;
  };

  const register = async (licenseFile?: { name: string; sizeMb: number }) => {
    const readyProfile = companyKind === 'contractor' ? normalizeContractorProfile(profile) : profile;
    if (isLive) {
      setBusy(true);
      setError('');
      const r = await registerLiveCompany({
        kind: companyKind,
        profile: readyProfile,
        submitForVerification: Boolean(licenseFile),
        existingCompanyId,
      });
      setBusy(false);
      if (!r.ok) return setError(r.error);
      if (onRefreshAccess) await onRefreshAccess();
      clearOnboardingDraft(user.id);
      clearOrgBootstrap();
      clearProfessionalRole();
      setCompany(r.value);
      go('complete');
      notify(r.value.verification.status === 'pending'
        ? 'Company created. Verification is pending SOKO review.'
        : 'Company workspace created on SOKO.');
      return;
    }
    const r = registerCompany(store, user, { profile: readyProfile, licenseFile, kind: companyKind });
    if (!r.ok) return setError(r.error);
    setError('');
    onStoreChange(r.store);
    setCompany(r.value);
    go('complete');
  };

  const saveProfessionalProfile = async () => {
    if (!proRole) return setError('Select your primary professional role.');
    if (proTitle.trim().length < 2) return setError('Enter your job title (e.g. Procurement Manager).');
    if (isLive) {
      setBusy(true);
      const r = await updateOwnProfile({
        professional_classification: proRole,
        title: proTitle.trim(),
        phone: proPhone.trim(),
        location: proLocation.trim(),
        full_name: user.name,
      });
      setBusy(false);
      if (!r.ok) return setError(r.error);
      saveProfessionalRole(proRole);
      if (onRefreshAccess) await onRefreshAccess();
    } else {
      saveProfessionalRole(proRole);
    }
    setError('');
    nextAfter('pro_profile');
  };

  const directory = company ? BUYER_SUPPLIERS.find((s) => s.id === company.id) : undefined;
  const shareUrl = directory ? supplierShareUrl(directory) : company?.sokoId ? `https://soko.ae/s/${company.sokoId}` : '';

  const navFooter = (showBack: boolean, next?: { label?: string; onClick: () => void; disabled?: boolean }) => (
    <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3">
      {showBack ? (
        <button type="button" onClick={() => backBefore(stepId)} className={btnSecondary}><ArrowLeft className="w-4 h-4" /> Back</button>
      ) : <span />}
      {next && (
        <button type="button" disabled={next.disabled || busy} onClick={next.onClick} className={btnPrimary}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {next.label ?? 'Continue'} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  if (!draftReady) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex flex-col items-center gap-3 text-slate-600">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Loading onboarding…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a702f]">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 leading-tight">{copy.title}</h1>
        </div>
        {stepId !== 'complete' && stepId !== 'join_done' && (
          <button type="button" onClick={onCancel} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Close onboarding"><X className="w-5 h-5" /></button>
        )}
      </div>

      <ol className="flex items-center gap-1 mb-8 overflow-x-auto" aria-label="Progress">
        {activeSteps.filter((s) => s !== 'join_done').map((s, i) => (
          <li key={s} className="flex-1 min-w-[3.5rem]">
            <div className={`h-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <p className={`mt-1.5 text-[10px] font-medium hidden sm:block truncate ${i === stepIndex ? 'text-slate-900' : 'text-slate-400'}`}>
              {STEP_LABEL[s] ?? s}
            </p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {error && <p role="alert" className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

        {stepId === 'account' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your SOKO account</h2>
            <p className="mt-1 text-sm text-slate-600">One personal account. You can belong to multiple companies with authorized memberships.</p>
            <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}{user.title ? ` · ${user.title}` : ''}</p>
            </div>
            <div className="mt-4">
              {verified ? (
                <p className="text-sm font-medium text-emerald-700 flex items-center gap-1.5"><MailCheck className="w-4 h-4" /> Email verified</p>
              ) : isLive ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Confirm your email, then sign in again to continue onboarding.
                </p>
              ) : !codeSent ? (
                <button type="button" onClick={() => { setCodeSent(true); notify('Verification code sent (simulated — enter any 6 digits)'); }} className={btnSecondary}><MailCheck className="w-4 h-4" /> Send email verification code</button>
              ) : (
                <div className="flex gap-2 items-end">
                  <label className="block">
                    <span className={labelCls}>6-digit code (any digits in this demo)</span>
                    <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" className={`${inputCls} w-40 tracking-[0.3em]`} />
                  </label>
                  <button type="button" disabled={code.length !== 6} onClick={() => setVerified(true)} className={btnPrimary}>Verify</button>
                </div>
              )}
            </div>
            {navFooter(false, { disabled: !verified, onClick: () => nextAfter('account') })}
          </div>
        )}

        {stepId === 'pro_profile' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Professional profile</h2>
            <p className="mt-1 text-sm text-slate-600">
              Role is your SOKO classification. Job title is your free-text designation — companies you join later will see both.
            </p>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>Primary professional role</span>
                <select
                  value={proRole}
                  onChange={(e) => setProRole(e.target.value as ProfessionalClassification)}
                  className={inputCls}
                  required
                >
                  <option value="" disabled>
                    Select role
                  </option>
                  {PROFESSIONAL_CLASSIFICATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="Job title" value={proTitle} onChange={setProTitle} placeholder="e.g. Procurement Manager" required />
              <TextField label="Phone" value={proPhone} onChange={setProPhone} placeholder="+971 …" />
              <div className="sm:col-span-2">
                <TextField label="Location" value={proLocation} onChange={setProLocation} placeholder="Dubai, UAE" />
              </div>
            </div>
            {navFooter(true, { label: busy ? 'Saving…' : 'Continue', onClick: () => void saveProfessionalProfile() })}
          </div>
        )}

        {stepId === 'pro_path' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">How will you work on SOKO?</h2>
            <p className="mt-1 text-sm text-slate-600">You can join additional companies any time from your workspace switcher.</p>
            <ul className="mt-5 flex flex-col gap-3">
              <li>
                <button
                  type="button"
                  onClick={() => { setProJoining(true); setOutcome(null); go('find'); }}
                  className="group flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-blue-500 hover:bg-slate-50 cursor-pointer"
                >
                  <UserPlus className="w-5 h-5 text-blue-600 mt-0.5" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Join an existing company</span>
                    <span className="block text-sm text-slate-600 mt-0.5">Request access. A company admin must approve. You can hold multiple memberships.</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => { clearOnboardingDraft(user.id); notify('Welcome to SOKO — your personal workspace is ready.'); onCancel(); }}
                  className="group flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-blue-500 hover:bg-slate-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Continue independently</span>
                    <span className="block text-sm text-slate-600 mt-0.5">Explore the network with your personal account. Register or join a company later.</span>
                  </span>
                </button>
              </li>
            </ul>
            {navFooter(true)}
          </div>
        )}

        {stepId === 'find' && !outcome && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Find your company</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isLive
                ? 'Search the public directory, request to join, or register a new company you are authorized to represent.'
                : 'Check whether your company is already on SOKO before registering it.'}
            </p>
            <div className="relative mt-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setSelected(null); }} placeholder="Company name or SOKO ID" className={`${inputCls} pl-9`} />
            </div>
            {results.length > 0 && (
              <ul className="mt-3 rounded-xl border border-slate-200 divide-y divide-slate-100">
                {results.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => setSelected(r)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${selected?.id === r.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{r.name}</span>
                        <span className="block text-xs text-slate-500">{r.location} · {r.sokoId}</span>
                      </span>
                      <span className="text-xs text-slate-500">{r.managed ? 'Managed workspace' : 'Unclaimed listing'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {q.trim().length >= 2 && results.length === 0 && <p className="mt-3 text-sm text-slate-500">No matching public company on SOKO.</p>}

            {selected && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {selected.managed ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900">Request access to {selected.name}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {isLive
                        ? 'Requests start as Viewer. An admin approves and assigns your role. Multiple company memberships are supported.'
                        : 'A company admin must approve your request.'}
                    </p>
                    {!isLive && (
                      <div className="mt-3 grid sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className={labelCls}>Requested role</span>
                          <select value={role} onChange={(e) => setRole(e.target.value as CompanyRole)} className={inputCls}>
                            {joinRoles.map((r) => <option key={r} value={r}>{roleMeta(r).label}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className={labelCls}>Note to admin (optional)</span>
                          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
                        </label>
                      </div>
                    )}
                    <button type="button" disabled={busy} onClick={() => void sendRequest()} className={`${btnPrimary} mt-3`}>
                      {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending</> : 'Send access request'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-900">Claim {selected.name}</p>
                    <p className="mt-1 text-xs text-slate-600">Claiming unclaimed listings needs a dedicated review RPC (not available yet).</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (isLive) {
                          setError('Claiming an unclaimed listing is not available yet. Register your company or ask an admin for an invitation.');
                          return;
                        }
                        setOutcome('claimed');
                        notify('Claim submitted for SOKO review (simulated)');
                      }}
                      className={`${btnPrimary} mt-3`}
                    >
                      Submit claim for review
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (proJoining) {
                    setProJoining(false);
                    go('pro_path');
                  } else backBefore('find');
                }}
                className={btnSecondary}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              {intent !== 'join' && intent !== 'personal' && !proJoining && (
                <button
                  type="button"
                  onClick={() => {
                    setProfile({
                      ...(companyKind === 'contractor' ? normalizeContractorProfile(blankProfile()) : blankProfile()),
                      tradingName: q.trim(),
                      legalName: q.trim(),
                    });
                    go('identity');
                  }}
                  className={btnPrimary}
                >
                  My company isn't listed — register it <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {stepId === 'find' && outcome && intent !== 'personal' && !proJoining && (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-blue-600 mx-auto" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">{outcome === 'requested' ? 'Access request sent' : 'Claim submitted'}</h2>
            <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
              {outcome === 'requested'
                ? `An admin at ${selected?.name} will review your request. The workspace appears once approved — you can still belong to other companies.`
                : `SOKO will review your claim for ${selected?.name}.`}
            </p>
            <button type="button" onClick={onCancel} className={`${btnPrimary} mt-6`}>Back to my workspace</button>
          </div>
        )}

        {stepId === 'join_done' && (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-blue-600 mx-auto" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">Access request sent</h2>
            <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
              An admin at {selected?.name} will review your request. You can request additional companies later.
            </p>
            <button type="button" onClick={onCancel} className={`${btnPrimary} mt-6`}>Continue to SOKO</button>
          </div>
        )}

        {stepId === 'identity' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Company identity</h2>
            <p className="mt-1 text-sm text-slate-600">Use the details exactly as they appear on your trade license.</p>
            <div className="mt-5"><CompanyInfoFields value={profile} onChange={setProfile} /></div>
            <label className="block mt-4">
              <span className={labelCls}>Company description</span>
              <textarea rows={3} value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })} className={inputCls} placeholder="What you do and where you operate" />
            </label>
            {duplicates.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Possible duplicate company</p>
                <ul className="mt-1 text-sm text-amber-900 space-y-0.5">
                  {duplicates.map((d) => <li key={d.id}>{d.name} — {d.reason}</li>)}
                </ul>
                <button type="button" onClick={() => { setQ(duplicates[0].name); go('find'); }} className="mt-2 text-sm font-semibold text-amber-900 underline cursor-pointer">Find it and request access instead</button>
              </div>
            )}
            {navFooter(true, {
              onClick: () => {
                if (!validateIdentity()) return;
                nextAfter('identity');
              },
            })}
          </div>
        )}

        {stepId === 'supplier_type' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Supplier type</h2>
            <p className="mt-1 text-sm text-slate-600">How buyers should classify your company on SOKO.</p>
            <div className="mt-5">
              <ChipToggle options={SUPPLIER_TYPE_OPTIONS} value={profile.types} onChange={(types) => setProfile({ ...profile, types })} />
            </div>
            {navFooter(true, {
              onClick: () => {
                if (!profile.types.length) return setError('Choose at least one supplier type.');
                nextAfter('supplier_type');
              },
            })}
          </div>
        )}

        {stepId === 'trade_categories' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Trade categories</h2>
            <p className="mt-1 text-sm text-slate-600">Matched to buyer searches and Market Hub opportunities.</p>
            <div className="mt-5"><TaxonomyFields value={profile} onChange={setProfile} hideTypes /></div>
            {navFooter(true, {
              onClick: () => {
                if (!profile.categories.length) return setError('Choose at least one trade category.');
                nextAfter('trade_categories');
              },
            })}
          </div>
        )}

        {stepId === 'brands_products' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Products & brands</h2>
            <p className="mt-1 text-sm text-slate-600">Stored as company taxonomy brands (existing schema). Add product lines and brand names you supply.</p>
            <div className="mt-5 flex gap-2">
              <input
                value={brandDraft}
                onChange={(e) => setBrandDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setProfile({ ...profile, brands: addTag(profile.brands, brandDraft) });
                    setBrandDraft('');
                  }
                }}
                className={inputCls}
                placeholder="e.g. Hilti, Structural steel sections"
              />
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setProfile({ ...profile, brands: addTag(profile.brands, brandDraft) });
                  setBrandDraft('');
                }}
              >
                Add
              </button>
            </div>
            {profile.brands.length > 0 && (
              <div className="mt-4">
                <ChipToggle options={profile.brands} value={profile.brands} onChange={(brands) => setProfile({ ...profile, brands })} />
              </div>
            )}
            {navFooter(true, {
              label: profile.brands.length ? 'Continue' : 'Skip for now',
              onClick: () => nextAfter('brands_products'),
            })}
          </div>
        )}

        {stepId === 'services' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Services</h2>
            <p className="mt-1 text-sm text-slate-600">Capabilities and services (taxonomy kind <code className="text-xs">capability</code>).</p>
            <div className="mt-5 flex gap-2">
              <input
                value={serviceDraft}
                onChange={(e) => setServiceDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setProfile({ ...profile, capabilities: addTag(profile.capabilities, serviceDraft) });
                    setServiceDraft('');
                  }
                }}
                className={inputCls}
                placeholder="e.g. Cut-to-length, On-site fabrication"
              />
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setProfile({ ...profile, capabilities: addTag(profile.capabilities, serviceDraft) });
                  setServiceDraft('');
                }}
              >
                Add
              </button>
            </div>
            {profile.capabilities.length > 0 && (
              <div className="mt-4">
                <ChipToggle options={profile.capabilities} value={profile.capabilities} onChange={(capabilities) => setProfile({ ...profile, capabilities })} />
              </div>
            )}
            {navFooter(true, {
              label: profile.capabilities.length ? 'Continue' : 'Skip for now',
              onClick: () => nextAfter('services'),
            })}
          </div>
        )}

        {stepId === 'contractor_type' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Contractor type</h2>
            <p className="mt-1 text-sm text-slate-600">Business classification for your contractor / buyer company.</p>
            <div className="mt-5">
              <ChipToggle
                options={CONTRACTOR_CLASSIFICATIONS}
                value={profile.types}
                onChange={(types) => setProfile({ ...profile, types })}
              />
            </div>
            {navFooter(true, {
              onClick: () => {
                if (!profile.types.length) return setError('Choose at least one contractor type.');
                nextAfter('contractor_type');
              },
            })}
          </div>
        )}

        {stepId === 'specializations' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Specializations</h2>
            <p className="mt-1 text-sm text-slate-600">Construction disciplines and specialisms your company carries out.</p>
            <div className="mt-5">
              <ContractorTaxonomyFields value={profile} onChange={setProfile} />
            </div>
            {navFooter(true, {
              onClick: () => {
                if (!profile.categories.length) return setError('Choose at least one construction discipline.');
                nextAfter('specializations');
              },
            })}
          </div>
        )}

        {stepId === 'sectors' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Project sectors</h2>
            <p className="mt-1 text-sm text-slate-600">Markets / sectors you serve (stored as taxonomy <code className="text-xs">market</code>).</p>
            <div className="mt-5">
              <ChipToggle options={MARKET_OPTIONS} value={profile.marketsServed} onChange={(marketsServed) => setProfile({ ...profile, marketsServed })} />
            </div>
            {navFooter(true, {
              onClick: () => {
                if (!profile.marketsServed.length) return setError('Choose at least one project sector or market.');
                nextAfter('sectors');
              },
            })}
          </div>
        )}

        {stepId === 'locations' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Locations</h2>
            <p className="mt-1 text-sm text-slate-600">Emirates / regions you serve (taxonomy <code className="text-xs">region</code>) plus HQ address on the company row.</p>
            <div className="mt-5 space-y-4">
              <TextField label="Business address" value={profile.address} onChange={(address) => setProfile({ ...profile, address })} />
              <div>
                <p className={labelCls}>Regions served</p>
                <ChipToggle options={EMIRATES} value={profile.regionsServed} onChange={(regionsServed) => setProfile({ ...profile, regionsServed })} />
              </div>
              {intent === 'supplier' && (
                <div>
                  <p className={labelCls}>Markets served</p>
                  <ChipToggle options={MARKET_OPTIONS} value={profile.marketsServed} onChange={(marketsServed) => setProfile({ ...profile, marketsServed })} />
                </div>
              )}
            </div>
            {navFooter(true, {
              onClick: () => {
                if (!profile.regionsServed.length && !profile.emirate) {
                  return setError('Add at least one region you serve.');
                }
                if (!profile.regionsServed.length && profile.emirate) {
                  setProfile({ ...profile, regionsServed: [profile.emirate] });
                }
                setError('');
                nextAfter('locations');
              },
            })}
          </div>
        )}

        {stepId === 'verification' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Company verification</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isLive
                ? 'Submit license details for SOKO review. Secure file upload is a follow-up; the company row and taxonomy are saved to Supabase now.'
                : 'Upload your trade license so SOKO can verify your company.'}
            </p>
            <div className="mt-5">
              <LicenseUpload
                profile={profile}
                submitLabel={busy ? 'Creating…' : 'Submit & create workspace'}
                cancelLabel="Skip verification for now"
                onSubmit={(f) => { void register(f); }}
                onCancel={() => { void register(); }}
              />
            </div>
            {busy && (
              <p className="mt-3 text-sm text-slate-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Saving company to SOKO…</p>
            )}
            <button type="button" disabled={busy} onClick={() => backBefore('verification')} className={`${btnSecondary} mt-6`}><ArrowLeft className="w-4 h-4" /> Back</button>
          </div>
        )}

        {stepId === 'complete' && company && (
          <div>
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 text-blue-600 mx-auto" />
              <h2 className="mt-3 text-xl font-semibold text-slate-900">{company.profile.tradingName} is on SOKO</h2>
              <p className="mt-1 text-sm text-slate-600">
                {company.verification.status === 'pending' ? 'Verification is pending SOKO review.' : 'You can submit verification later from Company Profile.'}
                {' '}You are the {company.kind === 'contractor' ? 'Company Admin' : 'Supplier Admin'}. You may still join other companies with separate memberships.
              </p>
            </div>
            <div className="mt-6 grid sm:grid-cols-[auto_1fr] gap-5 items-center rounded-xl border border-slate-200 p-5">
              {shareUrl && <QRCodeSVG value={shareUrl} size={96} className="mx-auto" />}
              <div className="min-w-0">
                <p className="text-xs text-slate-500">SOKO ID</p>
                <p className="text-lg font-semibold text-slate-900 tabular-nums">{company.sokoId || 'Assigned'}</p>
                {shareUrl && (
                  <>
                    <p className="mt-2 text-xs text-slate-500">Public profile link</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-700 truncate">{shareUrl}</p>
                      <button type="button" onClick={() => { navigator.clipboard?.writeText(shareUrl).catch(() => undefined); notify('Profile link copied'); }} className="p-1.5 rounded-md hover:bg-slate-100 cursor-pointer" aria-label="Copy profile link"><Copy className="w-4 h-4 text-slate-500" /></button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-900">Complete your profile</p>
              <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {profileChecklist(company, []).map((c) => (
                  <li key={c.id} className={`flex items-center gap-2 text-sm ${c.done ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center ${c.done ? 'bg-blue-600 text-white' : 'border border-slate-300'}`}>{c.done && <Check className="w-3 h-3" />}</span>
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => onOpenWorkspace(company.id)} className={btnPrimary}>Open company dashboard <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
      {isLive ? (
        <p className="mt-4 text-xs text-slate-500 text-center">Company and membership data are saved under your signed-in Supabase session (RLS). Draft progress is only a local resume aid.</p>
      ) : (
        <div className="mt-4"><DemoNote>Registration, email verification and license review are simulated in this prototype.</DemoNote></div>
      )}
    </div>
  );
};
