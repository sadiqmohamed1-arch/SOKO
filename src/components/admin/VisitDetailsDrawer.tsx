import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ClipboardList,
  Users,
  MapPin,
  History,
  StickyNote,
  Settings2,
  Building2,
  ClipboardCheck,
  Flag,
  Ban,
  Download,
  Lock,
  LogIn,
  LogOut,
  CalendarClock,
  ArrowRightLeft,
  Pencil,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { DASH, formatDate, formatDateTime } from './companyShared';
import {
  type AdminVisit,
  type VisitEventKind,
  NOTES_RESTRICTION,
  recordEvents,
  requestedByName,
  requestedBySide,
  visitCode,
} from './visitShared';
import { RestrictedNote, UiOnlyTag, VisitStatusBadge } from './visitBadges';
import { SourceTag, Unavailable } from './userBadges';

type DrawerSection = 'overview' | 'participants' | 'schedule' | 'timeline' | 'notes' | 'governance';

const SECTIONS: { id: DrawerSection; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: ClipboardList },
  { id: 'participants', label: 'Participants', icon: Users },
  { id: 'schedule', label: 'Schedule & Location', icon: MapPin },
  { id: 'timeline', label: 'Visit Timeline', icon: History },
  { id: 'notes', label: 'Notes & Activity', icon: StickyNote },
  { id: 'governance', label: 'Governance', icon: Settings2 },
];

const EVENT_META: Record<VisitEventKind, { icon: LucideIcon; tone: string }> = {
  requested: { icon: Send, tone: 'bg-blue-50 text-blue-700' },
  status: { icon: ArrowRightLeft, tone: 'bg-slate-100 text-slate-700' },
  rescheduled: { icon: CalendarClock, tone: 'bg-amber-50 text-amber-700' },
  updated: { icon: Pencil, tone: 'bg-slate-100 text-slate-600' },
  'check-in': { icon: LogIn, tone: 'bg-sky-50 text-sky-700' },
  'check-out': { icon: LogOut, tone: 'bg-emerald-50 text-emerald-700' },
};

interface VisitDetailsDrawerProps {
  visit: AdminVisit;
  isLive: boolean;
  onClose: () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-40 sm:shrink-0">{label}</dt>
    <dd className="min-w-0 break-words text-sm text-slate-900">{children}</dd>
  </div>
);

const Panel: React.FC<{ title: string; source?: React.ReactNode; children: React.ReactNode }> = ({ title, source, children }) => (
  <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <header className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {source}
    </header>
    {children}
  </section>
);

const EmptyNote: React.FC<{ icon: LucideIcon; title: string; body: string }> = ({ icon: Icon, title, body }) => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
    <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="max-w-sm text-xs leading-relaxed text-slate-500 text-pretty">{body}</p>
  </div>
);

const DisabledAction: React.FC<{ icon: LucideIcon; label: string; description: string; tone?: 'default' | 'danger' }> = ({ icon: Icon, label, description, tone = 'default' }) => (
  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-white text-slate-600'}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-900">
        {label}
        <UiOnlyTag />
      </span>
      <span className="text-[11px] leading-relaxed text-slate-500">{description}</span>
    </div>
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="UI only. Requires a secure backend function."
      className="inline-flex shrink-0 cursor-not-allowed items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-400"
    >
      <Lock className="h-3 w-3" aria-hidden="true" />
      {label}
    </button>
  </div>
);

const CompanyName: React.FC<{ name: string | null }> = ({ name }) =>
  name ? <span className="font-medium">{name}</span> : <span className="text-slate-500">Company not visible to your session</span>;

