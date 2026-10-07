import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Search,
  Filter,
  Clock,
  MapPin,
  DollarSign,
  FileText,
  CheckCircle2,
  Send,
  PlusCircle,
  Building2,
  Award,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  Tag,
  Briefcase,
  Users,
  Bell,
  Sparkles,
  Zap,
  BarChart3,
  Eye,
  TrendingUp,
  Radio,
  Phone,
  ArrowRight,
  ExternalLink,
  Layers,
  ShoppingBag,
  Truck,
  Percent,
  BadgePercent,
  Wrench,
  Share2,
  Calendar,
  Compass,
  ArrowUpRight,
  Download,
  RefreshCw,
  SlidersHorizontal,
  Activity,
  CheckCircle,
  Scale,
  Coins,
  Paintbrush,
  HardHat,
  Hammer,
} from 'lucide-react';
import { OpportunityItem, OpportunityProposal, UserProfile, CampaignAnalytics } from '../types';
import { CampaignAnalyticsPanel } from './CampaignAnalyticsPanel';
import { BidComparisonModal } from './BidComparisonModal';
import {
  OPPORTUNITY_12_CATEGORIES,
  CategoryBlockItem,
  generateCategoryOpportunities,
} from '../data/categoryOpportunities';

export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; activeGradient: string; iconBg: string; ring: string }
> = {
  manpower: {
    bg: 'bg-indigo-50/80',
    text: 'text-indigo-900',
    border: 'border-indigo-200',
    activeGradient: 'from-indigo-950 via-slate-900 to-indigo-900',
    iconBg: 'bg-indigo-600 text-white',
    ring: 'ring-indigo-400',
  },
  scrap: {
    bg: 'bg-amber-50/80',
    text: 'text-amber-900',
    border: 'border-amber-200',
    activeGradient: 'from-amber-950 via-slate-900 to-amber-900',
    iconBg: 'bg-amber-600 text-white',
    ring: 'ring-amber-400',
  },
  rental: {
    bg: 'bg-orange-50/80',
    text: 'text-orange-900',
    border: 'border-orange-200',
    activeGradient: 'from-orange-950 via-slate-900 to-orange-900',
    iconBg: 'bg-orange-600 text-white',
    ring: 'ring-orange-400',
  },
  tile_subcon: {
    bg: 'bg-emerald-50/80',
    text: 'text-emerald-900',
    border: 'border-emerald-200',
    activeGradient: 'from-emerald-950 via-slate-900 to-emerald-900',
    iconBg: 'bg-emerald-600 text-white',
    ring: 'ring-emerald-400',
  },
  block_subcon: {
    bg: 'bg-slate-100/90',
    text: 'text-slate-900',
    border: 'border-slate-300',
    activeGradient: 'from-slate-950 via-slate-900 to-zinc-900',
    iconBg: 'bg-slate-700 text-white',
    ring: 'ring-slate-400',
  },
  mep_subcon: {
    bg: 'bg-cyan-50/80',
    text: 'text-cyan-900',
    border: 'border-cyan-200',
    activeGradient: 'from-cyan-950 via-slate-900 to-blue-950',
    iconBg: 'bg-cyan-600 text-white',
    ring: 'ring-cyan-400',
  },
  plaster_paint: {
    bg: 'bg-rose-50/80',
    text: 'text-rose-900',
    border: 'border-rose-200',
    activeGradient: 'from-rose-950 via-slate-900 to-rose-900',
    iconBg: 'bg-rose-600 text-white',
    ring: 'ring-rose-400',
  },
  waterproofing: {
    bg: 'bg-sky-50/80',
    text: 'text-sky-900',
    border: 'border-sky-200',
    activeGradient: 'from-sky-950 via-slate-900 to-blue-900',
    iconBg: 'bg-sky-600 text-white',
    ring: 'ring-sky-400',
  },
  steel_rebar: {
    bg: 'bg-purple-50/80',
    text: 'text-purple-900',
    border: 'border-purple-200',
    activeGradient: 'from-purple-950 via-slate-900 to-indigo-950',
    iconBg: 'bg-purple-600 text-white',
    ring: 'ring-purple-400',
  },
  concrete_works: {
    bg: 'bg-stone-100/90',
    text: 'text-stone-900',
    border: 'border-stone-300',
    activeGradient: 'from-stone-950 via-slate-900 to-stone-900',
    iconBg: 'bg-stone-700 text-white',
    ring: 'ring-stone-400',
  },
  fitout_joinery: {
    bg: 'bg-teal-50/80',
    text: 'text-teal-900',
    border: 'border-teal-200',
    activeGradient: 'from-teal-950 via-slate-900 to-emerald-950',
    iconBg: 'bg-teal-600 text-white',
    ring: 'ring-teal-400',
  },
  earthworks: {
    bg: 'bg-red-50/80',
    text: 'text-red-900',
    border: 'border-red-200',
    activeGradient: 'from-red-950 via-slate-900 to-amber-950',
    iconBg: 'bg-red-600 text-white',
    ring: 'ring-red-400',
  },
};

export const renderCategoryIcon = (iconName: string, className = 'w-5 h-5') => {
  switch (iconName) {
    case 'Users':
      return <Users className={className} />;
    case 'Coins':
      return <Coins className={className} />;
    case 'Truck':
      return <Truck className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Paintbrush':
      return <Paintbrush className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Hammer':
      return <Hammer className={className} />;
    case 'HardHat':
      return <HardHat className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Activity':
      return <Activity className={className} />;
    default:
      return <Tag className={className} />;
  }
};

