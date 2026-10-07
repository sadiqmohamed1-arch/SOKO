export type BuyerFeedTab = 'for-you' | 'market' | 'products' | 'suppliers' | 'insights' | 'industry';

export type FeedContentClass = 'editorial' | 'intelligence' | 'sponsored';

// Sponsored formats are prepared for future monetization; only product-spotlight is rendered in Phase 1.
export type SponsoredFormat =
  | 'product-spotlight'
  | 'featured-supplier'
  | 'category-sponsorship'
  | 'product-launch'
  | 'technical-content'
  | 'market-report'
  | 'academy-sponsorship';

export const SPONSORED_FORMAT_LABELS: Record<SponsoredFormat, string> = {
  'product-spotlight': 'Product Spotlight',
  'featured-supplier': 'Featured Supplier',
  'category-sponsorship': 'Category Sponsor',
  'product-launch': 'Product Launch',
  'technical-content': 'Technical Content',
  'market-report': 'Market Report',
  'academy-sponsorship': 'Academy Partner',
};

export type FeedSlot =
  | 'insight'
  | 'new-product'
  | 'market'
  | 'editorial'
  | 'supplier'
  | 'news'
  | 'product-discovery';

export interface FeedSupplierRef {
  id: string;
  name: string;
  location: string;
  verified: boolean;
}

// Verification and intelligence scores come from the product/supplier record, never from a sponsorship.
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
  contentClass: FeedContentClass;
  tab: Exclude<BuyerFeedTab, 'for-you'>;
  category: string;
  location: string;
  postedAt: string;
  ageHours: number;
}

export type BuyerFeedItem =
  | (FeedItemBase & {
      kind: 'supplier-activity';
      slot: FeedSlot;
      supplier: FeedSupplierRef;
      summary: string;
      product: FeedProductRef;
    })
  | (FeedItemBase & {
      kind: 'product';
      slot: FeedSlot;
      supplier: FeedSupplierRef;
      product: FeedProductRef;
    })
  | (FeedItemBase & {
      kind: 'market-hub';
      slot: FeedSlot;
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
      slot: FeedSlot;
      supplier: FeedSupplierRef;
      tradeLicense: 'Verified' | 'Pending';
      documentationPct: number;
      activeCertifications: number;
      lastVerified: string;
    })
  | (FeedItemBase & {
      kind: 'insight';
      slot: FeedSlot;
      label: 'SOKO Insight' | 'New on SOKO' | 'Market Signal';
      headline: string;
      body: string;
      stats?: { label: string; value: string }[];
      breakdown?: { label: string; value: number }[];
      ctaLabel: string;
      ctaTab: string;
    })
  | (FeedItemBase & {
      kind: 'editorial';
      slot: FeedSlot;
      label: string;
      headline: string;
      summary: string;
      details: string;
      source: string;
      publishedAt: string;
      external: boolean;
    })
  | (FeedItemBase & {
      kind: 'sponsored';
      format: SponsoredFormat;
      sponsor: FeedSupplierRef;
      product: FeedProductRef;
      targetCategories: string[];
      approvedBySoko: true;
    });

export interface BuyerInterestProfile {
  followedCategories: string[];
  professionalInterests: string[];
  viewedSupplierIds: string[];
  viewedProductIds: string[];
  savedSupplierIds: string[];
  savedProductIds: string[];
  savedCategories: string[];
  networkSupplierIds: string[];
  marketHubCategories: string[];
  interactedCategories: string[];
  location: string;
}

export const DEMO_BUYER_INTERESTS: BuyerInterestProfile = {
  followedCategories: ['Waterproofing', 'Steel & Rebar'],
  professionalInterests: ['MEP', 'Procurement'],
  viewedSupplierIds: ['sup_abc_waterproofing'],
  viewedProductIds: ['prd_mapelastic'],
  savedSupplierIds: ['sup_gulf_cm'],
  savedProductIds: [],
  savedCategories: ['Waterproofing'],
  networkSupplierIds: ['sup_emirates_steel', 'sup_al_falah_mep'],
  marketHubCategories: ['Waterproofing', 'Equipment Rental'],
  interactedCategories: ['Logistics'],
  location: 'Dubai',
};

const supplierIdOf = (item: BuyerFeedItem) =>
  'supplier' in item ? item.supplier.id : item.kind === 'sponsored' ? item.sponsor.id : undefined;
