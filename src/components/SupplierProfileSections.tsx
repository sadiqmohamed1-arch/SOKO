import React, { useState } from 'react';
import { Building2, Calendar, ChevronDown, ExternalLink, Globe2, Layers, Lock, Mail, MapPin, MessageCircle, Phone, UserCheck, UserPlus } from 'lucide-react';
import {
  BuyerSupplier,
  STATUS_META,
  SupplierContact,
  freshnessLabel,
  similarSuppliers,
  supplierLocation,
  supplierMarkets,
  supplierTypeLine,
} from '../data/buyerSuppliers';
import { BuyerVault } from '../data/supplierVault';
import { SupplierLogo, SupplierStatusBadge } from './SupplierTrust';

export const ProfileCard: React.FC<{ id?: string; title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  id,
  title,
  action,
  children,
  className = '',
}) => (
  <section id={id} className={`scroll-mt-24 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 ${className}`}>
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

export const websiteHref = (site: string) => (/^https?:\/\//.test(site) ? site : `https://${site}`);

const GlanceItem: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 min-w-0">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
      <Icon className="w-4 h-4" />
    </span>
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900 break-words">{children}</dd>
    </div>
  </div>
);

export const CompanyAtAGlance: React.FC<{ supplier: BuyerSupplier }> = ({ supplier: s }) => (
  <ProfileCard title="Company at a Glance">
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      <GlanceItem icon={Building2} label="Supplier Type">{supplierTypeLine(s)}</GlanceItem>
      <GlanceItem icon={Layers} label="Primary Category">{s.categories[0]}</GlanceItem>
      <GlanceItem icon={MapPin} label="Headquarters">{supplierLocation(s)}</GlanceItem>
      <GlanceItem icon={Globe2} label="Markets Served">{supplierMarkets(s).join(' · ')}</GlanceItem>
      <GlanceItem icon={Calendar} label="Established">{s.established ?? 'Not provided'}</GlanceItem>
      <GlanceItem icon={ExternalLink} label="Website">
        {s.website ? (
          <a href={websiteHref(s.website)} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 hover:underline">
            Visit Website
          </a>
        ) : (
          'Not provided'
        )}
      </GlanceItem>
    </dl>
  </ProfileCard>
);

export const WhatWeSupply: React.FC<{ supplier: BuyerSupplier }> = ({ supplier: s }) => (
  <ProfileCard id="profile-supply" title="What We Supply">
    <ul className="flex flex-wrap gap-2">
      {s.capabilities.map((c) => (
        <li key={c} className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-medium text-slate-800">
          {c}
        </li>
      ))}
    </ul>
    {s.brands.length > 0 && (
      <div className="mt-5 pt-5 border-t border-slate-100">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Brands</h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {s.brands.map((b) => (
            <li key={b} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-900">
              {b}
            </li>
          ))}
        </ul>
      </div>
    )}
  </ProfileCard>
);

const contactBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

interface KeyContactsProps {
  supplier: BuyerSupplier;
  initiallyExpanded: boolean;
  isSaved: (c: SupplierContact) => boolean;
  onToggleSave: (c: SupplierContact) => void;
  onRequestContact: () => void;
}

const PRIMARY_CONTACTS = 2;

const ContactRow: React.FC<{ contact: SupplierContact; saved: boolean; onToggleSave: () => void; onRequestContact: () => void }> = ({
  contact: c,
  saved,
  onToggleSave,
  onRequestContact,
}) => {
  const showPhone = c.visibility === 'public' && c.phone;
  return (
    <li className="py-4 first:pt-1 last:pb-1 flex flex-col xl:flex-row xl:items-center gap-3">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-sm font-semibold">
          {initials(c.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 leading-snug break-words">{c.name}</p>
          <p className="text-xs text-slate-600 leading-snug break-words">{c.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3 shrink-0" />
            {c.location}
          </p>
        </div>
      </div>
      {c.visibility === 'on-request' ? (
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Lock className="w-3 h-3" />
            Details shared on request
          </span>
          <button type="button" onClick={onRequestContact} className={contactBtn}>
            <MessageCircle className="w-4 h-4" />
            Request Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 xl:justify-end xl:shrink-0">
          {showPhone && (
            <>
              <a href={`tel:${c.phone}`} className={contactBtn}>
                <Phone className="w-4 h-4" />
                Call
              </a>
              <a href={`https://wa.me/${c.phone!.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={contactBtn}>
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                WhatsApp
              </a>
            </>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} className={contactBtn}>
              <Mail className="w-4 h-4" />
              Email
            </a>
          )}
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            className={saved ? `${contactBtn} border-blue-200 bg-blue-50 text-blue-700` : contactBtn}
          >
            {saved ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save Contact'}
          </button>
        </div>
      )}
    </li>
  );
};

export const KeyContacts: React.FC<KeyContactsProps> = ({ supplier: s, initiallyExpanded, isSaved, onToggleSave, onRequestContact }) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const hidden = s.contacts.length - PRIMARY_CONTACTS;
  const visible = expanded ? s.contacts : s.contacts.slice(0, PRIMARY_CONTACTS);
  return (
    <ProfileCard id="profile-contacts" title="Key Contacts" action={<span className="text-xs text-slate-500">{s.contacts.length} listed</span>}>
      {s.contacts.length === 0 ? (
        <p className="text-sm text-slate-600">
          This supplier has not listed individual contacts yet.
          {s.generalEmail && (
            <>
              {' '}
              Reach the company at{' '}
              <a href={`mailto:${s.generalEmail}`} className="font-semibold text-blue-700 hover:underline">
                {s.generalEmail}
              </a>
              .
            </>
          )}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 -my-1">
          {visible.map((c) => (
            <ContactRow key={c.id} contact={c} saved={isSaved(c)} onToggleSave={() => onToggleSave(c)} onRequestContact={onRequestContact} />
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 min-h-10 rounded-lg border border-dashed border-slate-300 text-sm font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          {expanded ? 'Show Fewer Contacts' : `View All Contacts (${s.contacts.length})`}
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Saved contacts appear in My Network.
        {visible.some((c) => c.visibility === 'network') && ' Some phone numbers are shared with connections only.'}
      </p>
    </ProfileCard>
  );
};

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 py-2.5">
    <dt className="text-sm text-slate-600">{label}</dt>
    <dd className="text-sm font-semibold text-slate-900 text-right">{children}</dd>
  </div>
);

const documentsLabel = (s: BuyerSupplier, vault: BuyerVault | null) => {
  if (vault) {
    return vault.documents.length ? `${vault.documents.length} Documents Available` : <span className="text-slate-500">None shared yet</span>;
  }
  if (s.tradeLicense.status === 'verified') return 'Trade License Verified';
  if (s.tradeLicense.status === 'expired') return <span className="text-red-700">Trade License Expired</span>;
  if (s.tradeLicense.status === 'pending') return <span className="text-amber-700">Trade License Under Review</span>;
  return <span className="text-slate-500">Not Submitted</span>;
};

export const SokoInformation: React.FC<{ supplier: BuyerSupplier; vault: BuyerVault | null }> = ({ supplier: s, vault }) => (
  <ProfileCard id="profile-soko-info" title="SOKO Information">
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <SupplierStatusBadge status={s.status} size="md" />
      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{STATUS_META[s.status].description}</p>
    </div>
    <dl className="mt-2 divide-y divide-slate-100">
      <InfoRow label="Profile Completeness">{s.profileCompletenessPct}%</InfoRow>
      <InfoRow label="Documents">{documentsLabel(s, vault)}</InfoRow>
      <InfoRow label="Last Updated">{freshnessLabel(s.updatedDaysAgo).replace('Updated ', '')}</InfoRow>
    </dl>
    <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
      Verification reflects SOKO's document review only. Subscription plans never affect verification or how suppliers are ranked.
    </p>
  </ProfileCard>
);

export const SimilarSuppliers: React.FC<{ supplier: BuyerSupplier; onOpenSupplier: (id: string) => void }> = ({ supplier, onOpenSupplier }) => {
  const similar = similarSuppliers(supplier);
  if (!similar.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-slate-900">Similar Suppliers</h2>
      <p className="text-xs text-slate-500">Based on category, capabilities, brands and location.</p>
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {similar.map((sim) => (
          <li key={sim.id}>
            <button
              type="button"
              onClick={() => onOpenSupplier(sim.id)}
              className="w-full flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3 text-left hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
            >
              <SupplierLogo supplier={sim} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 truncate">{sim.name}</span>
                <span className="block text-xs text-slate-500 truncate">
                  {supplierLocation(sim)} · {sim.categories[0]}
                </span>
              </span>
              <SupplierStatusBadge status={sim.status} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
