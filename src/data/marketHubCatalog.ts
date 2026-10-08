import { BUYER_SUPPLIERS, SUPPLIER_TYPES } from './buyerSuppliers';
import {
  BuyerPreferences,
  Entitlements,
  MarketWorkspace,
  OpportunityGroup,
  OpportunityType,
  PlanId,
  PromoType,
  SupplierRecipientProfile,
  Urgency,
} from './marketHubTypes';

export const OPPORTUNITY_TYPES: { id: OpportunityType; label: string; group: OpportunityGroup }[] = [
  { id: 'material', label: 'Material Requirement', group: 'requirements' },
  { id: 'subcontracting', label: 'Subcontracting Requirement', group: 'requirements' },
  { id: 'manpower', label: 'Manpower Requirement', group: 'requirements' },
  { id: 'equipment_rental', label: 'Equipment Rental', group: 'requirements' },
  { id: 'specialist_service', label: 'Specialist Service Requirement', group: 'requirements' },
  { id: 'project', label: 'Project Opportunity', group: 'projects' },
  { id: 'supply_availability', label: 'Supply Availability', group: 'supply' },
  { id: 'surplus', label: 'Surplus Materials / Disposal', group: 'supply' },
  { id: 'distribution', label: 'Distribution Opportunity', group: 'projects' },
  { id: 'manufacturing', label: 'Manufacturing Opportunity', group: 'projects' },
  { id: 'partnership', label: 'Business Partnership', group: 'projects' },
];

export const opportunityTypeLabel = (t: OpportunityType) => OPPORTUNITY_TYPES.find((o) => o.id === t)?.label ?? t;
export const opportunityGroup = (t: OpportunityType) => OPPORTUNITY_TYPES.find((o) => o.id === t)?.group ?? 'requirements';

const directorySubcategories = (category: string) =>
  Array.from(new Set(BUYER_SUPPLIERS.filter((s) => s.categories.includes(category)).flatMap((s) => s.subcategories)));

const EXTRA_SUBCATEGORIES: Record<string, string[]> = {
  Waterproofing: ['Waterproofing Membrane', 'Waterproofing Application'],
  'Steel & Rebar': ['Structural Steel'],
  MEP: ['MEP Installation', 'Fire Fighting'],
  Equipment: ['Tower Cranes', 'Mobile Cranes', 'Generators'],
  Manpower: ['Skilled Labour', 'General Labour', 'Supervisors'],
  'Specialist Services': ['Testing & Inspection', 'Surveying', 'Consultancy'],
  'General Materials': ['Mixed Surplus', 'Blocks', 'Aggregates'],
};

const DIRECTORY_CATEGORIES = Array.from(new Set(BUYER_SUPPLIERS.flatMap((s) => s.categories)));

export const TRADE_CATEGORIES: string[] = [...DIRECTORY_CATEGORIES, 'Manpower', 'Specialist Services', 'General Materials'];

export const subcategoriesOf = (category: string): string[] =>
  Array.from(new Set([...directorySubcategories(category), ...(EXTRA_SUBCATEGORIES[category] ?? [])]));

export const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Al Ain', 'Fujairah', 'Umm Al Quwain'];

export const URGENCY_LABEL: Record<Urgency, string> = { standard: 'Standard', high: 'High', urgent: 'Urgent' };

export const PROMO_TYPES: { id: PromoType; label: string }[] = [
  { id: 'new_product', label: 'New Product Announcement' },
  { id: 'special_offer', label: 'Special Material Offer' },
  { id: 'stock_availability', label: 'Stock Availability' },
  { id: 'catalogue', label: 'New Product Catalogue' },
  { id: 'technical_solution', label: 'Technical Product Solution' },
  { id: 'manufacturing_capability', label: 'Manufacturing Capability' },
  { id: 'distribution_opportunity', label: 'Distribution Opportunity' },
  { id: 'service_promotion', label: 'Company Service Promotion' },
];

