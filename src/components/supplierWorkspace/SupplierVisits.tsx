import React, { useState } from 'react';
import { CalendarDays, Lock, MapPin } from 'lucide-react';
import { SupplierVisit } from '../../data/supplierTypes';
import { addFollowUp } from '../../data/supplierService';
import { StatusPill, btnPrimary, inputCls } from '../NetworkShared';
import { ProfileDialog } from '../ProfileDialog';
import { DemoNote, EmptyState, Field, KpiCard, SubTabs, fmtDate } from '../marketHub/MarketHubShared';
import { PageHeader, SW } from './SupplierShared';

type Filter = 'all' | 'upcoming' | 'completed';

const STATUS: Record<SupplierVisit['status'], { label: string; tone: 'blue' | 'slate' | 'amber' | 'gold' }> = {
  scheduled: { label: 'Scheduled', tone: 'blue' },
  'checked-in': { label: 'Checked in', tone: 'amber' },
  'in-meeting': { label: 'In meeting', tone: 'amber' },
  completed: { label: 'Completed', tone: 'slate' },
};

const VisitDialog: React.FC<{ sw: SW; visit: SupplierVisit; onClose: () => void }> = ({ sw, visit, onClose }) => {
  const [note, setNote] = useState('');
  const notes = sw.store.followUps.filter((f) => f.visitId === visit.id && f.companyId === sw.company.id);
  const save = () => {
    if (sw.run(addFollowUp(sw.ctx, visit.id, note), 'Follow-up note saved')) setNote('');
  };
  return (
    <ProfileDialog title={`Visit to ${visit.hostCompany}`} subtitle={`${fmtDate(visit.date)} · ${visit.time}`} onClose={onClose} size="lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Representative" value={visit.representative} />
        <Field label="Host company" value={`${visit.hostCompany} · ${visit.hostContact}`} />
        <Field label="Purpose" value={visit.purpose} />
        <Field label="Status" value={STATUS[visit.status].label} />
        <Field label="Location" value={visit.location} />
        <Field label="Kiosk badge" value={visit.kioskBadge ?? '—'} />
        <div className="sm:col-span-2">
          <Field label="Products discussed" value={visit.productsDiscussed.join(', ') || '—'} />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Your follow-up notes</p>
        <ul className="mt-2 space-y-2">
          {notes.map((f, i) => (
            <li key={i} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-sm text-slate-800">{f.note}</p>
              <p className="mt-1 text-xs text-slate-500">{f.by} · {fmtDate(f.at)}</p>
            </li>
          ))}
          {notes.length === 0 && <li className="text-sm text-slate-500">No follow-up notes yet.</li>}
        </ul>
        {sw.can('visits.manage') && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Send revised quotation for rebar by Thursday" className={`${inputCls} flex-1`} />
            <button type="button" onClick={save} className={`${btnPrimary} sm:self-end`}>Add note</button>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> The host company's internal notes and evaluations are private to them and never shown here.
        </p>
      </div>
    </ProfileDialog>
  );
};

export const SupplierVisits: React.FC<{ sw: SW }> = ({ sw }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const visits = sw.store.visits.filter((v) => v.companyId === sw.company.id).sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = visits.filter((v) => v.status !== 'completed');
  const completed = visits.filter((v) => v.status === 'completed');
  const shown = filter === 'upcoming' ? upcoming : filter === 'completed' ? completed : visits;
  const open = visits.find((v) => v.id === openId);

  return (
    <div>
      <PageHeader eyebrow="Visits" title="Office visits" subtitle="Visits your representatives make to contractor and developer offices through SOKO kiosk check-in." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total visits" value={visits.length} />
        <KpiCard label="Upcoming / in progress" value={upcoming.length} />
        <KpiCard label="Completed" value={completed.length} />
        <KpiCard label="Follow-up notes" value={sw.store.followUps.filter((f) => f.companyId === sw.company.id).length} />
      </div>

      <div className="mb-3">
        <SubTabs
          tabs={[
            { id: 'all' as Filter, label: 'All', count: visits.length },
            { id: 'upcoming' as Filter, label: 'Upcoming', count: upcoming.length },
            { id: 'completed' as Filter, label: 'Completed', count: completed.length },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<CalendarDays className="w-5 h-5" />} title="No visits" text="Visits logged through SOKO office kiosks appear here." />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Representative</th>
                <th className="px-3 py-2.5 font-semibold">Host company</th>
                <th className="px-3 py-2.5 font-semibold">Purpose</th>
                <th className="px-3 py-2.5 font-semibold">Products discussed</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((v) => {
                const n = sw.store.followUps.filter((f) => f.visitId === v.id && f.companyId === sw.company.id).length;
                return (
                  <tr key={v.id} onClick={() => setOpenId(v.id)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap"><p className="font-medium text-slate-900">{fmtDate(v.date)}</p><p className="text-xs text-slate-500">{v.time}</p></td>
                    <td className="px-3 py-3 text-slate-700">{v.representative}</td>
                    <td className="px-3 py-3"><p className="font-medium text-slate-900">{v.hostCompany}</p><p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{v.location}</p></td>
                    <td className="px-3 py-3 text-slate-700">{v.purpose}</td>
                    <td className="px-3 py-3 text-slate-600 max-w-[200px] truncate">{v.productsDiscussed.join(', ')}</td>
                    <td className="px-3 py-3"><StatusPill tone={STATUS[v.status].tone}>{STATUS[v.status].label}</StatusPill></td>
                    <td className="px-4 py-3 text-xs font-semibold text-blue-700 whitespace-nowrap">{n ? `${n} note${n > 1 ? 's' : ''}` : 'Add note'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4">
        <DemoNote>Visit records are simulated from the SOKO office kiosk demo.</DemoNote>
      </div>
      {open && <VisitDialog sw={sw} visit={open} onClose={() => setOpenId(null)} />}
    </div>
  );
};
