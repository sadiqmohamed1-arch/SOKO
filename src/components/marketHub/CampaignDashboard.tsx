import React, { useState } from 'react';
import { ArrowLeft, Building2, ChevronRight, Coins, Megaphone, Paperclip, Pencil, Plus, Rocket, Star } from 'lucide-react';
import { BUYER_SUPPLIERS } from '../../data/buyerSuppliers';
import { supplierRecipient } from '../../data/marketHubCatalog';
import {
  actorFor,
  closeCampaign,
  creditAccount,
  deleteDraft,
  launchCampaign,
  launchesInLast7Days,
  moderateCampaign,
  ownerCampaigns,
  submitCampaignForReview,
  updateResponse,
} from '../../data/marketHubService';
import { CampaignResponse, OwnerCampaignView } from '../../data/marketHubTypes';
import { ProfileDialog } from '../ProfileDialog';
import { ConfirmDialog, StatusPill, VerifiedCompanyBadge, btnGhost, btnPrimary, btnSecondary } from '../NetworkShared';
import { CampaignStatusPill, DemoNote, EmptyState, Field, Hub, KpiCard, ProgressRow, daysAgo, fmtDate } from './MarketHubShared';

const AVAIL_LABEL: Record<CampaignResponse['availability'], string> = {
  available: 'Available from stock',
  on_order: 'Available on order',
  partial: 'Partial quantity',
  alternative: 'Alternative offered',
};

const small = '!min-h-8 !px-2.5 text-xs';

const directoryIdFor = (responderId: string) => {
  const id = supplierRecipient(responderId)?.supplierId;
  return id && BUYER_SUPPLIERS.some((s) => s.id === id) ? id : undefined;
};