interface OpportunitiesViewProps {
  opportunities: OpportunityItem[];
  onUpdateOpportunities?: (opportunities: OpportunityItem[]) => void;
  currentUser: UserProfile;
  onOpenCreateOpportunity?: () => void;
  onOpenSubmitProposal?: (opportunity: OpportunityItem) => void;
  onStartMessageWith: (userId: string, name: string) => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  opportunities,
  onUpdateOpportunities,
  currentUser,
  onOpenCreateOpportunity,
  onOpenSubmitProposal,
  onStartMessageWith,
}) => {
  // 12 Category Selection State: only when a category is selected are results published!
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const activeCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return OPPORTUNITY_12_CATEGORIES.find((c) => c.id === selectedCategoryId) || null;
  }, [selectedCategoryId]);

  const totalCategoryOppsCount = useMemo(() => {
    return OPPORTUNITY_12_CATEGORIES.reduce((acc, c) => acc + c.count, 0);
  }, []);

  // Navigation tabs: Marketplace Deals (Available to Buy) vs Buyer Sourcing Campaigns (1-Click RFP Blasts) vs My Ad Insights Center vs Granular Campaign Analytics
  const [mainTab, setMainTab] = useState<'all' | 'deals' | 'campaigns' | 'insights' | 'analytics'>('all');
  const [selectedCampaignForAnalytics, setSelectedCampaignForAnalytics] = useState<string | null>(null);
  const [dealCategoryFilter, setDealCategoryFilter] = useState<'all' | 'machinery' | 'bulk_steel' | 'surplus_material' | 'special_price'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTradeCategory, setSelectedTradeCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closing-soon' | 'awarded'>('all');

  // Detailed Dashboard Telemetry State (Daily, Weekly, Monthly)
  const [dashboardTimeframe, setDashboardTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [campaignTableStatusFilter, setCampaignTableStatusFilter] = useState<'all' | 'open' | 'awarded'>('all');
  const [reblastToast, setReblastToast] = useState<string | null>(null);
  const [exportToast, setExportToast] = useState<string | null>(null);

  // Interactive Modals
  const [showCampaignBlastModal, setShowCampaignBlastModal] = useState(false);
  const [selectedOppForInsights, setSelectedOppForInsights] = useState<OpportunityItem | null>(null);
  const [selectedDealForOffer, setSelectedDealForOffer] = useState<OpportunityItem | null>(null);
  const [selectedDealForInspection, setSelectedDealForInspection] = useState<OpportunityItem | null>(null);

  // Proposal submission for suppliers
  const [pricingModalOpp, setPricingModalOpp] = useState<OpportunityItem | null>(null);
  const [quoteUnitPrice, setQuoteUnitPrice] = useState<number>(0);
  const [quoteLeadTime, setQuoteLeadTime] = useState<number>(7);
  const [quotePaymentTerms, setQuotePaymentTerms] = useState<string>('Net 30 days');
  const [quoteNotes, setQuoteNotes] = useState<string>('');

  // Purchase Offer state
  const [offerAmount, setOfferAmount] = useState<number>(0);
  const [offerPaymentTerms, setOfferPaymentTerms] = useState('Escrow deposit upon yard inspection');
  const [offerNotes, setOfferNotes] = useState('');

  // Inspection Booking state
  const [inspectionDate, setInspectionDate] = useState('Tomorrow at 10:00 AM');
  const [inspectionEngineer, setInspectionEngineer] = useState('Karim Farouq (QA/QC Engineer)');
  const [inspectionSuccessToast, setInspectionSuccessToast] = useState<string | null>(null);

  // Expanded Proposals Drawer
  const [expandedOppId, setExpandedOppId] = useState<string | null>(null);

  // Side-by-Side Bid Comparison Table state
  const [comparisonModalOpp, setComparisonModalOpp] = useState<OpportunityItem | null>(null);
  const [selectedProposalIdsForCompare, setSelectedProposalIdsForCompare] = useState<Record<string, string[]>>({});

  const toggleProposalSelection = (oppId: string, propId: string) => {
    setSelectedProposalIdsForCompare((prev) => {
      const cur = prev[oppId] || [];
      const updated = cur.includes(propId) ? cur.filter((id) => id !== propId) : [...cur, propId];
      return { ...prev, [oppId]: updated };
    });
  };

  // Notification Banner
  const [blastSuccessBanner, setBlastSuccessBanner] = useState<{
    show: boolean;
    title: string;
    count: number;
    category: string;
  } | null>(null);

  // New Sourcing Campaign Form State
  const [newCampaign, setNewCampaign] = useState({
    campaignType: 'special_machine' as 'special_machine' | 'bulk_material' | 'subcontract_labor',
    title: '',
    category: 'Heavy Plant & Crane Rentals',
    quantity: '',
    targetPrice: '',
    budgetRange: 'AED 1,200,000 - AED 1,600,000',
    location: 'Dubai South Project Site / Abu Dhabi Delivery, UAE',
    deadline: 'Nov 15, 2026',
    description: '',
    specifications: '',
    paymentTerms: '30% advance on inspection, 70% upon site delivery and load test',
    issuingLead: 'Tarek Mansour (Procurement Lead)',
  });

  const categorySupplierCounts: Record<string, number> = {
    'Heavy Plant & Crane Rentals': 180,
    'Structural Steel & Rebar': 145,
    'Manpower & Labor Supply': 150,
    'Ready-Mix Concrete & Cement': 85,
    'MEP & Electrical Subcontractors': 94,
    'Scaffolding & Formwork Systems': 58,
    'Roads & Highways': 74,
    'Building Construction': 120,
    'Infrastructure & Utilities': 88,
    'Civil & Earthworks': 66,
  };

  const tradeCategories = [
    'All',
    'Heavy Plant & Crane Rentals',
    'Structural Steel & Rebar',
    'Manpower & Labor Supply',
    'Ready-Mix Concrete & Cement',
    'MEP & Electrical Subcontractors',
    'Building Construction',
    'Infrastructure & Utilities',
    'Roads & Highways',
    'Civil & Earthworks',
  ];

  // Presets for 1-Click RFP blast creation
  const handleLoadSpecialMachinePreset = () => {
    setNewCampaign({
      campaignType: 'special_machine',
      title: 'Urgent Requirement: Purchase of Specialized 80-Ton Crawler Crane or Rotary Piling Rig',
      category: 'Heavy Plant & Crane Rentals',
      quantity: '1 Heavy Unit (Outright Purchase or 12-Month Lease-to-Own)',
      targetPrice: 'AED 1,400,000 ceiling budget',
      budgetRange: 'AED 1,200,000 - AED 1,650,000',
      location: 'Dubai South Project Site (Plot C4 Infrastructure), UAE',
      deadline: 'Nov 15, 2026',
      description: 'Apex GC requires urgent acquisition of a heavy foundation rotary piling rig (Bauer BG28 / Casagrande or equivalent) or 80-100T lattice boom crawler crane for ongoing deep secant piling works. 1-click broadcast will reach 180 verified equipment suppliers.',
      specifications: 'Preferred Models: Bauer BG 24/28, Casagrande B250, Soilmec SR-70, or 80T Sumitomo/Sany\nYear of Manufacture: 2019 or newer, under 4,500 certified engine hours\nMust include full interlocking kelly bar (4x11m) and auger/bucket kit\nThird-party mechanical inspection and hydraulic pressure test signoff\nMobilization within 10 days to Dubai South project plot',
      paymentTerms: '30% advance on inspection signoff, 70% bank wire upon site delivery',
      issuingLead: 'Tarek Mansour (Procurement Lead)',
    });
  };

  const handleLoadBulkSteelPreset = () => {
    setNewCampaign({
      campaignType: 'bulk_material',
      title: 'Urgent Bulk Lot: 2,500 MT BS 4449 Grade 500B Deformed Rebar for Raft Pour',
      category: 'Structural Steel & Rebar',
      quantity: '2,500 Metric Tons (Assorted 16mm, 20mm, 25mm, 32mm)',
      targetPrice: 'AED 2,850 / MT delivered',
      budgetRange: 'AED 6,800,000 - AED 7,500,000',
      location: 'Dubai Creek Harbour Site (Plot B2), UAE',
      deadline: 'Nov 05, 2026',
      description: 'Immediate bulk requirement for high-yield deformed steel rebar for massive monolithic raft concrete pour. SOKO 1-click blast notified 145 certified rebar manufacturers and stockists across UAE and GCC.',
      specifications: 'BS 4449:2005 Grade 500B High Yield Deformed Rebar with MTC\nPrimary melt origin from approved regional manufacturers (Emirates Steel or equivalent)\nDCL conformity tags on each 2-ton bundle\nStaggered JIT trailer deliveries over 30 days\nCertified weighbridge slips required per shipment',
      paymentTerms: 'Net 45 against certified delivery notes and laboratory core tests',
      issuingLead: 'Tarek Mansour (Director of Sourcing)',
    });
  };

  const handleLoadManpowerPreset = () => {
    setNewCampaign({
      campaignType: 'subcontract_labor',
      title: 'Requirement for 100 Manpower Helpers & Shuttering Carpenters at Dubai Creek Site',
      category: 'Manpower & Labor Supply',
      quantity: '100 nos (60 Shuttering Carpenters, 40 General Helpers)',
      targetPrice: 'AED 18.00 / hr per helper',
      budgetRange: 'AED 180,000 - AED 210,000 / month',
      location: 'Dubai Creek Harbour Corridor (Plot B2), UAE',
      deadline: 'Nov 10, 2026',
      description: 'Urgent deployment of 100 certified manpower helpers and shuttering carpenters for ongoing structural concrete pour at our Dubai Creek Harbour site. SOKO 1-click blast reaches 150 verified labor suppliers.',
      specifications: 'Valid UAE Trade License with Manpower Supply activity code\n100% Wage Protection System (WPS) verified payroll records\nAll personnel equipped with standard PPE and valid safety induction\nMobilization within 7 business days to Dubai site\nDaily site bus transportation provided by supplier',
      paymentTerms: 'Bi-weekly timesheet verification, Net 30 days via WPS',
      issuingLead: 'Tarek Mansour (Procurement Lead)',
    });
  };

  // Category-specific opportunities:
  // Combines canonical generated opportunities matching exact category counts with any matching user/prop opportunities
  const categoryOpportunitiesList = useMemo(() => {
    if (!selectedCategoryId || !activeCategory) return [];

    const generated = generateCategoryOpportunities(selectedCategoryId);

    const matchingProps = opportunities.filter((opp) => {
      const titleLower = opp.title.toLowerCase();
      const catLower = (opp.category || '').toLowerCase();
      const campCatLower = (opp.campaignCategory || '').toLowerCase();
      const nameLower = activeCategory.name.toLowerCase();
      return (
        catLower.includes(nameLower) ||
        campCatLower.includes(nameLower) ||
        titleLower.includes(nameLower) ||
        activeCategory.tags.some((tag) =>
          titleLower.includes(tag.toLowerCase()) || catLower.includes(tag.toLowerCase())
        )
      );
    });

    const propIds = new Set(matchingProps.map((m) => m.id));
    return [...matchingProps, ...generated.filter((g) => !propIds.has(g.id))];
  }, [selectedCategoryId, activeCategory, opportunities]);

  // Filter Logic: only populated when a category is selected!
  const filteredOpportunities = useMemo(() => {
    if (!selectedCategoryId) return [];

    return categoryOpportunitiesList.filter((opp) => {
      // Tab filter
      if (mainTab === 'deals' && opp.opportunityType !== 'market_deal') return false;
      if (mainTab === 'campaigns' && opp.opportunityType === 'market_deal') return false;
      if (mainTab === 'insights') {
        const isMyCompany = opp.issuerCompany === currentUser.company || opp.issuerName === currentUser.name;
        if (!isMyCompany) return false;
      }

      // Deal Category filter (when in Deals or All)
      if (dealCategoryFilter !== 'all' && opp.opportunityType === 'market_deal') {
        if (opp.dealCategory !== dealCategoryFilter) return false;
      }

      // Trade category filter
      if (selectedTradeCategory !== 'All' && opp.category !== selectedTradeCategory) return false;

      // Status filter
      if (statusFilter !== 'all' && opp.status !== statusFilter) return false;

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          opp.title.toLowerCase().includes(q) ||
          opp.rfqNumber.toLowerCase().includes(q) ||
          opp.issuerCompany.toLowerCase().includes(q) ||
          opp.location.toLowerCase().includes(q) ||
          opp.description.toLowerCase().includes(q) ||
          (opp.specifications && opp.specifications.some((s) => s.toLowerCase().includes(q)));
        if (!match) return false;
      }

      return true;
    });
  }, [
    selectedCategoryId,
    categoryOpportunitiesList,
    mainTab,
    dealCategoryFilter,
    selectedTradeCategory,
    statusFilter,
    searchTerm,
    currentUser.company,
    currentUser.name,
  ]);

  // Stats for current category
  const currentCategoryDealsCount = useMemo(() => {
    return categoryOpportunitiesList.filter((o) => o.opportunityType === 'market_deal').length;
  }, [categoryOpportunitiesList]);

  const currentCategoryCampaignsCount = useMemo(() => {
    return categoryOpportunitiesList.filter((o) => o.opportunityType !== 'market_deal').length;
  }, [categoryOpportunitiesList]);

  // Global counts
  const marketDealsList = opportunities.filter((o) => o.opportunityType === 'market_deal');
  const buyerCampaignsList = opportunities.filter((o) => o.opportunityType !== 'market_deal');
  const myCompanyCampaigns = opportunities.filter(
    (o) => (o.issuerCompany === currentUser.company || o.issuerName === currentUser.name) && o.campaignAnalytics
  );

  // Submit Purchase Offer for a Market Deal (Machine / Bulk Steel / Surplus)
  const handleSubmitPurchaseOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealForOffer) return;

    const newOfferProposal: OpportunityProposal = {
      id: `prop_offer_${Date.now()}`,
      opportunityId: selectedDealForOffer.id,
      supplierId: currentUser.id,
      supplierName: currentUser.name,
      supplierCompany: currentUser.company,
      supplierAvatar: currentUser.avatarUrl,
      supplierRole: currentUser.role,
      supplierPhone: currentUser.phone,
      supplierEmail: currentUser.email,
      unitPrice: offerAmount,
      totalPrice: offerAmount,
      currency: 'AED',
      leadTimeDays: 3,
      paymentTerms: offerPaymentTerms,
      notes: offerNotes || `Official purchase offer submitted by ${currentUser.name} (${currentUser.company}).`,
      submittedAt: 'Just now',
      status: 'pending',
    };

    const exists = opportunities.some((opp) => opp.id === selectedDealForOffer.id);
    let updated: OpportunityItem[];
    if (exists) {
      updated = opportunities.map((opp) => {
        if (opp.id === selectedDealForOffer.id) {
          return {
            ...opp,
            proposalsCount: opp.proposalsCount + 1,
            proposals: [newOfferProposal, ...(opp.proposals || [])],
          };
        }
        return opp;
      });
    } else {
      const target =
        categoryOpportunitiesList.find((opp) => opp.id === selectedDealForOffer.id) || selectedDealForOffer;
      const updatedTarget: OpportunityItem = {
        ...target,
        proposalsCount: target.proposalsCount + 1,
        proposals: [newOfferProposal, ...(target.proposals || [])],
      };
      updated = [updatedTarget, ...opportunities];
    }

    if (onUpdateOpportunities) {
      onUpdateOpportunities(updated);
    }

    setSelectedDealForOffer(null);
    setOfferNotes('');
    setBlastSuccessBanner({
      show: true,
      title: `Purchase Offer of AED ${offerAmount.toLocaleString()} Submitted for ${selectedDealForOffer.title}`,
      count: 1,
      category: 'Market Deal Inquiry',
    });
    setTimeout(() => setBlastSuccessBanner(null), 6000);
  };

  // Submit Inspection Request
  const handleConfirmInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealForInspection) return;

    setInspectionSuccessToast(
      `Yard Inspection Booked for ${selectedDealForInspection.title}! Engineer: ${inspectionEngineer} at ${inspectionDate}. Inspection pass code #INS-${Math.floor(1000 + Math.random() * 9000)} sent to your phone.`
    );
    setSelectedDealForInspection(null);
    setTimeout(() => setInspectionSuccessToast(null), 8000);
  };

  // Submit Supplier Bid on a Sourcing Campaign
  const handleSubmitSupplierBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingModalOpp) return;

    const newProposal: OpportunityProposal = {
      id: `prop_bid_${Date.now()}`,
      opportunityId: pricingModalOpp.id,
      supplierId: currentUser.id,
      supplierName: currentUser.name,
      supplierCompany: currentUser.company,
      supplierAvatar: currentUser.avatarUrl,
      supplierRole: currentUser.role,
      supplierPhone: currentUser.phone,
      supplierEmail: currentUser.email,
      unitPrice: quoteUnitPrice,
      totalPrice: quoteUnitPrice * 1,
      currency: 'AED',
      leadTimeDays: quoteLeadTime,
      paymentTerms: quotePaymentTerms,
      notes: quoteNotes,
      submittedAt: 'Just now',
      status: 'pending',
    };

    const exists = opportunities.some((opp) => opp.id === pricingModalOpp.id);
    let updated: OpportunityItem[];
    if (exists) {
      updated = opportunities.map((opp) => {
        if (opp.id === pricingModalOpp.id) {
          const existingProposals = opp.proposals || [];
          return {
            ...opp,
            proposalsCount: opp.proposalsCount + 1,
            myProposalSubmitted: true,
            proposals: [newProposal, ...existingProposals],
            campaignAnalytics: opp.campaignAnalytics
              ? {
                  ...opp.campaignAnalytics,
                  respondedCount: opp.campaignAnalytics.respondedCount + 1,
                }
              : undefined,
          };
        }
        return opp;
      });
    } else {
      const target = categoryOpportunitiesList.find((opp) => opp.id === pricingModalOpp.id) || pricingModalOpp;
      const existingProposals = target.proposals || [];
      const updatedTarget: OpportunityItem = {
        ...target,
        proposalsCount: target.proposalsCount + 1,
        myProposalSubmitted: true,
        proposals: [newProposal, ...existingProposals],
      };
      updated = [updatedTarget, ...opportunities];
    }

    if (onUpdateOpportunities) {
      onUpdateOpportunities(updated);
    }

    setPricingModalOpp(null);
    setQuoteNotes('');
    setExpandedOppId(pricingModalOpp.id);
  };

  // Buyer Awarding & Concluding Deal
  const handleUpdateProposalStatus = (
    oppId: string,
    proposalId: string,
    newStatus: OpportunityProposal['status']
  ) => {
    const exists = opportunities.some((opp) => opp.id === oppId);
    let updated: OpportunityItem[];
    if (exists) {
      updated = opportunities.map((opp) => {
        if (opp.id !== oppId) return opp;
        const updatedProposals = (opp.proposals || []).map((p) => {
          if (p.id === proposalId) {
            return { ...p, status: newStatus };
          }
          if (newStatus === 'awarded' && p.id !== proposalId) {
            return { ...p, status: 'declined' as const };
          }
          return p;
        });

        return {
          ...opp,
          status: newStatus === 'awarded' ? ('awarded' as const) : opp.status,
          proposals: updatedProposals,
        };
      });
    } else {
      const target = categoryOpportunitiesList.find((opp) => opp.id === oppId);
      if (target) {
        const updatedProposals = (target.proposals || []).map((p) => {
          if (p.id === proposalId) {
            return { ...p, status: newStatus };
          }
          if (newStatus === 'awarded' && p.id !== proposalId) {
            return { ...p, status: 'declined' as const };
          }
          return p;
        });
        const updatedTarget: OpportunityItem = {
          ...target,
          status: newStatus === 'awarded' ? ('awarded' as const) : target.status,
          proposals: updatedProposals,
        };
        updated = [updatedTarget, ...opportunities];
      } else {
        updated = opportunities;
      }
    }

    if (onUpdateOpportunities) {
      onUpdateOpportunities(updated);
    }
  };

  // Launching a 1-Click Sourcing Campaign
  const handleLaunchCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.title) return;

    const rfqNum = `CAMPAIGN-GC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const categoryCount = categorySupplierCounts[newCampaign.category] || 150;

    // Simulated responsive initial supplier quotes arriving from the instant blast
    const initialQuotes: OpportunityProposal[] = [
      {
        id: `prop_blast_1_${Date.now()}`,
        opportunityId: `opp_blast_${Date.now()}`,
        supplierId: 'sup_eq_auto1',
        supplierName: 'Mateo Morales',
        supplierCompany: 'Andes Heavy Civil Equipment & Fleet UAE',
        supplierAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        supplierRole: 'supplier',
        supplierPhone: '+971 4 881 2290',
        supplierEmail: 'equipment@andesheavycivil.ae',
        unitPrice: 1350000,
        totalPrice: 1350000,
        currency: 'AED',
        leadTimeDays: 4,
        paymentTerms: '20% deposit, balance upon site commissioning and load test',
        notes: 'Responding directly to your SOKO 1-click campaign blast. We have the specified machinery ready for pre-purchase inspection in JAFZA yard. Full DCL third-party test report and maintenance logs ready.',
        submittedAt: 'Just now (Instant 1-Click Response)',
        status: 'shortlisted',
      },
      {
        id: `prop_blast_2_${Date.now()}`,
        opportunityId: `opp_blast_${Date.now()}`,
        supplierId: 'sup_eq_auto2',
        supplierName: 'Kenji Sato',
        supplierCompany: 'Gulf Heavy Plant & Foundation Technologies',
        supplierAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        supplierRole: 'supplier',
        supplierPhone: '+971 50 491 8820',
        supplierEmail: 'sales@gulfheavyplant.ae',
        unitPrice: 1420000,
        totalPrice: 1420000,
        currency: 'AED',
        leadTimeDays: 6,
        paymentTerms: 'Net 30 milestone billed via commercial escrow',
        notes: 'Complete turnkey package with certified operator and 12-month preventive maintenance included.',
        submittedAt: 'Just now (Instant 1-Click Response)',
        status: 'pending',
      },
    ];

    const campaignAnalyticsData: CampaignAnalytics = {
      totalTargeted: categoryCount,
      deliveredCount: Math.round(categoryCount * 0.98),
      openedCount: Math.round(categoryCount * 0.79),
      respondedCount: initialQuotes.length,
      impressions: categoryCount * 3,
      clickThroughRate: '79.2%',
      avgResponseTime: '1.4 hours',
      geographicBreakdown: [
        { region: 'Dubai & JAFZA', percentage: 48, suppliers: Math.round(categoryCount * 0.48) },
        { region: 'Abu Dhabi & ICAD', percentage: 32, suppliers: Math.round(categoryCount * 0.32) },
        { region: 'Sharjah & Northern Emirates', percentage: 14, suppliers: Math.round(categoryCount * 0.14) },
        { region: 'Saudi Arabia (KSA / Riyadh)', percentage: 6, suppliers: Math.round(categoryCount * 0.06) },
      ],
      tierBreakdown: [
        { tier: 'Tier 1 Global Dealers & Manufacturers', count: Math.round(categoryCount * 0.25) },
        { tier: 'Tier 2 Regional Fleet & Stockists', count: Math.round(categoryCount * 0.55) },
        { tier: 'Specialized Certified Contractors', count: Math.round(categoryCount * 0.2) },
      ],
      dailyActivity: [
        { date: 'Today (Blast Launch)', opens: Math.round(categoryCount * 0.65), responses: initialQuotes.length },
      ],
    };

    const newCampaignItem: OpportunityItem = {
      id: `opp_camp_${Date.now()}`,
      rfqNumber: rfqNum,
      title: newCampaign.title,
      issuerName: newCampaign.issuingLead,
      issuerCompany: currentUser.company,
      issuerRole: currentUser.role === 'contractor' ? 'contractor' : 'buyer',
      issuerAvatar: currentUser.avatarUrl,
      verified: true,
      category: newCampaign.category,
      budgetRange: newCampaign.budgetRange,
      estimatedValue: 1400000,
      quantity: newCampaign.quantity,
      targetPrice: newCampaign.targetPrice,
      location: newCampaign.location,
      deadline: newCampaign.deadline,
      daysLeft: 30,
      status: 'open',
      opportunityType: 'buyer_campaign',
      isPremiumCampaign: true,
      campaignPricingPlan: 'Apex Enterprise GC Plan (Unlimited 1-Click Sourcing Blasts)',
      targetedCategory: newCampaign.category,
      targetedSuppliersCount: categoryCount,
      siteLocation: newCampaign.location,
      issuingMemberName: newCampaign.issuingLead,
      description: newCampaign.description,
      specifications: newCampaign.specifications
        ? newCampaign.specifications.split('\n').filter(Boolean)
        : ['Technical parameters compliant with standard UAE construction codes', 'Third-party inspection required prior to commercial release'],
      proposalsCount: initialQuotes.length,
      myProposalSubmitted: false,
      paymentTerms: newCampaign.paymentTerms,
      campaignAnalytics: campaignAnalyticsData,
      proposals: initialQuotes,
    };

    if (onUpdateOpportunities) {
      onUpdateOpportunities([newCampaignItem, ...opportunities]);
    }

    setBlastSuccessBanner({
      show: true,
      title: newCampaign.title,
      count: categoryCount,
      category: newCampaign.category,
    });
    setTimeout(() => setBlastSuccessBanner(null), 9000);

    setShowCampaignBlastModal(false);
    setSelectedOppForInsights(newCampaignItem);
    setExpandedOppId(newCampaignItem.id);
  };

  // Re-Blast / Boost Campaign Handler
  const handleReblastCampaign = (camp: OpportunityItem) => {
    const unreadCount = camp.campaignAnalytics
      ? Math.max(camp.campaignAnalytics.totalTargeted - camp.campaignAnalytics.openedCount, 18)
      : 34;

    const updated = opportunities.map((o) => {
      if (o.id === camp.id && o.campaignAnalytics) {
        return {
          ...o,
          campaignAnalytics: {
            ...o.campaignAnalytics,
            impressions: o.campaignAnalytics.impressions + unreadCount * 2,
            deliveredCount: Math.min(o.campaignAnalytics.totalTargeted, o.campaignAnalytics.deliveredCount + 2),
            openedCount: Math.min(o.campaignAnalytics.totalTargeted, o.campaignAnalytics.openedCount + Math.round(unreadCount * 0.35)),
            respondedCount: o.campaignAnalytics.respondedCount + 1,
          },
        };
      }
      return o;
    });

    if (onUpdateOpportunities) {
      onUpdateOpportunities(updated);
    }

    setReblastToast(
      `Campaign ${camp.rfqNumber} Re-Blasted via WhatsApp & Push to ${unreadCount} unread suppliers in ${camp.category}!`
    );
    setTimeout(() => setReblastToast(null), 6000);
  };

  // Simulated PDF Telemetry Export
  const handleExportAuditReport = (timeframe: string) => {
    setExportToast(
      `Executive Campaign Telemetry Audit (${timeframe.toUpperCase()} Report) generated and downloaded successfully!`
    );
    setTimeout(() => setExportToast(null), 6000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 1-Click Blast Dispatch Banner */}
      {blastSuccessBanner && (
        <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 text-white p-5 rounded-2xl border border-purple-500/40 shadow-2xl flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 mt-0.5">
              <Zap className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  1-Click Multi-Channel Sourcing Blast Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {blastSuccessBanner.count} Verified Suppliers Dispatched
                </span>
                <span className="text-[11px] text-purple-300 font-mono">
                  Email + Push + WhatsApp Verified Alert
                </span>
              </div>
              <h4 className="text-base font-extrabold text-white mt-1">
                {blastSuccessBanner.title}
              </h4>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Your procurement requirement has been blasted across <strong>{blastSuccessBanner.count} registered suppliers</strong> in <em>{blastSuccessBanner.category}</em>. Initial sealed proposals and quotes have already arrived. Track live engagement in the Ad Insights Center!
              </p>
            </div>
          </div>
          <button
            onClick={() => setBlastSuccessBanner(null)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Re-blast Success Toast */}
      {reblastToast && (
        <div className="bg-gradient-to-r from-purple-950 to-slate-900 border border-purple-500/50 text-purple-100 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-xs font-semibold">{reblastToast}</span>
          </div>
          <button
            onClick={() => setReblastToast(null)}
            className="text-purple-400 hover:text-white cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Export Report Toast */}
      {exportToast && (
        <div className="bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/50 text-indigo-100 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="text-xs font-semibold">{exportToast}</span>
          </div>
          <button
            onClick={() => setExportToast(null)}
            className="text-indigo-400 hover:text-white cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Inspection Booked Toast */}
      {inspectionSuccessToast && (
        <div className="bg-emerald-950 border border-emerald-500/40 text-emerald-100 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">{inspectionSuccessToast}</span>
          </div>
          <button
            onClick={() => setInspectionSuccessToast(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Header & Soko Monetization / Premium Sourcing Desk Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-700">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Market Hub
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              <strong>Discover what's happening in the construction market.</strong>
              <br className="hidden sm:inline" />
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => {
                handleLoadSpecialMachinePreset();
                setShowCampaignBlastModal(true);
              }}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-600/30 cursor-pointer transition-all flex items-center justify-center gap-2 group active:scale-95"
            >
              <Zap className="w-4 h-4 text-amber-300 transition-transform group-hover:scale-125" />
              <span>+ Launch Sourcing Campaign (1-Click RFP Blast)</span>
            </button>

            <button
              onClick={() => setMainTab('insights')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-purple-200 hover:text-white border border-purple-500/30 font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>Detailed Sourcing Dashboard & Telemetry ({buyerCampaignsList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 12-Category Sourcing Gateway & Navigation Bar (div:nth-of-type(2)) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        {/* Header: Gateway Title & Active Category Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-700" />
                Trade Category Selection
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                12 Categories • {totalCategoryOppsCount} Open Opportunities
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Select Category to Publish Open Opportunities
            </h2>
            <p className="text-xs text-slate-500">
              Click a category block below to reveal live subcontract packages, rental units, and surplus lots.
            </p>
          </div>

          {/* Active Category badge + Clear button */}
          {selectedCategoryId && activeCategory && (
            <div className="flex items-center gap-2.5 bg-purple-50/90 border border-purple-200 p-1.5 pr-3 rounded-2xl shrink-0 animate-in fade-in">
              <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                {renderCategoryIcon(activeCategory.iconName, 'w-4 h-4')}
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-purple-600 leading-none">Selected</div>
                <div className="text-xs font-black text-purple-950 leading-tight">
                  {activeCategory.name} ({activeCategory.count} Open)
                </div>
              </div>
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="ml-2 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-950 hover:bg-purple-100 rounded-lg cursor-pointer transition-colors"
                title="Clear category to view gateway"
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>

        {/* 12 Interactive Category Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {OPPORTUNITY_12_CATEGORIES.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const colors = CATEGORY_COLORS[cat.id] || CATEGORY_COLORS.manpower;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedCategoryId(null);
                  } else {
                    setSelectedCategoryId(cat.id);
                    setSearchTerm('');
                    setDealCategoryFilter('all');
                    setStatusFilter('all');
                  }
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                  isSelected
                    ? `bg-gradient-to-br ${colors.activeGradient} text-white border-purple-500 shadow-lg shadow-purple-950/20 ring-2 ${colors.ring}`
                    : `bg-white hover:bg-slate-50/90 border-slate-200 hover:border-purple-300 shadow-2xs hover:shadow-md text-slate-900`
                }`}
              >
                {/* Header in block: Icon + Count */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                      isSelected ? 'bg-white/20 text-white shadow-xs' : colors.iconBg
                    }`}
                  >
                    {renderCategoryIcon(cat.iconName, 'w-4 h-4')}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-purple-100 text-purple-900 border border-purple-200 group-hover:bg-purple-200'
                    }`}
                  >
                    {cat.count} Open
                  </span>
                </div>

                {/* Category Name & Tags */}
                <div className="space-y-0.5">
                  <h4
                    className={`font-black text-xs sm:text-sm tracking-tight transition-colors ${
                      isSelected ? 'text-white' : 'text-slate-900 group-hover:text-purple-700'
                    }`}
                  >
                    {cat.name}
                  </h4>
                  <p
                    className={`text-[10px] line-clamp-1 transition-colors ${
                      isSelected ? 'text-purple-200' : 'text-slate-500'
                    }`}
                    title={cat.description}
                  >
                    {cat.tags.slice(0, 2).join(' • ')}
                  </p>
                </div>

                {/* Footer in block */}
                <div className="mt-3 pt-2 border-t border-slate-100/20 flex items-center justify-between text-[10px]">
                  {isSelected ? (
                    <span className="font-extrabold text-amber-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Published
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-400 group-hover:text-purple-600 flex items-center gap-0.5 transition-colors">
                      Select <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <span
                    className={`text-[9px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}
                  >
                    {cat.id.slice(0, 4).toUpperCase()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Category Controls Bar (Displayed when category is selected) */}
        {selectedCategoryId && activeCategory && (
          <div className="pt-3 border-t border-slate-100 space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Tab Switcher */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setMainTab('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    mainTab === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All in {activeCategory.name} ({categoryOpportunitiesList.length})</span>
                </button>

                <button
                  onClick={() => setMainTab('deals')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    mainTab === 'deals'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                  <span>Market Deals ({currentCategoryDealsCount})</span>
                </button>

                <button
                  onClick={() => setMainTab('campaigns')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    mainTab === 'campaigns'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-purple-600" />
                  <span>Buyer RFPs & Campaigns ({currentCategoryCampaignsCount})</span>
                </button>

                <button
                  onClick={() => setMainTab('insights')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    mainTab === 'insights'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sourcing Insights Desk</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedCampaignForAnalytics(null);
                    setMainTab('analytics');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    mainTab === 'analytics'
                      ? 'bg-gradient-to-r from-purple-800 to-indigo-900 text-amber-300 shadow-md ring-2 ring-amber-400/40'
                      : 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-900 hover:from-purple-100 hover:to-indigo-100 border border-purple-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>Campaign Analytics</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-400 text-slate-950">
                    PRO
                  </span>
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs shrink-0">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Status:</span>
                {['all', 'open', 'closing-soon', 'awarded'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st as any)}
                    className={`px-2.5 py-1 rounded-lg capitalize font-bold text-[11px] cursor-pointer transition-all ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'All' : st.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategory Pills for Market Deals */}
            {(mainTab === 'deals' || mainTab === 'all') && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Filter Scope:</span>
                <button
                  onClick={() => setDealCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                    dealCategoryFilter === 'all'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Packages ({categoryOpportunitiesList.length})
                </button>
                <button
                  onClick={() => setDealCategoryFilter('machinery')}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1 ${
                    dealCategoryFilter === 'machinery'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Wrench className="w-3 h-3 text-amber-600" />
                  <span>Machines & Plant</span>
                </button>
                <button
                  onClick={() => setDealCategoryFilter('bulk_steel')}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1 ${
                    dealCategoryFilter === 'bulk_steel'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3 h-3 text-blue-600" />
                  <span>Bulk Materials</span>
                </button>
                <button
                  onClick={() => setDealCategoryFilter('surplus_material')}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1 ${
                    dealCategoryFilter === 'surplus_material'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <BadgePercent className="w-3 h-3 text-emerald-600" />
                  <span>Surplus / Salvage Lots</span>
                </button>
                <button
                  onClick={() => setDealCategoryFilter('special_price')}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1 ${
                    dealCategoryFilter === 'special_price'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Percent className="w-3 h-3 text-purple-600" />
                  <span>Subcontract Packages</span>
                </button>
              </div>
            )}

            {/* Search Input for Category */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search in ${activeCategory.name} (RFQ #, location, specs, scopes)...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 h-10 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-purple-500 shadow-2xs transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION: AD INSIGHTS & CAMPAIGN ANALYTICS CENTER (Facebook Ads Manager Style) */}
      {mainTab === 'insights' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Top Dashboard Header & Timeframe Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                    SoKo 1-Click Sourcing Blast & Ad Analytics Desk
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Account: {currentUser.company} ({currentUser.role === 'contractor' ? 'Enterprise GC Plan' : 'Standard Buyer'})
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Procurement Campaigns & Deliverability Dashboard
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Full audience telemetry across your 1-click procurement campaigns: suppliers dispatched, push/WhatsApp delivery receipts, opened rates, and commercial sealed quote responses.
                </p>
              </div>

              {/* Timeframe Period Filter (Daily / Weekly / Monthly) + Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs">
                  <button
                    onClick={() => setDashboardTimeframe('daily')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      dashboardTimeframe === 'daily'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Daily</span>
                  </button>
                  <button
                    onClick={() => setDashboardTimeframe('weekly')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      dashboardTimeframe === 'weekly'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Weekly</span>
                  </button>
                  <button
                    onClick={() => setDashboardTimeframe('monthly')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      dashboardTimeframe === 'monthly'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    <span>Monthly</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportAuditReport(dashboardTimeframe)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Export Audit Telemetry PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Export Audit</span>
                  </button>

                  <button
                    onClick={() => {
                      handleLoadSpecialMachinePreset();
                      setShowCampaignBlastModal(true);
                    }}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>+ Launch Blast</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Timeframe Scope Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-semibold text-slate-700">
                  Active Filter: {dashboardTimeframe === 'daily' ? 'Rolling 7-Day Daily Telemetry' : dashboardTimeframe === 'weekly' ? 'Month-to-Date 4-Week Aggregate' : 'Trailing 6-Month Trajectory'}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-purple-700 font-bold">
                  {dashboardTimeframe === 'daily' ? 'Sep 18 – Sep 24, 2026' : dashboardTimeframe === 'weekly' ? 'Sep 01 – Sep 24, 2026' : 'Jun 2026 – Nov 2026'}
                </span>
              </div>
              <span className="text-emerald-700 font-bold hidden sm:inline">
                {dashboardTimeframe === 'daily' ? '+12.4% engagement vs prior 7 days' : dashboardTimeframe === 'weekly' ? '+18.2% vs prior month' : '+34.6% YoY campaign volume'}
              </span>
            </div>

            {/* High Level Funnel KPI Cards (Dynamic by Timeframe) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Total RFQ Campaigns */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total RFQ Campaigns</span>
                  <FolderKanban className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
                  <span>
                    {dashboardTimeframe === 'daily' ? 3 : dashboardTimeframe === 'weekly' ? 8 : 24}
                  </span>
                  <span className="text-xs text-purple-700 font-semibold">Campaigns</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                  <span className="text-emerald-700 font-bold">● {dashboardTimeframe === 'daily' ? '3 Live' : dashboardTimeframe === 'weekly' ? '6 Live • 2 Awarded' : '18 Concluded • 6 Live'}</span>
                </div>
              </div>

              {/* Card 2: Total Suppliers Contacted & Delivered */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Suppliers Contacted</span>
                  <Users className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-indigo-900 mt-1 flex items-baseline gap-1.5">
                  <span>
                    {dashboardTimeframe === 'daily' ? '480' : dashboardTimeframe === 'weekly' ? '1,420' : '4,250'}
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold font-mono">
                    {dashboardTimeframe === 'daily' ? '98.1%' : dashboardTimeframe === 'weekly' ? '98.0%' : '98.0%'} deliv
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {dashboardTimeframe === 'daily' ? '471 receipts confirmed' : dashboardTimeframe === 'weekly' ? '1,392 receipts confirmed' : '4,165 receipts confirmed'}
                </span>
              </div>

              {/* Card 3: Opened & Viewed */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Opened & Read</span>
                  <Eye className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-blue-700 mt-1 flex items-baseline gap-1.5">
                  <span>
                    {dashboardTimeframe === 'daily' ? '382' : dashboardTimeframe === 'weekly' ? '1,128' : '3,410'}
                  </span>
                  <span className="text-xs text-blue-600 font-semibold font-mono">
                    {dashboardTimeframe === 'daily' ? '79.6%' : dashboardTimeframe === 'weekly' ? '79.4%' : '80.2%'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Avg read in {dashboardTimeframe === 'daily' ? '18 mins' : dashboardTimeframe === 'weekly' ? '24 mins' : '32 mins'}
                </span>
              </div>

              {/* Card 4: Responded / Sealed Proposals */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Responded</span>
                  <Send className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-purple-700 mt-1 flex items-baseline gap-1.5">
                  <span>
                    {dashboardTimeframe === 'daily' ? '36' : dashboardTimeframe === 'weekly' ? '98' : '312'}
                  </span>
                  <span className="text-xs text-purple-600 font-semibold">Quotes</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {dashboardTimeframe === 'daily' ? '7.5% quote conversion' : dashboardTimeframe === 'weekly' ? '6.9% quote conversion' : '7.3% quote conversion'}
                </span>
              </div>
            </div>

            {/* Second Row KPIs: Spend Managed, Avg Turnaround, Estimated Cost Savings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-purple-800 block">Active Procurement Value</span>
                <div className="text-xl font-black text-purple-950 mt-1">
                  {dashboardTimeframe === 'daily' ? 'AED 4,650,000' : dashboardTimeframe === 'weekly' ? 'AED 24,850,000' : 'AED 78,400,000'}
                </div>
                <span className="text-[11px] text-purple-700 mt-0.5 block">Heavy equipment, bulk rebar, and MEP lots</span>
              </div>

              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Est. Cost Savings Achieved</span>
                <div className="text-xl font-black text-emerald-950 mt-1">
                  {dashboardTimeframe === 'daily' ? 'AED 385,000' : dashboardTimeframe === 'weekly' ? 'AED 1,840,000' : 'AED 5,820,000'}
                </div>
                <span className="text-[11px] text-emerald-700 mt-0.5 block">
                  {dashboardTimeframe === 'daily' ? '11.2% below initial ceiling' : dashboardTimeframe === 'weekly' ? '11.4% below initial ceiling' : '12.8% below initial ceiling'}
                </span>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Avg Response Turnaround</span>
                <div className="text-xl font-black text-blue-950 mt-1">
                  {dashboardTimeframe === 'daily' ? '1.4 Hours' : dashboardTimeframe === 'weekly' ? '1.8 Hours' : '2.1 Hours'}
                </div>
                <span className="text-[11px] text-blue-700 mt-0.5 block">From 1-click broadcast to first quote</span>
              </div>
            </div>

            {/* Dynamic Activity Trend Chart (Daily / Weekly / Monthly) */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-extrabold text-white">
                    {dashboardTimeframe === 'daily'
                      ? '7-Day Daily Sourcing Response Velocity'
                      : dashboardTimeframe === 'weekly'
                      ? '4-Week Aggregated Campaign Deliverability Trend'
                      : '6-Month Enterprise Procurement Volume & Quote Trajectory'}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-slate-300">Contacted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span className="text-slate-300">Opened</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-slate-300">Quotes Responded</span>
                  </div>
                </div>
              </div>

              {/* Chart Bars */}
              <div className="pt-2">
                {dashboardTimeframe === 'daily' && (
                  <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 sm:h-52 pt-4 px-2">
                    {[
                      { day: 'Mon', contacted: 180, opened: 142, quotes: 14, height: '90%' },
                      { day: 'Tue', contacted: 120, opened: 96, quotes: 9, height: '65%' },
                      { day: 'Wed', contacted: 80, opened: 64, quotes: 6, height: '45%' },
                      { day: 'Thu', contacted: 100, opened: 80, quotes: 7, height: '55%' },
                      { day: 'Fri', contacted: 20, opened: 18, quotes: 2, height: '18%' },
                      { day: 'Sat', contacted: 15, opened: 12, quotes: 1, height: '14%' },
                      { day: 'Sun', contacted: 30, opened: 24, quotes: 3, height: '22%' },
                    ].map((col, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {col.quotes} bids
                        </div>
                        <div className="w-full max-w-[38px] bg-slate-800 rounded-xl p-1 flex flex-col justify-end gap-1 h-full">
                          <div
                            className="w-full bg-indigo-600 rounded-lg transition-all"
                            style={{ height: col.height }}
                            title={`Contacted: ${col.contacted}`}
                          />
                          <div
                            className="w-full bg-blue-500 rounded-md transition-all"
                            style={{ height: `${parseInt(col.height) * 0.79}%` }}
                            title={`Opened: ${col.opened}`}
                          />
                          <div
                            className="w-full bg-amber-400 rounded-xs transition-all"
                            style={{ height: `${Math.max(parseInt(col.height) * 0.12, 6)}%` }}
                            title={`Quotes: ${col.quotes}`}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-300">{col.day}</span>
                      </div>
                    ))}
                  </div>
                )}

                {dashboardTimeframe === 'weekly' && (
                  <div className="grid grid-cols-4 gap-3 sm:gap-6 items-end h-44 sm:h-52 pt-4 px-2">
                    {[
                      { week: 'Week 1', contacted: 320, opened: 256, quotes: 22, height: '70%' },
                      { week: 'Week 2', contacted: 410, opened: 332, quotes: 28, height: '92%' },
                      { week: 'Week 3', contacted: 360, opened: 288, quotes: 24, height: '80%' },
                      { week: 'Week 4 (Current)', contacted: 330, opened: 252, quotes: 24, height: '75%' },
                    ].map((col, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="text-[10px] text-amber-300 font-mono font-bold">
                          {col.quotes} Sealed Quotes
                        </div>
                        <div className="w-full max-w-[56px] bg-slate-800 rounded-2xl p-1.5 flex flex-col justify-end gap-1.5 h-full">
                          <div
                            className="w-full bg-indigo-600 rounded-xl transition-all"
                            style={{ height: col.height }}
                            title={`Contacted: ${col.contacted}`}
                          />
                          <div
                            className="w-full bg-blue-500 rounded-lg transition-all"
                            style={{ height: `${parseInt(col.height) * 0.78}%` }}
                            title={`Opened: ${col.opened}`}
                          />
                          <div
                            className="w-full bg-amber-400 rounded-md transition-all"
                            style={{ height: `${Math.max(parseInt(col.height) * 0.15, 8)}%` }}
                            title={`Quotes: ${col.quotes}`}
                          />
                        </div>
                        <span className="text-xs font-extrabold text-slate-200">{col.week}</span>
                      </div>
                    ))}
                  </div>
                )}

                {dashboardTimeframe === 'monthly' && (
                  <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-44 sm:h-52 pt-4 px-2">
                    {[
                      { month: 'Jun', contacted: 520, opened: 410, quotes: 36, height: '55%' },
                      { month: 'Jul', contacted: 680, opened: 540, quotes: 48, height: '70%' },
                      { month: 'Aug', contacted: 740, opened: 590, quotes: 54, height: '78%' },
                      { month: 'Sep', contacted: 820, opened: 660, quotes: 62, height: '88%' },
                      { month: 'Oct', contacted: 910, opened: 730, quotes: 68, height: '96%' },
                      { month: 'Nov (MTD)', contacted: 580, opened: 480, quotes: 44, height: '62%' },
                    ].map((col, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="text-[10px] text-amber-300 font-mono">
                          {col.quotes} quotes
                        </div>
                        <div className="w-full max-w-[44px] bg-slate-800 rounded-xl p-1 flex flex-col justify-end gap-1 h-full">
                          <div
                            className="w-full bg-indigo-600 rounded-lg transition-all"
                            style={{ height: col.height }}
                          />
                          <div
                            className="w-full bg-blue-500 rounded-md transition-all"
                            style={{ height: `${parseInt(col.height) * 0.79}%` }}
                          />
                          <div
                            className="w-full bg-amber-400 rounded-xs transition-all"
                            style={{ height: `${Math.max(parseInt(col.height) * 0.12, 6)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-300">{col.month}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
                <span className="flex items-center gap-1 text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Insight: WhatsApp multi-channel alerts generate 62% of responses within 2 hours of broadcast.
                </span>
                <span className="font-mono text-purple-300">
                  Average delivery speed: 4.2 seconds
                </span>
              </div>
            </div>

            {/* Channels & SoKo Campaign Service Monetization Architecture */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Multi-Channel Deliverability Breakdown */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-purple-600" />
                    Multi-Channel Blast Distribution
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Live Verified
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        WhatsApp Business Direct Broadcast
                      </span>
                      <span className="font-mono font-bold text-emerald-700">58% of quotes (14 min avg)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '58%' }} />
                    </div>
                    <span className="text-[10px] text-slate-500 block">Includes PDF RFP download + 1-click quote form</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-purple-600" />
                        SoKo In-App Push & Web Portal
                      </span>
                      <span className="font-mono font-bold text-purple-700">26% of quotes (38 min avg)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: '26%' }} />
                    </div>
                    <span className="text-[10px] text-slate-500 block">Instant notification to registered mobile users</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Priority Verified Supplier Email Digest
                      </span>
                      <span className="font-mono font-bold text-blue-700">16% of quotes (2.4 hr avg)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '16%' }} />
                    </div>
                    <span className="text-[10px] text-slate-500 block">Sent to pre-qualified procurement departments</span>
                  </div>
                </div>
              </div>

              {/* SoKo Campaign Service Monetization Model */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-purple-950 text-white rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    SoKo Commercial Monetization Architecture
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/30">
                    B2B Service Fee
                  </span>
                </div>

                <h4 className="text-sm font-black text-white">
                  Why SoKo Charges for 1-Click Sourcing Campaigns
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Curated Marketplace Deals:</strong> Only SoKo Admin verified liquidation posts (machines, bulk steel, surplus) are listed publicly to buyers.
                  <br />
                  <strong>Buyer Sourcing Campaigns:</strong> When an enterprise buyer or general contractor posts requirements, only <em>Premium Users</em> can launch multi-channel broadcasts to thousands of verified vendors.
                </p>

                <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pay-Per-Blast</span>
                    <span className="font-extrabold text-amber-300 block mt-0.5">AED 2,500 / Blast</span>
                    <span className="text-[10px] text-slate-300">Up to 250 verified vendors</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-600/30 border border-purple-400/40">
                    <span className="text-[10px] uppercase font-bold text-purple-300 block">Enterprise GC Plan</span>
                    <span className="font-extrabold text-emerald-300 block mt-0.5">AED 8,500 / Month</span>
                    <span className="text-[10px] text-slate-300">Unlimited 1-click blasts (Active)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Campaign Statistics Table & Telemetry Audit */}
            <div className="border border-slate-200 rounded-3xl overflow-hidden space-y-0">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span>Individual Campaign Statistics & Deliverability Breakdown</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Track real-time responses, delivered counts, open rates, and sealed bids per RFQ campaign.
                  </p>
                </div>

                {/* Status Filter for Individual Table */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Filter:</span>
                  {(['all', 'open', 'awarded'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setCampaignTableStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg capitalize font-bold text-[11px] cursor-pointer transition-colors ${
                        campaignTableStatusFilter === st
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'all' ? 'All Campaigns' : st === 'open' ? 'Active Blasts' : 'Awarded'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campaign Table Items */}
              <div className="divide-y divide-slate-100 bg-white">
                {buyerCampaignsList
                  .filter((camp) => {
                    if (campaignTableStatusFilter === 'open') return camp.status === 'open' || camp.status === 'closing-soon';
                    if (campaignTableStatusFilter === 'awarded') return camp.status === 'awarded';
                    return true;
                  })
                  .map((camp) => {
                    const a = camp.campaignAnalytics;
                    const proposalsCount = camp.proposals?.length || camp.proposalsCount || 0;
                    const targeted = a?.totalTargeted || camp.targetedSuppliersCount || 150;
                    const delivered = a?.deliveredCount || Math.round(targeted * 0.98);
                    const opened = a?.openedCount || Math.round(targeted * 0.79);
                    const clickRate = a?.clickThroughRate || '79.2%';

                    return (
                      <div key={camp.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {camp.rfqNumber}
                              </span>
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                {camp.category}
                              </span>
                              {camp.status === 'awarded' ? (
                                <span className="text-[11px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  Deal Concluded & Awarded
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Live Broadcast Active
                                </span>
                              )}
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">{camp.deadline} deadline</span>
                            </div>

                            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                              {camp.title}
                            </h4>

                            <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                              <span><strong>Location:</strong> {camp.location}</span>
                              <span>•</span>
                              <span><strong>Target:</strong> {camp.targetPrice || camp.budgetRange}</span>
                              <span>•</span>
                              <span><strong>Volume:</strong> {camp.quantity}</span>
                            </div>
                          </div>

                          {/* Quick Actions for Individual Campaign */}
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <button
                              onClick={() => {
                                setSelectedCampaignForAnalytics(camp.id);
                                setMainTab('analytics');
                              }}
                              className="px-3.5 py-2 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-amber-300 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs border border-amber-400/40"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Campaign Analytics (Pro)</span>
                            </button>

                            <button
                              onClick={() => setSelectedOppForInsights(camp)}
                              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                            >
                              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Deep Telemetry Drawer</span>
                            </button>

                            <button
                              onClick={() => setExpandedOppId(expandedOppId === camp.id ? null : camp.id)}
                              className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Evaluate Quotes ({proposalsCount})</span>
                            </button>

                            <button
                              onClick={() => handleReblastCampaign(camp)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="Re-blast notification to unread vendors"
                            >
                              <RefreshCw className="w-3 h-3 text-slate-600" />
                              <span className="hidden sm:inline">Boost</span>
                            </button>
                          </div>
                        </div>

                        {/* Visual 4-Stage Deliverability Funnel for this Individual Campaign */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">1. Targeted Audience</span>
                            <span className="font-extrabold text-slate-900 text-sm">{targeted} Suppliers</span>
                            <span className="text-[10px] text-slate-500 block">Multi-channel dispatch</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">2. Delivered Receipts</span>
                            <span className="font-extrabold text-emerald-700 text-sm">
                              {delivered} ({(delivered / targeted * 100).toFixed(1)}%)
                            </span>
                            <span className="text-[10px] text-emerald-600 font-mono block">WhatsApp + Push + Email</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">3. Opened & Read</span>
                            <span className="font-extrabold text-blue-700 text-sm">
                              {opened} ({clickRate})
                            </span>
                            <span className="text-[10px] text-slate-500 block">Avg: {a?.avgResponseTime || '1.8 hours'}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">4. Quotes Received</span>
                            <span className="font-extrabold text-purple-700 text-sm">
                              {proposalsCount} Commercial Bids
                            </span>
                            <span className="text-[10px] text-purple-600 font-semibold block">Sealed pricing received</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: GRANULAR CAMPAIGN ANALYTICS PANEL (PREMIUM SUITE) */}
      {mainTab === 'analytics' && (
        <CampaignAnalyticsPanel
          opportunities={opportunities}
          currentUser={currentUser}
          initialSelectedCampaignId={selectedCampaignForAnalytics}
          onStartMessageWith={onStartMessageWith}
          onOpenCreateOpportunity={onOpenCreateOpportunity}
        />
      )}

      {/* SECTION: OPPORTUNITIES FEED (MARKET DEALS & SOURCING CAMPAIGNS) */}
      {mainTab !== 'insights' && mainTab !== 'analytics' && (
        <div className="space-y-6">
          {!selectedCategoryId ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-6 shadow-xs animate-in fade-in duration-300">
              <div className="max-w-xl mx-auto space-y-3">
                <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 to-indigo-100 border border-purple-200 text-purple-700 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
                  <Layers className="w-8 h-8 text-purple-700" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Select a Trade Category Above to Publish Opportunities
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  To view open opportunities, select any of the <strong>12 trade categories above</strong> (such as <strong>Manpower 12</strong>, <strong>Scrap 9</strong>, <strong>Rental 15</strong>, <strong>Tile Subcon 8</strong>, <strong>Block Subcon 11</strong>, or <strong>MEP Subcon 14</strong>). Only when a category is selected are its results published.
                </p>
              </div>

              {/* Quick selection chips for the 12 categories */}
              <div className="pt-2 max-w-4xl mx-auto">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  12 Verified Trade Categories ({totalCategoryOppsCount} Open Opportunities Total)
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
                  {OPPORTUNITY_12_CATEGORIES.map((cat) => {
                    const colors = CATEGORY_COLORS[cat.id] || CATEGORY_COLORS.manpower;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-900 border border-slate-200 hover:border-purple-300 transition-all cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-xs active:scale-95 group"
                      >
                        <span className={`w-6 h-6 rounded-lg ${colors.iconBg} flex items-center justify-center text-white shrink-0`}>
                          {renderCategoryIcon(cat.iconName, 'w-3.5 h-3.5')}
                        </span>
                        <span>{cat.name}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 group-hover:bg-purple-200">
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* B2B Trust Points */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">Verified UAE Contractors</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">DCL, DEWA, and Civil Defense certified enterprise issuers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <Coins className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">Escrow Milestone Protection</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Protected advance deposits and engineer inspection releases.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <Zap className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">1-Click RFP Sourcing Blasts</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Instant broadcast to 2,500+ pre-screened GCC suppliers.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Published Category Header Banner */}
              {activeCategory && (
                <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-purple-500/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/30">
                      {renderCategoryIcon(activeCategory.iconName, 'w-6 h-6')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                          Published Category
                        </span>
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {filteredOpportunities.length} of {activeCategory.count} Packages Displayed
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                        {activeCategory.name} Opportunities
                      </h3>
                      <p className="text-xs text-purple-200 mt-1 max-w-2xl leading-relaxed">
                        {activeCategory.description}
                      </p>
                      {/* Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {activeCategory.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSearchTerm(tag === searchTerm ? '' : tag)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                              searchTerm === tag
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                                : 'bg-white/10 text-purple-100 hover:bg-white/20 border-white/10'
                            }`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setNewCampaign((prev) => ({
                          ...prev,
                          category: activeCategory.name,
                          title: `Urgent Requirement: ${activeCategory.name} Package`,
                        }));
                        setShowCampaignBlastModal(true);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>+ Post RFP in {activeCategory.name}</span>
                    </button>
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white rounded-xl text-xs font-semibold border border-white/10 cursor-pointer transition-colors"
                    >
                      ✕ View All Categories
                    </button>
                  </div>
                </div>
              )}

              {/* Feed List or Zero Results in this Category */}
              {filteredOpportunities.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      No packages match current filters in {activeCategory?.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Try clearing search keywords or resetting status filters to see all {activeCategory?.count} packages.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDealCategoryFilter('all');
                      setStatusFilter('all');
                      setMainTab('all');
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    Reset Filter in {activeCategory?.name}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {filteredOpportunities.map((opp) => {
                const isMarketDeal = opp.opportunityType === 'market_deal';
                const isExpanded = expandedOppId === opp.id;
                const hasProposals = opp.proposals && opp.proposals.length > 0;
                const isMyCompanyPosting = opp.issuerCompany === currentUser.company || opp.issuerName === currentUser.name;
                const analytics = opp.campaignAnalytics;

                return (
                  <div
                    key={opp.id}
                    className={`bg-white rounded-3xl border shadow-xs hover:shadow-md transition-all overflow-hidden ${
                      isMarketDeal ? 'border-amber-200/90' : 'border-slate-200'
                    }`}
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        {/* Left Column: Visual Product Image (If Market Deal) + Details */}
                        <div className="flex flex-col sm:flex-row gap-5 flex-1">
                          {/* Image preview for Marketplace Deal (like Facebook Marketplace) */}
                          {isMarketDeal && opp.imageUrl && (
                            <div className="sm:w-64 h-48 sm:h-auto rounded-2xl overflow-hidden relative border border-slate-200 shrink-0 bg-slate-100">
                              <img
                                src={opp.imageUrl}
                                alt={opp.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              {opp.dealDiscount && (
                                <div className="absolute top-2.5 left-2.5 bg-amber-500 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                                  <BadgePercent className="w-3.5 h-3.5" />
                                  <span>{opp.dealDiscount}</span>
                                </div>
                              )}
                              {opp.condition && (
                                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-1 rounded-md text-center line-clamp-1">
                                  {opp.condition}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Content Details */}
                          <div className="space-y-3 flex-1">
                            {/* Badges Bar */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                                {opp.rfqNumber}
                              </span>

                              {isMarketDeal ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                                  <ShoppingBag className="w-3 h-3 text-amber-600" />
                                  Available Market Deal
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md border border-purple-300">
                                  <Zap className="w-3 h-3 text-purple-600" />
                                  1-Click Sourcing Campaign
                                </span>
                              )}

                              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-semibold">
                                {opp.category}
                              </span>

                              {opp.isSokoAdminPost && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                                  SoKo Verified Listing
                                </span>
                              )}

                              {opp.status === 'awarded' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-md">
                                  <Award className="w-3 h-3 text-purple-700" />
                                  Deal Concluded
                                </span>
                              ) : opp.status === 'closing-soon' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  {opp.daysLeft} days left
                                </span>
                              ) : null}
                            </div>

                            {/* Title */}
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                              {opp.title}
                            </h3>

                            {/* Seller / Issuer information */}
                            <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                              <img
                                src={opp.issuerAvatar}
                                alt={opp.issuerName}
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                              />
                              <span className="font-bold text-slate-900">{opp.issuerCompany}</span>
                              <span>•</span>
                              <span className="text-slate-500">
                                {isMarketDeal ? 'Marketplace Seller' : `Issued by ${opp.issuerName}`}
                              </span>
                              {opp.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 inline" />}
                            </div>

                            {/* Description */}
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                              {opp.description}
                            </p>

                            {/* Specifications / Highlights */}
                            <div className="pt-1">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700">
                                {opp.specifications.slice(0, 4).map((spec, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5">
                                    <span className="text-purple-600 font-bold shrink-0">•</span>
                                    <span className="line-clamp-1">{spec}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Live Deliverability Capsule (If Buyer Campaign with Analytics) */}
                            {analytics && (
                              <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-purple-950 block">
                                      1-Click Multi-Channel Campaign Broadcast Active
                                    </span>
                                    <span className="text-purple-700 text-[11px]">
                                      {analytics.totalTargeted} Suppliers Targeted • {analytics.deliveredCount} Delivered ({analytics.clickThroughRate} open rate)
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => setSelectedOppForInsights(opp)}
                                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-colors shrink-0 flex items-center gap-1"
                                >
                                  <BarChart3 className="w-3.5 h-3.5 text-purple-700" />
                                  <span>View Ad Insights</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Commercial Pricing & Action CTAs (Marketplace Deal vs Campaign) */}
                        <div className="lg:w-80 bg-slate-50 border border-slate-200 rounded-2xl p-5 shrink-0 flex flex-col justify-between space-y-4">
                          <div className="space-y-3 text-xs">
                            {/* Price / Target Budget */}
                            <div className="border-b border-slate-200 pb-3">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {isMarketDeal ? 'Deal Price / Liquidation Rate' : 'Target Price / Budget'}
                              </span>
                              <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-lg font-black text-slate-900">
                                  {opp.targetPrice || opp.budgetRange}
                                </span>
                              </div>
                              {opp.originalPrice && (
                                <span className="text-[11px] text-slate-400 line-through block mt-0.5">
                                  Original Wholesale: {opp.originalPrice}
                                </span>
                              )}
                            </div>

                            {/* Quantity / Volume */}
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Available Volume:</span>
                              <span className="font-extrabold text-blue-700">{opp.quantity}</span>
                            </div>

                            {/* Location */}
                            <div className="border-b border-slate-200 pb-2">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {isMarketDeal ? 'Yard / Warehouse Location' : 'Destination Jobsite'}
                              </span>
                              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="line-clamp-1">{opp.location}</span>
                              </span>
                            </div>

                            {/* Terms & Deadline */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Validity</span>
                                <span className="font-semibold text-amber-900">{opp.deadline}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Commercial Terms</span>
                                <span className="font-medium text-slate-700 line-clamp-1 max-w-[120px]">{opp.paymentTerms}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action CTAs */}
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            {isMarketDeal ? (
                              /* Market Deal Actions (Buy / Inquire / Inspect) */
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedDealForOffer(opp);
                                    setOfferAmount(opp.estimatedValue || 950000);
                                  }}
                                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                  <ShoppingBag className="w-4 h-4" />
                                  <span>Inquire & Make Purchase Offer</span>
                                </button>

                                <button
                                  onClick={() => setSelectedDealForInspection(opp)}
                                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Book Yard Inspection</span>
                                </button>

                                {opp.sellerContact && (
                                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                                    <button
                                      onClick={() => onStartMessageWith('sup_desk', opp.issuerCompany)}
                                      className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <MessageSquare className="w-3 h-3 text-blue-600" />
                                      <span>Chat Seller</span>
                                    </button>
                                    <a
                                      href={`https://wa.me/${opp.sellerContact.whatsapp.replace('+', '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold flex items-center gap-1"
                                      title="WhatsApp Seller Direct"
                                    >
                                      <Phone className="w-3 h-3 text-emerald-600" />
                                      <span>WhatsApp</span>
                                    </a>
                                  </div>
                                )}
                              </>
                            ) : (
                              /* Buyer Campaign Actions (Evaluate Bids vs Submit Bid) */
                              <>
                                {opp.status === 'awarded' ? (
                                  <div className="w-full py-2.5 bg-purple-100 border border-purple-200 text-purple-900 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                                    <Award className="w-4 h-4 text-purple-700" />
                                    Package Awarded & Concluded
                                  </div>
                                ) : isMyCompanyPosting ? (
                                  <button
                                    onClick={() => setExpandedOppId(isExpanded ? null : opp.id)}
                                    className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                                  >
                                    <Users className="w-4 h-4" />
                                    <span>Evaluate Received Quotes ({opp.proposalsCount})</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setPricingModalOpp(opp);
                                      setQuoteUnitPrice(opp.estimatedValue ? Math.round(opp.estimatedValue / 100) : 380);
                                    }}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                                  >
                                    <Send className="w-4 h-4" />
                                    <span>Submit Commercial Bid</span>
                                  </button>
                                )}

                                {hasProposals && (
                                  <button
                                    onClick={() => setExpandedOppId(isExpanded ? null : opp.id)}
                                    className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <span>
                                      {isExpanded ? 'Hide' : 'Review'} Proposals & Quotes ({opp.proposals?.length})
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                )}

                                {opp.opportunityType !== 'market_deal' && (
                                  <button
                                    onClick={() => {
                                      setSelectedCampaignForAnalytics(opp.id);
                                      setMainTab('analytics');
                                    }}
                                    className="w-full py-2 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 hover:from-purple-100 hover:to-indigo-100 text-purple-950 border border-purple-300/80 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                                    <span>Campaign Analytics (Premium)</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Proposals Drawer */}
                    {isExpanded && opp.proposals && opp.proposals.length > 0 && (
                      <div className="bg-slate-50 border-t border-slate-200 p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <Scale className="w-4 h-4 text-purple-700" />
                                <span>Received Proposals & Commercial Bids ({opp.proposals.length})</span>
                              </h4>
                              <span className="text-[11px] font-mono text-slate-500">
                                {opp.rfqNumber}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Select multiple submitted proposals to generate a comprehensive Bid Tabulation Matrix with scope gap analysis and payment terms review.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Select All Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const allIds = (opp.proposals || []).map((p) => p.id);
                                const curSelected = selectedProposalIdsForCompare[opp.id] || [];
                                const isAll = curSelected.length === allIds.length;
                                setSelectedProposalIdsForCompare((prev) => ({
                                  ...prev,
                                  [opp.id]: isAll ? [] : allIds,
                                }));
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            >
                              {(selectedProposalIdsForCompare[opp.id] || []).length === (opp.proposals || []).length
                                ? 'Deselect All'
                                : `Select All (${(opp.proposals || []).length})`}
                            </button>

                            {/* Main Bid Tabulation Button */}
                            <button
                              onClick={() => setComparisonModalOpp(opp)}
                              className="px-4 py-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 hover:from-purple-800 hover:to-blue-800 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all flex items-center gap-2"
                            >
                              <Scale className="w-3.5 h-3.5 text-amber-300" />
                              <span>
                                Generate Bid Tabulation Matrix (
                                {(selectedProposalIdsForCompare[opp.id]?.length || 0) > 0
                                  ? selectedProposalIdsForCompare[opp.id].length
                                  : (opp.proposals || []).length}
                                )
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {opp.proposals.map((prop) => (
                            <div
                              key={prop.id}
                              className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all ${
                                prop.status === 'awarded'
                                  ? 'border-purple-500 ring-2 ring-purple-100'
                                  : prop.status === 'shortlisted'
                                  ? 'border-blue-400'
                                  : 'border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={prop.supplierAvatar}
                                    alt={prop.supplierName}
                                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                  />
                                  <div>
                                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                                      {prop.supplierCompany}
                                    </h5>
                                    <p className="text-[11px] text-slate-500">
                                      {prop.supplierName} • {prop.submittedAt}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <label className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/80 border border-blue-200 text-[11px] font-bold text-blue-800 hover:bg-blue-100 cursor-pointer transition-colors select-none">
                                    <input
                                      type="checkbox"
                                      checked={(selectedProposalIdsForCompare[opp.id] || []).includes(prop.id)}
                                      onChange={() => toggleProposalSelection(opp.id, prop.id)}
                                      className="rounded accent-purple-600 cursor-pointer"
                                    />
                                    <span>Tabulate</span>
                                  </label>

                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                      prop.status === 'awarded'
                                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                        : prop.status === 'shortlisted'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {prop.status}
                                  </span>
                                </div>
                              </div>

                              {/* Price & Lead time Row */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Total Quoted</span>
                                  <span className="font-black text-slate-900 text-sm">
                                    {prop.currency} {prop.totalPrice.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Lead Time</span>
                                  <span className="font-bold text-blue-700 text-xs">
                                    {prop.leadTimeDays} Calendar Days
                                  </span>
                                </div>
                              </div>

                              {/* Inclusions & Exclusions Micro Summary */}
                              <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 text-[11px] border border-slate-100">
                                <div className="flex items-center justify-between text-slate-700">
                                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>{(prop.inclusions || []).length || 4} Scope Inclusions</span>
                                  </span>
                                  {(prop.exclusions || []).length > 0 ? (
                                    <span className="flex items-center gap-1 text-rose-700 font-semibold">
                                      <X className="w-3 h-3 text-rose-600" />
                                      <span>{prop.exclusions!.length} Excluded Scopes</span>
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-medium">Turnkey Scope</span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-slate-500 pt-0.5 border-t border-slate-200/60 text-[10px]">
                                  <span className="font-mono">Terms: {prop.paymentTerms}</span>
                                  <span className="font-bold text-purple-700">ICV: {prop.icvScore || 80}%</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                    Offered Price
                                  </span>
                                  <span className="font-extrabold text-blue-700">
                                    {prop.currency} {prop.unitPrice.toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                    Total Value
                                  </span>
                                  <span className="font-extrabold text-slate-900">
                                    {prop.currency} {prop.totalPrice.toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                    Lead Time
                                  </span>
                                  <span className="font-medium text-slate-700">
                                    {prop.leadTimeDays} Days
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                "{prop.notes}"
                              </p>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                                <button
                                  onClick={() => onStartMessageWith(prop.supplierId, prop.supplierName)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Message Vendor</span>
                                </button>

                                {isMyCompanyPosting && opp.status !== 'awarded' && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleUpdateProposalStatus(opp.id, prop.id, 'shortlisted')}
                                      className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      Shortlist
                                    </button>
                                    <button
                                      onClick={() => handleUpdateProposalStatus(opp.id, prop.id, 'awarded')}
                                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <Award className="w-3.5 h-3.5" />
                                      <span>Award & Conclude Deal</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* MODAL 1: 1-CLICK CAMPAIGN CREATOR STUDIO (RFP BLUST TO LARGE AUDIENCE) */}
      {showCampaignBlastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  SoKo 1-Click Multi-Channel Sourcing Desk
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  Broadcast Sourcing Campaign to Industry Audiences
                </h3>
              </div>
              <button
                onClick={() => setShowCampaignBlastModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets Bar: Machine Purchase vs Bulk Steel vs Manpower */}
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200/80 space-y-2">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Quick Scenario Presets:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleLoadSpecialMachinePreset}
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  🚜 Buy Special Machine (Crawler Crane / Piling Rig)
                </button>
                <button
                  type="button"
                  onClick={handleLoadBulkSteelPreset}
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  🏗️ Bulk Rebar Direct Lot (2,500 MT)
                </button>
                <button
                  type="button"
                  onClick={handleLoadManpowerPreset}
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  👷 100 Manpower Helpers at Dubai Site
                </button>
              </div>
            </div>

            {/* Real-time Audience Reach Gauge */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/40 text-purple-300 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 animate-pulse text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] text-purple-300 uppercase font-mono font-bold block">
                    1-Click Targeted Audience Reach
                  </span>
                  <span className="text-base font-extrabold text-white">
                    {categorySupplierCounts[newCampaign.category] || 150} Verified GCC Suppliers Notified
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                Email + SMS + WhatsApp API
              </span>
            </div>

            <form onSubmit={handleLaunchCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Campaign / Requirement Title *
                </label>
                <input
                  type="text"
                  required
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                  placeholder="e.g. Purchase of Specialized 80-Ton Crawler Crane or Rotary Piling Rig"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Supplier Category *</label>
                  <select
                    value={newCampaign.category}
                    onChange={(e) => setNewCampaign({ ...newCampaign, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-hidden"
                  >
                    <option value="Heavy Plant & Crane Rentals">Heavy Plant & Crane Rentals (180 vendors)</option>
                    <option value="Structural Steel & Rebar">Structural Steel & Rebar (145 vendors)</option>
                    <option value="Manpower & Labor Supply">Manpower & Labor Supply (150 vendors)</option>
                    <option value="Ready-Mix Concrete & Cement">Ready-Mix Concrete (85 vendors)</option>
                    <option value="MEP & Electrical Subcontractors">MEP & Electrical (94 vendors)</option>
                    <option value="Building Construction">Building Construction (120 vendors)</option>
                    <option value="Infrastructure & Utilities">Infrastructure & Utilities (88 vendors)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Volume / Machine Quantity *</label>
                  <input
                    type="text"
                    required
                    value={newCampaign.quantity}
                    onChange={(e) => setNewCampaign({ ...newCampaign, quantity: e.target.value })}
                    placeholder="e.g. 1 Unit or 2,500 Metric Tons"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Ceiling Budget (AED)</label>
                  <input
                    type="text"
                    value={newCampaign.targetPrice}
                    onChange={(e) => setNewCampaign({ ...newCampaign, targetPrice: e.target.value })}
                    placeholder="e.g. AED 1,400,000 ceiling budget"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Submission Deadline *</label>
                  <input
                    type="text"
                    required
                    value={newCampaign.deadline}
                    onChange={(e) => setNewCampaign({ ...newCampaign, deadline: e.target.value })}
                    placeholder="e.g. Nov 15, 2026"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination Jobsite / Yard *</label>
                  <input
                    type="text"
                    required
                    value={newCampaign.location}
                    onChange={(e) => setNewCampaign({ ...newCampaign, location: e.target.value })}
                    placeholder="e.g. Dubai South Project Site, Plot C4"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment & Commercial Terms</label>
                  <input
                    type="text"
                    value={newCampaign.paymentTerms}
                    onChange={(e) => setNewCampaign({ ...newCampaign, paymentTerms: e.target.value })}
                    placeholder="e.g. 30% advance on inspection, 70% upon site handover"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description & Requirement Scope</label>
                <textarea
                  rows={2}
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Detail machine specifications, hours, boom length, delivery schedule..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Compliance & Technical Specifications (One per line)
                </label>
                <textarea
                  rows={3}
                  value={newCampaign.specifications}
                  onChange={(e) => setNewCampaign({ ...newCampaign, specifications: e.target.value })}
                  placeholder={"Preferred Models: Bauer BG28, Casagrande B250, or 80T Sumitomo\nUnder 4,500 certified engine hours with full maintenance log\nThird-party mechanical inspection and load test signoff"}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold">
                  Charges: Covered under Apex GC Enterprise Sourcing Plan
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCampaignBlastModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Blast Campaign ({categorySupplierCounts[newCampaign.category] || 150} Suppliers)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MAKE PURCHASE OFFER (FOR BUYING FROM MARKET DEALS) */}
      {selectedDealForOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Official Purchase Offer
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Make Offer for {selectedDealForOffer.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDealForOffer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchaseOffer} className="space-y-4 text-xs">
              <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-amber-900">Listed Deal Price:</span>
                  <span className="text-sm font-black text-slate-900">{selectedDealForOffer.targetPrice}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-800">
                  <span>Volume: {selectedDealForOffer.quantity}</span>
                  <span>Location: {selectedDealForOffer.location}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Your Purchase Offer Amount (AED) *
                </label>
                <input
                  type="number"
                  required
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-extrabold text-sm focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Proposed Payment Terms *</label>
                <input
                  type="text"
                  required
                  value={offerPaymentTerms}
                  onChange={(e) => setOfferPaymentTerms(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Purchase Offer Notes & Delivery Schedule
                </label>
                <textarea
                  rows={3}
                  value={offerNotes}
                  onChange={(e) => setOfferNotes(e.target.value)}
                  placeholder="State your required handover date, flatbed transport readiness, and inspection requirements..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDealForOffer(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Binding Purchase Offer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BOOK YARD INSPECTION */}
      {selectedDealForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Book Yard Inspection</h3>
                  <p className="text-[11px] text-slate-500">Physical verification & MTC review</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDealForInspection(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmInspection} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Inspecting Asset:</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDealForInspection.title}</p>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {selectedDealForInspection.sellerContact?.yardLocation || selectedDealForInspection.location}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Inspection Schedule *</label>
                <input
                  type="text"
                  required
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attending Engineer / Inspector *</label>
                <input
                  type="text"
                  required
                  value={inspectionEngineer}
                  onChange={(e) => setInspectionEngineer(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDealForInspection(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Yard Pass</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SUBMIT SUPPLIER BID (FOR VENDORS RESPONDING TO RFPS) */}
      {pricingModalOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">
                  Official Bid Submission
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Submit Commercial Proposal for {pricingModalOpp.rfqNumber}
                </h3>
              </div>
              <button
                onClick={() => setPricingModalOpp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupplierBid} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Requirement:</span>
                <p className="font-bold text-slate-800 mt-0.5">{pricingModalOpp.title}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  <span>Required: {pricingModalOpp.quantity}</span>
                  <span>Target: {pricingModalOpp.targetPrice}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Unit Price / Total Package Offer (AED) *
                </label>
                <input
                  type="number"
                  required
                  value={quoteUnitPrice}
                  onChange={(e) => setQuoteUnitPrice(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-extrabold text-sm focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mobilization / Delivery Days *
                  </label>
                  <input
                    type="number"
                    required
                    value={quoteLeadTime}
                    onChange={(e) => setQuoteLeadTime(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={quotePaymentTerms}
                    onChange={(e) => setQuotePaymentTerms(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Proposal Notes, Certifications & Machine Hours
                </label>
                <textarea
                  rows={3}
                  required
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Detail equipment serials, DCL compliance, test reports, and transport logistics..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPricingModalOpp(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Sealed Pricing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DETAILED AD INSIGHTS & CAMPAIGN ANALYTICS DRAWER */}
      {selectedOppForInsights && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {selectedOppForInsights.rfqNumber}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                    {selectedOppForInsights.category}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active Multi-Channel Broadcast
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Ad Campaign Performance & Audience Telemetry
                </h3>
              </div>
              <button
                onClick={() => setSelectedOppForInsights(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campaign Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Campaign Scope:</span>
              <h4 className="text-sm font-extrabold text-slate-900">{selectedOppForInsights.title}</h4>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>Destination: {selectedOppForInsights.location}</span>
                <span>Budget: {selectedOppForInsights.targetPrice || selectedOppForInsights.budgetRange}</span>
              </div>
            </div>

            {/* Funnel Metrics */}
            {selectedOppForInsights.campaignAnalytics && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Audience</span>
                    <span className="text-xl font-black text-slate-900 mt-0.5 block">
                      {selectedOppForInsights.campaignAnalytics.totalTargeted}
                    </span>
                    <span className="text-[10px] text-slate-500">100% Verified</span>
                  </div>

                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Delivered</span>
                    <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                      {selectedOppForInsights.campaignAnalytics.deliveredCount}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono">97.8% Delivery</span>
                  </div>

                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-800 block">Opened & Read</span>
                    <span className="text-xl font-black text-blue-700 mt-0.5 block">
                      {selectedOppForInsights.campaignAnalytics.openedCount}
                    </span>
                    <span className="text-[10px] text-blue-600 font-mono">{selectedOppForInsights.campaignAnalytics.clickThroughRate} Rate</span>
                  </div>

                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-purple-800 block">Responses / Bids</span>
                    <span className="text-xl font-black text-purple-700 mt-0.5 block">
                      {selectedOppForInsights.proposals?.length || selectedOppForInsights.campaignAnalytics.respondedCount}
                    </span>
                    <span className="text-[10px] text-purple-600 font-semibold">Active proposals</span>
                  </div>
                </div>

                {/* Geographic & Supplier Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-600" />
                      Geographic Audience Distribution
                    </h4>
                    <div className="space-y-2 text-xs">
                      {selectedOppForInsights.campaignAnalytics.geographicBreakdown.map((geo, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">{geo.region}</span>
                            <span className="font-mono text-slate-600">{geo.suppliers} vendors ({geo.percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${geo.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Responding Vendor Tier Split
                    </h4>
                    <div className="space-y-2 text-xs">
                      {selectedOppForInsights.campaignAnalytics.tierBreakdown.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="font-semibold text-slate-800">{t.tier}</span>
                          <span className="font-mono font-bold text-blue-700">{t.count} vendors</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Received Proposals within Insights */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900">
                  Received Proposals for this Campaign ({selectedOppForInsights.proposals?.length || 0})
                </h4>
                <button
                  onClick={() => {
                    setExpandedOppId(selectedOppForInsights.id);
                    setSelectedOppForInsights(null);
                  }}
                  className="text-xs text-purple-700 font-bold hover:underline cursor-pointer"
                >
                  View full proposals list in main view →
                </button>
              </div>

              <div className="space-y-2.5">
                {selectedOppForInsights.proposals?.map((prop) => (
                  <div key={prop.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <img src={prop.supplierAvatar} alt={prop.supplierName} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-slate-900 block">{prop.supplierCompany}</span>
                        <span className="text-[11px] text-slate-500">{prop.supplierName} • {prop.leadTimeDays} days lead time</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-slate-900 block">{prop.currency} {prop.unitPrice.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-purple-700 uppercase">{prop.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReblastCampaign(selectedOppForInsights)}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-700" />
                  <span>Re-Blast to Unopened</span>
                </button>

                <button
                  onClick={() => handleExportAuditReport(selectedOppForInsights.rfqNumber)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download PDF Audit</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedCampaignForAnalytics(selectedOppForInsights.id);
                    setSelectedOppForInsights(null);
                    setMainTab('analytics');
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Granular Analytics (Pro)</span>
                </button>

                <button
                  onClick={() => {
                    setExpandedOppId(selectedOppForInsights.id);
                    setSelectedOppForInsights(null);
                  }}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Evaluate Proposals ({selectedOppForInsights.proposals?.length || 0})</span>
                </button>

                <button
                  onClick={() => setSelectedOppForInsights(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800"
                >
                  Close Insights
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Bid Comparison Modal */}
      {comparisonModalOpp && (
        <BidComparisonModal
          isOpen={!!comparisonModalOpp}
          onClose={() => setComparisonModalOpp(null)}
          opportunity={comparisonModalOpp}
          proposals={comparisonModalOpp.proposals || []}
          onAwardProposal={(propId) => {
            handleUpdateProposalStatus(comparisonModalOpp.id, propId, 'awarded');
            setComparisonModalOpp(null);
          }}
          onShortlistProposal={(propId) => {
            handleUpdateProposalStatus(comparisonModalOpp.id, propId, 'shortlisted');
          }}
          onStartMessage={(userId, name) => {
            onStartMessageWith(userId, name);
          }}
        />
      )}
    </div>
  );
};
