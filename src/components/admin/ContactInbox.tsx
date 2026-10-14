import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Inbox, Mail, Search, UserPlus } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { downloadSafeCsv } from '../../lib/csvExport';
import { DASH, formatDate, formatDateTime } from './companyShared';
import { AdminDrawer } from './adminDrawer';
import { EmptyState, FilterSelect } from './catalogUi';
import { SourceTag } from './userBadges';
import {
  INQUIRY_CATEGORIES,
  INQUIRY_STATUS_CLASSES,
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUSES,
  INQUIRY_USER_TYPES,
  OPEN_INQUIRY_STATUSES,
  isInquiryStatus,
  type ContactAssignee,
  type ContactInquiry,
  type ContactInquiryNote,
  type InquiryAuditRow,
  type InquiryStatus,
} from './contactShared';

interface ContactInboxProps {
  isLive: boolean;
  syncToken: number;
  openCount: number | null;
  focusId?: string | null;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const inquiryColumns =
  'id, reference, full_name, company, email, phone, user_type, category, subject, message, status, assigned_to, created_at, updated_at, closed_at';

export const ContactInbox: React.FC<ContactInboxProps> = ({ isLive, syncToken, openCount, focusId }) => {
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [assignees, setAssignees] = useState<ContactAssignee[]>([]);
  const [notes, setNotes] = useState<ContactInquiryNote[]>([]);
  const [history, setHistory] = useState<InquiryAuditRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InquiryStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isLive) {
      setInquiries([]);
      setAssignees([]);
      setState('success');
      return;
    }
    setState('loading');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const [inqRes, assigneeRes] = await Promise.all([
        supabase.from('contact_inquiries').select(inquiryColumns).order('created_at', { ascending: false }),
        supabase.rpc('admin_list_contact_assignees'),
      ]);
      if (inqRes.error) throw inqRes.error;
      if (assigneeRes.error) throw assigneeRes.error;
      setInquiries((inqRes.data ?? []) as ContactInquiry[]);
      setAssignees((assigneeRes.data ?? []) as ContactAssignee[]);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inquiries.');
      setState('error');
    }
  }, [isLive]);

  useEffect(() => {
    void load();
  }, [load, syncToken]);

  useEffect(() => {
    if (focusId) setSelectedId(focusId);
  }, [focusId]);

  const selected = inquiries.find((i) => i.id === selectedId) ?? null;

  const loadDetail = useCallback(async (id: string) => {
    if (!isLive) return;
    const supabase = getSupabaseClient();
    const [noteRes, auditRes] = await Promise.all([
      supabase.from('contact_inquiry_notes').select('id, inquiry_id, author_id, body, created_at').eq('inquiry_id', id).order('created_at', { ascending: true }),
      supabase
        .from('audit_log')
        .select('id, action, entity, entity_id, diff, at, actor_id')
        .in('entity', ['contact_inquiries', 'contact_inquiry_notes'])
        .or(`entity_id.eq.${id},diff->>inquiry_id.eq.${id}`)
        .order('at', { ascending: true }),
    ]);
    if (!noteRes.error) setNotes((noteRes.data ?? []) as ContactInquiryNote[]);
    if (!auditRes.error) setHistory((auditRes.data ?? []) as InquiryAuditRow[]);
  }, [isLive]);

  useEffect(() => {
    if (!selectedId) {
      setNotes([]);
      setHistory([]);
      setNoteDraft('');
      setActionError(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const assigneeName = useCallback(
    (id: string | null) => {
      if (!id) return DASH;
      return assignees.find((a) => a.user_id === id)?.full_name || id.slice(0, 8);
    },
    [assignees],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const from = fromDate ? Date.parse(`${fromDate}T00:00:00`) : null;
    const to = toDate ? Date.parse(`${toDate}T23:59:59`) : null;
    return inquiries.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
      if (userTypeFilter !== 'all' && row.user_type !== userTypeFilter) return false;
      const created = Date.parse(row.created_at);
      if (from != null && created < from) return false;
      if (to != null && created > to) return false;
      if (!q) return true;
      return [row.reference, row.full_name, row.email, row.subject, row.company ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [inquiries, searchQuery, statusFilter, categoryFilter, userTypeFilter, fromDate, toDate]);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(INQUIRY_STATUSES.map((s) => [s, 0])) as Record<InquiryStatus, number>;
    for (const row of inquiries) {
      if (isInquiryStatus(row.status)) byStatus[row.status] += 1;
    }
    return byStatus;
  }, [inquiries]);

  const exportRows = (rows: ContactInquiry[]) => {
    downloadSafeCsv(`soko-contact-inquiries-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Reference', 'Created', 'Status', 'Category', 'User type', 'Name', 'Company', 'Email', 'Phone', 'Subject', 'Assigned', 'Message'],
      ...rows.map((r) => [
        r.reference,
        r.created_at,
        r.status,
        r.category,
        r.user_type,
        r.full_name,
        r.company ?? '',
        r.email,
        r.phone ?? '',
        r.subject,
        assigneeName(r.assigned_to),
        r.message,
      ]),
    ]);
  };

  const updateInquiry = async (patch: { status?: InquiryStatus; assigned_to?: string | null }) => {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    try {
      const supabase = getSupabaseClient();
      const { error: rpcError } = await supabase.rpc('admin_update_contact_inquiry', {
        p_id: selected.id,
        p_status: patch.status ?? selected.status,
        p_assigned_to: patch.assigned_to === undefined ? selected.assigned_to : patch.assigned_to,
      });
      if (rpcError) throw rpcError;
      await load();
      await loadDetail(selected.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!selected || !noteDraft.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      const supabase = getSupabaseClient();
      const { error: rpcError } = await supabase.rpc('admin_add_contact_inquiry_note', {
        p_id: selected.id,
        p_body: noteDraft.trim(),
      });
      if (rpcError) throw rpcError;
      setNoteDraft('');
      await loadDetail(selected.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add note.');
    } finally {
      setBusy(false);
    }
  };

  if (!isLive) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Inbox}
          title="Contact Inbox is live-only"
          body="Inquiry records are stored in Supabase and shown here for verified platform administrators. Demo mode does not invent contact submissions."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Contact Inbox</h3>
          <p className="text-xs text-slate-500">Public SOKO inquiries. Restricted to platform administrators.</p>
        </div>
        <SourceTag source="live" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <button type="button" onClick={() => setStatusFilter('all')} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left cursor-pointer">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Open queue</span>
          <span className="font-mono text-lg font-bold text-slate-900">{openCount ?? OPEN_INQUIRY_STATUSES.reduce((n, s) => n + counts[s], 0)}</span>
        </button>
        {INQUIRY_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-xl border px-3 py-2 text-left cursor-pointer ${statusFilter === status ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{INQUIRY_STATUS_LABELS[status]}</span>
            <span className="font-mono text-lg font-bold text-slate-900">{counts[status]}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, subject, reference"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs"
          />
        </div>
        <FilterSelect id="inq-status" label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v === 'all' || isInquiryStatus(v) ? (v as 'all' | InquiryStatus) : 'all')}>
          <option value="all">All statuses</option>
          {INQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>{INQUIRY_STATUS_LABELS[s]}</option>
          ))}
        </FilterSelect>
        <FilterSelect id="inq-cat" label="Category" value={categoryFilter} onChange={setCategoryFilter}>
          <option value="all">All categories</option>
          {INQUIRY_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FilterSelect>
        <FilterSelect id="inq-type" label="User type" value={userTypeFilter} onChange={setUserTypeFilter}>
          <option value="all">All user types</option>
          {INQUIRY_USER_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </FilterSelect>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" className="rounded-lg border border-slate-300 px-2 py-2 text-xs" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" className="rounded-lg border border-slate-300 px-2 py-2 text-xs" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => exportRows(filtered)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold cursor-pointer">
          <Download className="h-3.5 w-3.5" /> Export {filtered.length} to CSV
        </button>
        <p className="self-center text-[11px] text-slate-500">{state === 'loading' ? 'Loading…' : error ?? `${filtered.length} shown`}</p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Mail} title="No inquiries match" body="Adjust filters or wait for a public Contact Us submission." compact />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                {['Reference', 'Created', 'From', 'Category', 'Subject', 'Status', 'Assigned'].map((h) => (
                  <th key={h} className="px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-[11px]">{row.reference}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.created_at)}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setSelectedId(row.id)} className="font-semibold text-blue-700 hover:underline cursor-pointer">
                      {row.full_name}
                    </button>
                    <div className="text-slate-500">{row.email}</div>
                  </td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="max-w-xs truncate px-3 py-2">{row.subject}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${INQUIRY_STATUS_CLASSES[row.status]}`}>
                      {INQUIRY_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2">{assigneeName(row.assigned_to)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <AdminDrawer
          titleId="inquiry-drawer"
          title={selected.subject}
          eyebrow={<span className="font-mono">{selected.reference}</span>}
          icon={Inbox}
          onClose={() => setSelectedId(null)}
        >
          <div className="flex flex-col gap-5 p-5">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><dt className="text-[10px] font-bold uppercase text-slate-500">Name</dt><dd>{selected.full_name}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-500">Email</dt><dd>{selected.email}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-500">Company</dt><dd>{selected.company || DASH}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-500">Phone</dt><dd>{selected.phone || DASH}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-500">User type</dt><dd>{selected.user_type}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-500">Category</dt><dd>{selected.category}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-500">Received</dt><dd>{formatDateTime(selected.created_at)}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-500">Updated</dt><dd>{formatDateTime(selected.updated_at)}</dd></div>
            </dl>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Message</h4>
              <p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed">{selected.message}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Status
                <select
                  value={selected.status}
                  disabled={busy}
                  onChange={(e) => isInquiryStatus(e.target.value) && void updateInquiry({ status: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {INQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>{INQUIRY_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Assign to
                <select
                  value={selected.assigned_to ?? ''}
                  disabled={busy}
                  onChange={(e) => void updateInquiry({ assigned_to: e.target.value || null })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {assignees.map((a) => (
                    <option key={a.user_id} value={a.user_id}>{a.full_name || a.user_id}</option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Internal notes</h4>
              <ul className="flex flex-col gap-2">
                {notes.length === 0 && <li className="text-xs text-slate-500">No notes yet.</li>}
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{assigneeName(n.author_id)} · {formatDateTime(n.created_at)}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-col gap-2">
                <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} placeholder="Add an internal note" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button type="button" disabled={busy || !noteDraft.trim()} onClick={() => void addNote()} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">
                  <UserPlus className="h-3.5 w-3.5" /> Save note
                </button>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">History</h4>
              <ul className="flex flex-col gap-1.5 text-xs text-slate-600">
                {history.length === 0 && <li>No audit events yet.</li>}
                {history.map((h) => (
                  <li key={h.id} className="rounded-md bg-slate-100 px-2 py-1.5">
                    <span className="font-semibold">{h.entity}</span> {h.action} · {formatDateTime(h.at)}
                  </li>
                ))}
              </ul>
            </div>
            {actionError && <p className="text-xs text-rose-600">{actionError}</p>}
          </div>
        </AdminDrawer>
      )}
    </div>
  );
};
