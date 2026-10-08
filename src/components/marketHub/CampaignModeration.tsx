import React, { useState } from 'react';
import { CircleCheck, Flag, ShieldAlert, TriangleAlert } from 'lucide-react';
import { ModerationItem, moderateCampaign, moderationQueue } from '../../data/marketHubService';
import { CampaignStatus } from '../../data/marketHubTypes';
import { ProfileDialog } from '../ProfileDialog';
import { StatusPill, btnGhost, btnPrimary, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { CampaignStatusPill, EmptyState, Field, Hub, SubTabs, fmtDate } from './MarketHubShared';

type Queue = 'pending' | 'reported' | 'live' | 'decided';

const QUEUE_STATUSES: Record<Queue, CampaignStatus[]> = {
  pending: ['pending_review'],
  reported: [],
  live: ['approved', 'scheduled', 'active'],
  decided: ['completed', 'rejected', 'suspended'],
};

const inQueue = (i: ModerationItem, q: Queue) => (q === 'reported' ? i.reports.length > 0 && i.campaign.status !== 'suspended' : QUEUE_STATUSES[q].includes(i.campaign.status));

export const CampaignModeration: React.FC<{ hub: Hub }> = ({ hub }) => {
  const [queue, setQueue] = useState<Queue>('pending');
  const [action, setAction] = useState<{ id: string; type: 'approve' | 'reject' | 'suspend' } | null>(null);
  const [note, setNote] = useState('');
  const items = moderationQueue(hub.store, hub.actor);
  const shown = items.filter((i) => inQueue(i, queue));
  const target = action && items.find((i) => i.campaign.id === action.id);

  const apply = () => {
    if (!action) return;
    const label = { approve: 'approved', reject: 'rejected', suspend: 'suspended' }[action.type];
    if (hub.run(moderateCampaign(hub.store, hub.actor, action.id, action.type, note), `Campaign ${label}`)) {
      setAction(null);
      setNote('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SubTabs
          value={queue}
          onChange={setQueue}
          tabs={[
            { id: 'pending', label: 'Pending Review', count: items.filter((i) => inQueue(i, 'pending')).length },
            { id: 'reported', label: 'Spam Reports', count: items.filter((i) => inQueue(i, 'reported')).length },
            { id: 'live', label: 'Approved & Live', count: items.filter((i) => inQueue(i, 'live')).length },
            { id: 'decided', label: 'Closed & Decided', count: items.filter((i) => inQueue(i, 'decided')).length },
          ]}
        />
        <p className="text-[11px] text-slate-400">SOKO moderation · simulated admin review</p>
      </div>

      {shown.length ? (
        <ul className="space-y-3">
          {shown.map(({ campaign: c, metrics: m, reports, relevance }) => (
            <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CampaignStatusPill status={c.status} />
                    <StatusPill tone={c.kind === 'sourcing' ? 'blue' : 'gold'}>{c.kind === 'sourcing' ? 'Sourcing' : 'Promotion'}</StatusPill>
                    {reports.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-red-200 bg-red-50 text-[11px] font-semibold text-red-700">
                        <Flag className="w-3 h-3" />
                        {reports.length} reports
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-slate-900">{c.title}</h3>
                  <p className="text-xs text-slate-500">
                    {c.ownerCompany} · {c.category} · submitted {fmtDate(c.submittedAt ?? c.createdAt)}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{c.description}</p>
                  <div className={`mt-2 flex items-start gap-1.5 text-xs ${relevance.ok ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {relevance.ok ? <CircleCheck className="w-3.5 h-3.5 mt-px shrink-0" /> : <TriangleAlert className="w-3.5 h-3.5 mt-px shrink-0" />}
                    <span>{relevance.ok ? 'Relevance check passed: audience matches the campaign category.' : relevance.notes.join(' ')}</span>
                  </div>
                  {reports.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                      {reports.slice(0, 3).map((r, i) => (
                        <li key={i}>
                          “{r.reason}” · {fmtDate(r.at)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <dl className="grid grid-cols-4 lg:grid-cols-2 gap-3 lg:w-48 shrink-0">
                  <Field label="Audience" value={String(m.eligible)} />
                  <Field label="Delivered" value={String(m.delivered)} />
                  <Field label="Interested" value={String(m.interested)} />
                  <Field label="Responses" value={String(m.responded)} />
                </dl>
              </div>
              {c.reviewNote && <p className="mt-3 text-xs text-slate-500">Note: {c.reviewNote}</p>}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {c.status === 'pending_review' && (
                  <>
                    <button type="button" onClick={() => setAction({ id: c.id, type: 'reject' })} className={btnGhost}>
                      Reject
                    </button>
                    <button type="button" onClick={() => setAction({ id: c.id, type: 'approve' })} className={btnPrimary}>
                      Approve
                    </button>
                  </>
                )}
                {['approved', 'scheduled', 'active'].includes(c.status) && (
                  <button type="button" onClick={() => setAction({ id: c.id, type: 'suspend' })} className={btnSecondary}>
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Suspend
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<CircleCheck className="w-5 h-5" />} title="Queue is clear" text="Nothing needs attention in this view." />
      )}

      {target && action && (
        <ProfileDialog
          title={`${action.type[0].toUpperCase()}${action.type.slice(1)} campaign`}
          subtitle={`${target.campaign.title} · ${target.campaign.ownerCompany}`}
          onClose={() => setAction(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAction(null)} className={btnSecondary}>
                Cancel
              </button>
              <button type="button" onClick={apply} className={action.type === 'approve' ? btnPrimary : 'inline-flex items-center justify-center min-h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold cursor-pointer'}>
                Confirm
              </button>
            </div>
          }
        >
          <div className="px-5 py-4">
            <label className={labelCls} htmlFor="mod-note">
              {action.type === 'reject' ? 'Reason (shared with the company)' : 'Note (optional)'}
            </label>
            <textarea id="mod-note" rows={3} className={`${inputCls} py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </ProfileDialog>
      )}
    </div>
  );
};
