import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight, Bookmark, BookmarkCheck, Building2, CalendarDays, CreditCard, LayoutGrid, List, Lock, Mail, MapPin,
  MessageCircle, MessageSquare, Phone, Search, Share2, ShieldCheck, Trash2, UserCog, Users,
} from 'lucide-react';
import { CompanyContact, CompanyRecord, roleMeta, SupplierVisit } from '../../data/supplierTypes';
import { isSavedCorporateContact, removeCompanyContact, saveCompanyContact } from '../../data/supplierService';
import { companyById, membersOf } from '../../data/supplierStore';
import { daysAgo, fmtDate } from '../marketHub/MarketHubShared';
import { SokoBreadcrumb } from '../sokoDesignSystem/SokoBreadcrumb';
import {
  SokoEmptyState, SokoKpiCell, SokoStatusIndicator, SokoStatusTone, SokoTabs, initialsOf, sokoCard, sokoTokens,
} from '../sokoDesignSystem/SokoComponents';
import { SW } from './SupplierShared';

type Source = 'company' | 'directory' | 'key' | 'team';
type SourceFilter = 'all' | Source;
type View = 'list' | 'cards';

interface Person {
  /** One permanent SOKO identity per person: the SOKO user id when known, otherwise the record id. */
  key: string;
  sokoUserId?: string;
  name: string;
  title: string;
  companyName: string;
  company?: CompanyRecord;
  category: string;
  location: string;
  email?: string;
  phone?: string;
  source: Source;
  saved?: CompanyContact;
  roleLabel?: string;
}

const SOURCE_LABEL: Record<Source, string> = {
  company: 'GEC company contact',
  directory: 'SOKO directory',
  key: 'Public key contact',
  team: 'Team member',
};

const networkStatus = (p: Person): { label: string; tone: SokoStatusTone } => {
  if (p.source === 'team') return { label: 'Your team', tone: 'neutral' };
  if (!p.company) return { label: 'Off-platform', tone: 'neutral' };
  return p.company.verification.status === 'verified'
    ? { label: 'On SOKO · Verified', tone: 'success' }
    : { label: 'On SOKO', tone: 'info' };
};

const selectCls = `${sokoTokens.focus} h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 hover:border-slate-300 transition-colors cursor-pointer`;
const iconBtn = `${sokoTokens.focus} inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer`;
const secondaryBtn = `${sokoTokens.focus} inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer`;
const primaryBtn = `${sokoTokens.focus} inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer`;

const PrototypeTag = () => (
  <span className="ml-auto rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-wider text-amber-800">Prototype</span>
);

