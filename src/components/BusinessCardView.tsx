import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Download,
  Share2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileCheck,
  Award,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface BusinessCardViewProps {
  currentUser: UserProfile;
  onUpdateUserProfile: (updated: Partial<UserProfile>) => void;
}

export const BusinessCardView: React.FC<BusinessCardViewProps> = ({
  currentUser,
  onUpdateUserProfile,
}) => {
  const isBuyer = currentUser.role === 'buyer';
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  // Form states for live editing
  const [formData, setFormData] = useState({
    name: currentUser.name,
    title: currentUser.title,
    company: currentUser.company,
    role: currentUser.role,
    email: currentUser.email,
    phone: currentUser.phone,
    website: currentUser.website,
    location: currentUser.location,
    dunsNumber: currentUser.dunsNumber,
    cardTheme: currentUser.cardTheme || 'procure-blue',
    paymentTerms: currentUser.paymentTerms,
    capabilities: currentUser.capabilities.join(', '),
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newForm = { ...formData, [name]: value };
    setFormData(newForm);

    onUpdateUserProfile({
      [name]: value,
      capabilities: name === 'capabilities' ? value.split(',').map((s) => s.trim()) : undefined,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(
      `${window.location.origin}/vcard/${currentUser.dunsNumber || 'procurelink-card'}`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Generate and download a real .vcf file
  const handleDownloadVcf = () => {
    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${currentUser.name}`,
      `ORG:${currentUser.company}`,
      `TITLE:${currentUser.title}`,
      `TEL;TYPE=WORK,VOICE:${currentUser.phone}`,
      `EMAIL;TYPE=WORK,INTERNET:${currentUser.email}`,
      `URL:${currentUser.website}`,
      `ADR;TYPE=WORK:;;${currentUser.location};;;;`,
      `NOTE:ProcureLink Verified ${currentUser.role.toUpperCase()} | DUNS: ${currentUser.dunsNumber} | Capabilities: ${currentUser.capabilities.join('; ')}`,
      'END:VCARD',
    ].join('\r\n');

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentUser.name.replace(/\s+/g, '_')}_ProcureLink.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const themeStyles = {
    'procure-blue': {
      bg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900',
      border: 'border-blue-500/30',
      accent: 'text-blue-400',
      tagBg: 'bg-blue-900/60 text-blue-200 border-blue-700/50',
      gold: 'text-amber-400',
    },
    'industrial-dark': {
      bg: 'bg-gradient-to-br from-zinc-950 via-neutral-900 to-stone-900',
      border: 'border-neutral-700',
      accent: 'text-stone-300',
      tagBg: 'bg-neutral-800 text-stone-200 border-neutral-700',
      gold: 'text-amber-300',
    },
    'emerald-green': {
      bg: 'bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950',
      border: 'border-emerald-500/40',
      accent: 'text-emerald-400',
      tagBg: 'bg-emerald-900/60 text-emerald-200 border-emerald-700/50',
      gold: 'text-emerald-300',
    },
    'titanium-gold': {
      bg: 'bg-gradient-to-br from-black via-zinc-900 to-amber-950/80',
      border: 'border-amber-500/40',
      accent: 'text-amber-400',
      tagBg: 'bg-amber-950/60 text-amber-200 border-amber-700/50',
      gold: 'text-yellow-400',
    },
  };

  const activeTheme = themeStyles[formData.cardTheme as keyof typeof themeStyles] || themeStyles['procure-blue'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            Digital Identity & Credential Sharing
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ProcureLink Digital Business Card
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Instant B2B credential badge for trade fairs, RFP presentations, and supplier prequalification. Includes verified DUNS and downloadable .vCard.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'preview' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Card Preview
          </button>
          {!isBuyer && (
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'edit' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customize Card Details
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Card Showcase & Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Flip Card Presentation */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-lg">
            {/* Flip hint & controls */}
            <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {isFlipped ? 'Reverse Side: Commercial Terms & QR' : 'Front Side: Executive Credentials'}
              </span>
              <button
                id="flip-card-btn"
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1.5 text-blue-700 font-bold hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Flip Card
              </button>
            </div>

            {/* The 3D Flip Card Container */}
            <div
              className="relative w-full aspect-[1.75/1] rounded-2xl shadow-xl transition-all duration-700 cursor-pointer select-none group"
              style={{ perspective: '1200px' }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div
                className={`w-full h-full duration-700 transition-transform rounded-2xl p-1 ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* FRONT OF CARD */}
                <div
                  className={`absolute inset-0 rounded-2xl p-6 sm:p-7 text-white flex flex-col justify-between border shadow-2xl overflow-hidden [backface-visibility:hidden] ${activeTheme.bg} ${activeTheme.border}`}
                >
                  {/* Subtle Background Circuit Mesh */}
                  <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

                  {/* Card Top: Logo & Verified Badges */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-xs">
                        PL
                      </div>
                      <div>
                        <span className="font-extrabold text-sm tracking-tight text-white block">
                          ProcureLink<span className="text-blue-400">ID</span>
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block -mt-1">
                          Verified B2B Enterprise
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[11px] font-bold">
                      <ShieldCheck className={`w-3.5 h-3.5 ${activeTheme.accent}`} />
                      <span className="capitalize">{currentUser.role}</span>
                    </div>
                  </div>

                  {/* Card Middle: Name, Title, Company */}
                  <div className="my-auto relative z-10">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      {currentUser.name}
                      {currentUser.verified && (
                        <CheckCircle2 className={`w-4 h-4 ${activeTheme.accent} inline`} />
                      )}
                    </h2>
                    <p className={`text-xs sm:text-sm font-semibold mt-0.5 ${activeTheme.accent}`}>
                      {currentUser.title}
                    </p>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      {currentUser.company}
                    </p>
                  </div>

                  {/* Card Bottom: Contact & DUNS */}
                  <div className="relative z-10 pt-3 border-t border-white/15 flex items-end justify-between text-[11px] text-slate-300">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{currentUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{currentUser.phone}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">
                        D-U-N-S® Registered
                      </span>
                      <span className="font-mono font-bold text-white text-xs tracking-wider">
                        {currentUser.dunsNumber}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BACK OF CARD */}
                <div
                  className={`absolute inset-0 rounded-2xl p-6 sm:p-7 text-white flex flex-col justify-between border shadow-2xl overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] ${activeTheme.bg} ${activeTheme.border}`}
                >
                  {/* Top Bar of Back */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/15 text-xs">
                    <span className="font-bold tracking-wider uppercase text-[10px] text-slate-300">
                      Commercial Prequalification
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                      Tier-1 Ready
                    </span>
                  </div>

                  {/* Middle: Capabilities & QR Code */}
                  <div className="grid grid-cols-12 gap-3 items-center my-auto">
                    <div className="col-span-7 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Standard Payment Terms
                        </span>
                        <span className="font-semibold text-white">{currentUser.paymentTerms}</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Verified Capabilities
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentUser.capabilities.slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${activeTheme.tagBg}`}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Primary Logistics Hub
                        </span>
                        <span className="text-[11px] text-slate-300">
                          {currentUser.warehouseLocations[0] || 'Midwest Regional Distribution Hub'}
                        </span>
                      </div>
                    </div>

                    {/* QR Code SVG */}
                    <div className="col-span-5 flex flex-col items-center justify-center">
                      <div className="p-2 bg-white rounded-xl shadow-lg">
                        {/* High-contrast crisp SVG QR Code */}
                        <svg className="w-24 h-24" viewBox="0 0 100 100" fill="currentColor">
                          <rect width="100" height="100" fill="white" />
                          {/* Top-left corner */}
                          <rect x="10" y="10" width="28" height="28" fill="#0f172a" />
                          <rect x="14" y="14" width="20" height="20" fill="white" />
                          <rect x="18" y="18" width="12" height="12" fill="#0f172a" />
                          {/* Top-right corner */}
                          <rect x="62" y="10" width="28" height="28" fill="#0f172a" />
                          <rect x="66" y="14" width="20" height="20" fill="white" />
                          <rect x="70" y="18" width="12" height="12" fill="#0f172a" />
                          {/* Bottom-left corner */}
                          <rect x="10" y="62" width="28" height="28" fill="#0f172a" />
                          <rect x="14" y="66" width="20" height="20" fill="white" />
                          <rect x="18" y="70" width="12" height="12" fill="#0f172a" />
                          {/* Data dots */}
                          <rect x="44" y="12" width="6" height="6" fill="#0f172a" />
                          <rect x="52" y="18" width="6" height="6" fill="#0f172a" />
                          <rect x="44" y="28" width="6" height="6" fill="#0f172a" />
                          <rect x="42" y="42" width="8" height="8" fill="#2563eb" />
                          <rect x="52" y="52" width="6" height="6" fill="#0f172a" />
                          <rect x="66" y="44" width="6" height="6" fill="#0f172a" />
                          <rect x="74" y="54" width="6" height="6" fill="#0f172a" />
                          <rect x="44" y="68" width="6" height="6" fill="#0f172a" />
                          <rect x="54" y="74" width="6" height="6" fill="#0f172a" />
                          <rect x="68" y="68" width="8" height="8" fill="#0f172a" />
                          <rect x="80" y="78" width="6" height="6" fill="#0f172a" />
                        </svg>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold mt-1">
                        Scan to Add Contact
                      </span>
                    </div>
                  </div>

                  {/* Card Back Bottom */}
                  <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Tax ID: {currentUser.taxId}</span>
                    <span>ProcureLink Verified Profile</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Share Action Buttons below card */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                id="download-vcf-btn"
                onClick={handleDownloadVcf}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                Download .vCard File
              </button>

              <button
                id="copy-card-link-btn"
                onClick={handleCopyLink}
                className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    Copy Profile Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Verified Corporate Profile for Buyer vs Customizer for Supplier/Contractor */}
        {isBuyer ? (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Verified Corporate Enterprise Profile</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {currentUser.company}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional Procurement Account • Government & Commercial Sourcing
                </p>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
                Buyer Profile
              </span>
            </div>

            {/* Verified Credentials Matrix */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">D-U-N-S® Registration</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{currentUser.dunsNumber}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Active Verified
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Corporate Tax ID</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{currentUser.taxId}</span>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  TRN Verified
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Strategic Sourcing Scope</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentUser.capabilities.map((cap, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Standard Payment Terms</span>
                  <span className="font-bold text-slate-900">{currentUser.paymentTerms}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Milestone Billed</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Direct Procurement Contact</span>
                  <span className="font-bold text-slate-900">{currentUser.phone}</span>
                </div>
                <span className="text-[10px] text-slate-500">{currentUser.email}</span>
              </div>
            </div>

            {/* Institutional Security Notice */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-blue-950">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Enterprise Identity Protection Active
              </span>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Buyer executive profile credentials and Dun & Bradstreet registrations are authenticated via corporate KYC and cannot be modified directly.
              </p>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Card Design & Commercial Profile</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose your corporate card theme and adjust the credentials displayed on your NFC and vCard shares.
              </p>
            </div>

            {/* Theme Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Select Card Theme
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'procure-blue', label: 'Procure Blue', desc: 'Navy & Titanium', bg: 'bg-blue-900' },
                  { id: 'industrial-dark', label: 'Industrial Dark', desc: 'Matte Charcoal', bg: 'bg-zinc-900' },
                  { id: 'emerald-green', label: 'Verified Emerald', desc: 'ESG & Clean Energy', bg: 'bg-emerald-900' },
                  { id: 'titanium-gold', label: 'Titanium Gold', desc: 'Executive Noir', bg: 'bg-amber-950' },
                ].map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, cardTheme: theme.id as any }));
                      onUpdateUserProfile({ cardTheme: theme.id as any });
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer transition-all ${
                      formData.cardTheme === theme.id
                        ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md ${theme.bg} shrink-0`} />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{theme.label}</span>
                      <span className="text-[10px] text-slate-500">{theme.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Profile fields */}
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Title & Position</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Company</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">DUNS Number</label>
                  <input
                    type="text"
                    name="dunsNumber"
                    value={formData.dunsNumber}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Procurement Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Direct Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment & Commercial Terms</label>
                <input
                  type="text"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleFormChange}
                  placeholder="e.g. Net 45 upon delivery, LC at sight"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Core Sourcing Capabilities (Comma separated)
                </label>
                <input
                  type="text"
                  name="capabilities"
                  value={formData.capabilities}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
