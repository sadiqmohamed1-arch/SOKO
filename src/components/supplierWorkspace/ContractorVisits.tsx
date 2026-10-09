import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock, Info, List, Lock, MapPin, Search,
} from 'lucide-react';
import { SupplierVisit, VisitPurpose } from '../../data/supplierTypes';
import { fmtDate } from '../marketHub/MarketHubShared';
import {
  SokoAvatar, SokoEmptyState, SokoKpiCell, SokoStatusIndicator, SokoStatusTone, SokoTabs, sokoCard, sokoTokens,
} from '../sokoDesignSystem/SokoComponents';
import { SW } from './SupplierShared';
import { CreateVisitModal, PURPOSES, VisitDetailsModal } from './SupplierVisits';

type Stage = 'pending' | 'scheduled' | 'confirmed' | 'checked-in' | 'completed' | 'cancelled';
type StageFilter = 'all' | Stage;
type DateFilter = 'all' | 'upcoming' | 'past' | 'month';
type View = 'list' | 'calendar';

/**
 * The data model has no separate "confirmed" status: confirmVisit moves a visit to
 * `scheduled` and records who confirmed it. A scheduled visit with a confirmer is shown
 * as Confirmed; one without (external host) stays Scheduled.
 */
const stageOf = (v: SupplierVisit): Stage => {
  switch (v.status) {
    case 'pending-confirmation': return 'pending';
    case 'scheduled': return v.confirmedByName ? 'confirmed' : 'scheduled';
    case 'checked-in':
    case 'in-meeting': return 'checked-in';
    case 'completed': return 'completed';
    default: return 'cancelled';
  }
};

const statusOf = (v: SupplierVisit): { label: string; tone: SokoStatusTone } => {
  switch (v.status) {
    case 'pending-confirmation': return { label: 'Pending host confirmation', tone: 'warning' };
    case 'scheduled': return v.confirmedByName ? { label: 'Confirmed', tone: 'info' } : { label: 'Scheduled', tone: 'info' };
    case 'checked-in': return { label: 'Checked in', tone: 'success' };
    case 'in-meeting': return { label: 'In meeting', tone: 'success' };
    case 'completed': return { label: 'Completed', tone: 'neutral' };
    case 'cancelled': return { label: 'Cancelled', tone: 'critical' };
    case 'declined': return { label: 'Declined by host', tone: 'critical' };
    case 'no-show': return { label: 'No show', tone: 'critical' };
  }
};

const selectCls = `${sokoTokens.focus} h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 hover:border-slate-300 transition-colors cursor-pointer`;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const localKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface VisitRow {
  visit: SupplierVisit;
  supplierName: string;
  supplierCompanyId?: string;
  incoming: boolean;
  privateNotes: number;
}

