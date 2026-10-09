import React, { useState } from 'react';
import {
  GitPullRequestArrow, ListChecks, Sparkles, ShieldCheck, CalendarDays, TrendingUp, Activity, Boxes,
  UserCheck, FileSearch, FileX2, FileWarning, CalendarCheck, CalendarClock, BadgeCheck,
  Package, Users, Inbox, MapPin, type LucideIcon,
} from 'lucide-react';
import { SW } from './SupplierShared';
import { fmtDate } from '../marketHub/MarketHubShared';
import { AuditEntry, VendorApprovalStatus, VendorDocStatus } from '../../data/supplierTypes';
import {
  SokoPanel, SokoPanelLink, SokoEyebrow, SokoStatusIndicator, SokoProgress, SokoTabs, SokoTimelineItem,
  SokoProductCard, SokoEmptyState, SokoAvatar, sokoTone, sokoTokens, type MetricTone, type SokoStatusTone,
} from '../sokoDesignSystem/SokoComponents';

const sokoEyebrowClass = sokoTokens.eyebrow;
import { SokoSegmentBar, SokoCoverageRow, SokoWaffle, SokoColumnChart, SokoMiniCalendar } from '../sokoDesignSystem/SokoCharts';
import { ActionGroup, ActionKind, ContractorDashboardData, PIPELINE_ORDER, daysFrom } from './contractorDashboardData';

export const APPROVAL_META: Record<VendorApprovalStatus, { label: string; status: SokoStatusTone; tone: MetricTone }> = {
  'not-reviewed':           { label: 'Not reviewed', status: 'neutral',  tone: 'blueSoft' },
  'under-review':           { label: 'Under review', status: 'warning',  tone: 'blueMid' },
  'conditionally-approved': { label: 'Conditional',  status: 'info',     tone: 'sky' },
  'approved':               { label: 'Approved',     status: 'success',  tone: 'blue' },
  'rejected':               { label: 'Rejected',     status: 'critical', tone: 'navy' },
  'suspended':              { label: 'Suspended',    status: 'critical', tone: 'red' },
};

export const DOC_META: Record<VendorDocStatus, { label: string; tone: MetricTone }> = {
  accepted:       { label: 'Accepted',        tone: 'blue' },
  'under-review': { label: 'Under review',    tone: 'blueMid' },
  submitted:      { label: 'Submitted',       tone: 'blueSoft' },
  missing:        { label: 'Not submitted',   tone: 'amber' },
  rejected:       { label: 'Rejected',        tone: 'red' },
};

const DOC_ORDER: VendorDocStatus[] = ['accepted', 'under-review', 'submitted', 'missing', 'rejected'];

const VISIT_STATUS: Record<string, { label: string; tone: SokoStatusTone }> = {
  'pending-confirmation': { label: 'Pending', tone: 'warning' },
  scheduled: { label: 'Confirmed', tone: 'success' },
  'checked-in': { label: 'Checked in', tone: 'info' },
  'in-meeting': { label: 'In meeting', tone: 'info' },
  completed: { label: 'Completed', tone: 'neutral' },
};

const ACTION_ICON: Record<ActionKind, { icon: LucideIcon; dot: string }> = {
  'vendor-review':  { icon: UserCheck,     dot: 'bg-amber-500' },
  'doc-review':     { icon: FileSearch,    dot: 'bg-blue-500' },
  'doc-missing':    { icon: FileX2,        dot: 'bg-amber-500' },
  'doc-expiring':   { icon: FileWarning,   dot: 'bg-rose-500' },
  'visit-confirm':  { icon: CalendarClock, dot: 'bg-rose-500' },
  'visit-upcoming': { icon: CalendarCheck, dot: 'bg-blue-500' },
};

const KIND_TAB: Record<AuditEntry['kind'], { label: string; tab: string }> = {
  profile: { label: 'Profile', tab: 'sw-profile' },
  verification: { label: 'Verification', tab: 'sw-profile' },
  product: { label: 'Products', tab: 'sw-products' },
  document: { label: 'Documents', tab: 'sw-documents' },
  team: { label: 'Team', tab: 'sw-team' },
  plan: { label: 'Subscription', tab: 'sw-plan' },
  contact: { label: 'Contacts', tab: 'sw-contacts' },
  visit: { label: 'Visits', tab: 'sw-visits' },
};

