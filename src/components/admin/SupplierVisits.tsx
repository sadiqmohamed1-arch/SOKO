import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CalendarClock,
  Hourglass,
  CircleCheck,
  CircleX,
  CalendarRange,
  LayoutDashboard,
  List,
  BarChart3,
  Search,
  X,
  AlertTriangle,
  ChevronRight,
  Download,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { type AdminCompany, DASH, formatDate, formatDateTime } from './companyShared';
import {
  type AdminVisit,
  type VisitEvent,
  type VisitStatus,
  DEMO_VISITS,
  VISIT_STATUSES,
  VISIT_STATUS_BAR,
  VISIT_STATUS_LABELS,
  isThisMonth,
  isUpcoming,
  requestedByName,
  requestedBySide,
  visitCode,
} from './visitShared';
import { RestrictedNote, UiOnlyTag, VisitStatusBadge } from './visitBadges';
import { SourceTag } from './userBadges';
import { VisitDetailsDrawer } from './VisitDetailsDrawer';

type Tab = 'dashboard' | 'directory' | 'analytics';
type LoadState = 'loading' | 'success' | 'error';

interface SupplierVisitsProps {
  companies: AdminCompany[];
  isLive: boolean;
  /** Changes whenever the portal re-syncs, so this module reloads alongside it. */
  syncToken: number;
}

interface LiveVisitRow {
  id: string;
  supplier_company_id: string;
  host_company_id: string;
  requested_by_company: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  purpose: string | null;
  visit_type: string | null;
  status: VisitStatus;
  kiosk_badge: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  status_reason: string | null;
  confirmed_by: string | null;
  declined_by: string | null;
  created_at: string;
  updated_at: string;
}

interface LiveAttendeeRow {
  id: string;
  visit_id: string;
  company_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
}

interface LiveNoteRow {
  id: string;
  visit_id: string;
  company_id: string;
  body: string;
  created_at: string;
}

interface LiveAuditRow {
  entity_id: string;
  action: string;
  diff: { values?: Record<string, unknown>; changed?: Record<string, { from: unknown; to: unknown }> } | null;
  at: string;
}

interface LiveData {
  visits: LiveVisitRow[];
  attendees: LiveAttendeeRow[] | null;
  notes: LiveNoteRow[] | null;
  audit: LiveAuditRow[] | null;
}

