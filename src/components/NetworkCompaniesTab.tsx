import React, { useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, Building2, Copy, Mail, MessageCircle, Send, Users } from 'lucide-react';
import { CommunityContact } from '../types';
import { cityOf, companyFor, companyKey, matchesNetworkQuery } from '../data/myNetwork';
import { BuyerSupplier, supplierLocation } from '../data/buyerSuppliers';
import { SupplierLogo } from './SupplierTrust';
import { StatusPill, VerifiedCompanyBadge, btnGhost, btnPrimary, btnSecondary } from './NetworkShared';
import { ProfileDialog } from './ProfileDialog';

interface CompanyGroup {
  key: string;
  name: string;
  supplier?: BuyerSupplier;
  category: string;
  location: string;
  contacts: CommunityContact[];
}

interface CompaniesTabProps {
  contacts: CommunityContact[];
  query: string;
  savedSupplierIds: string[];
  onToggleSaveSupplier: (s: BuyerSupplier) => void;
  onOpenCompany: (supplierId: string) => void;
  onViewContacts: (company: string) => void;
  onNotify: (m: string) => void;
}

export const networkCompanies = (contacts: CommunityContact[]): CompanyGroup[] => {
  const groups = new Map<string, CompanyGroup>();
  contacts
    .filter((c) => c.company && (c.isMaintained || c.connectionStatus === 'connected'))
    .forEach((c) => {
      const key = companyKey(c);
      const existing = groups.get(key);
      if (existing) {
        existing.contacts.push(c);
        return;
      }
      const supplier = companyFor(c);
      groups.set(key, {
        key,
        name: supplier?.name ?? c.company,
        supplier,
        category: supplier?.categories[0] ?? c.category,
        location: supplier ? supplierLocation(supplier) : cityOf(c.location),
        contacts: [c],
      });
    });
  return Array.from(groups.values()).sort((a, b) => b.contacts.length - a.contacts.length || a.name.localeCompare(b.name));
};

const INVITES_KEY = 'soko_network_company_invites_v1';

