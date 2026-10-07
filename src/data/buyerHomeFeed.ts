export type BuyerFeedTab =
  | 'for-you'
  | 'supplier-updates'
  | 'products'
  | 'market-hub'
  | 'industry'
  | 'insights';

export interface FeedSupplierRef {
  id: string;
  name: string;
  location: string;
  verified: boolean;
}

export interface FeedProductRef {
  id: string;
  name: string;
  type: string;
  brand: string;
  category: string;
  imageUrl?: string;
  technicalDocs: boolean;
  certification: boolean;
  intelligenceScore?: number;
}

interface FeedItemBase {
  id: string;
  category: string;
  location: string;
  postedAt: string;
  ageHours: number;
}

export type BuyerFeedItem =
  | (FeedItemBase & {
      kind: 'supplier-update';
      supplier: FeedSupplierRef;
      updateLabel: string;
      summary: string;
      product: FeedProductRef;
    })
  | (FeedItemBase & {
      kind: 'product';
      supplier: FeedSupplierRef;
      product: FeedProductRef;
    })
  | (FeedItemBase & {
      kind: 'market-hub';
      requirementId: string;
      title: string;
      projectType: string;
      scope: string;
      requiredBy: string;
      urgency: 'High' | 'Medium' | 'Low';
      buyerName: string;
      interestedCount: number;
    })
  | (FeedItemBase & {
      kind: 'verification';
      supplier: FeedSupplierRef;
      tradeLicense: 'Verified' | 'Pending';
      documentationPct: number;
      activeCertifications: number;
      lastVerified: string;
    })
  | (FeedItemBase & {
      kind: 'insight';
      headline: string;
      body: string;
      breakdown: { label: string; value: number }[];
      ctaLabel: string;
      ctaTab: string;
    })
  | (FeedItemBase & {
      kind: 'industry';
      headline: string;
      summary: string;
      details: string;
      source: string;
      publishedAt: string;
    });

export const FEED_TAB_KINDS: Record<Exclude<BuyerFeedTab, 'for-you'>, BuyerFeedItem['kind'][]> = {
  'supplier-updates': ['supplier-update', 'verification'],
  products: ['product'],
  'market-hub': ['market-hub'],
  industry: ['industry'],
  insights: ['insight'],
};

export interface BuyerInterestProfile {
  followedCategories: string[];
  viewedSupplierIds: string[];
  viewedProductIds: string[];
  savedSupplierIds: string[];
  savedProductIds: string[];
  networkSupplierIds: string[];
  marketHubCategories: string[];
  location: string;
}

export const DEMO_BUYER_INTERESTS: BuyerInterestProfile = {
  followedCategories: ['Waterproofing', 'Steel & Rebar', 'MEP'],
  viewedSupplierIds: ['sup_abc_waterproofing', 'sup_emirates_steel'],
  viewedProductIds: ['prd_mapelastic'],
  savedSupplierIds: ['sup_gulf_cm'],
  savedProductIds: [],
  networkSupplierIds: ['sup_emirates_steel', 'sup_al_falah_mep'],
  marketHubCategories: ['Waterproofing', 'Subcontracting'],
  location: 'Dubai',
};

const supplierIdOf = (item: BuyerFeedItem) => ('supplier' in item ? item.supplier.id : undefined);
const productIdOf = (item: BuyerFeedItem) => ('product' in item ? item.product.id : undefined);

export function scoreFeedItem(item: BuyerFeedItem, profile: BuyerInterestProfile) {
  const reasons: string[] = [];
  let score = 0;
  const supplierId = supplierIdOf(item);
  const productId = productIdOf(item);

  if (profile.followedCategories.includes(item.category)) {
    score += 30;
    reasons.push(`You follow ${item.category}`);
  }
  if (supplierId && profile.savedSupplierIds.includes(supplierId)) {
    score += 25;
    reasons.push('Saved supplier');
  }
  if (productId && profile.savedProductIds.includes(productId)) {
    score += 25;
    reasons.push('Saved product');
  }
  if (supplierId && profile.networkSupplierIds.includes(supplierId)) {
    score += 20;
    reasons.push('In your network');
  }
  if (supplierId && profile.viewedSupplierIds.includes(supplierId)) {
    score += 15;
    reasons.push('Supplier you viewed');
  }
  if (productId && profile.viewedProductIds.includes(productId)) {
    score += 15;
    reasons.push('Product you viewed');
  }
  if (item.kind === 'market-hub' && profile.marketHubCategories.includes(item.category)) {
    score += 15;
    reasons.push('Matches your Market Hub activity');
  }
  if (item.location.includes(profile.location)) {
    score += 10;
    reasons.push(`Near you in ${profile.location}`);
  }
  score += Math.max(0, 20 - item.ageHours / 6);

  return { score, reasons: reasons.slice(0, 2) };
}

