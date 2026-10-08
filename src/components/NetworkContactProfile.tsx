import React, { useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, Building2, Check, Lock, MapPin, MessageSquare, Pencil, Share2, Star, Trash2, UserPlus, X } from 'lucide-react';
import { CommunityContact } from '../types';
import { RELATIONSHIP_TYPES, canSeeDetails, companyFor, lastContactedLabel, personalSokoId, relationshipOf, relativeDate, whatsappHref } from '../data/myNetwork';
import { supplierLocation, supplierTypeLine } from '../data/buyerSuppliers';
import { ContactAvatar, ContactQuickActions, NetworkHandlers, StatusPill, VerifiedCompanyBadge, btnPrimary, btnSecondary, inputCls, relationshipStatus } from './NetworkShared';

interface ContactProfileProps {
  contact: CommunityContact;
  handlers: NetworkHandlers;
  onBack: () => void;
  onEdit: () => void;
  onUpdate: (patch: Partial<CommunityContact>, message: string) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ title, children, aside }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100 last:border-0 text-sm">
    <dt className="text-slate-500">{label}</dt>
    <dd className="text-slate-900 min-w-0 break-words">{children}</dd>
  </div>
);

const Hidden: React.FC<{ text?: string }> = ({ text = 'Shared with connections only' }) => (
  <span className="inline-flex items-center gap-1 text-slate-400">
    <Lock className="w-3 h-3" />
    {text}
  </span>
);

