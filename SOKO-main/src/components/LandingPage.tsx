import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SokoLogo } from './SokoLogo';
import {
  ShieldCheck,
  Building2,
  Users,
  Award,
  ArrowRight,
  CheckCircle2,
  FileText,
  MapPin,
  Clock,
  Lock,
  ChevronRight,
  ExternalLink,
  Flame,
  Check,
  X,
  Search,
  Sparkles,
  Layers,
  FileCheck,
  Tablet,
  FolderKanban,
  Database,
  BarChart3,
  Sliders,
  Scale,
  Leaf,
  Star,
  History,
  Briefcase,
  Globe2,
  Menu,
  ChevronDown,
  Building,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Eye,
  Activity,
  Send,
  UserCheck,
} from 'lucide-react';

// Authentic Official LinkedIn SVG Logo Icon
const LinkedInIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const LINKEDIN_DEMO_PROFILES = {
  buyer: {
    name: 'Marcus Vance',
    title: 'Director of Strategic Sourcing & EPC Contracts',
    company: 'Vance Infrastructure Group UAE',
    email: 'buyer@soko.ae',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    headline: 'Senior EPC Procurement Executive | FIDIC Contracts & Infrastructure Mega-Projects',
    connections: '1,420+ Connections',
    tradeLicense: 'DXB-8839201',
    department: 'Strategic Sourcing & EPC Contracts',
    location: 'Dubai, UAE',
  },
  supplier: {
    name: 'Elena Rostova',
    title: 'VP of Commercial Sales & Operations',
    company: 'Emirates Steel Industries PJSC',
    email: 'supplier@soko.ae',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    headline: 'Primary Metals & Industrial Alloys Leader | CARES & ASTM Compliance',
    connections: '980+ Connections',
    tradeLicense: 'AD-4402910',
    materialCategory: 'Structural Steel & Deformed Rebar',
    facilityLocation: 'ICAD 1, Musaffah, Abu Dhabi',
    location: 'Abu Dhabi, UAE',
  },
  contractor: {
    name: 'Sarah Jenkins',
    title: 'Executive Project Director & General Contractor',
    company: 'Arabian Construction Co. (ACC)',
    email: 'contractor@soko.ae',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    headline: 'Major Infrastructure General Contractor | Tendering & Commercial Delivery',
    connections: '2,150+ Connections',
    tradeLicense: 'CN-1049281',
    jurisdiction: 'Dubai Economy & Tourism (DET)',
    primaryRole: 'Commercial & Procurement',
    location: 'Dubai, UAE',
  },
};

