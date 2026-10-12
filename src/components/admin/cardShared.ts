export type CardStatus = 'active' | 'inactive' | 'under_review' | 'suspended';
export type CardVisibility = 'public' | 'network';
export type ReportStatus = 'open' | 'actioned' | 'dismissed';
export type CardActivityKind = 'update' | 'share' | 'report' | 'decision' | 'created';

export interface CardReport {
  id: string;
  cardId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  handledAt: string | null;
  resolution: string | null;
}

export interface CardEngagement {
  qrScans: number;
  views: number;
  shares: number;
  contactSaves: number;
}

export interface AdminCard {
  userId: string;
  displayName: string;
  title: string | null;
  /** Free-text company label typed by the card owner. */
  companyLabel: string | null;
  /** Company resolved from an active membership, when one is readable. */
  companyId: string | null;
  companyName: string | null;
  companyKind: 'supplier' | 'contractor' | null;
  sokoId: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  isPublic: boolean;
  updatedAt: string | null;
  /** Null when card lifecycle status is not modelled for the current source. */
  status: CardStatus | null;
  /** Null when no source records engagement. */
  engagement: CardEngagement | null;
  /** Null when card-level product listings are not modelled. */
  products: string[] | null;
  /** Null when social channels beyond LinkedIn are not modelled. */
  socials: { label: string; url: string }[] | null;
  reports: CardReport[];
}

export interface CardActivity {
  id: string;
  at: string;
  kind: CardActivityKind;
  cardId: string | null;
  cardOwner: string;
  summary: string;
  actor: string | null;
}

export interface EngagementPoint {
  label: string;
  scans: number;
  views: number;
  shares: number;
}

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  under_review: 'Under Review',
  suspended: 'Suspended',
};

export const CARD_STATUS_CLASSES: Record<CardStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  suspended: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const VISIBILITY_LABELS: Record<CardVisibility, string> = {
  public: 'Public',
  network: 'Network only',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Open',
  actioned: 'Actioned',
  dismissed: 'Dismissed',
};

export const REPORT_STATUS_CLASSES: Record<ReportStatus, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  actioned: 'bg-rose-50 text-rose-700 border-rose-200',
  dismissed: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const visibilityOf = (card: AdminCard): CardVisibility => (card.isPublic ? 'public' : 'network');
export const openReportsOf = (card: AdminCard) => card.reports.filter((r) => r.status === 'open').length;

export const ENGAGEMENT_UNAVAILABLE =
  'No table records QR scans, profile views, shares or contact saves, so engagement cannot be measured yet.';
export const STATUS_UNAVAILABLE =
  'Business cards store only a public/private flag. Active, inactive and suspended states are not modelled.';

const daysAgo = (days: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, (days * 7) % 60, 0, 0);
  return d.toISOString();
};

interface DemoSeed {
  id: string;
  name: string;
  title: string;
  company: string;
  kind: 'supplier' | 'contractor';
  sokoId: string;
  email: string;
  phone: string;
  isPublic: boolean;
  status: CardStatus;
  updated: number;
  engagement: CardEngagement;
  products: string[];
  bio: string;
  reports?: Omit<CardReport, 'cardId'>[];
}

