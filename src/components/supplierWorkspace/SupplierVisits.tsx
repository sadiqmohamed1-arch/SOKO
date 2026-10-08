import React, { useState, useMemo } from 'react';
import {
  CalendarDays, Lock, MapPin, Plus, Trash2, Clock,
  Building2, User, Package, CheckCircle2, XCircle, AlertCircle,
  CalendarPlus, X, ChevronRight, Search, ShieldCheck, ExternalLink,
} from 'lucide-react';
import { SupplierVisit, VisitFollowUp, VisitTask, VisitStatus, VisitPurpose, CompanyRecord } from '../../data/supplierTypes';
import { addFollowUp, deleteFollowUp, createVisit, updateVisitStatus, addVisitTask, updateVisitTask, confirmVisit, declineVisit, saveCompanyContact, isSavedCorporateContact } from '../../data/supplierService';
import { StatusPill, btnPrimary, btnSecondary, btnGhost, inputCls, labelCls } from '../NetworkShared';
import { ProfileDialog } from '../ProfileDialog';
import { DemoNote, EmptyState, Field, KpiCard, SubTabs, fmtDate } from '../marketHub/MarketHubShared';
import { PageHeader, SW } from './SupplierShared';

type Filter = 'all' | 'upcoming' | 'completed' | 'cancelled' | 'followup' | 'pending';

const STATUS_META: Record<VisitStatus, { label: string; tone: 'blue' | 'slate' | 'amber' | 'gold' }> = {
  'pending-confirmation': { label: 'Pending Confirmation', tone: 'amber' },
  scheduled: { label: 'Scheduled', tone: 'blue' },
  'checked-in': { label: 'Checked In', tone: 'amber' },
  'in-meeting': { label: 'In Meeting', tone: 'amber' },
  completed: { label: 'Completed', tone: 'slate' },
  cancelled: { label: 'Cancelled', tone: 'slate' },
  'no-show': { label: 'No Show', tone: 'slate' },
  declined: { label: 'Declined', tone: 'amber' },
};

const PURPOSES: VisitPurpose[] = ['Sample Demonstration', 'Contract Negotiation', 'RFQ Discussion', 'Vendor Onboarding', 'Facility Inspection', 'Commercial Review', 'Other'];

