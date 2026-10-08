import React from 'react';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { opportunityTypeLabel } from '../../data/marketHubCatalog';
import { inboxFor, myResponse } from '../../data/marketHubService';
import { OpportunityView } from '../../data/marketHubTypes';
import { StatusPill, btnPrimary } from '../NetworkShared';
import { EmptyState, Hub, daysAgo, opportunityStatus } from './MarketHubShared';

const Row: React.FC<{ o: OpportunityView; meta: string; onOpen: () => void; badge?: React.ReactNode }> = ({ o, meta, onOpen, badge }) => {
  const s = opportunityStatus(o);
  return (
    <li>
      <button type="button" onClick={onOpen} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900 truncate">{o.title}</span>
          <span className="block text-xs text-slate-500 truncate">
            {opportunityTypeLabel(o.type)} · {o.category} · {o.location} · {meta}
          </span>
        </span>
        {badge ?? <StatusPill tone={s.tone}>{s.label}</StatusPill>}
        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
      </button>
    </li>
  );
};

const Section: React.FC<{ title: string; count: number; empty: string; children: React.ReactNode }> = ({ title, count, empty, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
    <h2 className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">
      {title} <span className="ml-1 text-slate-400 tabular-nums">{count}</span>
    </h2>
    {count ? <ul className="divide-y divide-slate-100">{children}</ul> : <p className="px-4 py-6 text-sm text-slate-500">{empty}</p>}
  </section>
);

export const MyActivityTab: React.FC<{ hub: Hub; list: OpportunityView[]; onOpen: (o: OpportunityView) => void; onPost: () => void; onOpenInbox: () => void }> = ({
  hub,
  list,
  onOpen,
  onPost,
  onOpenInbox,
}) => {
  const mine = list.filter((o) => o.isMine);
  const interests = list.filter((o) => o.myInterest);
  const saved = list.filter((o) => o.saved);
  const responded = inboxFor(hub.store, hub.actor).filter((i) => i.responded || i.interested);

  if (!mine.length && !interests.length && !saved.length && !responded.length)
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

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Posted by you" count={mine.length} empty="You have not posted any opportunities yet.">
        {mine.map((o) => {
          const pending = (o.interests ?? []).filter((i) => i.status === 'interested' || i.status === 'connection_requested').length;
          return (
            <Row
              key={o.id}
              o={o}
              meta={`${(o.interests ?? []).length} responses`}
              onOpen={() => onOpen(o)}
              badge={pending ? <StatusPill tone="amber">{pending} to review</StatusPill> : <StatusPill tone={o.status === 'open' ? 'blue' : 'slate'}>{o.status === 'open' ? 'Open' : 'Closed'}</StatusPill>}
            />
          );
        })}
      </Section>
      <Section title="Your interests" count={interests.length} empty="Express interest in an opportunity to track it here.">
        {interests.map((o) => (
          <Row key={o.id} o={o} meta={o.publisherDisplay} onOpen={() => onOpen(o)} />
        ))}
      </Section>
      <Section title="Saved opportunities" count={saved.length} empty="Save opportunities to come back to them later.">
        {saved.map((o) => (
          <Row key={o.id} o={o} meta={`Posted ${daysAgo(o.postedAt)}`} onOpen={() => onOpen(o)} />
        ))}
      </Section>
      <Section title="Campaign responses" count={responded.length} empty="Campaigns you respond to from your Campaign Inbox appear here.">
        {responded.map((i) => {
          const r = myResponse(hub.store, hub.actor, i.id);
          return (
            <li key={i.id}>
              <button type="button" onClick={onOpenInbox} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 truncate">{i.title}</span>
                  <span className="block text-xs text-slate-500 truncate">
                    {i.typeLabel} · {i.senderDisplay}
                  </span>
                </span>
                <StatusPill tone={r?.status === 'Shortlisted' ? 'gold' : 'blue'}>{r?.status ?? 'Interested'}</StatusPill>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            </li>
          );
        })}
      </Section>
    </div>
  );
};