const ResponseActivity: React.FC<{ responses: CampaignResponse[] }> = ({ responses }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const counts = days.map((d) => responses.filter((r) => new Date(r.at).toDateString() === d.toDateString()).length);
  const max = Math.max(1, ...counts);
  return (
    <div>
      <p className="text-xs font-semibold text-slate-700">Responses, last 7 days</p>
      <div className="mt-2 flex items-end gap-1.5 h-20">
        {counts.map((c, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-md bg-blue-600/85 transition-all duration-700" style={{ height: `${Math.max(4, (c / max) * 64)}px`, opacity: c ? 1 : 0.15 }} title={`${c} responses`} />
            <span className="text-[10px] text-slate-400">{days[i].toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ResponseDialog: React.FC<{ r: CampaignResponse; onClose: () => void; footer: React.ReactNode }> = ({ r, onClose, footer }) => (
  <ProfileDialog title={r.companyName} subtitle={`Responded ${daysAgo(r.at).toLowerCase()}`} onClose={onClose} footer={footer}>
    <div className="px-5 py-4 space-y-4">
      <p className="text-sm text-slate-700 leading-relaxed">{r.message}</p>
      <dl className="grid grid-cols-2 gap-4">
        <Field label="Availability" value={AVAIL_LABEL[r.availability]} />
        <Field label="Lead time" value={r.leadTime} />
        <Field label="Category" value={r.category} />
        <Field label="Location" value={r.location} />
      </dl>
      {(r.quotationName || r.techDocName) && (
        <ul className="space-y-1 text-sm text-slate-600">
          {[r.quotationName, r.techDocName].filter(Boolean).map((n) => (
            <li key={n} className="inline-flex items-center gap-1.5 mr-4">
              <Paperclip className="w-4 h-4 text-slate-400" />
              {n}
            </li>
          ))}
          <li className="text-[11px] text-slate-400">Prototype attachments (file names only)</li>
        </ul>
      )}
      {r.demo && <DemoNote>Sample demo response.</DemoNote>}
    </div>
  </ProfileDialog>
);

const CampaignDetail: React.FC<{ hub: Hub; view: OwnerCampaignView; onBack: () => void; onEdit: () => void }> = ({ hub, view, onBack, onEdit }) => {
  const { campaign: c, metrics: m, disclosedInterests } = view;
  const [openResponse, setOpenResponse] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'launch' | 'close' | 'discard' | null>(null);
  const account = creditAccount(hub.store, hub.actor);
  const resp = c.responses.find((r) => r.id === openResponse);
  const sourcing = c.kind === 'sourcing';

  const respond = (r: CampaignResponse, action: 'shortlist' | 'connect') =>
    hub.run(
      updateResponse(hub.store, hub.actor, c.id, r.id, action),
      action === 'shortlist' ? (r.shortlisted ? `${r.companyName} removed from shortlist` : `${r.companyName} shortlisted`) : `Connection request sent to ${r.companyName} through SOKO`
    );

  const responseActions = (r: CampaignResponse, size = small) => {
    const dir = directoryIdFor(r.responderId);
    return (
      <>
        {dir && (
          <button type="button" onClick={() => hub.openSupplier(dir)} className={`${btnGhost} ${size}`}>
            <Building2 className="w-3.5 h-3.5" />
            Profile
          </button>
        )}
        <button type="button" onClick={() => respond(r, 'shortlist')} className={`${r.shortlisted ? btnSecondary : btnGhost} ${size}`}>
          <Star className={`w-3.5 h-3.5 ${r.shortlisted ? 'fill-gold-500 text-gold-500' : ''}`} />
          {r.shortlisted ? 'Shortlisted' : 'Shortlist'}
        </button>
        <button type="button" disabled={r.connectRequested} onClick={() => respond(r, 'connect')} className={`${btnPrimary} ${size}`}>
          {r.connectRequested ? 'Requested' : 'Connect'}
        </button>
      </>
    );
  };

  const demoApprove = () => hub.run(moderateCampaign(hub.store, actorFor(hub.store, 'admin'), c.id, 'approve', 'Approved in simulated review.'), 'SOKO review simulated: campaign approved');

  return (
    <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
      <button type="button" onClick={onBack} className={`${btnGhost} -ml-3`}>
        <ArrowLeft className="w-4 h-4" />
        All campaigns
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <CampaignStatusPill status={c.status} />
              <StatusPill tone={sourcing ? 'blue' : 'gold'}>{sourcing ? 'Sourcing Campaign' : 'Promotional Campaign'}</StatusPill>
              {c.identity === 'confidential' && <StatusPill tone="slate">Confidential</StatusPill>}
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-900 leading-tight">{c.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {c.category}
              {c.subcategory && ` · ${c.subcategory}`}
              {c.deliveryLocation && ` · ${c.deliveryLocation}`} · Deadline {fmtDate(c.responseDeadline)}
            </p>
            {c.reviewNote && <p className="mt-2 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2">SOKO review note: {c.reviewNote}</p>}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {(c.status === 'draft' || c.status === 'rejected') && (
              <>
                {c.status === 'draft' && (
                  <button type="button" onClick={() => setConfirm('discard')} className={btnGhost}>
                    Discard
                  </button>
                )}
                <button type="button" onClick={onEdit} className={btnSecondary}>
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button type="button" onClick={() => hub.run(submitCampaignForReview(hub.store, hub.actor, c.id), 'Submitted for SOKO review')} className={btnPrimary}>
                  Submit for Review
                </button>
              </>
            )}
            {c.status === 'pending_review' && (
              <button type="button" onClick={demoApprove} className={btnSecondary}>
                Simulate SOKO approval (demo)
              </button>
            )}
            {c.status === 'approved' && (
              <button type="button" onClick={() => setConfirm('launch')} className={btnPrimary}>
                <Rocket className="w-4 h-4" />
                Launch Campaign
              </button>
            )}
            {c.status === 'scheduled' && (
              <button type="button" onClick={() => setConfirm('launch')} className={btnPrimary}>
                <Rocket className="w-4 h-4" />
                Start delivery now (demo)
              </button>
            )}
            {c.status === 'active' && (
              <button type="button" onClick={() => setConfirm('close')} className={btnSecondary}>
                Close Campaign
              </button>
            )}
          </div>
        </div>
        {c.status === 'scheduled' && c.scheduledFor && <p className="mt-3 text-xs text-slate-500">Scheduled to deliver on {fmtDate(c.scheduledFor)}.</p>}
        {c.status === 'suspended' && <p className="mt-3 text-xs text-red-700">This campaign was suspended by SOKO moderation and is no longer visible to recipients.</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Campaign performance</h3>
            {m.includesDemoValues && <StatusPill tone="slate">Includes demo values</StatusPill>}
          </div>
          <ProgressRow label="Eligible audience" value={m.eligible} of={m.eligible} tone="slate" />
          <ProgressRow label="Delivered" value={m.delivered} of={m.eligible} />
          <ProgressRow label="Viewed" value={m.viewed} of={m.delivered} />
          <ProgressRow label="Clicked" value={m.clicked} of={m.delivered} />
          <ProgressRow label="Interested" value={m.interested} of={m.delivered} tone="gold" />
          {sourcing && <ProgressRow label="Responded" value={m.responded} of={m.delivered} tone="gold" />}
          {sourcing && <ProgressRow label="Shortlisted" value={m.shortlisted} of={Math.max(m.responded, 1)} tone="green" />}
          <DemoNote>
            "Viewed" counts only recorded inbox views{m.includesDemoValues ? ' plus a labelled demo baseline' : ''}. Recipients who have not responded are shown as totals only — their identities are never revealed.
          </DemoNote>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Response rate" value={`${m.responseRate}%`} />
            <Field label="Declined" value={String(m.declined)} />
            <Field label="Duration" value={m.durationDays ? `${m.durationDays} days` : 'Not launched'} />
            <Field label="Credits used" value={`${m.creditsUsed} of ${c.creditsRequired} est.`} />
            {c.frequencyCapped ? <Field label="Held by frequency limit" value={`${c.frequencyCapped} recipients`} /> : null}
            {m.reports ? <Field label="Spam reports" value={String(m.reports)} /> : null}
          </dl>
          {sourcing && <ResponseActivity responses={c.responses} />}
        </section>
      </div>

      {sourcing ? (
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <h3 className="px-5 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">
            Responses <span className="text-slate-400 tabular-nums">{c.responses.length}</span>
          </h3>
          {c.responses.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
                    <th className="px-5 py-2">Responding company</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Verification</th>
                    <th className="px-3 py-2">Response date</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...c.responses]
                    .sort((a, b) => Number(b.shortlisted) - Number(a.shortlisted) || b.at.localeCompare(a.at))
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-2.5">
                          <button type="button" onClick={() => setOpenResponse(r.id)} className="font-semibold text-slate-900 hover:text-blue-700 text-left cursor-pointer">
                            {r.companyName}
                          </button>
                          <p className="text-[11px] text-slate-500">{AVAIL_LABEL[r.availability]} · {r.leadTime}</p>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{r.category}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{r.location}</td>
                        <td className="px-3 py-2.5">{r.verified ? <VerifiedCompanyBadge /> : <span className="text-xs text-slate-400">Not verified</span>}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(r.at)}</td>
                        <td className="px-3 py-2.5">
                          {r.connectRequested ? <StatusPill tone="blue">Connect requested</StatusPill> : r.shortlisted ? <StatusPill tone="gold">Shortlisted</StatusPill> : <StatusPill tone="slate">Received</StatusPill>}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex justify-end gap-1 whitespace-nowrap">
                            <button type="button" onClick={() => setOpenResponse(r.id)} className={`${btnSecondary} ${small}`}>
                              View
                            </button>
                            {responseActions(r)}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-6 text-sm text-slate-500">{c.status === 'active' ? 'No responses yet. Responses from suppliers appear here.' : 'Responses appear here after launch.'}</p>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Interested recipients who shared their identity</h3>
        {disclosedInterests.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {disclosedInterests.map((d, i) => (
              <li key={i} className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {d.companyName}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-slate-500">None yet. Other interested recipients are counted anonymously.</p>
        )}
      </section>

      {resp && (
        <ResponseDialog
          r={resp}
          onClose={() => setOpenResponse(null)}
          footer={<div className="flex flex-wrap justify-end gap-2">{responseActions(resp, '')}</div>}
        />
      )}
      {confirm === 'launch' && (
        <ProfileDialog
          title="Launch campaign"
          subtitle={c.title}
          onClose={() => setConfirm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} className={btnSecondary}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  hub.run(launchCampaign(hub.store, hub.actor, c.id), (v) =>
                    v.scheduled ? 'Campaign scheduled' : `Delivered to ${v.delivered} Campaign Inboxes${v.capped ? ` (${v.capped} held by frequency limits)` : ''}. Simulated delivery — no emails sent.`
                  );
                  setConfirm(null);
                }}
                className={btnPrimary}
              >
                <Rocket className="w-4 h-4" />
                Confirm Launch
              </button>
            </div>
          }
        >
          <dl className="px-5 py-4 grid grid-cols-2 gap-4">
            <Field label="Eligible audience" value={String(c.estimatedAudience)} />
            <Field label="Credits required (est.)" value={String(c.creditsRequired)} />
            <Field label="Available credits" value={String(account.available)} />
            <Field label="Response deadline" value={fmtDate(c.responseDeadline)} />
            <Field label="Launches in last 7 days" value={`${launchesInLast7Days(hub.store, hub.actor.workspace.id)} of ${hub.actor.entitlements.maxLaunchesPer7Days}`} />
          </dl>
          <p className="px-5 pb-4 text-xs text-slate-500">Recipients already at their weekly campaign limit are held back and not charged.</p>
        </ProfileDialog>
      )}
      {confirm === 'close' && (
        <ConfirmDialog
          title="Close campaign?"
          message="Recipients will no longer be able to respond. Responses you have received stay available."
          confirmLabel="Close Campaign"
          onConfirm={() => hub.run(closeCampaign(hub.store, hub.actor, c.id), 'Campaign closed')}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'discard' && (
        <ConfirmDialog
          title="Discard draft?"
          message="This draft will be removed. This cannot be undone."
          confirmLabel="Discard"
          onConfirm={() => {
            if (hub.run(deleteDraft(hub.store, hub.actor, c.id), 'Draft discarded')) onBack();
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

export const CampaignDashboard: React.FC<{ hub: Hub; onCreate: () => void; onEdit: (v: OwnerCampaignView) => void; openId: string | null; onOpen: (id: string | null) => void }> = ({
  hub,
  onCreate,
  onEdit,
  openId,
  onOpen,
}) => {
  const views = ownerCampaigns(hub.store, hub.actor);
  const account = creditAccount(hub.store, hub.actor);
  const selected = views.find((v) => v.campaign.id === openId);
  if (selected) return <CampaignDetail hub={hub} view={selected} onBack={() => onOpen(null)} onEdit={() => onEdit(selected)} />;

  const sum = (k: keyof OwnerCampaignView['metrics']) => views.reduce((n, v) => n + Number(v.metrics[k]), 0);
  const delivered = sum('delivered');
  const responded = sum('responded');
  const anyDemo = views.some((v) => v.metrics.includesDemoValues);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiCard label="Total campaigns" value={views.length} />
        <KpiCard label="Active" value={views.filter((v) => v.campaign.status === 'active').length} />
        <KpiCard label="Eligible audience" value={sum('eligible')} />
        <KpiCard label="Delivered" value={delivered} />
        <KpiCard label="Viewed" value={sum('viewed')} />
        <KpiCard label="Interested" value={sum('interested')} />
        <KpiCard label="Responses" value={responded} />
        <KpiCard label="Response rate" value={`${delivered ? Math.round((responded / delivered) * 100) : 0}%`} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm text-slate-600">
          <Coins className="w-4 h-4 text-gold-600" />
          <span>
            <span className="font-semibold text-slate-900 tabular-nums">{account.available}</span> credits available ·{' '}
            <span className="tabular-nums">{account.used}</span> used this month
          </span>
        </p>
        {anyDemo && <DemoNote>Totals include illustrative demo values for sample campaigns.</DemoNote>}
      </div>

      {views.length ? (
        <ul className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {views.map(({ campaign: c, metrics: m }) => (
            <li key={c.id}>
              <button type="button" onClick={() => onOpen(c.id)} className="w-full grid grid-cols-[1fr_auto] md:grid-cols-[1fr_110px_90px_90px_90px_24px] items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 truncate">{c.title}</span>
                  <span className="block text-xs text-slate-500 truncate">
                    {c.kind === 'sourcing' ? 'Sourcing' : 'Promotion'} · {c.category} · {c.launchedAt ? `Launched ${fmtDate(c.launchedAt)}` : `Created ${fmtDate(c.createdAt)}`}
                  </span>
                </span>
                <span className="justify-self-end md:justify-self-start">
                  <CampaignStatusPill status={c.status} />
                </span>
                <span className="hidden md:block text-xs text-slate-500">
                  <span className="block font-semibold text-slate-900 tabular-nums">{m.eligible}</span>eligible
                </span>
                <span className="hidden md:block text-xs text-slate-500">
                  <span className="block font-semibold text-slate-900 tabular-nums">{m.delivered}</span>delivered
                </span>
                <span className="hidden md:block text-xs text-slate-500">
                  <span className="block font-semibold text-slate-900 tabular-nums">{c.kind === 'sourcing' ? m.responded : m.interested}</span>
                  {c.kind === 'sourcing' ? 'responses' : 'interested'}
                </span>
                <ChevronRight className="hidden md:block w-4 h-4 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Megaphone className="w-5 h-5" />}
          title="No campaigns yet"
          text="Create your first campaign to reach relevant SOKO members through their Campaign Inbox."
          action={
            <button type="button" onClick={onCreate} className={btnPrimary}>
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          }
        />
      )}
    </div>
  );
};
