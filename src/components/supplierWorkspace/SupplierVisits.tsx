import React, { useState, useMemo } from 'react';
import {
  CalendarDays, Lock, MapPin, Plus, Trash2, Clock,
  Building2, User, Package, CheckCircle2, XCircle, AlertCircle,
  CalendarPlus, X, ChevronRight,
} from 'lucide-react';
import { SupplierVisit, VisitFollowUp, VisitTask, VisitStatus, VisitPurpose } from '../../data/supplierTypes';
import { addFollowUp, deleteFollowUp, createVisit, updateVisitStatus, addVisitTask, updateVisitTask } from '../../data/supplierService';
import { StatusPill, btnPrimary, btnSecondary, btnGhost, inputCls, labelCls } from '../NetworkShared';
import { ProfileDialog } from '../ProfileDialog';
import { DemoNote, EmptyState, Field, KpiCard, SubTabs, fmtDate } from '../marketHub/MarketHubShared';
import { PageHeader, SW } from './SupplierShared';

type Filter = 'all' | 'upcoming' | 'completed' | 'cancelled' | 'followup';

const STATUS_META: Record<VisitStatus, { label: string; tone: 'blue' | 'slate' | 'amber' | 'gold' }> = {
  scheduled: { label: 'Scheduled', tone: 'blue' },
  'checked-in': { label: 'Checked In', tone: 'amber' },
  'in-meeting': { label: 'In Meeting', tone: 'amber' },
  completed: { label: 'Completed', tone: 'slate' },
  cancelled: { label: 'Cancelled', tone: 'slate' },
  'no-show': { label: 'No Show', tone: 'slate' },
};

const PURPOSES: VisitPurpose[] = ['Sample Demonstration', 'Contract Negotiation', 'RFQ Discussion', 'Vendor Onboarding', 'Facility Inspection', 'Commercial Review', 'Other'];

const TIMELINE_STEPS: { status: VisitStatus; label: string }[] = [
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'checked-in', label: 'Checked In' },
  { status: 'in-meeting', label: 'In Meeting' },
  { status: 'completed', label: 'Completed' },
];

const sideOf = (sw: SW): 'supplier' | 'contractor' => (sw.company.kind === 'contractor' ? 'contractor' : 'supplier');

const fmtDateTime = (s?: string) => (s ? fmtDate(s.split('T')[0] ?? s) + (s.includes('T') ? ' ' + s.split('T')[1]?.slice(0, 5) : '') : '—');

