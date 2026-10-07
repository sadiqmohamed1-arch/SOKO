import React, { useEffect } from 'react';
import { Lock, Mail, MessageCircle, Phone, User, X } from 'lucide-react';
import { BuyerSupplier, SupplierContact } from '../data/buyerSuppliers';

const actionCls =
  'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer';

export const ContactActions: React.FC<{
  contact: SupplierContact;
  onViewContact: () => void;
  onRequestContact: () => void;
  children?: React.ReactNode;
}> = ({ contact, onViewContact, onRequestContact, children }) => {
  if (contact.visibility === 'on-request') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
          <Lock className="w-3 h-3" />
          Contact details shared on request
        </span>
        <button type="button" onClick={onRequestContact} className={actionCls}>
          <MessageCircle className="w-3.5 h-3.5" />
          Request Contact
        </button>
        {children}
      </div>
    );
  }
  const showPhone = contact.visibility === 'public' && contact.phone;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showPhone && (
        <>
          <a href={`tel:${contact.phone}`} className={actionCls}>
            <Phone className="w-3.5 h-3.5" />
            Call
          </a>
          <a
            href={`https://wa.me/${contact.phone!.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className={actionCls}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        </>
      )}
      {contact.email && (
        <a href={`mailto:${contact.email}`} className={actionCls}>
          <Mail className="w-3.5 h-3.5" />
          Email
        </a>
      )}
      <button type="button" onClick={onViewContact} className={actionCls}>
        <User className="w-3.5 h-3.5" />
        View Contact
      </button>
      {children}
      {contact.visibility === 'network' && (
        <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Phone shared with connections only
        </span>
      )}
    </div>
  );
};

interface ContactSupplierModalProps {
  supplier: BuyerSupplier;
  onClose: () => void;
  onViewContact: () => void;
  onRequestContact: () => void;
  onViewAllContacts: () => void;
}

export const ContactSupplierModal: React.FC<ContactSupplierModalProps> = ({
  supplier,
  onClose,
  onViewContact,
  onRequestContact,
  onViewAllContacts,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="contact-supplier-title">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/40 cursor-default" />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 id="contact-supplier-title" className="text-base font-semibold text-slate-900">
            Contact {supplier.name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="overflow-y-auto divide-y divide-slate-100">
          {supplier.contacts.map((c) => (
            <li key={c.id} className="px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">{c.name}</p>
              <p className="text-xs text-slate-500 mb-2.5">
                {c.title} · {c.location}
              </p>
              <ContactActions contact={c} onViewContact={onViewContact} onRequestContact={onRequestContact} />
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[11px] text-slate-400">Calls and messages open in your device's apps.</p>
          <button type="button" onClick={onViewAllContacts} className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
            View All Contacts
          </button>
        </div>
      </div>
    </div>
  );
};