const productIdOf = (item: BuyerFeedItem) => ('product' in item ? item.product.id : undefined);

export function scoreFeedItem(item: BuyerFeedItem, profile: BuyerInterestProfile) {
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };
  const supplierId = supplierIdOf(item);
  const productId = productIdOf(item);

  if (item.kind === 'sponsored') {
    const match = item.targetCategories.find(
      (c) => profile.followedCategories.includes(c) || profile.professionalInterests.includes(c)
    );
    return { score: 0, reasons: match ? [`Relevant to your ${match} interests`] : [] };
  }

  if (item.kind === 'market-hub' && item.urgency === 'High') score += 10;

  if (profile.followedCategories.includes(item.category)) add(30, `You follow ${item.category}`);
  else if (profile.professionalInterests.includes(item.category)) add(25, `Relevant to your ${item.category} interests`);

  if (productId && profile.savedProductIds.includes(productId)) add(25, 'You saved this product');
  else if ('product' in item && profile.savedCategories.includes(item.product.category))
    add(15, "Similar to products you've saved");

  if (supplierId && profile.savedSupplierIds.includes(supplierId)) add(25, 'Supplier you saved');
  if (supplierId && profile.networkSupplierIds.includes(supplierId)) add(20, 'Supplier in your network');
  if (supplierId && profile.viewedSupplierIds.includes(supplierId)) add(15, "Supplier you've viewed");
  if (productId && profile.viewedProductIds.includes(productId)) add(15, "Product you've viewed");

  if (item.tab === 'market' && profile.marketHubCategories.includes(item.category))
    add(20, 'Relevant to your Market Hub activity');
  if (profile.interactedCategories.includes(item.category)) add(10, 'Based on your previous SOKO activity');
  if (item.location.includes(profile.location)) add(10, `Trending in ${profile.location}`);

  score += Math.max(0, 20 - item.ageHours / 6);
  return { score, reasons: reasons.slice(0, 1) };
}

const FOR_YOU_SEQUENCE: FeedSlot[] = [
  'insight',
  'new-product',
  'market',
  'editorial',
  'supplier',
  'news',
  'product-discovery',
];

export const SPONSORED_EVERY_N_ORGANIC = 6;

// Prototype only: production sponsored frequency will be governed by SOKO, not a fixed interval.
export function composeForYouFeed<T extends { item: BuyerFeedItem; score: number }>(
  scored: T[],
  profile: BuyerInterestProfile
): T[] {
  const byScore = [...scored].sort((a, b) => b.score - a.score);
  const sponsored = byScore.filter(
    (e) =>
      e.item.kind === 'sponsored' &&
      e.item.targetCategories.some((c) => profile.followedCategories.includes(c) || profile.professionalInterests.includes(c))
  );
  const buckets = new Map<FeedSlot, T[]>();
  byScore.forEach((e) => {
    if (e.item.kind === 'sponsored') return;
    const list = buckets.get(e.item.slot) ?? [];
    list.push(e);
    buckets.set(e.item.slot, list);
  });

  const organic: T[] = [];
  let remaining = byScore.length - byScore.filter((e) => e.item.kind === 'sponsored').length;
  const lead = byScore.find((e) => e.item.kind !== 'sponsored');
  let startIdx = 0;
  if (lead && lead.item.kind !== 'sponsored') {
    const leadSlot = lead.item.slot;
    buckets.set(leadSlot, (buckets.get(leadSlot) ?? []).filter((e) => e !== lead));
    organic.push(lead);
    remaining--;
    startIdx = (FOR_YOU_SEQUENCE.indexOf(leadSlot) + 1) % FOR_YOU_SEQUENCE.length;
  }
  const rotation = [...FOR_YOU_SEQUENCE.slice(startIdx), ...FOR_YOU_SEQUENCE.slice(0, startIdx)];
  while (remaining > 0) {
    for (const slot of rotation) {
      const next = buckets.get(slot)?.shift();
      if (next) {
        organic.push(next);
        remaining--;
      }
    }
  }

  const result: T[] = [];
  organic.forEach((entry, idx) => {
    result.push(entry);
    if ((idx + 1) % SPONSORED_EVERY_N_ORGANIC === 0 && sponsored.length) result.push(sponsored.shift()!);
  });
  return result;
}