export const promoTypeLabel = (t?: PromoType) => PROMO_TYPES.find((p) => p.id === t)?.label ?? 'Supplier Offer';

export const SUPPLIER_TYPE_OPTIONS: string[] = SUPPLIER_TYPES;
export const BUYER_ROLES = ['Procurement Manager', 'Project Manager', 'Quantity Surveyor', 'MEP Engineer', 'Site Engineer', 'Consultant'];
export const BUYER_COMPANY_TYPES = ['Main Contractor', 'Developer', 'Subcontractor', 'Consultant', 'Facility Management'];

const NONE: Entitlements = {
  postOpportunity: true,
  expressInterest: true,
  receiveSourcing: true,
  receivePromotions: true,
  createSourcingCampaign: false,
  createPromoCampaign: false,
  campaignAnalytics: false,
  monthlyCredits: 0,
  maxLaunchesPer7Days: 0,
  multipleCampaignUsers: false,
  approvalWorkflow: false,
  moderate: false,
};

export const PLANS: Record<PlanId, { label: string; tagline: string; features: string[]; entitlements: Entitlements }> = {
  free_buyer: {
    label: 'Free Buyer',
    tagline: 'Personal buyer workspace',
    features: ['Browse Market Hub', 'Post free opportunities', 'Express interest and save', 'Receive relevant sourcing campaigns and offers'],
    entitlements: NONE,
  },
  free_supplier: {
    label: 'Free Supplier',
    tagline: 'Company profile and requirement responses',
    features: ['Company profile', 'Receive relevant sourcing campaigns', 'Respond to requirements', 'Post ordinary market opportunities'],
    entitlements: { ...NONE, receivePromotions: false },
  },
  supplier_pro: {
    label: 'Supplier Pro',
    tagline: 'Targeted promotions to opted-in buyers',
    features: ['All Free Supplier features', 'Promotional campaigns', 'Buyer audience targeting', 'Campaign analytics', '100 campaign credits / month'],
    entitlements: { ...NONE, receivePromotions: false, createPromoCampaign: true, campaignAnalytics: true, monthlyCredits: 100, maxLaunchesPer7Days: 3 },
  },
  free_contractor: {
    label: 'Free Contractor',
    tagline: 'Market Hub opportunities',
    features: ['Browse and post opportunities', 'Express interest', 'Receive supplier offers'],
    entitlements: NONE,
  },
  contractor_premium: {
    label: 'Contractor Premium',
    tagline: 'One campaign, every relevant supplier',
    features: ['All Free Contractor features', 'Sourcing campaigns', 'Supplier audience targeting', 'Response management', 'Campaign analytics', '150 campaign credits / month'],
    entitlements: { ...NONE, createSourcingCampaign: true, campaignAnalytics: true, monthlyCredits: 150, maxLaunchesPer7Days: 4 },
  },
  enterprise: {
    label: 'Enterprise',
    tagline: 'Teams, approvals and higher limits',
    features: ['Multiple authorised campaign users', 'Approval workflows', 'Higher campaign limits', 'Team analytics', 'Advanced reporting'],
    entitlements: {
      ...NONE,
      createSourcingCampaign: true,
      createPromoCampaign: true,
      campaignAnalytics: true,
      monthlyCredits: 500,
      maxLaunchesPer7Days: 12,
      multipleCampaignUsers: true,
      approvalWorkflow: true,
    },
  },
  platform: {
    label: 'SOKO Platform',
    tagline: 'Moderation',
    features: ['Review, approve, reject and suspend campaigns'],
    entitlements: { ...NONE, postOpportunity: false, expressInterest: false, receiveSourcing: false, receivePromotions: false, moderate: true },
  },
};

export const UPGRADE_PATHS: Record<MarketWorkspace['kind'], PlanId[]> = {
  personal_buyer: [],
  contractor: ['free_contractor', 'contractor_premium', 'enterprise'],
  supplier: ['free_supplier', 'supplier_pro', 'enterprise'],
  soko_admin: [],
};

