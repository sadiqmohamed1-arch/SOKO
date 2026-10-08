import React from 'react';
import { Bookmark, BookmarkCheck, CalendarDays, MapPin, RotateCcw, Ruler, Search, Users } from 'lucide-react';
import { EMIRATES, OPPORTUNITY_TYPES, TRADE_CATEGORIES, opportunityGroup, opportunityTypeLabel, subcategoriesOf } from '../../data/marketHubCatalog';
import { OpportunityGroup, OpportunityType, OpportunityView, Urgency } from '../../data/marketHubTypes';
import { StatusPill, btnPrimary, btnSecondary, iconBtn } from '../NetworkShared';
import { EmptyState, UrgencyPill, daysAgo, fmtMonth, opportunityStatus } from './MarketHubShared';

export interface OpportunityFilters {
  type: OpportunityType | '';
  category: string;
  subcategory: string;
  location: string;
  requiredWithin: '' | '30' | '90' | '180' | 'later';
  urgency: Urgency | '';
  status: string;
}

export const EMPTY_OPP_FILTERS: OpportunityFilters = { type: '', category: '', subcategory: '', location: '', requiredWithin: '', urgency: '', status: 'open' };

const STATUS_OPTIONS = [
  { id: '', label: 'Any status' },
  { id: 'open', label: 'Open' },
  { id: 'interested', label: 'Interested' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'connection_requested', label: 'Connection Requested' },
  { id: 'connected', label: 'Connected' },
  { id: 'closed', label: 'Closed' },
];

const matchesStatus = (o: OpportunityView, s: string) => {
  if (!s) return true;
  if (s === 'open' || s === 'closed') return o.status === s;
  return o.myInterest?.status === s;
};

const withinDays = (iso: string, f: OpportunityFilters['requiredWithin']) => {
  if (!f) return true;
  const days = (new Date(iso).getTime() - Date.now()) / 86_400_000;
  return f === 'later' ? days > 180 : days <= Number(f);
};

export const filterOpportunities = (list: OpportunityView[], query: string, f: OpportunityFilters, group?: OpportunityGroup) => {
  const q = query.trim().toLowerCase();
  return list
    .filter((o) => !group || opportunityGroup(o.type) === group)
    .filter((o) => !f.type || o.type === f.type)
    .filter((o) => !f.category || o.category === f.category)
    .filter((o) => !f.subcategory || o.subcategory === f.subcategory)
    .filter((o) => !f.location || o.location === f.location)
    .filter((o) => !f.urgency || o.urgency === f.urgency)
    .filter((o) => withinDays(o.requiredBy, f.requiredWithin))
    .filter((o) => matchesStatus(o, f.status))
    .filter((o) => !q || [o.title, o.description, o.category, o.subcategory, o.location, opportunityTypeLabel(o.type), o.scope ?? ''].join(' ').toLowerCase().includes(q))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
};

const selectCls =
  'min-h-9 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer';

