import React, { useMemo, useState } from 'react';
import {
  Archive, ArrowUpRight, Bookmark, BookmarkCheck, CalendarClock, Check, Clock, Compass, Crown, EyeOff, Inbox, Lock, Mail,
  MapPin, Megaphone, Paperclip, Phone, Plus, Search, User, Users, Briefcase,
} from 'lucide-react';
import { EMIRATES, TRADE_CATEGORIES, URGENCY_LABEL, opportunityTypeLabel } from '../../data/marketHubCatalog';
import { closeOpportunity, requestOpportunityConnection, reviewInterest, toggleSaveOpportunity } from '../../data/marketHubService';
import { InterestStatus, OpportunityInterest, OpportunityView } from '../../data/marketHubTypes';
import { SokoBreadcrumb } from '../sokoDesignSystem/SokoBreadcrumb';
import { SokoChip, SokoEmptyState, SokoKpiCell, SokoStatusIndicator, SokoStatusTone, SokoTabs, sokoCard, sokoTokens } from '../sokoDesignSystem/SokoComponents';
import { Hub, INTEREST_LABEL, daysAgo, fmtDate, fmtMonth } from './MarketHubShared';
import { InterestReview, WorkflowSteps } from './OpportunityDialogs';

type HubTab = 'mine' | 'discover' | 'responses' | 'closed' | 'campaigns';
type StatusFilter = '' | 'open' | 'closed';
type DateFilter = '' | '7' | '30' | '90';

const TAB_LABEL: Record<HubTab, string> = {
  mine: 'My opportunities',
  discover: 'Discover',
  responses: 'Responses received',
  closed: 'Closed / archived',
  campaigns: 'Campaigns',
};

const selectCls = `${sokoTokens.focus} h-10 w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 hover:border-slate-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`;
const secondaryBtn = `${sokoTokens.focus} inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer`;
const primaryBtn = `${sokoTokens.focus} inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer`;
const ghostBtn = `${sokoTokens.focus} inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer`;

const INTEREST_TONE: Record<InterestStatus, SokoStatusTone> = {
  interested: 'info',
  under_review: 'warning',
  connection_requested: 'warning',
  connected: 'success',
  declined: 'neutral',
};

const OpportunityStatus: React.FC<{ o: OpportunityView }> = ({ o }) =>
  o.status === 'closed' ? <SokoStatusIndicator label="Closed" tone="neutral" />
    : o.myInterest ? <SokoStatusIndicator label={INTEREST_LABEL[o.myInterest.status].label} tone={INTEREST_TONE[o.myInterest.status]} />
    : <SokoStatusIndicator label="Open" tone="success" />;

// Contractors only see real response records on their own posts; seeded demo counts are not reviewable responses.
const responsesOf = (o: OpportunityView) => (o.isMine ? o.interests?.length ?? 0 : o.interestedCount);

const withinDays = (iso: string, days: DateFilter) => !days || Date.now() - new Date(iso).getTime() <= Number(days) * 86_400_000;

const Publisher: React.FC<{ o: OpportunityView }> = ({ o }) => {
  if (o.isMine && o.isConfidential) {
    return <span className="inline-flex items-center gap-1.5 text-slate-600"><EyeOff className="w-3.5 h-3.5 text-slate-400" aria-hidden />Published confidentially</span>;
  }
  if (!o.isMine && o.isConfidential && o.publisherDisplay === 'Confidential Buyer') {
    return <span className="inline-flex items-center gap-1.5 text-slate-600"><Lock className="w-3.5 h-3.5 text-slate-400" aria-hidden />Confidential buyer</span>;
  }
  return <span className="truncate text-slate-700">{o.isMine ? 'Your company' : o.publisherDisplay}</span>;
};

interface ContractorMarketHubProps {
  hub: Hub;
  all: OpportunityView[];
  companyName: string;
  openId: string | null;
  onOpen: (id: string | null) => void;
  onPost: () => void;
  onInterest: (id: string) => void;
  campaignKind: 'sourcing' | 'promotion' | null;
  canCreateCampaign: boolean;
  planLabel: string;
  unreadCampaigns: number;
  onCreateCampaign: () => void;
  renderCampaigns: () => React.ReactNode;
}