export const BUYER_FEED_ITEMS: BuyerFeedItem[] = [
  {
    id: 'feed_insight_waterproofing',
    kind: 'insight',
    slot: 'insight',
    contentClass: 'intelligence',
    tab: 'insights',
    label: 'SOKO Insight',
    category: 'Waterproofing',
    location: 'UAE',
    postedAt: '2h ago',
    ageHours: 2,
    headline: 'Waterproofing activity increased 38% this week',
    body: 'Demand and supplier activity in the UAE Waterproofing category rose sharply compared with the previous 7 days.',
    stats: [
      { label: 'New requirements', value: '24' },
      { label: 'Suppliers updated', value: '11' },
      { label: 'New products', value: '7' },
    ],
    breakdown: [
      { label: 'Dubai', value: 11 },
      { label: 'Abu Dhabi', value: 8 },
      { label: 'Sharjah', value: 5 },
    ],
    ctaLabel: 'Explore Waterproofing',
    ctaTab: 'suppliers',
  },
  {
    id: 'feed_new_abc',
    kind: 'supplier-activity',
    slot: 'new-product',
    contentClass: 'intelligence',
    tab: 'products',
    category: 'Waterproofing',
    location: 'Dubai, UAE',
    postedAt: '3h ago',
    ageHours: 3,
    supplier: { id: 'sup_abc_waterproofing', name: 'ABC Waterproofing LLC', location: 'Dubai, UAE', verified: true },
    summary: 'has added a new waterproofing product to the SOKO network.',
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
    slot: 'market',
    contentClass: 'intelligence',
    tab: 'market',
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
    id: 'feed_editorial_procurement',
    kind: 'editorial',
    slot: 'editorial',
    contentClass: 'editorial',
    tab: 'industry',
    label: 'Procurement Insight',
    category: 'Procurement',
    location: 'UAE',
    postedAt: '6h ago',
    ageHours: 6,
    headline: 'Locking Q1 2027 material prices: what UAE buyers are doing now',
    summary:
      'Procurement teams are shortening quotation validity windows and splitting large steel and MEP orders into staged call-offs to manage price exposure.',
    details:
      'SOKO spoke with sourcing leads across main contractors and developers. Common practices include 30-day price validity, indexed escalation clauses tied to published benchmarks, and pre-qualifying two alternates per critical package.',
    source: 'SOKO Editorial Team',
    publishedAt: '07 Oct 2026',
    external: false,
  },
  {
    id: 'feed_ver_emirates_steel',
    kind: 'verification',
    slot: 'supplier',
    contentClass: 'intelligence',
    tab: 'suppliers',
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
    id: 'feed_news_steel',
    kind: 'editorial',
    slot: 'news',
    contentClass: 'editorial',
    tab: 'industry',
    label: 'Industry News',
    category: 'Steel & Rebar',
    location: 'UAE',
    postedAt: '12h ago',
    ageHours: 12,
    headline: 'UAE steel market update',
    summary:
      'Regional rebar mills report steady demand from infrastructure and residential projects, with delivered prices edging up on higher scrap costs and stronger Q4 order books.',
    details:
      'Delivered B500B rebar in the UAE is tracking roughly 1-2% higher week on week. Buyers with Q1 2027 pours may want to confirm price validity periods on open quotations and consider staged call-offs.',
    source: 'Gulf Construction Review',
    publishedAt: '06 Oct 2026',
    external: true,
  },
  {
    id: 'feed_prd_mapelastic',
    kind: 'product',
    slot: 'product-discovery',
    contentClass: 'intelligence',
    tab: 'products',
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
    id: 'feed_sponsored_proofex',
    kind: 'sponsored',
    format: 'product-spotlight',
    contentClass: 'sponsored',
    tab: 'products',
    approvedBySoko: true,
    targetCategories: ['Waterproofing'],
    category: 'Waterproofing',
    location: 'Dubai, UAE',
    postedAt: '1d ago',
    ageHours: 24,
    sponsor: { id: 'sup_al_mesbah', name: 'Al Mesbah Building Chemicals', location: 'Dubai, UAE', verified: true },
    product: {
      id: 'prd_proofex_engage',
      name: 'Fosroc Proofex Engage',
      type: 'Pre-applied Waterproofing Membrane',
      brand: 'Fosroc',
      category: 'Waterproofing',
      technicalDocs: true,
      certification: true,
      intelligenceScore: 82,
    },
  },
  {
    id: 'feed_new_mep_aggregate',
    kind: 'insight',
    slot: 'insight',
    contentClass: 'intelligence',
    tab: 'products',
    label: 'New on SOKO',
    category: 'MEP',
    location: 'UAE',
    postedAt: '10h ago',
    ageHours: 10,
    headline: '14 new MEP products were added this week from 6 verified suppliers',
    body: 'Additions include pre-insulated chilled water piping, fire-rated cable trays and VRF indoor units.',
    ctaLabel: 'Explore MEP Products',
    ctaTab: 'products',
  },
  {
    id: 'feed_signal_equipment',
    kind: 'insight',
    slot: 'market',
    contentClass: 'intelligence',
    tab: 'market',
    label: 'Market Signal',
    category: 'Equipment Rental',
    location: 'Dubai, UAE',
    postedAt: '14h ago',
    ageHours: 14,
    headline: 'Equipment rental requirements increased in Dubai this week',
    body: 'Mobile crane, telehandler and generator rental requests on Market Hub rose compared with the previous 7 days.',
    breakdown: [
      { label: 'Cranes', value: 9 },
      { label: 'Telehandlers', value: 6 },
      { label: 'Generators', value: 4 },
    ],
    ctaLabel: 'Explore Market Hub',
    ctaTab: 'opportunities',
  },
  {
    id: 'feed_new_al_falah',
    kind: 'supplier-activity',
    slot: 'new-product',
    contentClass: 'intelligence',
    tab: 'products',
    category: 'MEP',
    location: 'Dubai, UAE',
    postedAt: '1d ago',
    ageHours: 24,
    supplier: { id: 'sup_al_falah_mep', name: 'Al Falah MEP Supplies', location: 'Dubai, UAE', verified: true },
    summary: 'has added a pre-insulated chilled water pipe range to the SOKO network.',
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
    id: 'feed_mh_mep',
    kind: 'market-hub',
    slot: 'market',
    contentClass: 'intelligence',
    tab: 'market',
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
    id: 'feed_editorial_regulation',
    kind: 'editorial',
    slot: 'editorial',
    contentClass: 'editorial',
    tab: 'industry',
    label: 'Regulatory Update',
    category: 'Procurement',
    location: 'Dubai, UAE',
    postedAt: '1d ago',
    ageHours: 28,
    headline: 'Updated green building requirements for Dubai façade and insulation materials',
    summary:
      'New guidance raises documentation expectations for thermal performance and recycled content on submittals for new projects.',
    details:
      'Buyers should request updated technical data sheets and third-party test reports when issuing enquiries for insulation, glazing and cladding packages.',
    source: 'Dubai Municipality bulletin, summarised by SOKO Editorial',
    publishedAt: '05 Oct 2026',
    external: true,
  },
  {
    id: 'feed_ver_conares',
    kind: 'verification',
    slot: 'supplier',
    contentClass: 'intelligence',
    tab: 'suppliers',
    category: 'Steel & Rebar',
    location: 'Sharjah, UAE',
    postedAt: '1d ago',
    ageHours: 30,
    supplier: { id: 'sup_conares', name: 'Conares Steel Trading', location: 'Sharjah, UAE', verified: true },
    tradeLicense: 'Verified',
    documentationPct: 88,
    activeCertifications: 3,
    lastVerified: '04 Oct 2026',
  },
  {
    id: 'feed_news_freight',
    kind: 'editorial',
    slot: 'news',
    contentClass: 'editorial',
    tab: 'industry',
    label: 'Industry News',
    category: 'Logistics',
    location: 'UAE',
    postedAt: '1d ago',
    ageHours: 32,
    headline: 'Asia to Jebel Ali container rates firm ahead of Q4',
    summary:
      'Freight forwarders report tighter capacity on Shanghai and Ningbo routes into Jebel Ali, which may extend lead times for imported fit-out and MEP materials.',
    details:
      'Forwarders suggest adding one to two weeks of buffer to delivery schedules for imported items and confirming vessel bookings earlier than usual for November and December arrivals.',
    source: 'Middle East Logistics Bulletin',
    publishedAt: '05 Oct 2026',
    external: true,
  },
  {
    id: 'feed_prd_rebar',
    kind: 'product',
    slot: 'product-discovery',
    contentClass: 'intelligence',
    tab: 'products',
    category: 'Steel & Rebar',
    location: 'Sharjah, UAE',
    postedAt: '2d ago',
    ageHours: 40,
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
    id: 'feed_mh_equipment',
    kind: 'market-hub',
    slot: 'market',
    contentClass: 'intelligence',
    tab: 'market',
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
