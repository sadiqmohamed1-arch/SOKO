import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Mail, MessageCircle, Share2 } from 'lucide-react';
import { BuyerSupplier, STATUS_META, supplierSokoId, supplierShareUrl } from '../data/buyerSuppliers';
import { ProfileDialog } from './ProfileDialog';

export const copyProfileLink = async (s: BuyerSupplier, onNotify: (m: string) => void) => {
  try {
    await navigator.clipboard.writeText(supplierShareUrl(s));
    onNotify('Profile link copied');
  } catch {
    onNotify('Could not copy the link on this device');
  }
};

const shareText = (s: BuyerSupplier) => `${s.name} on SOKO (${supplierSokoId(s)})`;

export const SokoIdCard: React.FC<{ supplier: BuyerSupplier; onShare: () => void; onNotify: (m: string) => void }> = ({
  supplier: s,
  onShare,
  onNotify,
}) => (
  <section aria-label="SOKO Supplier ID" className="rounded-2xl bg-slate-900 text-white p-4 shadow-sm relative overflow-hidden">
    <div className="absolute inset-0 blueprint-grid-dark opacity-60 pointer-events-none" />
    <div className="relative flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">SOKO Supplier ID</p>
        <p className="mt-0.5 font-mono text-xl font-semibold tracking-wide">{supplierSokoId(s)}</p>
        <p className="mt-1 text-xs text-slate-300 leading-snug break-words">{s.name}</p>
        <p className="text-[11px] text-slate-400">{STATUS_META[s.status].label}</p>
      </div>
      <button
        type="button"
        onClick={onShare}
        aria-label="Show profile QR code"
        className="shrink-0 rounded-lg bg-white p-1.5 transition-transform hover:scale-[1.03] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
      >
        <QRCodeSVG value={supplierShareUrl(s)} size={88} level="M" marginSize={1} />
      </button>
    </div>
    <div className="relative mt-3 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center justify-center gap-1.5 min-h-10 rounded-lg bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <Share2 className="w-4 h-4" />
        Share Profile
      </button>
      <button
        type="button"
        onClick={() => copyProfileLink(s, onNotify)}
        className="inline-flex items-center justify-center gap-1.5 min-h-10 rounded-lg border border-white/20 text-sm font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Copy className="w-4 h-4" />
        Copy Link
      </button>
    </div>
  </section>
);

const shareOptionCls =
  'flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer';

export const ShareProfileDialog: React.FC<{ supplier: BuyerSupplier; onClose: () => void; onNotify: (m: string) => void }> = ({
  supplier: s,
  onClose,
  onNotify,
}) => {
  const url = supplierShareUrl(s);
  const text = shareText(s);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const nativeShare = async () => {
    try {
      await navigator.share({ title: s.name, text, url });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) onNotify('Sharing is not available on this device');
    }
  };

  return (
    <ProfileDialog title="Share Supplier Profile" subtitle="The link and QR code open this SOKO profile only." onClose={onClose}>
      <div className="px-5 py-5">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-2xl border border-slate-200 p-3 bg-white">
            <QRCodeSVG value={url} size={188} level="M" marginSize={2} />
          </div>
          <p className="mt-3 font-mono text-lg font-semibold text-slate-900">{supplierSokoId(s)}</p>
          <p className="text-sm text-slate-600">{s.name}</p>
          <p className="mt-1 text-xs text-slate-500">Scan with a phone camera to open the profile.</p>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-1 py-1">
          <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{url}</span>
          <button
            type="button"
            onClick={() => copyProfileLink(s, onNotify)}
            className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Link
          </button>
        </div>

        <div className={`mt-4 grid gap-2 ${canNativeShare ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer" className={shareOptionCls}>
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            WhatsApp
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`View ${s.name} on SOKO:\n${url}`)}`} className={shareOptionCls}>
            <Mail className="w-5 h-5 text-blue-700" />
            Email
          </a>
          {canNativeShare && (
            <button type="button" onClick={nativeShare} className={shareOptionCls}>
              <Share2 className="w-5 h-5 text-slate-700" />
              More Options
            </button>
          )}
        </div>
      </div>
    </ProfileDialog>
  );
};