const ID_CHUNK = 150;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Reads run under the signed-in admin's session. visits RLS has no admin bypass: only visits where the
// admin is a member of the supplier or host company are returned. visit_notes are limited by RLS to the
// admin's own companies. audit_log is readable by platform admins and is filtered to the visible visits.
async function loadLiveVisits(): Promise<LiveData> {
  const supabase = getSupabaseClient();
  const visitRes = await supabase
    .from('visits')
    .select(
      'id, supplier_company_id, host_company_id, requested_by_company, scheduled_at, duration_minutes, location, purpose, visit_type, status, kiosk_badge, check_in_at, check_out_at, status_reason, confirmed_by, declined_by, created_at, updated_at',
    )
    .order('scheduled_at', { ascending: false });
  if (visitRes.error) throw visitRes.error;
  const visits = (visitRes.data ?? []) as LiveVisitRow[];
  if (visits.length === 0) return { visits, attendees: [], notes: [], audit: [] };

  const groups = chunk(visits.map((v) => v.id), ID_CHUNK);
  const readAll = async <T,>(run: (ids: string[]) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[] | null> => {
    const results = await Promise.all(groups.map(run));
    if (results.some((r) => r.error)) return null;
    return results.flatMap((r) => (r.data ?? []) as T[]);
  };

  const [attendees, notes, audit] = await Promise.all([
    readAll<LiveAttendeeRow>((ids) => supabase.from('visit_attendees').select('id, visit_id, company_id, user_id, full_name, email').in('visit_id', ids)),
    readAll<LiveNoteRow>((ids) => supabase.from('visit_notes').select('id, visit_id, company_id, body, created_at').in('visit_id', ids).order('created_at', { ascending: false })),
    readAll<LiveAuditRow>((ids) => supabase.from('audit_log').select('entity_id, action, diff, at').eq('entity', 'visits').in('entity_id', ids).order('at', { ascending: false })),
  ]);
  return { visits, attendees, notes, audit };
}

function auditToEvents(rows: LiveAuditRow[], nameOf: (id: string) => string | null): Map<string, VisitEvent[]> {
  const byVisit = new Map<string, VisitEvent[]>();
  const seen = new Set<string>();
  for (const r of rows) {
    // audit_row writes one entry per party company, so the same change can appear twice.
    const key = `${r.entity_id}|${r.action}|${r.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const changed = r.diff?.changed ?? {};
    let event: Omit<VisitEvent, 'id' | 'at' | 'origin'>;
    if (r.action === 'insert') {
      const requester = typeof r.diff?.values?.requested_by_company === 'string' ? nameOf(r.diff.values.requested_by_company as string) : null;
      event = { kind: 'requested', summary: requester ? `Visit requested by ${requester}` : 'Visit requested' };
    } else if (r.action === 'delete') {
      event = { kind: 'updated', summary: 'Visit record deleted' };
    } else if (changed.status) {
      const from = VISIT_STATUS_LABELS[changed.status.from as VisitStatus] ?? String(changed.status.from);
      const to = VISIT_STATUS_LABELS[changed.status.to as VisitStatus] ?? String(changed.status.to);
      const kind = changed.status.to === 'checked-in' ? 'check-in' : changed.status.to === 'completed' ? 'check-out' : 'status';
      event = { kind, summary: `Status: ${from} \u2192 ${to}` };
    } else if (changed.scheduled_at) {
      event = { kind: 'rescheduled', summary: `Rescheduled to ${formatDateTime(String(changed.scheduled_at.to))}` };
    } else {
      event = { kind: 'updated', summary: 'Visit details updated' };
    }
    const list = byVisit.get(r.entity_id) ?? [];
    list.push({ ...event, id: `${key}|${list.length}`, at: r.at, origin: 'audit' });
    byVisit.set(r.entity_id, list);
  }
  return byVisit;
}

function buildLiveVisits(data: LiveData, companies: AdminCompany[]): AdminVisit[] {
  const nameById = new Map(companies.map((c) => [c.id, c.companyName]));
  const nameOf = (id: string) => nameById.get(id) ?? null;
  const attendeesByVisit = new Map<string, LiveAttendeeRow[]>();
  for (const a of data.attendees ?? []) attendeesByVisit.set(a.visit_id, [...(attendeesByVisit.get(a.visit_id) ?? []), a]);
  const notesByVisit = new Map<string, LiveNoteRow[]>();
  for (const n of data.notes ?? []) notesByVisit.set(n.visit_id, [...(notesByVisit.get(n.visit_id) ?? []), n]);
  const eventsByVisit = data.audit ? auditToEvents(data.audit, nameOf) : null;

  return data.visits.map((v) => ({
    id: v.id,
    supplierCompanyId: v.supplier_company_id,
    supplierName: nameOf(v.supplier_company_id),
    hostCompanyId: v.host_company_id,
    hostName: nameOf(v.host_company_id),
    requestedByCompanyId: v.requested_by_company,
    scheduledAt: v.scheduled_at,
    durationMinutes: v.duration_minutes,
    location: v.location,
    purpose: v.purpose,
    visitType: v.visit_type,
    status: v.status,
    kioskBadge: v.kiosk_badge,
    checkInAt: v.check_in_at,
    checkOutAt: v.check_out_at,
    statusReason: v.status_reason,
    confirmed: v.confirmed_by !== null,
    declined: v.declined_by !== null,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
    attendees: data.attendees
      ? (attendeesByVisit.get(v.id) ?? []).map((a) => ({ id: a.id, companyId: a.company_id, fullName: a.full_name, email: a.email, hasAccount: a.user_id !== null }))
      : null,
    notes: data.notes
      ? (notesByVisit.get(v.id) ?? []).map((n) => ({ id: n.id, companyId: n.company_id, companyName: nameOf(n.company_id), body: n.body, createdAt: n.created_at }))
      : null,
    timeline: eventsByVisit ? (eventsByVisit.get(v.id) ?? []).sort((a, b) => b.at.localeCompare(a.at)) : null,
  }));
}

const FilterSelect: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }> = ({ id, label, value, onChange, children }) => (
  <>
    <label className="sr-only" htmlFor={id}>
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
    >
      {children}
    </select>
  </>
);

const DateInput: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void }> = ({ id, label, value, onChange }) => (
  <span className="flex flex-col gap-0.5">
    <label htmlFor={id} className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </label>
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
    />
  </span>
);

const SectionCard: React.FC<{ title: string; description?: string; source?: React.ReactNode; children: React.ReactNode }> = ({ title, description, source, children }) => (
  <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && <p className="text-xs leading-relaxed text-slate-500 text-pretty">{description}</p>}
      </div>
      {source}
    </header>
    {children}
  </section>
);

const EmptyState: React.FC<{ icon: LucideIcon; title: string; body?: string }> = ({ icon: Icon, title, body }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
    <Icon className="h-6 w-6 text-slate-400" aria-hidden="true" />
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {body && <p className="max-w-md text-xs leading-relaxed text-slate-500 text-pretty">{body}</p>}
  </div>
);

const BarList: React.FC<{ rows: { key: string; label: string; value: number; bar?: string }[]; emptyText: string }> = ({ rows, emptyText }) => {
  if (rows.length === 0) return <p className="text-xs text-slate-500">{emptyText}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-1">
          <span className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-slate-600">{r.label}</span>
            <span className="font-mono font-bold text-slate-900">{r.value}</span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100">
            <span className={`block h-full rounded-full ${r.bar ?? 'bg-blue-600'}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
};

function topCompanies(visits: AdminVisit[], side: 'supplier' | 'host') {
  const map = new Map<string, { label: string; value: number }>();
  for (const v of visits) {
    const id = side === 'supplier' ? v.supplierCompanyId : v.hostCompanyId;
    const name = (side === 'supplier' ? v.supplierName : v.hostName) ?? 'Company not visible to your session';
    const entry = map.get(id) ?? { label: name, value: 0 };
    entry.value += 1;
    map.set(id, entry);
  }
  return [...map.entries()]
    .map(([key, e]) => ({ key, ...e }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

export const SupplierVisits: React.FC<SupplierVisitsProps> = ({ companies, isLive, syncToken }) => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loadState, setLoadState] = useState<LoadState>(isLive ? 'loading' : 'success');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | VisitStatus>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeDrawer = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    if (!isLive) {
      setLiveData(null);
      setLoadState('success');
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setLoadError(null);
    loadLiveVisits()
      .then((data) => {
        if (cancelled) return;
        setLiveData(data);
        setLoadState('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadState('error');
        setLoadError(err instanceof Error ? err.message : 'Visits could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [isLive, syncToken]);

  const visits = useMemo<AdminVisit[]>(() => (isLive ? (liveData ? buildLiveVisits(liveData, companies) : []) : DEMO_VISITS), [isLive, liveData, companies]);
  const source = isLive ? 'live' : 'demo';
  const isInitialLoad = loadState === 'loading' && visits.length === 0;
  const loadFailed = loadState === 'error' && visits.length === 0;
  const selectedVisit = selectedId ? visits.find((v) => v.id === selectedId) ?? null : null;

  const counts = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    return {
      total: visits.length,
      upcoming: visits.filter((v) => isUpcoming(v, now)).length,
      pending: visits.filter((v) => v.status === 'pending-confirmation').length,
      completed: visits.filter((v) => v.status === 'completed').length,
      cancelled: visits.filter((v) => v.status === 'cancelled').length,
      thisMonth: visits.filter((v) => isThisMonth(v.scheduledAt, today)).length,
    };
  }, [visits]);

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of visits) {
      if (v.supplierName) map.set(v.supplierCompanyId, `${v.supplierName} (Supplier)`);
      if (v.hostName) map.set(v.hostCompanyId, `${v.hostName} (Host)`);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [visits]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    return visits.filter((v) => {
      if (companyFilter !== 'all' && v.supplierCompanyId !== companyFilter && v.hostCompanyId !== companyFilter) return false;
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      const t = new Date(v.scheduledAt).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      if (!query) return true;
      return [visitCode(v.id), v.id, v.supplierName, v.hostName].filter(Boolean).some((s) => String(s).toLowerCase().includes(query));
    });
  }, [visits, companyFilter, statusFilter, fromDate, toDate, searchQuery]);

  const hasActiveFilters = companyFilter !== 'all' || statusFilter !== 'all' || fromDate !== '' || toDate !== '' || searchQuery.trim() !== '';
  const resetFilters = () => {
    setCompanyFilter('all');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
    setSearchQuery('');
  };
  const openDirectory = (status: 'all' | VisitStatus = 'all') => {
    resetFilters();
    setStatusFilter(status);
    setTab('directory');
  };

  const sessionNote = isLive ? 'Visible to your session' : undefined;
  const kpis: { id: string; label: string; value: number; icon: LucideIcon; tone: string; note?: string; onClick: () => void }[] = [
    { id: 'total', label: 'Total Visits', value: counts.total, icon: CalendarDays, tone: 'bg-blue-50 text-blue-700', note: sessionNote, onClick: () => openDirectory() },
    { id: 'upcoming', label: 'Upcoming Visits', value: counts.upcoming, icon: CalendarClock, tone: 'bg-sky-50 text-sky-700', note: 'Scheduled, not yet started', onClick: () => openDirectory('scheduled') },
    { id: 'pending', label: 'Pending Requests', value: counts.pending, icon: Hourglass, tone: 'bg-amber-50 text-amber-700', note: 'Awaiting confirmation', onClick: () => openDirectory('pending-confirmation') },
    { id: 'completed', label: 'Completed Visits', value: counts.completed, icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700', onClick: () => openDirectory('completed') },
    { id: 'cancelled', label: 'Cancelled Visits', value: counts.cancelled, icon: CircleX, tone: 'bg-slate-100 text-slate-600', onClick: () => openDirectory('cancelled') },
    { id: 'month', label: 'Visits This Month', value: counts.thisMonth, icon: CalendarRange, tone: 'bg-indigo-50 text-indigo-700', note: 'By scheduled date', onClick: () => openDirectory() },
  ];

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'directory', label: 'Visit Directory', icon: List },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const emptyDirectoryMessage = loadFailed
    ? 'Visits could not be loaded. Use Sync to try again.'
    : visits.length === 0
    ? isLive
      ? 'No visits are visible to your admin session.'
      : 'No supplier visits have been recorded yet.'
    : 'No visits match the current filters.';

  const monthly = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
    return months.map((m) => ({
      key: `${m.getFullYear()}-${m.getMonth()}`,
      label: m.toLocaleDateString(undefined, { month: 'short' }),
      value: visits.filter((v) => {
        const d = new Date(v.scheduledAt);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      }).length,
    }));
  }, [visits]);
  const monthlyMax = Math.max(1, ...monthly.map((m) => m.value));
  const statusRows = VISIT_STATUSES.map((s) => ({ key: s, label: VISIT_STATUS_LABELS[s], value: visits.filter((v) => v.status === s).length, bar: VISIT_STATUS_BAR[s] })).filter((r) => r.value > 0);
  const upcomingList = useMemo(
    () =>
      visits
        .filter((v) => isUpcoming(v) || v.status === 'pending-confirmation')
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
        .slice(0, 6),
    [visits],
  );
  const analyticsEmpty = isInitialLoad ? 'Loading\u2026' : 'No visits to analyse.';

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
              Supplier visits <SourceTag source={source} />
            </span>
            <span className="text-sm font-bold text-slate-900">
              {isInitialLoad ? DASH : counts.total.toLocaleString()} {counts.total === 1 ? 'visit' : 'visits'} {isLive ? 'visible' : 'recorded'}
            </span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 sm:max-w-md sm:text-right text-pretty">
          {isLive
            ? 'Visits are read under your admin session. RLS has no admin override, so only visits involving companies you belong to appear.'
            : 'Sign in as a platform administrator to load staging visits. Demo visits are shown for design review.'}
        </p>
      </div>

      {loadState === 'error' && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="leading-relaxed">
            <strong className="font-semibold">Visits are unavailable.</strong> {loadError}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const unavailable = loadFailed;
          const content = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {unavailable && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unavailable</span>
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={`font-mono text-2xl font-bold leading-none ${unavailable ? 'text-slate-300' : 'text-slate-900'}`}>
                  {unavailable || isInitialLoad ? DASH : kpi.value.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                {kpi.note && <span className="text-[11px] leading-snug text-slate-400">{kpi.note}</span>}
              </span>
            </>
          );
          if (unavailable) {
            return (
              <div key={kpi.id} className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
                {content}
              </div>
            );
          }
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={kpi.onClick}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              {content}
            </button>
          );
        })}
      </div>

      <div role="tablist" aria-label="Supplier visit views" className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`visits-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`visits-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`visits-panel-${tab}`} aria-labelledby={`visits-tab-${tab}`}>
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SectionCard title="Upcoming & pending" description="Next scheduled visits and requests awaiting confirmation." source={<SourceTag source={source} />}>
                {isInitialLoad ? (
                  <div className="h-40 animate-pulse rounded-lg bg-slate-100" aria-busy="true" aria-label="Loading visits" />
                ) : upcomingList.length === 0 ? (
                  <EmptyState icon={CalendarClock} title={loadFailed ? 'Visits could not be loaded' : 'Nothing upcoming'} body={loadFailed ? undefined : 'Scheduled and pending visits appear here.'} />
                ) : (
                  <>
                    <ul className="flex flex-col divide-y divide-slate-100">
                      {upcomingList.map((v) => (
                        <li key={v.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(v.id)}
                            aria-label={`View visit details for ${visitCode(v.id)}`}
                            className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                          >
                            <span className="flex w-12 shrink-0 flex-col items-center rounded-lg border border-slate-200 bg-white py-1">
                              <span className="text-[10px] font-semibold uppercase text-slate-500">{new Date(v.scheduledAt).toLocaleDateString(undefined, { month: 'short' })}</span>
                              <span className="font-mono text-base font-bold leading-none text-slate-900">{new Date(v.scheduledAt).getDate()}</span>
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="truncate text-xs font-semibold text-slate-900">
                                {v.supplierName ?? 'Supplier'} {'\u2192'} {v.hostName ?? 'Host'}
                              </span>
                              <span className="truncate text-[11px] text-slate-500">{v.purpose || 'No purpose recorded'}</span>
                            </span>
                            <VisitStatusBadge status={v.status} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => openDirectory()} className="inline-flex items-center gap-1 self-start text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                      View all visits
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </>
                )}
              </SectionCard>
            </div>
            <div className="flex flex-col gap-4 lg:col-span-2">
              <SectionCard title="Status distribution" source={<SourceTag source={source} />}>
                <BarList rows={statusRows} emptyText={analyticsEmpty} />
              </SectionCard>
              {isLive && (
                <RestrictedNote>
                  Visits between companies you are not a member of are not returned by RLS. Counts reflect only what your session is authorized to read.
                </RestrictedNote>
              )}
            </div>
          </div>
        )}

        {tab === 'directory' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="relative sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <label className="sr-only" htmlFor="visits-search">
                    Search visits
                  </label>
                  <input
                    id="visits-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company name or visit ID"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:w-64">
                  <FilterSelect id="visits-company-filter" label="Filter by supplier or contractor" value={companyFilter} onChange={setCompanyFilter}>
                    <option value="all">All companies</option>
                    {companyOptions.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </FilterSelect>
                  <FilterSelect id="visits-status-filter" label="Filter by visit status" value={statusFilter} onChange={(v) => setStatusFilter(v as 'all' | VisitStatus)}>
                    <option value="all">All statuses</option>
                    {VISIT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {VISIT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </FilterSelect>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="grid grid-cols-2 gap-2 sm:w-72">
                  <DateInput id="visits-from" label="From" value={fromDate} onChange={setFromDate} />
                  <DateInput id="visits-to" label="To" value={toDate} onChange={setToDate} />
                </div>
                <button
                  type="button"
                  disabled
                  title="UI only. Requires a secure backend function."
                  className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Export Visit Report
                  <UiOnlyTag />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-900">{filtered.length}</strong> of {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
              </span>
              {hasActiveFilters && (
                <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>

            {isInitialLoad ? (
              <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading visits">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={CalendarDays} title={emptyDirectoryMessage} />
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-3 py-3">Visit ID</th>
                        <th scope="col" className="px-2.5 py-3">Supplier Company</th>
                        <th scope="col" className="px-2.5 py-3">Host Contractor / Buyer</th>
                        <th scope="col" className="hidden px-2.5 py-3 xl:table-cell">Requested By</th>
                        <th scope="col" className="px-2.5 py-3">Scheduled</th>
                        <th scope="col" className="hidden px-2.5 py-3 lg:table-cell">Visit Purpose</th>
                        <th scope="col" className="px-2.5 py-3">Status</th>
                        <th scope="col" className="hidden px-2.5 py-3 xl:table-cell">Last Updated</th>
                        <th scope="col" className="px-3 py-3 text-right">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((v) => (
                        <tr key={v.id} className="transition-colors hover:bg-slate-50">
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] font-semibold text-slate-700">{visitCode(v.id)}</td>
                          <td className="px-2.5 py-3 font-medium text-slate-900">{v.supplierName ?? <span className="font-normal text-slate-500">Not visible</span>}</td>
                          <td className="px-2.5 py-3 font-medium text-slate-900">{v.hostName ?? <span className="font-normal text-slate-500">Not visible</span>}</td>
                          <td className="hidden px-2.5 py-3 xl:table-cell">
                            <span className="flex flex-col">
                              <span className="text-slate-900">{requestedByName(v) ?? 'Not visible'}</span>
                              <span className="text-[11px] text-slate-500">{requestedBySide(v)}</span>
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2.5 py-3 text-slate-600">{formatDateTime(v.scheduledAt)}</td>
                          <td className="hidden max-w-56 px-2.5 py-3 lg:table-cell">
                            <span className="line-clamp-2 text-slate-600">{v.purpose || DASH}</span>
                          </td>
                          <td className="px-2.5 py-3">
                            <VisitStatusBadge status={v.status} />
                          </td>
                          <td className="hidden whitespace-nowrap px-2.5 py-3 text-slate-600 xl:table-cell">{formatDate(v.updatedAt)}</td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedId(v.id)}
                              aria-label={`View visit details for ${visitCode(v.id)}`}
                              className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="flex flex-col gap-2 md:hidden">
                  {filtered.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(v.id)}
                        aria-label={`View visit details for ${visitCode(v.id)}`}
                        className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-300 cursor-pointer"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-slate-600">{visitCode(v.id)}</span>
                          <VisitStatusBadge status={v.status} />
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {v.supplierName ?? 'Supplier'} {'\u2192'} {v.hostName ?? 'Host'}
                        </span>
                        <span className="text-xs text-slate-500">{formatDateTime(v.scheduledAt)}</span>
                        {v.purpose && <span className="line-clamp-2 text-xs text-slate-600">{v.purpose}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {tab === 'analytics' && (
          <div className="flex flex-col gap-4">
            {isLive && <RestrictedNote>Analytics are calculated only from visits your session can read. Platform-wide totals need a secure admin reporting function.</RestrictedNote>}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard title="Visit activity over time" description="Visits by scheduled month, last six months." source={<SourceTag source={source} />}>
                {visits.length === 0 ? (
                  <p className="text-xs text-slate-500">{analyticsEmpty}</p>
                ) : (
                  <div className="flex h-44 items-end gap-3" role="img" aria-label={`Visits per month: ${monthly.map((m) => `${m.label} ${m.value}`).join(', ')}`}>
                    {monthly.map((m) => (
                      <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-900">{m.value}</span>
                        <span className="w-full rounded-t-md bg-blue-600" style={{ height: `${Math.max(4, (m.value / monthlyMax) * 100)}%`, opacity: m.value === 0 ? 0.2 : 1 }} />
                        <span className="text-[11px] text-slate-500">{m.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Visit status distribution" source={<SourceTag source={source} />}>
                <BarList rows={statusRows} emptyText={analyticsEmpty} />
              </SectionCard>
              <SectionCard title="Supplier engagement" description="Suppliers with the most visits." source={<SourceTag source={source} />}>
                <BarList rows={topCompanies(visits, 'supplier')} emptyText={analyticsEmpty} />
              </SectionCard>
              <SectionCard title="Contractor engagement" description="Host contractors and buyers receiving the most visits." source={<SourceTag source={source} />}>
                <BarList rows={topCompanies(visits, 'host').map((r) => ({ ...r, bar: 'bg-slate-700' }))} emptyText={analyticsEmpty} />
              </SectionCard>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Check-in durations and kiosk throughput are not tracked yet and are not shown.
            </p>
          </div>
        )}
      </div>

      {selectedVisit && <VisitDetailsDrawer visit={selectedVisit} isLive={isLive} onClose={closeDrawer} />}
    </div>
  );
};
