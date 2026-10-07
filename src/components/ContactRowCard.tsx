import React, { useState } from 'react';
import { BadgeCheck, MapPin, Phone, MessageCircle, Mail, Share2, UserPlus, Check } from 'lucide-react';

const LOGO_STYLES = [
  'bg-gradient-to-br from-slate-800 to-slate-950 text-white',
  'bg-gradient-to-br from-blue-500 to-blue-800 text-white',
  'bg-gradient-to-br from-slate-700 to-slate-900 text-amber-400',
  'bg-gradient-to-br from-emerald-600 to-emerald-900 text-white',
  'bg-gradient-to-br from-sky-600 to-slate-900 text-white',
];

const TAG_STYLES = [
  'bg-emerald-50 text-emerald-800',
  'bg-amber-50 text-amber-800',
  'bg-rose-50 text-rose-700',
  'bg-sky-50 text-sky-800',
  'bg-teal-50 text-teal-800',
  'bg-orange-50 text-orange-800',
];

export const hashOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const VISIBLE_TAGS = 4;

interface ContactRowCardProps {
  companyName: string;
  verified: boolean;
  location: string;
  personName: string;
  personTitle: string;
  phone: string;
  whatsapp?: string;
  email: string;
  tags: string[];
  isSaved: boolean;
  onToggleSave: () => void;
  onShare?: () => void;
  onOpenDetails?: () => void;
}

export const ContactRowCard: React.FC<ContactRowCardProps> = ({
  companyName,
  verified,
  location,
  personName,
  personTitle,
  phone,
  whatsapp,
  email,
  tags,
  isSaved,
  onToggleSave,
  onShare,
  onOpenDetails,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const wa = (whatsapp || phone).replace(/[^0-9]/g, '');
  const uniqueTags = Array.from(new Set(tags));
  const visibleTags = showAllTags ? uniqueTags : uniqueTags.slice(0, VISIBLE_TAGS);
  const hiddenCount = uniqueTags.length - visibleTags.length;

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }
    const text = `${companyName} - ${personName}, ${personTitle}\n${phone}\n${email}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: companyName, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // share sheet dismissed
    }
  };

  const chip = 'flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-mono text-slate-700 transition-colors min-w-0';

  const identity = (
    <>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs ${LOGO_STYLES[hashOf(companyName) % LOGO_STYLES.length]}`}>
        {initials(companyName) || 'SK'}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors" title={companyName}>
            {companyName}
          </p>
          {verified && <BadgeCheck className="w-4 h-4 text-teal-600 shrink-0" />}
        </div>
        <p className="flex items-center gap-1 text-[11px] text-slate-500 min-w-0">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate" title={location}>{location}</span>
        </p>
      </div>
    </>
  );

  const identityClass = 'flex items-center gap-3 min-w-0 lg:w-56 shrink-0 text-left';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-slate-300 transition-all p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center gap-4">
      {onOpenDetails ? (
        <button type="button" onClick={onOpenDetails} className={`${identityClass} cursor-pointer group`}>
          {identity}
        </button>
      ) : (
        <div className={identityClass}>{identity}</div>
      )}

      <div className="lg:border-l lg:border-slate-200 lg:pl-4 lg:w-44 shrink-0 min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-900 truncate">{personName}</p>
        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2" title={personTitle}>{personTitle}</p>
      </div>

      <div className="flex flex-col gap-1.5 lg:w-48 shrink-0 min-w-0">
        <a href={`tel:${phone}`} className={chip}>
          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{phone}</span>
        </a>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={chip}>
          <MessageCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">+{wa}</span>
        </a>
        <a href={`mailto:${email}`} className={chip}>
          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{email}</span>
        </a>
      </div>

      <div className="flex flex-wrap lg:flex-col lg:items-start gap-1.5 flex-1 min-w-0">
        {visibleTags.map((tag, i) => (
          <span key={tag} className={`px-2.5 py-1 rounded-full text-[11px] font-medium truncate max-w-full ${TAG_STYLES[(hashOf(tag) + i) % TAG_STYLES.length]}`}>
            {tag}
          </span>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllTags(true)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            +{hiddenCount} more
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 lg:ml-auto">
        <button
          type="button"
          onClick={handleShare}
          className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
          title={copied ? 'Copied to clipboard' : 'Share contact'}
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onToggleSave}
          className={`h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
            isSaved
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
          }`}
          title={isSaved ? 'Saved. Click to remove.' : 'Save contact'}
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {isSaved ? 'Saved' : 'Save contact'}
        </button>
      </div>
    </article>
  );
};