interface LandingPageProps {
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onEnterApp?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onEnterApp }) => {
  const { login, register, loginWithLinkedIn } = useAuth();

  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Two-sided view filter: 'side-by-side' | 'contractors' | 'suppliers'
  const [networkView, setNetworkView] = useState<'all' | 'contractors' | 'suppliers'>('all');

  // Interactive 8-Question Selector
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Interactive Modal State (Self-contained + integrates with onOpenAuth/onEnterApp)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'join' | 'login'>('join');
  const [modalRole, setModalRole] = useState<'buyer' | 'supplier' | 'contractor'>('buyer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkedInSyncing, setIsLinkedInSyncing] = useState(false);
  const [linkedInSynced, setLinkedInSynced] = useState(false);

  // Modal form fields for Buyer, Contractor & Supplier
  const [buyerForm, setBuyerForm] = useState({
    companyName: 'Vance Infrastructure Group UAE',
    tradeLicense: 'DXB-8839201',
    primaryDepartment: 'Strategic Sourcing & EPC Contracts',
    workEmail: 'buyer@soko.ae',
    password: 'Password123!',
  });

  const [contractorForm, setContractorForm] = useState({
    companyName: 'Arabian Construction Co.',
    tradeLicense: 'CN-1049281',
    jurisdiction: 'Dubai Economy & Tourism (DET)',
    primaryRole: 'Commercial & Procurement',
    workEmail: 'contractor@soko.ae',
    password: 'Password123!',
  });

  const [supplierForm, setSupplierForm] = useState({
    entityName: 'Emirates Steel Industries PJSC',
    tradeLicense: 'AD-4402910',
    materialCategory: 'Structural Steel & Deformed Rebar',
    facilityLocation: 'ICAD 1, Musaffah, Abu Dhabi',
    contactEmail: 'supplier@soko.ae',
    password: 'Password123!',
  });

  const [formSubmitted, setFormSubmitted] = useState(false);

  // Prominent industry developers / contractors for infinite marquee
  const enterprisePartners = [
    { name: 'Emaar Properties', location: 'Dubai, UAE', badge: 'Tier-1 Developer' },
    { name: 'DAMAC Properties', location: 'Dubai, UAE', badge: 'Commercial Luxury' },
    { name: 'Binghatti', location: 'Business Bay, UAE', badge: 'High-Density Residential' },
    { name: 'Danube Properties', location: 'Al Barsha, UAE', badge: 'Affordable Luxury' },
    { name: 'Sobha Realty', location: 'Sobha Hartland, UAE', badge: 'Master Community' },
    { name: 'Nakheel', location: 'Palm Jumeirah, UAE', badge: 'Waterfront Mega-Projects' },
    { name: 'Aldar Properties', location: 'Abu Dhabi, UAE', badge: 'Sovereign Developer' },
    { name: 'Omniyat', location: 'DIFC, UAE', badge: 'Ultra-Luxury Architecture' },
    { name: 'Al Habtoor Group', location: 'Dubai, UAE', badge: 'Hospitality & Towers' },
    { name: 'Arabtec Construction', location: 'UAE / GCC', badge: 'Civil Infrastructure' },
    { name: 'Shapoorji Pallonji', location: 'International', badge: 'EPC & Engineering' },
    { name: 'Consolidated Contractors (CCC)', location: 'Global', badge: 'Heavy Civil & Oil/Gas' },
  ];

  // The 8 Intelligence Questions data
  const intelligenceQuestions = [
    {
      id: 'who',
      number: '01',
      question: 'Who is the supplier?',
      category: 'Corporate Identity & Governance',
      description: 'Independent verification of corporate registration, legal entity structure, physical plant coordinates, and authenticated executive contacts.',
      tags: ['Trade License Audited', 'GIS Facility Geofence', 'Key Executive Verification'],
      details: {
        legalName: 'Emirates Rebar Fabrication Industries LLC',
        tradeLicense: 'CN-2940291 (Dubai Economy & Tourism - Active)',
        facility: 'Plot 598-1209, Dubai Industrial City (DIC), UAE',
        scale: '45,000 sq. meters covered manufacturing yard',
        officers: ['Eng. Tariq Al-Mansoor (Chief Commercial Officer)', 'Vikram Sharma (Head of Technical Sales)'],
        auditStatus: 'Verified by SOKO Commercial Registrar',
      },
    },
    {
      id: 'what',
      number: '02',
      question: 'What do they supply?',
      category: 'Product Scope & Specifications',
      description: 'Granular cataloging mapped to CSI MasterFormat sections, regional standard compliance (ASTM, BS EN, DIN), and daily fabrication throughput.',
      tags: ['CSI Division 03 21 00', 'ASTM A615 / BS 4449', 'Batch Heat Traceability'],
      details: {
        coreProducts: 'High-yield deformed reinforcement bars (8mm - 40mm)',
        grades: 'Grade 60 (420 MPa), Grade 75 (500 MPa), B500B weldable',
        capacities: '85,000 Metric Tonnes per month cut-and-bend output',
        documentation: 'Third-party material test certificates (MTC) archived per heat number',
        consultantApprovals: 'Approved by Khatib & Alami, Parsons, Atkins, and Dar Al-Handasah',
      },
    },
    {
      id: 'compliance',
      number: '03',
      question: 'Are they certified and compliant?',
      category: 'Compliance & Quality Assurance',
      description: 'Real-time auditing of quality management systems, international test certificates, and environmental stewardship accreditations.',
      tags: ['ISO 9001:2015', 'ISO 14001:2015', 'CARES Certified'],
      details: {
        standards: 'UK CARES Product Conformity (Cert No. 120401)',
        qualityCert: 'ISO 9001:2015 Quality Management (TÜV SÜD audited)',
        safetyCert: 'ISO 45001:2018 Occupational Health & Safety',
        lastAudit: 'October 14, 2025 · Physical inspector on-site',
        expiryTracking: 'Automated renewal alerts 60 days prior to license expiry',
      },
    },
    {
      id: 'standing',
      number: '04',
      question: 'What is their legal & commercial standing?',
      category: 'Risk & Commercial Solvency',
      description: 'Transparent tracking of commercial litigation registry status, active corporate licensing standing, and credit solvency indices.',
      tags: ['Zero Active Court Filings', 'Al Etihad Credit Bureau Checked', 'Bank Letter on File'],
      details: {
        legalStanding: 'In Good Standing with Ministry of Economy',
        commercialDisputes: 'Zero active supplier lien or non-delivery adjudications',
        paymentHistory: '30-45 day average vendor settlement track record',
        insuranceCoverage: 'AED 50,000,000 Comprehensive Commercial General Liability',
      },
    },
    {
      id: 'capacity',
      number: '05',
      question: 'What is their true production capacity?',
      category: 'Capacity & Lead Time Feasibility',
      description: 'Verifiable physical metrics ensuring the supplier will not overcommit, choke your construction timeline, or delay critical path milestones.',
      tags: ['Daily Throughput Metering', 'Buffer Stock Audited', 'Fleet Logistics Count'],
      details: {
        activePlantLines: '4 automated Schnell cut-and-bend CNC lines',
        rawMaterialStockpile: '22,000 MT raw billet and coil reserve in Jebel Ali',
        deliveryFleet: '32 dedicated heavy articulated flatbed trailers with GPS',
        peakSurgeCapability: '+30% output during accelerated pour cycles',
      },
    },
    {
      id: 'sustainability',
      number: '06',
      question: 'Do they meet ESG & sustainability standards?',
      category: 'Sustainability & Decarbonization',
      description: 'Embodied carbon metrics, recycled scrap percentage, Environmental Product Declarations (EPD), and LEED v4 / Estidama compliance.',
      tags: ['Type III EPD Verified', 'LEED v4.1 Contributor', 'Estidama Pearl 3+'],
      details: {
        scrapRecycledContent: '98.4% electric arc furnace (EAF) recycled feedstock',
        carbonIntensity: '0.62 tCO2e / MT steel (68% below blast furnace industry benchmark)',
        epdReport: 'SCS Global Services EPD-04910 registered and searchable',
        waterRecycling: 'Closed-loop 94% plant cooling water recycling system',
      },
    },
    {
      id: 'rating',
      number: '07',
      question: 'What is their verified performance rating?',
      category: 'Delivery Performance & Track Record',
      description: 'Objective empirical tracking of delivery on-time rates, material rejection percentages, and verified commercial dispute resolution history.',
      tags: ['98.4% On-Time Delivery', '<0.2% Site Rejection Rate', '140+ Projects Delivered'],
      details: {
        compositeScore: '96 / 100 SOKO Verified Reliability Index',
        punctualityIndex: '98.4% deliveries arrived within scheduled 2-hour pour window',
        qualityRejections: '0.18% batch rejections across 820,000 MT logged',
        majorDeliveries: 'Burj Royale, Meydan One Mall, Dubai Metro Route 2020 expansion',
      },
    },
    {
      id: 'history',
      number: '08',
      question: 'What is the relationship history with the buyer?',
      category: 'Institutional Memory & Visitor Logs',
      description: 'Eliminates tribal knowledge by linking front-desk kiosk visitor check-ins, past tender pricing history, and private commercial team notes.',
      tags: ['Office Kiosk Sync', 'Private Team Notes', 'No Tribal Knowledge Loss'],
      details: {
        kioskVisits: '14 authenticated office meetings logged across 3 project sites',
        lastInteraction: 'Commercial review at Headquarters on March 18, 2026',
        internalPrivateNotes: 'Commercial team note: "Consistent delivery; flexible on payment LC terms for structural packages > AED 10M."',
        continuity: 'New estimators and procurement leads inherit full 5-year relationship context',
      },
    },
  ];

  const handleOpenModal = (
    mode: 'join' | 'signin' | 'login',
    role: 'buyer' | 'contractor' | 'supplier' = 'buyer'
  ) => {
    setModalMode(mode === 'signin' ? 'login' : mode);
    setModalRole(role);
    setFormSubmitted(false);
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (modalMode === 'login') {
        const email =
          modalRole === 'buyer'
            ? buyerForm.workEmail
            : modalRole === 'supplier'
            ? supplierForm.contactEmail
            : contractorForm.workEmail;
        const password =
          modalRole === 'buyer'
            ? buyerForm.password
            : modalRole === 'supplier'
            ? supplierForm.password
            : contractorForm.password;

        await login({ email, password });
      } else {
        const name =
          modalRole === 'buyer'
            ? 'Marcus Vance'
            : modalRole === 'supplier'
            ? 'Elena Rostova'
            : 'Sarah Jenkins';
        const email =
          modalRole === 'buyer'
            ? buyerForm.workEmail
            : modalRole === 'supplier'
            ? supplierForm.contactEmail
            : contractorForm.workEmail;
        const password =
          modalRole === 'buyer'
            ? buyerForm.password
            : modalRole === 'supplier'
            ? supplierForm.password
            : contractorForm.password;
        const company =
          modalRole === 'buyer'
            ? buyerForm.companyName
            : modalRole === 'supplier'
            ? supplierForm.entityName
            : contractorForm.companyName;

        await register({
          name,
          email,
          password,
          role: modalRole,
          company,
          phone: '+971 4 800 2026',
        });
      }
    } catch {
      // Demo fallback
    } finally {
      setIsSubmitting(false);
      setFormSubmitted(true);
      setTimeout(() => {
        setModalOpen(false);
        if (onEnterApp) {
          onEnterApp();
        }
      }, 700);
    }
  };

  const handleLinkedInEasyAuth = (targetRole?: 'buyer' | 'supplier' | 'contractor') => {
    const role = targetRole || modalRole;
    setIsLinkedInSyncing(true);

    setTimeout(() => {
      if (role === 'buyer') {
        const profile = LINKEDIN_DEMO_PROFILES.buyer;
        setBuyerForm((prev) => ({
          ...prev,
          companyName: profile.company,
          primaryDepartment: profile.department,
          workEmail: profile.email,
        }));
      } else if (role === 'supplier') {
        const profile = LINKEDIN_DEMO_PROFILES.supplier;
        setSupplierForm((prev) => ({
          ...prev,
          entityName: profile.company,
          contactEmail: profile.email,
          materialCategory: profile.materialCategory,
          facilityLocation: profile.facilityLocation,
        }));
      } else {
        const profile = LINKEDIN_DEMO_PROFILES.contractor;
        setContractorForm((prev) => ({
          ...prev,
          companyName: profile.company,
          workEmail: profile.email,
          jurisdiction: profile.jurisdiction,
          primaryRole: profile.primaryRole,
        }));
      }

      setLinkedInSynced(true);
      setIsLinkedInSyncing(false);
    }, 600);
  };

  const handleCompleteLinkedInAuth = async () => {
    setIsSubmitting(true);
    const profile = LINKEDIN_DEMO_PROFILES[modalRole];

    try {
      await loginWithLinkedIn({
        role: modalRole,
        name: profile.name,
        email: profile.email,
        company: profile.company,
        title: profile.title,
        avatarUrl: profile.avatarUrl,
        tradeLicenseNo: profile.tradeLicense,
      });
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
      setFormSubmitted(true);
      setTimeout(() => {
        setModalOpen(false);
        if (onEnterApp) {
          onEnterApp();
        }
      }, 700);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 1. STICKY NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-2.5 group cursor-pointer">
              <SokoLogo size="md" className="shadow-xs" />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-slate-950 flex items-center">
                  SOKO<span className="text-blue-600">.ae</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest -mt-0.5 hidden sm:block">
                  Source & Konnect Better
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-700">
            <a
              href="#how-it-works"
              className="hover:text-slate-950 hover:bg-slate-50 px-2.5 py-1.5 rounded-md transition-colors"
            >
              How It Works
            </a>
            <a
              href="#solution"
              className="hover:text-slate-950 hover:bg-slate-50 px-2.5 py-1.5 rounded-md transition-colors"
            >
              Platform
            </a>
            <a
              href="#contractors"
              className="hover:text-slate-950 hover:bg-slate-50 px-2.5 py-1.5 rounded-md transition-colors"
            >
              For Contractors
            </a>
            <a
              href="#suppliers"
              className="hover:text-slate-950 hover:bg-slate-50 px-2.5 py-1.5 rounded-md transition-colors"
            >
              For Suppliers
            </a>
            <a
              href="#principles"
              className="hover:text-slate-950 hover:bg-slate-50 px-2.5 py-1.5 rounded-md transition-colors"
            >
              Core Principles
            </a>
          </nav>

          {/* Right Action Buttons: Consolidated Join/Login */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              onClick={() => handleOpenModal('join', 'buyer')}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-950 hover:bg-slate-900 rounded-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer group"
            >
              <span>Join/Login</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            {onEnterApp && (
              <button
                onClick={onEnterApp}
                className="ml-1 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-all cursor-pointer flex items-center gap-1"
                title="Direct access to live portal demonstration workspace"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">Open App</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex sm:hidden items-center gap-2">
            {onEnterApp && (
              <button
                onClick={onEnterApp}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 border border-slate-200 rounded-md text-slate-800"
              >
                App
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-md"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-1 text-sm font-semibold text-slate-800">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-50"
              >
                How It Works
              </a>
              <a
                href="#solution"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-50"
              >
                Platform
              </a>
              <a
                href="#contractors"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-50"
              >
                For Contractors
              </a>
              <a
                href="#suppliers"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-50"
              >
                For Suppliers
              </a>
              <a
                href="#principles"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-50"
              >
                Core Principles
              </a>
            </nav>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenModal('join', 'buyer');
                }}
                className="w-full py-2.5 text-xs font-bold text-center bg-slate-950 text-white rounded-md flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Join/Login</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-slate-200 bg-white blueprint-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Top Monospace Kicker */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 text-slate-100 text-xs font-mono font-medium border border-slate-800 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span>Global Vendor Management & Supplier Intelligence</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]">
              The Intelligence Layer for the{' '}
              <span className="text-slate-950 relative inline-block">
                Construction Supply Chain.
                <span className="absolute bottom-1 left-0 w-full h-2 bg-amber-400/40 -z-1" />
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight">
              Discover verified suppliers. Understand capabilities. Build stronger supplier relationships.
            </p>

            {/* Supporting Paragraph */}
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              SOKO transforms fragmented supplier records into structured, verifiable intelligence.
              Not an ecommerce marketplace or an ERP replacement—SOKO is the common relationship layer
              connecting contractors and suppliers seamlessly alongside SAP, Oracle, Procore, and Viewpoint.
            </p>

            {/* Dual CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={() => handleOpenModal('join', 'contractor')}
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-md font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>For Contractors → Join SOKO</span>
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => handleOpenModal('join', 'supplier')}
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-amber-50/50 text-slate-900 border border-amber-400 rounded-md font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>For Suppliers → Create Free Profile</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </button>
            </div>

            {/* Positioning Bar */}
            <div className="pt-4 border-t border-slate-200/80 mt-8">
              <p className="font-mono text-xs text-slate-600 tracking-tight">
                Free Access for Contractors &nbsp;·&nbsp; Verified Trade Licenses & ISOs &nbsp;·&nbsp; No Ecommerce Checkout &nbsp;·&nbsp; Informational Product Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Infinite Marquee Carousel: Trusted by Industry Leaders */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 mb-4 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Trusted by Top Commercial Contractors, Developers & Engineering Leaders
            </p>
          </div>

          <div className="relative w-full overflow-hidden bg-slate-50 py-4 border-y border-slate-200">
            {/* Fade Gradients for edge masking */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

            {/* Continuous Ticker */}
            <div className="animate-marquee flex items-center gap-8">
              {[...enterprisePartners, ...enterprisePartners].map((partner, index) => (
                <div
                  key={`${partner.name}-${index}`}
                  className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-md border border-slate-200 shadow-2xs shrink-0 hover:border-slate-400 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-slate-600" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                      {partner.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap">
                      {partner.location} · <strong className="text-slate-700">{partner.badge}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW SOKO WORKS (4-STEP PROCESS) */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-14 space-y-3">
            <span className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-slate-800 bg-white border border-slate-300 rounded-md px-2.5 py-1">
              SIMPLE PROCESS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              How SOKO Works
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              From onboarding to ongoing intelligence, our platform streamlines every aspect of supplier
              relationship management.
            </p>
          </div>

          {/* 4 Process Cards in a responsive 4-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-md bg-slate-950 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs group-hover:bg-amber-600 transition-colors">
                  01
                </div>
                <h3 className="text-base font-extrabold text-slate-950 tracking-tight">
                  Sign Up & Verify
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Create your company profile and complete the verification process. Upload licenses,
                  certifications, and business documents for automated and audited registrar review.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-200/60 font-mono text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Trade License & ISO Audit</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-md bg-slate-950 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs group-hover:bg-amber-600 transition-colors">
                  02
                </div>
                <h3 className="text-base font-extrabold text-slate-950 tracking-tight">
                  Build Your Network
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Connect with suppliers, contractors, and procurement professionals. Discover relevant
                  companies and products by technical specs (ASTM, BS, DIN) and geographical proximity.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-200/60 font-mono text-[11px] text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Direct Verified Directory</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-md bg-slate-950 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs group-hover:bg-amber-600 transition-colors">
                  03
                </div>
                <h3 className="text-base font-extrabold text-slate-950 tracking-tight">
                  Track Interactions
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Log visits, meetings, and communications. Capture key details, meeting outcomes, reception
                  kiosk check-ins, and follow-up actions automatically to eliminate tribal knowledge.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-200/60 font-mono text-[11px] text-slate-500 flex items-center gap-1.5">
                <Tablet className="w-3.5 h-3.5 text-amber-600" />
                <span>Office Kiosk & Notes Integration</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-md bg-slate-950 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs group-hover:bg-amber-600 transition-colors">
                  04
                </div>
                <h3 className="text-base font-extrabold text-slate-950 tracking-tight">
                  Gain Intelligence
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Access analytics, insights, and reliability reports. Make data-driven decisions with comprehensive
                  supplier intelligence without disrupting existing ERP purchase orders or accounting workflows.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-200/60 font-mono text-[11px] text-slate-500 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Audited Performance Scores</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE SOKO PLATFORM (CORE ARCHITECTURE & CAPABILITIES) */}
      <section id="solution" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-14 space-y-3">
            <span className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-300 rounded-md px-2.5 py-1">
              THE SOKO ARCHITECTURE
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              The intelligence and relationship layer around your procurement ecosystem.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              SOKO does not displace your existing enterprise software. It wraps around systems like
              SAP®, Oracle®, Procore®, and Viewpoint® with zero integration friction—feeding your team
              uncompromised supplier discovery, validated technical dossiers, and institutional vendor memory.
            </p>
          </div>

          {/* 4 Platform Capability Cards in 4-column responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-950">
                  1. Centralized Supplier Directory
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Search across verified materials, structural components, and MEP assemblies. Filter by
                  material category, regional jurisdiction, certified standards (ASTM, BS, DIN), and audited verification tiers.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-slate-100 space-y-1.5 font-mono text-[11px] text-slate-600">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Granular CSI MasterFormat filter
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Factory geofence confirmation
                </li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-950">
                  2. Verified Digital Supplier Identity
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Independent verification of commercial trade licenses, facility scale, executive contacts,
                  and active legal standing. Never award tenders to shell entities or defunct operations.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-slate-100 space-y-1.5 font-mono text-[11px] text-slate-600">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Registrar trade license audit
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Verified executive contacts
                </li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-950">
                  3. Informational Product Intelligence
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Structured product and brand listings complete with material test reports, engineering load
                  parameters, consultant approvals, and sustainability declarations (LEED / Estidama).
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-slate-100 space-y-1.5 font-mono text-[11px] text-slate-600">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Material Test Reports (MTC) linked
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Consultant approval matrices
                </li>
              </ul>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Tablet className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-base font-extrabold text-slate-950">
                  4. Visit Tracking & Internal Notes
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Connect office reception kiosk check-ins directly to vendor records. Add private commercial
                  evaluations and performance notes so your company never loses institutional relationship memory.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-slate-100 space-y-1.5 font-mono text-[11px] text-slate-600">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Office kiosk visitor logs
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Team-private encrypted notes
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TWO-SIDED NETWORK ARCHITECTURE (CONTRACTOR VS. SUPPLIER DEEP DIVE) */}
      <section id="contractors" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-10 space-y-3">
            <span className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-slate-800 bg-white border border-slate-300 rounded-md px-2.5 py-1">
              TWO-SIDED VALUE
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Two-Sided Network Architecture
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              SOKO creates balanced, high-trust value for both sides of the commercial construction equation.
            </p>
          </div>

          {/* Segmented View Filter */}
          <div className="flex items-center gap-2 mb-8 border-b border-slate-200 pb-4">
            <span className="text-xs font-mono text-slate-500 uppercase mr-2 hidden sm:inline">View Perspective:</span>
            <button
              onClick={() => setNetworkView('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all ${
                networkView === 'all'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Side-by-Side View
            </button>
            <button
              onClick={() => setNetworkView('contractors')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all ${
                networkView === 'contractors'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              For Contractors Only
            </button>
            <button
              id="suppliers"
              onClick={() => setNetworkView('suppliers')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all ${
                networkView === 'suppliers'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              For Suppliers Only
            </button>
          </div>

          {/* Side-by-Side Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Left Column: For Buyers & Contractors */}
            {(networkView === 'all' || networkView === 'contractors') && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
                      Commercial Ecosystem
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      100% Free Access
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                    For Buyers & Contractors
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Eliminate fragmented spreadsheets and tribal memory. SOKO gives your commercial, estimating,
                    and procurement teams an auditable, verified supplier intelligence command center.
                  </p>

                  {/* 8 Verified Value Points */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Centralized Supplier Directory</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Instant Specification Filtering</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Verified Trade Licenses & Standing</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Product & Brand Representation</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Reception Kiosk Visit Tracking</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Private Internal Buyer Notes</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Institutional Vendor Memory</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Zero Subscription Cost</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleOpenModal('join', 'contractor')}
                    className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-md font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
                  >
                    <span>Join SOKO as a Contractor (Free Access)</span>
                    <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {/* Right Column: For Suppliers */}
            {(networkView === 'all' || networkView === 'suppliers') && (
              <div className="bg-amber-50/40 border border-amber-300 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800">
                      Commercial Ecosystem
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md border border-amber-300">
                      <Star className="w-3.5 h-3.5 text-amber-700" />
                      Freemium Entry
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                    For Suppliers
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Build verified credibility. SOKO gives quality manufacturers and stockists a prestigious digital
                    presence where audited credentials speak louder than sales pitches.
                  </p>

                  {/* 8 Verified Value Points */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Professional Digital Supplier Profile</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Structured Product Showcase</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Verified Digital Identity</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Direct Contractor Visibility</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Credibility Over Cold Calls</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Ecosystem Presence Tracking</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Zero In-House Platform Costs</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-semibold">Priority Prequalification Support</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-amber-200">
                  <button
                    onClick={() => handleOpenModal('join', 'supplier')}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <span>Create Free Supplier Profile</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. SOKO'S CORE PRINCIPLE (THE 8 INTELLIGENCE QUESTIONS) */}
      <section id="principles" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-12 space-y-3">
            <span className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-slate-800 bg-white border border-slate-300 rounded-md px-2.5 py-1">
              SOKO'S CORE PRINCIPLE
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Verify. Discover. Connect. Understand.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Every procurement professional asks 8 fundamental questions before issuing an RFQ or approving a vendor.
              SOKO answers every one with verifiable, structured data.
            </p>
          </div>

          {/* Interactive 8-Question Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8 Tabs */}
            <div className="lg:col-span-5 space-y-2">
              {intelligenceQuestions.map((q, idx) => {
                const isActive = activeQuestionIndex === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-slate-950 text-white border-slate-950 shadow-md translate-x-1'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                          isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {q.number}
                      </span>
                      <div>
                        <span className="text-xs sm:text-sm font-bold block leading-snug">
                          {q.question}
                        </span>
                        <span
                          className={`text-[10px] font-mono block ${
                            isActive ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {q.category}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? 'text-amber-400 translate-x-1' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Right Detail Card for Selected Question */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-300 p-6 sm:p-8 shadow-lg space-y-6">
              {(() => {
                const current = intelligenceQuestions[activeQuestionIndex];
                return (
                  <>
                    <div className="space-y-3 border-b border-slate-100 pb-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Question {current.number} · {current.category}
                        </span>
                        <span className="font-mono text-xs text-slate-500">Live Verifiable Metric</span>
                      </div>

                      <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                        "{current.question}"
                      </h3>

                      <p className="text-sm text-slate-600 leading-relaxed">
                        {current.description}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {current.tags.map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[11px] font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200"
                          >
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Data Box */}
                    <div className="space-y-3 bg-slate-50 p-5 rounded-lg border border-slate-200">
                      <span className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Example Verified Dossier Record:
                      </span>

                      <div className="space-y-2 text-xs">
                        {Object.entries(current.details).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-slate-200/60 last:border-none gap-1"
                          >
                            <span className="text-slate-500 font-mono capitalize">
                              {key.replace(/([A-Z])/g, ' $1')}:
                            </span>
                            <span className="font-bold text-slate-900 text-right">
                              {Array.isArray(value) ? value.join(', ') : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>Institutional Confidence Guarantee:</strong>
                        <p className="text-slate-600 mt-0.5">
                          Every data point displayed in SOKO is backed by authenticated documentation,
                          registrar cross-referencing, or recorded commercial interaction.
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* 7. ENTERPRISE FOOTER */}
      <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <SokoLogo size="md" className="shadow-xs border border-white/20" />
                <div className="flex flex-col">
                  <span className="text-2xl font-extrabold tracking-tight text-white flex items-center leading-none">
                    SOKO<span className="text-blue-500">.ae</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                    Source & Konnect Better
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                The world's trusted digital intelligence layer for the commercial construction supply chain.
                Operates seamlessly alongside SAP, Oracle, Procore, and Viewpoint.
              </p>

              <div className="space-y-1 font-mono text-[11px] text-slate-400 pt-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Global HQ · Gate Precinct, DIFC, Dubai, UAE</span>
                </div>
                <p className="text-slate-500 pl-5.5">Operating globally across GCC, MENA, and international markets.</p>
              </div>
            </div>

            {/* Navigation Column 1: Platform */}
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider block">
                Platform
              </span>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#solution" className="hover:text-white transition-colors">
                    Architecture & Capabilities
                  </a>
                </li>
                <li>
                  <a href="#contractors" className="hover:text-white transition-colors">
                    For Contractors (Free)
                  </a>
                </li>
                <li>
                  <a href="#suppliers" className="hover:text-white transition-colors">
                    For Suppliers
                  </a>
                </li>
                <li>
                  <a href="#principles" className="hover:text-white transition-colors">
                    Core Principles (8 Questions)
                  </a>
                </li>
              </ul>
            </div>

            {/* Navigation Column 2: Capabilities */}
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider block">
                Capabilities
              </span>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="hover:text-white cursor-pointer" onClick={() => handleOpenModal('signin')}>
                    Supplier Directory
                  </span>
                </li>
                <li>
                  <span className="hover:text-white cursor-pointer" onClick={() => handleOpenModal('signin')}>
                    Product Intelligence
                  </span>
                </li>
                <li>
                  <span className="hover:text-white cursor-pointer" onClick={() => handleOpenModal('signin')}>
                    Verification Engine
                  </span>
                </li>
                <li>
                  <span className="hover:text-white cursor-pointer" onClick={() => handleOpenModal('signin')}>
                    Reception Kiosk VMS
                  </span>
                </li>
                <li>
                  <span className="hover:text-white cursor-pointer" onClick={() => handleOpenModal('signin')}>
                    Institutional Memory Vault
                  </span>
                </li>
              </ul>
            </div>

            {/* Navigation Column 3: Legal & Trust */}
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider block">
                Legal & Governance
              </span>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#principles" className="hover:text-white transition-colors">
                    Terms of Intelligence
                  </a>
                </li>
                <li>
                  <a href="#principles" className="hover:text-white transition-colors">
                    Verification Disclosure
                  </a>
                </li>
                <li>
                  <a href="#principles" className="hover:text-white transition-colors">
                    Privacy & Data Sovereignty
                  </a>
                </li>
                <li>
                  <a href="#principles" className="hover:text-white transition-colors">
                    Anti-Bribery & FCPA Compliance
                  </a>
                </li>
                <li>
                  <a href="#principles" className="hover:text-white transition-colors">
                    Security & SOC 2 Standards
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar & Strict Non-Transaction Disclaimer */}
          <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-mono text-slate-500">
            <div>
              © 2026 SOKO Intelligence Technologies FZ-LLC. All rights reserved.
            </div>
            <div className="max-w-2xl text-[10px] text-slate-500 leading-normal">
              <strong>Informational Platform Notice:</strong> SOKO is an informational intelligence and vendor relationship
              management layer. SOKO is not an ecommerce marketplace, does not operate transaction checkouts, and does not process
              monetary contractor-supplier settlements or commercial procurement payments.
            </div>
          </div>
        </div>
      </footer>

      {/* 8. INTERACTIVE JOIN & SIGN-IN MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-xl border border-slate-300 shadow-2xl max-w-lg w-full overflow-hidden relative max-h-[92vh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <SokoLogo size="sm" className="shadow-xs border border-white/20" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                    <span>{modalMode === 'join' ? 'Join SOKO.ae' : 'Sign In to SOKO.ae'}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase font-semibold">
                      {modalRole}
                    </span>
                  </h3>
                  <span className="font-mono text-[10px] text-slate-300 block -mt-0.5">
                    {modalRole === 'buyer'
                      ? 'Enterprise Buyer & Strategic Sourcing Portal'
                      : modalRole === 'supplier'
                      ? 'Tier-1 Supplier, Manufacturer & Stockist Registry'
                      : 'General Contractor & Commercial Tendering Workspace'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode & Role Switchers */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 space-y-3 shrink-0">
              {/* Join vs Login Primary Toggle */}
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Action:
                </span>
                <div className="grid grid-cols-2 gap-2 bg-slate-200 p-1 rounded-lg text-xs font-bold text-center">
                  <button
                    type="button"
                    onClick={() => setModalMode('join')}
                    className={`py-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalMode === 'join'
                        ? 'bg-white text-slate-950 shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Join SOKO (New Account)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('login')}
                    className={`py-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalMode === 'login'
                        ? 'bg-white text-slate-950 shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Login (Existing User)</span>
                  </button>
                </div>
              </div>

              {/* Role Toggle: Buyer, Supplier, Contractor */}
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {modalMode === 'join' ? 'Select Profile Role to Join:' : 'Select Profile Role to Login:'}
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setModalRole('buyer')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      modalRole === 'buyer'
                        ? 'bg-white border-blue-600 ring-2 ring-blue-500/20 text-slate-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[10px] font-mono text-blue-600 font-bold uppercase">Enterprise</span>
                    <span className="block text-xs font-bold text-slate-900">Buyer</span>
                    <span className="block text-[10px] text-slate-400 truncate">Sourcing & EPC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalRole('supplier')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      modalRole === 'supplier'
                        ? 'bg-white border-amber-600 ring-2 ring-amber-500/20 text-slate-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[10px] font-mono text-amber-600 font-bold uppercase">Tier-1 Supplier</span>
                    <span className="block text-xs font-bold text-slate-900">Supplier</span>
                    <span className="block text-[10px] text-slate-400 truncate">Stockist & Fab</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalRole('contractor')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      modalRole === 'contractor'
                        ? 'bg-white border-slate-950 ring-2 ring-slate-950/20 text-slate-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[10px] font-mono text-emerald-600 font-bold uppercase">100% Free</span>
                    <span className="block text-xs font-bold text-slate-900">Contractor</span>
                    <span className="block text-[10px] text-slate-400 truncate">GC & Tendering</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-950">
                    {modalMode === 'join' ? 'Verification Profile Created' : 'Authentication Successful'}
                  </h4>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto">
                    Redirecting to the SOKO Intelligence workspace command center as {modalRole.toUpperCase()}...
                  </p>
                </div>
              ) : (
                <>
                  {/* LinkedIn Easy Sign Up / Sign In Card with Automated Photo & Profile Loading */}
                  <div className="bg-[#0A66C2]/5 border border-[#0A66C2]/30 rounded-xl p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shrink-0 shadow-xs">
                          <LinkedInIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate flex items-center gap-1.5">
                            <span>{modalMode === 'join' ? 'Easy Sign Up with LinkedIn' : 'Quick Sign In with LinkedIn'}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0A66C2]/15 text-[#0A66C2] font-extrabold uppercase">
                              Instant
                            </span>
                          </span>
                          <p className="text-[11px] text-slate-600 truncate">
                            Automatically loads photo, title & verified credentials for {modalRole.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLinkedInEasyAuth(modalRole)}
                        disabled={isLinkedInSyncing}
                        className="w-full sm:w-auto px-4 py-2 bg-[#0A66C2] hover:bg-[#084e96] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all shrink-0 disabled:opacity-50"
                      >
                        <LinkedInIcon className={`w-4 h-4 text-white ${isLinkedInSyncing ? 'animate-spin' : ''}`} />
                        <span>{isLinkedInSyncing ? 'Loading Profile & Photo...' : modalMode === 'join' ? '1-Click Sign Up' : '1-Click Sign In'}</span>
                      </button>
                    </div>

                    {/* Auto-Loaded Profile Preview Card when Synced */}
                    {linkedInSynced && (
                      <div className="bg-white rounded-lg border border-[#0A66C2]/30 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            LinkedIn Profile & Headshot Photo Loaded Automatically
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {LINKEDIN_DEMO_PROFILES[modalRole].connections}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={LINKEDIN_DEMO_PROFILES[modalRole].avatarUrl}
                                alt={LINKEDIN_DEMO_PROFILES[modalRole].name}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-[#0A66C2] shadow-xs"
                              />
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0A66C2] text-white flex items-center justify-center ring-1 ring-white">
                                <LinkedInIcon className="w-2.5 h-2.5" />
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {LINKEDIN_DEMO_PROFILES[modalRole].name}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20">
                                  Verified LinkedIn
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 truncate font-medium">
                                {LINKEDIN_DEMO_PROFILES[modalRole].title}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {LINKEDIN_DEMO_PROFILES[modalRole].company} · {LINKEDIN_DEMO_PROFILES[modalRole].location}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleCompleteLinkedInAuth}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all shrink-0 flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{modalMode === 'join' ? 'Finish Quick Sign Up →' : 'Confirm & Sign In →'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="relative flex items-center justify-center pt-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <span className="relative px-2.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Or continue with credentials below
                      </span>
                    </div>
                  </div>

                  {modalMode === 'login' ? (
                /* ================= LOGIN FOR BUYER / SUPPLIER / CONTRACTOR ================= */
                <div className="space-y-4">
                  {/* Quick One-Click Demo Login Banner */}
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="text-[11px] font-bold text-blue-950 block">
                          Instant One-Click Demo Login:
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {modalRole === 'buyer'
                            ? 'buyer@soko.ae (Marcus Vance)'
                            : modalRole === 'supplier'
                            ? 'supplier@soko.ae (Elena Rostova)'
                            : 'contractor@soko.ae (Sarah Jenkins)'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (modalRole === 'buyer') {
                          setBuyerForm((prev) => ({ ...prev, workEmail: 'buyer@soko.ae', password: 'Password123!' }));
                        } else if (modalRole === 'supplier') {
                          setSupplierForm((prev) => ({ ...prev, contactEmail: 'supplier@soko.ae', password: 'Password123!' }));
                        } else {
                          setContractorForm((prev) => ({ ...prev, workEmail: 'contractor@soko.ae', password: 'Password123!' }));
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors shrink-0 cursor-pointer shadow-2xs"
                    >
                      Autofill
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {modalRole === 'buyer'
                        ? 'Buyer Corporate Email'
                        : modalRole === 'supplier'
                        ? 'Supplier Commercial Email'
                        : 'Contractor Work Email'}
                    </label>
                    <input
                      type="email"
                      required
                      value={
                        modalRole === 'buyer'
                          ? buyerForm.workEmail
                          : modalRole === 'supplier'
                          ? supplierForm.contactEmail
                          : contractorForm.workEmail
                      }
                      onChange={(e) => {
                        if (modalRole === 'buyer') {
                          setBuyerForm({ ...buyerForm, workEmail: e.target.value });
                        } else if (modalRole === 'supplier') {
                          setSupplierForm({ ...supplierForm, contactEmail: e.target.value });
                        } else {
                          setContractorForm({ ...contractorForm, workEmail: e.target.value });
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-slate-950 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Password
                    </label>
                    <input
                      type="password"
                      required
                      value={
                        modalRole === 'buyer'
                          ? buyerForm.password
                          : modalRole === 'supplier'
                          ? supplierForm.password
                          : contractorForm.password
                      }
                      onChange={(e) => {
                        if (modalRole === 'buyer') {
                          setBuyerForm({ ...buyerForm, password: e.target.value });
                        } else if (modalRole === 'supplier') {
                          setSupplierForm({ ...supplierForm, password: e.target.value });
                        } else {
                          setContractorForm({ ...contractorForm, password: e.target.value });
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-slate-950 font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-3 rounded-md font-bold text-xs text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                        modalRole === 'buyer'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : modalRole === 'supplier'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-slate-950 hover:bg-slate-900'
                      }`}
                    >
                      <span>
                        {isSubmitting
                          ? 'Authenticating...'
                          : `Login as ${
                              modalRole === 'buyer'
                                ? 'Buyer (Enterprise)'
                                : modalRole === 'supplier'
                                ? 'Supplier (Tier-1)'
                                : 'Contractor'
                            } →`}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ================= JOIN FOR BUYER / SUPPLIER / CONTRACTOR ================= */
                <>
                  {modalRole === 'buyer' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Enterprise Organization / Sourcing Group Name
                        </label>
                        <input
                          type="text"
                          required
                          value={buyerForm.companyName}
                          onChange={(e) => setBuyerForm({ ...buyerForm, companyName: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-blue-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Trade License / Commercial ID
                          </label>
                          <input
                            type="text"
                            required
                            value={buyerForm.tradeLicense}
                            onChange={(e) => setBuyerForm({ ...buyerForm, tradeLicense: e.target.value })}
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-blue-600 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Sourcing Department
                          </label>
                          <input
                            type="text"
                            required
                            value={buyerForm.primaryDepartment}
                            onChange={(e) => setBuyerForm({ ...buyerForm, primaryDepartment: e.target.value })}
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Corporate Procurement Work Email
                        </label>
                        <input
                          type="email"
                          required
                          value={buyerForm.workEmail}
                          onChange={(e) => setBuyerForm({ ...buyerForm, workEmail: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-blue-600 font-mono"
                        />
                      </div>
                    </>
                  )}

                  {modalRole === 'contractor' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Contractor / Developer Name
                        </label>
                        <input
                          type="text"
                          required
                          value={contractorForm.companyName}
                          onChange={(e) =>
                            setContractorForm({ ...contractorForm, companyName: e.target.value })
                          }
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-slate-950"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Trade License #
                          </label>
                          <input
                            type="text"
                            required
                            value={contractorForm.tradeLicense}
                            onChange={(e) =>
                              setContractorForm({ ...contractorForm, tradeLicense: e.target.value })
                            }
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-slate-950 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Jurisdiction
                          </label>
                          <input
                            type="text"
                            required
                            value={contractorForm.jurisdiction}
                            onChange={(e) =>
                              setContractorForm({ ...contractorForm, jurisdiction: e.target.value })
                            }
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-slate-950"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Primary Department / Role
                        </label>
                        <select
                          value={contractorForm.primaryRole}
                          onChange={(e) =>
                            setContractorForm({ ...contractorForm, primaryRole: e.target.value })
                          }
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-slate-950 bg-white"
                        >
                          <option>Commercial & Procurement</option>
                          <option>Tendering & Estimating</option>
                          <option>Project Engineering & Site QC</option>
                          <option>Executive Leadership</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Corporate Work Email
                        </label>
                        <input
                          type="email"
                          required
                          value={contractorForm.workEmail}
                          onChange={(e) =>
                            setContractorForm({ ...contractorForm, workEmail: e.target.value })
                          }
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-slate-950 font-mono"
                        />
                      </div>
                    </>
                  )}

                  {modalRole === 'supplier' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Manufacturing / Stockist Entity Name
                        </label>
                        <input
                          type="text"
                          required
                          value={supplierForm.entityName}
                          onChange={(e) =>
                            setSupplierForm({ ...supplierForm, entityName: e.target.value })
                          }
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Trade License #
                          </label>
                          <input
                            type="text"
                            required
                            value={supplierForm.tradeLicense}
                            onChange={(e) =>
                              setSupplierForm({ ...supplierForm, tradeLicense: e.target.value })
                            }
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-600 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Primary Material Category
                          </label>
                          <input
                            type="text"
                            required
                            value={supplierForm.materialCategory}
                            onChange={(e) =>
                              setSupplierForm({ ...supplierForm, materialCategory: e.target.value })
                            }
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Factory / Main Yard Location
                        </label>
                        <input
                          type="text"
                          required
                          value={supplierForm.facilityLocation}
                          onChange={(e) =>
                            setSupplierForm({ ...supplierForm, facilityLocation: e.target.value })
                          }
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Commercial Contact Email
                        </label>
                        <input
                          type="email"
                          required
                          value={supplierForm.contactEmail}
                          onChange={(e) =>
                            setSupplierForm({ ...supplierForm, contactEmail: e.target.value })
                          }
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-600 font-mono"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Password
                    </label>
                    <input
                      type="password"
                      required
                      value={
                        modalRole === 'buyer'
                          ? buyerForm.password
                          : modalRole === 'supplier'
                          ? supplierForm.password
                          : contractorForm.password
                      }
                      onChange={(e) => {
                        if (modalRole === 'buyer') {
                          setBuyerForm({ ...buyerForm, password: e.target.value });
                        } else if (modalRole === 'supplier') {
                          setSupplierForm({ ...supplierForm, password: e.target.value });
                        } else {
                          setContractorForm({ ...contractorForm, password: e.target.value });
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:border-slate-950 font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-3 rounded-md font-bold text-xs text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                        modalRole === 'buyer'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : modalRole === 'supplier'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-slate-950 hover:bg-slate-900'
                      }`}
                    >
                      <span>
                        {isSubmitting
                          ? 'Processing...'
                          : modalRole === 'buyer'
                          ? 'Join SOKO as Enterprise Buyer →'
                          : modalRole === 'supplier'
                          ? 'Create Verified Supplier Profile →'
                          : 'Register Contractor (100% Free Access) →'}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </form>
          </div>
        </div>
      )}
    </div>
  );
};
