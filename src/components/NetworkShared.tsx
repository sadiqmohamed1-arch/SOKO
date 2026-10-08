import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Globe, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { CommunityContact } from '../types';
import { CardView, ConnectionAction, canSeeDetails, cardShareUrl, initialsOf, whatsappHref } from '../data/myNetwork';
import { ProfileDialog } from './ProfileDialog';

export interface NetworkHandlers {
  onOpen: (c: CommunityContact) => void;
  onToggleSave: (c: CommunityContact) => void;
  onToggleFavorite: (c: CommunityContact) => void;
  onShare: (c: CommunityContact) => void;
  onContacted: (c: CommunityContact) => void;
  onConnection: (c: CommunityContact, action: ConnectionAction) => void;
  onMessage: (c: CommunityContact) => void;
  onOpenCompany: (supplierId: string) => void;
}

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-semibold transition-colors cursor-pointer';
export const iconBtn =
  'inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-600 disabled:hover:border-slate-200';
export const inputCls =
  'w-full min-h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
export const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

const AVATAR_SIZES = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-16 h-16 text-lg' };

export const ContactAvatar: React.FC<{ name: string; url?: string; size?: keyof typeof AVATAR_SIZES }> = ({ name, url, size = 'md' }) =>
  url ? (
    <img src={url} alt="" className={`${AVATAR_SIZES[size]} rounded-full object-cover shrink-0 border border-slate-200`} />
  ) : (
    <span className={`${AVATAR_SIZES[size]} rounded-full shrink-0 bg-slate-800 text-white font-semibold flex items-center justify-center`}>{initialsOf(name)}</span>
  );

export const VerifiedCompanyBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
    <ShieldCheck className="w-3 h-3" />
    SOKO Verified
  </span>
);

export const StatusPill: React.FC<{ tone: 'blue' | 'slate' | 'amber' | 'gold'; children: React.ReactNode }> = ({ tone, children }) => {
  const cls = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    gold: 'bg-gold-50 text-gold-900 border-gold-200',
  }[tone];
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${cls}`}>{children}</span>;
};

export const relationshipStatus = (c: CommunityContact) => {
  if (c.connectionStatus === 'connected') return { label: 'Connected', tone: 'blue' as const };
  if (c.connectionStatus === 'pending') return { label: 'Request sent', tone: 'amber' as const };
  if (c.connectionStatus === 'incoming') return { label: 'Wants to connect', tone: 'amber' as const };
  if (c.isMaintained) return { label: 'Saved contact', tone: 'slate' as const };
  return { label: 'SOKO member', tone: 'slate' as const };
};

/** Call / WhatsApp / Email, only for details the person shared with me. */
export const ContactQuickActions: React.FC<{ contact: CommunityContact; onContacted: (c: CommunityContact) => void; size?: 'icon' | 'full' }> = ({
  contact: c,
  onContacted,
  size = 'icon',
}) => {
  const details = canSeeDetails(c);
  const phone = details ? c.phone : '';
  const wa = details ? c.whatsappNumber || '' : '';
  const email = details ? c.email : '';
  const items = [
    { label: 'Call', icon: Phone, href: phone ? `tel:${phone.replace(/\s/g, '')}` : '', cls: 'text-slate-700' },
    { label: 'WhatsApp', icon: MessageCircle, href: wa ? whatsappHref(wa) : '', cls: 'text-emerald-600' },
    { label: 'Email', icon: Mail, href: email ? `mailto:${email}` : '', cls: 'text-blue-700' },
  ];
  const hidden = details ? 'Not provided' : 'Shared only with connections';
  return (
    <div className={size === 'full' ? 'grid grid-cols-3 gap-2' : 'flex items-center gap-1.5'}>
      {items.map(({ label, icon: Icon, href, cls }) =>
        href ? (
          <a
            key={label}
            href={href}
            target={label === 'WhatsApp' ? '_blank' : undefined}
            rel={label === 'WhatsApp' ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onContacted(c);
            }}
            aria-label={`${label} ${c.name}`}
            title={label}
            className={size === 'full' ? `${btnSecondary} w-full` : iconBtn}
          >
            <Icon className={`w-4 h-4 ${cls}`} />
            {size === 'full' && label}
          </a>
        ) : (
          <button key={label} type="button" disabled title={`${label}: ${hidden}`} aria-label={`${label} unavailable — ${hidden}`} className={size === 'full' ? `${btnSecondary} w-full` : iconBtn}>
            <Icon className="w-4 h-4" />
            {size === 'full' && label}
          </button>
        )
      )}
    </div>
  );
};

/** Premium SOKO professional card. Only renders the fields it is given. */
export const ProfessionalCard: React.FC<{ card: CardView; showQr?: boolean; onQrClick?: () => void }> = ({ card, showQr = true, onQrClick }) => {
  const rows = [
    { icon: Phone, value: card.mobile, label: 'Mobile' },
    { icon: MessageCircle, value: card.whatsapp, label: 'WhatsApp' },
    { icon: Phone, value: card.officePhone, label: 'Office' },
    { icon: Mail, value: card.email, label: 'Email' },
    { icon: Globe, value: card.website?.replace(/^https?:\/\//, ''), label: 'Website' },
  ].filter((r) => r.value);
  return (
    <article aria-label={`${card.name} business card`} className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg">
      <div className="absolute inset-0 blueprint-grid-dark opacity-50 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gold-500" />
      <div className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-gold-500">SOKO</span>
          {card.sokoId && <span className="font-mono text-xs text-slate-300">{card.sokoId}</span>}
        </div>
        <div className="mt-4 flex items-start gap-4">
          <ContactAvatar name={card.name} url={card.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-tight break-words">{card.name}</h3>
            <p className="mt-1 text-sm text-slate-300 leading-snug">{card.title}</p>
            <p className="text-sm font-semibold text-gold-500 leading-snug">{card.company}</p>
            {card.location && (
              <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {card.location}
              </p>
            )}
          </div>
        </div>
        {card.specialization && <p className="mt-3 text-xs text-slate-300 leading-relaxed border-l-2 border-gold-500/60 pl-2">{card.specialization}</p>}
        <div className="mt-4 flex items-end justify-between gap-4">
          <ul className="space-y-1.5 min-w-0 text-xs text-slate-200">
            {rows.map(({ icon: Icon, value, label }) => (
              <li key={label} className="flex items-center gap-2 min-w-0">
                <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="sr-only">{label}:</span>
                <span className="truncate">{value}</span>
              </li>
            ))}
            {!rows.length && <li className="text-slate-400">Contact details shared on request</li>}
          </ul>
          {showQr && card.sokoId && (
            <button
              type="button"
              onClick={onQrClick}
              disabled={!onQrClick}
              aria-label="Show card QR code"
              className="shrink-0 rounded-lg bg-white p-1.5 transition-transform enabled:hover:scale-[1.03] enabled:cursor-pointer"
            >
              <QRCodeSVG value={cardShareUrl(card.sokoId)} size={76} level="M" marginSize={1} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export const ConfirmDialog: React.FC<{ title: string; message: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }> = ({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}) => (
  <ProfileDialog
    title={title}
    onClose={onClose}
    footer={
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="inline-flex items-center justify-center min-h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold cursor-pointer"
        >
          {confirmLabel}
        </button>
      </div>
    }
  >
    <p className="px-5 py-4 text-sm text-slate-600 leading-relaxed">{message}</p>
  </ProfileDialog>
);

export const Toast: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm shadow-lg animate-[fadeIn_0.2s_ease-out]">
      {message}
    </div>
  ) : null;
