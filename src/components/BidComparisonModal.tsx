import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Award,
  Clock,
  DollarSign,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Download,
  AlertCircle,
  TrendingDown,
  Check,
  ChevronRight,
  Briefcase,
  Star,
  Printer,
  Layers,
  FileText,
  ArrowRight,
  ShieldAlert,
  Scale,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  BarChart3,
  RefreshCw,
  Percent,
  Calendar,
  Truck,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { OpportunityItem, OpportunityProposal } from '../types';

interface BidComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityItem;
  proposals: OpportunityProposal[];
  onAwardProposal: (proposalId: string) => void;
  onShortlistProposal: (proposalId: string) => void;
  onStartMessage: (userId: string, name: string) => void;
}

// Standard EPC Scope Checklist Items for Inclusion / Exclusion Analysis
interface ScopeItemConfig {
  key: string;
  label: string;
  category: 'logistics' | 'technical' | 'services' | 'compliance';
  defaultCostImpactAED: number;
  description: string;
}

const STANDARD_SCOPE_ITEMS: ScopeItemConfig[] = [
  {
    key: 'site_delivery',
    label: 'Site Delivery & Low-Bed Mobilization',
    category: 'logistics',
    defaultCostImpactAED: 18000,
    description: 'Flatbed haulage and statutory transit permits from warehouse/port directly to project site.',
  },
  {
    key: 'rigging_assist_crane',
    label: 'Rigging Crew & Boom Erection Assist Crane',
    category: 'logistics',
    defaultCostImpactAED: 25000,
    description: 'Auxiliary mobile hydraulic crane and certified rigger crew required for on-site lattice boom assembly.',
  },
  {
    key: 'commissioning_technician',
    label: 'Factory Certified Commissioning Technician',
    category: 'technical',
    defaultCostImpactAED: 15000,
    description: 'Manufacturer factory engineer present on site for 3-5 days to conduct startup FAT calibration.',
  },
  {
    key: 'spare_parts_kit',
    label: 'First 250-Hr Service Kit & Wear Consumables',
    category: 'services',
    defaultCostImpactAED: 12000,
    description: 'Filters, hydraulic seals, gaskets, drilling auger teeth, or preliminary replacement wear parts.',
  },
  {
    key: 'third_party_qa_mtc',
    label: 'Third-Party QA Inspection & MTC Certificate',
    category: 'compliance',
    defaultCostImpactAED: 8500,
    description: 'Independent inspection certificate from Bureau Veritas, TUV Rheinland, or SGS with statutory calibration.',
  },
  {
    key: 'operator_training',
    label: 'Operator Handover & Safety Induction',
    category: 'services',
    defaultCostImpactAED: 6000,
    description: 'On-site training sessions for contractor operators with certified equipment safety manuals.',
  },
  {
    key: 'extended_warranty',
    label: 'Extended Warranty (>12 Months Coverage)',
    category: 'compliance',
    defaultCostImpactAED: 35000,
    description: 'Comprehensive bumper-to-bumper or powertrain mechanical guarantee exceeding statutory 1-year terms.',
  },
  {
    key: 'operating_fluids_fuel',
    label: 'Initial Fuel & Hydraulic Oil Top-Up',
    category: 'services',
    defaultCostImpactAED: 7500,
    description: 'Full reservoir tank of hydraulic fluid, DEF oil, and fuel filled prior to site load testing.',
  },
];