export const NetworkContactProfile: React.FC<ContactProfileProps> = ({ contact: c, handlers: h, onBack, onEdit, onUpdate }) => {
  const [notes, setNotes] = useState(c.notes ?? '');
  const company = companyFor(c);
  const status = relationshipStatus(c);
  const details = canSeeDetails(c);
  const sokoId = personalSokoId(c);
  const notesDirty = notes !== (c.notes ?? '');
  const linkCls = 'text-blue-700 hover:underline';
  const contacted = () => h.onContacted(c);
  const value = (v: string | undefined, href?: string) => {
    if (!details && v !== undefined) return <Hidden />;
    if (!v) return <span className="text-slate-400">Not provided</span>;
    return href ? (
      <a href={href} onClick={contacted} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={linkCls}>
        {v}
      </a>
    ) : (
      v
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-[fadeIn_0.25s_ease-out]">
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 min-h-10 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        Back to My Network
      </button>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <ContactAvatar name={c.name} url={c.avatarUrl} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900 leading-tight">{c.name}</h1>
                <button
                  type="button"
                  onClick={() => h.onToggleFavorite(c)}
                  disabled={!c.isMaintained}
                  aria-pressed={!!c.favorite}
                  aria-label={c.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  title={c.isMaintained ? undefined : 'Save the contact to add favorites'}
                  className="p-1 rounded-md text-slate-400 hover:text-gold-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Star className={`w-5 h-5 ${c.favorite ? 'fill-gold-500 text-gold-500' : ''}`} />
                </button>
              </div>
              <p className="mt-0.5 text-sm text-slate-700">{c.title}</p>
              <p className="text-sm font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                {c.company}
                {company?.status === 'verified' && <VerifiedCompanyBadge />}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {c.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {c.location}
                  </span>
                )}
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                {sokoId ? <span className="font-mono text-slate-600">{sokoId}</span> : <StatusPill tone="slate">Private contact</StatusPill>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:w-72 shrink-0">
            <ContactQuickActions contact={c} onContacted={h.onContacted} size="full" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => h.onToggleSave(c)} className={c.isMaintained ? btnSecondary : btnPrimary}>
                {c.isMaintained ? <BookmarkCheck className="w-4 h-4 text-blue-700" /> : <Bookmark className="w-4 h-4" />}
                {c.isMaintained ? 'Saved' : 'Save Contact'}
              </button>
              <button type="button" onClick={() => h.onShare(c)} className={btnSecondary}>
                <Share2 className="w-4 h-4" />
                Share
              </button>
              {c.connectionStatus === 'connected' && (
                <button type="button" onClick={() => h.onMessage(c)} className={btnSecondary}>
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              )}
              {sokoId && (c.connectionStatus ?? 'not_connected') === 'not_connected' && (
                <button type="button" onClick={() => h.onConnection(c, 'connect')} className={btnSecondary}>
                  <UserPlus className="w-4 h-4" />
                  Connect
                </button>
              )}
              {c.connectionStatus === 'incoming' && (
                <>
                  <button type="button" onClick={() => h.onConnection(c, 'accept')} className={btnPrimary}>
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                  <button type="button" onClick={() => h.onConnection(c, 'decline')} className={btnSecondary}>
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                </>
              )}
              {c.isMaintained && (
                <button type="button" onClick={onEdit} className={btnSecondary}>
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        <Section title="Contact Information">
          <dl>
            <Row label="Mobile">{value(c.phone, c.phone ? `tel:${c.phone.replace(/\s/g, '')}` : undefined)}</Row>
            <Row label="Office Phone">{value(c.officePhone ?? '', c.officePhone ? `tel:${c.officePhone.replace(/\s/g, '')}` : undefined)}</Row>
            <Row label="WhatsApp">{value(c.whatsappNumber, c.whatsappNumber ? whatsappHref(c.whatsappNumber) : undefined)}</Row>
            <Row label="Email">{value(c.email, c.email ? `mailto:${c.email}` : undefined)}</Row>
            <Row label="Website">
              {c.website ? (
                <a href={c.website} target="_blank" rel="noopener noreferrer" className={linkCls}>
                  {c.website.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </Row>
            <Row label="Location">{c.location || <span className="text-slate-400">Not provided</span>}</Row>
          </dl>
        </Section>

        <Section title="Professional Information">
          <dl>
            <Row label="Designation">{c.title || '—'}</Row>
            <Row label="Company">{c.company || '—'}</Row>
            <Row label="Trade Category">{c.category || '—'}</Row>
            <Row label="Specialization">{c.specialization ?? (c.products?.length ? c.products.join(', ') : '—')}</Row>
          </dl>
        </Section>

        <Section title="Company Connection">
          {company ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                  <p className="text-xs text-slate-500">{supplierTypeLine(company)}</p>
                  <p className="text-xs text-slate-500">
                    {company.categories.join(' · ')} · {supplierLocation(company)}
                  </p>
                </div>
                {company.status === 'verified' && <VerifiedCompanyBadge />}
              </div>
              <button type="button" onClick={() => h.onOpenCompany(company.id)} className={`${btnSecondary} w-full`}>
                <Building2 className="w-4 h-4" />
                View Company / Supplier Profile
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{c.company ? `${c.company} doesn't have a SOKO company profile yet.` : 'No company added.'}</p>
          )}
        </Section>

        <Section title="My Relationship" aside={<span className="text-[11px] text-slate-400 inline-flex items-center gap-1"><Lock className="w-3 h-3" />Private to you</span>}>
          {c.isMaintained ? (
            <dl>
              <Row label="Date Added">{c.dateAdded ? relativeDate(c.dateAdded) : '—'}</Row>
              <Row label="Relationship">
                <select
                  value={relationshipOf(c)}
                  onChange={(e) => onUpdate({ relationshipType: e.target.value }, 'Relationship type updated')}
                  aria-label="Relationship type"
                  className={`${inputCls} !min-h-9`}
                >
                  {RELATIONSHIP_TYPES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Row>
              <Row label="Favorite">{c.favorite ? 'Yes' : 'No'}</Row>
              <Row label="Last Contacted">{lastContactedLabel(c) || '—'}</Row>
              <div className="pt-3">
                <label htmlFor="contact-notes" className="block text-xs font-semibold text-slate-600 mb-1">
                  Personal Notes
                </label>
                <textarea id="contact-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only you can see these notes" className={`${inputCls} py-2`} />
                {notesDirty && (
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setNotes(c.notes ?? '')} className={`${btnSecondary} !min-h-9`}>
                      Cancel
                    </button>
                    <button type="button" onClick={() => onUpdate({ notes }, 'Notes saved')} className={`${btnPrimary} !min-h-9`}>
                      Save Notes
                    </button>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => h.onToggleSave(c)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
                Remove from My Contacts
              </button>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Save this contact to add private notes, mark as favorite and track when you last spoke.</p>
          )}
        </Section>
      </div>
    </div>
  );
};
