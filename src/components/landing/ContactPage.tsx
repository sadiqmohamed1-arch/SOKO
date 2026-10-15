import React, { useId, useState } from 'react';
import { ArrowLeft, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { CONTACT_SUBMISSIONS_ENABLED } from '../../lib/contactSubmissions';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';

const USER_TYPES = ['Supplier', 'Buyer', 'Contractor', 'Other'];
const CATEGORIES = ['General Inquiry', 'Supplier Support', 'Buyer Support', 'Contractor Support', 'Partnership', 'Technical Support', 'Other'];

// Stays false until staging sets VITE_CONTACT_SUBMISSIONS_ENABLED=true after the backend is verified.
const SUBMISSIONS_ENABLED = CONTACT_SUBMISSIONS_ENABLED;

type Field = 'fullName' | 'company' | 'email' | 'phone' | 'userType' | 'category' | 'subject' | 'message';
type Values = Record<Field, string>;
type Status = 'idle' | 'submitting' | 'sent' | 'error';

const EMPTY: Values = { fullName: '', company: '', email: '', phone: '', userType: '', category: '', subject: '', message: '' };

const validate = (v: Values) => {
  const e: Partial<Record<Field, string>> = {};
  if (v.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Enter a valid email address.';
  if (v.phone.trim() && !/^\+?[\d\s()-]{7,20}$/.test(v.phone.trim())) e.phone = 'Enter a valid phone number, or leave it blank.';
  if (!v.userType) e.userType = 'Select the option that describes you.';
  if (!v.category) e.category = 'Select an inquiry category.';
  if (v.subject.trim().length < 3) e.subject = 'Enter a subject.';
  if (v.message.trim().length < 10) e.message = 'Tell us a little more (at least 10 characters).';
  return e;
};

const inputCls =
  'w-full rounded-lg border border-soko-line bg-white px-3.5 py-2.5 text-sm text-soko-ink placeholder:text-soko-muted/70 outline-none transition focus:border-soko-blue focus:ring-2 focus:ring-soko-blue/20 aria-[invalid=true]:border-red-500';

export const ContactPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const id = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [checked, setChecked] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate(values);
    setErrors(next);
    setChecked(true);
    setSubmitError(null);
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      document.getElementById(`${id}-${firstInvalid}`)?.focus();
      return;
    }
    if (!SUBMISSIONS_ENABLED) return;
    if (!isSupabaseConfigured) {
      setStatus('error');
      setSubmitError('Contact submissions are not configured in this environment.');
      return;
    }
    setStatus('submitting');
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('submit_contact_inquiry', {
        p_full_name: values.fullName.trim(),
        p_company: values.company.trim(),
        p_email: values.email.trim(),
        p_phone: values.phone.trim(),
        p_user_type: values.userType,
        p_category: values.category,
        p_subject: values.subject.trim(),
        p_message: values.message.trim(),
        p_honeypot: honeypot,
      });
      if (error) throw error;
      const payload = data && typeof data === 'object' ? (data as { ok?: boolean; ignored?: boolean; reference?: string }) : null;
      if (payload?.ignored) {
        setStatus('sent');
        setReference(null);
        return;
      }
      if (!payload?.ok) throw new Error('Your message could not be sent. Please try again.');
      setReference(typeof payload.reference === 'string' ? payload.reference : null);
      setStatus('sent');
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '';
      setStatus('error');
      setSubmitError(message.includes('inquiry limit reached')
        ? 'Too many messages were sent recently. Please try again later.'
        : 'Your message could not be sent. Please try again.');
    }
  };

  const field = (k: Field, label: string, required: boolean, control: React.ReactNode, hint?: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-${k}`} className="text-sm font-medium text-soko-ink">
        {label}
        {required ? <span className="text-soko-muted"> *</span> : <span className="font-normal text-soko-muted"> (optional)</span>}
      </label>
      {control}
      {errors[k] ? (
        <p id={`${id}-${k}-err`} className="text-xs text-red-600">{errors[k]}</p>
      ) : hint ? (
        <p className="text-xs text-soko-muted">{hint}</p>
      ) : null}
    </div>
  );

  const a11y = (k: Field, required: boolean) => ({
    id: `${id}-${k}`,
    'aria-invalid': !!errors[k],
    'aria-required': required,
    'aria-describedby': errors[k] ? `${id}-${k}-err` : undefined,
  });

  const allValid = checked && Object.keys(errors).every((k) => !errors[k as Field]);

  return (
    <section aria-labelledby={`${id}-title`} className="bg-soko-mist py-12 lg:py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="flex flex-col gap-5">
          <button type="button" onClick={onBack} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-soko-blue hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to home
          </button>
          <h1 id={`${id}-title`} className="font-[Outfit] text-4xl font-bold tracking-tight text-soko-ink text-balance sm:text-5xl">Contact SOKO</h1>
          <p className="max-w-md text-lg leading-relaxed text-soko-muted text-pretty">
            Have a question, need support, or want to explore a partnership? We&apos;d love to hear from you.
          </p>
          <div className="flex items-start gap-3 rounded-2xl border border-soko-line bg-white p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-soko-blue" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              {SUBMISSIONS_ENABLED ? (
                <>
                  <p className="text-sm font-semibold text-soko-ink">We read every message</p>
                  <p className="text-sm leading-relaxed text-soko-muted">
                    Send your inquiry below. You will receive a reference number when it is stored securely with the SOKO support team.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-soko-ink">Online inquiries open soon</p>
                  <p className="text-sm leading-relaxed text-soko-muted">
                    Our contact form is being connected to the SOKO support team. You can prepare your message now, but submissions are not yet being sent or stored.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void submit(e)} noValidate className="relative flex flex-col gap-5 rounded-3xl border border-soko-line bg-white p-6 sm:p-8">
          <div className="absolute -left-[10000px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {field('fullName', 'Full name', true, <input {...a11y('fullName', true)} value={values.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Your full name" className={inputCls} />)}
            {field('company', 'Company name', false, <input {...a11y('company', false)} value={values.company} onChange={set('company')} autoComplete="organization" placeholder="Company" className={inputCls} />)}
            {field('email', 'Email address', true, <input {...a11y('email', true)} type="email" value={values.email} onChange={set('email')} autoComplete="email" placeholder="you@company.com" className={inputCls} />)}
            {field('phone', 'Phone number', false, <input {...a11y('phone', false)} type="tel" value={values.phone} onChange={set('phone')} autoComplete="tel" placeholder="+971 50 000 0000" className={inputCls} />)}
            {field(
              'userType',
              'I am a',
              true,
              <select {...a11y('userType', true)} value={values.userType} onChange={set('userType')} className={inputCls}>
                <option value="">Select user type</option>
                {USER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>,
            )}
            {field(
              'category',
              'Inquiry category',
              true,
              <select {...a11y('category', true)} value={values.category} onChange={set('category')} className={inputCls}>
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>,
            )}
          </div>
          {field('subject', 'Subject', true, <input {...a11y('subject', true)} value={values.subject} onChange={set('subject')} placeholder="What is this about?" className={inputCls} />)}
          {field(
            'message',
            'Message',
            true,
            <textarea {...a11y('message', true)} value={values.message} onChange={set('message')} rows={6} placeholder="How can we help?" className={`${inputCls} resize-y leading-relaxed`} />,
          )}

          {status === 'sent' && (
            <p role="status" className="flex items-center gap-2 rounded-lg bg-soko-mist px-4 py-3 text-sm font-medium text-soko-ink">
              <CheckCircle2 className="h-4 w-4 text-soko-blue" aria-hidden="true" />
              {reference
                ? `Thank you — your message has been sent. Reference ${reference}.`
                : 'Thank you — your message has been sent.'}
            </p>
          )}
          {status === 'error' && submitError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>
          )}

          {!SUBMISSIONS_ENABLED && allValid && (
            <p role="status" className="flex items-start gap-2 rounded-lg border border-soko-line bg-soko-mist px-4 py-3 text-sm leading-relaxed text-soko-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-soko-blue" aria-hidden="true" />
              Your message looks complete, but online submissions aren&apos;t available yet. Nothing has been sent or saved.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-soko-muted">* Required fields</p>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-soko-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-soko-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'submitting' ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Sending</> : SUBMISSIONS_ENABLED ? 'Send message' : 'Check message'}
            </button>
          </div>
          {!SUBMISSIONS_ENABLED && <p className="-mt-2 text-right text-xs text-soko-muted">Sending is disabled until our support inbox is connected.</p>}
        </form>
      </div>
    </section>
  );
};
