import React, { useState } from 'react';
import { Copy, Eye, Megaphone, MessageSquareText, MoreHorizontal, Pause, Play, Plus, XCircle } from 'lucide-react';
import { closeCampaign, duplicateCampaign, ownerCampaigns, setCampaignPaused } from '../../data/marketHubService';
import { CampaignStatus, OwnerCampaignView } from '../../data/marketHubTypes';
import { ConfirmDialog, btnPrimary } from '../NetworkShared';
import { CampaignNav } from './CampaignCenter';
import { responsesOf } from './CampaignDashboard';
import { CampaignStatusPill, EmptyState, Hub, SubTabs, campaignLocation, fmtDate } from './MarketHubShared';

type StatusFilter = 'all' | 'draft' | 'pending' | 'active' | 'completed';

const FILTER_STATUSES: Record<Exclude<StatusFilter, 'all'>, CampaignStatus[]> = {
  draft: ['draft', 'rejected'],
  pending: ['pending_review', 'approved', 'scheduled'],
  active: ['active', 'paused'],
  completed: ['completed', 'suspended'],
};

const FILTER_LABEL: Record<StatusFilter, string> = { all: 'All', draft: 'Draft', pending: 'Pending', active: 'Active', completed: 'Completed' };

const audienceLabel = (v: OwnerCampaignView) => {
  const a = v.campaign.kind === 'sourcing' ? v.campaign.supplierAudience : v.campaign.buyerAudience;
  const who = v.campaign.kind === 'sourcing' ? 'suppliers' : 'buyers';
  return { size: `${v.metrics.eligible} ${who}`, cats: a?.categories.join(', ') ?? '' };
};


