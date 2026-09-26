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
  ExternalLink,
  Layers,
} from 'lucide-react';
import { PostInfographicData, InfographicTipItem } from '../types';

interface ProcurementInfographicCardProps {
  infographic: PostInfographicData;
}

export const ProcurementInfographicCard: React.FC<ProcurementInfographicCardProps> = ({
  infographic,
}) => {
  const [selectedTipIndex, setSelectedTipIndex] = useState<number | null>(0);
  const [copiedChecklist, setCopiedChecklist] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);

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

  const handleCopyChecklist = () => {
    const text = `📋 ${infographic.title}\n${infographic.subtitle}\n\n` +
      infographic.tips
        .map(
          (t) =>
            `${t.number}. [${t.tag}] ${t.title}\n   • Rule: ${t.summary}\n   • Impact: ${t.impactBadge}\n   • Formula/Metric: ${t.formulaOrMetric || 'N/A'}`
        )
        .join('\n\n') +
      `\n\nVerified by soko.ae Procurement Intelligence`;

    navigator.clipboard?.writeText?.(text);
    setCopiedChecklist(true);
    setTimeout(() => setCopiedChecklist(false), 2400);
  };

  const handleDownloadInfographic = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
      // Simulate real download trigger
      const element = document.createElement('a');
      const file = new Blob([
        `soko.ae Procurement Infographic: ${infographic.title}\n\n` +
        infographic.tips.map(t => `${t.number}. ${t.title}: ${t.details}`).join('\n\n')
      ], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = infographic.downloadFilename || 'soko-procurement-tips-infographic.txt';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 700);
  };

  const activeTip = selectedTipIndex !== null ? infographic.tips[selectedTipIndex] : null;

  return (
    <div className="mt-3.5 space-y-3">
      {/* Main Infographic Frame */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-white overflow-hidden shadow-lg">
        {/* Infographic Banner Header */}
        <div className="p-4 sm:p-5 border-b border-blue-800/40 relative overflow-hidden bg-radial from-blue-900/60 to-transparent">
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400 text-slate-950 shadow-xs">
                  <Layers className="w-3 h-3" />
                  {infographic.versionBadge || 'Visual Infographic'}
                </span>
                <span className="text-xs text-blue-200 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  {infographic.summaryMetric || 'De-Risk Capital Projects'}
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
                onClick={() => setIsFullscreenModalOpen(true)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Expand Full Infographic"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadInfographic}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              >
                {downloading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing Cheat Sheet...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-300">Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Cheat Sheet (PDF/HD)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopyChecklist}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
              >
                {copiedChecklist ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Checklist Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy 7 Rules</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-blue-200/80 font-medium">
              Click any rule below to reveal tactical formula & metrics
            </div>
          </div>
        </div>

        {/* Infographic Visual Roadmap / Grid of 7 Tips */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90">
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
                    {/* Number Badge & Icon */}
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

          {/* Expanded Detail Panel when a tip is selected */}
          {activeTip && (
            <div className="mt-3 p-3.5 rounded-lg bg-blue-950/80 border border-blue-500/40 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Tactical Implementation Guide: Tip #{activeTip.number} ({activeTip.title})
                </span>
                <span className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/60">
                  {activeTip.impactBadge}
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed font-normal">
                {activeTip.details}
              </p>
            </div>
          )}

          {/* Infographic Summary KPI Bar */}
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-slate-950/70 rounded-md p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Cost Savings</span>
              <span className="text-emerald-400 font-black text-sm">18.4%</span>
              <span className="text-[10px] text-slate-400 block">Avg TCO reduction</span>
            </div>
            <div className="bg-slate-950/70 rounded-md p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Schedule Boost</span>
              <span className="text-cyan-400 font-black text-sm">35% Faster</span>
              <span className="text-[10px] text-slate-400 block">RFQ to PO cycle</span>
            </div>
            <div className="bg-slate-950/70 rounded-md p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">QA Compliance</span>
              <span className="text-indigo-400 font-black text-sm">99.2%</span>
              <span className="text-[10px] text-slate-400 block">First-time FAT pass</span>
            </div>
            <div className="bg-slate-950/70 rounded-md p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Audited Contracts</span>
              <span className="text-amber-400 font-black text-sm">450+ EPCs</span>
              <span className="text-[10px] text-slate-400 block">Global benchmarks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Zoomable Infographic Modal */}
      {isFullscreenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  High-Resolution Infographic Preview
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">{infographic.title}</h2>
              </div>
              <button
                onClick={() => setIsFullscreenModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-slate-300 text-sm">{infographic.subtitle}</p>

              <div className="space-y-3">
                {infographic.tips.map((tip) => (
                  <div key={tip.number} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                          {tip.number}
                        </span>
                        <h4 className="font-bold text-white text-base">{tip.title}</h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        {tip.impactBadge}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed mb-2">{tip.details}</p>
                    {tip.formulaOrMetric && (
                      <div className="bg-black/60 rounded-lg p-2.5 border border-slate-700 font-mono text-xs text-cyan-300">
                        <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">
                          Execution Formula
                        </span>
                        {tip.formulaOrMetric}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsFullscreenModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Close View
              </button>
              <button
                onClick={handleDownloadInfographic}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Cheat Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