// ─── Calendar ──────────────────────────────────────────────────────
const VisitCalendar: React.FC<{ rows: VisitRow[]; todayKey: string; onOpen: (id: string) => void }> = ({ rows, todayKey, onOpen }) => {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const byDay = useMemo(() => {
    const m = new Map<string, VisitRow[]>();
    rows.forEach((r) => m.set(r.visit.date, [...(m.get(r.visit.date) ?? []), r]));
    return m;
  }, [rows]);

  const offset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= daysInMonth ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const monthLabel = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const inMonth = rows.filter((r) => r.visit.date.startsWith(localKey(month).slice(0, 7))).length;

  return (
    <section className={`${sokoCard} overflow-hidden`} aria-label="Visits calendar">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">{monthLabel}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{inMonth} visit{inMonth === 1 ? '' : 's'} this month</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className={`${sokoTokens.focus} w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer`}><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }} className={`${sokoTokens.focus} h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer`}>Today</button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className={`${sokoTokens.focus} w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer`}><ChevronRight className="w-4 h-4" /></button>
        </div>
      </header>
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
            {WEEKDAYS.map((d) => <div key={d} className={`${sokoTokens.eyebrow} px-3 py-2`}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const key = d ? localKey(d) : `empty-${i}`;
              const dayRows = d ? byDay.get(key) ?? [] : [];
              const isToday = key === todayKey;
              return (
                <div key={key} className={`min-h-28 border-b border-r border-slate-100 p-2 flex flex-col gap-1 ${d ? '' : 'bg-slate-50/40'}`}>
                  {d && (
                    <span className={`self-start text-xs tabular-nums w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-blue-600 text-white font-semibold' : 'text-slate-500'}`}>{d.getDate()}</span>
                  )}
                  {dayRows.map((r) => {
                    const s = statusOf(r.visit);
                    const dot = s.tone === 'warning' ? 'bg-amber-500' : s.tone === 'success' ? 'bg-emerald-500' : s.tone === 'critical' ? 'bg-rose-500' : s.tone === 'info' ? 'bg-blue-500' : 'bg-slate-400';
                    return (
                      <button key={r.visit.id} type="button" onClick={() => onOpen(r.visit.id)}
                        className={`${sokoTokens.focus} w-full text-left rounded-lg border border-slate-200 bg-white px-2 py-1.5 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer`}>
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-800">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden />
                          <span className="truncate">{r.supplierName}</span>
                        </span>
                        <span className="block font-mono text-[10px] text-slate-500 mt-0.5">{r.visit.time} · {s.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Main page ─────────────────────────────────────────────────────
export const ContractorVisits: React.FC<{ sw: SW }> = ({ sw }) => {
  const [view, setView] = useState<View>('list');
  const [stage, setStage] = useState<StageFilter>('all');
  const [search, setSearch] = useState('');
  const [supplier, setSupplier] = useState('all');
  const [visitor, setVisitor] = useState('all');
  const [purpose, setPurpose] = useState<'all' | VisitPurpose>('all');
  const [dateRange, setDateRange] = useState<DateFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const canSchedule = sw.can('visits.manage');
  const companyName = sw.company.profile.tradingName;
  const todayKey = localKey(new Date());

  const rows = useMemo<VisitRow[]>(() => {
    const nameOf = (id: string) => sw.store.companies.find((c) => c.id === id)?.profile.tradingName;
    return sw.store.visits
      .filter((v) => v.companyId === sw.company.id || v.hostCompanyId === sw.company.id)
      .map((v) => {
        const incoming = v.hostCompanyId === sw.company.id;
        return {
          visit: v,
          incoming,
          supplierName: incoming ? nameOf(v.companyId) ?? 'Unknown company' : v.hostCompany,
          supplierCompanyId: incoming ? v.companyId : v.hostCompanyId,
          privateNotes: sw.store.followUps.filter((f) => f.visitId === v.id && f.companyId === sw.company.id && f.side === 'contractor').length,
        };
      })
      .sort((a, b) => b.visit.date.localeCompare(a.visit.date) || b.visit.time.localeCompare(a.visit.time));
  }, [sw.store.visits, sw.store.companies, sw.store.followUps, sw.company.id]);

  const counts = useMemo(() => {
    const c: Record<Stage, number> = { pending: 0, scheduled: 0, confirmed: 0, 'checked-in': 0, completed: 0, cancelled: 0 };
    rows.forEach((r) => { c[stageOf(r.visit)] += 1; });
    return c;
  }, [rows]);

  const supplierOptions = useMemo(() => [...new Set(rows.map((r) => r.supplierName))].sort(), [rows]);
  const visitorOptions = useMemo(() => [...new Set(rows.map((r) => r.visit.representative))].sort(), [rows]);

  const filtered = rows.filter((r) => {
    const v = r.visit;
    if (stage !== 'all' && stageOf(v) !== stage) return false;
    if (supplier !== 'all' && r.supplierName !== supplier) return false;
    if (visitor !== 'all' && v.representative !== visitor) return false;
    if (purpose !== 'all' && v.purpose !== purpose) return false;
    if (dateRange === 'upcoming' && v.date < todayKey) return false;
    if (dateRange === 'past' && v.date >= todayKey) return false;
    if (dateRange === 'month' && v.date.slice(0, 7) !== todayKey.slice(0, 7)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [r.supplierName, v.representative, v.hostContact, v.location, v.purpose, ...v.productsDiscussed].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const hasFilters = stage !== 'all' || supplier !== 'all' || visitor !== 'all' || purpose !== 'all' || dateRange !== 'all' || search.trim() !== '';
  const clearFilters = () => { setStage('all'); setSupplier('all'); setVisitor('all'); setPurpose('all'); setDateRange('all'); setSearch(''); };

  const vendorFor = (supplierCompanyId?: string) =>
    supplierCompanyId ? sw.store.vendorRecords.find((vr) => vr.companyId === sw.company.id && vr.supplierCompanyId === supplierCompanyId) : undefined;

  const openVendor = (vendorId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('vendor', vendorId);
    window.history.replaceState(window.history.state, '', url);
    setOpenId(null);
    sw.go('sw-vendors');
  };

  const openRow = rows.find((r) => r.visit.id === openId);
  const openVendorRecord = openRow ? vendorFor(openRow.supplierCompanyId) : undefined;

  const scheduleButton = canSchedule ? (
    <button type="button" onClick={() => setShowCreate(true)}
      className={`${sokoTokens.focus} inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer`}>
      <CalendarPlus className="w-4 h-4" />Schedule visit
    </button>
  ) : null;

  const actionFor = (r: VisitRow) => {
    const needsResponse = r.incoming && r.visit.status === 'pending-confirmation' && canSchedule;
    return needsResponse ? 'Respond' : 'View';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={sokoTokens.eyebrow}>Contractor workspace · Visits</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 text-balance">Supplier visits</h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-2xl text-pretty">
            Plan, confirm and track supplier visits to {companyName}. Visits with linked SOKO companies are one shared record seen by both workspaces.
          </p>
        </div>
        {scheduleButton}
      </header>

      {/* Metrics */}
      <section aria-label="Visit overview" className={`${sokoCard} grid grid-cols-2 md:grid-cols-5 divide-slate-100 [&>*]:border-slate-100 [&>*:not(:last-child)]:border-b md:[&>*:not(:last-child)]:border-b-0 md:[&>*:not(:last-child)]:border-r overflow-hidden`}>
        <SokoKpiCell label="Scheduled" value={counts.scheduled + counts.confirmed} detail={`${counts.confirmed} confirmed by host`} onClick={() => setStage('scheduled')} hint="Upcoming visits with an agreed time. Includes host-confirmed visits." />
        <SokoKpiCell label="Pending confirmation" value={counts.pending} detail="Awaiting host response" onClick={() => setStage('pending')} hint="Visit requests the host company has not yet confirmed or declined." />
        <SokoKpiCell label="Checked in" value={counts['checked-in']} detail="On site now" onClick={() => setStage('checked-in')} hint="Visitors recorded as checked in, including those in a meeting." />
        <SokoKpiCell label="Completed" value={counts.completed} detail="Checked out" onClick={() => setStage('completed')} />
        <SokoKpiCell label="Cancelled" value={counts.cancelled} detail="Incl. declined & no-show" onClick={() => setStage('cancelled')} />
      </section>

      {/* Toolbar */}
      <section className={`${sokoCard} flex flex-col gap-4 p-4 sm:p-5`} aria-label="Filter visits">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="overflow-x-auto">
            <SokoTabs<StageFilter>
              label="Visit status"
              variant="underline"
              active={stage}
              onChange={setStage}
              tabs={[
                { id: 'all', label: 'All', count: rows.length },
                { id: 'pending', label: 'Pending confirmation', count: counts.pending },
                { id: 'scheduled', label: 'Scheduled', count: counts.scheduled },
                { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
                { id: 'checked-in', label: 'Checked in', count: counts['checked-in'] },
                { id: 'completed', label: 'Completed', count: counts.completed },
                { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
              ]}
            />
          </div>
          <div className="w-full sm:w-56">
            <SokoTabs<View>
              label="Layout"
              active={view}
              onChange={setView}
              tabs={[{ id: 'list', label: 'List' }, { id: 'calendar', label: 'Calendar' }]}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] gap-2">
          <label className="relative">
            <span className="sr-only">Search visits</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search supplier, visitor, host, product…"
              className={`${sokoTokens.focus} h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-300 transition-colors`} />
          </label>
          <select aria-label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} className={selectCls}>
            <option value="all">All suppliers</option>
            {supplierOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Visitor" value={visitor} onChange={(e) => setVisitor(e.target.value)} className={selectCls}>
            <option value="all">All visitors</option>
            {visitorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Visit purpose" value={purpose} onChange={(e) => setPurpose(e.target.value as 'all' | VisitPurpose)} className={selectCls}>
            <option value="all">All purposes</option>
            {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select aria-label="Date" value={dateRange} onChange={(e) => setDateRange(e.target.value as DateFilter)} className={selectCls}>
            <option value="all">Any date</option>
            <option value="upcoming">Today &amp; upcoming</option>
            <option value="month">This month</option>
            <option value="past">Past visits</option>
          </select>
        </div>
        {hasFilters && (
          <p className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Showing {filtered.length} of {rows.length} visits</span>
            <button type="button" onClick={clearFilters} className={`${sokoTokens.focus} font-medium text-blue-700 hover:text-blue-800 rounded-md px-1 cursor-pointer`}>Clear filters</button>
          </p>
        )}
      </section>

      {/* Content */}
      {rows.length === 0 ? (
        <div className={`${sokoCard} py-10`}>
          <SokoEmptyState icon={CalendarDays} title="No supplier visits yet"
            description={`Visit requests from suppliers and visits you schedule will appear here. Nothing has been recorded for ${companyName}.`}
            action={scheduleButton} />
        </div>
      ) : view === 'calendar' ? (
        <VisitCalendar rows={filtered} todayKey={todayKey} onOpen={setOpenId} />
      ) : filtered.length === 0 ? (
        <div className={`${sokoCard} py-10`}>
          <SokoEmptyState icon={Search} title="No visits match these filters" description="Try another status, supplier or date range."
            action={<button type="button" onClick={clearFilters} className={`${sokoTokens.focus} h-9 px-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer`}>Clear filters</button>} />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <section className={`${sokoCard} hidden md:block overflow-x-auto`} aria-label="Visits">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100 bg-slate-50/60">
                  {['Supplier', 'Visitor', 'Host', 'Date & time', 'Purpose', 'Status', ''].map((h, i) => (
                    <th key={i} scope="col" className={`${sokoTokens.eyebrow} px-4 py-3 font-medium ${i === 6 ? 'text-right' : ''}`}>{h || <span className="sr-only">Actions</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const v = r.visit;
                  const s = statusOf(v);
                  const vendor = vendorFor(r.supplierCompanyId);
                  const action = actionFor(r);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <div className="flex items-center gap-3 min-w-0">
                          <SokoAvatar name={r.supplierName} tone="dark" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{r.supplierName}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {r.incoming ? `Visiting ${companyName}` : `${companyName} visiting`}
                              {!r.supplierCompanyId && ' · External'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{v.representative}</td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="text-slate-700 truncate">{v.hostContact}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" aria-hidden />{v.location}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-slate-900 tabular-nums">{fmtDate(v.date)}</p>
                        <p className="font-mono text-[11px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden />{v.time}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{v.purpose}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <SokoStatusIndicator label={s.label} tone={s.tone} />
                          {r.privateNotes > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title={`Private to ${companyName}`}>
                              <Lock className="w-3 h-3" aria-hidden />{r.privateNotes} private note{r.privateNotes === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {vendor && (
                            <button type="button" onClick={() => openVendor(vendor.id)}
                              className={`${sokoTokens.focus} inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap`}>
                              Profile<ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                            </button>
                          )}
                          <button type="button" onClick={() => setOpenId(v.id)} aria-label={`${action} visit from ${r.supplierName} on ${fmtDate(v.date)}`}
                            className={`${sokoTokens.focus} h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${action === 'Respond' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                            {action}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Mobile cards */}
          <ul className="md:hidden flex flex-col gap-3" aria-label="Visits">
            {filtered.map((r) => {
              const v = r.visit;
              const s = statusOf(v);
              return (
                <li key={v.id}>
                  <button type="button" onClick={() => setOpenId(v.id)} className={`${sokoCard} ${sokoTokens.focus} w-full text-left p-4 flex flex-col gap-3 cursor-pointer`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <SokoAvatar name={r.supplierName} tone="dark" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{r.supplierName}</p>
                          <p className="text-xs text-slate-500 truncate">{v.purpose}</p>
                        </div>
                      </div>
                      <SokoStatusIndicator label={s.label} tone={s.tone} />
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div><dt className="text-slate-500">Visitor</dt><dd className="text-slate-800 font-medium truncate">{v.representative}</dd></div>
                      <div><dt className="text-slate-500">Host</dt><dd className="text-slate-800 font-medium truncate">{v.hostContact}</dd></div>
                      <div className="col-span-2"><dt className="text-slate-500">When</dt><dd className="text-slate-800 font-medium">{fmtDate(v.date)} · {v.time}</dd></div>
                    </dl>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" aria-hidden />
        Visit status changes only through host confirmation, check-in and check-out — nothing is confirmed or checked in automatically. Notes and follow-up tasks you add stay private to {companyName}; supplier-side notes are never shown here.
      </p>

      {openRow && (
        <VisitDetailsModal
          sw={sw}
          visit={openRow.visit}
          onClose={() => setOpenId(null)}
          onViewSupplier={openVendorRecord ? () => openVendor(openVendorRecord.id) : undefined}
        />
      )}
      {showCreate && <CreateVisitModal sw={sw} onClose={() => setShowCreate(false)} />}
    </div>
  );
};