const loadInvites = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(INVITES_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const small = '!min-h-9 !px-3 !text-xs';

export const NetworkCompaniesTab: React.FC<CompaniesTabProps> = ({ contacts, query, savedSupplierIds, onToggleSaveSupplier, onOpenCompany, onViewContacts, onNotify }) => {
  const [invited, setInvited] = useState<string[]>(loadInvites);
  const [inviting, setInviting] = useState<CompanyGroup | null>(null);
  const companies = useMemo(() => {
    const all = networkCompanies(contacts);
    if (!query.trim()) return all;
    return all.filter((g) => g.contacts.some((c) => matchesNetworkQuery(c, query)) || g.name.toLowerCase().includes(query.trim().toLowerCase()));
  }, [contacts, query]);

  if (!companies.length) {
    return <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-sm text-slate-500">No companies match your search.</div>;
  }

  const registered = companies.filter((g) => g.supplier);
  const unregistered = companies.filter((g) => !g.supplier);

  const markInvited = (g: CompanyGroup) => {
    if (invited.includes(g.key)) return;
    const next = [...invited, g.key];
    setInvited(next);
    localStorage.setItem(INVITES_KEY, JSON.stringify(next));
  };

  const viewContactsBtn = (g: CompanyGroup) => (
    <button type="button" onClick={() => onViewContacts(g.contacts[0].company)} className={`${btnSecondary} ${small}`}>
      <Users className="w-3.5 h-3.5" />
      View Contacts
    </button>
  );

  const row = (g: CompanyGroup, actions: React.ReactNode) => (
    <li key={g.key} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {g.supplier ? (
          <SupplierLogo supplier={g.supplier} size="sm" />
        ) : (
          <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 flex flex-wrap items-center gap-2">
            {g.supplier ? (
              <button type="button" onClick={() => onOpenCompany(g.supplier!.id)} className="text-left hover:text-blue-700 hover:underline underline-offset-2 cursor-pointer">
                {g.name}
              </button>
            ) : (
              g.name
            )}
            {g.supplier?.status === 'verified' && <VerifiedCompanyBadge />}
          </p>
          <p className="text-xs text-slate-500">
            {[g.category, g.location, `${g.contacts.length} ${g.contacts.length === 1 ? 'Contact' : 'Contacts'}`].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </li>
  );

  return (
    <div className="space-y-6">
      {registered.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900">
            Registered on SOKO <span className="font-normal text-slate-500">({registered.length})</span>
          </h2>
          <p className="mb-2 text-xs text-slate-500">Company profiles open from the SOKO Supplier Directory.</p>
          <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {registered.map((g) => {
              const saved = savedSupplierIds.includes(g.supplier!.id);
              return row(
                g,
                <>
                  <button type="button" onClick={() => onOpenCompany(g.supplier!.id)} className={`${btnPrimary} ${small}`}>
                    <Building2 className="w-3.5 h-3.5" />
                    View Company
                  </button>
                  {viewContactsBtn(g)}
                  <button type="button" onClick={() => onToggleSaveSupplier(g.supplier!)} aria-pressed={saved} className={`${btnSecondary} ${small}`}>
                    {saved ? <BookmarkCheck className="w-3.5 h-3.5 text-blue-700" /> : <Bookmark className="w-3.5 h-3.5" />}
                    {saved ? 'Saved Supplier' : 'Save Supplier'}
                  </button>
                </>
              );
            })}
          </ul>
        </section>
      )}

      {unregistered.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900">
            Not yet on SOKO <span className="font-normal text-slate-500">({unregistered.length})</span>
          </h2>
          <p className="mb-2 text-xs text-slate-500">Taken from your own contact details. These companies don't have a SOKO profile yet.</p>
          <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {unregistered.map((g) =>
              row(
                g,
                <>
                  {viewContactsBtn(g)}
                  {invited.includes(g.key) ? (
                    <StatusPill tone="slate">Invited</StatusPill>
                  ) : (
                    <button type="button" onClick={() => setInviting(g)} className={`${btnGhost} ${small}`}>
                      <Send className="w-3.5 h-3.5" />
                      Invite Company to SOKO
                    </button>
                  )}
                </>
              )
            )}
          </ul>
        </section>
      )}

      {inviting && (
        <InviteCompanyDialog
          group={inviting}
          onClose={() => setInviting(null)}
          onSent={(how) => {
            markInvited(inviting);
            onNotify(how === 'copy' ? 'Invitation copied' : `Invitation opened in ${how === 'whatsapp' ? 'WhatsApp' : 'your email app'}`);
            setInviting(null);
          }}
        />
      )}
    </div>
  );
};

const InviteCompanyDialog: React.FC<{ group: CompanyGroup; onClose: () => void; onSent: (how: 'whatsapp' | 'email' | 'copy') => void }> = ({ group, onClose, onSent }) => {
  const message = `Hi, I'd like to find ${group.name} on SOKO, the construction supplier platform. You can register your company for free at ${window.location.origin}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      onSent('copy');
    } catch {
      onClose();
    }
  };
  return (
    <ProfileDialog title="Invite Company to SOKO" subtitle={group.name} onClose={onClose}>
      <div className="px-5 py-4 space-y-3">
        <p className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 leading-relaxed">{message}</p>
        <div className="grid grid-cols-3 gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" onClick={() => onSent('whatsapp')} className={btnSecondary}>
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>
          <a href={`mailto:?subject=${encodeURIComponent('Join SOKO')}&body=${encodeURIComponent(message)}`} onClick={() => onSent('email')} className={btnSecondary}>
            <Mail className="w-4 h-4" />
            Email
          </a>
          <button type="button" onClick={copy} className={btnSecondary}>
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
        <p className="text-[11px] text-slate-500">Prototype: you send this yourself. SOKO doesn't message the company, share your contacts or create a company record.</p>
      </div>
    </ProfileDialog>
  );
};