export const DEFAULT_PLANS: Record<string, PlanId> = {
  ws_personal_buyer: 'free_buyer',
  ws_apex_gc: 'contractor_premium',
  ws_apex_castings: 'free_supplier',
  ws_meridian: 'contractor_premium',
  ws_sup_al_mesbah: 'supplier_pro',
  ws_sup_emirates_steel: 'supplier_pro',
  ws_sup_coastal_tiles: 'supplier_pro',
  ws_soko_admin: 'platform',
};

export const WORKSPACES: Record<'buyer' | 'contractor' | 'supplier' | 'admin', MarketWorkspace> = {
  buyer: {
    id: 'ws_personal_buyer',
    kind: 'personal_buyer',
    displayName: 'Personal Buyer Workspace',
    personName: 'Mohamed Sadiq',
    memberRole: 'owner',
    emirate: 'Dubai',
  },
  contractor: {
    id: 'ws_apex_gc',
    kind: 'contractor',
    displayName: 'Apex Industrial Mechanical GC',
    personName: 'Sarah Jenkins',
    companyName: 'Apex Industrial Mechanical GC',
    memberRole: 'campaign_manager',
    emirate: 'Dubai',
  },
  supplier: {
    id: 'ws_apex_castings',
    kind: 'supplier',
    displayName: 'Apex Industrial Castings & Alloys',
    personName: 'Elena Rostova',
    companyName: 'Apex Industrial Castings & Alloys',
    memberRole: 'owner',
    emirate: 'Dubai',
    supplierProfile: {
      categories: ['Steel & Rebar', 'Waterproofing'],
      subcategories: ['Structural Sections', 'Reinforcement Bar', 'Structural Steel', 'Membranes'],
      types: ['Manufacturer'],
      emirate: 'Dubai',
      verified: true,
      keywords: 'structural steel castings rebar cut and bend bituminous membrane',
    },
  },
  admin: {
    id: 'ws_soko_admin',
    kind: 'soko_admin',
    displayName: 'SOKO Moderation',
    personName: 'SOKO Admin',
    memberRole: 'platform_admin',
    emirate: 'Dubai',
  },
};

export const DEMO_COMPANY_NAMES: Record<string, string> = {
  ws_personal_buyer: 'GEC Dubai',
  ws_meridian: 'Meridian Build Contracting',
};

export interface SupplierRecipient extends SupplierRecipientProfile {
  id: string;
  companyName: string;
  supplierId?: string;
  demo: boolean;
}

export interface BuyerRecipient extends BuyerPreferences {
  id: string;
}

const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)];

const NAME_A = ['Najm', 'Sahel', 'Rimal', 'Wadi', 'Bayan', 'Marsa', 'Qasr', 'Noor', 'Barakah', 'Liwa', 'Hatta', 'Jebel', 'Zayed', 'Dana', 'Saraya', 'Mirdif'];
const NAME_B = ['Building Supplies', 'Technical Trading', 'Industrial Materials', 'Contracting Supplies', 'Construction Products', 'Engineering Supplies', 'Trading & Services', 'Specialist Systems'];
const DIRECTORY_EMIRATE = (hq: string) => (EMIRATES.includes(hq) ? hq : 'Dubai');

const directoryRecipients: SupplierRecipient[] = BUYER_SUPPLIERS.map((s) => ({
  id: `ws_${s.id}`,
  supplierId: s.id,
  companyName: s.name,
  categories: s.categories,
  subcategories: s.subcategories,
  types: s.types,
  emirate: DIRECTORY_EMIRATE(s.headquarters),
  verified: s.status === 'verified',
  keywords: [...s.capabilities, ...s.brands, ...s.products.map((p) => p.name)].join(' ').toLowerCase(),
  demo: false,
}));

