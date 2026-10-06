import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  MapPin,
  Phone,
  Mail,
  Package,
  Nfc,
  Smartphone,
  Search,
  Send,
  Check,
  Lock,
} from 'lucide-react';
import { CommunityContact } from '../types';

export const getContactProducts = (contact: CommunityContact): string[] =>
  contact.products && contact.products.length > 0 ? contact.products : contact.category ? [contact.category] : [];

const sharedViaLabel = (via?: 'nfc' | 'app') =>
  via === 'nfc' ? 'Received via SOKO NFC tap' : via === 'app' ? 'Received via SOKO app' : 'Connected on SOKO';

const SharedViaIcon: React.FC<{ via?: 'nfc' | 'app'; className?: string }> = ({ via, className }) =>
  via === 'nfc' ? <Nfc className={className} /> : <Smartphone className={className} />;

export const ProductChips: React.FC<{ contact: CommunityContact }> = ({ contact }) => {
  const products = getContactProducts(contact);
  if (products.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1.5">
        <Package className="w-3 h-3 text-blue-600" />
        Products
      </div>
      <div className="flex flex-wrap gap-1.5">
        {products.map((p) => (
          <span
            key={p}
            className="text-[11px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-100"
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
};

interface SokoCardModalProps {
  contact: CommunityContact;
  shareTargets: CommunityContact[];
  onShare: (target: CommunityContact) => void;
  onClose: () => void;
}

export const SokoCardModal: React.FC<SokoCardModalProps> = ({ contact, shareTargets, onShare, onClose }) => {
  const [showShare, setShowShare] = useState(false);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const products = getContactProducts(contact);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">SOKO Digital Business Card</div>
          <div className="flex items-center gap-4 mt-4">
            <img src={contact.avatarUrl} alt={contact.name} className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/20" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold truncate">{contact.name}</h3>
                {contact.verified && <ShieldCheck className="w-4 h-4 text-blue-300 shrink-0" />}
              </div>
              <p className="text-xs text-slate-300 truncate">{contact.title}</p>
              <p className="text-xs font-semibold text-white flex items-center gap-1 mt-1 truncate">
                <Building2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                {contact.company}
              </p>
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold bg-white/10 border border-white/15 px-2 py-1 rounded-full">
            <SharedViaIcon via={contact.sharedVia} className="w-3 h-3" />
            {sharedViaLabel(contact.sharedVia)}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {products.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Products & Services</div>
              <div className="flex flex-wrap gap-1.5">
                {products.map((p) => (
                  <span key={p} className="text-xs font-semibold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-100">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-slate-800 hover:text-blue-700">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              {contact.phone}
            </a>
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-slate-800 hover:text-blue-700 truncate">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              {contact.email}
            </a>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {contact.location}
            </div>
          </div>

          {!showShare ? (
            <button
              onClick={() => setShowShare(true)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
              Share Card within SOKO
            </button>
          ) : (
            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-slate-800">Send to a SOKO connection</div>
              {shareTargets.length === 0 ? (
                <p className="text-[11px] text-slate-500">You have no other SOKO connections to share with yet.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {shareTargets.map((t) => {
                    const sent = sentTo.includes(t.id);
                    return (
                      <div key={t.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={t.avatarUrl} alt={t.name} className="w-7 h-7 rounded-lg object-cover" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">{t.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">{t.company}</div>
                          </div>
                        </div>
                        <button
                          disabled={sent}
                          onClick={() => {
                            onShare(t);
                            setSentTo((s) => [...s, t.id]);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                            sent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                          }`}
                        >
                          {sent ? <span className="flex items-center gap-1"><Check className="w-3 h-3" />Sent</span> : 'Send'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-500 flex items-start gap-1.5">
            <Lock className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
            SOKO business cards can only be exchanged between SOKO members, by NFC tap or through the SOKO app.
          </p>
        </div>
      </div>
    </div>
  );
};

interface ReceiveCardModalProps {
  members: CommunityContact[];
  onReceive: (contact: CommunityContact, via: 'nfc' | 'app') => void;
  onClose: () => void;
}

export const ReceiveCardModal: React.FC<ReceiveCardModalProps> = ({ members, onReceive, onClose }) => {
  const [method, setMethod] = useState<'nfc' | 'app'>('nfc');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'found'>('idle');
  const [query, setQuery] = useState('');

  const nearby = members.slice(0, 3);
  const q = query.trim().toLowerCase();
  const results = q
    ? members.filter((m) => m.name.toLowerCase().includes(q) || m.company.toLowerCase().includes(q))
    : members.slice(0, 6);

  const startScan = () => {
    setScanState('scanning');
    setTimeout(() => setScanState('found'), 1500);
  };

  const list = method === 'nfc' ? nearby : results;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Receive a SOKO Business Card</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cards are only exchanged between registered SOKO members.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          {(['nfc', 'app'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                method === m ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SharedViaIcon via={m} className="w-4 h-4" />
              {m === 'nfc' ? 'NFC Tap' : 'SOKO App'}
            </button>
          ))}
        </div>

        {method === 'nfc' && scanState !== 'found' ? (
          <div className="text-center py-6 space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              {scanState === 'scanning' && <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping" />}
              <div className="relative w-24 h-24 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
                <Nfc className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              {scanState === 'scanning'
                ? 'Looking for a nearby SOKO member. Hold your phones together...'
                : 'Hold your phone close to the other SOKO member\'s phone with their SOKO app open.'}
            </p>
            <button
              onClick={startScan}
              disabled={scanState === 'scanning'}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              {scanState === 'scanning' ? 'Scanning...' : 'Start NFC Scan'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {method === 'app' ? (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search SOKO members by name or company..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            ) : (
              <p className="text-[11px] font-semibold text-emerald-700">SOKO members found nearby:</p>
            )}

            {list.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No SOKO members found.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {list.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={m.avatarUrl} alt={m.name} className="w-9 h-9 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{m.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{m.title} · {m.company}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onReceive(m, method)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer transition-colors"
                    >
                      Save Card
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
