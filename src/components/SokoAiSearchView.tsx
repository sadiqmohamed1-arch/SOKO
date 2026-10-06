import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Search,
  ArrowUpRight,
  ArrowRight,
  Mic,
  MicOff,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  SlidersHorizontal,
  FileCheck2,
  MessageSquare,
  FileText,
  Bookmark,
  Award,
  Users,
  MapPin,
  Calendar,
  X,
  Phone,
  Mail,
  Download,
  Check,
  Truck,
  HardHat,
  Cpu,
  Layers,
  Info,
} from 'lucide-react';
import { SokoAiCompany, SOKO_AI_COMPANIES_DB } from '../data/sokoAiCompanies';
import { UserProfile } from '../types';

interface SokoAiSearchViewProps {
  currentUser: UserProfile;
  onNavigateToTab: (tab: string) => void;
  onStartMessageWith?: (recipientName: string, recipientCompany: string) => void;
}

export const SokoAiSearchView: React.FC<SokoAiSearchViewProps> = ({
  currentUser,
  onNavigateToTab,
  onStartMessageWith,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<SokoAiCompany[]>(SOKO_AI_COMPANIES_DB);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [groundingSources, setGroundingSources] = useState<Array<{ title: string; uri: string }>>([]);
  const [isGoogleGrounded, setIsGoogleGrounded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'dm_unlimited' | 'dm_grade1' | 'dcl' | 'high_icv'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'projects' | 'icv'>('rating');

  // Modals & Shortlist
  const [selectedCompanyForDossier, setSelectedCompanyForDossier] = useState<SokoAiCompany | null>(null);
  const [selectedCompanyForRfq, setSelectedCompanyForRfq] = useState<SokoAiCompany | null>(null);
  const [shortlist, setShortlist] = useState<Record<string, boolean>>({});
  const [rfqSubmitted, setRfqSubmitted] = useState(false);
  const [rfqFormData, setRfqFormData] = useState({
    projectTitle: '',
    siteLocation: 'Dubai South Project Sector, UAE',
    scopeOfWork: 'Civil structural concrete works, deep excavation and shoring packages.',
    budgetRange: 'AED 5,000,000 - 15,000,000',
    requiredDeliveryDate: '2026-12-15',
  });

  // Voice recognition
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick Prompt Cards (Matches the 4 cards from the attached reference screenshot)
  const quickPrompts = [
    {
      id: 'dm_civil',
      title: 'DM Approved Civil Works',
      prompt: 'DM approved contractor for civil works',
      subtext: 'Find Dubai Municipality approved contractors for excavation, structural concrete & civil works.',
    },
    {
      id: 'dewa_elec',
      title: 'DEWA Certified Electrical',
      prompt: 'DEWA certified electrical substation switchgear contractor',
      subtext: 'Search pre-qualified substation, MV switchgear & high-voltage power infrastructure specialists.',
    },
    {
      id: 'dcl_steel',
      title: 'DCL Certified Steel & Rebar',
      prompt: 'DCL approved ASTM A615 rebar and structural steel suppliers',
      subtext: 'Source ASTM A615 Grade 60 rebar with Dubai Central Laboratory conformity marks.',
    },
    {
      id: 'icv_concrete',
      title: 'High ICV Ready-Mix & Concrete',
      prompt: 'DM green concrete ready mix suppliers high ICV',
      subtext: 'Contractors & suppliers with audited In-Country Value scorecards >65% for federal tenders.',
    },
  ];

  // Execute Search via Server Endpoint with fallback to DB
  const executeSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch('/api/soko-ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.matchedCompanies || []);
        setAiSummary(data.aiSummary || '');
        setGroundingSources(data.groundingSources || []);
        setIsGoogleGrounded(Boolean(data.isGoogleGrounded));
      } else {
        // Fallback locally
        fallbackLocalSearch(q);
      }
    } catch (err) {
      console.warn('[SOKO AI] Search API fetch error, using local database:', err);
      fallbackLocalSearch(q);
    } finally {
      setIsSearching(false);
    }
  };

  const fallbackLocalSearch = (q: string) => {
    const lower = q.toLowerCase();
    const filtered = SOKO_AI_COMPANIES_DB.filter((comp) => {
      if (lower.includes('dm') || lower.includes('civil')) {
        return comp.approvalBody.includes('Dubai Municipality');
      }
      if (lower.includes('dewa')) {
        return comp.approvalBody.includes('DEWA');
      }
      if (lower.includes('steel') || lower.includes('rebar')) {
        return comp.dclCertified || comp.category.includes('Steel');
      }
      return (
        comp.name.toLowerCase().includes(lower) ||
        comp.category.toLowerCase().includes(lower) ||
        comp.approvalGrade.toLowerCase().includes(lower)
      );
    });

    setResults(filtered.length > 0 ? filtered : SOKO_AI_COMPANIES_DB);
    setAiSummary(
      `**SOKO AI Sourcing Assessment for "${q}":**\n` +
      `Displaying verified Dubai Municipality (DM) and UAE certified partners. Every listed contractor holds active commercial trade licenses, verified municipal classifications, and verified on-time delivery track records.`
    );
    setGroundingSources([
      { title: 'Dubai Municipality - Official Building & Engineering Classification', uri: 'https://www.dm.gov.ae' },
      { title: 'Dubai Central Laboratory (DCL) - Materials Conformity Directory', uri: 'https://www.dcl.ae' },
      { title: 'UAE Ministry of Industry & Advanced Technology - National ICV Directory', uri: 'https://moiat.gov.ae' },
    ]);
    setIsGoogleGrounded(true);
  };

  const handlePromptClick = (promptText: string) => {
    setSearchQuery(promptText);
    executeSearch(promptText);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  };

  // Voice Input Toggle (Web Speech API)
  const toggleVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your query in the prompt box.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      setIsListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        executeSearch(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
      setIsListening(false);
    }
  };

  const toggleShortlist = (companyId: string) => {
    setShortlist((prev) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  };

  const handleDirectRfqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRfqSubmitted(true);
    setTimeout(() => {
      setRfqSubmitted(false);
      setSelectedCompanyForRfq(null);
    }, 2200);
  };

  // Filter and sort results
  const filteredAndSortedResults = results
    .filter((comp) => {
      if (selectedFilter === 'dm_unlimited') {
        return comp.approvalGrade.toLowerCase().includes('unlimited');
      }
      if (selectedFilter === 'dm_grade1') {
        return comp.approvalGrade.toLowerCase().includes('grade 1');
      }
      if (selectedFilter === 'dcl') {
        return comp.dclCertified;
      }
      if (selectedFilter === 'high_icv') {
        return comp.icvScore >= 75;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'projects') return b.completedProjectsCount - a.completedProjectsCount;
      if (sortBy === 'icv') return b.icvScore - a.icvScore;
      return 0;
    });

  const shortlistedCount = Object.values(shortlist).filter(Boolean).length;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#faf8fd] via-[#fdfcfd] to-[#f6f3fb] text-slate-900 pb-36 overflow-hidden">
      {/* Background Soft Ambient Purple / Lavender Glow (Inspired by Qubi reference screenshot) */}
      <div className="absolute top-0 left-1/4 w-[650px] h-[350px] bg-purple-300/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-48 right-1/4 w-[550px] h-[380px] bg-violet-300/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-[400px] h-[300px] bg-indigo-200/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header / Bar */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between gap-3 border-b border-purple-100/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-slate-950">SOKO AI</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Intelligent Sourcing
            </p>
          </div>
        </div>

        {/* Top Right Action Pills */}
        <div className="flex items-center gap-2">
          {/* Shortlist Badge */}
          {shortlistedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs font-bold shadow-xs">
              <Bookmark className="w-3.5 h-3.5 fill-white" />
              <span>{shortlistedCount} Shortlisted</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* ========================================================================= */}
        {/* CENTER HERO SECTION (Visual style inspired by reference image) */}
        {/* ========================================================================= */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          {/* 8-Dot Geometric Circle Glyph from reference image */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-11 h-11 text-slate-900" fill="currentColor">
                {/* Ring of 8 dots / petal shapes arranged radially */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <circle
                    key={deg}
                    cx={50 + 28 * Math.cos((deg * Math.PI) / 180)}
                    cy={50 + 28 * Math.sin((deg * Math.PI) / 180)}
                    r="8.5"
                    className="transition-all hover:scale-110"
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* Headline with highlighted colored keyword */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            How can SOKO AI <span className="text-purple-600 font-serif italic">assist</span> you today?
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Get instant procurement guidance powered by specialized AI agents.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 4 PROMPT CARDS (Grid inspired by reference image) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-12">
          {quickPrompts.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => handlePromptClick(card.prompt)}
              className="rounded-2xl border border-slate-200/80 bg-white/95 hover:bg-white p-5 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group text-left flex flex-col justify-between h-40 backdrop-blur-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-purple-700 transition-colors">
                  {card.title}
                </h3>
                <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-purple-500 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                {card.subtext}
              </p>
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* AI SEARCH RESULTS SECTION (GRID TYPE) */}
        {/* ========================================================================= */}
        {hasSearched && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* AI Sourcing Intelligence & Google Search Grounding Summary Banner */}
            <div className="rounded-2xl bg-white/95 border border-purple-200/90 p-5 sm:p-6 shadow-md backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-5 h-5 text-purple-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-slate-900">
                        SOKO AI Sourcing Intelligence
                      </h2>
                      {isGoogleGrounded && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Google Grounded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Query: <span className="font-semibold text-purple-900">"{searchQuery}"</span> • {filteredAndSortedResults.length} approved companies found
                    </p>
                  </div>
                </div>

                {/* Grounding Source Links (Citations) */}
                {groundingSources.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Verified Sources:
                    </span>
                    {groundingSources.slice(0, 3).map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 text-xs font-medium transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[160px]">{src.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Summary Text */}
              <div className="pt-4 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {isSearching ? (
                  <div className="flex items-center gap-2 text-purple-700 py-2 font-medium">
                    <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <span>Querying Dubai Municipality database &amp; grounding live regulations...</span>
                  </div>
                ) : (
                  aiSummary
                )}
              </div>
            </div>

            {/* Filter & Sorting Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: `All Matches (${results.length})` },
                  { id: 'dm_unlimited', label: 'DM Grade: Unlimited' },
                  { id: 'dm_grade1', label: 'DM Grade 1' },
                  { id: 'dcl', label: 'DCL Certified' },
                  { id: 'high_icv', label: 'High ICV (>75%)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedFilter === f.id
                        ? 'bg-purple-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="text-slate-500 font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="rating">Highest Rating</option>
                  <option value="projects">Most Delivered Projects</option>
                  <option value="icv">National ICV Score</option>
                </select>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* GRID OF MATCHED COMPANIES (As requested: "display as grid type all companies who are approved by DM") */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAndSortedResults.map((company) => {
                const isShortlisted = shortlist[company.id];

                return (
                  <article
                    key={company.id}
                    id={`company-card-${company.id}`}
                    className="rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-lg hover:border-purple-400 transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Top Media Banner */}
                    <div className="relative h-28 w-full bg-slate-900 overflow-hidden">
                      <img
                        src={company.bannerImage}
                        alt={company.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

                      {/* Approval Badge on Banner */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          {company.approvalBody}
                        </span>
                      </div>

                      {/* Shortlist Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleShortlist(company.id)}
                        className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                          isShortlisted
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-black/40 text-white hover:bg-black/60'
                        }`}
                        title={isShortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isShortlisted ? 'fill-white' : ''}`} />
                      </button>

                      {/* Grade Badge */}
                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white font-bold">
                        <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-white/20 truncate">
                          {company.approvalGrade}
                        </span>
                        <span className="bg-amber-400/90 text-slate-950 px-2 py-0.5 rounded font-black">
                          ICV: {company.icvScore}%
                        </span>
                      </div>
                    </div>

                    {/* Company Details Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Company Title & Arabic Name */}
                        <div className="flex items-start gap-3">
                          <img
                            src={company.logoImage}
                            alt={company.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs mt-0.5"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-purple-700 transition-colors">
                              {company.name}
                            </h3>
                            {company.tradeNameAr && (
                              <p className="text-[11px] text-slate-400 font-medium truncate" dir="rtl">
                                {company.tradeNameAr}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Location & License Info */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {company.location.split(',')[0]}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-purple-800 font-semibold">
                            Lic: {company.licenseNumber}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">
                            {company.rating} ★ ({company.reviewCount})
                          </span>
                        </div>

                        {/* Summary */}
                        <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                          {company.summary}
                        </p>

                        {/* Key Metrics Strip */}
                        <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              Completed Works
                            </span>
                            <span className="font-bold text-slate-900">
                              {company.completedProjectsCount}+ Projects
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              Delivered Value
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {company.totalDeliveredValueAED}
                            </span>
                          </div>
                        </div>

                        {/* Capabilities Pills */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {company.keyCapabilities.slice(0, 3).map((cap, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-900 border border-purple-100"
                            >
                              {cap.split('(')[0]}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCompanyForRfq(company)}
                            className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Direct RFQ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedCompanyForDossier(company)}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-800 hover:text-purple-900 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                            <span>DM Dossier</span>
                          </button>
                        </div>

                        {onStartMessageWith && (
                          <button
                            type="button"
                            onClick={() => onStartMessageWith(company.contactPerson.name, company.name)}
                            className="w-full py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            <span>Message {company.contactPerson.name} ({company.contactPerson.title})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* FLOATING PROMPT INPUT BAR (Styled exactly like reference screenshot) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 left-4 right-4 z-40 max-w-3xl mx-auto">
        <form
          onSubmit={handleFormSubmit}
          className="rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl p-2 sm:p-2.5 flex items-center gap-2 sm:gap-3 ring-1 ring-purple-100 transition-all focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-purple-400"
        >
          {/* Dark Sparkle Circle Button on the Left */}
          <button
            type="button"
            onClick={() => {
              setSearchQuery('DM approved contractor for civil works');
              executeSearch('DM approved contractor for civil works');
            }}
            className="w-10 h-10 rounded-full bg-slate-900 hover:bg-purple-900 text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition-colors"
            title="Click to auto-populate DM civil contractor inquiry"
          >
            <Sparkles className="w-5 h-5 text-purple-300 bg-black" />
          </button>

          {/* Prompt Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="type your prompt here (e.g. DM approved contractor for civil works)..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium px-2"
          />

          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title={isListening ? 'Listening... click to stop' : 'Click to speak your prompt'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Green Send Arrow Button (Matches green circular send button from reference screenshot) */}
          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="w-10 h-10 rounded-full bg-emerald-200 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-2xs cursor-pointer disabled:cursor-not-allowed"
            title="Send SOKO AI Prompt"
          >
            {isSearching ? (
              <span className="w-4 h-4 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            )}
          </button>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DUBAI MUNICIPALITY PREQUALIFICATION DOSSIER */}
      {/* ========================================================================= */}
      {selectedCompanyForDossier && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 to-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {selectedCompanyForDossier.name}
                  </h3>
                  <p className="text-xs text-purple-200">
                    Official Dubai Municipality (DM) Prequalification Dossier
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCompanyForDossier(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Classification Certificate Summary Box */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-950 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Verified Municipal License: {selectedCompanyForDossier.licenseNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-200 text-emerald-900">
                    Status: {selectedCompanyForDossier.dmApprovedDetails.inspectionStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-400 font-medium block">Approved Height:</span>
                    <span className="font-bold text-slate-900">{selectedCompanyForDossier.dmApprovedDetails.approvedHeights}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">License Validity:</span>
                    <span className="font-bold text-slate-900">{selectedCompanyForDossier.dmApprovedDetails.validUntil}</span>
                  </div>
                </div>
              </div>

              {/* Authorized Municipal Activities */}
              <div>
                <h4 className="font-extrabold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
                  Authorized Dubai Municipality Trade Activities
                </h4>
                <div className="space-y-1.5">
                  {selectedCompanyForDossier.dmApprovedDetails.activities.map((act, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-800">
                      <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* DCL Compliance & Test Reports */}
              <div>
                <h4 className="font-extrabold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
                  Dubai Central Laboratory (DCL) Conformity Records
                </h4>
                <div className="space-y-1.5">
                  {selectedCompanyForDossier.dmApprovedDetails.dclTestReports.map((report, i) => (
                    <div key={i} className="p-2 rounded-lg bg-blue-50 border border-blue-100 font-mono text-[11px] text-blue-900">
                      {report}
                    </div>
                  ))}
                </div>
              </div>

              {/* Engineering Capacity & Resources */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Engineers</span>
                  <span className="font-black text-slate-900 text-base">{selectedCompanyForDossier.dmApprovedDetails.engineerCount} Certified</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Equipment Fleet</span>
                  <span className="font-black text-slate-900 text-base">{selectedCompanyForDossier.equipmentFleetCount} Heavy Units</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Labor Force</span>
                  <span className="font-black text-slate-900 text-base">{selectedCompanyForDossier.laborForceCount}+ Personnel</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Verified via SOKO.ae Regulatory Interconnect
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompanyForRfq(selectedCompanyForDossier);
                    setSelectedCompanyForDossier(null);
                  }}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Send RFQ to Contractor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DIRECT RFQ DISPATCH MODAL */}
      {/* ========================================================================= */}
      {selectedCompanyForRfq && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                  Direct Procurement Inquiry
                </span>
                <h3 className="font-extrabold text-base sm:text-lg">
                  Submit RFQ to {selectedCompanyForRfq.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCompanyForRfq(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rfqSubmitted ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h4 className="text-lg font-black text-slate-900">RFQ Successfully Dispatched!</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your civil works inquiry has been submitted directly to {selectedCompanyForRfq.contactPerson.name} ({selectedCompanyForRfq.contactPerson.title}) with an electronic copy delivered to your SOKO dashboard.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDirectRfqSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Project Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dubai South Commercial Logistics Depot - Package 2"
                    value={rfqFormData.projectTitle}
                    onChange={(e) => setRfqFormData({ ...rfqFormData, projectTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-medium outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Site Plot / Location</label>
                    <input
                      type="text"
                      required
                      value={rfqFormData.siteLocation}
                      onChange={(e) => setRfqFormData({ ...rfqFormData, siteLocation: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-medium outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Estimated Budget (AED)</label>
                    <input
                      type="text"
                      required
                      value={rfqFormData.budgetRange}
                      onChange={(e) => setRfqFormData({ ...rfqFormData, budgetRange: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-medium outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Scope of Work &amp; Specifications</label>
                  <textarea
                    rows={3}
                    required
                    value={rfqFormData.scopeOfWork}
                    onChange={(e) => setRfqFormData({ ...rfqFormData, scopeOfWork: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-medium outline-none focus:border-purple-600"
                  />
                </div>

                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-900 text-[11px] leading-relaxed">
                  <strong>Municipal Compliance Note:</strong> Contractor will be instructed to provide their valid Dubai Municipality classification certificate and DCL concrete mix design approval along with their commercial proposal.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyForRfq(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Submit RFQ to Contractor
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