const PRIORITY_META: Record<VisitTask['priority'], { label: string; cls: string }> = {
  low: { label: 'Low', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'High', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const TASK_STATUS_META: Record<VisitTask['status'], { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  'in-progress': { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

// ─── Visit Details Modal ───────────────────────────────────────────
const VisitDetailsModal: React.FC<{ sw: SW; visit: SupplierVisit; onClose: () => void }> = ({ sw, visit, onClose }) => {
  const [note, setNote] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPriority, setTaskPriority] = useState<VisitTask['priority']>('medium');

  const side = sideOf(sw);
  const notes = sw.store.followUps.filter((f) => f.visitId === visit.id && f.companyId === sw.company.id && f.side === side);
  const tasks = sw.store.visitTasks.filter((t) => t.visitId === visit.id && t.companyId === sw.company.id && t.side === side);
  const canManage = sw.can('visits.manage');
  const isCancelled = visit.status === 'cancelled' || visit.status === 'no-show';

  const saveNote = () => {
    if (sw.run(addFollowUp(sw.ctx, visit.id, note), 'Follow-up note saved')) setNote('');
  };

  const removeNote = (id: string) => {
    sw.run(deleteFollowUp(sw.ctx, id), 'Note deleted');
  };

  const saveTask = () => {
    if (sw.run(addVisitTask(sw.ctx, visit.id, { description: taskDesc, assignedTo: taskAssignee, dueDate: taskDue, priority: taskPriority }), 'Follow-up task created')) {
      setShowTaskForm(false); setTaskDesc(''); setTaskAssignee(''); setTaskDue(''); setTaskPriority('medium');
    }
  };

  const cycleTaskStatus = (taskId: string, current: VisitTask['status']) => {
    const next: VisitTask['status'] = current === 'pending' ? 'in-progress' : current === 'in-progress' ? 'completed' : 'pending';
    sw.run(updateVisitTask(sw.ctx, taskId, next), 'Task updated');
  };

  const timelineActiveIndex = TIMELINE_STEPS.findIndex((s) => s.status === visit.status);

  return (
    <ProfileDialog
      title={`Visit to ${visit.hostCompany}`}
      subtitle={`${fmtDate(visit.date)} · ${visit.time}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">Visit ID: {visit.id}</span>
          <button type="button" onClick={onClose} className={`${btnGhost} text-sm`}>Close</button>
        </div>
      }
    >
      <div className="px-5 py-4 space-y-5">
        {/* Section A — Header / Status / Actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <StatusPill tone={STATUS_META[visit.status].tone}>{STATUS_META[visit.status].label}</StatusPill>
            {visit.visitType === 'walk-in' && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Walk-in</span>}
            {visit.kioskBadge && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">{visit.kioskBadge}</span>}
          </div>
          {canManage && !isCancelled && (
            <div className="flex items-center gap-1.5">
              {visit.status === 'scheduled' && (
                <>
                  <button type="button" onClick={() => sw.run(updateVisitStatus(sw.ctx, visit.id, 'checked-in'), 'Checked in')} className={`${btnGhost} text-xs`}>Check In</button>
                  <button type="button" onClick={() => sw.run(updateVisitStatus(sw.ctx, visit.id, 'cancelled'), 'Visit cancelled')} className="text-xs px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold">Cancel</button>
                </>
              )}
              {visit.status === 'checked-in' && (
                <button type="button" onClick={() => sw.run(updateVisitStatus(sw.ctx, visit.id, 'completed'), 'Visit completed')} className={`${btnGhost} text-xs`}>Check Out</button>
              )}
              {visit.status === 'in-meeting' && (
                <button type="button" onClick={() => sw.run(updateVisitStatus(sw.ctx, visit.id, 'completed'), 'Visit completed')} className={`${btnGhost} text-xs`}>Check Out</button>
              )}
            </div>
          )}
        </div>

        {/* Section B — Participants */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Visiting Organization</p>
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0"><Building2 className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{sw.company.profile.tradingName}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><User className="w-3 h-3" />{visit.representative}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Created by {visit.createdByName}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Host Organization</p>
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Building2 className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{visit.hostCompany}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><User className="w-3 h-3" />{visit.hostContact}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section C — Visit Info */}
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-200 p-3">
          <Field label="Purpose" value={visit.purpose} />
          <Field label="Location" value={visit.location} />
          <Field label="Scheduled" value={`${fmtDate(visit.date)} · ${visit.time}`} />
          <Field label="Visit type" value={visit.visitType === 'walk-in' ? 'Walk-in' : 'Scheduled'} />
          <Field label="Check-in" value={fmtDateTime(visit.checkInAt)} />
          <Field label="Check-out" value={fmtDateTime(visit.checkOutAt)} />
          {visit.productsDiscussed.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-[11px] font-semibold text-slate-500 mb-1">Products discussed</p>
              <div className="flex flex-wrap gap-1.5">
                {visit.productsDiscussed.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                    <Package className="w-3 h-3" />{p}
                  </span>
                ))}
              </div>
            </div>
          )}
          {visit.remarks && (
            <div className="sm:col-span-2">
              <Field label="Remarks" value={visit.remarks} />
            </div>
          )}
        </div>

        {/* Section D — Timeline */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Visit Timeline</p>
          {isCancelled ? (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">
              {visit.status === 'cancelled' ? <XCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {visit.status === 'cancelled' ? 'This visit was cancelled.' : 'The visitor did not show up.'}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {TIMELINE_STEPS.map((step, i) => {
                const isActive = i <= timelineActiveIndex;
                const isCurrent = i === timelineActiveIndex;
                return (
                  <React.Fragment key={step.status}>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {step.label}
                      {isCurrent && visit.checkInAt && step.status === 'checked-in' && <span className="text-[10px] text-blue-400">{fmtDateTime(visit.checkInAt)}</span>}
                      {isCurrent && visit.checkOutAt && step.status === 'completed' && <span className="text-[10px] text-blue-400">{fmtDateTime(visit.checkOutAt)}</span>}
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-blue-300' : 'text-slate-200'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Section E — Follow-up Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Follow-up Notes ({notes.length})</p>
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" />Private to your workspace</span>
          </div>
          <div className="space-y-2">
            {notes.map((f) => (
              <div key={f.id} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{f.note}</p>
                    <p className="mt-1 text-xs text-slate-500">{f.by} · {fmtDate(f.at)}</p>
                  </div>
                  {canManage && f.byId === sw.user.id && (
                    <button type="button" onClick={() => removeNote(f.id)} className="text-slate-400 hover:text-rose-600 transition-colors shrink-0" title="Delete note">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {notes.length === 0 && <p className="text-sm text-slate-500">No follow-up notes yet.</p>}
          </div>
          {canManage && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Send revised quotation for rebar by Thursday" className={`${inputCls} flex-1`} />
              <button type="button" onClick={saveNote} className={`${btnPrimary} sm:self-end`}>Save Note</button>
            </div>
          )}
        </div>

        {/* Section F — Follow-up Tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Follow-up Tasks ({tasks.length})</p>
            {canManage && !showTaskForm && (
              <button type="button" onClick={() => setShowTaskForm(true)} className="text-xs font-semibold text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />Add Task
              </button>
            )}
          </div>
          {showTaskForm && (
            <div className="rounded-lg border border-slate-200 p-3 mb-2 space-y-2 bg-slate-50">
              <input value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Task description" className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <input value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} placeholder="Assigned to" className={inputCls} />
                <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as VisitTask['priority'])} className={`${inputCls} w-auto`}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button type="button" onClick={saveTask} className={btnPrimary}>Save</button>
                <button type="button" onClick={() => setShowTaskForm(false)} className={btnGhost}>Cancel</button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 truncate">{t.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.assignedTo} · Due {fmtDate(t.dueDate)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${PRIORITY_META[t.priority].cls}`}>{PRIORITY_META[t.priority].label}</span>
                  {canManage ? (
                    <button type="button" onClick={() => cycleTaskStatus(t.id, t.status)} className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${TASK_STATUS_META[t.status].cls}`}>{TASK_STATUS_META[t.status].label}</button>
                  ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${TASK_STATUS_META[t.status].cls}`}>{TASK_STATUS_META[t.status].label}</span>
                  )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-slate-500">No follow-up tasks yet.</p>}
          </div>
        </div>
      </div>
    </ProfileDialog>
  );
};

// ─── Create Visit Modal ────────────────────────────────────────────
const CreateVisitModal: React.FC<{ sw: SW; onClose: () => void }> = ({ sw, onClose }) => {
  const [hostCompany, setHostCompany] = useState('');
  const [hostContact, setHostContact] = useState('');
  const [representative, setRepresentative] = useState(sw.user.name);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState<VisitPurpose>('Commercial Review');
  const [products, setProducts] = useState('');
  const [remarks, setRemarks] = useState('');

  const save = () => {
    const r = createVisit(sw.ctx, {
      hostCompany, hostContact: hostContact || 'TBD',
      representative, date, time: time || '10:00 AM',
      location: location || 'TBD', purpose,
      productsDiscussed: products.split(',').map((s) => s.trim()).filter(Boolean),
      remarks: remarks || undefined,
    });
    if (sw.run(r, 'Visit scheduled')) onClose();
  };

  return (
    <ProfileDialog title="Schedule a Visit" subtitle="Create a new visit record" onClose={onClose} size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button type="button" onClick={save} className={btnPrimary}>Schedule Visit</button>
        </div>
      }
    >
      <div className="px-5 py-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Host Company *</label>
            <input value={hostCompany} onChange={(e) => setHostCompany(e.target.value)} placeholder="e.g. Al Habtoor Contracting" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Host Contact</label>
            <input value={hostContact} onChange={(e) => setHostContact(e.target.value)} placeholder="e.g. Mohammed Ali" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Representative *</label>
            <input value={representative} onChange={(e) => setRepresentative(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Visit Purpose</label>
            <select value={purpose} onChange={(e) => setPurpose(e.target.value as VisitPurpose)} className={inputCls}>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Al Habtoor HQ, Dubai" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Products to Discuss (comma-separated)</label>
            <input value={products} onChange={(e) => setProducts(e.target.value)} placeholder="e.g. B500B Rebar, Wire Rod" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Additional Remarks</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Optional notes" className={inputCls} />
          </div>
        </div>
        <DemoNote>For demo purposes, the host company will not receive a confirmation request. Visit records are simulated.</DemoNote>
      </div>
    </ProfileDialog>
  );
};

// ─── Main Component ────────────────────────────────────────────────
export const SupplierVisits: React.FC<{ sw: SW }> = ({ sw }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const side = sideOf(sw);
  const visits = useMemo(
    () => sw.store.visits.filter((v) => v.companyId === sw.company.id || v.hostCompanyId === sw.company.id).sort((a, b) => b.date.localeCompare(a.date)),
    [sw.store.visits, sw.company.id],
  );

  const upcoming = visits.filter((v) => v.status === 'scheduled' || v.status === 'checked-in' || v.status === 'in-meeting');
  const completed = visits.filter((v) => v.status === 'completed');
  const cancelled = visits.filter((v) => v.status === 'cancelled' || v.status === 'no-show');
  const thisMonth = visits.filter((v) => {
    const d = new Date(v.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const followupNotes = sw.store.followUps.filter((f) => f.companyId === sw.company.id && f.side === side);
  const visitsWithFollowup = visits.filter((v) => followupNotes.some((f) => f.visitId === v.id));
  const pendingTasks = sw.store.visitTasks.filter((t) => t.companyId === sw.company.id && t.side === side && t.status !== 'completed');
  const repeatCompanies = new Set(visits.filter((v) => visits.some((v2) => v2.id !== v.id && v2.hostCompany === v.hostCompany)).map((v) => v.hostCompany));

  const shown = filter === 'upcoming' ? upcoming
    : filter === 'completed' ? completed
    : filter === 'cancelled' ? cancelled
    : filter === 'followup' ? visitsWithFollowup
    : visits;

  const filtered = search
    ? shown.filter((v) =>
        v.hostCompany.toLowerCase().includes(search.toLowerCase()) ||
        v.representative.toLowerCase().includes(search.toLowerCase()) ||
        v.location.toLowerCase().includes(search.toLowerCase()) ||
        v.purpose.toLowerCase().includes(search.toLowerCase()) ||
        v.productsDiscussed.join(' ').toLowerCase().includes(search.toLowerCase()))
    : shown;

  const open = visits.find((v) => v.id === openId);

  return (
    <div>
      <PageHeader
        eyebrow="Visits"
        title="Office visits"
        subtitle="Manage supplier visits, meetings, check-ins and follow-up activities through SOKO."
        actions={sw.can('visits.manage') && <button type="button" onClick={() => setShowCreate(true)} className={`${btnPrimary} text-sm`}><CalendarPlus className="w-4 h-4" />Schedule Visit</button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Upcoming" value={upcoming.length} />
        <KpiCard label="This Month" value={thisMonth.length} />
        <KpiCard label="Completed" value={completed.length} />
        <KpiCard label="Follow-ups" value={visitsWithFollowup.length} />
        <KpiCard label="Pending Tasks" value={pendingTasks.length} />
        <KpiCard label="Repeat Visits" value={repeatCompanies.size} />
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <SubTabs
          tabs={[
            { id: 'all' as Filter, label: 'All', count: visits.length },
            { id: 'upcoming' as Filter, label: 'Upcoming', count: upcoming.length },
            { id: 'completed' as Filter, label: 'Completed', count: completed.length },
            { id: 'followup' as Filter, label: 'Follow-up', count: visitsWithFollowup.length },
            { id: 'cancelled' as Filter, label: 'Cancelled', count: cancelled.length },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search visits…" className={`${inputCls} sm:w-56 sm:ml-auto`} />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={<CalendarDays className="w-5 h-5" />} title="No visits" text="Visits and meetings will appear here once scheduled." />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 font-semibold">Date & Time</th>
                <th className="px-3 py-2.5 font-semibold">Host Company</th>
                <th className="px-3 py-2.5 font-semibold">Representative</th>
                <th className="px-3 py-2.5 font-semibold">Purpose</th>
                <th className="px-3 py-2.5 font-semibold">Products</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Follow-up</th>
                <th className="px-4 py-2.5 font-semibold">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => {
                const nNotes = sw.store.followUps.filter((f) => f.visitId === v.id && f.companyId === sw.company.id && f.side === side).length;
                const nTasks = sw.store.visitTasks.filter((t) => t.visitId === v.id && t.companyId === sw.company.id && t.side === side).length;
                const nPending = sw.store.visitTasks.filter((t) => t.visitId === v.id && t.companyId === sw.company.id && t.side === side && t.status !== 'completed').length;
                return (
                  <tr key={v.id} onClick={() => setOpenId(v.id)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-slate-900">{fmtDate(v.date)}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{v.time}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900">{v.hostCompany}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{v.location}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{v.representative}</td>
                    <td className="px-3 py-3 text-slate-700">{v.purpose}</td>
                    <td className="px-3 py-3 text-slate-600 max-w-[180px] truncate">{v.productsDiscussed.join(', ') || '—'}</td>
                    <td className="px-3 py-3"><StatusPill tone={STATUS_META[v.status].tone}>{STATUS_META[v.status].label}</StatusPill></td>
                    <td className="px-3 py-3 text-xs font-semibold whitespace-nowrap">
                      {nNotes > 0 ? <span className="text-blue-700">{nNotes} note{nNotes > 1 ? 's' : ''}</span> : <span className="text-slate-400">No notes</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                      {nTasks > 0 ? <span className={nPending > 0 ? 'text-amber-700' : 'text-emerald-700'}>{nPending} pending</span> : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <DemoNote>Visit records are simulated from the SOKO office kiosk demo. Kiosk check-in integration is prepared for future use.</DemoNote>
      </div>

      {open && <VisitDetailsModal sw={sw} visit={open} onClose={() => setOpenId(null)} />}
      {showCreate && <CreateVisitModal sw={sw} onClose={() => setShowCreate(false)} />}
    </div>
  );
};
