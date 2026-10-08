import React, { useMemo, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Link2, X } from 'lucide-react';
import { CommunityContact } from '../types';
import { ContactDraft, RELATIONSHIP_TYPES, canSeeDetails, draftToContact, findDuplicate, relationshipOf, saveContact, supplierById, updateContact } from '../data/myNetwork';
import { BUYER_SUPPLIERS } from '../data/buyerSuppliers';
import { ProfileDialog } from './ProfileDialog';
import { btnPrimary, btnSecondary, inputCls, labelCls } from './NetworkShared';

interface ContactFormProps {
  contacts: CommunityContact[];
  editing?: CommunityContact;
  onClose: () => void;
  onSubmit: (next: CommunityContact[], message: string, openId?: string) => void;
  onViewExisting: (c: CommunityContact) => void;
}

const toDraft = (c?: CommunityContact): ContactDraft => ({
  name: c?.name ?? '',
  title: c?.title ?? '',
  company: c?.company ?? '',
  companyId: c?.companyId,
  phone: c?.phone ?? '',
  whatsappNumber: c?.whatsappNumber ?? '',
  email: c?.email ?? '',
  location: c?.location ?? '',
  category: c?.category ?? '',
  notes: c?.notes ?? '',
});

const mergeNotes = (existing: string | undefined, added: string) => [existing?.trim(), added.trim()].filter(Boolean).join('\n');