export const VisitDetailsDrawer: React.FC<VisitDetailsDrawerProps> = ({ visit, isLive, onClose }) => {
  const [section, setSection] = useState<DrawerSection>('overview');
  const closeRef = useRef<HTMLButtonElement>(null);
  const source = isLive ? 'live' : 'demo';
  const code = visitCode(visit.id);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setSection('overview');
  }, [visit.id]);

  const timeline = visit.timeline && visit.timeline.length > 0 ? visit.timeline : recordEvents(visit);
  const timelineFromAudit = visit.timeline !== null && visit.timeline.length > 0;
  const endAt = new Date(new Date(visit.scheduledAt).getTime() + visit.durationMinutes * 60_000).toISOString();
  const sides = [
    { label: 'Supplier', companyId: visit.supplierCompanyId, name: visit.supplierName },
    { label: 'Host contractor / buyer', companyId: visit.hostCompanyId, name: visit.hostName },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close visit details" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-default" />
      <section role="dialog" aria-modal="true" aria-labelledby="visit-details-title" className="relative flex h-full w-full max-w-4xl flex-col bg-slate-50 shadow-2xl">
        <header className="flex items-start gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Supplier visit {'\u2022'} {isLive ? 'Live record' : 'Demo record'}
            </span>
            <h2 id="visit-details-title" className="truncate text-xl font-bold text-slate-900 text-balance">
              {visit.supplierName ?? 'Supplier'} {'\u2192'} {visit.hostName ?? 'Host'}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-slate-600">{code}</span>
              <VisitStatusBadge status={visit.status} />
              <span className="text-[11px] text-slate-500">{formatDateTime(visit.scheduledAt)}</span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close visit details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label="Visit detail sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                    active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            {section === 'overview' && (
              <Panel title="Overview" source={<SourceTag source={source} />}>
                <dl>
                  <Field label="Visit ID">
                    <span className="font-mono text-xs">{code}</span>
                    <span className="block font-mono text-[11px] text-slate-400">{visit.id}</span>
                  </Field>
                  <Field label="Purpose">{visit.purpose || <span className="text-slate-500">No purpose recorded</span>}</Field>
                  <Field label="Visit type">{visit.visitType || DASH}</Field>
                  <Field label="Status">
                    <VisitStatusBadge status={visit.status} />
                  </Field>
                  {visit.statusReason && <Field label="Status reason">{visit.statusReason}</Field>}
                  <Field label="Scheduled">{formatDateTime(visit.scheduledAt)}</Field>
                  <Field label="Requested by">
                    <CompanyName name={requestedByName(visit)} />
                    <span className="ml-1 text-xs text-slate-500">({requestedBySide(visit)})</span>
                  </Field>
                </dl>
              </Panel>
            )}

            {section === 'participants' && (
              <>
                <Panel title="Companies" source={<SourceTag source={source} />}>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {sides.map((s) => (
                      <li key={s.label} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Building2 className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</span>
                          <span className="text-sm text-slate-900">
                            <CompanyName name={s.name} />
                          </span>
                          {s.companyId === visit.requestedByCompanyId && <span className="text-[11px] text-blue-700">Requested this visit</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel title="Authorized participants" source={visit.attendees ? <SourceTag source={source} /> : undefined}>
                  {visit.attendees === null ? (
                    <Unavailable label="Participants unavailable" reason="Visit attendees could not be read for this session." />
                  ) : visit.attendees.length === 0 ? (
                    <EmptyNote icon={Users} title="No participants recorded" body="Neither company has added named attendees to this visit." />
                  ) : (
                    <ul className="flex flex-col divide-y divide-slate-100">
                      {visit.attendees.map((a) => {
                        const side = a.companyId === visit.supplierCompanyId ? 'Supplier' : 'Host';
                        return (
                          <li key={a.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <span className="flex min-w-0 flex-col">
                              <span className="text-sm font-semibold text-slate-900">{a.fullName}</span>
                              <span className="truncate text-xs text-slate-500">{a.email || 'No email recorded'}</span>
                            </span>
                            <span className="flex items-center gap-2 text-[11px]">
                              <span className={`rounded-full border px-2 py-0.5 font-semibold ${side === 'Supplier' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>{side}</span>
                              <span className="text-slate-500">{a.hasAccount ? 'SOKO account' : 'Guest'}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              </>
            )}

            {section === 'schedule' && (
              <Panel title="Schedule & Location" source={<SourceTag source={source} />}>
                <dl>
                  <Field label="Starts">{formatDateTime(visit.scheduledAt)}</Field>
                  <Field label="Ends (planned)">{formatDateTime(endAt)}</Field>
                  <Field label="Duration">{visit.durationMinutes} minutes</Field>
                  <Field label="Location">{visit.location || <span className="text-slate-500">No location recorded</span>}</Field>
                  <Field label="Kiosk badge">{visit.kioskBadge ? <span className="font-mono text-xs">{visit.kioskBadge}</span> : <span className="text-slate-500">Issued once the visit is confirmed</span>}</Field>
                  <Field label="Checked in">{visit.checkInAt ? formatDateTime(visit.checkInAt) : DASH}</Field>
                  <Field label="Checked out">{visit.checkOutAt ? formatDateTime(visit.checkOutAt) : DASH}</Field>
                </dl>
              </Panel>
            )}

            {section === 'timeline' && (
              <Panel title="Visit Timeline" source={<SourceTag source={source} />}>
                {!timelineFromAudit && (
                  <RestrictedNote>
                    {visit.timeline === null
                      ? 'The audit trail could not be read, so only timestamps stored on the visit record are shown.'
                      : 'No audit entries were found for this visit. Timestamps stored on the visit record are shown instead.'}
                  </RestrictedNote>
                )}
                <ol className="flex flex-col">
                  {timeline.map((e, i) => {
                    const meta = EVENT_META[e.kind];
                    const Icon = meta.icon;
                    return (
                      <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {i < timeline.length - 1 && <span className="absolute left-4 top-8 h-[calc(100%-1.5rem)] w-px bg-slate-200" aria-hidden="true" />}
                        <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5 pt-1">
                          <span className="text-xs font-semibold text-slate-900">{e.summary}</span>
                          <span className="text-[11px] text-slate-400">
                            {formatDateTime(e.at)} {'\u2022'} {e.origin === 'audit' ? 'Audit log' : 'Visit record'}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </Panel>
            )}

            {section === 'notes' && (
              <Panel title="Notes & Activity" source={visit.notes ? <SourceTag source={source} /> : undefined}>
                <RestrictedNote>{NOTES_RESTRICTION}</RestrictedNote>
                {visit.notes === null ? (
                  <Unavailable label="Notes unavailable" reason="Visit notes could not be read for this session." />
                ) : visit.notes.length === 0 ? (
                  <EmptyNote icon={StickyNote} title="No notes you are authorized to view" body="Either no notes exist, or they belong to a company you are not a member of." />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {visit.notes.map((n) => (
                      <li key={n.id} className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3">
                        <span className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">{n.companyName ?? 'Your company'}</span>
                          <span>{formatDateTime(n.createdAt)}</span>
                        </span>
                        <p className="text-sm leading-relaxed text-slate-800 text-pretty">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}

            {section === 'governance' && (
              <>
                <Panel title="Audit information" source={<SourceTag source={source} />}>
                  <dl>
                    <Field label="Created">{formatDateTime(visit.createdAt)}</Field>
                    <Field label="Last updated">{formatDateTime(visit.updatedAt)}</Field>
                    <Field label="Confirmation">{visit.confirmed ? 'Confirmed by the counterparty' : visit.declined ? 'Declined by the counterparty' : 'Awaiting counterparty confirmation'}</Field>
                    <Field label="Audit entries">
                      {visit.timeline === null ? <Unavailable reason="The audit log could not be read for this visit." /> : `${visit.timeline.length} recorded`}
                    </Field>
                    <Field label="Date recorded">{formatDate(visit.createdAt)}</Field>
                  </dl>
                </Panel>
                <Panel title="Administrative actions" source={<SourceTag source="ui_only" />}>
                  <RestrictedNote>
                    Visit status can only change through <span className="font-mono">set_visit_status</span>, which allows the supplier or host company only. There is no platform-admin override yet, so these controls stay disabled.
                  </RestrictedNote>
                  <div className="flex flex-col gap-2">
                    <DisabledAction icon={ClipboardCheck} label="Review Visit" description="Mark this visit as reviewed by a platform administrator." />
                    <DisabledAction icon={Flag} label="Flag Visit" description="Flag the visit for compliance follow-up." />
                    <DisabledAction icon={Ban} label="Cancel Visit" description="Cancel on behalf of the platform and notify both companies." tone="danger" />
                    <DisabledAction icon={Download} label="Export Visit Report" description="Download a PDF summary of the visit and its audit trail." />
                  </div>
                </Panel>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