const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }> = ({ icon, label, onClick, disabled, danger }) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
      danger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
    }`}
  >
    {icon}
    {label}
  </button>
);

export const MyCampaigns: React.FC<{ hub: Hub; canCreate: boolean; onCreate: () => void; onNav: (n: CampaignNav) => void }> = ({ hub, canCreate, onCreate, onNav }) => {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [closing, setClosing] = useState<OwnerCampaignView | null>(null);
  const views = ownerCampaigns(hub.store, hub.actor).sort((a, b) => b.campaign.createdAt.localeCompare(a.campaign.createdAt));
  const count = (f: StatusFilter) => (f === 'all' ? views.length : views.filter((v) => FILTER_STATUSES[f].includes(v.campaign.status)).length);
  const shown = filter === 'all' ? views : views.filter((v) => FILTER_STATUSES[filter].includes(v.campaign.status));

  const act = (fn: () => void) => {
    setMenu(null);
    fn();
  };

  if (!views.length)
    return (
      <EmptyState
        icon={<Megaphone className="w-5 h-5" />}
        title="No campaigns yet"
        text="Campaigns you create, including drafts and those awaiting SOKO review, are listed here."
        action={
          canCreate ? (
            <button type="button" onClick={onCreate} className={btnPrimary}>
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          ) : undefined
        }
      />
    );

  return (
    <div className="space-y-3">
      <SubTabs value={filter} onChange={setFilter} tabs={(Object.keys(FILTER_LABEL) as StatusFilter[]).map((f) => ({ id: f, label: FILTER_LABEL[f], count: count(f) }))} />

      <div className="rounded-2xl border border-slate-200 bg-white">
        {shown.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 rounded-tl-2xl">Campaign Name</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Audience</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5 text-right">Sent</th>
                  <th className="px-3 py-2.5 text-right">Viewed</th>
                  <th className="px-3 py-2.5 text-right">Responses</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right rounded-tr-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((v) => {
                  const c = v.campaign;
                  const launched = !!c.launchedAt;
                  const aud = audienceLabel(v);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 min-w-[220px] max-w-[300px]">
                        <button type="button" onClick={() => onNav({ section: 'campaigns', id: c.id })} className="block w-full text-left font-semibold leading-snug text-slate-900 hover:text-blue-700 cursor-pointer">
                          {c.title}
                        </button>
                        <span className="block text-[11px] text-slate-500">
                          {c.category} · closes {fmtDate(c.closedAt ?? c.responseDeadline)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{c.kind === 'sourcing' ? 'Sourcing' : 'Promotional'}</td>
                      <td className="px-3 py-3 text-slate-600 min-w-[150px]">
                        <span className="block font-semibold text-slate-800 whitespace-nowrap">{aud.size}</span>
                        <span className="block text-[11px] text-slate-500">{aud.cats}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 min-w-[110px]">{campaignLocation(c)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-900">{launched ? v.metrics.delivered : '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-900">{launched ? v.metrics.viewed : '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-900">{launched ? responsesOf(v) : '—'}</td>
                      <td className="px-3 py-3">
                        <CampaignStatusPill status={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onNav({ section: 'campaigns', id: c.id })}
                            className="inline-flex items-center gap-1 min-h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            type="button"
                            aria-label={`More actions for ${c.title}`}
                            aria-haspopup="menu"
                            aria-expanded={menu?.id === c.id}
                            onClick={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setMenu(menu?.id === c.id ? null : { id: c.id, top: r.bottom + 4, right: window.innerWidth - r.right });
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {menu?.id === c.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} onWheel={() => setMenu(null)} />
                              <div role="menu" style={{ top: menu.top, right: menu.right }} className="fixed z-40 w-56 py-1 rounded-xl border border-slate-200 bg-white shadow-lg animate-[fadeIn_0.15s_ease-out]">
                                <MenuItem icon={<Eye className="w-4 h-4" />} label="View Campaign" onClick={() => act(() => onNav({ section: 'campaigns', id: c.id }))} />
                                <MenuItem
                                  icon={<MessageSquareText className="w-4 h-4" />}
                                  label={c.kind === 'sourcing' ? `View Responses (${c.responses.length})` : `View Interested (${v.metrics.interested})`}
                                  disabled={!launched}
                                  onClick={() => act(() => onNav({ section: 'campaigns', id: c.id, focus: 'responses' }))}
                                />
                                {c.status === 'active' && (
                                  <MenuItem icon={<Pause className="w-4 h-4" />} label="Pause Campaign" onClick={() => act(() => hub.run(setCampaignPaused(hub.store, hub.actor, c.id, true), 'Campaign paused'))} />
                                )}
                                {c.status === 'paused' && (
                                  <MenuItem icon={<Play className="w-4 h-4" />} label="Resume Campaign" onClick={() => act(() => hub.run(setCampaignPaused(hub.store, hub.actor, c.id, false), 'Campaign resumed'))} />
                                )}
                                <MenuItem
                                  icon={<Copy className="w-4 h-4" />}
                                  label="Duplicate Campaign"
                                  disabled={!canCreate}
                                  onClick={() =>
                                    act(() => {
                                      const r = duplicateCampaign(hub.store, hub.actor, c.id);
                                      if (hub.run(r, 'Copy saved as a draft')) onNav({ section: 'campaigns', id: r.ok ? r.value : null });
                                    })
                                  }
                                />
                                <MenuItem icon={<XCircle className="w-4 h-4" />} label="Close Campaign" danger disabled={c.status !== 'active' && c.status !== 'paused'} onClick={() => act(() => setClosing(v))} />
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No {FILTER_LABEL[filter].toLowerCase()} campaigns.</p>
        )}
      </div>
      <p className="text-[11px] text-slate-400">Pending includes campaigns awaiting SOKO review, approved and scheduled. Sent, viewed and response counts appear after delivery and include labelled demo values.</p>

      {closing && (
        <ConfirmDialog
          title="Close campaign?"
          message={`Recipients will no longer be able to respond to "${closing.campaign.title}". Responses you have received stay available.`}
          confirmLabel="Close Campaign"
          onConfirm={() => hub.run(closeCampaign(hub.store, hub.actor, closing.campaign.id), 'Campaign closed')}
          onClose={() => setClosing(null)}
        />
      )}
    </div>
  );
};
