import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Send,
  Eye,
  Download,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Filter,
  Layers,
  Phone,
  MessageSquare,
  Award,
  ChevronRight,
  Zap,
  Info,
  SlidersHorizontal,
  FileText,
  Radio,
  Share2,
  DollarSign,
  PieChart,
  Target,
  ArrowRight,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  OpportunityItem,
  UserProfile,
  CampaignAnalytics,
  ResponderTierDetail,
  GranularConversionMetrics,
  SupplierEngagementTimeMetrics,
} from '../types';
import { CAMPAIGN_ANALYTICS_DATA } from '../data/campaignAnalyticsData';

interface CampaignAnalyticsPanelProps {
  opportunities: OpportunityItem[];
  currentUser: UserProfile;
  initialSelectedCampaignId?: string | null;
  onStartMessageWith: (userId: string, name: string) => void;
  onOpenCreateOpportunity?: () => void;
}

export const CampaignAnalyticsPanel: React.FC<CampaignAnalyticsPanelProps> = ({
  opportunities,
  currentUser,
  initialSelectedCampaignId,
  onStartMessageWith,
  onOpenCreateOpportunity,
}) => {
  // Premium toggle state (defaults to true for premium experience, with toggle to test standard/teaser view)
  const [isPremiumActive, setIsPremiumActive] = useState<boolean>(
    currentUser.isPremium !== undefined ? currentUser.isPremium : true
  );

  // Filter & View State
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    initialSelectedCampaignId || 'aggregate'
  );
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [activeSubTab, setActiveSubTab] = useState<'funnel' | 'engagement' | 'tiers' | 'savings'>('funnel');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [reblastToast, setReblastToast] = useState<string | null>(null);

  // Available buyer campaigns
  const buyerCampaigns = opportunities.filter((o) => o.opportunityType !== 'market_deal');

  // Active Analytics Data
  const analytics: CampaignAnalytics =
    CAMPAIGN_ANALYTICS_DATA[selectedCampaignId] || CAMPAIGN_ANALYTICS_DATA['aggregate'];

  const conversion: GranularConversionMetrics = analytics.granularConversion || {
    totalTargeted: analytics.totalTargeted || 180,
    deliveredCount: analytics.deliveredCount || 176,
    deliveryRate: '97.8%',
    openedCount: analytics.openedCount || 142,
    openRate: '80.7%',
    downloadedSpecsCount: Math.round((analytics.openedCount || 142) * 0.76),
    specDownloadRate: '76.1%',
    proposalsCount: analytics.respondedCount || 14,
    bidConversionRate: '9.9%',
    shortlistedCount: 4,
    shortlistRate: '28.6%',
    awardedCount: 1,
    awardRate: '7.1%',
    benchmarkQuoteConversion: '5.2% GCC Industrial Avg',
    performanceDelta: '+50.0% vs Benchmark',
    conversionVelocity: {
      timeToFirstBid: '38 mins',
      timeToThreeBids: '2.5 hours',
      timeToCompetitiveClustering: '4.2 hours',
    },
  };

  const engagement: SupplierEngagementTimeMetrics = analytics.engagementTime || {
    avgEngagementTimeMinutes: 14.6,
    avgTimeOnTechnicalSpecs: 8.4,
    avgTimeOnPricingTerms: 4.2,
    avgTimeOnInspectionCompliance: 2.0,
    industryAvgEngagementTimeMinutes: 8.2,
    revisitRate: '68.4%',
    avgSessionsPerBidder: 2.8,
    channelTurnaround: [
      {
        channel: 'WhatsApp Business API Direct Blast',
        avgMinutes: 22,
        displayTurnaround: '22 mins avg turnaround',
        shareOfBids: '58% of all bids',
        reliabilityScore: 99.2,
      },
      {
        channel: 'SoKo Mobile In-App Push & Portal',
        avgMinutes: 48,
        displayTurnaround: '48 mins avg turnaround',
        shareOfBids: '26% of all bids',
        reliabilityScore: 96.5,
      },
      {
        channel: 'Priority Verified Supplier Email Digest',
        avgMinutes: 204,
        displayTurnaround: '3.4 hours avg turnaround',
        shareOfBids: '16% of all bids',
        reliabilityScore: 97.1,
      },
    ],
    hourlyEngagementDistribution: [
      { hour: '08:00 - 10:00', opens: 54, bids: 4, activityLevel: 'moderate' },
      { hour: '10:00 - 12:00', opens: 62, bids: 6, activityLevel: 'peak' },
      { hour: '12:00 - 14:00', opens: 14, bids: 1, activityLevel: 'low' },
      { hour: '14:00 - 16:30', opens: 38, bids: 3, activityLevel: 'peak' },
      { hour: '16:30 - 18:00', opens: 12, bids: 0, activityLevel: 'low' },
    ],
    timeToBidDistribution: [
      { range: '< 2 Hours', percentage: 36, bidsCount: 5, description: 'Direct in-stock yard inventory' },
      { range: '2 - 6 Hours', percentage: 43, bidsCount: 6, description: 'Mobilization logistics & route check' },
      { range: '6 - 24 Hours', percentage: 14, bidsCount: 2, description: 'Management credit signoff' },
      { range: '> 24 Hours', percentage: 7, bidsCount: 1, description: 'Custom lease-to-own structure' },
    ],
  };

  const responderTiers: ResponderTierDetail[] =
    analytics.responderTiers || CAMPAIGN_ANALYTICS_DATA['aggregate'].responderTiers || [];

  // Filter responders if tier filter is applied
  const filteredTiers =
    selectedTierFilter === 'all'
      ? responderTiers
      : responderTiers.filter((t) => t.tier === selectedTierFilter);

  // Trigger simulated exports
  const handleExportPDF = () => {
    setExportToast('Generating Executive Sourcing Telemetry Audit PDF (ISO 9001 & ICV Certified)...');
    setTimeout(() => {
      setExportToast('PDF Download Ready: SOKO_Enterprise_Campaign_Audit_Report.pdf (Downloaded)');
      setTimeout(() => setExportToast(null), 4000);
    }, 1200);
  };

  const handleExportCSV = () => {
    // Generate CSV content
    const rows = [
      ['Tier', 'Company', 'Contact', 'Quoted Price (AED)', 'Lead Time (Days)', 'ICV Score', 'Status', 'Response Time'],
      ...responderTiers.flatMap((t) =>
        t.responders.map((r) => [
          t.tier,
          r.companyName,
          r.contactName,
          r.quotedPrice.toString(),
          r.leadTimeDays.toString(),
          r.complianceTags.find((tag) => tag.includes('ICV')) || '90%+',
          r.status,
          r.responseTime,
        ])
      ),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SOKO_Responders_Breakdown_${selectedCampaignId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportToast('Responders CSV Matrix Downloaded Successfully!');
    setTimeout(() => setExportToast(null), 3500);
  };

  const handleReblast = () => {
    setReblastToast('Multi-channel push triggered! 34 unread suppliers notified via WhatsApp Business API.');
    setTimeout(() => setReblastToast(null), 4500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alerts */}
      {exportToast && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs border border-purple-500/40 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-purple-400 shrink-0 animate-bounce" />
            <span className="font-semibold">{exportToast}</span>
          </div>
          <button
            onClick={() => setExportToast(null)}
            className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {reblastToast && (
        <div className="p-4 bg-emerald-950 text-emerald-100 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs border border-emerald-500/50 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0 animate-spin" />
            <span className="font-semibold">{reblastToast}</span>
          </div>
          <button
            onClick={() => setReblastToast(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Campaign Analytics Dashboard Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Top Header Bar & Premium Badge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-amber-300 border border-amber-400/40 shadow-xs flex items-center gap-1.5 tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>ENTERPRISE PREMIUM ANALYTICS</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Account: {currentUser.company}
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Broadcast Synced
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              <span>Granular Campaign Analytics & Sourcing Telemetry</span>
            </h2>

            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Real-time deep intelligence for procurement leads: stage-by-stage conversion funnels, active supplier review duration, response turnaround by dispatch channel, and multi-tier contractor bid breakdowns.
            </p>
          </div>

          {/* Premium Mode Toggle (Allows user to inspect both unlocked premium view & standard teaser) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs">
              <button
                onClick={() => setIsPremiumActive(true)}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  isPremiumActive
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Unlock className="w-3 h-3 text-amber-300" />
                <span>Premium Unlocked</span>
              </button>
              <button
                onClick={() => setIsPremiumActive(false)}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  !isPremiumActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Standard Preview</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors"
                title="Download Executive Audit Report PDF"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">PDF Audit</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-bold border border-purple-200 cursor-pointer flex items-center gap-1.5 transition-colors"
                title="Export Responders Matrix to CSV"
              >
                <FileText className="w-3.5 h-3.5 text-purple-700" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* If standard view is selected, show Premium Locked Teaser Banner */}
        {!isPremiumActive && (
          <div className="p-6 bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-white rounded-3xl border border-purple-500/40 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1 w-fit">
                  <Lock className="w-3 h-3" />
                  Premium Enterprise Feature
                </span>
                <h3 className="text-lg font-black text-white">
                  Unlock Granular Campaign Analytics & Supplier Engagement Intelligence
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Standard accounts only view total impressions and quote totals. Upgrade to <strong>Enterprise GC Premium</strong> to unlock deep conversion rates, exact time spent by suppliers reviewing your technical specs, response speed heatmaps, and full responder breakdown by Company Tier (Global OEMs vs Regional vs SMEs).
                </p>
              </div>

              <button
                onClick={() => setIsPremiumActive(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg cursor-pointer flex items-center gap-2 shrink-0 transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Unlock Premium Suite (1-Click Demo)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-white/10">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">Stage-by-Stage Funnel</span>
                <p className="text-slate-300 text-[11px] mt-0.5">Dispatched → Read → BOQ Download → Sealed Quote conversion tracking.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">Supplier Engagement Time</span>
                <p className="text-slate-300 text-[11px] mt-0.5">Average minutes spent on engineering drawings & channel turnaround speed.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">Responder Tier Matrix</span>
                <p className="text-slate-300 text-[11px] mt-0.5">Categorized breakdown: Tier 1 OEMs vs Tier 2 Stockists vs Certified SMEs.</p>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Selector Bar & Timeframe Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
          {/* Campaign Selector Dropdown */}
          <div className="flex items-center gap-2 flex-1">
            <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider shrink-0 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-purple-600" />
              Campaign Scope:
            </span>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-purple-600 flex-1 max-w-md cursor-pointer shadow-2xs"
            >
              <option value="aggregate">All Procurement Campaigns (Enterprise Portfolio Aggregate)</option>
              {buyerCampaigns.map((camp) => (
                <option key={camp.id} value={camp.id}>
                  {camp.rfqNumber}: {camp.title.slice(0, 48)}...
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Scope Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500 uppercase text-[10px] shrink-0">Period:</span>
            {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                  timeframe === tf
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : tf === '90d' ? '90 Days' : 'All-Time'}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Navigation Sub-Tabs within Campaign Analytics */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
          <button
            onClick={() => setActiveSubTab('funnel')}
            className={`px-4 py-2.5 rounded-xl font-extrabold cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'funnel'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>1. Funnel & Conversion Rates</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeSubTab === 'funnel' ? 'bg-purple-900 text-purple-200' : 'bg-slate-200 text-slate-700'}`}>
              {conversion.bidConversionRate}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('engagement')}
            className={`px-4 py-2.5 rounded-xl font-extrabold cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'engagement'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>2. Supplier Engagement Time</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeSubTab === 'engagement' ? 'bg-purple-900 text-purple-200' : 'bg-slate-200 text-slate-700'}`}>
              {engagement.avgEngagementTimeMinutes} mins avg
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('tiers')}
            className={`px-4 py-2.5 rounded-xl font-extrabold cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'tiers'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>3. Responders by Company Tier</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeSubTab === 'tiers' ? 'bg-purple-900 text-purple-200' : 'bg-slate-200 text-slate-700'}`}>
              4 Tiers ({conversion.proposalsCount} Bids)
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('savings')}
            className={`px-4 py-2.5 rounded-xl font-extrabold cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'savings'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>4. Price Compression & Savings</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeSubTab === 'savings' ? 'bg-purple-900 text-purple-200' : 'bg-emerald-100 text-emerald-800'}`}>
              11.25% Saved
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SUBTAB 1: PERFORMANCE METRICS & STAGE-BY-STAGE CONVERSION RATES          */}
        {/* ========================================================================= */}
        {activeSubTab === 'funnel' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Conversion Benchmark Comparison Pill */}
            <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Target className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-sm block">
                    Bid Conversion Rate: <span className="text-purple-700">{conversion.bidConversionRate}</span>
                  </span>
                  <span className="text-slate-600 text-[11px]">
                    Industry Benchmark: {conversion.benchmarkQuoteConversion} • Your Performance: <strong className="text-emerald-700">{conversion.performanceDelta}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-900 font-bold">
                  ⚡ Velocity: First bid in {conversion.conversionVelocity.timeToFirstBid}
                </span>
              </div>
            </div>

            {/* 5-Stage Visual Sourcing Conversion Funnel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="uppercase text-[11px] text-slate-400 tracking-wider">
                  Multi-Stage Audience Deliverability & Conversion Pipeline
                </span>
                <span className="text-slate-500">100% Verified Regional Directory</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Stage 1: Targeted Audience */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                    <span>1. Targeted Blast</span>
                    <Radio className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {conversion.totalTargeted.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Multi-channel broadcast (WhatsApp, Push, Email)
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-slate-800 h-full rounded-full w-full" />
                  </div>
                </div>

                {/* Stage 2: Delivered Receipts */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold uppercase">
                    <span>2. Delivered</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700 flex items-baseline gap-1.5">
                    <span>{conversion.deliveredCount.toLocaleString()}</span>
                    <span className="text-xs font-mono font-bold text-emerald-600">({conversion.deliveryRate})</span>
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Confirmed device handshake
                  </div>
                  <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: conversion.deliveryRate }} />
                  </div>
                </div>

                {/* Stage 3: Opened & Read */}
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1.5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-blue-800 text-[10px] font-bold uppercase">
                    <span>3. Opened & Read</span>
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-700 flex items-baseline gap-1.5">
                    <span>{conversion.openedCount.toLocaleString()}</span>
                    <span className="text-xs font-mono font-bold text-blue-600">({conversion.openRate})</span>
                  </div>
                  <div className="text-[11px] text-blue-800">
                    Opened within 24m median
                  </div>
                  <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: conversion.openRate }} />
                  </div>
                </div>

                {/* Stage 4: BOQ & Specs Downloaded */}
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1.5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-indigo-800 text-[10px] font-bold uppercase">
                    <span>4. Specs Downloaded</span>
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-indigo-700 flex items-baseline gap-1.5">
                    <span>{conversion.downloadedSpecsCount.toLocaleString()}</span>
                    <span className="text-xs font-mono font-bold text-indigo-600">({conversion.specDownloadRate})</span>
                  </div>
                  <div className="text-[11px] text-indigo-800">
                    Technical drawings & BOQs inspected
                  </div>
                  <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: conversion.specDownloadRate }} />
                  </div>
                </div>

                {/* Stage 5: Sealed Quotes Submitted */}
                <div className="p-4 bg-purple-50/80 border border-purple-300 rounded-2xl space-y-1.5 relative overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between text-purple-900 text-[10px] font-bold uppercase">
                    <span>5. Quotes Submitted</span>
                    <Send className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-800 flex items-baseline gap-1.5">
                    <span>{conversion.proposalsCount.toLocaleString()}</span>
                    <span className="text-xs font-mono font-bold text-purple-600">({conversion.bidConversionRate})</span>
                  </div>
                  <div className="text-[11px] text-purple-800">
                    Firm pricing & lead times received
                  </div>
                  <div className="w-full bg-purple-100 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-purple-600 h-full rounded-full" style={{ width: '42%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Granular Funnel Analysis & Conversion Velocity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Funnel Drop-off Diagnostic */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-purple-600" />
                    <span>Conversion Drop-Off Diagnostic</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">GCC Diagnostic Model</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">Unreachable / Bounced Delivery</span>
                      <span className="text-[10px] text-slate-500">Temporary network off-grid or roaming</span>
                    </div>
                    <span className="font-mono font-bold text-slate-700">
                      {(conversion.totalTargeted - conversion.deliveredCount)} vendors ({((conversion.totalTargeted - conversion.deliveredCount) / conversion.totalTargeted * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">Delivered but Unopened</span>
                      <span className="text-[10px] text-slate-500">Unread WhatsApp or inbox overflow</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-700 block">
                        {(conversion.deliveredCount - conversion.openedCount)} vendors ({((conversion.deliveredCount - conversion.openedCount) / conversion.deliveredCount * 100).toFixed(1)}%)
                      </span>
                      <button
                        onClick={handleReblast}
                        className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer flex items-center gap-1 justify-end mt-0.5"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Re-Blast Unopened</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">Opened but No Spec Download</span>
                      <span className="text-[10px] text-slate-500">Scope out of current fleet or region</span>
                    </div>
                    <span className="font-mono font-bold text-slate-700">
                      {(conversion.openedCount - conversion.downloadedSpecsCount)} vendors ({((conversion.openedCount - conversion.downloadedSpecsCount) / conversion.openedCount * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/70 border border-purple-200">
                    <div>
                      <span className="font-bold text-purple-950 block">Specs Downloaded → Formal Quote Submitted</span>
                      <span className="text-[10px] text-purple-700">Commercial conversion efficiency</span>
                    </div>
                    <span className="font-mono font-black text-purple-900 text-sm">
                      {conversion.proposalsCount} Bids ({((conversion.proposalsCount / conversion.downloadedSpecsCount) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversion Velocity & Sourcing Milestones */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Conversion Velocity & Response Speed</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Top 5% in Region
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Time to First Commercial Quote</span>
                      <span className="font-mono font-bold text-emerald-700">{conversion.conversionVelocity.timeToFirstBid}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                    </div>
                    <span className="text-[10px] text-slate-500 block">Arrived via WhatsApp 1-click response sheet</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Time to Minimum 3 Competitive Bids</span>
                      <span className="font-mono font-bold text-indigo-700">{conversion.conversionVelocity.timeToThreeBids}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: '84%' }} />
                    </div>
                    <span className="text-[10px] text-slate-500 block">Enables immediate price benchmarking & negotiations</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Time to Market Equilibrium Clustering</span>
                      <span className="font-mono font-bold text-purple-700">{conversion.conversionVelocity.timeToCompetitiveClustering}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: '75%' }} />
                    </div>
                    <span className="text-[10px] text-slate-500 block">Sufficient quotes to establish verified market pricing floor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 2: SUPPLIER ENGAGEMENT TIME TELEMETRY                              */}
        {/* ========================================================================= */}
        {activeSubTab === 'engagement' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top KPI row for engagement time */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Mean Supplier Session</span>
                <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
                  <span>{engagement.avgEngagementTimeMinutes}</span>
                  <span className="text-xs text-purple-700 font-semibold">Minutes</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                  +78% vs Industry Benchmark (8.2m)
                </span>
              </div>

              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-purple-800 block">Spec & BOQ Review</span>
                <div className="text-2xl font-black text-purple-900 mt-1 flex items-baseline gap-1.5">
                  <span>{engagement.avgTimeOnTechnicalSpecs}</span>
                  <span className="text-xs text-purple-600 font-semibold">Minutes</span>
                </div>
                <span className="text-[11px] text-purple-700 mt-1 block">
                  57% of total session time
                </span>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Pricing & Terms Review</span>
                <div className="text-2xl font-black text-blue-900 mt-1 flex items-baseline gap-1.5">
                  <span>{engagement.avgTimeOnPricingTerms}</span>
                  <span className="text-xs text-blue-600 font-semibold">Minutes</span>
                </div>
                <span className="text-[11px] text-blue-700 mt-1 block">
                  Payment term calculation
                </span>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Supplier Revisit Rate</span>
                <div className="text-2xl font-black text-emerald-900 mt-1 flex items-baseline gap-1.5">
                  <span>{engagement.revisitRate}</span>
                </div>
                <span className="text-[11px] text-emerald-700 mt-1 block">
                  {engagement.avgSessionsPerBidder} avg sessions before bidding
                </span>
              </div>
            </div>

            {/* Turnaround Time by Channel & Hourly Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Channel Turnaround Speed */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-purple-600" />
                    <span>Response Turnaround Velocity by Channel</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">Multi-Channel API</span>
                </div>

                <div className="space-y-3 text-xs">
                  {engagement.channelTurnaround.map((ch, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          {idx === 0 ? (
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          ) : idx === 1 ? (
                            <Radio className="w-3.5 h-3.5 text-purple-600" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>{ch.channel}</span>
                        </span>
                        <span className="font-mono font-black text-slate-900">
                          {ch.displayTurnaround}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Share of bids: <strong className="text-purple-700">{ch.shareOfBids}</strong></span>
                        <span className="font-mono text-emerald-700 font-bold">{ch.reliabilityScore}% deliverability</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time-to-Bid Distribution Matrix */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Time-to-Bid Response Curve</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">Decision Latency</span>
                </div>

                <div className="space-y-3 text-xs">
                  {engagement.timeToBidDistribution.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">
                          {item.range}: <span className="font-normal text-slate-500">{item.description}</span>
                        </span>
                        <span className="font-mono font-bold text-purple-700">
                          {item.bidsCount} bids ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
                  <strong>Procurement Takeaway:</strong> 79% of total bids were received within 6 hours of initial blast dispatch, allowing immediate preliminary shortlisting before end-of-day.
                </div>
              </div>
            </div>

            {/* 24-Hour Supplier Hourly Activity Heatmap */}
            <div className="p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    24-Hour Supplier Engagement Hourly Heatmap (GST Timezone)
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Peak Response
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Moderate Activity
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                {engagement.hourlyEngagementDistribution.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all ${
                      slot.activityLevel === 'peak'
                        ? 'bg-purple-950/70 border-purple-500/60 shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                      {slot.hour}
                    </span>
                    <div className="text-lg font-black text-white mt-1">
                      {slot.opens} Opens
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 mt-1">
                      <span className="text-amber-300 font-bold">{slot.bids} Bids</span>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                          slot.activityLevel === 'peak'
                            ? 'bg-emerald-500/30 text-emerald-300'
                            : 'bg-indigo-500/20 text-indigo-300'
                        }`}
                      >
                        {slot.activityLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Strategic Timing Tip: Sourcing blasts dispatched between <strong>08:30 and 10:30 AM GST</strong> achieve 2.4x faster bid submission rates than afternoon posts.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 3: DETAILED BREAKDOWN OF RESPONDERS BY COMPANY TIER                */}
        {/* ========================================================================= */}
        {activeSubTab === 'tiers' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header info & Filter Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>Responders Categorized by Company Tier (4-Tier Enterprise Matrix)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Compare pricing premiums, promised delivery lead times, and ICV compliance scores across enterprise tiers.
                </p>
              </div>

              {/* Tier Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] shrink-0">Filter Tier:</span>
                <button
                  onClick={() => setSelectedTierFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                    selectedTierFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({responderTiers.reduce((acc, t) => acc + t.responderCount, 0)})
                </button>
                {responderTiers.map((tier) => (
                  <button
                    key={tier.tier}
                    onClick={() => setSelectedTierFilter(tier.tier)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors whitespace-nowrap ${
                      selectedTierFilter === tier.tier
                        ? 'bg-purple-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tier.tier} ({tier.responderCount})
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Company Tier Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {responderTiers.map((tier) => {
                const isSelected = selectedTierFilter === tier.tier;
                return (
                  <div
                    key={tier.tier}
                    onClick={() => setSelectedTierFilter(isSelected ? 'all' : tier.tier)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${tier.badgeColor}`}>
                        {tier.tier}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {tier.responderCount} Responders ({tier.percentageOfTotal}%)
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-xs leading-snug line-clamp-2">
                      {tier.tierLabel}
                    </h4>

                    {/* Metrics grid for this Tier */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Price Variance</span>
                        <span className={`font-black text-xs ${tier.priceVarianceVsBudget.includes('-') ? 'text-emerald-700' : 'text-purple-700'}`}>
                          {tier.priceVarianceVsBudget}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Lead Time</span>
                        <span className="font-black text-xs text-slate-900">
                          {tier.avgLeadTimeDays} Days
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">ICV Compliance</span>
                        <span className="font-black text-xs text-blue-700">
                          {tier.avgIcvScore}%
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">On-Time Delivery</span>
                        <span className="font-black text-xs text-emerald-700">
                          {tier.otdRate}%
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {tier.description}
                    </p>

                    <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-purple-700">
                      <span>Click to view {tier.responderCount} bidders</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Granular Responders List by Selected Tier */}
            <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>
                      {selectedTierFilter === 'all'
                        ? 'All Responding Suppliers across Tiers'
                        : `Responding Suppliers in ${selectedTierFilter}`}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Live bidding proposals with lead times, certifications, and direct one-click communication.
                  </p>
                </div>

                <span className="font-mono text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200">
                  {filteredTiers.reduce((acc, t) => acc + t.responders.length, 0)} Active Commercial Bids
                </span>
              </div>

              {/* Responder Row Items */}
              <div className="divide-y divide-slate-100 bg-white">
                {filteredTiers.map((tier) =>
                  tier.responders.map((resp) => (
                    <div
                      key={resp.id}
                      className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left side: Avatar, Name, Company, Tier & Tags */}
                      <div className="flex items-start gap-3.5 flex-1">
                        <img
                          src={resp.avatar}
                          alt={resp.contactName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900">
                              {resp.companyName}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tier.badgeColor}`}>
                              {tier.tier}
                            </span>
                            {resp.status === 'shortlisted' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                <Award className="w-3 h-3 text-emerald-700" />
                                Shortlisted Bid
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                            <span>Contact: <strong>{resp.contactName}</strong></span>
                            <span>•</span>
                            <span>Response: <strong>{resp.responseTime}</strong></span>
                            <span>•</span>
                            <span>Lead time: <strong className="text-slate-900">{resp.leadTimeDays} business days</strong></span>
                          </div>

                          {/* Compliance Tags */}
                          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                            {resp.complianceTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Pricing & Actions */}
                      <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="text-left lg:text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Binding Quotation</span>
                          <div className="text-lg font-black text-slate-900">
                            {resp.currency} {resp.quotedPrice.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-slate-500 block">{resp.paymentTerms}</span>
                        </div>

                        {/* Communication Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onStartMessageWith(resp.supplierId, resp.companyName)}
                            className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-bold border border-purple-200 cursor-pointer flex items-center gap-1.5 transition-colors"
                            title="Chat on SoKo Procurement Messaging"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                            <span>Chat</span>
                          </button>

                          {resp.phone && (
                            <a
                              href={`tel:${resp.phone}`}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors"
                              title="Direct Phone Call"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-600" />
                              <span className="hidden sm:inline">Call</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 4: COMPETITIVE PRICE COMPRESSION & COST SAVINGS                    */}
        {/* ========================================================================= */}
        {activeSubTab === 'savings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Savings Banner */}
            <div className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl border border-purple-500/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-300 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Market Competition Yield Analysis
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Competitive Price Compression: AED {analytics.priceCompressionSavings?.savingsAmount.toLocaleString() || '175,000'} Saved
                  </h3>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    By broadcasting this requirement across multiple qualified tiers rather than relying on single-source vendor requests, procurement achieved a <strong>{analytics.priceCompressionSavings?.savingsPercentage || '11.25%'}</strong> discount below initial ceiling budget.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 border border-white/10 text-center shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Budget Saved</span>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">
                    {analytics.priceCompressionSavings?.currency || 'AED'} {analytics.priceCompressionSavings?.savingsAmount.toLocaleString() || '175,000'}
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold block mt-0.5">
                    {analytics.priceCompressionSavings?.savingsPercentage || '11.25%'} cost compression
                  </span>
                </div>
              </div>

              {/* Price Spread Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-white/10">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Highest Quoted Bid</span>
                  <span className="text-base font-black text-rose-300 block mt-0.5">
                    AED {analytics.priceCompressionSavings?.highestQuote.toLocaleString() || '1,555,000'}
                  </span>
                  <span className="text-[10px] text-slate-400">High OEM dealer ceiling</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Median Market Benchmark</span>
                  <span className="text-base font-black text-amber-300 block mt-0.5">
                    AED 1,440,000
                  </span>
                  <span className="text-[10px] text-slate-400">Regional equilibrium rate</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">Winning Shortlisted Bid</span>
                  <span className="text-base font-black text-emerald-300 block mt-0.5">
                    AED {analytics.priceCompressionSavings?.winningQuote.toLocaleString() || '1,380,000'}
                  </span>
                  <span className="text-[10px] text-emerald-200">Andes Heavy Civil Equipment</span>
                </div>
              </div>
            </div>

            {/* Recommended Bidder Match Score Card */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Top Algorithmic Bid Recommendation
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Multi-criteria scoring: 35% Price + 25% Lead Time + 25% ICV & Certifications + 15% Response Speed
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-black text-xs rounded-xl border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  98.2 / 100 Score
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"
                    alt="Mateo Morales"
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/30"
                  />
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-900">
                      Andes Heavy Civil Equipment & Fleet UAE
                    </h5>
                    <p className="text-xs text-slate-500">
                      Mateo Morales • Lead time: 4 days • ICV: 98.8% • ISO 9001
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      2021 Sany SCC800TB 80-Ton Crawler Crane (2,100 verified ECM hours with full DCL test pass)
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Recommended Award Price</span>
                  <div className="text-xl font-black text-slate-900">AED 1,380,000</div>
                  <span className="text-[10px] font-bold text-emerald-700 block">AED 175,000 below ceiling</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => onStartMessageWith('sup_04', 'Andes Heavy Civil Equipment & Fleet UAE')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Initiate Award Discussion</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
