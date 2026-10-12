import React, { useMemo, useState } from 'react';
import { Mail, Send, Building2, ShieldCheck, CalendarClock, Lock } from 'lucide-react';
import type { AdminCompany } from './companyShared';
import { type CompanyKind, type RoleDef } from './userShared';
import { SourceTag } from './userBadges';

interface UserInvitePanelProps {
  companies: AdminCompany[];
  roles: RoleDef[];
}

const EXPIRY_OPTIONS = [
  { days: 3, label: '3 days' },
  { days: 7, label: '7 days (current server default)' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UserInvitePanel: React.FC<UserInvitePanelProps> = ({ companies, roles }) => {
  const invitable = useMemo(
    () => companies.filter((c): c is AdminCompany & { role: CompanyKind } => c.role === 'supplier' || c.role === 'contractor'),
    [companies],
  );
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);

  const company = invitable.find((c) => c.id === companyId) ?? null;
  const roleOptions = company ? roles.filter((r) => r.companyKind === company.role) : [];
  const role = roleOptions.find((r) => r.key === roleKey) ?? null;
  const normalizedEmail = email.trim().toLowerCase();
  const emailValid = EMAIL_PATTERN.test(normalizedEmail);
  const expiresOn = new Date(Date.now() + expiryDays * 86_400_000).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <form
        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-3"
        onSubmit={(e) => e.preventDefault()}
        aria-labelledby="invite-form-title"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="invite-form-title" className="text-sm font-bold text-slate-900">
            Invite a user to a company
          </h3>
          <SourceTag source="ui_only" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-email" className="text-xs font-semibold text-slate-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              aria-invalid={email !== '' && !emailValid}
              aria-describedby="invite-email-hint"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <p id="invite-email-hint" className={`text-[11px] ${email !== '' && !emailValid ? 'text-rose-600' : 'text-slate-500'}`}>
            {email !== '' && !emailValid ? 'Enter a valid email address.' : 'Addresses are stored in lowercase.'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-company" className="text-xs font-semibold text-slate-700">
              Company
            </label>
            <select
              id="invite-company"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setRoleKey('');
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="">{invitable.length ? 'Select a company' : 'No companies loaded'}</option>
              {invitable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.role === 'supplier' ? 'Supplier' : 'Contractor'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-role" className="text-xs font-semibold text-slate-700">
              Role
            </label>
            <select
              id="invite-role"
              value={roleKey}
              disabled={!company}
              onChange={(e) => setRoleKey(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="">{company ? 'Select a role' : 'Choose a company first'}</option>
              {roleOptions.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-expiry" className="text-xs font-semibold text-slate-700">
            Invitation expiry
          </label>
          <select
            id="invite-expiry"
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-600 sm:w-72"
          >
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.days} value={option.days}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">The existing invite function currently sets a fixed 7-day expiry.</p>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Sending is disabled until an admin invitation service is approved.
          </p>
          <button
            type="submit"
            disabled
            aria-disabled="true"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white opacity-50 cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            Send Invitation
          </button>
        </div>
      </form>

      <aside className="flex flex-col gap-3 lg:col-span-2" aria-label="Invitation preview">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Confirmation preview</span>
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col gap-1 bg-slate-900 px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-200">SOKO invitation</span>
            <span className="text-base font-bold text-white text-balance">
              {company ? `Join ${company.companyName} on SOKO` : 'Join a company on SOKO'}
            </span>
          </div>
          <dl className="flex flex-col divide-y divide-slate-100 text-xs">
            <PreviewRow icon={Mail} label="Recipient" value={emailValid ? normalizedEmail : null} />
            <PreviewRow icon={Building2} label="Company" value={company?.companyName ?? null} />
            <PreviewRow icon={ShieldCheck} label="Role" value={role?.label ?? null} detail={role?.description} />
            <PreviewRow icon={CalendarClock} label="Expires" value={`${expiresOn} (${expiryDays} days)`} />
          </dl>
          <p className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] leading-relaxed text-slate-500">
            The recipient signs in or creates an account, then accepts the invitation to activate the membership.
          </p>
        </div>
      </aside>
    </div>
  );
};

const PreviewRow: React.FC<{ icon: typeof Mail; label: string; value: string | null; detail?: string }> = ({ icon: Icon, label, value, detail }) => (
  <div className="flex items-start gap-3 px-5 py-3">
    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
    <dt className="w-20 shrink-0 text-slate-500">{label}</dt>
    <dd className="flex min-w-0 flex-col gap-0.5">
      <span className={`break-words font-semibold ${value ? 'text-slate-900' : 'text-slate-300'}`}>{value ?? 'Not set'}</span>
      {detail && <span className="text-[11px] leading-snug text-slate-500">{detail}</span>}
    </dd>
  </div>
);
