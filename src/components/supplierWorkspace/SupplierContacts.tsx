import React, { useState } from 'react';
import { Lock, Mail, MessageSquare, Phone, Search, Users } from 'lucide-react';
import { CompanyContact, ROLE_META } from '../../data/supplierTypes';
import { removeSavedContact, respondToContact } from '../../data/supplierService';
import { btnPrimary, btnSecondary, inputCls } from '../NetworkShared';
import { DemoNote, EmptyState, SubTabs, daysAgo } from '../marketHub/MarketHubShared';
import { Card, PageHeader, SW } from './SupplierShared';

type Tab = 'connections' | 'incoming' | 'saved' | 'company' | 'team';

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

export const SupplierContacts: React.FC<{ sw: SW; onStartMessageWith: (userId: string, name: string) => void }> = ({ sw, onStartMessageWith }) => {
  const [tab, setTab] = useState<Tab>('connections');
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
      <PageHeader eyebrow="Contacts" title="Company contacts" subtitle="Buyer relationships that belong to this company workspace. Your personal network stays in your personal workspace and is never shared automatically." />

      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-4">
        <SubTabs
          tabs={[
            { id: 'connections' as Tab, label: 'Buyer connections', count: all.filter((c) => c.kind === 'connection').length },
            { id: 'incoming' as Tab, label: 'Incoming requests', count: all.filter((c) => c.kind === 'incoming').length },
            { id: 'saved' as Tab, label: 'Saved', count: all.filter((c) => c.kind === 'saved').length },
            { id: 'company' as Tab, label: 'Key contacts', count: sw.company.profile.contacts.length },
            { id: 'team' as Tab, label: 'Team members', count: team.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        {['connections', 'incoming', 'saved'].includes(tab) && (
          <div className="relative md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" className={`${inputCls} pl-9`} />
          </div>
        )}
      </div>

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
                <span className="text-xs font-medium text-slate-600 shrink-0">{ROLE_META[m.role].label}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4">
        <DemoNote>Contacts are fictional. SOKO never lets suppliers export buyer lists; buyer contact details appear only when the buyer has chosen to share them.</DemoNote>
      </div>
    </div>
  );
};