export const ContractorMarketHub: React.FC<ContractorMarketHubProps> = ({
  hub, all, companyName, openId, onOpen, onPost, onInterest, campaignKind, canCreateCampaign, planLabel, unreadCampaigns, onCreateCampaign, renderCampaigns,
}) => {
  const [tab, setTab] = useState<HubTab>('mine');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [date, setDate] = useState<DateFilter>('');

  const canPost = hub.actor.entitlements.postOpportunity;
  const mine = useMemo(() => all.filter((o) => o.isMine), [all]);
  const discover = useMemo(() => all.filter((o) => !o.isMine), [all]);
  const closed = useMemo(() => all.filter((o) => o.status === 'closed' && (o.isMine || o.myInterest)), [all]);
  const responses = useMemo(
    () => mine.flatMap((o) => (o.interests ?? []).map((i) => ({ o, i }))).sort((a, b) => b.i.at.localeCompare(a.i.at)),
    [mine],
  );

  const activeMine = mine.filter((o) => o.status === 'open').length;
  const closedMine = mine.filter((o) => o.status === 'closed').length;
  const awaiting = responses.filter((r) => r.i.status === 'interested').length;
  const connections = responses.filter((r) => r.i.status === 'connected').length;

  const matches = (o: OpportunityView) => {
    const needle = q.trim().toLowerCase();
    if (needle && ![o.title, o.category, o.subcategory, o.location, o.description, o.isMine || !o.isConfidential ? o.publisherDisplay : ''].join(' ').toLowerCase().includes(needle)) return false;
    if (category && o.category !== category) return false;
    if (location && o.location !== location) return false;
    if (status && tab !== 'closed' && o.status !== status) return false;
    return withinDays(o.postedAt, date);
  };

  const base = tab === 'mine' ? mine : tab === 'discover' ? discover : tab === 'closed' ? closed : [];
  const filtered = base.filter(matches).sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  const filteredResponses = responses.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (needle && ![r.i.companyName, r.i.message, r.o.title].join(' ').toLowerCase().includes(needle)) return false;
    if (category && r.o.category !== category) return false;
    if (location && r.o.location !== location) return false;
    if (status && r.o.status !== status) return false;
    return withinDays(r.i.at, date);
  });

  const hasFilters = !!(q || category || location || status || date);
  const clearFilters = () => { setQ(''); setCategory(''); setLocation(''); setStatus(''); setDate(''); };
  const go = (t: HubTab) => { clearFilters(); setTab(t); };

  const opened = all.find((o) => o.id === openId);
  if (opened) {
    return <OpportunityDetail hub={hub} o={opened} fromTab={tab === 'campaigns' ? 'mine' : tab} onBack={() => onOpen(null)} onInterest={() => onInterest(opened.id)} />;
  }

  const tabs = [
    { id: 'mine' as const, label: TAB_LABEL.mine, count: mine.length },
    { id: 'discover' as const, label: TAB_LABEL.discover, count: discover.length },
    { id: 'responses' as const, label: TAB_LABEL.responses, count: responses.length },
    { id: 'closed' as const, label: TAB_LABEL.closed, count: closed.length },
    ...(campaignKind ? [{ id: 'campaigns' as const, label: TAB_LABEL.campaigns, count: unreadCampaigns || undefined }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={sokoTokens.eyebrow}>Contractor workspace · Market Hub</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 text-balance">Market Hub</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 text-pretty">
            Publish requirements from {companyName}, discover relevant suppliers and manage the interest they send back. Commercial terms are agreed directly once you connect.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaignKind && (
            <button type="button" onClick={onCreateCampaign} className={secondaryBtn}
              title={canCreateCampaign ? undefined : `${planLabel} cannot launch campaigns. Click to preview upgrades.`}>
              {canCreateCampaign ? <Crown className="w-4 h-4 text-amber-600" aria-hidden /> : <Lock className="w-4 h-4 text-slate-400" aria-hidden />}
              Create campaign
              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-wider text-amber-800">Premium</span>
            </button>
          )}
          {canPost && (
            <button type="button" onClick={onPost} className={`${primaryBtn} h-10 px-4`}>
              <Plus className="w-4 h-4" aria-hidden />Post opportunity
            </button>
          )}
        </div>
      </header>

      <section aria-label="Market Hub overview" className={`${sokoCard} grid grid-cols-2 md:grid-cols-4 overflow-hidden [&>*]:border-slate-100 [&>*:nth-child(-n+2)]:border-b md:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r md:[&>*:not(:last-child)]:border-r`}>
        <SokoKpiCell label="Active opportunities" value={activeMine} detail="Published by your company" onClick={() => { go('mine'); setStatus('open'); }} />
        <SokoKpiCell label="Responses received" value={responses.length} detail={awaiting ? `${awaiting} awaiting review` : 'None awaiting review'} onClick={() => go('responses')}
          hint="Suppliers who expressed interest in your opportunities." />
        <SokoKpiCell label="Closed opportunities" value={closedMine} detail="No longer accepting responses" onClick={() => go('closed')} />
        <SokoKpiCell label="Supplier connections" value={connections} detail="Approved from responses" onClick={() => { go('responses'); }}
          hint="Responses you approved. Your contact details are shared with these suppliers." />
      </section>

      <section className={`${sokoCard} flex flex-col gap-4 p-4 sm:p-5`} aria-label="Search and filter opportunities">
        <div className="overflow-x-auto">
          <SokoTabs<HubTab> label="Market Hub sections" variant="underline" active={tab} onChange={setTab} tabs={tabs} />
        </div>
        {tab !== 'campaigns' && (
          <>
            <label className="relative">
              <span className="sr-only">Search opportunities</span>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={tab === 'responses' ? 'Search supplier, message or opportunity…' : 'Search opportunities, trade categories, locations…'}
                className={`${sokoTokens.focus} h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-300 transition-colors`} />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select aria-label="Trade category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                <option value="">All trade categories</option>
                {TRADE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select aria-label="Location" value={location} onChange={(e) => setLocation(e.target.value)} className={selectCls}>
                <option value="">All locations</option>
                {EMIRATES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select aria-label="Opportunity status" value={tab === 'closed' ? 'closed' : status} disabled={tab === 'closed'}
                onChange={(e) => setStatus(e.target.value as StatusFilter)} className={selectCls}>
                <option value="">Any status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
              <select aria-label={tab === 'responses' ? 'Response date' : 'Posting date'} value={date} onChange={(e) => setDate(e.target.value as DateFilter)} className={selectCls}>
                <option value="">{tab === 'responses' ? 'Any response date' : 'Any posting date'}</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">
                {tab === 'responses' ? `${filteredResponses.length} of ${responses.length} responses` : `${filtered.length} of ${base.length} opportunities`}
              </span>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className={`${sokoTokens.focus} rounded-md px-1 text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer`}>Clear filters</button>
              )}
            </div>
          </>
        )}
      </section>

      {tab === 'campaigns' ? (
        <div>{renderCampaigns()}</div>
      ) : tab === 'responses' ? (
        responses.length === 0 ? (
          <div className={`${sokoCard} py-10`}>
            <SokoEmptyState icon={Inbox} title="No responses yet"
              description={mine.length ? 'Suppliers who express interest in your opportunities will appear here for review.' : 'Post an opportunity so relevant suppliers can respond.'}
              action={canPost ? <button type="button" onClick={onPost} className={secondaryBtn}><Plus className="w-4 h-4" aria-hidden />Post opportunity</button> : undefined} />
          </div>
        ) : filteredResponses.length === 0 ? (
          <NoMatches onClear={clearFilters} />
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredResponses.map(({ o, i }) => <ResponseRow key={i.id} hub={hub} o={o} i={i} onOpen={() => onOpen(o.id)} />)}
          </ul>
        )
      ) : base.length === 0 ? (
        <div className={`${sokoCard} py-10`}>
          {tab === 'mine' ? (
            <SokoEmptyState icon={Briefcase} title="No opportunities posted yet"
              description="Publish a material, subcontracting or service requirement. You can post confidentially to keep your company identity hidden until you approve a connection."
              action={canPost ? <button type="button" onClick={onPost} className={primaryBtn}><Plus className="w-4 h-4" aria-hidden />Post opportunity</button> : undefined} />
          ) : tab === 'discover' ? (
            <SokoEmptyState icon={Compass} title="No opportunities to discover" description="Opportunities published by other companies on SOKO will appear here." />
          ) : (
            <SokoEmptyState icon={Archive} title="Nothing closed yet" description="Opportunities you close, or closed ones you responded to, are archived here." />
          )}
        </div>
      ) : filtered.length === 0 ? (
        <NoMatches onClear={clearFilters} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((o) => <OpportunityCard key={o.id} hub={hub} o={o} onOpen={() => onOpen(o.id)} />)}
        </ul>
      )}
    </div>
  );
};

