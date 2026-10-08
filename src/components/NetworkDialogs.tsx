import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Bookmark, BookmarkCheck, Building2, Copy, Download, Lock, Mail, MessageCircle, QrCode, Search, Share2, UserPlus } from 'lucide-react';
import { CommunityContact } from '../types';
import {
  CardView,
  DEMO_SCAN_ID,
  cardShareUrl,
  companyFor,
  contactCardView,
  parseSokoReference,
  personalSokoId,
} from '../data/myNetwork';
import { BUYER_SUPPLIERS, supplierSokoId } from '../data/buyerSuppliers';
import { downloadVCard } from '../data/networkImport';
import { ProfileDialog } from './ProfileDialog';
import { ProfessionalCard, StatusPill, VerifiedCompanyBadge, btnPrimary, btnSecondary, inputCls, relationshipStatus } from './NetworkShared';

const shareOptionCls =
  'flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer';

const copyText = async (text: string, done: string, onNotify: (m: string) => void) => {
  try {
    await navigator.clipboard.writeText(text);
    onNotify(done);
  } catch {
    onNotify('Could not copy on this device');
  }
};

const canNativeShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

const nativeShare = async (data: ShareData, onNotify: (m: string) => void) => {
  try {
    await navigator.share(data);
  } catch (err) {
    if (!(err instanceof DOMException && err.name === 'AbortError')) onNotify('Sharing is not available on this device');
  }
};

/** Public view of someone else's card: never includes their phone or email. */
export const publicContactCard = (c: CommunityContact): CardView => ({
  ...contactCardView(c),
  mobile: undefined,
  whatsapp: undefined,
  email: undefined,
  officePhone: undefined,
});

export const ShareCardDialog: React.FC<{ card: CardView; title: string; note: string; onClose: () => void; onNotify: (m: string) => void }> = ({
  card,
  title,
  note,
  onClose,
  onNotify,
}) => {
  const url = cardShareUrl(card.sokoId);
  const text = `${card.name} — ${card.title}, ${card.company} (SOKO ${card.sokoId})`;
  const native = canNativeShare();
  return (
    <ProfileDialog title={title} subtitle={note} onClose={onClose}>
      <div className="px-5 py-5">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-2xl border border-slate-200 p-3 bg-white">
            <QRCodeSVG value={url} size={188} level="M" marginSize={2} />
          </div>
          <p className="mt-3 font-mono text-lg font-semibold text-slate-900">{card.sokoId}</p>
          <p className="text-sm text-slate-600">
            {card.name} · {card.company}
          </p>
          <p className="mt-1 text-xs text-slate-500">The QR code holds only the card link — no phone number or email.</p>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-1 py-1">
          <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{url}</span>
          <button type="button" onClick={() => copyText(url, 'Card link copied', onNotify)} className={`${btnPrimary} !min-h-9 !px-3 !text-xs`}>
            <Copy className="w-3.5 h-3.5" />
            Copy Link
          </button>
        </div>

        <div className={`mt-4 grid gap-2 ${native ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer" className={shareOptionCls}>
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            WhatsApp
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`SOKO business card:\n${url}`)}`} className={shareOptionCls}>
            <Mail className="w-5 h-5 text-blue-700" />
            Email
          </a>
          <button
            type="button"
            onClick={() => {
              downloadVCard(card);
              onNotify('Contact file (.vcf) downloaded');
            }}
            className={shareOptionCls}
          >
            <Download className="w-5 h-5 text-slate-700" />
            Save Contact
          </button>
          {native && (
            <button type="button" onClick={() => nativeShare({ title: card.name, text, url }, onNotify)} className={shareOptionCls}>
              <Share2 className="w-5 h-5 text-slate-700" />
              More
            </button>
          )}
        </div>
      </div>
    </ProfileDialog>
  );
};

/** Shares a saved contact without ever exposing their private phone or email. */
export const ShareContactDialog: React.FC<{ contact: CommunityContact; onClose: () => void; onNotify: (m: string) => void }> = ({ contact: c, onClose, onNotify }) => {
  if (personalSokoId(c)) {
    return (
      <ShareCardDialog
        card={publicContactCard(c)}
        title={`Share ${c.name}`}
        note="Shares their SOKO card link. Recipients only see what they chose to make visible."
        onClose={onClose}
        onNotify={onNotify}
      />
    );
  }
  const text = [c.name, c.title, c.company].filter(Boolean).join(' — ');
  const native = canNativeShare();
  return (
    <ProfileDialog title={`Share ${c.name}`} subtitle="Privacy-safe share" onClose={onClose}>
      <div className="px-5 py-5 space-y-4">
        <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Lock className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            {c.name} doesn't have a public SOKO card. Only their name, designation and company are shared — their phone number and email stay private in your contacts.
          </p>
        </div>
        <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800">{text}</p>
        <div className={`grid gap-2 ${native ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <button type="button" onClick={() => copyText(text, 'Copied', onNotify)} className={shareOptionCls}>
            <Copy className="w-5 h-5 text-slate-700" />
            Copy
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={shareOptionCls}>
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            WhatsApp
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(c.name)}&body=${encodeURIComponent(text)}`} className={shareOptionCls}>
            <Mail className="w-5 h-5 text-blue-700" />
            Email
          </a>
          {native && (
            <button type="button" onClick={() => nativeShare({ title: c.name, text }, onNotify)} className={shareOptionCls}>
              <Share2 className="w-5 h-5 text-slate-700" />
              More
            </button>
          )}
        </div>
      </div>
    </ProfileDialog>
  );
};