export function diversifyFeed<T extends { item: BuyerFeedItem; score: number }>(scored: T[]): T[] {
  const bucketOf = (kind: BuyerFeedItem['kind']) =>
    kind === 'verification' || kind === 'supplier-update' ? 'supplier' : kind;
  const buckets: Record<string, T[]> = {};
  [...scored]
    .sort((a, b) => b.score - a.score)
    .forEach((entry) => {
      const key = bucketOf(entry.item.kind);
      (buckets[key] ||= []).push(entry);
    });

  const pattern = ['product', 'supplier', 'market-hub', 'insight', 'industry', 'supplier-or-product'];
  const result: T[] = [];
  while (result.length < scored.length) {
    for (const slot of pattern) {
      let key = slot;
      if (slot === 'supplier-or-product') {
        const s = buckets.supplier?.[0]?.score ?? -1;
        const p = buckets.product?.[0]?.score ?? -1;
        key = s >= p ? 'supplier' : 'product';
      }
      const next = buckets[key]?.shift();
      if (next) result.push(next);
    }
  }
  return result;
}

export const BUYER_FEED_ITEMS: BuyerFeedItem[] = [
  {
    id: 'feed_insight_waterproofing',
    kind: 'insight',
    category: 'Waterproofing',
    location: 'UAE',
    postedAt: '2h ago',
    ageHours: 2,
    headline: 'Waterproofing supplier activity increased this week',
    body: '24 suppliers updated products or company information in the UAE Waterproofing category during the last 7 days.',
    breakdown: [
      { label: 'Dubai', value: 11 },
      { label: 'Abu Dhabi', value: 8 },
      { label: 'Sharjah', value: 5 },
    ],
    ctaLabel: 'Explore Waterproofing Suppliers',
    ctaTab: 'suppliers',
  },
  {
    id: 'feed_su_abc',
    kind: 'supplier-update',
    category: 'Waterproofing',
    location: 'Dubai, UAE',
    postedAt: '3h ago',
    ageHours: 3,
    supplier: { id: 'sup_abc_waterproofing', name: 'ABC Waterproofing LLC', location: 'Dubai, UAE', verified: true },
    updateLabel: 'New Product',
    summary: 'ABC Waterproofing has added a new waterproofing system to its SOKO portfolio.',
    product: {
      id: 'prd_sikaproof_a_plus',
      name: 'SikaProof A+',
      type: 'Waterproofing Membrane',
      brand: 'Sika',
      category: 'Waterproofing',
      technicalDocs: true,
      certification: true,
    },
  },
  {
    id: 'feed_mh_waterproofing',
    kind: 'market-hub',
    category: 'Waterproofing',
    location: 'Dubai, UAE',
    postedAt: '5h ago',
    ageHours: 5,
    requirementId: 'req_wp_18000',
    title: 'Waterproofing Contractor Required',
    projectType: 'Commercial Development',
    scope: '18,000 m²',
    requiredBy: 'November 2026',
    urgency: 'High',
    buyerName: 'Confidential',
    interestedCount: 12,
  },
  {
    id: 'feed_prd_mapelastic',
    kind: 'product',
    category: 'Waterproofing',
    location: 'Dubai, UAE',
    postedAt: '7h ago',
    ageHours: 7,
    supplier: { id: 'sup_gulf_cm', name: 'Gulf Construction Materials', location: 'Dubai, UAE', verified: true },
    product: {
      id: 'prd_mapelastic',
      name: 'Mapei Mapelastic Foundation',
      type: 'Waterproofing System',
      brand: 'Mapei',
      category: 'Waterproofing',
      imageUrl: 'https://images.pexels.com/photos/39238328/pexels-photo-39238328.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      technicalDocs: true,
      certification: true,
      intelligenceScore: 86,
    },
  },
  {
    id: 'feed_ver_emirates_steel',
    kind: 'verification',
    category: 'Steel & Rebar',
    location: 'Abu Dhabi, UAE',
    postedAt: '9h ago',
    ageHours: 9,
    supplier: { id: 'sup_emirates_steel', name: 'Emirates Steel Industries', location: 'Abu Dhabi, UAE', verified: true },
    tradeLicense: 'Verified',
    documentationPct: 94,
    activeCertifications: 5,
    lastVerified: '05 Oct 2026',
  },
  {
    id: 'feed_ind_steel',
    kind: 'industry',
    category: 'Steel & Rebar',
    location: 'UAE',
    postedAt: '12h ago',
    ageHours: 12,
    headline: 'UAE steel market update',
    summary:
      'Regional rebar mills report steady demand from infrastructure and residential projects, with delivered prices edging up on higher scrap costs and stronger Q4 order books.',
    source: 'Gulf Construction Review',
    details:
      'Delivered B500B rebar in the UAE is tracking roughly 1-2% higher week on week. Buyers with Q1 2027 pours may want to confirm price validity periods on open quotations and consider staged call-offs.',
    publishedAt: '06 Oct 2026',
  },
  {
    id: 'feed_prd_rebar',
    kind: 'product',
    category: 'Steel & Rebar',
    location: 'Sharjah, UAE',
    postedAt: '14h ago',
    ageHours: 14,
    supplier: { id: 'sup_conares', name: 'Conares Steel Trading', location: 'Sharjah, UAE', verified: true },
    product: {
      id: 'prd_b500b_rebar',
      name: 'B500B High-Yield Rebar (12-32 mm)',
      type: 'Reinforcement Steel',
      brand: 'Conares',
      category: 'Steel & Rebar',
      imageUrl: 'https://images.pexels.com/photos/46167/iron-rods-reinforcing-bars-rods-steel-bars-46167.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      technicalDocs: true,
      certification: true,
      intelligenceScore: 91,
    },
  },
  {
    id: 'feed_mh_mep',
    kind: 'market-hub',
    category: 'MEP',
    location: 'Abu Dhabi, UAE',
    postedAt: '18h ago',
    ageHours: 18,
    requirementId: 'req_mep_hvac',
    title: 'HVAC Ductwork Subcontractor Required',
    projectType: 'Hospital Extension',
    scope: '4 floors, approx. 9,500 m²',
    requiredBy: 'January 2027',
    urgency: 'Medium',
    buyerName: 'Confidential',
    interestedCount: 7,
  },
  {
    id: 'feed_su_al_falah',
    kind: 'supplier-update',
    category: 'MEP',
    location: 'Dubai, UAE',
    postedAt: '1d ago',
    ageHours: 24,
    supplier: { id: 'sup_al_falah_mep', name: 'Al Falah MEP Supplies', location: 'Dubai, UAE', verified: true },
    updateLabel: 'Portfolio Update',
    summary: 'Al Falah MEP Supplies added a pre-insulated chilled water pipe range to its SOKO portfolio.',
    product: {
      id: 'prd_preinsulated_pipe',
      name: 'Pre-Insulated CHW Pipe System',
      type: 'Chilled Water Piping',
      brand: 'Kingspan',
      category: 'MEP',
      technicalDocs: true,
      certification: false,
    },
  },
  {
    id: 'feed_insight_readymix',
    kind: 'insight',
    category: 'Ready Mix',
    location: 'UAE',
    postedAt: '1d ago',
    ageHours: 26,
    headline: 'Ready Mix searches up 32% on SOKO',
    body: 'Buyers searched for ready mix concrete suppliers more often this week, led by demand for C40 and C50 mixes in Dubai South and Abu Dhabi.',
    breakdown: [
      { label: 'Dubai', value: 18 },
      { label: 'Abu Dhabi', value: 9 },
      { label: 'Ajman', value: 4 },
    ],
    ctaLabel: 'Explore Ready Mix Suppliers',
    ctaTab: 'suppliers',
  },
  {
    id: 'feed_ind_freight',
    kind: 'industry',
    category: 'Logistics',
    location: 'UAE',
    postedAt: '1d ago',
    ageHours: 30,
    headline: 'Asia to Jebel Ali container rates firm ahead of Q4',
    summary:
      'Freight forwarders report tighter capacity on Shanghai and Ningbo routes into Jebel Ali, which may extend lead times for imported fit-out and MEP materials.',
    source: 'Middle East Logistics Bulletin',
    details:
      'Forwarders suggest adding one to two weeks of buffer to delivery schedules for imported items and confirming vessel bookings earlier than usual for November and December arrivals.',
    publishedAt: '05 Oct 2026',
  },
  {
    id: 'feed_mh_equipment',
    kind: 'market-hub',
    category: 'Equipment Rental',
    location: 'Sharjah, UAE',
    postedAt: '2d ago',
    ageHours: 44,
    requirementId: 'req_crane_rental',
    title: 'Mobile Crane Rental (50T) Required',
    projectType: 'Warehouse Construction',
    scope: '3-month rental with operator',
    requiredBy: 'December 2026',
    urgency: 'Low',
    buyerName: 'Confidential',
    interestedCount: 5,
  },
];

export const MY_SOKO_SHORTCUTS = [
  { id: 'saved-suppliers', label: 'Saved Suppliers', count: 18, tab: 'suppliers' },
  { id: 'saved-products', label: 'Saved Products', count: 27, tab: 'products' },
  { id: 'network', label: 'My Network', count: 142, tab: 'contacts' },
  { id: 'market-hub', label: 'Market Hub Activity', count: 6, tab: 'opportunities' },
];

export const TRENDING_CATEGORIES = [
  { label: 'Waterproofing', change: '+38%', tab: 'suppliers' },
  { label: 'Steel & Rebar', change: '+24%', tab: 'suppliers' },
  { label: 'Ready Mix', change: '+19%', tab: 'suppliers' },
  { label: 'MEP', change: '+15%', tab: 'suppliers' },
  { label: 'Equipment Rental', change: '+11%', tab: 'products' },
];

export const MARKET_HUB_SNAPSHOT = {
  total: 24,
  breakdown: [
    { label: 'Materials', value: 8 },
    { label: 'Subcontracting', value: 6 },
    { label: 'Manpower', value: 4 },
    { label: 'Equipment', value: 3 },
    { label: 'Services', value: 3 },
  ],
};