const CATEGORY_WEIGHT: [string, number][] = [
  ['Waterproofing', 46],
  ['Construction Chemicals', 34],
  ['Steel & Rebar', 30],
  ['MEP', 34],
  ['Ready Mix Concrete', 14],
  ['Precast', 12],
  ['Doors', 12],
  ['Façade', 16],
  ['Equipment', 18],
  ['Finishes', 20],
  ['Manpower', 14],
  ['Specialist Services', 10],
  ['General Materials', 8],
];

const generatedSuppliers = (): SupplierRecipient[] => {
  const r = rng(20261008);
  const out: SupplierRecipient[] = [];
  const used = new Set(BUYER_SUPPLIERS.map((s) => s.name));
  CATEGORY_WEIGHT.forEach(([category, n]) => {
    const subs = subcategoriesOf(category);
    for (let i = 0; i < n; i++) {
      let name = `${pick(r, NAME_A)} ${pick(r, NAME_B)}`;
      while (used.has(name)) name = `${pick(r, NAME_A)} ${pick(r, NAME_A)} ${pick(r, NAME_B)}`;
      used.add(name);
      const secondary = r() < 0.3 ? [pick(r, CATEGORY_WEIGHT)[0]] : [];
      const sub = Array.from(new Set([pick(r, subs), pick(r, subs)]));
      out.push({
        id: `pool_sup_${out.length + 1}`,
        companyName: name,
        categories: Array.from(new Set([category, ...secondary])),
        subcategories: sub,
        types: [pick(r, SUPPLIER_TYPES)],
        emirate: r() < 0.45 ? 'Dubai' : pick(r, EMIRATES),
        verified: r() < 0.62,
        keywords: [category, ...sub].join(' ').toLowerCase(),
        demo: true,
      });
    }
  });
  return out;
};

export const supplierRecipientFor = (ws: MarketWorkspace): SupplierRecipient | undefined =>
  ws.supplierProfile ? { id: ws.id, companyName: ws.companyName ?? ws.displayName, ...ws.supplierProfile, demo: false } : undefined;

export const SUPPLIER_POOL: SupplierRecipient[] = [
  ...directoryRecipients,
  supplierRecipientFor(WORKSPACES.supplier)!,
  ...generatedSuppliers(),
];

export const DIRECTORY_POOL_SIZE = directoryRecipients.length;

export const supplierRecipient = (id: string) => SUPPLIER_POOL.find((s) => s.id === id);

const generatedBuyers = (): BuyerRecipient[] => {
  const r = rng(8102026);
  return Array.from({ length: 420 }, (_, i) => {
    const followed = Array.from(new Set([pick(r, CATEGORY_WEIGHT)[0], pick(r, CATEGORY_WEIGHT)[0]]));
    return {
      id: `pool_buyer_${i + 1}`,
      emirate: r() < 0.5 ? 'Dubai' : pick(r, EMIRATES),
      role: pick(r, BUYER_ROLES),
      companyType: pick(r, BUYER_COMPANY_TYPES),
      followedCategories: followed,
      interestedCategories: r() < 0.4 ? [pick(r, CATEGORY_WEIGHT)[0]] : [],
      promoOptIn: r() < 0.58,
      mutedSenders: [],
    };
  });
};

export const BUYER_POOL: BuyerRecipient[] = generatedBuyers();

export const DEFAULT_BUYER_PREFS: Record<string, BuyerPreferences> = {
  ws_personal_buyer: {
    emirate: 'Dubai',
    role: 'Procurement Manager',
    companyType: 'Main Contractor',
    followedCategories: ['Waterproofing', 'Construction Chemicals', 'Equipment'],
    interestedCategories: ['Steel & Rebar'],
    promoOptIn: true,
    mutedSenders: [],
  },
  ws_apex_gc: {
    emirate: 'Dubai',
    role: 'Project Manager',
    companyType: 'Main Contractor',
    followedCategories: ['MEP', 'Steel & Rebar', 'Construction Chemicals'],
    interestedCategories: ['Façade'],
    promoOptIn: true,
    mutedSenders: [],
  },
};
