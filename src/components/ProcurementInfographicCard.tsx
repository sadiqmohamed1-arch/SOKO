import React, { useState } from 'react';
import {
  Download,
  Maximize2,
  Copy,
  Check,
  Sparkles,
  Calculator,
  ShieldCheck,
  Split,
  TrendingUp,
  FileCheck,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  Handshake,
  Workflow,
  ClipboardList,
  Coins,
  RefreshCw,
  Target,
  Users,
  Eye,
  CheckCircle2,
  Info,
  Sliders,
} from 'lucide-react';
import { PostInfographicData, InfographicTipItem } from '../types';

interface ProcurementInfographicCardProps {
  infographic: PostInfographicData;
}

export const ProcurementInfographicCard: React.FC<ProcurementInfographicCardProps> = ({
  infographic,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'tensions' | 'pillars' | 'rules'>('visual');
  const [selectedTipIndex, setSelectedTipIndex] = useState<number | null>(0);
  const [selectedTensionId, setSelectedTensionId] = useState<string | null>(
    infographic.tensions?.[0]?.id || null
  );
  const [copiedChecklist, setCopiedChecklist] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const getTipIcon = (iconType: InfographicTipItem['iconType']) => {
    switch (iconType) {
      case 'calculator':
        return <Calculator className="w-4 h-4 text-blue-600" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'split':
        return <Split className="w-4 h-4 text-indigo-600" />;
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'file-check':
        return <FileCheck className="w-4 h-4 text-cyan-600" />;
      case 'calendar':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'award':
        return <Award className="w-4 h-4 text-rose-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-600" />;
    }
  };

  const getPillarIcon = (iconName: string) => {
    switch (iconName) {
      case 'handshake':
        return <Handshake className="w-5 h-5 text-blue-400" />;
      case 'cogs':
        return <Workflow className="w-5 h-5 text-indigo-400" />;
      case 'clipboard':
        return <ClipboardList className="w-5 h-5 text-emerald-400" />;
      case 'dollar':
        return <Coins className="w-5 h-5 text-amber-400" />;
      case 'refresh':
        return <RefreshCw className="w-5 h-5 text-cyan-400" />;
      case 'target':
        return <Target className="w-5 h-5 text-purple-400" />;
      case 'users':
        return <Users className="w-5 h-5 text-rose-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-400" />;
    }
  };

  const handleCopyChecklist = () => {
    let text = `📋 ${infographic.title}\n${infographic.subtitle}\n\n`;

    if (infographic.tensions && infographic.tensions.length > 0) {
      text += `⚡ 10 STAKEHOLDER CONFLICTS & PROCUREMENT RESOLUTIONS:\n` +
        infographic.tensions
          .map((t, idx) => `${idx + 1}. [${t.role}] "${t.quote}"\n   • Tension: ${t.tension}\n   • Resolution: ${t.resolution}`)
          .join('\n\n') +
        `\n\n`;
    }

    if (infographic.pillars && infographic.pillars.length > 0) {
      text += `🏛️ 7 CORE COMPETENCY PILLARS:\n` +
        infographic.pillars
          .map((p, idx) => `${idx + 1}. ${p.title} (${p.subtitle}): ${p.description}`)
          .join('\n') +
        `\n\n`;
    }

    if (infographic.tips && infographic.tips.length > 0) {
      text += `🎯 TACTICAL MILESTONE RULES:\n` +
        infographic.tips
          .map(
            (t) =>
              `${t.number}. [${t.tag}] ${t.title}\n   • Rule: ${t.summary}\n   • Impact: ${t.impactBadge}\n   • Formula: ${t.formulaOrMetric || 'N/A'}`
          )
          .join('\n\n');
    }

    text += `\n\nMotto: ${infographic.motto || 'Right Product. Right Quality. Right Time. Right Cost. Always!'}\nAuthor: ${infographic.authorPlaque || 'Mohamed Sadiq'}\nVerified by soko.ae Procurement Intelligence`;

    navigator.clipboard?.writeText?.(text);
    setCopiedChecklist(true);
    setTimeout(() => setCopiedChecklist(false), 2400);
  };

  const handleDownloadInfographic = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
      const link = document.createElement('a');
      link.href = '/procurement_manager_infographic.svg';
      link.download = infographic.downloadFilename || 'procurement-manager-infographic.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 600);
  };

  const activeTip = selectedTipIndex !== null ? infographic.tips?.[selectedTipIndex] : null;
  const activeTension = infographic.tensions?.find((t) => t.id === selectedTensionId);

  return (
    <div className="mt-3.5 space-y-3">
      {/* Main Infographic Frame */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-white overflow-hidden shadow-xl">
        {/* Infographic Banner Header */}
        <div className="p-4 sm:p-5 border-b border-blue-800/40 relative overflow-hidden bg-radial from-blue-900/60 to-transparent">
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400 text-slate-950 shadow-xs">
                  <Layers className="w-3 h-3" />
                  {infographic.versionBadge || 'Executive Infographic 2026'}
                </span>
                <span className="text-xs text-blue-200 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  {infographic.summaryMetric || '10 Stakeholder Tensions • 7 Core Pillars'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                {infographic.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {infographic.subtitle}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsFullscreenModalOpen(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Expand Full Vector Infographic"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadInfographic}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              >
                {downloading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing Graphic...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-300">Downloaded HD File!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Vector Graphic (HD)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyChecklist}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
              >
                {copiedChecklist ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Playbook Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Writeup</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-blue-200/90 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Right Product. Right Quality. Right Time. Right Cost.</span>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'visual'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Infographic Visual</span>
            </button>

            {infographic.tensions && infographic.tensions.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('tensions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'tensions'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>10 Stakeholder Tensions</span>
              </button>
            )}

            {infographic.pillars && infographic.pillars.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('pillars')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'pillars'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>7 Core Competency Pillars</span>
              </button>
            )}

            {infographic.tips && infographic.tips.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'rules'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>7 Tactical Formulas &amp; Gating</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: VISUAL INFOGRAPHIC DISPLAY */}
        {/* ========================================================================= */}
        {activeTab === 'visual' && (
          <div className="p-3.5 sm:p-5 bg-slate-950/90 space-y-4">
            {/* Visual Frame */}
            <div className="relative rounded-xl border border-slate-800 bg-[#fdfcf9] overflow-hidden group shadow-inner">
              <img
                src={imageLoadError ? '/procurement_manager_infographic.svg' : (infographic.imageUrl || '/procurement_manager_infographic.svg')}
                alt="Procurement Manager: Everyone Wants Something Different - Mohamed Sadiq"
                className="w-full h-auto max-h-[750px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
                referrerPolicy="no-referrer"
                onError={() => setImageLoadError(true)}
              />

              {/* Click to expand overlay button */}
              <button
                type="button"
                onClick={() => setIsFullscreenModalOpen(true)}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-slate-900/80 hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>View Fullscreen</span>
              </button>
            </div>

            {/* Mohamed Sadiq Metallic Nameplate & Motto Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 border-2 border-slate-400 p-0.5 shadow-md flex items-center justify-center shrink-0">
                  <span className="font-mono font-black text-slate-900 text-lg">MS</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white tracking-wide">
                      {infographic.authorPlaque || 'Mohamed Sadiq'}
                    </h4>
                    <span className="px-2 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-400/40 rounded text-[10px] font-bold">
                      Procurement Leader
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Strategic Sourcing • Supply Chain Architecture • Commercial Contracts
                  </p>
                </div>
              </div>

              <div className="text-center md:text-right">
                <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                  Core Procurement Creed
                </div>
                <div className="text-sm font-black text-cyan-200 mt-0.5 italic">
                  "{infographic.motto || 'Right Product. Right Quality. Right Time. Right Cost. Always!'}"
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 10 STAKEHOLDER CONFLICTS & RESOLUTIONS */}
        {/* ========================================================================= */}
        {activeTab === 'tensions' && infographic.tensions && (
          <div className="p-4 sm:p-5 bg-slate-950/90 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>The 10 Stakeholder Tensions Faced by the Procurement Manager</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any stakeholder to inspect their specific demand and how to resolve it constructively.
                </p>
              </div>
              <span className="text-[11px] font-mono bg-blue-950 text-blue-300 border border-blue-800/60 px-2.5 py-1 rounded-md">
                10 Stakeholders
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {infographic.tensions.map((t) => {
                const isSelected = selectedTensionId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTensionId(t.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-900/60 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                        : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                          {t.side === 'left' ? 'Commercial' : 'Supply'}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <div className="text-xs font-black text-white line-clamp-1">{t.role}</div>
                      <div className="text-[11px] font-semibold text-amber-300 mt-1 italic line-clamp-1">
                        "{t.quote}"
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Stakeholder Detail Card */}
            {activeTension && (
              <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-blue-950/90 via-slate-900 to-slate-950 border border-blue-500/50 shadow-lg text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-extrabold text-white">
                      {activeTension.role} ({activeTension.department})
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-200 font-bold text-xs">
                    Quote: "{activeTension.quote}"
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-800/40 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1">
                      <X className="w-3.5 h-3.5 text-red-400" />
                      The Conflicting Pressure
                    </span>
                    <p className="text-slate-200 leading-relaxed text-xs">
                      {activeTension.tension}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Procurement Resolution Playbook
                    </span>
                    <p className="text-emerald-100 font-medium leading-relaxed text-xs">
                      {activeTension.resolution}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 7 CORE COMPETENCY PILLARS */}
        {/* ========================================================================= */}
        {activeTab === 'pillars' && infographic.pillars && (
          <div className="p-4 sm:p-5 bg-slate-950/90 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>The 7 Core Competency Pillars of Strategic Procurement</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                The technical and interpersonal disciplines required to harmonize all 10 conflicting forces.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {infographic.pillars.map((pillar, idx) => (
                <div
                  key={pillar.title}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800/60 flex items-center justify-center shrink-0 shadow-xs">
                      {getPillarIcon(pillar.iconName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-black text-amber-400">
                          #{idx + 1}
                        </span>
                        <h5 className="text-xs sm:text-sm font-extrabold text-white">
                          {pillar.title}
                        </h5>
                      </div>
                      <span className="text-[11px] font-semibold text-blue-300 block">
                        {pillar.subtitle}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: 7 TACTICAL RULES & MILESTONE FORMULAS */}
        {/* ========================================================================= */}
        {activeTab === 'rules' && infographic.tips && (
          <div className="p-3.5 sm:p-4 bg-slate-900/90 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {infographic.tips.map((tip, idx) => {
                const isSelected = selectedTipIndex === idx;
                return (
                  <div
                    key={tip.number}
                    onClick={() => setSelectedTipIndex(isSelected ? null : idx)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-900/60 border-blue-400 shadow-md ring-1 ring-blue-400/50'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-700">
                        <span className="font-mono text-xs font-black text-amber-400">
                          #{tip.number}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">
                            {tip.tag}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            {tip.impactBadge}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                          {tip.title}
                        </h4>

                        <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                          {tip.summary}
                        </p>

                        {tip.formulaOrMetric && (
                          <div className="mt-2 px-2 py-1 rounded bg-black/40 border border-white/10 font-mono text-[11px] text-cyan-300">
                            <span className="text-slate-400 text-[9px] uppercase block font-sans font-bold">
                              Formula / Milestone Gating
                            </span>
                            {tip.formulaOrMetric}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active tip detail */}
            {activeTip && (
              <div className="mt-3 p-3.5 rounded-lg bg-blue-950/80 border border-blue-500/40 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Tactical Implementation: Tip #{activeTip.number} ({activeTip.title})
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/60">
                    {activeTip.impactBadge}
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed mb-2">{activeTip.details}</p>
                {activeTip.formulaOrMetric && (
                  <div className="p-2.5 rounded bg-black/50 border border-cyan-500/30 font-mono text-xs text-cyan-200">
                    {activeTip.formulaOrMetric}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN VECTOR INFOGRAPHIC MODAL */}
      {/* ========================================================================= */}
      {isFullscreenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="font-black text-white text-sm sm:text-base truncate">
                  {infographic.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadInfographic}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreenModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#fdfcf9] flex items-center justify-center">
              <img
                src={infographic.imageUrl || '/procurement_manager_infographic.svg'}
                alt={infographic.title}
                className="max-w-full max-h-[78vh] object-contain shadow-md rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
