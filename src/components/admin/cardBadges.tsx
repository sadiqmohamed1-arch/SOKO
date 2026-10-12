import React from 'react';
import { Globe2, Users, Mail, Phone, Linkedin, QrCode, Save, BadgeCheck } from 'lucide-react';
import {
  type AdminCard,
  type CardStatus,
  type CardVisibility,
  type ReportStatus,
  CARD_STATUS_CLASSES,
  CARD_STATUS_LABELS,
  REPORT_STATUS_CLASSES,
  REPORT_STATUS_LABELS,
  VISIBILITY_LABELS,
  cardInitials,
} from './cardShared';

export const CardStatusBadge: React.FC<{ status: CardStatus }> = ({ status }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CARD_STATUS_CLASSES[status]}`}>
    {CARD_STATUS_LABELS[status]}
  </span>
);

export const VisibilityBadge: React.FC<{ visibility: CardVisibility }> = ({ visibility }) => {
  const Icon = visibility === 'public' ? Globe2 : Users;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        visibility === 'public' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {VISIBILITY_LABELS[visibility]}
    </span>
  );
};

export const ReportStatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${REPORT_STATUS_CLASSES[status]}`}>
    {REPORT_STATUS_LABELS[status]}
  </span>
);

export const CardAvatar: React.FC<{ name: string; size?: 'sm' | 'lg' }> = ({ name, size = 'sm' }) => (
  <span
    aria-hidden="true"
    className={`flex shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700 ${
      size === 'lg' ? 'h-14 w-14 text-base' : 'h-9 w-9 text-xs'
    }`}
  >
    {cardInitials(name)}
  </span>
);

/** Decorative stand-in until card QR generation exists. It encodes nothing. */
const QR_PATTERN = [
  '1111111010111111',
  '1000001001100001',
  '1011101011101101',
  '1011101000101101',
  '1000001010100001',
  '1111111010111111',
  '0000000011000000',
  '1101011100110110',
  '0110100111001011',
  '0000000010110100',
  '1111111001011010',
  '1000001011100110',
  '1011101000111011',
  '1000001010010101',
  '1111111011101100',
];

const QrPlaceholder: React.FC = () => (
  <div className="relative flex flex-col items-center gap-1.5">
    <div className="grid gap-px rounded-md bg-white p-1.5 opacity-30" aria-hidden="true" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
      {QR_PATTERN.join('').split('').map((bit, i) => (
        <span key={i} className={`h-1.5 w-1.5 ${bit === '1' ? 'bg-slate-900' : 'bg-white'}`} />
      ))}
    </div>
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
        <QrCode className="h-2.5 w-2.5" aria-hidden="true" />
        Placeholder
      </span>
    </span>
  </div>
);

/** A visual business card. Contact actions are presentational and never dial, email or download anything. */
export const DigitalCardPreview: React.FC<{ card: AdminCard; isDemo: boolean }> = ({ card, isDemo }) => {
  const company = card.companyName || card.companyLabel;
  const actions = [
    { label: 'Email', icon: Mail, value: card.email },
    { label: 'Call', icon: Phone, value: card.phone },
    { label: 'LinkedIn', icon: Linkedin, value: card.linkedinUrl },
    { label: 'Save contact', icon: Save, value: 'save' },
  ];
  return (
    <figure className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-3 bg-slate-900 px-5 pb-10 pt-5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-xs font-black tracking-tight text-slate-900"
          >
            {company ? cardInitials(company) : 'S'}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-semibold text-white">{company || 'No company listed'}</span>
            <span className="font-mono text-[10px] text-slate-400">{card.sokoId || 'SOKO ID unavailable'}</span>
          </span>
        </div>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-300">
          SOKO Card
        </span>
      </div>
      <div className="-mt-7 flex items-end justify-between gap-3 px-5">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-blue-600 text-lg font-bold text-white shadow-sm"
        >
          {cardInitials(card.displayName)}
        </span>
        {card.status === 'active' && (
          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Active card
          </span>
        )}
      </div>
      <figcaption className="flex items-end justify-between gap-4 px-5 pb-4 pt-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-bold text-slate-900">{card.displayName}</span>
          <span className="truncate text-xs text-slate-600">{card.title || 'No designation'}</span>
          {card.bio && <span className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{card.bio}</span>}
        </div>
        <QrPlaceholder />
      </figcaption>
      <div className="grid grid-cols-4 border-t border-slate-100">
        {actions.map((a) => {
          const Icon = a.icon;
          const missing = !a.value;
          return (
            <span
              key={a.label}
              className={`flex flex-col items-center gap-1 border-r border-slate-100 py-3 text-[10px] font-semibold last:border-r-0 ${
                missing ? 'text-slate-300' : 'text-slate-700'
              }`}
              title={missing ? `${a.label} not provided` : `${a.label} (preview only)`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {a.label}
            </span>
          );
        })}
      </div>
      <p className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-center text-[10px] text-slate-500">
        {isDemo ? 'Demo card' : 'Live card'} {'\u00b7'} Preview only. Contact actions are not interactive.
      </p>
    </figure>
  );
};
