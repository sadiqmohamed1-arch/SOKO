import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Building2, Lock, Paperclip, Pause, Pencil, Play, Rocket, Star } from 'lucide-react';
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
  setCampaignPaused,
  submitCampaignForReview,
  updateResponse,
} from '../../data/marketHubService';
import { CampaignResponse, OwnerCampaignView } from '../../data/marketHubTypes';
import { ProfileDialog } from '../ProfileDialog';
import { ConfirmDialog, StatusPill, VerifiedCompanyBadge, btnGhost, btnPrimary, btnSecondary } from '../NetworkShared';
import { CampaignStatusPill, DemoNote, Field, Hub, KpiCard, daysAgo, fmtDate } from './MarketHubShared';
import { pct, responsesOf } from './CampaignDashboard';
import { ActivityTimeline, Breakdown, Funnel, InsightCard, tally } from './CampaignInsights';

export const AVAIL_LABEL: Record<CampaignResponse['availability'], string> = {
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

const TargetRow: React.FC<{ label: string; values?: string[]; fallback?: string }> = ({ label, values, fallback = 'Any' }) => (
  <div className="grid grid-cols-[110px_1fr] gap-3 py-2 text-xs">
    <dt className="font-semibold text-slate-500">{label}</dt>
    <dd className="flex flex-wrap gap-1">
      {values?.length ? (
        values.map((x) => (
          <span key={x} className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
            {x}
          </span>
        ))
      ) : (
        <span className="text-slate-500">{fallback}</span>
      )}
    </dd>
  </div>
);

const AudienceSummary: React.FC<{ view: OwnerCampaignView }> = ({ view }) => {
  const c = view.campaign;
  const s = c.supplierAudience;
  const b = c.buyerAudience;
  return (
    <>
      <p className="text-xs text-slate-500">
        {c.kind === 'sourcing' ? 'Relevant SOKO suppliers matching' : 'Opted-in SOKO buyers and companies matching'} these filters.{' '}
        <span className="font-semibold text-slate-900 tabular-nums">{view.metrics.eligible}</span> eligible.
      </p>
      <dl className="mt-2 divide-y divide-slate-100">
        {s && (
          <>
            <TargetRow label="Categories" values={s.categories} />
            <TargetRow label="Subcategories" values={s.subcategories} />
            <TargetRow label="Supplier types" values={s.supplierTypes} />
            <TargetRow label="Locations" values={s.emirates} fallback="All emirates" />
            <TargetRow label="Verification" values={s.verifiedOnly ? ['Verified suppliers only'] : []} fallback="All suppliers" />
            {s.keywords && <TargetRow label="Keywords" values={[s.keywords]} />}
          </>
        )}
        {b && (
          <>
            <TargetRow label="Following" values={b.categories} />
            <TargetRow label="Locations" values={b.emirates} fallback="All emirates" />
            <TargetRow label="Roles" values={b.roles} />
            <TargetRow label="Company types" values={b.companyTypes} />
            {b.productInterests && <TargetRow label="Interests" values={[b.productInterests]} />}
          </>
        )}
      </dl>
      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500">
        <Lock className="w-3.5 h-3.5 mt-px shrink-0 text-slate-400" />
        Recipients are matched and reached by SOKO. Names, emails and phone numbers are never shown to senders and cannot be exported.
      </p>
    </>
  );
};

export const CampaignDetail: React.FC<{
  hub: Hub;
  view: OwnerCampaignView;
  focusResponses?: boolean;
  onBack: () => void;
  onEdit: () => void;
}> = ({ hub, view, focusResponses, onBack, onEdit }) => {
  const { campaign: c, metrics: m, disclosedInterests } = view;
  const [openResponse, setOpenResponse] = useState<string | null>(null);
  const responsesRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focusResponses) responsesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusResponses]);
  const [confirm, setConfirm] = useState<'launch' | 'close' | 'discard' | 'pause' | null>(null);
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
        Campaigns
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
              <button type="button" onClick={() => setConfirm('pause')} className={btnSecondary}>
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}
            {c.status === 'paused' && (
              <button type="button" onClick={() => hub.run(setCampaignPaused(hub.store, hub.actor, c.id, false), 'Campaign resumed')} className={btnPrimary}>
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}
            {(c.status === 'active' || c.status === 'paused') && (
              <button type="button" onClick={() => setConfirm('close')} className={btnSecondary}>
                Close Campaign
              </button>
            )}
          </div>
        </div>
        {c.status === 'scheduled' && c.scheduledFor && <p className="mt-3 text-xs text-slate-500">Scheduled to deliver on {fmtDate(c.scheduledFor)}.</p>}
        {c.status === 'paused' && <p className="mt-3 text-xs text-amber-800">Paused: recipients cannot see or respond to this campaign until you resume it. Responses already received stay available.</p>}
        {c.status === 'suspended' && <p className="mt-3 text-xs text-red-700">This campaign was suspended by SOKO moderation and is no longer visible to recipients.</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Delivered" value={c.launchedAt ? m.delivered : '—'} hint={`of ${m.eligible} eligible`} />
        <KpiCard label="View Rate" value={c.launchedAt ? `${pct(m.viewed, m.delivered)}%` : '—'} hint={`${m.viewed} viewed ÷ delivered`} />
        <KpiCard label="Response Rate" value={c.launchedAt ? `${pct(responsesOf(view), m.delivered)}%` : '—'} hint={sourcing ? `${m.responded} responses ÷ delivered` : `${responsesOf(view)} shared identity ÷ delivered`} />
        <KpiCard label="Interested" value={m.interested} hint={`${disclosedInterests.length} shared identity`} />
        <KpiCard label="Credits Consumed" value={m.creditsUsed} hint={`${c.creditsRequired} estimated · demo credits`} />
      </div>
      {m.includesDemoValues && <DemoNote>Simulated: this campaign includes a labelled demo baseline and sample responses. They do not represent real performance.</DemoNote>}

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightCard title="Audience Targeting">
          <AudienceSummary view={view} />
        </InsightCard>
        <InsightCard title="Delivery Funnel">
          {c.launchedAt ? <Funnel v={view} /> : <p className="text-sm text-slate-500">The funnel appears after SOKO approves and delivers this campaign. Estimated eligible audience: {m.eligible}.</p>}
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <Field label="Declined" value={String(m.declined)} />
            <Field label="Duration" value={m.durationDays ? `${m.durationDays} days` : 'Not launched'} />
            <Field label="Deadline" value={fmtDate(c.responseDeadline)} />
            {c.frequencyCapped ? <Field label="Held by weekly limit" value={`${c.frequencyCapped} recipients`} /> : null}
            {m.reports ? <Field label="Spam reports" value={String(m.reports)} /> : null}
          </dl>
        </InsightCard>
      </div>


      {sourcing ? (
        <section ref={responsesRef} className="rounded-2xl border border-slate-200 bg-white overflow-hidden scroll-mt-4">
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

      <section ref={sourcing ? undefined : responsesRef} className="rounded-2xl border border-slate-200 bg-white p-5 scroll-mt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Interested Recipients <span className="text-slate-400 tabular-nums">{m.interested}</span>
          </h3>
          <span className="text-[11px] text-slate-500">{m.interested - disclosedInterests.length > 0 ? `${m.interested - disclosedInterests.length} counted anonymously` : ''}</span>
        </div>
        {disclosedInterests.length ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {disclosedInterests.map((d, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">{d.companyName}</span>
                <span className="text-xs text-slate-500">Shared identity · {daysAgo(d.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-slate-500">None have shared their identity yet. Interested recipients are counted anonymously unless they choose to share.</p>
        )}
        {!sourcing && disclosedInterests.length > 0 && <p className="mt-2 text-[11px] text-slate-400">Follow up through SOKO messaging. Contact details are not shared with campaign senders.</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard title="Campaign Activity" className="lg:col-span-1">
          <ActivityTimeline v={view} />
        </InsightCard>
        <InsightCard title="Responses by Category">
          <Breakdown rows={sourcing ? tally(c.responses.map((r) => r.category)) : []} empty={sourcing ? 'No responses yet.' : 'Promotional campaigns collect interest rather than structured responses.'} />
        </InsightCard>
        <InsightCard title="Responses by Location">
          <Breakdown rows={sourcing ? tally(c.responses.map((r) => r.location)) : []} empty={sourcing ? 'No responses yet.' : 'Location breakdowns are available for sourcing campaign responses.'} />
        </InsightCard>
      </div>

      <DemoNote>Views are counted only when a recipient opens the campaign in their Campaign Inbox. Delivery, credits and SOKO review are simulated in this prototype.</DemoNote>

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
      {confirm === 'pause' && (
        <ConfirmDialog
          title="Pause campaign?"
          message="Recipients will not see this campaign or be able to respond until you resume it. No extra credits are used."
          confirmLabel="Pause Campaign"
          onConfirm={() => hub.run(setCampaignPaused(hub.store, hub.actor, c.id, true), 'Campaign paused')}
          onClose={() => setConfirm(null)}
        />
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