type ScanResult = { kind: 'contact'; contact: CommunityContact } | { kind: 'me' } | { kind: 'supplier'; supplierId: string; name: string } | { kind: 'none'; message: string };

interface ScanCardDialogProps {
  contacts: CommunityContact[];
  myId: string;
  initialRef?: string;
  onClose: () => void;
  onSave: (c: CommunityContact) => void;
  onConnect: (c: CommunityContact) => void;
  onOpenProfile: (c: CommunityContact) => void;
  onOpenCompany: (supplierId: string) => void;
  onShare: (c: CommunityContact) => void;
  onShowMyCard: () => void;
}

export const ScanCardDialog: React.FC<ScanCardDialogProps> = ({ contacts, myId, initialRef, onClose, onSave, onConnect, onOpenProfile, onOpenCompany, onShare, onShowMyCard }) => {
  const resolve = (input: string): ScanResult => {
    const ref = parseSokoReference(input);
    if (!ref) return { kind: 'none', message: 'Enter a SOKO ID like SK-P-31207 or paste a SOKO card link.' };
    if (ref.kind === 'supplier') {
      const s = BUYER_SUPPLIERS.find((x) => supplierSokoId(x) === ref.id);
      return s ? { kind: 'supplier', supplierId: s.id, name: s.name } : { kind: 'none', message: `No supplier found with ID ${ref.id}.` };
    }
    if (ref.id === myId) return { kind: 'me' };
    const contact = contacts.find((c) => personalSokoId(c) === ref.id);
    return contact ? { kind: 'contact', contact } : { kind: 'none', message: `No SOKO professional found with ID ${ref.id}.` };
  };

  const [input, setInput] = useState(initialRef ?? '');
  const [resultRef, setResultRef] = useState<string | null>(initialRef ?? null);
  const result = resultRef !== null ? resolve(resultRef) : null;
  const live = result?.kind === 'contact' ? contacts.find((c) => c.id === result.contact.id) ?? result.contact : null;

  return (
    <ProfileDialog title="Receive a Business Card" subtitle="Nothing is saved until you choose to." onClose={onClose}>
      <div className="px-5 py-5 space-y-4">
        <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <QrCode className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            In-app camera scanning isn't available in this prototype. Scan the QR with your phone camera, or enter the SOKO ID or card link below.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setResultRef(input);
          }}
          className="flex gap-2"
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="SK-P-31207 or card link" aria-label="SOKO ID or card link" className={inputCls} autoFocus={!initialRef} />
          <button type="submit" className={btnPrimary}>
            <Search className="w-4 h-4" />
            Find
          </button>
        </form>
        {!result && (
          <button type="button" onClick={() => {
              setInput(DEMO_SCAN_ID);
              setResultRef(DEMO_SCAN_ID);
            }} className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">
            Try a demo card: {DEMO_SCAN_ID}
          </button>
        )}

        {result?.kind === 'none' && <p className="text-sm text-red-700">{result.message}</p>}

        {result?.kind === 'me' && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            That's your own SOKO ID.{' '}
            <button type="button" onClick={onShowMyCard} className="font-semibold text-blue-700 hover:underline cursor-pointer">
              View my card
            </button>
          </div>
        )}

        {result?.kind === 'supplier' && (
          <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">SOKO Supplier ID — company profile</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{result.name}</p>
            </div>
            <button type="button" onClick={() => onOpenCompany(result.supplierId)} className={btnSecondary}>
              <Building2 className="w-4 h-4" />
              View Company
            </button>
          </div>
        )}

        {live && <ReceivedCard contact={live} onSave={onSave} onConnect={onConnect} onOpenProfile={onOpenProfile} onOpenCompany={onOpenCompany} onShare={onShare} />}
      </div>
    </ProfileDialog>
  );
};

const ReceivedCard: React.FC<Pick<ScanCardDialogProps, 'onSave' | 'onConnect' | 'onOpenProfile' | 'onOpenCompany' | 'onShare'> & { contact: CommunityContact }> = ({
  contact: c,
  onSave,
  onConnect,
  onOpenProfile,
  onOpenCompany,
  onShare,
}) => {
  const company = companyFor(c);
  const status = relationshipStatus(c);
  const canConnect = (c.connectionStatus ?? 'not_connected') === 'not_connected';
  return (
    <div className="space-y-3 animate-[fadeIn_0.25s_ease-out]">
      <ProfessionalCard card={contactCardView(c)} />
      <div className="flex items-center justify-between gap-2">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        <button type="button" onClick={() => onOpenProfile(c)} className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">
          View full profile
        </button>
      </div>
      {company && (
        <div className="rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
            <p className="text-xs text-slate-500 truncate">{company.categories[0]}</p>
          </div>
          {company.status === 'verified' && <VerifiedCompanyBadge />}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onSave(c)} disabled={c.isMaintained} className={c.isMaintained ? btnSecondary : btnPrimary}>
          {c.isMaintained ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          {c.isMaintained ? 'Saved' : 'Save Contact'}
        </button>
        <button type="button" onClick={() => onConnect(c)} disabled={!canConnect} className={btnSecondary}>
          <UserPlus className="w-4 h-4" />
          {canConnect ? 'Connect' : status.label}
        </button>
        <button type="button" onClick={() => company && onOpenCompany(company.id)} disabled={!company} className={btnSecondary}>
          <Building2 className="w-4 h-4" />
          View Company
        </button>
        <button type="button" onClick={() => onShare(c)} className={btnSecondary}>
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  );
};