const Avatar: React.FC<{ name: string; size?: 'md' | 'lg'; dark?: boolean }> = ({ name, size = 'md', dark }) => (
  <span aria-hidden className={`${size === 'lg' ? 'w-16 h-16 text-lg' : 'w-10 h-10 text-xs'} shrink-0 rounded-full font-semibold flex items-center justify-center ${
    dark ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
    {initialsOf(name)}
  </span>
);

/** Call / email / WhatsApp only when the details are actually visible for this person. */
const ContactMethods: React.FC<{ p: Person; compact?: boolean }> = ({ p, compact }) => {
  const wa = p.phone?.replace(/\D/g, '');
  if (!p.email && !p.phone) {
    return compact
      ? <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Lock className="w-3 h-3" aria-hidden />Not shared</span>
      : null;
  }
  return (
    <div className="flex items-center gap-1.5">
      {p.phone && <a href={`tel:${p.phone.replace(/\s/g, '')}`} className={iconBtn} aria-label={`Call ${p.name}`} title={p.phone}><Phone className="w-3.5 h-3.5" /></a>}
      {p.email && <a href={`mailto:${p.email}`} className={iconBtn} aria-label={`Email ${p.name}`} title={p.email}><Mail className="w-3.5 h-3.5" /></a>}
      {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={iconBtn} aria-label={`WhatsApp ${p.name}`}><MessageCircle className="w-3.5 h-3.5" /></a>}
    </div>
  );
};

// ─── Detail ────────────────────────────────────────────────────────
const ContactDetail: React.FC<{
  p: Person;
  sw: SW;
  visits: SupplierVisit[];
  onBack: () => void;
  onSave: (p: Person) => void;
  onRemove: (p: Person) => void;
  onMessage: (p: Person) => void;
  onShare: (p: Person) => void;
  onOpenCompany: (p: Person) => void;
  hasVendorRecord: boolean;
}> = ({ p, sw, visits, onBack, onSave, onRemove, onMessage, onShare, onOpenCompany, hasVendorRecord }) => {
  const manage = sw.can('contacts.manage');
  const status = networkStatus(p);
  const verified = p.company?.verification.status === 'verified';

  return (
    <div className="flex flex-col gap-6">
      <SokoBreadcrumb
        onBack={onBack}
        backLabel="Back to Contacts & Network"
        trail={[{ label: 'Contacts & Network', onClick: onBack }, { label: p.name }]}
      />

      <header className={`${sokoCard} p-5 sm:p-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex items-center gap-4 min-w-0">
          <Avatar name={p.name} size="lg" dark={p.source === 'team'} />
          <div className="min-w-0">
            <p className={sokoTokens.eyebrow}>{SOURCE_LABEL[p.source]}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 text-balance">{p.name}</h1>
            <p className="mt-0.5 text-sm text-slate-600">{p.title}{p.companyName ? ` · ${p.companyName}` : ''}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SokoStatusIndicator label={status.label} tone={status.tone} />
              {p.saved && <SokoStatusIndicator label="Saved to GEC" tone="info" />}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.source === 'directory' && manage && (
            <button type="button" onClick={() => onSave(p)} className={primaryBtn}><Bookmark className="w-4 h-4" />Save to company contacts</button>
          )}
          {p.sokoUserId && p.source !== 'team' && (
            <button type="button" onClick={() => onMessage(p)} className={secondaryBtn}><MessageSquare className="w-4 h-4" />Message</button>
          )}
          <button type="button" onClick={() => onShare(p)} className={secondaryBtn}><Share2 className="w-4 h-4" />Share</button>
          {p.saved && manage && (
            <button type="button" onClick={() => onRemove(p)} className={`${secondaryBtn} hover:text-rose-700 hover:border-rose-200`}><Trash2 className="w-4 h-4" />Remove</button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className={`${sokoCard} p-5`} aria-labelledby="cd-methods">
            <h2 id="cd-methods" className="text-[15px] font-semibold text-slate-900">Contact methods</h2>
            {p.email || p.phone ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {p.phone && (
                  <li className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-slate-700"><Phone className="w-4 h-4 text-slate-400" aria-hidden /><span className="font-mono tabular-nums">{p.phone}</span></span>
                    <span className="flex gap-2">
                      <a href={`tel:${p.phone.replace(/\s/g, '')}`} className={secondaryBtn}>Call</a>
                      <a href={`https://wa.me/${p.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>WhatsApp</a>
                    </span>
                  </li>
                )}
                {p.email && (
                  <li className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-slate-700 min-w-0"><Mail className="w-4 h-4 text-slate-400 shrink-0" aria-hidden /><span className="truncate">{p.email}</span></span>
                    <a href={`mailto:${p.email}`} className={secondaryBtn}>Email</a>
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
                <Lock className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />
                {p.source === 'key'
                  ? 'Public key contacts list a role and location only. Direct details are not published on the company profile.'
                  : 'This person has not shared direct contact details with GEC Dubai.'}
              </p>
            )}
          </section>

          <section className={`${sokoCard} p-5`} aria-labelledby="cd-history">
            <h2 id="cd-history" className="text-[15px] font-semibold text-slate-900">Relationship history</h2>
            <p className="mt-0.5 text-xs text-slate-500">Recorded activity between GEC Dubai and {p.companyName || 'this company'}.</p>
            {p.source === 'team' || p.source === 'key' ? (
              <p className="mt-3 text-sm text-slate-500">Relationship history is tracked for external companies only.</p>
            ) : (
              <ol className="mt-3 flex flex-col gap-2">
                {p.saved && (
                  <li className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                    <BookmarkCheck className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" aria-hidden />
                    <span className="text-sm text-slate-700">Saved to company contacts{p.saved.savedBy ? ` by ${p.saved.savedBy}` : ''}
                      <span className="block font-mono text-[11px] text-slate-500">{fmtDate(p.saved.at)}</span></span>
                  </li>
                )}
                {visits.map((v) => (
                  <li key={v.id} className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                    <CalendarDays className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" aria-hidden />
                    <span className="text-sm text-slate-700">{v.purpose} visit · {v.representative}
                      <span className="block font-mono text-[11px] text-slate-500">{fmtDate(v.date)} · {v.time} · {v.status.replace('-', ' ')}</span></span>
                  </li>
                ))}
                {!p.saved && visits.length === 0 && <li className="text-sm text-slate-500">No recorded interactions yet.</li>}
              </ol>
            )}
            {visits.length > 0 && (
              <button type="button" onClick={() => sw.go('sw-visits')} className={`${sokoTokens.focus} mt-3 inline-flex items-center gap-1 rounded-md text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer`}>
                Open in Visits<ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className={`${sokoCard} p-5`} aria-labelledby="cd-company">
            <h2 id="cd-company" className="text-[15px] font-semibold text-slate-900">Company affiliation</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" aria-hidden /></span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{p.companyName || '—'}</p>
                <p className="text-xs text-slate-500 truncate">{[p.category, p.location].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            {p.company && (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-slate-500">SOKO ID</dt><dd className="mt-0.5 font-mono text-slate-800">{p.company.sokoId}</dd></div>
                <div><dt className="text-slate-500">Verification</dt>
                  <dd className="mt-0.5 inline-flex items-center gap-1 text-slate-800">{verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden />}{verified ? 'Verified' : 'Not verified'}</dd></div>
              </dl>
            )}
            {p.source === 'team' ? (
              sw.can('team.manage') && (
                <button type="button" onClick={() => sw.go('sw-team')} className={`${secondaryBtn} mt-4 w-full justify-center`}><UserCog className="w-4 h-4" />Manage in Team &amp; Roles</button>
              )
            ) : p.company && (
              <button type="button" onClick={() => onOpenCompany(p)} className={`${secondaryBtn} mt-4 w-full`}>
                <Building2 className="w-4 h-4" />{hasVendorRecord ? 'View vendor record' : 'View company profile'}
                {!hasVendorRecord && <PrototypeTag />}
              </button>
            )}
          </section>

          <section className={`${sokoCard} p-5`} aria-labelledby="cd-card">
            <h2 id="cd-card" className="text-[15px] font-semibold text-slate-900">Digital business card</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Each person has one SOKO identity and one card, regardless of how many companies they appear under.</p>
            <button type="button" onClick={() => sw.notify('Prototype: viewing another member\u2019s digital business card is not available yet.')} className={`${secondaryBtn} mt-3 w-full`}>
              <CreditCard className="w-4 h-4" />View business card<PrototypeTag />
            </button>
          </section>

          {p.roleLabel && (
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-slate-500">
              Role: <span className="font-medium text-slate-700">{p.roleLabel}</span>. Team members are display-only here; membership and roles are managed under Company → Team &amp; Roles.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────
export const ContractorContacts: React.FC<{ sw: SW; onStartMessageWith: (userId: string, name: string) => void }> = ({ sw, onStartMessageWith }) => {
  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [membership, setMembership] = useState<'all' | 'soko' | 'off'>('all');
  const [savedFilter, setSavedFilter] = useState<'all' | 'saved' | 'unsaved'>('all');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const manage = sw.can('contacts.manage');
  const companyName = sw.company.profile.tradingName;

  const people = useMemo<Person[]>(() => {
    const byKey = new Map<string, Person>();
    const add = (p: Person) => { if (!byKey.has(p.key)) byKey.set(p.key, p); };

    sw.store.contacts
      .filter((c) => c.companyId === sw.company.id && c.kind === 'corporate')
      .forEach((c) => add({
        key: c.sourceUserId ?? c.id, sokoUserId: c.sourceUserId, name: c.name, title: c.title, companyName: c.company,
        company: c.sourceCompanyId ? companyById(sw.store, c.sourceCompanyId) : undefined,
        category: c.category, location: c.emirate, email: c.email, phone: c.phone, source: 'company', saved: c,
      }));

    sw.store.companies
      .filter((co) => co.id !== sw.company.id && co.kind === 'supplier')
      .forEach((co) => membersOf(sw.store, co.id).filter((m) => m.status === 'active').forEach((m) => add({
        key: m.userId, sokoUserId: m.userId, name: m.name, title: m.title, companyName: co.profile.tradingName, company: co,
        category: co.profile.categories[0] ?? '', location: co.profile.emirate, email: m.email, source: 'directory',
      })));

    sw.members.filter((m) => m.status === 'active').forEach((m) => add({
      key: m.userId, sokoUserId: m.userId, name: m.name, title: m.title, companyName, company: sw.company,
      category: '', location: sw.company.profile.emirate, email: m.email, source: 'team', roleLabel: roleMeta(m.role).label,
    }));

    sw.company.profile.contacts.forEach((k) => add({
      key: `key_${k.id}`, name: k.name, title: k.title, companyName, company: sw.company,
      category: k.category, location: k.location, source: 'key',
    }));

    return [...byKey.values()];
  }, [sw.store, sw.company, sw.members, companyName]);

  const visitsWith = (companyId?: string) =>
    companyId
      ? sw.store.visits
          .filter((v) => (v.companyId === sw.company.id && v.hostCompanyId === companyId) || (v.hostCompanyId === sw.company.id && v.companyId === companyId))
          .sort((a, b) => b.date.localeCompare(a.date))
      : [];

  const counts = useMemo(() => {
    const saved = people.filter((p) => p.source === 'company');
    const savedCompanyIds = new Set(saved.map((p) => p.company?.id).filter(Boolean) as string[]);
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const recent = sw.store.visits.filter((v) => {
      const other = v.companyId === sw.company.id ? v.hostCompanyId : v.hostCompanyId === sw.company.id ? v.companyId : undefined;
      return other && savedCompanyIds.has(other) && v.date >= cutoff && v.date <= today;
    }).length;
    return {
      company: saved.length,
      soko: people.filter((p) => p.source !== 'team' && p.source !== 'key' && p.company).length,
      directory: people.filter((p) => p.source === 'directory').length,
      team: people.filter((p) => p.source === 'team').length,
      key: people.filter((p) => p.source === 'key').length,
      recent,
    };
  }, [people, sw.store.visits, sw.company.id]);

  const companyOptions = useMemo(() => [...new Set(people.map((p) => p.companyName).filter(Boolean))].sort(), [people]);

  const filtered = people.filter((p) => {
    if (source !== 'all' && p.source !== source) return false;
    if (companyFilter !== 'all' && p.companyName !== companyFilter) return false;
    if (membership === 'soko' && !p.company) return false;
    if (membership === 'off' && p.company) return false;
    if (savedFilter === 'saved' && !p.saved) return false;
    if (savedFilter === 'unsaved' && (p.saved || p.source !== 'directory')) return false;
    if (search.trim()) {
      const hay = [p.name, p.companyName, p.title, p.category, p.location].join(' ').toLowerCase();
      if (!hay.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  const hasFilters = source !== 'all' || companyFilter !== 'all' || membership !== 'all' || savedFilter !== 'all' || search.trim() !== '';
  const clearFilters = () => { setSource('all'); setCompanyFilter('all'); setMembership('all'); setSavedFilter('all'); setSearch(''); };

  const vendorFor = (companyId?: string) =>
    companyId ? sw.store.vendorRecords.find((vr) => vr.companyId === sw.company.id && vr.supplierCompanyId === companyId) : undefined;

  const save = (p: Person) => {
    if (!p.company || !p.sokoUserId || isSavedCorporateContact(sw.store, sw.company.id, p.sokoUserId)) return;
    const res = saveCompanyContact(sw.ctx, {
      name: p.name, title: p.title, company: p.companyName, category: p.category, emirate: p.location,
      email: p.email, phone: p.phone, sourceCompanyId: p.company.id, sourceUserId: p.sokoUserId,
    });
    if (res.ok) { sw.setStore(res.store); sw.notify(`Saved ${p.name} to ${companyName} contacts`); } else sw.notify(res.error);
  };

  const remove = (p: Person) => {
    if (!p.saved) return;
    const res = removeCompanyContact(sw.ctx, p.saved.id);
    if (res.ok) { sw.setStore(res.store); sw.notify(`Removed ${p.name} from ${companyName} contacts`); } else sw.notify(res.error);
  };

  const message = (p: Person) => {
    if (!p.sokoUserId) return;
    onStartMessageWith(p.sokoUserId, p.name);
    sw.notify(`Opening a conversation with ${p.name}`);
  };

  const share = async (p: Person) => {
    const text = [p.name, p.title, p.companyName, p.company ? `SOKO ${p.company.sokoId}` : '', p.email, p.phone].filter(Boolean).join('\n');
    try {
      if (navigator.share) { await navigator.share({ title: p.name, text }); return; }
      await navigator.clipboard.writeText(text);
      sw.notify(`Copied ${p.name}\u2019s contact summary`);
    } catch {
      sw.notify('Sharing was cancelled');
    }
  };

  const openCompany = (p: Person) => {
    const vendor = vendorFor(p.company?.id);
    if (!vendor) { sw.notify('Prototype: public SOKO company profiles open from the Vendor Register once a vendor record exists.'); return; }
    const url = new URL(window.location.href);
    url.searchParams.set('vendor', vendor.id);
    window.history.replaceState(window.history.state, '', url);
    sw.go('sw-vendors');
  };

  const open = (key: string) => { setOpenKey(key); window.scrollTo({ top: 0 }); };
  const openPerson = people.find((p) => p.key === openKey);

  if (openPerson) {
    return (
      <ContactDetail
        p={openPerson}
        sw={sw}
        visits={visitsWith(openPerson.source === 'team' || openPerson.source === 'key' ? undefined : openPerson.company?.id)}
        onBack={() => setOpenKey(null)}
        onSave={save}
        onRemove={remove}
        onMessage={message}
        onShare={share}
        onOpenCompany={openCompany}
        hasVendorRecord={!!vendorFor(openPerson.company?.id)}
      />
    );
  }

  const rowAction = (p: Person) => {
    if (p.source === 'team') return <span className="text-xs text-slate-400">Display only</span>;
    if (p.source === 'key') return <span className="text-xs text-slate-400">Public profile</span>;
    if (p.saved) {
      return manage
        ? <button type="button" onClick={() => remove(p)} className={`${sokoTokens.focus} rounded-md px-1 text-xs font-medium text-slate-500 hover:text-rose-700 cursor-pointer`}>Remove</button>
        : <span className="inline-flex items-center gap-1 text-xs text-blue-700"><BookmarkCheck className="w-3.5 h-3.5" aria-hidden />Saved</span>;
    }
    return manage
      ? <button type="button" onClick={() => save(p)} className={`${sokoTokens.focus} inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer`}><Bookmark className="w-3.5 h-3.5" aria-hidden />Save</button>
      : <span className="text-xs text-slate-400">View only</span>;
  };

  const NameCell: React.FC<{ p: Person }> = ({ p }) => (
    <button type="button" onClick={() => open(p.key)} className={`${sokoTokens.focus} group flex items-center gap-3 min-w-0 rounded-lg text-left cursor-pointer`}>
      <Avatar name={p.name} dark={p.source === 'team'} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">{p.name}</span>
        <span className="block truncate text-xs text-slate-500">{p.title}</span>
      </span>
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={sokoTokens.eyebrow}>Contractor workspace · Contacts</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 text-balance">Contacts &amp; Network</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 text-pretty">
            People connected to {companyName}: saved company contacts, SOKO supplier professionals and your own team. Personal contacts stay in your personal workspace and are never added here automatically.
          </p>
        </div>
        <button type="button" onClick={() => { clearFilters(); setSource('directory'); }}
          className={`${sokoTokens.focus} inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer`}>
          <Search className="w-4 h-4" aria-hidden />Find supplier contacts
        </button>
      </header>

      <section aria-label="Contacts overview" className={`${sokoCard} grid grid-cols-2 md:grid-cols-4 overflow-hidden [&>*]:border-slate-100 [&>*:nth-child(-n+2)]:border-b md:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r md:[&>*:not(:last-child)]:border-r`}>
        <SokoKpiCell label="Company contacts" value={counts.company} detail={`Saved to ${companyName}`} onClick={() => { clearFilters(); setSource('company'); }}
          hint="Contacts saved into this company workspace. Visible to authorized team members; not part of anyone's personal network." />
        <SokoKpiCell label="SOKO connections" value={counts.soko} detail="External people with a SOKO company" onClick={() => { clearFilters(); setMembership('soko'); }}
          hint="Company contacts and directory professionals who belong to a company on SOKO." />
        <SokoKpiCell label="Discoverable" value={counts.directory} detail="Supplier professionals not yet saved" onClick={() => { clearFilters(); setSource('directory'); }} />
        <SokoKpiCell label="Recent interactions" value={counts.recent} detail="Visits with saved companies · 30 days" onClick={() => sw.go('sw-visits')}
          hint="Recorded visits in the last 30 days between GEC Dubai and companies of saved contacts." />
      </section>

      <section className={`${sokoCard} flex flex-col gap-4 p-4 sm:p-5`} aria-label="Filter contacts">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="overflow-x-auto">
            <SokoTabs<SourceFilter>
              label="Contact source"
              variant="underline"
              active={source}
              onChange={setSource}
              tabs={[
                { id: 'all', label: 'All', count: people.length },
                { id: 'company', label: 'Company contacts', count: counts.company },
                { id: 'directory', label: 'SOKO directory', count: counts.directory },
                { id: 'key', label: 'Public key contacts', count: counts.key },
                { id: 'team', label: 'Team members', count: counts.team },
              ]}
            />
          </div>
          <div className="w-full sm:w-48">
            <SokoTabs<View> label="Layout" active={view} onChange={setView} tabs={[{ id: 'list', label: 'List' }, { id: 'cards', label: 'Cards' }]} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))]">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Search contacts</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company, designation, trade, location…"
              className={`${sokoTokens.focus} h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-300 transition-colors`} />
          </label>
          <select aria-label="Company" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className={selectCls}>
            <option value="all">All companies</option>
            {companyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="SOKO membership" value={membership} onChange={(e) => setMembership(e.target.value as typeof membership)} className={selectCls}>
            <option value="all">Any membership</option>
            <option value="soko">On SOKO</option>
            <option value="off">Off-platform</option>
          </select>
          <select aria-label="Saved status" value={savedFilter} onChange={(e) => setSavedFilter(e.target.value as typeof savedFilter)} className={selectCls}>
            <option value="all">Any saved status</option>
            <option value="saved">Saved to GEC</option>
            <option value="unsaved">Not saved</option>
          </select>
        </div>
        {hasFilters && (
          <p className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Showing {filtered.length} of {people.length} people</span>
            <button type="button" onClick={clearFilters} className={`${sokoTokens.focus} rounded-md px-1 font-medium text-blue-700 hover:text-blue-800 cursor-pointer`}>Clear filters</button>
          </p>
        )}
      </section>

      {people.length === 0 ? (
        <div className={`${sokoCard} py-10`}>
          <SokoEmptyState icon={Users} title="No contacts yet" description={`Save supplier professionals from the SOKO directory to build ${companyName}'s contact list.`} />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${sokoCard} py-10`}>
          <SokoEmptyState icon={Search} title="No people match these filters" description="Try another source, company or search term."
            action={<button type="button" onClick={clearFilters} className={secondaryBtn}>Clear filters</button>} />
        </div>
      ) : view === 'cards' ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Contacts">
          {filtered.map((p) => {
            const s = networkStatus(p);
            return (
              <li key={p.key} className={`${sokoCard} flex flex-col gap-4 p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <NameCell p={p} />
                  <SokoStatusIndicator label={s.label} tone={s.tone} />
                </div>
                <div className="flex flex-col gap-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 truncate"><Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />{p.companyName}</span>
                  {(p.category || p.location) && (
                    <span className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />{[p.category, p.location].filter(Boolean).join(' · ')}</span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <ContactMethods p={p} compact />
                  {rowAction(p)}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <section className={`${sokoCard} hidden md:block overflow-x-auto`} aria-label="Contacts">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                  {['Person', 'Company', 'Trade · Location', 'Network', 'Contact', ''].map((h, i) => (
                    <th key={i} scope="col" className={`${sokoTokens.eyebrow} px-4 py-3 font-medium ${i === 5 ? 'text-right' : ''}`}>{h || <span className="sr-only">Actions</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const s = networkStatus(p);
                  return (
                    <tr key={p.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 max-w-64"><NameCell p={p} /></td>
                      <td className="px-4 py-3 max-w-52">
                        <span className="block truncate text-slate-800">{p.companyName}</span>
                        <span className="block truncate text-xs text-slate-500">{p.saved ? `Saved ${daysAgo(p.saved.at)}` : SOURCE_LABEL[p.source]}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{[p.category, p.location].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="px-4 py-3"><SokoStatusIndicator label={s.label} tone={s.tone} /></td>
                      <td className="px-4 py-3"><ContactMethods p={p} compact /></td>
                      <td className="px-4 py-3 text-right">{rowAction(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <ul className={`${sokoCard} divide-y divide-slate-100 md:hidden`} aria-label="Contacts">
            {filtered.map((p) => (
              <li key={p.key} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <NameCell p={p} />
                  {rowAction(p)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500">{p.companyName}</span>
                  <ContactMethods p={p} compact />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Lock className="w-3.5 h-3.5 mt-px shrink-0 text-slate-400" aria-hidden />
        Company contacts are visible to authorized members of {companyName}. Each person appears once, linked to their single SOKO identity.
      </p>
    </div>
  );
};