const SEEDS: DemoSeed[] = [
  {
    id: 'demo-card-01', name: 'Layla Haddad', title: 'Head of Procurement', company: 'Gulf Build Contracting', kind: 'contractor',
    sokoId: 'SOKO-C-10421', email: 'layla.haddad@gulfbuild.demo', phone: '+971 50 214 8830', isPublic: true, status: 'active', updated: 1,
    engagement: { qrScans: 412, views: 1284, shares: 96, contactSaves: 143 },
    products: ['Main contracting', 'Fit-out packages'],
    bio: 'Leads vendor onboarding and strategic sourcing across commercial projects in the UAE.',
  },
  {
    id: 'demo-card-02', name: 'Omar Siddiqui', title: 'Sales Director', company: 'Desert Steel Trading', kind: 'supplier',
    sokoId: 'SOKO-S-20877', email: 'omar@desertsteel.demo', phone: '+971 55 903 1172', isPublic: true, status: 'active', updated: 2,
    engagement: { qrScans: 655, views: 2210, shares: 181, contactSaves: 240 },
    products: ['Rebar', 'Structural steel sections', 'Steel mesh'],
    bio: 'Supplies certified structural steel to contractors across the GCC.',
  },
  {
    id: 'demo-card-03', name: 'Priya Raman', title: 'Business Development Manager', company: 'Coastal MEP Supplies', kind: 'supplier',
    sokoId: 'SOKO-S-20914', email: 'priya.raman@coastalmep.demo', phone: '+971 52 448 0915', isPublic: false, status: 'active', updated: 4,
    engagement: { qrScans: 98, views: 402, shares: 22, contactSaves: 41 },
    products: ['HVAC equipment', 'Pipe fittings'],
    bio: 'Partners with MEP contractors on equipment selection and delivery scheduling.',
  },
  {
    id: 'demo-card-04', name: 'Khalid Al-Mansoori', title: 'Managing Director', company: 'Al Noor Facades', kind: 'supplier',
    sokoId: 'SOKO-S-21003', email: 'khalid@alnoorfacades.demo', phone: '+971 50 771 2290', isPublic: true, status: 'under_review', updated: 3,
    engagement: { qrScans: 140, views: 690, shares: 31, contactSaves: 57 },
    products: ['Curtain wall systems', 'Aluminium cladding'],
    bio: 'Facade engineering and installation for high-rise developments.',
    reports: [
      { id: 'demo-report-01', reason: 'Card uses the name and title of our managing director. We believe this is an impersonation attempt.', status: 'open', createdAt: daysAgo(2, 14), handledAt: null, resolution: null },
    ],
  },
  {
    id: 'demo-card-05', name: 'Sara Kim', title: 'Project Manager', company: 'Gulf Build Contracting', kind: 'contractor',
    sokoId: 'SOKO-C-10421', email: 'sara.kim@gulfbuild.demo', phone: '+971 56 120 4478', isPublic: false, status: 'inactive', updated: 38,
    engagement: { qrScans: 12, views: 64, shares: 3, contactSaves: 5 },
    products: [],
    bio: 'Coordinates site logistics and supplier visits for residential towers.',
  },
  {
    id: 'demo-card-06', name: 'Daniel Okafor', title: 'Regional Sales Lead', company: 'Prime Aggregates', kind: 'supplier',
    sokoId: 'SOKO-S-21118', email: 'daniel@primeagg.demo', phone: '+971 54 662 3019', isPublic: true, status: 'suspended', updated: 9,
    engagement: { qrScans: 0, views: 211, shares: 14, contactSaves: 9 },
    products: ['Crushed aggregates', 'Ready-mix concrete'],
    bio: 'Bulk aggregates and ready-mix supply across the Northern Emirates.',
    reports: [
      { id: 'demo-report-02', reason: 'Card advertises certifications the company does not hold.', status: 'actioned', createdAt: daysAgo(11, 9), handledAt: daysAgo(9, 16), resolution: 'Card suspended pending corrected certification details.' },
      { id: 'demo-report-03', reason: 'Phone number on card connects to a different business.', status: 'open', createdAt: daysAgo(6, 12), handledAt: null, resolution: null },
    ],
  },
  {
    id: 'demo-card-07', name: 'Fatima Zahra', title: 'Procurement Officer', company: 'Horizon Developments', kind: 'contractor',
    sokoId: 'SOKO-C-10566', email: 'fatima.z@horizondev.demo', phone: '+971 50 330 7781', isPublic: true, status: 'active', updated: 0,
    engagement: { qrScans: 233, views: 812, shares: 47, contactSaves: 88 },
    products: [],
    bio: 'Sources finishing materials and manages approved vendor lists.',
    reports: [
      { id: 'demo-report-04', reason: 'Duplicate card for the same person.', status: 'dismissed', createdAt: daysAgo(15, 10), handledAt: daysAgo(14, 11), resolution: 'Verified as a single card. Report dismissed.' },
    ],
  },
  {
    id: 'demo-card-08', name: 'Marco Bellini', title: 'Technical Consultant', company: 'Coastal MEP Supplies', kind: 'supplier',
    sokoId: 'SOKO-S-20914', email: 'marco@coastalmep.demo', phone: '+971 58 219 6640', isPublic: false, status: 'active', updated: 6,
    engagement: { qrScans: 57, views: 190, shares: 11, contactSaves: 19 },
    products: ['Chillers', 'Pump systems'],
    bio: 'Technical submittals and value engineering for MEP packages.',
  },
];

