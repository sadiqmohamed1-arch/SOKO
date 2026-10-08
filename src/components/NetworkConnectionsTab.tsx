import React from 'react';
import { Bookmark, BookmarkCheck, Check, MessageSquare, UserMinus, X } from 'lucide-react';
import { CommunityContact } from '../types';
import { NetworkFilters, activeFilterCount, applyNetworkFilters, matchesNetworkQuery } from '../data/myNetwork';
import { ContactCard } from './NetworkContactsTab';
import { NetworkHandlers, btnPrimary, btnSecondary } from './NetworkShared';

const small = '!min-h-9 !px-3 !text-xs';

const Group: React.FC<{ title: string; hint: string; items: CommunityContact[]; render: (c: CommunityContact) => React.ReactNode }> = ({ title, hint, items, render }) =>
  items.length ? (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-slate-900">
        {title} <span className="font-normal text-slate-500">({items.length})</span>
      </h2>
      <p className="text-xs text-slate-500 mb-2">{hint}</p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{items.map(render)}</div>
    </section>
  ) : null;

export const NetworkConnectionsTab: React.FC<{ contacts: CommunityContact[]; query: string; filters: NetworkFilters; handlers: NetworkHandlers }> = ({ contacts, query, filters, handlers: h }) => {
  const match = (c: CommunityContact) => matchesNetworkQuery(c, query) && applyNetworkFilters(c, filters);
  const incoming = contacts.filter((c) => c.connectionStatus === 'incoming' && match(c));
  const connected = contacts.filter((c) => c.connectionStatus === 'connected' && match(c)).sort((a, b) => a.name.localeCompare(b.name));
  const pending = contacts.filter((c) => c.connectionStatus === 'pending' && match(c));

  const saveBtn = (c: CommunityContact) => (
    <button type="button" onClick={() => h.onToggleSave(c)} className={`${btnSecondary} ${small}`} aria-pressed={c.isMaintained}>
      {c.isMaintained ? <BookmarkCheck className="w-3.5 h-3.5 text-blue-700" /> : <Bookmark className="w-3.5 h-3.5" />}
      {c.isMaintained ? 'Saved' : 'Save Contact'}
    </button>
  );

  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">Connections are mutually accepted SOKO members. Saving a contact never creates a connection.</p>
      <Group
        title="Connection requests"
        hint="Accepting lets you both message each other and see shared contact details."
        items={incoming}
        render={(c) => (
          <ContactCard
            key={c.id}
            c={c}
            h={h}
            footer={
              <>
                {c.connectionRequestNote ? <p className="text-xs text-slate-500 italic truncate min-w-0">"{c.connectionRequestNote}"</p> : <span />}
                <span className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => h.onConnection(c, 'decline')} className={`${btnSecondary} ${small}`}>
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                  <button type="button" onClick={() => h.onConnection(c, 'accept')} className={`${btnPrimary} ${small}`}>
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                </span>
              </>
            }
          />
        )}
      />
      <Group
        title="My Connections"
        hint="Message connected members through SOKO Messaging."
        items={connected}
        render={(c) => (
          <ContactCard
            key={c.id}
            c={c}
            h={h}
            footer={
              <>
                <span className="flex gap-2">
                  <button type="button" onClick={() => h.onMessage(c)} className={`${btnPrimary} ${small}`}>
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message
                  </button>
                  {saveBtn(c)}
                </span>
                <button type="button" onClick={() => h.onConnection(c, 'remove')} aria-label={`Remove connection with ${c.name}`} title="Remove connection" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer">
                  <UserMinus className="w-4 h-4" />
                </button>
              </>
            }
          />
        )}
      />
      <Group
        title="Sent requests"
        hint="Waiting for the other person to accept."
        items={pending}
        render={(c) => (
          <ContactCard
            key={c.id}
            c={c}
            h={h}
            footer={
              <>
                {saveBtn(c)}
                <button type="button" onClick={() => h.onConnection(c, 'withdraw')} className={`${btnSecondary} ${small}`}>
                  Withdraw
                </button>
              </>
            }
          />
        )}
      />
      {!incoming.length && !connected.length && !pending.length && (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
          {query.trim() || activeFilterCount(filters) ? 'No connections match your search.' : 'No connections yet. Connect with SOKO members from their profile or business card.'}
        </div>
      )}
    </div>
  );
};
