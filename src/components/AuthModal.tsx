import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, HardHat, Loader2, Truck, User, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AuthIntent = 'personal' | 'join' | 'supplier' | 'contractor';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess?: (intent: AuthIntent) => void;
}

type View = 'login' | 'signup' | 'choose' | 'forgot';

const CHOICES: { intent: AuthIntent; icon: React.ElementType; title: string; body: string }[] = [
  { intent: 'personal', icon: User, title: 'Continue with my personal workspace', body: 'Network, keep your digital business card and explore the marketplace. You can add a company any time.' },
  { intent: 'join', icon: UserPlus, title: 'Join an existing company', body: 'Find your company on SOKO and request access. A company admin approves every request.' },
  { intent: 'supplier', icon: Truck, title: 'Register a supplier company', body: 'List your products and services and respond to contractor RFQs.' },
  { intent: 'contractor', icon: HardHat, title: 'Register a contractor or developer company', body: 'Source materials, run RFQs and manage approved suppliers for your projects.' },
];

const SIGNUP_STEPS = ['Account', 'Get Started'] as const;

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
        Once connected, you&apos;ll be able to import your name and photo from LinkedIn and review them before finishing sign-up.
      </p>
    )}
    <div className="flex items-center gap-3 text-xs text-soko-muted">
      <span className="h-px flex-1 bg-soko-line" />or use email<span className="h-px flex-1 bg-soko-line" />
    </div>
  </div>
);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', onSuccess }) => {
  const { login, register } = useAuth();
  const [view, setView] = useState<View>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setView(initialMode);
    setErrors({});
    setFormError('');
    setPassword('');
    setShowPassword(false);
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('input, button[data-autofocus]')?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [isOpen, view]);

  if (!isOpen) return null;

  const switchView = (next: View) => { setView(next); setErrors({}); setFormError(''); };

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter your full name.';
    if (!isEmail(email)) next.email = 'Enter a valid email address.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (username && !USERNAME_RE.test(username)) next.username = 'Use 3–30 lowercase letters, numbers, dots or underscores.';
    if (!acceptedTerms) next.terms = 'Please accept the terms to continue.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setSubmitting(true);
    const r = (await register({ name: name.trim(), email: email.trim(), password })) as { success: boolean; message?: string; errors?: Record<string, string> };
    setSubmitting(false);
    if (!r.success) {
      if (r.errors) setErrors(r.errors);
      return setFormError(r.message || 'We could not create your account. Please try again.');
    }
    setFirstName(name.trim().split(/\s+/)[0]);
    setPassword('');
    switchView('choose');
  };

  const choose = (intent: AuthIntent) => { onSuccess?.(intent); onClose(); };

  const fieldError = (key: string) =>
    errors[key] ? <p id={`${titleId}-${key}-err`} className="mt-1.5 text-xs text-red-600">{errors[key]}</p> : null;

  const passwordField = (autoComplete: string, hint?: string) => (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={`${titleId}-password`} className="text-sm font-medium text-soko-ink">Password</label>
        {view === 'login' && <button type="button" onClick={() => switchView('forgot')} className="text-xs font-medium text-soko-blue hover:underline cursor-pointer">Forgot password?</button>}
      </div>
      <div className="relative">
        <input
          id={`${titleId}-password`}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? `${titleId}-password-err` : undefined}
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

  const emailField = (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={`${titleId}-email`} className="text-sm font-medium text-soko-ink">{view === 'signup' ? 'Professional or company email' : 'Email'}</label>
        {view === 'signup' && <span className="rounded bg-soko-mist px-1.5 py-0.5 text-[10px] font-medium text-soko-muted">Not verified</span>}
      </div>
      <input
        id={`${titleId}-email`}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        placeholder="you@example.com"
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? `${titleId}-email-err` : undefined}
        className={inputCls}
      />
      {errors.email ? fieldError('email') : view === 'signup' ? (
        <p className="mt-1.5 text-xs text-soko-muted">Company email verification is coming soon. Companies will be able to invite you through a verified work email.</p>
      ) : null}
    </div>
  );

  const usernameField = (
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
          autoComplete="username"
          placeholder="ahmed.khan"
          maxLength={30}
          aria-invalid={!!errors.username}
          aria-describedby={`${titleId}-username-help`}
          className={`${inputCls} pl-8`}
        />
      </div>
      <p id={`${titleId}-username-help`} className={`mt-1.5 text-xs ${errors.username ? 'text-red-600' : 'text-soko-muted'}`}>
        {errors.username ||
          (username && USERNAME_RE.test(username)
            ? `Format looks good. Availability can’t be checked yet, so @${username} isn’t reserved — you’ll claim your username when usernames launch.`
            : 'Your unique handle, like @ahmed.khan. Username reservation and availability checks are coming soon.')}
      </p>
    </div>
  );

  const heading: Record<View, { title: string; sub: string }> = {
    login: { title: 'Sign in to SOKO', sub: 'Welcome back to the construction network.' },
    signup: { title: 'Create your SOKO account', sub: 'Your account is personal. Add or join a company in the next step.' },
    choose: { title: firstName ? `Welcome, ${firstName}` : 'Welcome to SOKO', sub: 'How would you like to start? You can change this later.' },
    forgot: { title: 'Reset your password', sub: 'Password resets are handled by the SOKO team for now.' },
  };

  return (
    <div className="fixed inset-0 z-[100] isolate flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-soko-ink/60 backdrop-blur-sm" onMouseDown={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative max-h-[100dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl ${view === 'choose' ? 'sm:max-w-xl' : 'sm:max-w-md'}`}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-2 text-soko-muted transition hover:bg-soko-mist hover:text-soko-ink cursor-pointer">
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-6 px-6 pb-7 pt-7 sm:px-8">
          <div className="flex flex-col gap-4">
            <img src="/soko-lockup.png" alt="SOKO" width={720} height={156} className="h-7 w-auto self-start" draggable={false} />
            {view === 'signup' || view === 'choose' ? (
              <ol className="flex items-center gap-3 text-sm font-medium" aria-label={`Sign-up progress, step ${view === 'signup' ? 1 : 2} of 2`}>
                {SIGNUP_STEPS.map((label, i) => {
                  const current = (view === 'signup' ? 0 : 1) === i;
                  const done = view === 'choose' && i === 0;
                  return (
                    <React.Fragment key={label}>
                      {i > 0 && <li aria-hidden="true" className={`h-0.5 w-10 rounded-full ${view === 'choose' ? 'bg-soko-blue' : 'bg-soko-line'}`} />}
                      <li className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            done
                              ? 'bg-soko-blue text-white'
                              : current
                                ? 'bg-soko-blue text-white ring-4 ring-soko-blue/15'
                                : 'border border-soko-line bg-white text-soko-muted'
                          }`}
                        >
                          {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                        </span>
                        <span className={current || done ? 'text-soko-ink' : 'text-soko-muted'}>
                          {label}
                          {done && <span className="sr-only"> (completed)</span>}
                        </span>
                      </li>
                    </React.Fragment>
                  );
                })}
              </ol>
            ) : null}
            <div>
              <h2 id={titleId} className="text-xl font-semibold tracking-tight text-soko-ink text-balance">{heading[view].title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-soko-muted text-pretty">{heading[view].sub}</p>
            </div>
          </div>

          {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</p>}

          {view === 'login' && (
            <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
              <LinkedInOption mode="login" />
              {emailField}
              {passwordField('current-password')}
              <button type="submit" disabled={submitting} className={`${primaryBtn} mt-1`}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in</> : 'Sign in'}
              </button>
              <p className="text-center text-sm text-soko-muted">
                New to SOKO? <button type="button" onClick={() => switchView('signup')} className={linkBtn}>Create an account</button>
              </p>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={handleSignup} noValidate className="flex flex-col gap-4">
              <LinkedInOption mode="signup" />
              <div>
                <label htmlFor={`${titleId}-name`} className={labelCls}>Full name</label>
                <input
                  id={`${titleId}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Ahmed Al Mansoori"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? `${titleId}-name-err` : undefined}
                  className={inputCls}
                />
                {fieldError('name')}
              </div>
              {usernameField}
              {emailField}
              {passwordField('new-password', 'At least 8 characters.')}
              <p className="rounded-lg bg-soko-mist px-3.5 py-2.5 text-xs leading-relaxed text-soko-muted">
                This is your personal SOKO identity, with a permanent Personal ID that stays yours. Companies can invite you, but you choose whether to join, and you can belong to more than one company.
              </p>
              <div>
                <label className="flex items-start gap-2.5 text-sm leading-relaxed text-soko-muted">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    aria-invalid={!!errors.terms}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-soko-line accent-soko-blue"
                  />
                  <span>I agree to the SOKO Terms of Service and Privacy Policy.</span>
                </label>
                {fieldError('terms')}
              </div>
              <button type="submit" disabled={submitting} className={`${primaryBtn} mt-1`}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account</> : <>Create account <ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="text-center text-sm text-soko-muted">
                Already have an account? <button type="button" onClick={() => switchView('login')} className={linkBtn}>Sign in</button>
              </p>
            </form>
          )}

          {view === 'choose' && (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col gap-2.5">
                {CHOICES.map(({ intent, icon: Icon, title, body }, i) => (
                  <li key={intent}>
                    <button
                      type="button"
                      data-autofocus={i === 0 ? '' : undefined}
                      onClick={() => choose(intent)}
                      className="group flex w-full items-start gap-3.5 rounded-xl border border-soko-line bg-white p-4 text-left transition hover:border-soko-blue hover:bg-soko-mist focus-visible:border-soko-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soko-blue/20 cursor-pointer"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soko-mist text-soko-blue transition group-hover:bg-white">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-soko-ink">{title}</span>
                        <span className="text-sm leading-relaxed text-soko-muted">{body}</span>
                      </span>
                      <ArrowRight className="mt-2.5 h-4 w-4 shrink-0 text-soko-muted transition group-hover:translate-x-0.5 group-hover:text-soko-blue" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-1.5 text-xs leading-relaxed text-soko-muted">
                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                New companies are reviewed by SOKO before they receive a Verified badge.
              </p>
            </div>
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
