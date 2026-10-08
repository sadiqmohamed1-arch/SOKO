import React, { useState } from 'react';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { opportunityTypeLabel } from '../../data/marketHubCatalog';
import { inboxFor, myResponse, ownerCampaigns } from '../../data/marketHubService';
import { OpportunityView } from '../../data/marketHubTypes';
import { StatusPill, btnPrimary } from '../NetworkShared';
import { CampaignSection } from './CampaignCenter';
import { responsesOf } from './CampaignDashboard';
import { EmptyState, Hub, daysAgo } from './MarketHubShared';

const STATUSES = ['New Responses', 'Awaiting Review', 'Connection Requested', 'Connected', 'Closed'] as const;
type ActivityStatus = (typeof STATUSES)[number] | 'Open';

const TONE: Record<ActivityStatus, 'blue' | 'amber' | 'gold' | 'slate'> = {
  'New Responses': 'gold',
  'Awaiting Review': 'amber',
  'Connection Requested': 'blue',
  Connected: 'blue',
  Closed: 'slate',
  Open: 'slate',
};

interface Item {
  id: string;
  title: string;
  meta: string;
  status: ActivityStatus;
  note?: string;
  open: () => void;
}

const postedStatus = (o: OpportunityView): ActivityStatus => {
  const st = (o.interests ?? []).map((i) => i.status);
  if (o.status === 'closed') return 'Closed';
  if (st.includes('interested')) return 'New Responses';
  if (st.includes('connection_requested')) return 'Connection Requested';
  if (st.includes('under_review')) return 'Awaiting Review';
  if (st.includes('connected')) return 'Connected';
  return 'Open';
};

const interestStatus = (o: OpportunityView): ActivityStatus => {
  const s = o.myInterest?.status;
  if (o.status === 'closed' || s === 'declined') return 'Closed';
  if (s === 'connected') return 'Connected';
  if (s === 'connection_requested') return 'Connection Requested';
  return 'Awaiting Review';
};

const oppMeta = (o: OpportunityView, extra: string) => `${opportunityTypeLabel(o.type)} · ${o.category} · ${o.location} · ${extra}`;

const Section: React.FC<{ title: string; items: Item[]; total: number; empty: string }> = ({ title, items, total, empty }) => (
  <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
    <h2 className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">
      {title} <span className="ml-1 text-slate-400 tabular-nums">{items.length}</span>
    </h2>
    {items.length ? (
      <ul className="divide-y divide-slate-100">
        {items.map((it) => (
          <li key={it.id}>
            <button type="button" onClick={it.open} className="group w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 leading-snug">{it.title}</span>
                <span className="block mt-0.5 text-xs text-slate-500 leading-relaxed">{it.meta}</span>
                {it.note && <span className="block mt-0.5 text-[11px] font-semibold text-slate-600">{it.note}</span>}
              </span>
              <StatusPill tone={TONE[it.status]}>{it.status}</StatusPill>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <p className="px-4 py-6 text-sm text-slate-500">{total ? 'Nothing here matches this status.' : empty}</p>
    )}
  </section>
);

export const MyActivityTab: React.FC<{
  hub: Hub;
  list: OpportunityView[];
  onOpen: (o: OpportunityView) => void;
  onPost: () => void;
  onOpenCampaign: (section: CampaignSection, id: string) => void;
}> = ({ hub, list, onOpen, onPost, onOpenCampaign }) => {
  const [filter, setFilter] = useState<ActivityStatus | 'All'>('All');

  const posted: Item[] = list
    .filter((o) => o.isMine)
    .map((o) => {
      const n = (o.interests ?? []).length;
      const fresh = (o.interests ?? []).filter((i) => i.status === 'interested').length;
      return { id: o.id, title: o.title, meta: oppMeta(o, `${n} ${n === 1 ? 'response' : 'responses'}`), note: fresh ? `${fresh} new to review` : undefined, status: postedStatus(o), open: () => onOpen(o) };
    });
  const interests: Item[] = list
    .filter((o) => o.myInterest)
    .map((o) => ({ id: o.id, title: o.title, meta: oppMeta(o, o.publisherDisplay), status: interestStatus(o), open: () => onOpen(o) }));
  const saved: Item[] = list
    .filter((o) => o.saved)
    .map((o) => ({ id: o.id, title: o.title, meta: oppMeta(o, `Posted ${daysAgo(o.postedAt)}`), status: o.status === 'closed' ? 'Closed' : 'Open', open: () => onOpen(o) }));

  const today = new Date().toISOString().slice(0, 10);
  const sent: Item[] = inboxFor(hub.store, hub.actor)
    .filter((i) => i.responded || i.interested)
    .map((i) => {
      const r = myResponse(hub.store, hub.actor, i.id);
      const status: ActivityStatus = r?.connectRequested ? 'Connection Requested' : i.expiry && i.expiry < today ? 'Closed' : 'Awaiting Review';
      return {
        id: `in_${i.id}`,
        title: i.title,
        meta: `${i.typeLabel} · ${i.senderDisplay} · ${r ? 'You responded' : 'You shared interest'}`,
        note: r?.status === 'Shortlisted' ? 'Shortlisted by the sender' : undefined,
        status,
        open: () => onOpenCampaign('inbox', i.id),
      };
    });
  const received: Item[] = ownerCampaigns(hub.store, hub.actor)
    .filter((v) => v.campaign.launchedAt && responsesOf(v) > 0)
    .map((v) => {
      const n = responsesOf(v);
      const shortlisted = v.metrics.shortlisted;
      const closed = ['completed', 'suspended'].includes(v.campaign.status);
      return {
        id: `own_${v.campaign.id}`,
        title: v.campaign.title,
        meta: `Your campaign · ${n} ${v.campaign.kind === 'sourcing' ? (n === 1 ? 'response' : 'responses') : 'interested'} · ${v.metrics.viewed} viewed`,
        note: shortlisted ? `${shortlisted} shortlisted` : undefined,
        status: closed ? 'Closed' : 'New Responses',
        open: () => onOpenCampaign('campaigns', v.campaign.id),
      };
    });
  const campaignItems = [...received, ...sent];

  const groups = [
    { title: 'Posted opportunities', items: posted, empty: 'You have not posted any opportunities yet.' },
    { title: 'My interests', items: interests, empty: 'Express interest in an opportunity to track it here.' },
    { title: 'Saved opportunities', items: saved, empty: 'Save opportunities to come back to them later.' },
    { title: 'Campaign responses', items: campaignItems, empty: 'Responses to your campaigns, and campaigns you respond to, appear here.' },
  ];
  const everything = groups.flatMap((g) => g.items);

  if (!everything.length)
    return (
      <EmptyState
        icon={<ClipboardList className="w-5 h-5" />}
        title="No activity yet"
        text="Opportunities you post, express interest in or save will appear here."
        action={
          <button type="button" onClick={onPost} className={btnPrimary}>
            Post Opportunity
          </button>
        }
      />
    );

  const match = (it: Item) => filter === 'All' || it.status === filter;
  const count = (s: ActivityStatus | 'All') => (s === 'All' ? everything.length : everything.filter((it) => it.status === s).length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {(['All', ...STATUSES] as const).map((s) => {
          const on = filter === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(s)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                on ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {s}
              <span className={`tabular-nums ${on ? 'text-slate-300' : 'text-slate-400'}`}>{count(s)}</span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Section key={g.title} title={g.title} items={g.items.filter(match)} total={g.items.length} empty={g.empty} />
        ))}
      </div>
    </div>
  );
};