export const BidComparisonModal: React.FC<BidComparisonModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  proposals: initialProposals,
  onAwardProposal,
  onShortlistProposal,
  onStartMessage,
}) => {
  // Active Tab: Matrix View, Scope Inclusion/Exclusion Analysis, Payment Terms, Formal Report
  const [activeTab, setActiveTab] = useState<'matrix' | 'scope' | 'payment' | 'report'>('matrix');

  // Proposal selection state within the modal
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>(() =>
    initialProposals.map((p) => p.id)
  );

  // Highlighting toggles
  const [highlightLowestPrice, setHighlightLowestPrice] = useState(true);
  const [highlightFastestLead, setHighlightFastestLead] = useState(true);
  const [showNormalizedPrices, setShowNormalizedPrices] = useState(true);

  if (!isOpen || initialProposals.length === 0) return null;

  // Filter proposals currently selected for tabulation
  const activeProposals = initialProposals.filter((p) =>
    selectedProposalIds.length > 0 ? selectedProposalIds.includes(p.id) : true
  );

  const toggleProposal = (id: string) => {
    if (selectedProposalIds.includes(id)) {
      if (selectedProposalIds.length <= 1) return; // Keep at least one
      setSelectedProposalIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedProposalIds((prev) => [...prev, id]);
    }
  };

  const selectAllProposals = () => {
    setSelectedProposalIds(initialProposals.map((p) => p.id));
  };

  // Helper calculation functions
  const lowestQuotedPrice = Math.min(...activeProposals.map((p) => p.totalPrice));
  const fastestLead = Math.min(...activeProposals.map((p) => p.leadTimeDays));
  const highestIcv = Math.max(...activeProposals.map((p) => p.icvScore || 75));

  // Determine Scope Inclusions & Exclusions for a Proposal
  const getProposalScopeStatus = (
    proposal: OpportunityProposal,
    scopeItem: ScopeItemConfig
  ): { status: 'included' | 'excluded' | 'conditional'; notes: string; estimatedCost: number } => {
    const incText = (proposal.inclusions || []).join(' ').toLowerCase();
    const excText = (proposal.exclusions || []).join(' ').toLowerCase();
    const notesText = (proposal.notes || '').toLowerCase();
    const itemKey = scopeItem.key;

    // Specific deterministic matching
    if (itemKey === 'site_delivery') {
      if (excText.includes('haulage') || excText.includes('ex-yard') || proposal.incoterms?.includes('FCA')) {
        return { status: 'excluded', notes: 'Excluded (Buyer arranges transport)', estimatedCost: 18000 };
      }
      return { status: 'included', notes: 'Included in DDP pricing', estimatedCost: 0 };
    }

    if (itemKey === 'rigging_assist_crane') {
      if (excText.includes('assist crane') || excText.includes('assembly crane')) {
        return { status: 'excluded', notes: 'Excluded (+AED 25,000 estimated)', estimatedCost: 25000 };
      }
      if (incText.includes('assembly') || incText.includes('self-erection') || incText.includes('turnkey')) {
        return { status: 'included', notes: 'Provided by supplier', estimatedCost: 0 };
      }
      return { status: 'conditional', notes: 'Requires site coordination', estimatedCost: 15000 };
    }

    if (itemKey === 'commissioning_technician') {
      if (incText.includes('technician') || incText.includes('commissioning')) {
        return { status: 'included', notes: 'Included on-site for 3-5 days', estimatedCost: 0 };
      }
      return { status: 'conditional', notes: 'Optional per diem available', estimatedCost: 10000 };
    }

    if (itemKey === 'spare_parts_kit') {
      if (incText.includes('service kit') || incText.includes('starter package')) {
        return { status: 'included', notes: 'Included (250-hr OEM package)', estimatedCost: 0 };
      }
      return { status: 'excluded', notes: 'Replenishment excluded', estimatedCost: 12000 };
    }

    if (itemKey === 'third_party_qa_mtc') {
      if (incText.includes('bureau veritas') || incText.includes('tuv') || incText.includes('sgs') || incText.includes('certificate')) {
        return { status: 'included', notes: 'Independent QA certification included', estimatedCost: 0 };
      }
      return { status: 'included', notes: 'Standard factory MTC provided', estimatedCost: 0 };
    }

    if (itemKey === 'operator_training') {
      if (incText.includes('operator') || incText.includes('training') || incText.includes('handover')) {
        return { status: 'included', notes: 'Included for contractor crew', estimatedCost: 0 };
      }
      return { status: 'conditional', notes: 'Provided upon request', estimatedCost: 4000 };
    }

    if (itemKey === 'extended_warranty') {
      const months = proposal.warrantyMonths || 12;
      if (months >= 24) {
        return { status: 'included', notes: `${months} Months comprehensive coverage`, estimatedCost: 0 };
      }
      return { status: 'conditional', notes: `${months} Months standard coverage`, estimatedCost: 15000 };
    }

    if (itemKey === 'operating_fluids_fuel') {
      if (excText.includes('fuel') || excText.includes('consumables')) {
        return { status: 'excluded', notes: 'Excluded by bidder', estimatedCost: 7500 };
      }
      return { status: 'excluded', notes: 'Contractor responsibility', estimatedCost: 7500 };
    }

    return { status: 'included', notes: 'Included in scope', estimatedCost: 0 };
  };

  // Calculate Scope Gap Adjustment and Normalized Price
  const getProposalNormalization = (proposal: OpportunityProposal) => {
    let scopeGapCost = 0;
    const missingScopes: string[] = [];

    STANDARD_SCOPE_ITEMS.forEach((item) => {
      const evalRes = getProposalScopeStatus(proposal, item);
      if (evalRes.status === 'excluded') {
        scopeGapCost += evalRes.estimatedCost;
        missingScopes.push(`${item.label} (est. AED ${evalRes.estimatedCost.toLocaleString()})`);
      } else if (evalRes.status === 'conditional') {
        scopeGapCost += evalRes.estimatedCost * 0.5;
      }
    });

    const normalizedPrice = proposal.normalizedPriceAED || proposal.totalPrice + scopeGapCost;
    return {
      basePrice: proposal.totalPrice,
      scopeGapCost,
      normalizedPrice,
      missingScopes,
    };
  };

  // Lowest Normalized Price
  const lowestNormalizedPrice = Math.min(
    ...activeProposals.map((p) => getProposalNormalization(p).normalizedPrice)
  );

  // Evaluate Payment Terms cash-flow rating
  const getPaymentTermsAnalysis = (p: OpportunityProposal) => {
    const adv = p.advancePaymentPct ?? (p.paymentTerms.toLowerCase().includes('advance') ? 20 : 0);
    const ret = p.retentionPct ?? (p.paymentTerms.toLowerCase().includes('retention') ? 10 : 5);
    const credit = p.creditDays ?? (p.paymentTerms.toLowerCase().includes('45') ? 45 : p.paymentTerms.toLowerCase().includes('60') ? 60 : 30);

    let cashFlowRating: 'Contractor-Favorable' | 'Balanced Commercial' | 'High Working Capital Demand';
    let ratingColor: string;
    let badgeText: string;

    if (adv <= 10 && credit >= 45 && ret >= 10) {
      cashFlowRating = 'Contractor-Favorable';
      ratingColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      badgeText = 'Low Capital Exposure';
    } else if (adv <= 20 && credit >= 30) {
      cashFlowRating = 'Balanced Commercial';
      ratingColor = 'bg-blue-100 text-blue-800 border-blue-200';
      badgeText = 'Standard Commercial';
    } else {
      cashFlowRating = 'High Working Capital Demand';
      ratingColor = 'bg-amber-100 text-amber-800 border-amber-200';
      badgeText = 'High Advance Required';
    }

    return {
      advancePct: adv,
      retentionPct: ret,
      creditDays: credit,
      cashFlowRating,
      ratingColor,
      badgeText,
    };
  };

  // Weighted Evaluation Scoring
  const getProposalCompositeScore = (p: OpportunityProposal) => {
    const norm = getProposalNormalization(p);
    const pay = getPaymentTermsAnalysis(p);

    // 1. Commercial Score (40% weight): Best normalized price gets 100
    const priceRatio = lowestNormalizedPrice / norm.normalizedPrice;
    const commercialScore = Math.min(100, Math.round(priceRatio * 100));

    // 2. Schedule & Lead Time Score (20% weight): Fastest lead gets 100
    const leadRatio = fastestLead / Math.max(1, p.leadTimeDays);
    const scheduleScore = Math.min(100, Math.round(leadRatio * 100));

    // 3. Scope Completeness (25% weight): Based on missing scopes
    const scopeScore = Math.max(50, 100 - norm.missingScopes.length * 15);

    // 4. Payment Terms & Terms (15% weight)
    const paymentScore = pay.advancePct === 0 ? 100 : pay.advancePct <= 10 ? 85 : pay.advancePct <= 20 ? 70 : 50;

    const totalWeightedScore = Math.round(
      commercialScore * 0.4 + scheduleScore * 0.2 + scopeScore * 0.25 + paymentScore * 0.15
    );

    return {
      totalWeightedScore,
      commercialScore,
      scheduleScore,
      scopeScore,
      paymentScore,
      isTopRanked: false, // determined below
    };
  };

  // Rank all active proposals
  const scoredProposals = activeProposals.map((p) => ({
    proposal: p,
    score: getProposalCompositeScore(p),
    normalization: getProposalNormalization(p),
    terms: getPaymentTermsAnalysis(p),
  }));

  scoredProposals.sort((a, b) => b.score.totalWeightedScore - a.score.totalWeightedScore);
  const recommendedBidder = scoredProposals[0];

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'Evaluation Metric',
      ...activeProposals.map((p) => `"${p.supplierCompany} (${p.supplierName})"`),
    ];

    const rows = [
      ['Contact Email & Phone', ...activeProposals.map((p) => `"${p.supplierEmail || 'deals@soko.ae'} | ${p.supplierPhone || '+971 4 000 0000'}"`)],
      ['Quoted Base Price', ...activeProposals.map((p) => `"${p.currency} ${p.totalPrice.toLocaleString()}"`)],
      ['Normalized Landed Cost', ...activeProposals.map((p) => `"${p.currency} ${getProposalNormalization(p).normalizedPrice.toLocaleString()}"`)],
      ['Scope Gap Adjustment', ...activeProposals.map((p) => `"+${p.currency} ${getProposalNormalization(p).scopeGapCost.toLocaleString()}"`)],
      ['Lead Time (Days)', ...activeProposals.map((p) => `${p.leadTimeDays} Calendar Days`)],
      ['Incoterms Delivery', ...activeProposals.map((p) => `"${p.incoterms || 'DDP Site'}"`)],
      ['Advance Payment %', ...activeProposals.map((p) => `${getPaymentTermsAnalysis(p).advancePct}%`)],
      ['Retention %', ...activeProposals.map((p) => `${getPaymentTermsAnalysis(p).retentionPct}%`)],
      ['Credit Days', ...activeProposals.map((p) => `${getPaymentTermsAnalysis(p).creditDays} Days`)],
      ['Warranty Duration', ...activeProposals.map((p) => `${p.warrantyMonths || 12} Months`)],
      ['UAE ICV Score', ...activeProposals.map((p) => `${p.icvScore || 80}%`)],
      ['Technical Compliance', ...activeProposals.map((p) => `${p.technicalComplianceRate || 98}%`)],
      ['Overall Weighted Score', ...activeProposals.map((p) => `${getProposalCompositeScore(p).totalWeightedScore} / 100`)],
      ['Status', ...activeProposals.map((p) => p.status.toUpperCase())],
    ];

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SOKO-Bid-Tabulation-${opportunity.rfqNumber}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:border-none">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:bg-white print:text-slate-900 print:border-b print:border-slate-300">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 print:border print:border-slate-300">
                <Scale className="w-3 h-3" />
                EPC Bid Tabulation & Award Dossier
              </span>
              <span className="text-xs text-blue-200 font-mono print:text-slate-600">
                {opportunity.rfqNumber} • {opportunity.category}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white print:text-slate-700">
                Budget: {opportunity.budgetRange || `AED ${opportunity.estimatedValue?.toLocaleString() || '1,450,000'}`}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight print:text-slate-900">
              Commercial Bid Tabulation & Proposal Comparison Matrix
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 print:text-slate-600">
              {opportunity.title} — Tabulating {activeProposals.length} shortlisted vendor proposals.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto print:hidden">
            <button
              onClick={handlePrintReport}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print or Save PDF Report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export Tabulation to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Proposal Selector Bar & Filter Toggle */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" />
              Compare Proposals ({activeProposals.length} of {initialProposals.length}):
            </span>

            {initialProposals.map((p) => {
              const isSelected = selectedProposalIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProposal(p.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded accent-blue-600 pointer-events-none"
                  />
                  <span>{p.supplierCompany}</span>
                  <span className="text-[10px] opacity-80">({p.currency} {(p.totalPrice / 1000).toFixed(0)}k)</span>
                </button>
              );
            })}

            {selectedProposalIds.length < initialProposals.length && (
              <button
                onClick={selectAllProposals}
                className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer ml-1"
              >
                Select All
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-600 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showNormalizedPrices}
                onChange={(e) => setShowNormalizedPrices(e.target.checked)}
                className="rounded accent-purple-600 cursor-pointer"
              />
              <span className="font-bold text-purple-900">Equalize Exclusions (Normalized Price)</span>
            </label>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-2 sm:gap-4 overflow-x-auto shrink-0 print:hidden">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Side-by-Side Tabulation Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('scope')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'scope'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Inclusions & Exclusions Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('payment')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'payment'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>3. Payment Terms & Cash Flow</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'report'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>4. Award Recommendation & Dossier</span>
          </button>
        </div>

        {/* Tab 1: Comprehensive Side-by-Side Tabulation Matrix */}
        {activeTab === 'matrix' && (
          <div className="flex-1 overflow-x-auto p-4 sm:p-6 space-y-4">
            {/* Top Insight Notification */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">General Contractor Commercial Finding:</span> Lowest base quote is{' '}
                <strong>
                  {activeProposals.find((p) => p.totalPrice === lowestQuotedPrice)?.supplierCompany} (AED {lowestQuotedPrice.toLocaleString()})
                </strong>
                . However, after adjusting for excluded assist crane and transport costs,{' '}
                <strong>
                  {recommendedBidder.proposal.supplierCompany}
                </strong>{' '}
                offers the best overall value with a composite score of{' '}
                <span className="font-extrabold text-blue-700">{recommendedBidder.score.totalWeightedScore}/100</span>.
              </div>
            </div>

            <table className="w-full border-collapse text-left text-xs min-w-[760px]">
              <thead>
                <tr>
                  <th className="w-52 p-3.5 bg-slate-100 font-bold text-slate-700 uppercase tracking-wider text-[11px] rounded-l-xl border border-slate-200">
                    Evaluation Parameters
                  </th>
                  {activeProposals.map((prop) => {
                    const isLowest = prop.totalPrice === lowestQuotedPrice;
                    const isTopRanked = prop.id === recommendedBidder.proposal.id;

                    return (
                      <th
                        key={prop.id}
                        className={`p-4 bg-slate-50 font-bold text-slate-900 border border-slate-200 min-w-[240px] ${
                          isTopRanked ? 'bg-purple-50/80 ring-2 ring-purple-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={prop.supplierAvatar}
                              alt={prop.supplierName}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-300 shrink-0"
                            />
                            <div>
                              <div className="font-black text-slate-900 text-sm leading-tight">
                                {prop.supplierCompany}
                              </div>
                              <div className="text-[11px] text-slate-500 font-normal">
                                {prop.supplierName}
                              </div>
                            </div>
                          </div>

                          {isTopRanked && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white">
                              RECOMMENDED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 font-normal">
                          <span className="text-slate-500">Submitted: {prop.submittedAt}</span>
                          <span
                            className={`font-bold uppercase text-[10px] ${
                              prop.status === 'awarded'
                                ? 'text-purple-700 font-black'
                                : prop.status === 'shortlisted'
                                ? 'text-blue-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {prop.status}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-700">
                {/* 1. Base Quoted Price */}
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900 bg-slate-50 border border-slate-200">
                    <div>Quoted Base Price</div>
                    <div className="text-[10px] text-slate-500 font-normal">Direct bidder proposal</div>
                  </td>
                  {activeProposals.map((prop) => {
                    const isLowest = prop.totalPrice === lowestQuotedPrice;
                    return (
                      <td
                        key={prop.id}
                        className={`p-3.5 border border-slate-200 ${
                          highlightLowestPrice && isLowest ? 'bg-emerald-50/60 font-black' : ''
                        }`}
                      >
                        <div className="text-base font-extrabold text-slate-900">
                          {prop.currency} {prop.totalPrice.toLocaleString()}
                        </div>
                        {isLowest && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded mt-0.5">
                            <Check className="w-3 h-3" /> Lowest Base Bid
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 2. Scope Gap Normalization */}
                <tr className="bg-purple-50/30 hover:bg-purple-50/50">
                  <td className="p-3.5 font-bold text-purple-900 bg-purple-50/60 border border-slate-200">
                    <div className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-purple-700" />
                      <span>Normalized Landed Cost</span>
                    </div>
                    <div className="text-[10px] text-purple-700 font-normal">Base + excluded scopes</div>
                  </td>
                  {activeProposals.map((prop) => {
                    const norm = getProposalNormalization(prop);
                    const isLowestNorm = norm.normalizedPrice === lowestNormalizedPrice;

                    return (
                      <td
                        key={prop.id}
                        className={`p-3.5 border border-slate-200 ${
                          isLowestNorm ? 'bg-emerald-50/80 font-black' : ''
                        }`}
                      >
                        <div className="text-sm font-black text-purple-950">
                          {prop.currency} {norm.normalizedPrice.toLocaleString()}
                        </div>
                        {norm.scopeGapCost > 0 ? (
                          <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">
                            +{prop.currency} {norm.scopeGapCost.toLocaleString()} scope gap adjustment
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                            ✓ Complete Turnkey Scope
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 3. Delivery Lead Time */}
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900 bg-slate-50 border border-slate-200">
                    <div>Lead Time to Jobsite</div>
                    <div className="text-[10px] text-slate-500 font-normal">Site arrival & readiness</div>
                  </td>
                  {activeProposals.map((prop) => {
                    const isFastest = prop.leadTimeDays === fastestLead;
                    return (
                      <td
                        key={prop.id}
                        className={`p-3.5 border border-slate-200 ${
                          highlightFastestLead && isFastest ? 'bg-blue-50/60 font-bold' : ''
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1 text-slate-900 text-sm">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{prop.leadTimeDays} Calendar Days</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Incoterms: <strong>{prop.incoterms || 'DDP Jobsite'}</strong>
                        </div>
                        {isFastest && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded mt-0.5">
                            ⚡ Fastest Mobilization
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 4. Payment Terms & Advance Exposure */}
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900 bg-slate-50 border border-slate-200">
                    <div>Payment Terms & Structure</div>
                    <div className="text-[10px] text-slate-500 font-normal">Cash-flow impact</div>
                  </td>
                  {activeProposals.map((prop) => {
                    const analysis = getPaymentTermsAnalysis(prop);
                    return (
                      <td key={prop.id} className="p-3.5 border border-slate-200 space-y-1">
                        <div className="font-semibold text-slate-900 text-xs">
                          {prop.paymentTerms}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${analysis.ratingColor}`}>
                            {analysis.badgeText}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {analysis.advancePct}% Adv / {analysis.retentionPct}% Ret
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* 5. Inclusions Summary */}
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900 bg-slate-50 border border-slate-200">
                    <div>Scope Inclusions</div>
                    <div className="text-[10px] text-slate-500 font-normal">Included in quote</div>
                  </td>
                  {activeProposals.map((prop) => (
                    <td key={prop.id} className="p-3.5 border border-slate-200 space-y-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {(prop.inclusions || []).length} Scope Items Included
                      </span>
                      <ul className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                        {(prop.inclusions || []).slice(0, 3).map((inc, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* 6. Exclusions Summary */}
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900 bg-slate-50 border border-slate-200">
                    <div>Critical Exclusions</div>
                    <div className="text-[10px] text-slate-500 font-normal">Contractor must absorb</div>
                  </td>
                  {activeProposals.map((prop) => (
                    <td key={prop.id} className="p-3.5 border border-slate-200 space-y-1">
                      {(prop.exclusions || []).length > 0 ? (
                        <>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            {(prop.exclusions || []).length} Excluded Scopes
                          </span>
                          <ul className="text-[11px] text-rose-700 space-y-0.5 pt-1">
                            {(prop.exclusions || []).map((exc, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <X className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{exc}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-medium">✓ No material exclusions declared</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* 7. ICV & Warranty */}
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900 bg-slate-50 border border-slate-200">
                    <div>ICV & Warranty</div>
                    <div className="text-[10px] text-slate-500 font-normal">Compliance parameters</div>
                  </td>
                  {activeProposals.map((prop) => (
                    <td key={prop.id} className="p-3.5 border border-slate-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-extrabold text-slate-900 text-sm">{prop.icvScore || 80}%</span>
                        <span className="text-[10px] text-slate-500">UAE Local Value</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Warranty: <strong>{prop.warrantyMonths || 12} Months</strong>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 8. Weighted Score & Decision */}
                <tr className="bg-slate-50/90 font-bold">
                  <td className="p-4 bg-slate-100 font-black text-slate-900 border border-slate-200 rounded-bl-xl">
                    <div>Decision & Award</div>
                    <div className="text-[10px] text-slate-500 font-normal">Weighted Composite</div>
                  </td>
                  {activeProposals.map((prop) => {
                    const score = getProposalCompositeScore(prop);
                    const isTop = prop.id === recommendedBidder.proposal.id;

                    return (
                      <td key={prop.id} className="p-4 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">Evaluation Score:</span>
                          <span className={`text-base font-black ${isTop ? 'text-purple-700' : 'text-slate-800'}`}>
                            {score.totalWeightedScore} / 100
                          </span>
                        </div>

                        {prop.status !== 'awarded' ? (
                          <button
                            onClick={() => onAwardProposal(prop.id)}
                            className={`w-full py-2 px-3 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                              isTop ? 'bg-purple-700 hover:bg-purple-800' : 'bg-slate-800 hover:bg-slate-900'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Award Tender Contract</span>
                          </button>
                        ) : (
                          <div className="w-full py-2 px-3 bg-purple-100 text-purple-900 rounded-lg text-xs font-black text-center border border-purple-300">
                            ✓ Contract Awarded
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          {prop.status !== 'shortlisted' && prop.status !== 'awarded' && (
                            <button
                              onClick={() => onShortlistProposal(prop.id)}
                              className="flex-1 py-1.5 px-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Shortlist
                            </button>
                          )}
                          <button
                            onClick={() => onStartMessage(prop.supplierId, prop.supplierName)}
                            className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Negotiate</span>
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Detailed Inclusions & Exclusions Scope Analysis */}
        {activeTab === 'scope' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Scope Normalization Banner */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 mb-2 inline-block">
                    Scope Gap Normalization Engine
                  </span>
                  <h3 className="text-base sm:text-lg font-bold">
                    Equalized Total Cost of Procurement Analysis
                  </h3>
                  <p className="text-xs text-purple-200 mt-1 max-w-2xl leading-relaxed">
                    A lower base bid does not always represent the lowest cost to the General Contractor. This matrix identifies excluded work packages (e.g. Assist Cranes, Low-Bed Transport, Commissioning, Fuel) and calculates normalized total costs.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/20 text-center min-w-[200px]">
                  <span className="text-[10px] uppercase font-bold text-purple-200 block">Lowest Landed Cost</span>
                  <span className="text-lg font-black text-amber-300 block">
                    {recommendedBidder.proposal.currency} {lowestNormalizedPrice.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-white">
                    {recommendedBidder.proposal.supplierCompany}
                  </span>
                </div>
              </div>
            </div>

            {/* Granular Scope Items Checklist Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Standard EPC Scope Matrix: Inclusions vs. Exclusions
                  </h4>
                  <p className="text-xs text-slate-500">
                    Cross-verification against standard SOKO commercial and site installation specifications.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Included
                  </span>
                  <span className="flex items-center gap-1 text-rose-700 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Excluded
                  </span>
                  <span className="flex items-center gap-1 text-amber-700 font-semibold">
                    <Info className="w-3.5 h-3.5" /> Conditional
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <th className="p-3 w-64">Required Scope Item</th>
                      {activeProposals.map((p) => (
                        <th key={p.id} className="p-3 text-center border-l border-slate-200 min-w-[180px]">
                          <div className="font-bold text-slate-900">{p.supplierCompany}</div>
                          <div className="text-[10px] font-mono text-slate-500">Base: {p.currency} {(p.totalPrice / 1000).toFixed(0)}k</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {STANDARD_SCOPE_ITEMS.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.label}</div>
                          <div className="text-[11px] text-slate-500">{item.description}</div>
                        </td>
                        {activeProposals.map((p) => {
                          const result = getProposalScopeStatus(p, item);
                          return (
                            <td key={p.id} className="p-3 text-center border-l border-slate-200">
                              {result.status === 'included' ? (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Included</span>
                                </div>
                              ) : result.status === 'excluded' ? (
                                <div className="space-y-0.5">
                                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800">
                                    <X className="w-3 h-3 text-rose-600" />
                                    <span>Excluded</span>
                                  </div>
                                  <div className="text-[10px] text-rose-700 font-semibold font-mono">
                                    +AED {result.estimatedCost.toLocaleString()}
                                  </div>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
                                  <Info className="w-3 h-3 text-amber-600" />
                                  <span>Conditional</span>
                                </div>
                              )}
                              <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{result.notes}</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scope Normalization Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeProposals.map((p) => {
                const norm = getProposalNormalization(p);
                const isBest = norm.normalizedPrice === lowestNormalizedPrice;

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-xl border p-4 shadow-2xs space-y-2.5 ${
                      isBest ? 'border-purple-500 ring-2 ring-purple-100' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{p.supplierCompany}</span>
                      {isBest && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-800">
                          Lowest Landed Cost
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Quoted Base Bid:</span>
                        <span className="font-semibold text-slate-800">{p.currency} {p.totalPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-rose-700 font-semibold">
                        <span>Estimated Missing Scope:</span>
                        <span>+{p.currency} {norm.scopeGapCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-900 pt-1.5 border-t border-slate-100 text-sm">
                        <span>Normalized Price to GC:</span>
                        <span className={isBest ? 'text-purple-700' : ''}>
                          {p.currency} {norm.normalizedPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {norm.missingScopes.length > 0 ? (
                      <div className="pt-2 border-t border-slate-100 text-[11px]">
                        <span className="font-bold text-slate-700 block mb-1">Items to Clarify / Absorb:</span>
                        <ul className="text-slate-600 space-y-0.5">
                          {norm.missingScopes.map((ms, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-rose-500">•</span>
                              <span>{ms}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-semibold">
                        ✓ Comprehensive turnkey quotation with no scope gaps.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Payment Terms & Cash Flow Analysis */}
        {activeTab === 'payment' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Header info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 mb-1 inline-block">
                  Working Capital Optimization
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Payment Structure & Commercial Cash Flow Exposure
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Evaluates upfront advance capital required, milestone retention, and payment credit terms across vendors.
                </p>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Standard FIDIC Red Book: 10% Adv / 10% Ret / Net 45 Days
              </div>
            </div>

            {/* Payment Term Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProposals.map((p) => {
                const terms = getPaymentTermsAnalysis(p);
                const advAmount = Math.round((p.totalPrice * terms.advancePct) / 100);
                const retAmount = Math.round((p.totalPrice * terms.retentionPct) / 100);
                const milestoneAmount = p.totalPrice - advAmount - retAmount;

                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{p.supplierCompany}</h4>
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${terms.ratingColor}`}>
                          {terms.cashFlowRating}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-mono">Total Quoted</span>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {p.currency} {p.totalPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Breakdown */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                        <span>Advance: {terms.advancePct}%</span>
                        <span>Milestones: {100 - terms.advancePct - terms.retentionPct}%</span>
                        <span>Retention: {terms.retentionPct}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 flex overflow-hidden">
                        <div
                          style={{ width: `${terms.advancePct}%` }}
                          className="bg-amber-400"
                          title={`Advance: AED ${advAmount.toLocaleString()}`}
                        />
                        <div
                          style={{ width: `${100 - terms.advancePct - terms.retentionPct}%` }}
                          className="bg-blue-600"
                          title={`Milestones: AED ${milestoneAmount.toLocaleString()}`}
                        />
                        <div
                          style={{ width: `${terms.retentionPct}%` }}
                          className="bg-purple-600"
                          title={`Retention: AED ${retAmount.toLocaleString()}`}
                        />
                      </div>
                    </div>

                    {/* Monetary Breakdown Table */}
                    <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-100">
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>Initial Advance Outlay:</span>
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {p.currency} {advAmount.toLocaleString()} ({terms.advancePct}%)
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <span>Milestone Deliveries:</span>
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {p.currency} {milestoneAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-600" />
                          <span>Warranty Retention:</span>
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {p.currency} {retAmount.toLocaleString()} ({terms.retentionPct}%)
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Invoice Credit Grace Period:</span>
                        <span className="font-extrabold text-blue-700">{terms.creditDays} Calendar Days</span>
                      </div>
                    </div>

                    {/* Payment Notes */}
                    <p className="text-[11px] text-slate-600 italic">
                      &quot;{p.paymentTerms}&quot;
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Evaluation Report & Formal Award Recommendation */}
        {activeTab === 'report' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 print:p-0">
            {/* Executive Recommendation Banner */}
            <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-purple-800 shadow-xl print:bg-white print:text-slate-900 print:border print:border-slate-400">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  Official Procurement Recommendation
                </span>
                <span className="text-xs text-purple-200 font-mono">
                  Report Ref: SOKO-TAB-{opportunity.rfqNumber}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-slate-900">
                Recommended for Tender Award: {recommendedBidder.proposal.supplierCompany}
              </h3>

              <p className="text-xs sm:text-sm text-purple-200 mt-2 max-w-3xl leading-relaxed print:text-slate-700">
                Following technical evaluation, scope inclusion normalization, and payment exposure review,{' '}
                <strong>{recommendedBidder.proposal.supplierCompany}</strong> achieves the highest composite score of{' '}
                <strong>{recommendedBidder.score.totalWeightedScore}/100</strong>. Their proposed normalized cost of{' '}
                <strong>{recommendedBidder.proposal.currency} {recommendedBidder.normalization.normalizedPrice.toLocaleString()}</strong>{' '}
                provides the best balance of turnkey scope coverage, fast {recommendedBidder.proposal.leadTimeDays}-day delivery, and{' '}
                {recommendedBidder.proposal.warrantyMonths || 24}-month manufacturer warranty.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-purple-800/80 text-xs">
                <div>
                  <span className="text-purple-300 block text-[10px] uppercase font-bold">Recommended Vendor</span>
                  <span className="font-extrabold text-white text-sm">{recommendedBidder.proposal.supplierName}</span>
                </div>
                <div>
                  <span className="text-purple-300 block text-[10px] uppercase font-bold">Contract Award Price</span>
                  <span className="font-extrabold text-amber-300 text-sm">
                    {recommendedBidder.proposal.currency} {recommendedBidder.proposal.totalPrice.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-purple-300 block text-[10px] uppercase font-bold">Lead Time / Delivery</span>
                  <span className="font-extrabold text-white text-sm">{recommendedBidder.proposal.leadTimeDays} Days to Site</span>
                </div>
                <div>
                  <span className="text-purple-300 block text-[10px] uppercase font-bold">UAE ICV Certification</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{recommendedBidder.proposal.icvScore || 91}% Audited</span>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 print:hidden">
                <button
                  onClick={() => onAwardProposal(recommendedBidder.proposal.id)}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Award className="w-4 h-4" />
                  <span>Execute Formal Award to {recommendedBidder.proposal.supplierCompany}</span>
                </button>
                <button
                  onClick={handlePrintReport}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Formal PDF Report</span>
                </button>
              </div>
            </div>

            {/* Scorecard Rankings Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden print:border print:border-slate-300">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">
                  Comprehensive Bid Tabulation Scorecard & Rankings
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  Weights: Commercial 40% | Scope 25% | Schedule 20% | Terms 15%
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="p-3">Rank & Bidder Company</th>
                    <th className="p-3 text-right">Base Quote</th>
                    <th className="p-3 text-right">Normalized Total</th>
                    <th className="p-3 text-center">Lead Time</th>
                    <th className="p-3 text-center">Scope Score (25%)</th>
                    <th className="p-3 text-center">Commercial (40%)</th>
                    <th className="p-3 text-center font-extrabold">Final Score</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {scoredProposals.map((item, idx) => {
                    const isWinner = idx === 0;
                    return (
                      <tr
                        key={item.proposal.id}
                        className={`hover:bg-slate-50 ${isWinner ? 'bg-purple-50/60 font-semibold' : ''}`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                isWinner ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{item.proposal.supplierCompany}</div>
                              <div className="text-[11px] text-slate-500">{item.proposal.supplierName}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {item.proposal.currency} {item.proposal.totalPrice.toLocaleString()}
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-purple-950">
                          {item.proposal.currency} {item.normalization.normalizedPrice.toLocaleString()}
                        </td>

                        <td className="p-3 text-center">
                          <span className="font-semibold text-slate-800">{item.proposal.leadTimeDays} Days</span>
                        </td>

                        <td className="p-3 text-center">
                          <span className="text-emerald-700 font-bold">{item.score.scopeScore}%</span>
                        </td>

                        <td className="p-3 text-center">
                          <span className="text-blue-700 font-bold">{item.score.commercialScore}%</span>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                              isWinner ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {item.score.totalWeightedScore} / 100
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <span className="text-[10px] font-bold uppercase text-slate-600">
                            {item.proposal.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Formal Approvals Sign-off Block */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 print:border-slate-400">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                General Contractor Governance & Audit Sign-Off
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium block">Prepared by (Procurement Lead):</span>
                  <div className="font-bold text-slate-900 text-xs">Tarek Mansour</div>
                  <div className="text-[11px] text-slate-500">Director of Sourcing & Pre-qualification</div>
                  <div className="text-[10px] text-emerald-700 font-mono pt-2">✓ Verified via SOKO Digital Signature</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium block">Technical Reviewer (Senior Estimator):</span>
                  <div className="font-bold text-slate-900 text-xs">Omar Qasim</div>
                  <div className="text-[11px] text-slate-500">Lead Civil & Mechanical Estimator</div>
                  <div className="text-[10px] text-emerald-700 font-mono pt-2">✓ Technical Compliance Audited</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium block">Approved for Award (Executive Director):</span>
                  <div className="font-bold text-slate-900 text-xs">Sarah Jenkins</div>
                  <div className="text-[11px] text-slate-500">Executive Project Director & General Contractor</div>
                  <div className="text-[10px] text-purple-700 font-mono pt-2">Pending Contract Signing</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 text-xs text-slate-500 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>UAE Federal Law No. 11 Commercial EPC Standard Compliant</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer transition-colors"
            >
              Close Tabulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
