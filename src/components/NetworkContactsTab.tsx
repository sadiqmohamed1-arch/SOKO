import React, { useMemo, useState } from 'react';
import { ChevronRight, LayoutGrid, List, Share2, Star, UserPlus, Users } from 'lucide-react';
import { CommunityContact } from '../types';
import {
  EMPTY_NETWORK_FILTERS,
  NetworkFilters,
  RELATIONSHIP_TYPES,
  activeFilterCount,
  applyNetworkFilters,
  cityOf,
  companyFor,
  isSokoMember,
  matchesNetworkQuery,
  relationshipOf,
} from '../data/myNetwork';
import { ContactAvatar, ContactQuickActions, NetworkHandlers, StatusPill, VerifiedCompanyBadge, btnSecondary, inputCls, labelCls, relationshipStatus } from './NetworkShared';

const PAGE = 25;

const uniqueSorted = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

export const NetworkFiltersPanel: React.FC<{ contacts: CommunityContact[]; filters: NetworkFilters; onChange: (f: NetworkFilters) => void }> = ({ contacts, filters, onChange }) => {
  const options = useMemo(
    () => ({
      company: uniqueSorted(contacts.map((c) => c.company)),
      category: uniqueSorted(contacts.map((c) => c.category)),
      location: uniqueSorted(contacts.map((c) => cityOf(c.location))),
    }),
    [contacts]
  );
  const select = (key: 'company' | 'category' | 'location' | 'relationship', label: string, values: readonly string[]) => (
    <div>
      <label htmlFor={`nf-${key}`} className={labelCls}>
        {label}
      </label>
      <select id={`nf-${key}`} value={filters[key]} onChange={(e) => onChange({ ...filters, [key]: e.target.value })} className={inputCls}>
        <option value="">All</option>
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </div>
  );
  const toggle = (key: 'recentlyAdded' | 'recentlyContacted' | 'favorites', label: string) => (
    <button
      type="button"
      aria-pressed={filters[key]}
      onClick={() => onChange({ ...filters, [key]: !filters[key] })}
      className={`min-h-10 px-3 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
        filters[key] ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {select('company', 'Company', options.company)}
        {select('category', 'Industry / Trade Category', options.category)}
        {select('location', 'Location', options.location)}
        {select('relationship', 'Relationship Type', RELATIONSHIP_TYPES)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {toggle('recentlyAdded', 'Recently Added')}
        {toggle('recentlyContacted', 'Recently Contacted')}
        {toggle('favorites', 'Favorites')}
        {activeFilterCount(filters) > 0 && (
          <button type="button" onClick={() => onChange(EMPTY_NETWORK_FILTERS)} className="ml-auto text-sm font-semibold text-blue-700 hover:underline cursor-pointer">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

const FavoriteButton: React.FC<{ c: CommunityContact; h: NetworkHandlers }> = ({ c, h }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      h.onToggleFavorite(c);
    }}
    aria-pressed={!!c.favorite}
    aria-label={c.favorite ? `Remove ${c.name} from favorites` : `Add ${c.name} to favorites`}
    className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-gold-600 hover:bg-gold-50 transition-colors cursor-pointer"
  >
    <Star className={`w-4 h-4 ${c.favorite ? 'fill-gold-500 text-gold-500' : ''}`} />
  </button>
);

const ShareButton: React.FC<{ c: CommunityContact; h: NetworkHandlers }> = ({ c, h }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      h.onShare(c);
    }}
    aria-label={`Share ${c.name}`}
    className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
  >
    <Share2 className="w-4 h-4" />
  </button>
);

const CompanyLine: React.FC<{ c: CommunityContact }> = ({ c }) => {
  const company = companyFor(c);
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="truncate">{c.company}</span>
      {company?.status === 'verified' && <VerifiedCompanyBadge />}
    </span>
  );
};

export const ContactCard: React.FC<{ c: CommunityContact; h: NetworkHandlers; footer?: React.ReactNode }> = ({ c, h, footer }) => {
  const status = relationshipStatus(c);
  return (
    <article className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all p-3.5">
      <button type="button" onClick={() => h.onOpen(c)} className="w-full text-left flex items-start gap-3 cursor-pointer">
        <ContactAvatar name={c.name} url={c.avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900 truncate">{c.name}</span>
          <span className="block text-xs text-slate-600 truncate">{c.title}</span>
          <span className="block text-xs font-semibold text-slate-800">
            <CompanyLine c={c} />
          </span>
          <span className="block text-xs text-slate-500 truncate">{[c.category, cityOf(c.location)].filter(Boolean).join(' · ')}</span>
        </span>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </button>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {footer ?? (
          <>
            <ContactQuickActions contact={c} onContacted={h.onContacted} />
            <span className="flex items-center">
              {c.isMaintained && <FavoriteButton c={c} h={h} />}
              <ShareButton c={c} h={h} />
            </span>
          </>
        )}
      </div>
    </article>
  );
};

const DiscoverableRow: React.FC<{ c: CommunityContact; h: NetworkHandlers }> = ({ c, h }) => (
  <li className="flex items-center gap-3 px-3 py-2.5">
    <ContactAvatar name={c.name} url={c.avatarUrl} size="sm" />
    <button type="button" onClick={() => h.onOpen(c)} className="min-w-0 flex-1 text-left cursor-pointer">
      <span className="block text-sm font-semibold text-slate-900 truncate">{c.name}</span>
      <span className="block text-xs text-slate-500 truncate">{[c.title, c.company, cityOf(c.location)].filter(Boolean).join(' · ')}</span>
    </button>
    <button type="button" onClick={() => h.onToggleSave(c)} className={`${btnSecondary} !min-h-9 !px-3 hidden sm:inline-flex`}>
      Save
    </button>
    {(c.connectionStatus ?? 'not_connected') === 'not_connected' ? (
      <button type="button" onClick={() => h.onConnection(c, 'connect')} className={`${btnSecondary} !min-h-9 !px-3`}>
        <UserPlus className="w-4 h-4" />
        <span className="hidden sm:inline">Connect</span>
      </button>
    ) : (
      <StatusPill tone="amber">{relationshipStatus(c).label}</StatusPill>
    )}
  </li>
);

interface ContactsTabProps {
  contacts: CommunityContact[];
  query: string;
  filters: NetworkFilters;
  handlers: NetworkHandlers;
  onClearAll: () => void;
  onAdd: () => void;
}

export const NetworkContactsTab: React.FC<ContactsTabProps> = ({ contacts, query, filters, handlers: h, onClearAll, onAdd }) => {
  const [view, setView] = useState<'list' | 'cards'>('list');
  const [limit, setLimit] = useState(PAGE);

  const saved = useMemo(
    () =>
      contacts
        .filter((c) => c.isMaintained && applyNetworkFilters(c, filters) && matchesNetworkQuery(c, query))
        .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || (b.dateAdded ?? '').localeCompare(a.dateAdded ?? '') || a.name.localeCompare(b.name)),
    [contacts, filters, query]
  );
  const discoverable = useMemo(
    () => (query.trim() ? contacts.filter((c) => !c.isMaintained && isSokoMember(c) && c.connectionStatus !== 'connected' && matchesNetworkQuery(c, query)).slice(0, 8) : []),
    [contacts, query]
  );
  const visible = saved.slice(0, limit);
  const filtered = !!query.trim() || activeFilterCount(filters) > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{saved.length}</span> {saved.length === 1 ? 'contact' : 'contacts'}
          {filtered && ' match'}
        </p>
        <div className="hidden md:flex items-center rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Layout">
          {(
            [
              { id: 'list', icon: List, label: 'List view' },
              { id: 'cards', icon: LayoutGrid, label: 'Card view' },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              aria-label={label}
              className={`w-9 h-8 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${view === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {saved.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center">
          <Users className="w-8 h-8 mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-900">{filtered ? 'No saved contacts match' : 'No contacts yet'}</p>
          <p className="mt-1 text-sm text-slate-500">{filtered ? 'Try another search or clear your filters.' : 'Add your first construction industry contact.'}</p>
          <button type="button" onClick={filtered ? onClearAll : onAdd} className={`${btnSecondary} mt-4`}>
            {filtered ? 'Clear search & filters' : 'Add Contact'}
          </button>
        </div>
      )}

      {saved.length > 0 && view === 'list' && (
        <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="px-4 py-2.5 font-semibold">Company</th>
                <th className="px-4 py-2.5 font-semibold hidden lg:table-cell">Location</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((c) => {
                const status = relationshipStatus(c);
                return (
                  <tr key={c.id} onClick={() => h.onOpen(c)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <ContactAvatar name={c.name} url={c.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate max-w-[220px]">{c.name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[220px]">{c.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 max-w-[240px]">
                      <span className="text-slate-900 text-sm">
                        <CompanyLine c={c} />
                      </span>
                      <p className="text-xs text-slate-500 truncate">{c.category || relationshipOf(c)}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 hidden lg:table-cell whitespace-nowrap">{cityOf(c.location)}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </td>
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <ContactQuickActions contact={c} onContacted={h.onContacted} />
                        <FavoriteButton c={c} h={h} />
                        <ShareButton c={c} h={h} />
                        <button type="button" onClick={() => h.onOpen(c)} aria-label={`View ${c.name}`} className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {saved.length > 0 && (
        <div className={`grid sm:grid-cols-2 xl:grid-cols-3 gap-3 ${view === 'list' ? 'md:hidden' : ''}`}>
          {visible.map((c) => (
            <ContactCard key={c.id} c={c} h={h} />
          ))}
        </div>
      )}

      {saved.length > limit && (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className={btnSecondary}>
            Show more ({saved.length - limit} remaining)
          </button>
        </div>
      )}

      {discoverable.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Discoverable SOKO professionals</h2>
          <p className="text-xs text-slate-500 mb-2">Members who allow discovery. Phone and email are shared only after they connect with you.</p>
          <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {discoverable.map((c) => (
              <DiscoverableRow key={c.id} c={c} h={h} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
