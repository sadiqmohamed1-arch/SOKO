export type VisitStatus =
  | 'pending-confirmation'
  | 'scheduled'
  | 'checked-in'
  | 'in-meeting'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'declined';

export const VISIT_STATUSES: VisitStatus[] = [
  'pending-confirmation',
  'scheduled',
  'checked-in',
  'in-meeting',
  'completed',
  'cancelled',
  'no-show',
  'declined',
];

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  'pending-confirmation': 'Pending Request',
  scheduled: 'Scheduled',
  'checked-in': 'Checked In',
  'in-meeting': 'In Meeting',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No-show',
  declined: 'Declined',
};

export const VISIT_STATUS_CLASSES: Record<VisitStatus, string> = {
  'pending-confirmation': 'border-amber-200 bg-amber-50 text-amber-700',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  'checked-in': 'border-sky-200 bg-sky-50 text-sky-700',
  'in-meeting': 'border-indigo-200 bg-indigo-50 text-indigo-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
  'no-show': 'border-rose-200 bg-rose-50 text-rose-700',
  declined: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const VISIT_STATUS_BAR: Record<VisitStatus, string> = {
  'pending-confirmation': 'bg-amber-500',
  scheduled: 'bg-blue-600',
  'checked-in': 'bg-sky-500',
  'in-meeting': 'bg-indigo-500',
  completed: 'bg-emerald-600',
  cancelled: 'bg-slate-400',
  'no-show': 'bg-rose-500',
  declined: 'bg-rose-300',
};

export interface VisitAttendee {
  id: string;
  companyId: string;
  fullName: string;
  email: string | null;
  hasAccount: boolean;
}

export interface VisitNote {
  id: string;
  companyId: string;
  companyName: string | null;
  body: string;
  createdAt: string;
}

export type VisitEventKind = 'requested' | 'status' | 'rescheduled' | 'updated' | 'check-in' | 'check-out';

export interface VisitEvent {
  id: string;
  at: string;
  kind: VisitEventKind;
  summary: string;
  /** "audit" when read from audit_log, "record" when derived from the visit row's own timestamps. */
  origin: 'audit' | 'record';
}

export interface AdminVisit {
  id: string;
  supplierCompanyId: string;
  supplierName: string | null;
  hostCompanyId: string;
  hostName: string | null;
  requestedByCompanyId: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  purpose: string | null;
  visitType: string | null;
  status: VisitStatus;
  kioskBadge: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  statusReason: string | null;
  confirmed: boolean;
  declined: boolean;
  createdAt: string;
  updatedAt: string;
  /** Null when attendees could not be read for this session. */
  attendees: VisitAttendee[] | null;
  /** Null when notes could not be read. Only notes from the admin's own companies are ever returned. */
  notes: VisitNote[] | null;
  /** Null when the audit trail could not be read. */
  timeline: VisitEvent[] | null;
}

export function visitCode(id: string): string {
  return `VST-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function requestedByName(v: AdminVisit): string | null {
  return v.requestedByCompanyId === v.supplierCompanyId ? v.supplierName : v.hostName;
}

export function requestedBySide(v: AdminVisit): 'Supplier' | 'Host' {
  return v.requestedByCompanyId === v.supplierCompanyId ? 'Supplier' : 'Host';
}

export function isUpcoming(v: AdminVisit, now = Date.now()): boolean {
  return v.status === 'scheduled' && new Date(v.scheduledAt).getTime() >= now;
}

export function isThisMonth(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/** Events derived from the visit row itself, used when the audit trail is not readable. */
export function recordEvents(v: AdminVisit): VisitEvent[] {
  const events: VisitEvent[] = [{ id: `${v.id}-created`, at: v.createdAt, kind: 'requested', summary: 'Visit request created', origin: 'record' }];
  if (v.checkInAt) events.push({ id: `${v.id}-in`, at: v.checkInAt, kind: 'check-in', summary: 'Visitor checked in at kiosk', origin: 'record' });
  if (v.checkOutAt) events.push({ id: `${v.id}-out`, at: v.checkOutAt, kind: 'check-out', summary: 'Visit closed and checked out', origin: 'record' });
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

const DAY = 86_400_000;
const HOUR = 3_600_000;

function at(offsetMs: number, hour = 10): string {
  const d = new Date(Date.now() + offsetMs);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

interface DemoSeed {
  id: string;
  supplier: [string, string];
  host: [string, string];
  requestedBy: 'supplier' | 'host';
  offsetDays: number;
  hour: number;
  duration: number;
  location: string | null;
  purpose: string;
  visitType: string;
  status: VisitStatus;
  reason?: string;
}

const DEMO_SEEDS: DemoSeed[] = [
  { id: 'a3f19c20-7e1b-4c55-9a10-1b2c3d4e5f01', supplier: ['d-sup-1', 'Gulf Steel Fabrication'], host: ['d-con-1', 'Al Noor Contracting'], requestedBy: 'supplier', offsetDays: 3, hour: 10, duration: 60, location: 'Al Noor HQ, Reception B, Dubai Investments Park', purpose: 'Present structural steel capability and Q3 pricing for Tower 2 package.', visitType: 'Product presentation', status: 'scheduled' },
  { id: 'b47d2e31-8f2c-4d66-8b21-2c3d4e5f6a02', supplier: ['d-sup-2', 'Emirates Pipe Systems'], host: ['d-con-2', 'Desert Rise Builders'], requestedBy: 'supplier', offsetDays: 6, hour: 14, duration: 45, location: null, purpose: 'Introduce HDPE drainage range and arrange sample handover.', visitType: 'Introduction', status: 'pending-confirmation' },
  { id: 'c58e3f42-902d-4e77-9c32-3d4e5f6a7b03', supplier: ['d-sup-3', 'Coastal MEP Supplies'], host: ['d-con-1', 'Al Noor Contracting'], requestedBy: 'host', offsetDays: 1, hour: 11, duration: 90, location: 'Site office, Marina Gate Phase 3', purpose: 'Technical clarification on chilled water valve submittal.', visitType: 'Technical review', status: 'pending-confirmation' },
  { id: 'd69f4053-a13e-4f88-8d43-4e5f6a7b8c04', supplier: ['d-sup-1', 'Gulf Steel Fabrication'], host: ['d-con-3', 'Horizon Infrastructure'], requestedBy: 'host', offsetDays: -4, hour: 9, duration: 60, location: 'Horizon Procurement Office, Abu Dhabi', purpose: 'Quarterly supplier performance review.', visitType: 'Supplier review', status: 'completed' },
  { id: 'e7a05164-b24f-4099-9e54-5f6a7b8c9d05', supplier: ['d-sup-4', 'Prime Glazing Solutions'], host: ['d-con-2', 'Desert Rise Builders'], requestedBy: 'supplier', offsetDays: -9, hour: 15, duration: 60, location: 'Desert Rise HQ, Al Quoz', purpose: 'Curtain wall mock-up walkthrough.', visitType: 'Site visit', status: 'completed' },
  { id: 'f8b16275-c35a-41aa-8f65-6a7b8c9d0e06', supplier: ['d-sup-2', 'Emirates Pipe Systems'], host: ['d-con-3', 'Horizon Infrastructure'], requestedBy: 'supplier', offsetDays: -2, hour: 13, duration: 30, location: null, purpose: 'Follow-up on tender clarification.', visitType: 'Follow-up', status: 'cancelled', reason: 'Host procurement lead unavailable; to be rebooked.' },
  { id: '09c27386-d46b-42bb-9076-7b8c9d0e1f07', supplier: ['d-sup-3', 'Coastal MEP Supplies'], host: ['d-con-2', 'Desert Rise Builders'], requestedBy: 'supplier', offsetDays: -14, hour: 10, duration: 60, location: 'Desert Rise HQ, Al Quoz', purpose: 'Annual rate agreement discussion.', visitType: 'Commercial meeting', status: 'no-show', reason: 'Supplier did not arrive within the grace period.' },
  { id: '1ad38497-e57c-43cc-8187-8c9d0e1f2a08', supplier: ['d-sup-4', 'Prime Glazing Solutions'], host: ['d-con-1', 'Al Noor Contracting'], requestedBy: 'supplier', offsetDays: 0, hour: 9, duration: 120, location: 'Al Noor HQ, Meeting Room 4', purpose: 'Facade package scope alignment.', visitType: 'Technical review', status: 'in-meeting' },
  { id: '2be495a8-f68d-44dd-9298-9d0e1f2a3b09', supplier: ['d-sup-1', 'Gulf Steel Fabrication'], host: ['d-con-2', 'Desert Rise Builders'], requestedBy: 'supplier', offsetDays: -35, hour: 11, duration: 60, location: 'Desert Rise HQ, Al Quoz', purpose: 'Rebar supply introduction.', visitType: 'Introduction', status: 'declined', reason: 'Package already awarded for this phase.' },
  { id: '3cf5a6b9-079e-45ee-83a9-0e1f2a3b4c10', supplier: ['d-sup-3', 'Coastal MEP Supplies'], host: ['d-con-3', 'Horizon Infrastructure'], requestedBy: 'host', offsetDays: -48, hour: 14, duration: 60, location: 'Horizon Procurement Office, Abu Dhabi', purpose: 'Pre-qualification interview.', visitType: 'Pre-qualification', status: 'completed' },
  { id: '4d06b7ca-18af-46ff-94ba-1f2a3b4c5d11', supplier: ['d-sup-2', 'Emirates Pipe Systems'], host: ['d-con-1', 'Al Noor Contracting'], requestedBy: 'supplier', offsetDays: 12, hour: 10, duration: 60, location: 'Al Noor HQ, Reception B, Dubai Investments Park', purpose: 'Valve chamber product demonstration.', visitType: 'Product presentation', status: 'scheduled' },
];

const DEMO_PEOPLE: Record<string, string[]> = {
  'd-sup-1': ['Rashid Kamal', 'Priya Menon'],
  'd-sup-2': ['Omar Siddiqui'],
  'd-sup-3': ['Fatima Al-Zaabi', 'Daniel Okafor'],
  'd-sup-4': ['Sara Haddad'],
  'd-con-1': ['Layla Mansour'],
  'd-con-2': ['Khalid Rahman'],
  'd-con-3': ['Noura Al-Suwaidi'],
};

function demoVisit(s: DemoSeed): AdminVisit {
  const scheduledAt = at(s.offsetDays * DAY, s.hour);
  const createdAt = new Date(new Date(scheduledAt).getTime() - 8 * DAY).toISOString();
  const started = ['checked-in', 'in-meeting', 'completed'].includes(s.status);
  const checkInAt = started ? new Date(new Date(scheduledAt).getTime() - 10 * 60_000).toISOString() : null;
  const checkOutAt = s.status === 'completed' ? new Date(new Date(scheduledAt).getTime() + s.duration * 60_000).toISOString() : null;
  const updatedAt = checkOutAt ?? checkInAt ?? new Date(new Date(createdAt).getTime() + 2 * DAY).toISOString();
  const confirmed = !['pending-confirmation', 'declined'].includes(s.status);
  const visit: AdminVisit = {
    id: s.id,
    supplierCompanyId: s.supplier[0],
    supplierName: s.supplier[1],
    hostCompanyId: s.host[0],
    hostName: s.host[1],
    requestedByCompanyId: s.requestedBy === 'supplier' ? s.supplier[0] : s.host[0],
    scheduledAt,
    durationMinutes: s.duration,
    location: s.location,
    purpose: s.purpose,
    visitType: s.visitType,
    status: s.status,
    kioskBadge: confirmed && s.status !== 'cancelled' ? `V-${s.id.replace(/-/g, '').slice(8, 16).toUpperCase()}` : null,
    checkInAt,
    checkOutAt,
    statusReason: s.reason ?? null,
    confirmed,
    declined: s.status === 'declined',
    createdAt,
    updatedAt,
    attendees: [
      ...(DEMO_PEOPLE[s.supplier[0]] ?? []).map((n, i) => ({ id: `${s.id}-s${i}`, companyId: s.supplier[0], fullName: n, email: `${n.split(' ')[0].toLowerCase()}@supplier.example`, hasAccount: i === 0 })),
      ...(DEMO_PEOPLE[s.host[0]] ?? []).map((n, i) => ({ id: `${s.id}-h${i}`, companyId: s.host[0], fullName: n, email: `${n.split(' ')[0].toLowerCase()}@host.example`, hasAccount: true })),
    ],
    notes: [],
    timeline: null,
  };

  const events: VisitEvent[] = [{ id: `${s.id}-e0`, at: createdAt, kind: 'requested', summary: `Visit requested by ${s.requestedBy === 'supplier' ? s.supplier[1] : s.host[1]}`, origin: 'audit' }];
  const confirmAt = new Date(new Date(createdAt).getTime() + 1 * DAY).toISOString();
  if (s.status === 'declined') events.push({ id: `${s.id}-e1`, at: confirmAt, kind: 'status', summary: 'Status: Pending Request \u2192 Declined', origin: 'audit' });
  if (confirmed) events.push({ id: `${s.id}-e1`, at: confirmAt, kind: 'status', summary: 'Status: Pending Request \u2192 Scheduled', origin: 'audit' });
  if (s.status === 'cancelled') events.push({ id: `${s.id}-e2`, at: new Date(new Date(scheduledAt).getTime() - 6 * HOUR).toISOString(), kind: 'status', summary: 'Status: Scheduled \u2192 Cancelled', origin: 'audit' });
  if (s.status === 'no-show') events.push({ id: `${s.id}-e2`, at: new Date(new Date(scheduledAt).getTime() + HOUR).toISOString(), kind: 'status', summary: 'Status: Scheduled \u2192 No-show', origin: 'audit' });
  if (checkInAt) events.push({ id: `${s.id}-e3`, at: checkInAt, kind: 'check-in', summary: 'Status: Scheduled \u2192 Checked In', origin: 'audit' });
  if (s.status === 'in-meeting' || s.status === 'completed') events.push({ id: `${s.id}-e4`, at: new Date(new Date(checkInAt!).getTime() + 5 * 60_000).toISOString(), kind: 'status', summary: 'Status: Checked In \u2192 In Meeting', origin: 'audit' });
  if (checkOutAt) events.push({ id: `${s.id}-e5`, at: checkOutAt, kind: 'check-out', summary: 'Status: In Meeting \u2192 Completed', origin: 'audit' });
  visit.timeline = events.sort((a, b) => b.at.localeCompare(a.at));

  if (s.status === 'completed' && s.id.startsWith('d6')) {
    visit.notes = [{ id: `${s.id}-n1`, companyId: s.host[0], companyName: s.host[1], body: 'Delivery lead times improved; request updated HSE documentation before next award.', createdAt: checkOutAt! }];
  }
  return visit;
}

export const DEMO_VISITS: AdminVisit[] = DEMO_SEEDS.map(demoVisit).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));

export const NOTES_RESTRICTION =
  'Visit notes are private to the company that wrote them. Only notes from companies you are a member of are shown; other companies\u2019 notes are never requested.';