export const DEMO_CARDS: AdminCard[] = SEEDS.map((s) => ({
  userId: s.id,
  displayName: s.name,
  title: s.title,
  companyLabel: s.company,
  companyId: s.sokoId,
  companyName: s.company,
  companyKind: s.kind,
  sokoId: s.sokoId,
  email: s.email,
  phone: s.phone,
  linkedinUrl: `https://www.linkedin.com/in/${s.name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
  bio: s.bio,
  isPublic: s.isPublic,
  updatedAt: daysAgo(s.updated),
  status: s.status,
  engagement: s.engagement,
  products: s.products,
  socials: [
    { label: 'LinkedIn', url: `linkedin.com/in/${s.name.toLowerCase().replace(/[^a-z]+/g, '-')}` },
    { label: 'Website', url: `${s.company.toLowerCase().replace(/[^a-z]+/g, '')}.demo` },
  ],
  reports: (s.reports ?? []).map((r) => ({ ...r, cardId: s.id })),
}));

export const DEMO_ACTIVITY: CardActivity[] = [
  { id: 'a1', at: daysAgo(0, 9), kind: 'update', cardId: 'demo-card-07', cardOwner: 'Fatima Zahra', summary: 'Updated title and phone number', actor: 'Fatima Zahra' },
  { id: 'a2', at: daysAgo(1, 15), kind: 'share', cardId: 'demo-card-01', cardOwner: 'Layla Haddad', summary: 'Card shared by QR code at a supplier visit', actor: 'Layla Haddad' },
  { id: 'a3', at: daysAgo(2, 14), kind: 'report', cardId: 'demo-card-04', cardOwner: 'Khalid Al-Mansoori', summary: 'Reported for possible impersonation', actor: 'Network member' },
  { id: 'a4', at: daysAgo(2, 16), kind: 'decision', cardId: 'demo-card-04', cardOwner: 'Khalid Al-Mansoori', summary: 'Placed under review by platform admin', actor: 'Zackary Al-Hassan' },
  { id: 'a5', at: daysAgo(2, 11), kind: 'update', cardId: 'demo-card-02', cardOwner: 'Omar Siddiqui', summary: 'Added Steel mesh to products and services', actor: 'Omar Siddiqui' },
  { id: 'a6', at: daysAgo(4, 10), kind: 'update', cardId: 'demo-card-03', cardOwner: 'Priya Raman', summary: 'Changed visibility to network only', actor: 'Priya Raman' },
  { id: 'a7', at: daysAgo(6, 12), kind: 'report', cardId: 'demo-card-06', cardOwner: 'Daniel Okafor', summary: 'Reported for an incorrect phone number', actor: 'Network member' },
  { id: 'a8', at: daysAgo(9, 16), kind: 'decision', cardId: 'demo-card-06', cardOwner: 'Daniel Okafor', summary: 'Card suspended pending corrected certifications', actor: 'Zackary Al-Hassan' },
  { id: 'a9', at: daysAgo(14, 11), kind: 'decision', cardId: 'demo-card-07', cardOwner: 'Fatima Zahra', summary: 'Duplicate card report dismissed', actor: 'Zackary Al-Hassan' },
  { id: 'a10', at: daysAgo(20, 10), kind: 'created', cardId: 'demo-card-08', cardOwner: 'Marco Bellini', summary: 'Digital business card created', actor: 'Marco Bellini' },
];

export const DEMO_TREND: EngagementPoint[] = [
  { label: 'W1', scans: 182, views: 610, shares: 41 },
  { label: 'W2', scans: 204, views: 702, shares: 48 },
  { label: 'W3', scans: 196, views: 688, shares: 44 },
  { label: 'W4', scans: 241, views: 801, shares: 57 },
  { label: 'W5', scans: 263, views: 864, shares: 61 },
  { label: 'W6', scans: 238, views: 822, shares: 52 },
  { label: 'W7', scans: 289, views: 947, shares: 70 },
  { label: 'W8', scans: 318, views: 1019, shares: 72 },
];

export function cardInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
