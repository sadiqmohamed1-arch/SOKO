import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, Share2, Check, BookmarkPlus, ShieldCheck } from 'lucide-react';
import { CommunityContact } from '../types';
import { getContactProducts } from './BuyerSokoCard';

const LABEL_STYLES = [
  'bg-amber-50 text-amber-800 border-amber-200',
  'bg-blue-50 text-blue-800 border-blue-200',
  'bg-slate-100 text-slate-700 border-slate-200',
  'bg-orange-50 text-orange-800 border-orange-200',
  'bg-emerald-50 text-emerald-800 border-emerald-200',
  'bg-teal-50 text-teal-800 border-teal-200',
  'bg-rose-50 text-rose-800 border-rose-200',
];

const hashOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const poNumber = (c: CommunityContact) => `PO ${String((hashOf(c.id + c.company) % 90000) + 10000)}`;

const initials = (company: string) =>
  company
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const LOGO_STYLES = ['bg-slate-900 text-white', 'bg-blue-900 text-blue-100', 'bg-emerald-900 text-emerald-200', 'bg-amber-900 text-amber-100', 'bg-slate-700 text-amber-300'];

interface MyNetworkTableProps {
  contacts: CommunityContact[];
  counterpartLabel: string;
  primaryActionLabel: string;
  isSaved: (c: CommunityContact) => boolean;
  onToggleSave: (c: CommunityContact) => void;
  onShare: (c: CommunityContact) => void;
  onPrimaryAction: (c: CommunityContact) => void;
}

const LabelsCell: React.FC<{ contact: CommunityContact }> = ({ contact }) => {
  const [expanded, setExpanded] = useState(false);
  const labels = Array.from(new Set([...getContactProducts(contact), ...contact.tags]));
  const visible = expanded ? labels : labels.slice(0, 4);
  const hidden = labels.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((l, i) => (
        <span key={l} className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${LABEL_STYLES[(hashOf(l) + i) % LABEL_STYLES.length]}`}>
          {l}
        </span>
      ))}
      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
        >
          +{hidden} more
        </button>
      )}
    </div>
  );
};

export const MyNetworkTable: React.FC<MyNetworkTableProps> = ({
  contacts,
  counterpartLabel,
  primaryActionLabel,
  isSaved,
  onToggleSave,
  onShare,
  onPrimaryAction,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">{counterpartLabel} & Badge</th>
            <th className="px-4 py-3">Representative & Role</th>
            <th className="px-4 py-3">Direct Contact Channels</th>
            <th className="px-4 py-3">Materials & Scope Labels</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {contacts.map((c) => {
            const saved = isSaved(c);
            const wa = (c.whatsappNumber || c.phone).replace(/[^0-9]/g, '');
            return (
              <tr key={c.id} className="align-top hover:bg-slate-50/70 transition-colors group">
                <td className="px-4 py-4 max-w-[220px]">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-extrabold tracking-tight shrink-0 shadow-2xs ${LOGO_STYLES[hashOf(c.company) % LOGO_STYLES.length]}`}>
                      {initials(c.company) || 'SK'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-slate-900 truncate" title={c.company}>{c.company}</p>
                        {c.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{poNumber(c)} {c.location}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="relative px-3 py-1.5 max-w-[200px] before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:border-l before:border-y before:border-slate-400 after:absolute after:inset-y-0 after:right-0 after:w-1.5 after:border-r after:border-y after:border-slate-400">
                    <p className="text-xs font-extrabold uppercase text-slate-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={c.title}>{c.title}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1.5 text-[11px] font-mono text-slate-700 max-w-[170px]">
                    <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:text-blue-700 transition-colors">
                      <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0"><Phone className="w-2.5 h-2.5" /></span>
                      <span className="truncate">{c.phone}</span>
                    </a>
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-emerald-700 transition-colors">
                      <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0"><MessageCircle className="w-2.5 h-2.5" /></span>
                      <span className="truncate">+{wa}</span>
                    </a>
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:text-blue-700 transition-colors">
                      <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0"><Mail className="w-2.5 h-2.5" /></span>
                      <span className="truncate">{c.email}</span>
                    </a>
                  </div>
                </td>
                <td className="px-4 py-4 max-w-[300px]">
                  <LabelsCell contact={c} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onShare(c)}
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Share SOKO card"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onPrimaryAction(c)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-[11px] font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700 bg-white transition-colors cursor-pointer"
                    >
                      {primaryActionLabel}
                    </button>
                    <button
                      onClick={() => onToggleSave(c)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                        saved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-900 text-white hover:bg-blue-700 shadow-2xs'
                      }`}
                      title={saved ? 'Saved in My Network. Click to remove.' : 'Save to My Network'}
                    >
                      {saved ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                      {saved ? 'Saved' : 'Save contact'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
