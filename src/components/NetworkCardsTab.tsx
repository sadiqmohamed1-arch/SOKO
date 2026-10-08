import React, { useState } from 'react';
import { Copy, Download, Eye, Lock, Pencil, QrCode, ScanLine, Share2 } from 'lucide-react';
import { CommunityContact, UserProfile } from '../types';
import { CARD_AUDIENCES, CARD_FIELDS, CardAudience, MyCardSettings, cardShareUrl, myCardView, personalSokoId } from '../data/myNetwork';
import { downloadVCard } from '../data/networkImport';
import { ProfileDialog } from './ProfileDialog';
import { ContactAvatar, ProfessionalCard, StatusPill, btnPrimary, btnSecondary, inputCls, labelCls } from './NetworkShared';

type Viewer = 'owner' | Exclude<CardAudience, 'private'>;

const VIEWERS: { id: Viewer; label: string }[] = [
  { id: 'owner', label: 'Me' },
  { id: 'public', label: 'Public' },
  { id: 'members', label: 'Members' },
  { id: 'connections', label: 'Connections' },
];

interface CardsTabProps {
  user: UserProfile;
  settings: MyCardSettings;
  contacts: CommunityContact[];
  onUpdateSettings: (s: MyCardSettings) => void;
  onUpdateUser: (patch: Partial<UserProfile>) => void;
  onShareMyCard: () => void;
  onScan: () => void;
  onOpenReceived: (c: CommunityContact) => void;
  onNotify: (m: string) => void;
}