export const NetworkContactForm: React.FC<ContactFormProps> = ({ contacts, editing, onClose, onSubmit, onViewExisting }) => {
  const [d, setD] = useState<ContactDraft>(() => toDraft(editing));
  const [relationship, setRelationship] = useState(editing ? relationshipOf(editing) : 'Supplier Representative');
  const [companyFocus, setCompanyFocus] = useState(false);
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof ContactDraft>(k: K, v: ContactDraft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const linked = supplierById(d.companyId);
  const editingMember = editing && editing.source !== 'manual' && editing.source !== 'import';
  const showDetails = !editing || canSeeDetails(editing);

  const companyMatches = useMemo(() => {
    const q = d.company.trim().toLowerCase();
    if (!q || linked) return [];
    return BUYER_SUPPLIERS.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 5);
  }, [d.company, linked]);

  const duplicate = d.name.trim() ? findDuplicate(contacts, d, editing?.id) : undefined;
  const hasMethod = !!(d.phone.trim() || d.whatsappNumber.trim() || d.email.trim() || editingMember);
  const errors = {
    name: !d.name.trim() ? 'Full name is required' : '',
    method: !hasMethod ? 'Add at least one contact method: mobile, WhatsApp or email' : '',
    email: d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()) ? 'Enter a valid email address' : '',
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = () => {
    setTouched(true);
    if (invalid || (duplicate && !editing)) return;
    if (editing) {
      const company = supplierById(d.companyId);
      const employerChanged = editing.company.trim() !== (company?.name ?? d.company.trim());
      onSubmit(
        updateContact(contacts, editing.id, {
          name: d.name.trim(),
          title: d.title.trim(),
          company: company?.name ?? d.company.trim(),
          companyId: company?.id,
          phone: d.phone.trim(),
          whatsappNumber: d.whatsappNumber.trim(),
          email: d.email.trim(),
          location: d.location.trim(),
          category: d.category.trim(),
          notes: d.notes,
          relationshipType: relationship,
        }),
        employerChanged ? 'Employer updated — your notes and relationship details are kept' : 'Contact updated',
        editing.id
      );
      return;
    }
    const record = { ...draftToContact(d, 'manual'), relationshipType: relationship };
    onSubmit([record, ...contacts], `${record.name} added to My Contacts`, record.id);
  };

  const updateExisting = (dup: CommunityContact) => {
    const fill = (current: string | undefined, next: string) => (current?.trim() ? current : next.trim());
    const patch: Partial<CommunityContact> = { notes: mergeNotes(dup.notes, d.notes) };
    if (dup.source === 'manual' || dup.source === 'import') {
      Object.assign(patch, {
        title: fill(dup.title, d.title),
        phone: fill(dup.phone, d.phone),
        whatsappNumber: fill(dup.whatsappNumber, d.whatsappNumber),
        email: fill(dup.email, d.email),
        location: fill(dup.location, d.location),
      });
    }
    const base = dup.isMaintained ? contacts : saveContact(contacts, dup);
    onSubmit(updateContact(base, dup.id, patch), dup.isMaintained ? `${dup.name} updated` : `${dup.name}'s SOKO profile saved to My Contacts`, dup.id);
  };

  const field = (k: 'title' | 'phone' | 'whatsappNumber' | 'email' | 'location' | 'category', label: string, placeholder: string, type = 'text') => (
    <div>
      <label htmlFor={`nc-${k}`} className={labelCls}>
        {label}
      </label>
      <input id={`nc-${k}`} type={type} value={d[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className={inputCls} />
      {k === 'email' && touched && errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
    </div>
  );

  return (
    <ProfileDialog
      title={editing ? 'Edit Contact' : 'Add Contact'}
      subtitle="Private to you. No trade license or verification needed."
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!!duplicate && !editing} className={btnPrimary}>
            {editing ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      }
    >
      <div className="px-5 py-4 space-y-4">
        {duplicate && !editing && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 animate-[fadeIn_0.2s_ease-out]">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              {duplicate.isMaintained ? 'This person is already in My Contacts' : 'A matching SOKO profile was found'}
            </p>
            <p className="mt-0.5 text-xs text-amber-900/80">
              {duplicate.name} · {duplicate.title} · {duplicate.company}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => onViewExisting(duplicate)} className={`${btnSecondary} !min-h-9`}>
                View Contact
              </button>
              <button type="button" onClick={() => updateExisting(duplicate)} className={`${btnPrimary} !min-h-9`}>
                <Link2 className="w-4 h-4" />
                {duplicate.isMaintained ? 'Update Existing' : 'Save & Link SOKO Profile'}
              </button>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="nc-name" className={labelCls}>
            Full Name <span className="text-red-600">*</span>
          </label>
          <input id="nc-name" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ahmed Khan" className={inputCls} autoFocus />
          {touched && errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {field('title', 'Designation', 'e.g. Commercial Manager')}
          <div className="relative">
            <label htmlFor="nc-company" className={labelCls}>
              Company
            </label>
            <input
              id="nc-company"
              value={d.company}
              onChange={(e) => setD((prev) => ({ ...prev, company: e.target.value, companyId: undefined }))}
              onFocus={() => setCompanyFocus(true)}
              onBlur={() => window.setTimeout(() => setCompanyFocus(false), 150)}
              placeholder="Type or select a SOKO company"
              className={inputCls}
              autoComplete="off"
            />
            {linked && (
              <p className="mt-1 text-xs text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Linked to SOKO company profile
                <button type="button" aria-label="Unlink company" onClick={() => set('companyId', undefined)} className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </p>
            )}
            {companyFocus && companyMatches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                {companyMatches.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setD((prev) => ({ ...prev, company: s.name, companyId: s.id, category: prev.category || s.categories[0] }));
                        setCompanyFocus(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{s.name}</span>
                        <span className="block text-xs text-slate-500 truncate">SOKO company · {s.categories[0]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {showDetails ? (
            <>
              {field('phone', 'Mobile', '+971 50 000 0000', 'tel')}
              {field('whatsappNumber', 'WhatsApp', '+971 50 000 0000', 'tel')}
              {field('email', 'Email', 'name@company.com', 'email')}
            </>
          ) : (
            <p className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
              Phone and email come from their SOKO profile and appear once they share them with you.
            </p>
          )}
          {field('location', 'Location', 'e.g. Dubai, UAE')}
          {field('category', 'Trade Category', 'e.g. Steel & Rebar')}
          <div>
            <label htmlFor="nc-rel" className={labelCls}>
              Relationship Type
            </label>
            <select id="nc-rel" value={relationship} onChange={(e) => setRelationship(e.target.value)} className={inputCls}>
              {RELATIONSHIP_TYPES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        {touched && errors.method && <p className="text-xs text-red-600">{errors.method}</p>}

        <div>
          <label htmlFor="nc-notes" className={labelCls}>
            Personal Notes <span className="font-normal text-slate-400">(private — only you can see these)</span>
          </label>
          <textarea id="nc-notes" rows={3} value={d.notes} onChange={(e) => set('notes', e.target.value)} className={`${inputCls} py-2`} />
        </div>
        {editing && (
          <p className="text-xs text-slate-500">
            Changing the company updates where this person works now. Your notes and relationship stay with the person; company records are never moved.
          </p>
        )}
      </div>
    </ProfileDialog>
  );
};
