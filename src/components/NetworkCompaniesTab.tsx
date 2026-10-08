import React, { useMemo } from 'react';
import { Bookmark, BookmarkCheck, Building2, Users } from 'lucide-react';
import { CommunityContact } from '../types';
import { cityOf, companyFor, companyKey, matchesNetworkQuery } from '../data/myNetwork';
import { BuyerSupplier, supplierLocation } from '../data/buyerSuppliers';
import { SupplierLogo } from './SupplierTrust';
import { VerifiedCompanyBadge, btnPrimary, btnSecondary } from './NetworkShared';

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

export const NetworkCompaniesTab: React.FC<CompaniesTabProps> = ({ contacts, query, savedSupplierIds, onToggleSaveSupplier, onOpenCompany, onViewContacts }) => {
  const companies = useMemo(() => {
    const all = networkCompanies(contacts);
    if (!query.trim()) return all;
    return all.filter((g) => g.contacts.some((c) => matchesNetworkQuery(c, query)) || g.name.toLowerCase().includes(query.trim().toLowerCase()));
  }, [contacts, query]);

  if (!companies.length) {
    return <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-sm text-slate-500">No companies match your search.</div>;
  }

  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">Companies linked to your saved contacts and connections. Supplier profiles open from the SOKO Supplier Directory.</p>
      <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {companies.map((g) => {
          const saved = !!g.supplier && savedSupplierIds.includes(g.supplier.id);
          return (
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
                    {g.name}
                    {g.supplier?.status === 'verified' && <VerifiedCompanyBadge />}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[g.category, g.location, `${g.contacts.length} ${g.contacts.length === 1 ? 'Contact' : 'Contacts'}`].filter(Boolean).join(' · ')}
                    {!g.supplier && ' · Not in SOKO directory'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.supplier && (
                  <button type="button" onClick={() => onOpenCompany(g.supplier!.id)} className={`${btnPrimary} !min-h-9 !px-3 !text-xs`}>
                    <Building2 className="w-3.5 h-3.5" />
                    View Company
                  </button>
                )}
                <button type="button" onClick={() => onViewContacts(g.contacts[0].company)} className={`${btnSecondary} !min-h-9 !px-3 !text-xs`}>
                  <Users className="w-3.5 h-3.5" />
                  View Contacts
                </button>
                {g.supplier && (
                  <button type="button" onClick={() => onToggleSaveSupplier(g.supplier!)} aria-pressed={saved} className={`${btnSecondary} !min-h-9 !px-3 !text-xs`}>
                    {saved ? <BookmarkCheck className="w-3.5 h-3.5 text-blue-700" /> : <Bookmark className="w-3.5 h-3.5" />}
                    {saved ? 'Saved Supplier' : 'Save Supplier'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
