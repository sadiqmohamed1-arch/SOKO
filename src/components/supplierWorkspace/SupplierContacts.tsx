import React, { useState } from 'react';
import { Building2, Lock, Mail, MessageSquare, Phone, Search, Users, Bookmark, BookmarkCheck, Calendar, FileText, ArrowRight } from 'lucide-react';
import { CompanyContact, roleMeta, SupplierVisit } from '../../data/supplierTypes';
import { isSavedCorporateContact, removeCompanyContact, removeSavedContact, respondToContact, saveCompanyContact } from '../../data/supplierService';
import { companyById, membersOf } from '../../data/supplierStore';
import { btnPrimary, btnSecondary, inputCls } from '../NetworkShared';
import { DemoNote, EmptyState, SubTabs, daysAgo } from '../marketHub/MarketHubShared';
import { Card, PageHeader, SW } from './SupplierShared';

type Tab = 'connections' | 'incoming' | 'saved' | 'corporate' | 'company' | 'team';

const ContactRow: React.FC<{ c: CompanyContact; actions?: React.ReactNode }> = ({ c, actions }) => (
  <li className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold flex items-center justify-center shrink-0">
        {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
        <p className="text-xs text-slate-500 truncate">{c.title} · {c.company} · {c.emirate}</p>
        {c.consentToShare ? (
          <p className="mt-0.5 text-xs text-slate-600 flex flex-wrap gap-x-3">
            {c.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
            {c.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-400 inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Contact details not shared by this buyer</p>
        )}
        {c.message && <p className="mt-1 text-xs text-slate-700 bg-slate-50 rounded-md px-2 py-1">"{c.message}"</p>}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0 sm:pl-0 pl-13">
      <span className="text-xs text-slate-400 mr-1">{daysAgo(c.at)}</span>
      {actions}
    </div>
  </li>
);

const CorporateContactRow: React.FC<{ c: CompanyContact; sw: SW; onRemove: () => void }> = ({ c, sw, onRemove }) => {
  const linkedCompany = c.sourceCompanyId ? companyById(sw.store, c.sourceCompanyId) : undefined;
  const linkedVisits = sw.store.visits.filter(
    (v: SupplierVisit) =>
      (v.companyId === sw.company.id && v.hostCompanyId === c.sourceCompanyId) ||
      (v.hostCompanyId === sw.company.id && v.companyId === c.sourceCompanyId),
  );
  const lastVisit = linkedVisits.sort((a, b) => b.date.localeCompare(a.date))[0];
  const manage = sw.can('contacts.manage');

  return (
    <li className="py-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center shrink-0">
          {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
            <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Corporate</span>
          </div>
          <p className="text-xs text-slate-500 truncate">{c.title} · {c.company} · {c.emirate}</p>
          <p className="mt-0.5 text-xs text-slate-600 flex flex-wrap gap-x-3">
            {c.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
            {c.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
          </p>

          {linkedCompany && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {linkedCompany.profile.tradingName}
              </span>
              {linkedCompany.verification.status === 'verified' && (
                <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Verified</span>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {linkedVisits.length > 0
                ? `${linkedVisits.length} visit${linkedVisits.length > 1 ? 's' : ''}${lastVisit ? ` · last ${daysAgo(lastVisit.date)}` : ''}`
                : 'No visits yet'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-slate-400" />
              Saved {daysAgo(c.at)}{c.savedBy ? ` by ${c.savedBy}` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {manage && (
            <button type="button" onClick={onRemove} className="text-xs font-semibold text-slate-500 hover:text-rose-700 cursor-pointer">Remove</button>
          )}
        </div>
      </div>
    </li>
  );
};

export const SupplierContacts: React.FC<{ sw: SW; onStartMessageWith: (userId: string, name: string) => void }> = ({ sw, onStartMessageWith }) => {
  const [tab, setTab] = useState<Tab>('corporate');
  const [q, setQ] = useState('');
  const all = sw.store.contacts.filter((c) => c.companyId === sw.company.id);
  const manage = sw.can('contacts.manage');
  const match = (c: CompanyContact) => !q.trim() || `${c.name} ${c.company} ${c.category}`.toLowerCase().includes(q.trim().toLowerCase());
  const of = (kind: CompanyContact['kind']) => all.filter((c) => c.kind === kind && match(c));
  const team = sw.members.filter((m) => m.status === 'active');
  const message = (c: CompanyContact) => {
    onStartMessageWith(`contact_${c.id}`, c.name);
    sw.notify(`Opening a conversation with ${c.name}`);
  };

  const isContractor = sw.company.kind === 'contractor';
  const corporateContacts = all.filter((c) => c.kind === 'corporate');

  const discoverableSuppliers = isContractor
    ? sw.store.companies
        .filter((c) => c.id !== sw.company.id && c.kind === 'supplier')
        .flatMap((supplier) => {
          const supplierMembers = membersOf(sw.store, supplier.id).filter((m) => m.status === 'active');
          return supplierMembers.map((m) => ({
            member: m,
            company: supplier,
          }));
        })
        .filter((item) => {
          if (!q.trim()) return true;
          return `${item.member.name} ${item.company.profile.tradingName}`.toLowerCase().includes(q.trim().toLowerCase());
        })
    : [];

  const handleSave = (name: string, title: string, companyName: string, category: string, emirate: string, email: string | undefined, phone: string | undefined, sourceCompanyId: string, sourceUserId: string) => {
    const res = saveCompanyContact(sw.ctx, { name, title, company: companyName, category, emirate, email, phone, sourceCompanyId, sourceUserId });
    if (res.ok) {
      sw.setStore(res.store);
      sw.notify(`Saved ${name} to company contacts`);
    } else {
      sw.notify(res.error);
    }
  };

  const list = (items: CompanyContact[], actions: (c: CompanyContact) => React.ReactNode, empty: string) =>
    items.length === 0 ? (
      <EmptyState icon={<Users className="w-5 h-5" />} title="Nothing here yet" text={empty} />
    ) : (
      <Card>
        <ul className="divide-y divide-slate-100 -my-3">{items.map((c) => <ContactRow key={c.id} c={c} actions={actions(c)} />)}</ul>
      </Card>
    );

  return (
    <div>
      <PageHeader eyebrow="Contacts" title="Company contacts" subtitle="Contacts that belong to this company workspace. Your personal network stays in your personal workspace and is never shared automatically." />

      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-4">
        <SubTabs
          tabs={[
            ...(isContractor ? [{ id: 'corporate' as Tab, label: 'Corporate contacts', count: corporateContacts.length }] : []),
            { id: 'connections' as Tab, label: 'Buyer connections', count: all.filter((c) => c.kind === 'connection').length },
            { id: 'incoming' as Tab, label: 'Incoming requests', count: all.filter((c) => c.kind === 'incoming').length },
            { id: 'saved' as Tab, label: 'Saved', count: all.filter((c) => c.kind === 'saved').length },
            { id: 'company' as Tab, label: 'Key contacts', count: sw.company.profile.contacts.length },
            { id: 'team' as Tab, label: 'Team members', count: team.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        {['connections', 'incoming', 'saved', 'corporate'].includes(tab) && (
          <div className="relative md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" className={`${inputCls} pl-9`} />
          </div>
        )}
      </div>

      {tab === 'corporate' && isContractor && (
        <div className="space-y-4">
          {corporateContacts.length === 0 ? (
            <EmptyState icon={<Building2 className="w-5 h-5" />} title="No corporate contacts yet" text="Save supplier contacts from the Vendor Register or visit scheduling to build your company's supplier directory." />
          ) : (
            <Card title="Saved corporate contacts" subtitle="Contacts saved to this company workspace, visible to all authorized team members.">
              <ul className="divide-y divide-slate-100">
                {corporateContacts.map((c) => (
                  <CorporateContactRow
                    key={c.id}
                    c={c}
                    sw={sw}
                    onRemove={() => {
                      const res = removeCompanyContact(sw.ctx, c.id);
                      if (res.ok) { sw.setStore(res.store); sw.notify(`Removed ${c.name} from company contacts`); }
                    }}
                  />
                ))}
              </ul>
            </Card>
          )}

          <Card title="Discoverable supplier contacts" subtitle="Active SOKO supplier team members you can save to your corporate contacts.">
            {discoverableSuppliers.length === 0 ? (
              <p className="py-6 text-sm text-slate-500 text-center">No supplier contacts found.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {discoverableSuppliers.map(({ member, company }) => {
                  const alreadySaved = isSavedCorporateContact(sw.store, sw.company.id, member.userId);
                  return (
                    <li key={`${company.id}-${member.userId}`} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold flex items-center justify-center shrink-0">
                          {member.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                          <p className="text-xs text-slate-500 truncate">{member.title} · {company.profile.tradingName} · {company.profile.emirate}</p>
                          <p className="mt-0.5 text-xs text-slate-600 flex flex-wrap gap-x-3">
                            {member.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {alreadySaved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1.5 rounded-md">
                            <BookmarkCheck className="w-4 h-4" /> Saved
                          </span>
                        ) : manage ? (
                          <button
                            type="button"
                            onClick={() => handleSave(
                              member.name, member.title, company.profile.tradingName,
                              company.profile.categories[0] ?? '', company.profile.emirate,
                              member.email, undefined, company.id, member.userId,
                            )}
                            className={btnPrimary}
                          >
                            <Bookmark className="w-4 h-4" /> Save to Company Contacts
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">View only</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'connections' &&
        list(of('connection'), (c) => <button type="button" onClick={() => message(c)} className={btnSecondary}><MessageSquare className="w-4 h-4" /> Message</button>, 'Accepted buyer connection requests appear here.')}

      {tab === 'incoming' &&
        list(
          of('incoming'),
          (c) =>
            manage ? (
              <>
                <button type="button" onClick={() => sw.run(respondToContact(sw.ctx, c.id, false), 'Request declined')} className={btnSecondary}>Decline</button>
                <button type="button" onClick={() => sw.run(respondToContact(sw.ctx, c.id, true), `${c.name} is now a buyer connection`)} className={btnPrimary}>Accept</button>
              </>
            ) : (
              <span className="text-xs text-slate-500">View only</span>
            ),
          'Buyers who ask to connect with your company appear here.',
        )}

      {tab === 'saved' &&
        list(
          of('saved'),
          (c) => (
            <>
              <button type="button" onClick={() => message(c)} className={btnSecondary}><MessageSquare className="w-4 h-4" /> Message</button>
              {manage && <button type="button" onClick={() => sw.run(removeSavedContact(sw.ctx, c.id), 'Removed from saved')} className="text-xs font-semibold text-slate-500 hover:text-rose-700 cursor-pointer">Remove</button>}
            </>
          ),
          'Buyers your team saves from the Market Hub appear here.',
        )}

      {tab === 'company' && (
        <Card title="Public key contacts" action={sw.can('profile.edit') ? <button type="button" onClick={() => sw.go('sw-profile')} className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer">Edit in profile</button> : undefined}>
          <ul className="divide-y divide-slate-100 -my-3">
            {sw.company.profile.contacts.map((c) => (
              <li key={c.id} className="py-3">
                <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.title} · {c.category} · {c.location}</p>
              </li>
            ))}
            {sw.company.profile.contacts.length === 0 && <li className="py-3 text-sm text-slate-500">No public contacts listed.</li>}
          </ul>
        </Card>
      )}

      {tab === 'team' && (
        <Card title="Team members" action={sw.can('team.manage') ? <button type="button" onClick={() => sw.go('sw-team')} className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer">Manage team</button> : undefined}>
          <ul className="divide-y divide-slate-100 -my-3">
            {team.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{m.name}</p>
                  <p className="text-xs text-slate-500 truncate">{m.title} · {m.email}</p>
                </div>
                <span className="text-xs font-medium text-slate-600 shrink-0">{roleMeta(m.role).label}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4">
        <DemoNote>Contacts are fictional. Corporate contacts are visible to all authorized team members of this company workspace.</DemoNote>
      </div>
    </div>
  );
};