const NoMatches: React.FC<{ onClear: () => void }> = ({ onClear }) => (
  <div className={`${sokoCard} py-10`}>
    <SokoEmptyState icon={Search} title="Nothing matches these filters" description="Try another trade category, location or date range."
      action={<button type="button" onClick={onClear} className={secondaryBtn}>Clear filters</button>} />
  </div>
);

const OpportunityCard: React.FC<{ hub: Hub; o: OpportunityView; onOpen: () => void }> = ({ hub, o, onOpen }) => {
  const count = responsesOf(o);
  const save = () => hub.run(toggleSaveOpportunity(hub.store, hub.actor, o.id), (saved) => (saved ? 'Opportunity saved' : 'Removed from saved'));
  return (
    <li className={`${sokoCard} flex flex-col gap-4 p-5 transition-colors hover:border-slate-300`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <SokoChip tone="mono">{opportunityTypeLabel(o.type)}</SokoChip>
            {o.urgency !== 'standard' && <SokoStatusIndicator label={URGENCY_LABEL[o.urgency]} tone={o.urgency === 'urgent' ? 'critical' : 'warning'} />}
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-snug text-slate-900 text-pretty">
            <button type="button" onClick={onOpen} className={`${sokoTokens.focus} rounded text-left hover:text-blue-700 cursor-pointer`}>{o.title}</button>
          </h3>
          <p className="mt-1 text-sm text-slate-600">{o.category}{o.subcategory ? ` · ${o.subcategory}` : ''}</p>
        </div>
        <OpportunityStatus o={o} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex min-w-0 items-center gap-1.5"><dt className="sr-only">Location</dt><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden /><dd className="truncate text-slate-700">{o.location}</dd></div>
        <div className="flex min-w-0 items-center gap-1.5"><dt className="sr-only">Published by</dt><dd className="min-w-0 truncate"><Publisher o={o} /></dd></div>
        <div className="flex min-w-0 items-center gap-1.5"><dt className="sr-only">Posted</dt><Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden /><dd className="truncate text-slate-700">Posted {daysAgo(o.postedAt).toLowerCase()}</dd></div>
        <div className="flex min-w-0 items-center gap-1.5"><dt className="sr-only">Response deadline</dt><CalendarClock className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden /><dd className="truncate text-slate-700">{o.responseDeadline ? `Respond by ${fmtDate(o.responseDeadline)}` : 'No deadline set'}</dd></div>
      </dl>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5" aria-hidden />
          <span className="font-mono tabular-nums text-slate-800">{count}</span>{o.isMine ? (count === 1 ? 'response' : 'responses') : 'interested'}
        </span>
        <div className="flex items-center gap-1">
          {!o.isMine && (
            <button type="button" onClick={save} aria-pressed={o.saved} className={ghostBtn}>
              {o.saved ? <BookmarkCheck className="w-4 h-4 text-blue-700" aria-hidden /> : <Bookmark className="w-4 h-4" aria-hidden />}
              {o.saved ? 'Saved' : 'Save'}
            </button>
          )}
          <button type="button" onClick={onOpen} className={secondaryBtn} aria-label={`View details for ${o.title}`}>
            View details<ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
};

const ResponseRow: React.FC<{ hub: Hub; o: OpportunityView; i: OpportunityInterest; onOpen: () => void }> = ({ hub, o, i, onOpen }) => {
  const act = (action: 'review' | 'approve' | 'decline', msg: string) => hub.run(reviewInterest(hub.store, hub.actor, o.id, i.id, action), msg);
  const open = i.status !== 'connected' && i.status !== 'declined';
  return (
    <li className={`${sokoCard} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{i.companyName}</p>
          <SokoStatusIndicator label={INTEREST_LABEL[i.status].label} tone={INTEREST_TONE[i.status]} />
        </div>
        {i.message && <p className="mt-1 text-sm leading-relaxed text-slate-600 line-clamp-2">{i.message}</p>}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <button type="button" onClick={onOpen} className={`${sokoTokens.focus} rounded font-medium text-blue-700 hover:text-blue-800 cursor-pointer`}>{o.title}</button>
          <span aria-hidden>·</span><span>{daysAgo(i.at)}</span>
        </p>
      </div>
      {open && o.status === 'open' && (
        <div className="flex flex-wrap items-center gap-1.5">
          {i.status === 'interested' && <button type="button" onClick={() => act('review', 'Marked as under review')} className={secondaryBtn}>Review</button>}
          <button type="button" onClick={() => act('approve', `Connected with ${i.companyName}. Your contact details are now shared with them.`)} className={primaryBtn}>
            <Check className="w-4 h-4" aria-hidden />Approve connection
          </button>
          <button type="button" onClick={() => act('decline', 'Interest not progressed')} className={ghostBtn}>Decline</button>
        </div>
      )}
    </li>
  );
};

const OpportunityDetail: React.FC<{ hub: Hub; o: OpportunityView; fromTab: HubTab; onBack: () => void; onInterest: () => void }> = ({ hub, o, fromTab, onBack, onInterest }) => {
  const save = () => hub.run(toggleSaveOpportunity(hub.store, hub.actor, o.id), (saved) => (saved ? 'Opportunity saved' : 'Removed from saved'));
  const canRequest = o.myInterest && ['interested', 'under_review'].includes(o.myInterest.status) && o.status === 'open';
  const facts: [string, React.ReactNode][] = [
    ['Opportunity type', opportunityTypeLabel(o.type)],
    ['Trade category', o.category],
    ['Subcategory', o.subcategory],
    ['Location', o.location],
    ['Quantity / scope', o.scope],
    ['Urgency', URGENCY_LABEL[o.urgency]],
    ['Required', o.requiredBy ? fmtMonth(o.requiredBy) : undefined],
    ['Response deadline', o.responseDeadline ? fmtDate(o.responseDeadline) : undefined],
    ['Posted', fmtDate(o.postedAt)],
    ['Project', o.projectName],
  ];

  return (
    <div className="flex flex-col gap-6">
      <SokoBreadcrumb onBack={onBack} backLabel="Back to Market Hub"
        trail={[{ label: 'Market Hub', onClick: onBack }, { label: TAB_LABEL[fromTab], onClick: onBack }, { label: o.title }]} />

      <header className={`${sokoCard} flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <OpportunityStatus o={o} />
            <SokoChip tone="mono">{opportunityTypeLabel(o.type)}</SokoChip>
            {o.urgency !== 'standard' && <SokoStatusIndicator label={URGENCY_LABEL[o.urgency]} tone={o.urgency === 'urgent' ? 'critical' : 'warning'} />}
            {o.isConfidential && <SokoChip icon={EyeOff}>Confidential</SokoChip>}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 text-balance">{o.title}</h1>
          <p className="mt-1.5 text-sm text-slate-600">{o.category} · {o.location} · Posted {daysAgo(o.postedAt).toLowerCase()}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {!o.isMine && (
            <button type="button" onClick={save} aria-pressed={o.saved} className={secondaryBtn}>
              {o.saved ? <BookmarkCheck className="w-4 h-4 text-blue-700" aria-hidden /> : <Bookmark className="w-4 h-4" aria-hidden />}
              {o.saved ? 'Saved' : 'Save'}
            </button>
          )}
          {o.isMine && o.status === 'open' && (
            <button type="button" onClick={() => hub.run(closeOpportunity(hub.store, hub.actor, o.id), 'Opportunity closed')} className={secondaryBtn}>
              <Archive className="w-4 h-4" aria-hidden />Close opportunity
            </button>
          )}
          {canRequest && (
            <button type="button" onClick={() => hub.run(requestOpportunityConnection(hub.store, hub.actor, o.id), 'Connection requested. The publisher will be asked to approve.')} className={secondaryBtn}>
              Request connection
            </button>
          )}
          {!o.isMine && !o.myInterest && o.status === 'open' && hub.actor.entitlements.expressInterest && (
            <button type="button" onClick={onInterest} className={primaryBtn}>Express interest</button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section className={`${sokoCard} p-5 sm:p-6`} aria-labelledby="mh-desc">
            <h2 id="mh-desc" className={sokoTokens.eyebrow}>Requirement</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{o.description}</p>
            {o.attachmentName && (
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-600">
                <Paperclip className="w-4 h-4 text-slate-400" aria-hidden />{o.attachmentName}
                <span className="text-xs text-slate-400">(prototype attachment)</span>
              </p>
            )}
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
              {facts.filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {o.isMine && (
            <section className={`${sokoCard} p-5 sm:p-6`} aria-label="Responses">
              <InterestReview hub={hub} o={o} />
            </section>
          )}

          {o.myInterest && (
            <section className={`${sokoCard} p-5 sm:p-6`} aria-labelledby="mh-mine">
              <h2 id="mh-mine" className={`${sokoTokens.eyebrow} mb-3`}>Your response</h2>
              {o.myInterest.status === 'declined' ? <p className="text-sm text-slate-600">The publisher did not progress this interest.</p> : <WorkflowSteps status={o.myInterest.status} />}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <section className={`${sokoCard} p-5`} aria-labelledby="mh-pub">
            <h2 id="mh-pub" className={sokoTokens.eyebrow}>Published by</h2>
            <p className="mt-2 text-sm font-semibold text-slate-900">{o.publisherDisplay}</p>
            {o.isMine && o.isConfidential && (
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                <EyeOff className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                Suppliers see this as a confidential buyer. Your company, contact and project stay hidden until you approve a connection.
              </p>
            )}
            {o.contact ? (
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-slate-700">
                <li className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" aria-hidden />{o.contact.name}</li>
                <li className="flex min-w-0 items-center gap-2"><Mail className="w-4 h-4 shrink-0 text-slate-400" aria-hidden /><span className="truncate">{o.contact.email}</span></li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" aria-hidden />{o.contact.phone}</li>
              </ul>
            ) : (
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                {o.isConfidential
                  ? 'Company, contact person and project identity stay hidden until the publisher approves your connection.'
                  : 'Contact details are shared once the publisher approves your connection.'}
              </p>
            )}
          </section>

          <section className={`${sokoCard} p-5`} aria-labelledby="mh-act">
            <h2 id="mh-act" className={sokoTokens.eyebrow}>Activity</h2>
            <dl className="mt-3 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{o.isMine ? 'Responses' : 'Companies interested'}</dt>
                <dd className="font-mono tabular-nums text-slate-900">{responsesOf(o)}</dd>
              </div>
              {o.isMine && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Connected suppliers</dt>
                  <dd className="font-mono tabular-nums text-slate-900">{(o.interests ?? []).filter((i) => i.status === 'connected').length}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd className="text-slate-900">{o.status === 'open' ? 'Accepting responses' : 'Closed'}</dd>
              </div>
            </dl>
            <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
              <Megaphone className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
              Market Hub connects you with suppliers. Quotations, negotiation and awards happen directly between your companies.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};
