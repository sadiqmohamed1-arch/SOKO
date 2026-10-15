import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, HardHat, Loader2, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ORG_CLASSIFICATIONS,
  PROFESSIONAL_CLASSIFICATIONS,
  companyKindForOrgClassification,
  orgClassificationTaxonomyValue,
  saveOrgBootstrap,
  saveProfessionalRole,
  type OrgClassification,
  type ProfessionalClassification,
} from '../data/registrationIdentity';
import { bootstrapOrganization } from '../lib/companyOnboarding';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export type AuthIntent = 'personal' | 'join' | 'supplier' | 'contractor';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess?: (intent: AuthIntent) => void;
}

type View = 'login' | 'path' | 'signup_org' | 'signup_indiv' | 'forgot';
type RegPath = 'organization' | 'individual';

const EMIRATE_OPTIONS = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Al Ain', 'Fujairah', 'Umm Al Quwain', 'Other'];

const inputCls =
  'w-full rounded-lg border border-soko-line bg-white px-3.5 py-2.5 text-sm text-soko-ink placeholder:text-soko-muted/70 outline-none transition focus:border-soko-blue focus:ring-2 focus:ring-soko-blue/20 aria-[invalid=true]:border-red-500';
const labelCls = 'mb-1.5 block text-sm font-medium text-soko-ink';
const primaryBtn =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-soko-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-soko-blue/90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer';
const linkBtn = 'font-semibold text-soko-blue hover:underline cursor-pointer';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$/;

const LinkedInMark: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
  </svg>
);