export const OpportunityFilterBar: React.FC<{ filters: OpportunityFilters; onChange: (f: OpportunityFilters) => void; group?: OpportunityGroup }> = ({ filters: f, onChange, group }) => {
  const set = <K extends keyof OpportunityFilters>(k: K, v: OpportunityFilters[K]) => onChange({ ...f, [k]: v, ...(k === 'category' ? { subcategory: '' } : {}) });
  const types = OPPORTUNITY_TYPES.filter((t) => !group || t.group === group);
  const changed = JSON.stringify(f) !== JSON.stringify(EMPTY_OPP_FILTERS);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Opportunity type" className={selectCls} value={f.type} onChange={(e) => set('type', e.target.value as OpportunityFilters['type'])}>
        <option value="">All opportunity types</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <select aria-label="Trade category" className={selectCls} value={f.category} onChange={(e) => set('category', e.target.value)}>
        <option value="">All categories</option>
        {TRADE_CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select aria-label="Subcategory" className={selectCls} value={f.subcategory} disabled={!f.category} onChange={(e) => set('subcategory', e.target.value)}>
        <option value="">{f.category ? 'All subcategories' : 'Subcategory'}</option>
        {f.category &&
          subcategoriesOf(f.category).map((s) => (
            <option key={s}>{s}</option>
          ))}
      </select>
      <select aria-label="Location" className={selectCls} value={f.location} onChange={(e) => set('location', e.target.value)}>
        <option value="">All locations</option>
        {EMIRATES.map((e) => (
          <option key={e}>{e}</option>
        ))}
      </select>
      <select aria-label="Required date" className={selectCls} value={f.requiredWithin} onChange={(e) => set('requiredWithin', e.target.value as OpportunityFilters['requiredWithin'])}>
        <option value="">Any required date</option>
        <option value="30">Required within 30 days</option>
        <option value="90">Within 3 months</option>
        <option value="180">Within 6 months</option>
        <option value="later">Later than 6 months</option>
      </select>
      <select aria-label="Urgency" className={selectCls} value={f.urgency} onChange={(e) => set('urgency', e.target.value as OpportunityFilters['urgency'])}>
        <option value="">Any urgency</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="standard">Standard</option>
      </select>
      <select aria-label="Status" className={selectCls} value={f.status} onChange={(e) => set('status', e.target.value)}>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {changed && (
        <button type="button" onClick={() => onChange(EMPTY_OPP_FILTERS)} className="inline-flex items-center gap-1 px-2 min-h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      )}
    </div>
  );
};

export const OpportunityCard: React.FC<{
  o: OpportunityView;
  onOpen: () => void;
  onInterest: () => void;
  onSave: () => void;
}> = ({ o, onOpen, onInterest, onSave }) => {
  const status = opportunityStatus(o);
  const canInterest = !o.isMine && !o.myInterest && o.status === 'open';
  return (
    <article className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">{opportunityTypeLabel(o.type)}</span>
          <UrgencyPill urgency={o.urgency} />
        </div>
        <button type="button" onClick={onSave} aria-label={o.saved ? 'Remove from saved' : 'Save opportunity'} className={`${iconBtn} !w-8 !h-8 shrink-0`}>
          {o.saved ? <BookmarkCheck className="w-4 h-4 text-blue-700" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>
      <button type="button" onClick={onOpen} className="mt-1.5 text-left cursor-pointer">
        <h3 className="text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-blue-800 transition-colors">{o.title}</h3>
      </button>
      <p className="mt-1 text-xs text-slate-500">
        {o.category}
        {o.subcategory && ` · ${o.subcategory}`} · {o.isConfidential && !o.isMine ? 'Confidential Buyer' : o.publisherDisplay}
      </p>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-2">{o.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{o.location}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarDays className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">Required {fmtMonth(o.requiredBy)}</span>
        </div>
        {o.scope && (
          <div className="col-span-2 flex items-center gap-1.5 min-w-0">
            <Ruler className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{o.scope}</span>
          </div>
        )}
      </dl>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {o.interestedCount} interested
        </span>
        <span className="flex items-center gap-1.5">
          {daysAgo(o.postedAt)}
          <StatusPill tone={o.isMine ? 'gold' : status.tone}>{o.isMine ? 'Your post' : status.label}</StatusPill>
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onOpen} className={`${btnSecondary} flex-1 !min-h-9`}>
          View Opportunity
        </button>
        {canInterest && (
          <button type="button" onClick={onInterest} className={`${btnPrimary} flex-1 !min-h-9`}>
            Express Interest
          </button>
        )}
      </div>
    </article>
  );
};

export const OpportunityGrid: React.FC<{
  list: OpportunityView[];
  onOpen: (o: OpportunityView) => void;
  onInterest: (o: OpportunityView) => void;
  onSave: (o: OpportunityView) => void;
  onReset?: () => void;
}> = ({ list, onOpen, onInterest, onSave, onReset }) =>
  list.length ? (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((o) => (
        <OpportunityCard key={o.id} o={o} onOpen={() => onOpen(o)} onInterest={() => onInterest(o)} onSave={() => onSave(o)} />
      ))}
    </div>
  ) : (
    <EmptyState
      icon={<Search className="w-5 h-5" />}
      title="No opportunities match"
      text="Try a broader search or clear some filters."
      action={
        onReset && (
          <button type="button" onClick={onReset} className={btnSecondary}>
            Clear search and filters
          </button>
        )
      }
    />
  );