export const NetworkCardsTab: React.FC<CardsTabProps> = ({ user, settings, contacts, onUpdateSettings, onUpdateUser, onShareMyCard, onScan, onOpenReceived, onNotify }) => {
  const [viewer, setViewer] = useState<Viewer>('owner');
  const [editing, setEditing] = useState(false);
  const card = myCardView(user, settings, viewer);
  const publicCard = myCardView(user, settings, 'public');
  const received = contacts.filter((c) => c.sharedVia && personalSokoId(c));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(cardShareUrl(card.sokoId));
      onNotify('Card link copied');
    } catch {
      onNotify('Could not copy on this device');
    }
  };

  return (
    <div className="grid lg:grid-cols-[minmax(0,400px)_1fr] gap-6 items-start">
      <section aria-label="My digital business card" className="w-full max-w-md mx-auto lg:max-w-none">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-slate-900">My Digital Business Card</h2>
          <span className="text-[11px] font-mono text-slate-500">Personal ID · {card.sokoId}</span>
        </div>
        <ProfessionalCard card={card} onQrClick={onShareMyCard} />
        <p id="preview-as-label" className="mt-3 mb-1 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          Preview as
        </p>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-labelledby="preview-as-label">
          {VIEWERS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewer(v.id)}
              aria-pressed={viewer === v.id}
              className={`flex-1 min-h-8 rounded-md text-xs font-semibold transition-colors cursor-pointer ${viewer === v.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">{viewer === 'owner'
            ? 'Your full card. This preview only shows what others see — it does not change who can see your details.'
            : `This is how your card looks to ${VIEWERS.find((v) => v.id === viewer)?.label.toLowerCase()} viewers. Change privacy in Edit Card Details.`}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onShareMyCard} className={btnPrimary}>
            <Share2 className="w-4 h-4" />
            Share Card
          </button>
          <button type="button" onClick={onShareMyCard} className={btnSecondary}>
            <QrCode className="w-4 h-4" />
            Show QR
          </button>
          <button type="button" onClick={copyLink} className={btnSecondary}>
            <Copy className="w-4 h-4" />
            Copy Link
          </button>
          <button
            type="button"
            onClick={() => {
              downloadVCard(publicCard);
              onNotify('Contact file (.vcf) downloaded with your public details');
            }}
            className={btnSecondary}
          >
            <Download className="w-4 h-4" />
            Save Contact
          </button>
          <button type="button" onClick={() => setEditing(true)} className={`${btnSecondary} col-span-2`}>
            <Pencil className="w-4 h-4" />
            Edit Card Details
          </button>
        </div>
      </section>

      <div className="space-y-6 min-w-0">
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Who can see each detail</h2>
              <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 shrink-0" />
                Your card link and QR code always follow these settings.
              </p>
            </div>
            <button type="button" onClick={() => setEditing(true)} className={`${btnSecondary} !min-h-9 !px-3 !text-xs shrink-0`}>
              <Pencil className="w-3.5 h-3.5" />
              Change
            </button>
          </div>
          <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 divide-y divide-slate-100 sm:divide-y-0">
            {CARD_FIELDS.map((f) => (
              <div key={f.id} className="py-2 flex items-center justify-between gap-3 sm:border-b sm:border-slate-100">
                <dt className="text-sm text-slate-700">{f.label}</dt>
                <dd className="text-xs font-semibold text-slate-900">{CARD_AUDIENCES.find((a) => a.id === settings.visibility[f.id])?.label}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-slate-500">Joining a company workspace never changes these settings. Your SOKO Professional ID stays with you if you change jobs.</p>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Received Cards</h2>
            <button type="button" onClick={onScan} className={`${btnSecondary} !min-h-9 !px-3 !text-xs`}>
              <ScanLine className="w-3.5 h-3.5" />
              Receive a Card
            </button>
          </div>
          {received.length ? (
            <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {received.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onOpenReceived(c)} className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 cursor-pointer">
                    <ContactAvatar name={c.name} url={c.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 truncate">{c.name}</span>
                      <span className="block text-xs text-slate-500 truncate">
                        {c.title} · {c.company}
                      </span>
                    </span>
                    <StatusPill tone={c.isMaintained ? 'blue' : 'slate'}>{c.isMaintained ? 'Saved' : 'Not saved'}</StatusPill>
                    <span className="hidden sm:inline text-[11px] text-slate-400">{c.sharedVia === 'nfc' ? 'Tap / NFC' : 'Card link'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="bg-white rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Cards you receive will appear here.</p>
          )}
        </section>
      </div>

      {editing && (
        <EditCardDialog
          user={user}
          settings={settings}
          onClose={() => setEditing(false)}
          onSave={(patch, s) => {
            onUpdateUser(patch);
            onUpdateSettings(s);
            setEditing(false);
            onNotify('Card updated');
          }}
        />
      )}
    </div>
  );
};

const EditCardDialog: React.FC<{
  user: UserProfile;
  settings: MyCardSettings;
  onClose: () => void;
  onSave: (patch: Partial<UserProfile>, s: MyCardSettings) => void;
}> = ({ user, settings, onClose, onSave }) => {
  const [u, setU] = useState({ name: user.name, title: user.title, company: user.company, location: user.location, phone: user.phone, email: user.email, website: user.website ?? '' });
  const [s, setS] = useState(settings);
  const valid = u.name.trim() && u.title.trim();
  const userField = (k: keyof typeof u, label: string, type = 'text') => (
    <div>
      <label htmlFor={`card-${k}`} className={labelCls}>
        {label}
      </label>
      <input id={`card-${k}`} type={type} value={u[k]} onChange={(e) => setU({ ...u, [k]: e.target.value })} className={inputCls} />
    </div>
  );
  const settingField = (k: 'whatsapp' | 'officePhone' | 'specialization', label: string) => (
    <div className={k === 'specialization' ? 'sm:col-span-2' : ''}>
      <label htmlFor={`card-${k}`} className={labelCls}>
        {label}
      </label>
      <input id={`card-${k}`} value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} className={inputCls} />
    </div>
  );
  return (
    <ProfileDialog
      title="Edit Card Details"
      subtitle="Your personal professional identity — separate from any company profile."
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" disabled={!valid} onClick={() => onSave({ ...u, name: u.name.trim(), title: u.title.trim() }, s)} className={btnPrimary}>
            Save Card
          </button>
        </div>
      }
    >
      <div className="px-5 py-4 grid sm:grid-cols-2 gap-3">
        {userField('name', 'Full Name')}
        {userField('title', 'Designation')}
        {userField('company', 'Current Employer')}
        {userField('location', 'Location')}
        {userField('phone', 'Mobile', 'tel')}
        {settingField('whatsapp', 'WhatsApp')}
        {settingField('officePhone', 'Office Phone')}
        {userField('email', 'Email', 'email')}
        {userField('website', 'Website', 'url')}
        {settingField('specialization', 'Specialization')}
      </div>
      <div className="px-5 pb-5">
        <h3 className="text-sm font-semibold text-slate-900">Who can see each detail</h3>
        <p className="mt-0.5 mb-2 text-xs text-slate-500 flex items-center gap-1">
          <Lock className="w-3 h-3 shrink-0" />
          Private details never appear in your card link, QR code or saved contact file.
        </p>
        <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          {CARD_FIELDS.map((f) => (
            <li key={f.id} className="px-3 py-2 flex items-center justify-between gap-3">
              <label htmlFor={`vis-${f.id}`} className="text-sm text-slate-800">
                {f.label}
              </label>
              <select
                id={`vis-${f.id}`}
                value={s.visibility[f.id]}
                onChange={(e) => setS({ ...s, visibility: { ...s.visibility, [f.id]: e.target.value as CardAudience } })}
                className={`${inputCls} !w-44 !min-h-9`}
              >
                {CARD_AUDIENCES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>
    </ProfileDialog>
  );
};