const LinkedInOption: React.FC<{ mode: 'login' | 'signup' }> = ({ mode }) => (
  <div className="flex flex-col gap-3">
    <div
      role="img"
      aria-label={`${mode === 'login' ? 'Sign in' : 'Continue'} with LinkedIn — coming soon, not yet available`}
      className="relative flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-soko-line bg-soko-mist px-4 py-2.5 text-sm font-semibold text-soko-muted"
    >
      <LinkedInMark />
      Continue with LinkedIn
      <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-soko-muted">Coming soon</span>
    </div>
    {mode === 'signup' && (
      <p className="-mt-1 text-xs leading-relaxed text-soko-muted">
        LinkedIn will sign you into your personal SOKO identity. Organization memberships stay separate and authorized.
      </p>
    )}
    <div className="flex items-center gap-3 text-xs text-soko-muted">
      <span className="h-px flex-1 bg-soko-line" />or use email<span className="h-px flex-1 bg-soko-line" />
    </div>
  </div>
);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', onSuccess }) => {
  const { login, register, refreshAccess } = useAuth();
  const [view, setView] = useState<View>(initialMode === 'signup' ? 'path' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orgClass, setOrgClass] = useState<OrgClassification>('Supplier / Manufacturer');
  const [companyName, setCompanyName] = useState('');
  const [emirate, setEmirate] = useState('Dubai');
  const [activity, setActivity] = useState('');
  const [proRole, setProRole] = useState<ProfessionalClassification>('Sales / Business Development');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setView(initialMode === 'signup' ? 'path' : 'login');
    setErrors({});
    setFormError('');
    setPassword('');
    setShowPassword(false);
    setAcceptedTerms(false);
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('input, button[data-autofocus], select')?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [isOpen, view]);

  if (!isOpen) return null;

  const switchView = (next: View) => {
    setView(next);
    setErrors({});
    setFormError('');
  };

  const pickPath = (path: RegPath) => {
    switchView(path === 'organization' ? 'signup_org' : 'signup_indiv');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setSubmitting(true);
    const r = await login({ email: email.trim(), password });
    setSubmitting(false);
    if (!r.success) return setFormError(r.message || 'Email or password is incorrect.');
    onSuccess?.('personal');
    onClose();
  };

  const handleOrgSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (companyName.trim().length < 2) next.companyName = 'Enter the registered company name.';
    if (!orgClass) next.orgClass = 'Select an organization type.';
    if (name.trim().length < 2) next.name = 'Enter the authorized representative’s full name.';
    if (!isEmail(email)) next.email = 'Enter a valid business email.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (!acceptedTerms) next.terms = 'Please accept the terms to continue.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setSubmitting(true);
    const r = await register({ name: name.trim(), email: email.trim(), password, title: 'Authorized representative' });
    if (!r.success) {
      setSubmitting(false);
      return setFormError(r.message || 'We could not create the representative account.');
    }

    const kind = companyKindForOrgClassification(orgClass);
    let companyId: string | null = null;
    if (isSupabaseConfigured) {
      const boot = await bootstrapOrganization({
        kind,
        legalName: companyName.trim(),
        tradingName: companyName.trim(),
        orgClassificationLabel: orgClassificationTaxonomyValue(orgClass),
        emirate,
        generalEmail: email.trim(),
        description: activity.trim(),
      });
      if (!boot.ok) {
        setSubmitting(false);
        setFormError(
          `${boot.error} Your personal account was created — open company onboarding to finish registering the organization.`,
        );
        saveOrgBootstrap({
          companyId: null,
          classification: orgClass,
          legalName: companyName.trim(),
          tradingName: companyName.trim(),
          emirate,
          countryLabel: 'United Arab Emirates',
          generalEmail: email.trim(),
          description: activity.trim(),
          representativeName: name.trim(),
          kind,
        });
        await refreshAccess();
        onSuccess?.(kind === 'contractor' ? 'contractor' : 'supplier');
        onClose();
        return;
      }
      companyId = boot.value.companyId;
      await refreshAccess();
    }

    saveOrgBootstrap({
      companyId,
      classification: orgClass,
      legalName: companyName.trim(),
      tradingName: companyName.trim(),
      emirate,
      countryLabel: 'United Arab Emirates',
      generalEmail: email.trim(),
      description: activity.trim(),
      representativeName: name.trim(),
      kind,
    });
    setSubmitting(false);
    onSuccess?.(kind === 'contractor' ? 'contractor' : 'supplier');
    onClose();
  };

  const handleIndivSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter your full name.';
    if (!isEmail(email)) next.email = 'Enter a valid email address.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (username && !USERNAME_RE.test(username)) next.username = 'Use 3–30 lowercase letters, numbers, dots or underscores.';
    if (!proRole) next.proRole = 'Select your primary professional role.';
    if (!acceptedTerms) next.terms = 'Please accept the terms to continue.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setSubmitting(true);
    const r = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      title: proRole,
    });
    setSubmitting(false);
    if (!r.success) return setFormError(r.message || 'We could not create your account.');
    saveProfessionalRole(proRole);
    onSuccess?.('personal');
    onClose();
  };

  const fieldError = (key: string) =>
    errors[key] ? <p id={`${titleId}-${key}-err`} className="mt-1.5 text-xs text-red-600">{errors[key]}</p> : null;

  const passwordField = (autoComplete: string, hint?: string) => (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={`${titleId}-password`} className="text-sm font-medium text-soko-ink">Password</label>
        {view === 'login' && (
          <button type="button" onClick={() => switchView('forgot')} className="text-xs font-medium text-soko-blue hover:underline cursor-pointer">
            Forgot password?
          </button>
        )}
      </div>
      <div className="relative">
        <input
          id={`${titleId}-password`}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!errors.password}
          className={`${inputCls} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-soko-muted hover:text-soko-ink cursor-pointer"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {errors.password ? fieldError('password') : hint ? <p className="mt-1.5 text-xs text-soko-muted">{hint}</p> : null}
    </div>
  );

  const emailField = (label: string) => (
    <div>
      <label htmlFor={`${titleId}-email`} className={labelCls}>{label}</label>
      <input
        id={`${titleId}-email`}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        placeholder="you@company.com"
        aria-invalid={!!errors.email}
        className={inputCls}
      />
      {fieldError('email')}
    </div>
  );

  const termsField = (
    <div>
      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-soko-muted">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-soko-line accent-soko-blue"
        />
        <span>I agree to the SOKO Terms of Service and Privacy Policy.</span>
      </label>
      {fieldError('terms')}
    </div>
  );

  const heading: Record<View, { title: string; sub: string }> = {
    login: { title: 'Sign in to SOKO', sub: 'Welcome back to the construction network.' },
    path: {
      title: 'Create your SOKO account',
      sub: 'Choose an organization identity or an independent professional identity. They stay separate — one person can belong to many companies.',
    },
    signup_org: {
      title: 'Register an organization',
      sub: 'Creates a permanent company identity on SOKO, plus an authorized representative account that administers it.',
    },
    signup_indiv: {
      title: 'Register as an individual',
      sub: 'Creates your portable professional identity. Join companies later without losing your personal profile or connections.',
    },
    forgot: { title: 'Reset your password', sub: 'Password resets are handled by the SOKO team for now.' },
  };

  const wide = view === 'path' || view === 'signup_org';

  return (
    <div className="fixed inset-0 z-[100] isolate flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-soko-ink/60 backdrop-blur-sm" onMouseDown={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative max-h-[100dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'}`}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-2 text-soko-muted transition hover:bg-soko-mist hover:text-soko-ink cursor-pointer">
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-6 px-6 pb-7 pt-7 sm:px-8">
          <div className="flex flex-col gap-4">
            <img src="/soko-lockup.png" alt="SOKO" width={720} height={156} className="h-7 w-auto self-start" draggable={false} />
            <div>
              <h2 id={titleId} className="text-xl font-semibold tracking-tight text-soko-ink text-balance">{heading[view].title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-soko-muted text-pretty">{heading[view].sub}</p>
            </div>
          </div>

          {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</p>}

          {view === 'login' && (
            <form onSubmit={(e) => void handleLogin(e)} noValidate className="flex flex-col gap-4">
              <LinkedInOption mode="login" />
              {emailField('Email')}
              {passwordField('current-password')}
              <button type="submit" disabled={submitting} className={`${primaryBtn} mt-1`}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in</> : 'Sign in'}
              </button>
              <p className="text-center text-sm text-soko-muted">
                New to SOKO? <button type="button" onClick={() => switchView('path')} className={linkBtn}>Create an account</button>
              </p>
            </form>
          )}

          {view === 'path' && (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col gap-2.5">
                <li>
                  <button
                    type="button"
                    data-autofocus=""
                    onClick={() => pickPath('organization')}
                    className="group flex w-full items-start gap-3.5 rounded-xl border border-soko-line bg-white p-4 text-left transition hover:border-soko-blue hover:bg-soko-mist cursor-pointer"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soko-mist text-soko-blue">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-soko-ink">Register an Organization</span>
                      <span className="text-sm leading-relaxed text-soko-muted">
                        Permanent company identity with its own SOKO ID. Products, certifications and company records stay with the organization — independent of any employee.
                      </span>
                    </span>
                    <ArrowRight className="mt-2.5 h-4 w-4 shrink-0 text-soko-muted group-hover:text-soko-blue" aria-hidden="true" />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => pickPath('individual')}
                    className="group flex w-full items-start gap-3.5 rounded-xl border border-soko-line bg-white p-4 text-left transition hover:border-soko-blue hover:bg-soko-mist cursor-pointer"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soko-mist text-soko-blue">
                      <User className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-soko-ink">Register as an Individual</span>
                      <span className="text-sm leading-relaxed text-soko-muted">
                        Portable professional identity. Join existing companies, create one later, or continue independently. Your personal role stays separate from company type.
                      </span>
                    </span>
                    <ArrowRight className="mt-2.5 h-4 w-4 shrink-0 text-soko-muted group-hover:text-soko-blue" aria-hidden="true" />
                  </button>
                </li>
              </ul>
              <p className="text-center text-sm text-soko-muted">
                Already have an account? <button type="button" onClick={() => switchView('login')} className={linkBtn}>Sign in</button>
              </p>
            </div>
          )}

          {view === 'signup_org' && (
            <form onSubmit={(e) => void handleOrgSignup(e)} noValidate className="flex flex-col gap-4">
              <LinkedInOption mode="signup" />
              <div>
                <label htmlFor={`${titleId}-company`} className={labelCls}>Registered company name</label>
                <input id={`${titleId}-company`} value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} placeholder="As on the trade license" aria-invalid={!!errors.companyName} />
                {fieldError('companyName')}
              </div>
              <div>
                <label htmlFor={`${titleId}-orgclass`} className={labelCls}>Organization type</label>
                <select id={`${titleId}-orgclass`} value={orgClass} onChange={(e) => setOrgClass(e.target.value as OrgClassification)} className={inputCls}>
                  {ORG_CLASSIFICATIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-soko-muted">Primary classification now. Additional activities can be added after setup. Maps to SOKO workspace kind (supplier or contractor) until extended kinds are approved.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Country</label>
                  <input value="United Arab Emirates" readOnly className={`${inputCls} bg-soko-mist`} />
                </div>
                <div>
                  <label htmlFor={`${titleId}-emirate`} className={labelCls}>City / Emirate</label>
                  <select id={`${titleId}-emirate`} value={emirate} onChange={(e) => setEmirate(e.target.value)} className={inputCls}>
                    {EMIRATE_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor={`${titleId}-activity`} className={labelCls}>Basic business activity <span className="font-normal text-soko-muted">(optional)</span></label>
                <textarea id={`${titleId}-activity`} rows={2} value={activity} onChange={(e) => setActivity(e.target.value)} className={inputCls} placeholder="What the organization does" />
              </div>
              <div className="rounded-xl border border-soko-line bg-soko-mist/60 p-3.5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-soko-muted">Authorized representative</p>
                <div>
                  <label htmlFor={`${titleId}-name`} className={labelCls}>Full name</label>
                  <input id={`${titleId}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputCls} aria-invalid={!!errors.name} />
                  {fieldError('name')}
                </div>
                {emailField('Business email')}
                {passwordField('new-password', 'At least 8 characters. This signs in the representative’s personal SOKO account.')}
              </div>
              <p className="rounded-lg bg-soko-mist px-3.5 py-2.5 text-xs leading-relaxed text-soko-muted flex gap-2">
                <HardHat className="h-4 w-4 shrink-0 text-soko-blue mt-0.5" aria-hidden="true" />
                <span>The organization receives its own SOKO company ID. The representative becomes Company Admin. Trade license, products and certifications are collected next — company data stays with the organization if the representative leaves.</span>
              </p>
              {termsField}
              <button type="submit" disabled={submitting} className={`${primaryBtn} mt-1`}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating organization</> : <>Create organization <ArrowRight className="h-4 w-4" /></>}
              </button>
              <button type="button" onClick={() => switchView('path')} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-soko-blue hover:underline cursor-pointer">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </form>
          )}

          {view === 'signup_indiv' && (
            <form onSubmit={(e) => void handleIndivSignup(e)} noValidate className="flex flex-col gap-4">
              <LinkedInOption mode="signup" />
              <div>
                <label htmlFor={`${titleId}-name`} className={labelCls}>Full name</label>
                <input id={`${titleId}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputCls} aria-invalid={!!errors.name} />
                {fieldError('name')}
              </div>
              {emailField('Email')}
              {passwordField('new-password', 'At least 8 characters.')}
              <div>
                <label htmlFor={`${titleId}-prorole`} className={labelCls}>Primary professional role</label>
                <select id={`${titleId}-prorole`} value={proRole} onChange={(e) => setProRole(e.target.value as ProfessionalClassification)} className={inputCls}>
                  {PROFESSIONAL_CLASSIFICATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="mt-1.5 text-xs text-soko-muted">Independent of any company type. Editable later without creating a new account.</p>
                {fieldError('proRole')}
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor={`${titleId}-username`} className="text-sm font-medium text-soko-ink">
                    SOKO username <span className="font-normal text-soko-muted">(optional)</span>
                  </label>
                  <span className="rounded bg-soko-mist px-1.5 py-0.5 text-[10px] font-medium text-soko-muted">Preview</span>
                </div>
                <div className="relative">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-soko-muted">@</span>
                  <input
                    id={`${titleId}-username`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    maxLength={30}
                    className={`${inputCls} pl-8`}
                    placeholder="ahmed.khan"
                  />
                </div>
                {fieldError('username') || (
                  <p className="mt-1.5 text-xs text-soko-muted">Username reservation needs an approved profiles column — not stored yet.</p>
                )}
              </div>
              <p className="rounded-lg bg-soko-mist px-3.5 py-2.5 text-xs leading-relaxed text-soko-muted">
                After signup you can join an existing organization, create one later, or continue independently. Multiple authorized memberships are supported.
              </p>
              {termsField}
              <button type="submit" disabled={submitting} className={`${primaryBtn} mt-1`}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account</> : <>Create account <ArrowRight className="h-4 w-4" /></>}
              </button>
              <button type="button" onClick={() => switchView('path')} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-soko-blue hover:underline cursor-pointer">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <div className="flex flex-col gap-4">
              <p className="rounded-lg bg-soko-mist px-4 py-3 text-sm leading-relaxed text-soko-ink">
                Self-service password reset is coming soon. Email{' '}
                <a href="mailto:support@soko.ae" className="font-semibold text-soko-blue hover:underline">support@soko.ae</a>{' '}
                from your account email and we will help you regain access.
              </p>
              <button type="button" data-autofocus="" onClick={() => switchView('login')} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-soko-blue hover:underline cursor-pointer">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