const TIMELINE_STEPS: { status: VisitStatus; label: string }[] = [
  { status: 'pending-confirmation', label: 'Pending' },
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
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);

  const side = sideOf(sw);
  const notes = sw.store.followUps.filter((f) => f.visitId === visit.id && f.companyId === sw.company.id && f.side === side);
  const tasks = sw.store.visitTasks.filter((t) => t.visitId === visit.id && t.companyId === sw.company.id && t.side === side);
  const canManage = sw.can('visits.manage');
  const isCancelled = visit.status === 'cancelled' || visit.status === 'no-show' || visit.status === 'declined';

  // Is the current user the host company?
  const isHost = visit.hostCompanyId === sw.company.id;
  const isVisitor = visit.companyId === sw.company.id;
  const isPending = visit.status === 'pending-confirmation';

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

  const handleConfirm = () => {
    sw.run(confirmVisit(sw.ctx, visit.id), 'Visit confirmed — status updated to Scheduled');
  };

  const handleDecline = () => {
    sw.run(declineVisit(sw.ctx, visit.id, declineReason || undefined), 'Visit declined');
    setShowDecline(false);
  };

  const timelineActiveIndex = TIMELINE_STEPS.findIndex((s) => s.status === visit.status);
  const isLinked = !!visit.hostCompanyId;

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
            {!isLinked && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">External Host</span>}
          </div>
          {canManage && !isCancelled && (
            <div className="flex items-center gap-1.5">
              {/* Host actions: confirm/decline pending visits */}
              {isHost && isPending && (
                <>
                  <button type="button" onClick={handleConfirm} className={`${btnPrimary} text-xs`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />Confirm Visit
                  </button>
                  <button type="button" onClick={() => setShowDecline(true)} className="text-xs px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold">
                    Decline
                  </button>
                </>
              )}
              {/* Visitor actions: cancel a scheduled visit */}
              {isVisitor && visit.status === 'scheduled' && (
                <button type="button" onClick={() => sw.run(updateVisitStatus(sw.ctx, visit.id, 'cancelled'), 'Visit cancelled')} className="text-xs px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold">Cancel</button>
              )}
              {/* Either side: check-in / check-out */}
              {visit.status === 'scheduled' && (
                <button type="button" onClick={() => sw.run(updateVisitStatus(sw.ctx, visit.id, 'checked-in'), 'Checked in')} className={`${btnGhost} text-xs`}>Check In</button>
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

        {/* Pending confirmation notice for visitor */}
        {isVisitor && isPending && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-2"><Clock className="w-4 h-4" />Awaiting host confirmation</p>
            <p className="text-xs text-amber-700 mt-0.5">{visit.hostCompany} has been notified of this visit request. The visit will appear as Scheduled once they confirm.</p>
          </div>
        )}

        {/* Pending confirmation notice for host */}
        {isHost && isPending && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Visit request awaiting your confirmation</p>
            <p className="text-xs text-amber-700 mt-0.5">{visit.representative} from {sw.store.companies.find((c) => c.id === visit.companyId)?.profile.tradingName ?? 'a supplier'} has requested this visit. Confirm or decline using the buttons above.</p>
          </div>
        )}

        {/* Declined notice */}
        {visit.status === 'declined' && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
            <p className="text-sm font-semibold text-rose-900 flex items-center gap-2"><XCircle className="w-4 h-4" />Visit declined by host</p>
            {visit.declinedByName && <p className="text-xs text-rose-700 mt-0.5">Declined by {visit.declinedByName}{visit.declinedReason ? ` — ${visit.declinedReason}` : ''}</p>}
          </div>
        )}

        {/* Decline form */}
        {showDecline && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-rose-900">Decline this visit</p>
            <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={2} placeholder="Optional reason for declining…" className={inputCls} />
            <div className="flex gap-2">
              <button type="button" onClick={handleDecline} className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700">Confirm Decline</button>
              <button type="button" onClick={() => setShowDecline(false)} className={btnGhost + ' text-xs'}>Cancel</button>
            </div>
          </div>
        )}

        {/* Section B — Participants */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Visiting Organization</p>
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0"><Building2 className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{sw.store.companies.find((c) => c.id === visit.companyId)?.profile.tradingName ?? visit.hostCompany}</p>
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
                {isLinked ? (
                  <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Linked SOKO company</p>
                ) : (
                  <p className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1"><ExternalLink className="w-3 h-3" />External / Unlinked</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section C — Visit Info */}
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-200 p-3">
          <Field label="Purpose" value={visit.purpose} />
          <Field label="Location" value={visit.location} />
          <Field label="Date & Time" value={`${fmtDate(visit.date)} · ${visit.time}`} />
          <Field label="Visit type" value={visit.visitType === 'walk-in' ? 'Walk-in' : 'Scheduled'} />
          {visit.confirmedByName && <Field label="Confirmed by" value={visit.confirmedByName} />}
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
              {visit.status === 'cancelled' ? <XCircle className="w-4 h-4" /> : visit.status === 'declined' ? <XCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {visit.status === 'cancelled' ? 'This visit was cancelled.' : visit.status === 'declined' ? 'This visit was declined by the host.' : 'The visitor did not show up.'}
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
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
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" />Private to {sw.company.profile.tradingName}</span>
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
  const [hostQuery, setHostQuery] = useState('');
  const [selectedHost, setSelectedHost] = useState<CompanyRecord | null>(null);
  const [hostContact, setHostContact] = useState('');
  const [representative, setRepresentative] = useState(sw.user.name);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState<VisitPurpose>('Commercial Review');
  const [products, setProducts] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saveContact, setSaveContact] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Unified company search across ALL companies in the registry (not just suppliers)
  const searchResults = useMemo(() => {
    if (hostQuery.trim().length < 2) return [];
    const q = hostQuery.toLowerCase();
    return sw.store.companies
      .filter((c) => c.id !== sw.company.id && c.profile.tradingName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [hostQuery, sw.store.companies, sw.company.id]);

  // Authorized members of the selected host company (for host contact suggestions)
  const hostMembers = useMemo(() => {
    if (!selectedHost) return [];
    return sw.store.memberships.filter((m) => m.companyId === selectedHost.id && m.status === 'active');
  }, [selectedHost, sw.store.memberships]);

  // Authorized members of the visiting company (for representative selection)
  const ourMembers = useMemo(() => {
    return sw.store.memberships.filter((m) => m.companyId === sw.company.id && m.status === 'active');
  }, [sw.store.memberships, sw.company.id]);

  const selectHost = (c: CompanyRecord) => {
    setSelectedHost(c);
    setHostQuery(c.profile.tradingName);
    setError('');
    // Auto-fill location from company address
    if (c.profile.address && !location) setLocation(c.profile.address);
  };

  const isExternal = !selectedHost && hostQuery.trim().length > 0;

  const save = () => {
    setError('');
    setSubmitting(true);

    if (!hostQuery.trim()) { setError('Host company is required.'); setSubmitting(false); return; }
    if (!date.trim()) { setError('Date is required.'); setSubmitting(false); return; }
    if (!time.trim()) { setError('Time is required.'); setSubmitting(false); return; }
    if (!representative.trim()) { setError('Representative is required.'); setSubmitting(false); return; }

    // Validate date is not in the past
    const visitDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (visitDate < today) { setError('Visit date cannot be in the past.'); setSubmitting(false); return; }

    const r = createVisit(sw.ctx, {
      hostCompany: selectedHost?.profile.tradingName ?? hostQuery.trim(),
      hostCompanyId: selectedHost?.id,
      hostContact: hostContact || 'TBD',
      representative,
      date,
      time,
      location: location || 'TBD',
      purpose,
      productsDiscussed: products.split(',').map((s) => s.trim()).filter(Boolean),
      remarks: remarks || undefined,
    });

    if (r.ok) {
      let store = r.store;
      if (saveContact && selectedHost && hostContact) {
        const contactMember = hostMembers.find((m) => m.name === hostContact);
        if (contactMember && !isSavedCorporateContact(store, sw.company.id, contactMember.userId)) {
          const sc = saveCompanyContact({ ...sw.ctx, store }, {
            name: contactMember.name, title: contactMember.title,
            company: selectedHost.profile.tradingName,
            category: selectedHost.profile.categories[0] ?? '',
            emirate: selectedHost.profile.emirate,
            email: contactMember.email,
            sourceCompanyId: selectedHost.id, sourceUserId: contactMember.userId,
          });
          if (sc.ok) store = sc.store;
        }
      }
      sw.setStore(store);
      sw.notify(selectedHost
        ? `Visit request sent to ${selectedHost.profile.tradingName} — pending confirmation`
        : `Visit scheduled to ${hostQuery.trim()} (external/unlinked host)`
      );
      setSubmitting(false);
      onClose();
    } else {
      setError(r.error);
      setSubmitting(false);
    }
  };

  return (
    <ProfileDialog title="Schedule a Visit" subtitle="Create a new visit record" onClose={onClose} size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button type="button" onClick={save} disabled={submitting} className={btnPrimary}>
            {submitting ? 'Saving…' : selectedHost ? 'Send Visit Request' : 'Schedule Visit'}
          </button>
        </div>
      }
    >
      <div className="px-5 py-4 space-y-3">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Visiting company (read-only) */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Visiting Company</p>
          <p className="text-sm font-semibold text-slate-900">{sw.company.profile.tradingName}</p>
        </div>

        {/* Host company search */}
        <div>
          <label className={labelCls}>Host Company *</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={hostQuery}
              onChange={(e) => { setHostQuery(e.target.value); setSelectedHost(null); setError(''); }}
              placeholder="Search SOKO companies (suppliers, contractors, developers)…"
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && !selectedHost && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Found in SOKO company registry:</p>
            {searchResults.map((c) => (
              <button key={c.id} type="button" onClick={() => selectHost(c)}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold">{c.profile.tradingName.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.profile.tradingName}</p>
                  <p className="text-xs text-slate-500">{c.kind === 'contractor' ? 'Contractor' : c.kind === 'supplier' ? 'Supplier' : 'Developer'} · {c.profile.emirate}</p>
                </div>
                {c.verification.status === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* Selected host indicator */}
        {selectedHost && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
            <ShieldCheck className="w-4 h-4" />
            <span>Linked to <strong>{selectedHost.profile.tradingName}</strong> — visit request will be sent for host confirmation.</span>
            <button type="button" onClick={() => { setSelectedHost(null); setHostQuery(''); }} className="ml-auto text-blue-600 hover:text-blue-800 font-semibold">Change</button>
          </div>
        )}

        {/* External host warning */}
        {isExternal && searchResults.length === 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <p className="font-semibold flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" />External / Unlinked Company</p>
            <p className="mt-0.5">"{hostQuery}" is not registered on SOKO. The visit will be saved to your workspace only. Cross-workspace synchronization is unavailable until the company is linked. You can invite them to register on SOKO later.</p>
          </div>
        )}

        {/* Host contact — with suggestions for linked companies */}
        <div>
          <label className={labelCls}>Host Contact</label>
          {hostMembers.length > 0 ? (
            <select value={hostContact} onChange={(e) => setHostContact(e.target.value)} className={inputCls}>
              <option value="">Select a contact…</option>
              {hostMembers.map((m) => (
                <option key={m.id} value={m.name}>{m.name} — {m.title}</option>
              ))}
            </select>
          ) : (
            <input value={hostContact} onChange={(e) => setHostContact(e.target.value)} placeholder="e.g. Mohamed Sadiq" className={inputCls} />
          )}
        </div>

        {/* Representative — restricted to visiting company members */}
        <div>
          <label className={labelCls}>Representative *</label>
          <select value={representative} onChange={(e) => setRepresentative(e.target.value)} className={inputCls}>
            {ourMembers.map((m) => (
              <option key={m.id} value={m.name}>{m.name} — {m.title}</option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">Only authorized members of {sw.company.profile.tradingName} can be selected as representative.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
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
            <label className={labelCls}>Time *</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. GEC Dubai Office, Al Barsha" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Products to Discuss (comma-separated)</label>
          <input value={products} onChange={(e) => setProducts(e.target.value)} placeholder="e.g. SikaProof A+, Mapelastic Cementitious Coating" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Additional Remarks</label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Optional notes" className={inputCls} />
        </div>

        {selectedHost && hostContact && hostMembers.some((m) => m.name === hostContact) && sw.company.kind === 'contractor' && (() => {
          const contactMember = hostMembers.find((m) => m.name === hostContact)!;
          const alreadySaved = isSavedCorporateContact(sw.store, sw.company.id, contactMember.userId);
          return alreadySaved ? null : (
            <label className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={saveContact} onChange={(e) => setSaveContact(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-blue-900 font-medium">Save {hostContact} to Company Contacts</span>
            </label>
          );
        })()}

        <DemoNote>
          {selectedHost
            ? `This visit request will appear in ${selectedHost.profile.tradingName}'s Visits module for confirmation. Both workspaces will share the same visit record.`
            : 'For external/unlinked hosts, the visit is saved to your workspace only. Cross-workspace sync requires the host to be a registered SOKO company.'}
        </DemoNote>
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

  const pending = visits.filter((v) => v.status === 'pending-confirmation');
  const upcoming = visits.filter((v) => v.status === 'scheduled' || v.status === 'checked-in' || v.status === 'in-meeting');
  const completed = visits.filter((v) => v.status === 'completed');
  const cancelled = visits.filter((v) => v.status === 'cancelled' || v.status === 'no-show' || v.status === 'declined');
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
    : filter === 'pending' ? pending
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
        <KpiCard label="Pending Confirmation" value={pending.length} />
        <KpiCard label="Upcoming" value={upcoming.length} />
        <KpiCard label="This Month" value={thisMonth.length} />
        <KpiCard label="Completed" value={completed.length} />
        <KpiCard label="Follow-ups" value={visitsWithFollowup.length} />
        <KpiCard label="Pending Tasks" value={pendingTasks.length} />
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <SubTabs
          tabs={[
            { id: 'all' as Filter, label: 'All', count: visits.length },
            { id: 'pending' as Filter, label: 'Pending', count: pending.length },
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
          <table className="w-full text-sm min-w-[900px]">
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
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-slate-900">{v.hostCompany}</p>
                        {!v.hostCompanyId && <span className="text-[10px] text-amber-600" title="External / Unlinked">⓿</span>}
                      </div>
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
        <DemoNote>Visit records are shared across workspaces when the host company is a linked SOKO company. Pending confirmation visits require host approval before becoming scheduled. Private notes and tasks are isolated per company workspace.</DemoNote>
      </div>

      {open && <VisitDetailsModal sw={sw} visit={open} onClose={() => setOpenId(null)} />}
      {showCreate && <CreateVisitModal sw={sw} onClose={() => setShowCreate(false)} />}
    </div>
  );
};
