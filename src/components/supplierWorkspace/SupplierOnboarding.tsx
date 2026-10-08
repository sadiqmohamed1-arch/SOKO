import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Copy, MailCheck, Search, ShieldAlert, X } from 'lucide-react';
import { BUYER_SUPPLIERS, supplierShareUrl } from '../../data/buyerSuppliers';
import { CompanyProfile, CompanyRecord, ROLE_META, SessionUser, SupplierRole, SupplierStore, SUPPLIER_ROLES } from '../../data/supplierTypes';
import { findDuplicateCompanies, profileChecklist, searchCompanies } from '../../data/supplierStore';
import { registerCompany, requestAccess } from '../../data/supplierService';
import { btnPrimary, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { ChipToggle, DemoNote } from '../marketHub/MarketHubShared';
import { CompanyInfoFields, SUPPLIER_TYPE_OPTIONS, TaxonomyFields } from './ProfileEditors';
import { LicenseUpload } from './VerificationUpload';

const STEPS = ['Account', 'Company', 'Details', 'Categories', 'Verification', 'Complete'];

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
};

export const SupplierOnboarding: React.FC<Props> = ({ store, user, onStoreChange, onOpenWorkspace, onCancel, notify }) => {
  const [step, setStep] = useState(0);
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string; managed: boolean } | null>(null);
  const [role, setRole] = useState<SupplierRole>('sales_rep');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<'requested' | 'claimed' | null>(null);
  const [profile, setProfile] = useState<CompanyProfile>(blankProfile);
  const [error, setError] = useState('');
  const [company, setCompany] = useState<CompanyRecord | null>(null);

  const results = searchCompanies(store, q);
  const duplicates = profile.tradingName || profile.licenseNo ? findDuplicateCompanies(store, profile.tradingName || profile.legalName, profile.licenseNo) : [];

  const sendRequest = () => {
    if (!selected) return;
    const r = requestAccess(store, user, selected.id, role, note);
    if (!r.ok) return setError(r.error);
    onStoreChange(r.store);
    setOutcome('requested');
    notify(`Access request sent to ${selected.name}`);
  };

  const detailsNext = () => {
    if (!profile.legalName.trim() || !profile.tradingName.trim() || !profile.licenseNo.trim()) return setError('Legal name, trading name and trade license number are required.');
    if (!profile.types.length) return setError('Choose at least one supplier type.');
    if (duplicates.length) return setError('This company already appears to exist on SOKO.');
    setError('');
    setStep(3);
  };

  const register = (licenseFile?: { name: string; sizeMb: number }) => {
    const r = registerCompany(store, user, { profile, licenseFile });
    if (!r.ok) return setError(r.error);
    setError('');
    onStoreChange(r.store);
    setCompany(r.value);
    setStep(5);
  };

  const directory = company ? BUYER_SUPPLIERS.find((s) => s.id === company.id) : undefined;
  const shareUrl = directory ? supplierShareUrl(directory) : '';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a702f]">Supplier onboarding</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 leading-tight">Set up your supplier company on SOKO</h1>
        </div>
        {step < 5 && (
          <button type="button" onClick={onCancel} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Close onboarding"><X className="w-5 h-5" /></button>
        )}
      </div>

      <ol className="flex items-center gap-1 mb-8" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <p className={`mt-1.5 text-[11px] font-medium hidden sm:block ${i === step ? 'text-slate-900' : 'text-slate-400'}`}>{i + 1}. {s}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {error && <p role="alert" className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your SOKO account</h2>
            <p className="mt-1 text-sm text-slate-600">Company workspaces are linked to your one personal SOKO account. You never need a second login.</p>
            <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email} · {user.title}</p>
            </div>
            <div className="mt-4">
              {verified ? (
                <p className="text-sm font-medium text-emerald-700 flex items-center gap-1.5"><MailCheck className="w-4 h-4" /> Email verified</p>
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
            <div className="mt-8 flex justify-end">
              <button type="button" disabled={!verified} onClick={() => setStep(1)} className={btnPrimary}>Continue <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {step === 1 && !outcome && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Find your company</h2>
            <p className="mt-1 text-sm text-slate-600">Check whether your company is already on SOKO before registering it.</p>
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
            {q.trim().length >= 2 && results.length === 0 && <p className="mt-3 text-sm text-slate-500">No matching company on SOKO.</p>}

            {selected && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {selected.managed ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900">Request access to {selected.name}</p>
                    <p className="mt-1 text-xs text-slate-600">A Supplier Admin of this company must approve your request. Admin rights are never granted automatically.</p>
                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                      <label className="block">
                        <span className={labelCls}>Requested role</span>
                        <select value={role} onChange={(e) => setRole(e.target.value as SupplierRole)} className={inputCls}>
                          {SUPPLIER_ROLES.filter((r) => r !== 'supplier_admin').map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className={labelCls}>Note to admin (optional)</span>
                        <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="e.g. I joined the sales team in May" />
                      </label>
                    </div>
                    <button type="button" onClick={sendRequest} className={`${btnPrimary} mt-3`}>Send access request</button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-900">Claim {selected.name}</p>
                    <p className="mt-1 text-xs text-slate-600">SOKO will check your authority against the company's trade license before handing over control of this listing.</p>
                    <button type="button" onClick={() => { setOutcome('claimed'); notify('Claim submitted for SOKO review (simulated)'); }} className={`${btnPrimary} mt-3`}>Submit claim for review</button>
                  </>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3">
              <button type="button" onClick={() => setStep(0)} className={btnSecondary}><ArrowLeft className="w-4 h-4" /> Back</button>
              <button type="button" onClick={() => { setProfile({ ...blankProfile(), tradingName: q.trim(), legalName: q.trim() }); setError(''); setStep(2); }} className={btnPrimary}>
                My company isn't listed — register it <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 1 && outcome && (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-blue-600 mx-auto" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">{outcome === 'requested' ? 'Access request sent' : 'Claim submitted'}</h2>
            <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
              {outcome === 'requested'
                ? `An admin at ${selected?.name} will review your request. The workspace appears in your switcher once approved.`
                : `SOKO will review your claim for ${selected?.name}. You'll be notified when it's approved.`}
            </p>
            <button type="button" onClick={onCancel} className={`${btnPrimary} mt-6`}>Back to my workspace</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Company details</h2>
            <p className="mt-1 text-sm text-slate-600">Use the details exactly as they appear on your trade license.</p>
            <div className="mt-5"><CompanyInfoFields value={profile} onChange={setProfile} /></div>
            <div className="mt-4">
              <p className={labelCls}>Supplier type</p>
              <ChipToggle options={SUPPLIER_TYPE_OPTIONS} value={profile.types} onChange={(types) => setProfile({ ...profile, types })} />
            </div>
            <label className="block mt-4">
              <span className={labelCls}>Company description</span>
              <textarea rows={3} value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })} className={inputCls} placeholder="What you supply, where, and what makes you different" />
            </label>
            {duplicates.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Possible duplicate company</p>
                <ul className="mt-1 text-sm text-amber-900 space-y-0.5">
                  {duplicates.map((d) => <li key={d.id}>{d.name} — {d.reason}</li>)}
                </ul>
                <button type="button" onClick={() => { setQ(duplicates[0].name); setError(''); setStep(1); }} className="mt-2 text-sm font-semibold text-amber-900 underline cursor-pointer">Find it and request access instead</button>
              </div>
            )}
            <div className="mt-8 flex justify-between">
              <button type="button" onClick={() => { setError(''); setStep(1); }} className={btnSecondary}><ArrowLeft className="w-4 h-4" /> Back</button>
              <button type="button" onClick={detailsNext} className={btnPrimary}>Continue <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Trade categories</h2>
            <p className="mt-1 text-sm text-slate-600">Buyers and Market Hub opportunities are matched to these categories.</p>
            <div className="mt-5"><TaxonomyFields value={profile} onChange={setProfile} hideTypes /></div>
            <div className="mt-8 flex justify-between">
              <button type="button" onClick={() => setStep(2)} className={btnSecondary}><ArrowLeft className="w-4 h-4" /> Back</button>
              <button type="button" onClick={() => (profile.categories.length ? (setError(''), setStep(4)) : setError('Choose at least one trade category.'))} className={btnPrimary}>Continue <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Company verification</h2>
            <p className="mt-1 text-sm text-slate-600">Upload your trade license so SOKO can verify your company. Verification is free and independent of your plan.</p>
            <div className="mt-5">
              <LicenseUpload profile={profile} submitLabel="Submit & create workspace" cancelLabel="Skip for now" onSubmit={(f) => register(f)} onCancel={() => register()} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Skipping creates the workspace without verification; you can upload later from Company Profile.</p>
            <button type="button" onClick={() => setStep(3)} className={`${btnSecondary} mt-6`}><ArrowLeft className="w-4 h-4" /> Back</button>
          </div>
        )}

        {step === 5 && company && (
          <div>
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 text-blue-600 mx-auto" />
              <h2 className="mt-3 text-xl font-semibold text-slate-900">{company.profile.tradingName} is on SOKO</h2>
              <p className="mt-1 text-sm text-slate-600">
                {company.verification.status === 'pending' ? 'Verification is pending SOKO review.' : 'Upload your trade license any time to get verified.'} You are the Supplier Admin on Supplier Free.
              </p>
            </div>
            <div className="mt-6 grid sm:grid-cols-[auto_1fr] gap-5 items-center rounded-xl border border-slate-200 p-5">
              {shareUrl && <QRCodeSVG value={shareUrl} size={96} className="mx-auto" />}
              <div className="min-w-0">
                <p className="text-xs text-slate-500">SOKO Supplier ID</p>
                <p className="text-lg font-semibold text-slate-900 tabular-nums">{company.sokoId}</p>
                <p className="mt-2 text-xs text-slate-500">Public profile link</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-700 truncate">{shareUrl}</p>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(shareUrl).catch(() => undefined); notify('Profile link copied'); }} className="p-1.5 rounded-md hover:bg-slate-100 cursor-pointer" aria-label="Copy profile link"><Copy className="w-4 h-4 text-slate-500" /></button>
                </div>
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
              <button type="button" onClick={() => onOpenWorkspace(company.id)} className={btnPrimary}>Open supplier dashboard <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4"><DemoNote>Registration, email verification and license review are simulated in this prototype.</DemoNote></div>
    </div>
  );
};