type P = { sw: SW; data: ContractorDashboardData };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const ago = (today: Date, iso: string) => {
  const d = -daysFrom(today, iso);
  return d <= 0 ? 'Today' : d === 1 ? '1d ago' : `${d}d ago`;
};

export const VendorPipelinePanel: React.FC<P> = ({ sw, data }) => {
  const { vendors, statusCount, vendorProgress, avgPendingWait, today } = data;
  return (
    <SokoPanel
      title="Vendor approval pipeline"
      subtitle={`${plural(vendors.length, 'vendor')} across ${PIPELINE_ORDER.length} GEC approval stages${avgPendingWait !== null ? ` · pending avg. ${plural(avgPendingWait, 'day')} since added` : ''}`}
      icon={GitPullRequestArrow}
      action={<SokoPanelLink label="Vendor register" onClick={() => sw.go('sw-vendors')} />}
      flush
    >
      <div className="px-5">
        <SokoSegmentBar segments={PIPELINE_ORDER.map((s) => ({ label: APPROVAL_META[s].label, value: statusCount(s), tone: APPROVAL_META[s].tone }))} />
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 rounded-xl border border-slate-200 divide-x divide-slate-200 overflow-hidden [&>*:nth-child(n+4)]:border-t sm:[&>*:nth-child(n+4)]:border-t-0">
          {PIPELINE_ORDER.map((s) => (
            <button key={s} type="button" onClick={() => sw.go('sw-vendors')}
              className="px-3 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-blue-50 border-slate-200">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap">
                <span className={`w-1.5 h-1.5 rounded-full ${sokoTone(APPROVAL_META[s].tone).dot}`} />
                {APPROVAL_META[s].label}
              </span>
              <span className="mt-1 block text-xl font-semibold text-slate-900 tabular-nums">{statusCount(s)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 border-t border-slate-100">
        <div className="px-5 py-2.5 flex items-center justify-between bg-slate-50/60 border-b border-slate-100">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate-500">In progress</p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Documents accepted</p>
        </div>
        {vendorProgress.length === 0 ? (
          <p className="px-5 py-5 text-xs text-slate-500">No vendors are waiting on an approval decision.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {vendorProgress.map(({ vendor: v, accepted, requested }) => (
              <li key={v.id}>
                <button type="button" onClick={() => sw.go('sw-vendors')}
                  className="w-full px-5 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-blue-50">
                  <SokoAvatar name={v.supplierName} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 truncate" title={v.supplierName}>{v.supplierName}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{v.tradeCategory} · Added {fmtDate(v.addedAt)} ({ago(today, v.addedAt)})</span>
                  </span>
                  <span className="hidden sm:inline-flex"><SokoStatusIndicator label={APPROVAL_META[v.approvalStatus].label} tone={APPROVAL_META[v.approvalStatus].status} /></span>
                  {requested > 0 ? (
                    <span className="flex items-center gap-2 w-32 justify-end shrink-0">
                      <SokoProgress value={accepted / requested} className="w-16" />
                      <span className="font-mono text-[11px] text-slate-600 tabular-nums w-9 text-right">{accepted}/{requested}</span>
                    </span>
                  ) : (
                    <span className="w-32 text-right text-[11px] text-slate-400 shrink-0">None requested</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SokoPanel>
  );
};

export const VendorIntelligencePanel: React.FC<P> = ({ sw, data }) => {
  const { vendors, categories, singleSource, linkedVendors, verificationMatrix: m, verifiedPending, externalVendors } = data;
  const cells: { key: string; label: string; list: typeof vendors; tone: string }[] = [
    { key: 'va', label: 'Verified · Approved', list: m.verifiedApproved, tone: 'bg-blue-600 text-white border-blue-600' },
    { key: 'vn', label: 'Verified · Not approved', list: m.verifiedNotApproved, tone: 'bg-blue-50 text-blue-900 border-blue-200' },
    { key: 'ua', label: 'Unverified · Approved', list: m.unverifiedApproved, tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { key: 'un', label: 'Unverified · Not approved', list: m.unverifiedNotApproved, tone: 'bg-slate-50 text-slate-700 border-slate-200' },
  ];
  const signals: { text: React.ReactNode; tone: 'info' | 'warning' | 'neutral' }[] = [];
  if (verifiedPending.length > 0) signals.push({ tone: 'info', text: <><span className="font-semibold">{verifiedPending.map((v) => v.supplierName).join(', ')}</span> {verifiedPending.length === 1 ? 'is' : 'are'} SOKO-verified and still pending your approval.</> });
  if (m.unverifiedApproved.length > 0) signals.push({ tone: 'warning', text: <><span className="font-semibold">{plural(m.unverifiedApproved.length, 'approved vendor')}</span> {m.unverifiedApproved.length === 1 ? 'has' : 'have'} no SOKO verification. Your approval is the only check on record.</> });
  if (singleSource.length > 0) signals.push({ tone: 'warning', text: <><span className="font-semibold">Single-source trades:</span> {singleSource.join(', ')}.</> });
  if (externalVendors.length > 0) signals.push({ tone: 'neutral', text: <><span className="font-semibold">{plural(externalVendors.length, 'vendor')}</span> {externalVendors.length === 1 ? 'is' : 'are'} not on SOKO, so profile and product data come only from your records.</> });
  const signalStyle = { info: 'border-blue-200 bg-blue-50/60 text-blue-900', warning: 'border-amber-200 bg-amber-50/70 text-amber-900', neutral: 'border-slate-200 bg-slate-50 text-slate-700' };
  return (
    <SokoPanel
      title="Vendor intelligence"
      subtitle={`Trade coverage, SOKO verification and GEC approval · ${linkedVendors.length} on SOKO, ${vendors.length - linkedVendors.length} external`}
      icon={Sparkles}
      action={<SokoPanelLink label="Open intelligence" onClick={() => sw.go('sw-insights')} />}
      flush
    >
      {vendors.length === 0 ? (
        <div className="px-5 pb-5"><SokoEmptyState icon={Users} title="No vendors yet" description="Add suppliers to your vendor register to see trade coverage." /></div>
      ) : (
        <div className="grid md:grid-cols-2 border-t border-slate-100 md:divide-x divide-slate-100">
          <div className="px-5 py-4">
            <SokoEyebrow aside="Share of all vendors">Category coverage</SokoEyebrow>
            <ul className="mt-3 flex flex-col gap-2">
              {categories.map(([cat, n], i) => (
                <SokoCoverageRow key={cat} label={cat} value={n} total={vendors.length} unit={['vendor', 'vendors']} tone={i === 0 ? 'blue' : 'blueMid'} />
              ))}
            </ul>
            {signals.length > 0 && (
              <>
                <p className={`mt-4 ${sokoEyebrowClass}`}>Signals</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {signals.map((s, i) => (
                    <li key={i} className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${signalStyle[s.tone]}`}>{s.text}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="px-5 py-4 border-t md:border-t-0 border-slate-100">
            <SokoEyebrow aside="Vendors in register">Verification × approval</SokoEyebrow>
            <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-1.5 text-[11px]">
              <span />
              <span className="text-center font-medium text-slate-500">GEC approved</span>
              <span className="text-center font-medium text-slate-500">Not approved</span>
              {[['SOKO verified', cells[0], cells[1]], ['Not verified', cells[2], cells[3]]].map(([rowLabel, a, b]) => (
                <React.Fragment key={rowLabel as string}>
                  <span className="self-center pr-1 font-medium text-slate-500 whitespace-nowrap">{rowLabel as string}</span>
                  {[a, b].map((c) => {
                    const cell = c as typeof cells[number];
                    return (
                      <button key={cell.key} type="button" onClick={() => sw.go('sw-vendors')} aria-label={`${cell.label}: ${plural(cell.list.length, 'vendor')}`}
                        className={`${sokoTokens.focus} min-w-0 rounded-lg border px-3 py-2 text-left hover:brightness-95 transition cursor-pointer ${cell.tone}`}>
                        <span className="block text-xl font-semibold tabular-nums leading-tight">{cell.list.length}</span>
                        <span className="block truncate opacity-80" title={cell.list.map((v) => v.supplierName).join(', ')}>
                          {cell.list.length ? cell.list.map((v) => v.supplierName).join(', ') : 'None'}
                        </span>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <ul className="mt-3 divide-y divide-slate-100">
              {vendors.slice(0, 4).map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2">
                  <SokoAvatar name={v.supplierName} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[13px] font-medium text-slate-900">
                      <span className="truncate" title={v.supplierName}>{v.supplierName}</span>
                      {v.sokoVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-label="Verified on SOKO" />}
                    </span>
                    <span className="block text-[11px] text-slate-500 truncate">{v.tradeCategory} · {v.external ? 'External' : 'On SOKO'}</span>
                  </span>
                  <SokoStatusIndicator label={APPROVAL_META[v.approvalStatus].label} tone={APPROVAL_META[v.approvalStatus].status} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">SOKO verification is issued by the platform. GEC approval is your team&apos;s internal decision. One does not imply the other.</p>
          </div>
        </div>
      )}
    </SokoPanel>
  );
};

type ActionFilter = 'all' | ActionGroup;

export const ActionCenterPanel: React.FC<P> = ({ sw, data }) => {
  const [filter, setFilter] = useState<ActionFilter>('all');
  const { actions } = data;
  const count = (g: ActionGroup) => actions.filter((a) => a.group === g).length;
  const urgent = actions.filter((a) => a.urgent).length;
  const shown = filter === 'all' ? actions : actions.filter((a) => a.group === filter);
  return (
    <SokoPanel
      title="Action center"
      subtitle={`${actions.length} open · ${urgent} due soon`}
      icon={ListChecks}
      action={<span className="mr-1.5 min-w-6 h-6 px-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center tabular-nums">{actions.length}</span>}
      className="h-full lg:absolute lg:inset-0"
      flush
    >
      <div className="flex h-full min-h-0 flex-col">
      <div className="px-5">
      <SokoTabs<ActionFilter> label="Filter actions" active={filter} onChange={setFilter} tabs={[
        { id: 'all', label: 'All' },
        { id: 'approvals', label: 'Approvals', count: count('approvals') },
        { id: 'compliance', label: 'Compliance', count: count('compliance') },
        { id: 'visits', label: 'Visits', count: count('visits') },
      ]} />
      </div>
      {shown.length === 0 ? (
        <div className="px-5 pb-5"><SokoEmptyState icon={Inbox} title="Nothing waiting here" description="New approvals, document reviews and visits will appear as they come in." /></div>
      ) : (
        <ul className="mt-2 flex-1 min-h-0 overflow-y-auto px-3 pb-3 divide-y divide-slate-100" aria-label="Open actions">
          {shown.map((a) => {
            const meta = ACTION_ICON[a.kind];
            const Icon = meta.icon;
            return (
              <li key={a.id}>
                <button type="button" onClick={() => sw.go(a.tab)}
                  className="w-full flex items-start gap-3 py-2.5 px-2 text-left rounded-lg hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <span className="relative mt-0.5 w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                    <span className={`absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full ring-2 ring-white ${meta.dot}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-slate-900 leading-snug">{a.title}</span>
                    <span className="block mt-0.5 text-[11px] text-slate-500 truncate">{a.detail}</span>
                  </span>
                  <span className={`font-mono text-[10px] uppercase tracking-wider whitespace-nowrap shrink-0 pt-0.5 ${a.urgent ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>{a.due}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </SokoPanel>
  );
};

export const CompliancePanel: React.FC<P> = ({ sw, data }) => {
  const { complianceDocs, docCount, docTypes, complianceVendorCount, expiring, today } = data;
  const accepted = docCount('accepted');
  const cells = DOC_ORDER.flatMap((s) => Array.from({ length: docCount(s) }, () => DOC_META[s].tone));
  return (
    <SokoPanel
      title="Compliance overview"
      subtitle={complianceDocs.length > 0 ? `${plural(complianceDocs.length, 'document')} across ${plural(complianceVendorCount, 'vendor')}` : 'Vendor compliance documents'}
      icon={ShieldCheck}
      action={<SokoPanelLink label="Documents" onClick={() => sw.go('sw-documents')} />}
    >
      {complianceDocs.length === 0 ? (
        <SokoEmptyState icon={ShieldCheck} title="No documents requested" description="Request compliance documents from vendors in the Document Center." />
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <p className="text-[40px] font-semibold text-slate-900 leading-none tabular-nums tracking-tight">
              {accepted}<span className="text-lg text-slate-400 font-medium">/{complianceDocs.length}</span>
            </p>
            <p className="text-right text-xs text-slate-500 pb-1">documents accepted<br /><span className="text-slate-400">{Math.round((accepted / complianceDocs.length) * 100)}% acceptance rate</span></p>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">Acceptance rate counts reviewed documents only. It does not validate certificate authenticity or scope.</p>
          <div className="mt-3"><SokoWaffle cells={cells} label={DOC_ORDER.map((s) => `${DOC_META[s].label} ${docCount(s)}`).join(', ')} /></div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {DOC_ORDER.filter((s) => docCount(s) > 0).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className={`w-2 h-2 rounded-sm ${sokoTone(DOC_META[s].tone).bar}`} />{DOC_META[s].label} {docCount(s)}
              </span>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            {docTypes.slice(0, 4).map((t) => (
              <div key={t.type} className="min-w-0">
                <dt className="text-[11px] text-slate-500 truncate">{t.type}</dt>
                <dd className="text-sm font-semibold text-slate-900 tabular-nums">{t.accepted}<span className="text-slate-400 font-normal">/{t.total}</span></dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <div className="mt-5 -mx-5 px-5 pt-4 border-t border-slate-100">
        <SokoEyebrow aside="Next 30 days">Expiring soon</SokoEyebrow>
        {expiring.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No vendor documents expire in the next 30 days.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {expiring.slice(0, 3).map((e, i) => (
              <li key={e.id} className={`flex items-center justify-between gap-3 border-l-[3px] pl-3 py-0.5 ${i === 0 ? 'border-rose-500' : i === 1 ? 'border-amber-400' : 'border-blue-300'}`}>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-slate-900 truncate">{e.supplier}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{e.name}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 shrink-0">{e.days < 0 ? 'expired' : e.days === 0 ? 'today' : `in ${e.days} days`}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="sr-only">As of {fmtDate(today.toISOString())}</p>
      </div>
    </SokoPanel>
  );
};

export const VisitsPanel: React.FC<P> = ({ sw, data }) => {
  const { visits, upcomingVisits, todayVisits, monthVisits, markedDays, counterpart, today, visitStatus } = data;
  const tiles: [string, number, string][] = [
    ['Scheduled', visitStatus.scheduled, 'bg-emerald-500'],
    ['Pending confirmation', visitStatus.pendingConfirmation, 'bg-amber-500'],
    ['Checked in', visitStatus.checkedIn, 'bg-blue-500'],
    ['Completed', visitStatus.completed, 'bg-slate-400'],
  ];
  return (
    <SokoPanel
      title="Supplier visits"
      subtitle={`${plural(todayVisits.length, 'visit')} today · ${monthVisits.length} this month`}
      icon={CalendarDays}
      action={<SokoPanelLink label="View all" onClick={() => sw.go('sw-visits')} />}
    >
      <dl className="grid grid-cols-2 gap-2">
        {tiles.map(([l, v, dot]) => (
          <div key={l} className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden />{l}</dt>
            <dd className="text-lg font-semibold text-slate-900 tabular-nums leading-tight">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3"><SokoMiniCalendar today={today} marked={markedDays} /></div>
      <div className="mt-4 -mx-5 border-t border-slate-100">
        {visits.length === 0 || upcomingVisits.length === 0 ? (
          <p className="px-5 pt-4 text-xs text-slate-500">No upcoming visits. Schedule one from the Visits page.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingVisits.slice(0, 2).map((v) => {
              const d = new Date(v.date);
              const st = VISIT_STATUS[v.status] ?? { label: v.status, tone: 'neutral' as const };
              return (
                <li key={v.id}>
                  <button type="button" onClick={() => sw.go('sw-visits')} className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-blue-50">
                    <span className="w-10 shrink-0 rounded-lg border border-slate-200 text-center py-1">
                      <span className="block font-mono text-[9.5px] uppercase text-blue-600 leading-none">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                      <span className="block text-base font-semibold text-slate-900 leading-tight tabular-nums">{d.getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-slate-900 truncate">{counterpart(v)}</span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 truncate"><CalendarClock className="w-3 h-3 shrink-0" />{v.time} · {v.purpose}</span>
                    </span>
                    <SokoStatusIndicator label={st.label} tone={st.tone} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SokoPanel>
  );
};

export const MarketHubPanel: React.FC<P> = ({ sw, data }) => {
  const { market, weekly, contactsCount, today } = data;
  return (
    <SokoPanel
      title="Market Hub activity"
      subtitle="Opportunities relevant to you"
      icon={TrendingUp}
      action={<SokoPanelLink label="Explore" onClick={() => sw.go('opportunities')} />}
      className="w-full"
    >
      <div className="grid grid-cols-3 gap-3">
        {[['Relevant', market.relevantCount, 'text-blue-600'], ['Responses', market.responses, 'text-slate-900'], ['Network', contactsCount, 'text-slate-900']].map(([l, v, c]) => (
          <div key={l as string}>
            <p className="text-[11px] text-slate-500">{l}</p>
            <p className={`text-xl font-semibold tabular-nums leading-tight ${c}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <SokoColumnChart values={weekly} startLabel="12 wks ago" endLabel="This week" label="Open opportunities posted per week" />
        <p className="mt-1 text-[10.5px] text-slate-400">Open opportunities posted per week</p>
      </div>
      <div className="mt-4 -mx-5 border-t border-slate-100">
        {market.relevant.length === 0 ? (
          <p className="px-5 pt-4 text-xs text-slate-500">No open opportunities right now.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {market.relevant.slice(0, 2).map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => sw.go('opportunities')} className="w-full px-5 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-blue-50">
                  <span className="block text-[13px] font-semibold text-slate-900 truncate">{o.title}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 truncate">
                    {o.type} · <MapPin className="w-3 h-3 shrink-0" /> {o.location} · {ago(today, o.postedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SokoPanel>
  );
};

export const RecentActivityPanel: React.FC<P> = ({ sw, data }) => {
  const { audit } = data;
  return (
    <SokoPanel title="Recent activity" subtitle="Latest actions in this workspace" icon={Activity} className="w-full">
      {audit.length === 0 ? (
        <SokoEmptyState icon={Activity} title="No recent activity" description="Actions taken by your team will appear here." />
      ) : (
        <ol>
          {audit.map((a, i) => {
            const k = KIND_TAB[a.kind];
            return (
              <SokoTimelineItem key={a.id} actor={a.actor} tag={k.label} timestamp={`${fmtDate(a.at)} · ${fmtTime(a.at)}`} last={i === audit.length - 1} onClick={() => sw.go(k.tab)}>
                <span className="font-semibold text-slate-900">{a.actor}</span> {a.action}
              </SokoTimelineItem>
            );
          })}
        </ol>
      )}
    </SokoPanel>
  );
};

type DiscoveryTab = 'saved' | 'recent' | 'popular';

export const ProductDiscoveryPanel: React.FC<P> = ({ sw, data }) => {
  const [tab, setTab] = useState<DiscoveryTab>('saved');
  const { savedProducts, recentProducts, productInfo, popularCategories, marketProducts } = data;
  const savedIds = new Set(savedProducts.map((s) => s.productId));
  const list = tab === 'saved' ? savedProducts : recentProducts;
  return (
    <SokoPanel title="Product discovery" subtitle="Construction products across SOKO" icon={Boxes} className="w-full" action={<SokoPanelLink label="Discover" onClick={() => sw.go('sw-products')} />}>
      <SokoTabs<DiscoveryTab> variant="underline" label="Product lists" active={tab} onChange={setTab} tabs={[
        { id: 'saved', label: 'Saved', count: savedProducts.length },
        { id: 'recent', label: 'Recently viewed', count: recentProducts.length },
        { id: 'popular', label: 'Popular' },
      ]} />
      <div className="mt-4" role="tabpanel">
        {tab === 'popular' ? (
          popularCategories.length === 0
            ? <SokoEmptyState icon={Package} title="No categories yet" description="Product categories will appear once suppliers list products." />
            : <ul className="space-y-2.5">{popularCategories.map(([c, n]) => <SokoCoverageRow key={c} label={c} value={n} total={marketProducts.length} unit={['product', 'products']} tone="blueMid" />)}</ul>
        ) : list.length === 0 ? (
          <SokoEmptyState icon={Package} title={tab === 'saved' ? 'No saved products' : 'Nothing viewed yet'} description={tab === 'saved' ? 'Save products from Product Discovery to compare them later.' : 'Products you browse will appear here.'} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((item) => {
              const info = productInfo(item.productId);
              if (!info) return null;
              const spec = info.product.specs.slice(0, 2).map((s) => s.value).join(' · ');
              return (
                <SokoProductCard key={item.id} name={info.product.name} supplier={info.supplier} category={info.product.category}
                  spec={spec || info.product.subcategory} imageUrl={info.product.images[0]} placeholderIcon={Package}
                  saved={savedIds.has(item.productId)} onClick={() => sw.go('sw-products')} />
              );
            })}
          </div>
        )}
      </div>
    </SokoPanel>
  );
};
