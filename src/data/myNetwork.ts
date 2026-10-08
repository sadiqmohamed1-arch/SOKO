import { CommunityContact, UserProfile, UserRole } from '../types';
import { BUYER_SUPPLIERS, BuyerSupplier, SupplierContact, supplierLocation } from './buyerSuppliers';

export type NetworkTab = 'contacts' | 'connections' | 'companies' | 'cards';

export const RELATIONSHIP_TYPES = [
  'Supplier Representative',
  'Buyer / Procurement',
  'Contractor',
  'Consultant',
  'Manufacturer',
  'Distributor',
  'Service Provider',
  'Other Professional',
] as const;

const ROLE_RELATIONSHIP: Record<UserRole, string> = {
  supplier: 'Supplier Representative',
  buyer: 'Buyer / Procurement',
  contractor: 'Contractor',
  admin: 'Other Professional',
};

export const relationshipOf = (c: CommunityContact) => c.relationshipType ?? ROLE_RELATIONSHIP[c.role] ?? 'Other Professional';

export const isSaved = (c: CommunityContact) => c.isMaintained;
export const isConnected = (c: CommunityContact) => c.connectionStatus === 'connected';
export const isSokoMember = (c: CommunityContact) => c.source !== 'manual' && c.source !== 'import';

/** Phone, WhatsApp and email are only shown when the person shared them with me. */
export const canSeeDetails = (c: CommunityContact) => isConnected(c) || (c.isMaintained && c.source !== 'soko');

const hashId = (id: string, mod: number) => [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % mod, 7);

export const personalSokoId = (c: CommunityContact): string | null => {
  if (c.sokoId) return c.sokoId;
  if (!isSokoMember(c)) return null;
  return `SK-P-${30000 + hashId(c.id, 60000)}`;
};

export const myPersonalSokoId = (u: UserProfile) => (u.id === 'usr_me_01' ? 'SK-P-20481' : `SK-P-${20000 + hashId(u.id, 9000)}`);

export const CARD_SHARE_PARAM = 'card';

export const cardShareUrl = (sokoId: string) =>
  `${window.location.origin}${window.location.pathname}?${CARD_SHARE_PARAM}=${encodeURIComponent(sokoId)}`;

export const cardIdFromUrl = () => new URLSearchParams(window.location.search).get(CARD_SHARE_PARAM);

export const clearCardParam = () => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CARD_SHARE_PARAM)) return;
  url.searchParams.delete(CARD_SHARE_PARAM);
  window.history.replaceState(window.history.state, '', url);
};

export const parseSokoReference = (input: string): { kind: 'personal' | 'supplier'; id: string } | null => {
  const text = decodeURIComponent(input.trim()).toUpperCase();
  const personal = text.match(/SK-P-\d{5}/);
  if (personal) return { kind: 'personal', id: personal[0] };
  const supplier = text.match(/SK-\d{5}/);
  if (supplier) return { kind: 'supplier', id: supplier[0] };
  return null;
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const supplierById = (id?: string) => (id ? BUYER_SUPPLIERS.find((s) => s.id === id) : undefined);

export const companyFor = (c: CommunityContact): BuyerSupplier | undefined =>
  supplierById(c.companyId) ?? BUYER_SUPPLIERS.find((s) => normalize(s.name) === normalize(c.company));

export const companyKey = (c: CommunityContact) => companyFor(c)?.id ?? `name:${normalize(c.company)}`;

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const digitsOf = (phone?: string) => (phone ?? '').replace(/\D/g, '');

export const whatsappHref = (n: string) => `https://wa.me/${digitsOf(n)}`;

const DAY = 86_400_000;
const daysAgoIso = (days: number) => new Date(Date.now() - days * DAY).toISOString();
export const RECENT_DAYS = 30;
export const isRecentlyAdded = (c: CommunityContact) => !!c.dateAdded && Date.now() - Date.parse(c.dateAdded) <= RECENT_DAYS * DAY;
export const isRecentlyContacted = (c: CommunityContact) => !!c.lastContactedAt && Date.now() - Date.parse(c.lastContactedAt) <= RECENT_DAYS * DAY;

export const relativeDate = (iso?: string) => {
  if (!iso) return '';
  const days = Math.floor((Date.now() - Date.parse(iso)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const lastContactedLabel = (c: CommunityContact) =>
  c.lastContactedAt ? relativeDate(c.lastContactedAt) : c.lastContacted && !/request|received/i.test(c.lastContacted) ? c.lastContacted : '';

const blankContact = (over: Partial<CommunityContact> & Pick<CommunityContact, 'id' | 'name'>): CommunityContact => ({
  title: '',
  company: '',
  role: 'supplier',
  category: '',
  avatarUrl: '',
  location: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  verified: false,
  bio: '',
  isMaintained: false,
  tags: [],
  accessStatus: 'direct',
  connectionStatus: 'not_connected',
  ...over,
});

export const supplierContactId = (s: BuyerSupplier, c: SupplierContact) => `supplier_${s.id}_${c.id}`;

const fromSupplierContact = (s: BuyerSupplier, c: SupplierContact): CommunityContact => {
  const phone = c.visibility === 'public' ? c.phone ?? '' : '';
  return blankContact({
    id: supplierContactId(s, c),
    name: c.name,
    title: c.title,
    company: s.name,
    companyId: s.id,
    role: 'supplier',
    category: c.category,
    location: c.location,
    phone,
    whatsappNumber: phone,
    email: c.visibility === 'public' ? c.email ?? '' : '',
    website: s.website,
    verified: s.status === 'verified',
    bio: `${c.title} at ${s.name}.`,
    tags: ['Supplier Directory'],
    relationshipType: 'Supplier Representative',
    source: 'supplier-profile',
    products: s.capabilities.slice(0, 3),
  });
};

/** The single Save Contact mechanism: adds to My Contacts without creating a connection or touching notes. */
export const saveContact = (list: CommunityContact[], record: CommunityContact): CommunityContact[] => {
  const existing = list.find((c) => c.id === record.id);
  const stamp = { isMaintained: true, dateAdded: new Date().toISOString() };
  if (!existing) return [{ ...record, ...stamp }, ...list];
  if (existing.isMaintained) return list;
  return list.map((c) => (c.id === record.id ? { ...c, ...stamp, source: c.source ?? 'soko' } : c));
};

export const unsaveContact = (list: CommunityContact[], id: string): CommunityContact[] => {
  const c = list.find((x) => x.id === id);
  if (!c) return list;
  const keepRecord = isSokoMember(c) && (c.connectionStatus ?? 'not_connected') !== 'not_connected';
  if (!keepRecord && (c.source === 'manual' || c.source === 'import' || c.source === 'supplier-profile')) return list.filter((x) => x.id !== id);
  return list.map((x) => (x.id === id ? { ...x, isMaintained: false, favorite: false, notes: '' } : x));
};

export const isSupplierContactSaved = (list: CommunityContact[], s: BuyerSupplier, c: SupplierContact) =>
  list.some((n) => n.id === supplierContactId(s, c) && n.isMaintained);

export const toggleSupplierContact = (list: CommunityContact[], s: BuyerSupplier, c: SupplierContact) =>
  isSupplierContactSaved(list, s, c) ? unsaveContact(list, supplierContactId(s, c)) : saveContact(list, fromSupplierContact(s, c));

export const updateContact = (list: CommunityContact[], id: string, patch: Partial<CommunityContact>) =>
  list.map((c) => (c.id === id ? { ...c, ...patch } : c));

export type ConnectionAction = 'connect' | 'accept' | 'decline' | 'withdraw' | 'remove';

export const applyConnection = (list: CommunityContact[], id: string, action: ConnectionAction): CommunityContact[] => {
  const status: Record<ConnectionAction, CommunityContact['connectionStatus']> = {
    connect: 'pending',
    accept: 'connected',
    decline: 'not_connected',
    withdraw: 'not_connected',
    remove: 'not_connected',
  };
  return updateContact(list, id, {
    connectionStatus: status[action],
    connectedDate: action === 'accept' ? `Connected ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : undefined,
    lastContacted: action === 'connect' ? 'Request sent today' : undefined,
  });
};

export const markContacted = (list: CommunityContact[], id: string) =>
  list.map((c) => (c.id === id && c.isMaintained ? { ...c, lastContactedAt: new Date().toISOString() } : c));

/* ---------- Search & filters ---------- */

export interface NetworkFilters {
  company: string;
  category: string;
  location: string;
  relationship: string;
  recentlyAdded: boolean;
  recentlyContacted: boolean;
  favorites: boolean;
}

export const EMPTY_NETWORK_FILTERS: NetworkFilters = {
  company: '',
  category: '',
  location: '',
  relationship: '',
  recentlyAdded: false,
  recentlyContacted: false,
  favorites: false,
};

export const activeFilterCount = (f: NetworkFilters) => Object.values(f).filter(Boolean).length;

export const cityOf = (location: string) => location.split(/[,&]/)[0].trim();

export const applyNetworkFilters = (c: CommunityContact, f: NetworkFilters) =>
  (!f.company || c.company === f.company) &&
  (!f.category || c.category === f.category) &&
  (!f.location || cityOf(c.location) === f.location) &&
  (!f.relationship || relationshipOf(c) === f.relationship) &&
  (!f.recentlyAdded || isRecentlyAdded(c)) &&
  (!f.recentlyContacted || isRecentlyContacted(c)) &&
  (!f.favorites || !!c.favorite);

const STOP = new Set(['and', 'the', 'of', 'in', 'at', 'for']);

const searchTokens = (q: string) =>
  normalize(q)
    .split(' ')
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t));

/** Only searches data the viewer is allowed to see. */
export const searchHaystack = (c: CommunityContact) => {
  const company = companyFor(c);
  const parts = [
    c.name,
    c.title,
    c.company,
    c.category,
    c.specialization ?? '',
    c.location,
    relationshipOf(c),
    ...(company ? [...company.categories, ...company.subcategories, ...company.types] : []),
  ];
  return normalize(parts.join(' '));
};

export const matchesNetworkQuery = (c: CommunityContact, query: string) => {
  const tokens = searchTokens(query);
  if (!tokens.length) return true;
  const hay = searchHaystack(c);
  const phoneQuery = digitsOf(query);
  if (phoneQuery.length >= 5 && canSeeDetails(c)) {
    if ([c.phone, c.whatsappNumber, c.officePhone].some((p) => digitsOf(p).includes(phoneQuery))) return true;
  }
  return tokens.every((t) => hay.includes(t));
};

export const NETWORK_SEARCH_EXAMPLES = ['Ahmed Khan', 'Waterproofing', 'Commercial Manager', 'Emirates Steel', 'MEP Suppliers'];

/* ---------- Duplicates ---------- */

export interface ContactDraft {
  name: string;
  title: string;
  company: string;
  companyId?: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  location: string;
  category: string;
  notes: string;
}

const phoneKey = (p?: string) => digitsOf(p).slice(-9);

export const findDuplicate = (list: CommunityContact[], d: Pick<ContactDraft, 'name' | 'company' | 'phone' | 'email' | 'whatsappNumber'>, ignoreId?: string) =>
  list.find((c) => {
    if (c.id === ignoreId) return false;
    const email = d.email.trim().toLowerCase();
    if (email && c.email && c.email.toLowerCase() === email) return true;
    const phones = [d.phone, d.whatsappNumber].map(phoneKey).filter((p) => p.length >= 7);
    if (phones.some((p) => [c.phone, c.whatsappNumber, c.officePhone].map(phoneKey).includes(p))) return true;
    return normalize(c.name) === normalize(d.name) && !!d.company.trim() && normalize(c.company) === normalize(d.company);
  });

export const draftToContact = (d: ContactDraft, source: 'manual' | 'import'): CommunityContact => {
  const company = supplierById(d.companyId);
  return blankContact({
    id: `${source}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: d.name.trim(),
    title: d.title.trim(),
    company: company?.name ?? d.company.trim(),
    companyId: company?.id,
    role: company ? 'supplier' : 'contractor',
    category: d.category.trim() || company?.categories[0] || '',
    location: d.location.trim(),
    phone: d.phone.trim(),
    whatsappNumber: d.whatsappNumber.trim(),
    email: d.email.trim(),
    notes: d.notes.trim(),
    relationshipType: company ? 'Supplier Representative' : 'Other Professional',
    isMaintained: true,
    dateAdded: new Date().toISOString(),
    source,
    tags: [source === 'import' ? 'Imported' : 'Added manually'],
  });
};

/* ---------- My card ---------- */

export type CardAudience = 'public' | 'members' | 'connections' | 'private';
export type CardField = 'mobile' | 'whatsapp' | 'email' | 'officePhone' | 'location' | 'website';

export const CARD_AUDIENCES: { id: CardAudience; label: string; hint: string }[] = [
  { id: 'public', label: 'Public', hint: 'Anyone with your card link or QR' },
  { id: 'members', label: 'SOKO Members', hint: 'Signed-in SOKO members' },
  { id: 'connections', label: 'Connections Only', hint: 'People you have accepted' },
  { id: 'private', label: 'Private', hint: 'Only you' },
];

export const CARD_FIELDS: { id: CardField; label: string }[] = [
  { id: 'mobile', label: 'Mobile' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'officePhone', label: 'Office Phone' },
  { id: 'location', label: 'Location' },
  { id: 'website', label: 'Website' },
];

export interface MyCardSettings {
  visibility: Record<CardField, CardAudience>;
  whatsapp: string;
  officePhone: string;
  specialization: string;
}

export const MY_CARD_KEY = 'soko_my_card_settings_v1';

export const defaultCardSettings = (u: UserProfile): MyCardSettings => ({
  visibility: { mobile: 'connections', whatsapp: 'members', email: 'members', officePhone: 'public', location: 'public', website: 'public' },
  whatsapp: '+971 50 390 8421',
  officePhone: u.id === 'usr_me_01' ? '+971 4 390 8400' : '',
  specialization: (u.capabilities ?? []).slice(0, 3).join(', '),
});

const AUDIENCE_RANK: Record<CardAudience, number> = { public: 0, members: 1, connections: 2, private: 3 };

export const visibleTo = (fieldAudience: CardAudience, viewer: Exclude<CardAudience, 'private'>) =>
  fieldAudience !== 'private' && AUDIENCE_RANK[fieldAudience] <= AUDIENCE_RANK[viewer];

export interface CardView {
  sokoId: string;
  name: string;
  title: string;
  company: string;
  avatarUrl?: string;
  specialization?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  officePhone?: string;
  location?: string;
  website?: string;
}

export const myCardView = (u: UserProfile, s: MyCardSettings, viewer: Exclude<CardAudience, 'private'> | 'owner'): CardView => {
  const show = (f: CardField) => viewer === 'owner' || visibleTo(s.visibility[f], viewer);
  return {
    sokoId: myPersonalSokoId(u),
    name: u.name,
    title: u.title,
    company: u.company,
    avatarUrl: u.avatarUrl,
    specialization: s.specialization || undefined,
    mobile: show('mobile') ? u.phone : undefined,
    whatsapp: show('whatsapp') ? s.whatsapp || undefined : undefined,
    email: show('email') ? u.email : undefined,
    officePhone: show('officePhone') ? s.officePhone || undefined : undefined,
    location: show('location') ? u.location : undefined,
    website: show('website') ? u.website : undefined,
  };
};

export const contactCardView = (c: CommunityContact): CardView => {
  const details = canSeeDetails(c);
  return {
    sokoId: personalSokoId(c) ?? '',
    name: c.name,
    title: c.title,
    company: c.company,
    avatarUrl: c.avatarUrl || undefined,
    specialization: c.specialization ?? (c.products?.length ? c.products.join(', ') : undefined),
    mobile: details ? c.phone || undefined : undefined,
    whatsapp: details ? c.whatsappNumber || undefined : undefined,
    email: details ? c.email || undefined : undefined,
    officePhone: details ? c.officePhone || undefined : undefined,
    location: c.location || undefined,
    website: c.website?.includes('soko.ae/members') ? undefined : c.website,
  };
};

/* ---------- Demo records ---------- */

const supplierContact = (supplierId: string, contactId: string) => {
  const s = BUYER_SUPPLIERS.find((x) => x.id === supplierId);
  const c = s?.contacts.find((x) => x.id === contactId);
  return s && c ? fromSupplierContact(s, c) : null;
};

const demoRecords = (): CommunityContact[] => {
  const withMeta = (base: CommunityContact | null, over: Partial<CommunityContact>) => (base ? { ...base, ...over } : null);
  const list: (CommunityContact | null)[] = [
    withMeta(supplierContact('sup_emirates_steel', 'ct_ahmed_khan'), {
      sokoId: 'SK-P-31207',
      source: undefined,
      isMaintained: true,
      favorite: true,
      connectionStatus: 'connected',
      connectedDate: 'Connected 2 months ago',
      dateAdded: daysAgoIso(4),
      lastContactedAt: daysAgoIso(1),
      whatsappNumber: '+971501234567',
      officePhone: '+971 2 507 2000',
      specialization: 'Rebar supply contracts, long-term pricing, project allocations',
      sharedVia: 'app',
      notes: 'Quoted B500B rebar for Creek tower package. Prefers WhatsApp in the morning.',
    }),
    withMeta(supplierContact('sup_emirates_steel', 'ct_sarah_thomas'), {
      sokoId: 'SK-P-31588',
      source: undefined,
      isMaintained: true,
      connectionStatus: 'pending',
      lastContacted: 'Request sent 3 days ago',
      dateAdded: daysAgoIso(9),
      specialization: 'Rebar, wire rod and coil sales — Dubai & Northern Emirates',
    }),
    withMeta(supplierContact('sup_emirates_steel', 'ct_khalid_mansoori'), {
      sokoId: 'SK-P-30944',
      source: undefined,
      isMaintained: true,
      favorite: true,
      connectionStatus: 'connected',
      connectedDate: 'Connected 5 months ago',
      dateAdded: daysAgoIso(120),
      lastContactedAt: daysAgoIso(12),
      specialization: 'Key accounts for EPC contractors and government projects',
      notes: 'Escalation contact for allocation issues.',
    }),
    withMeta(supplierContact('sup_emirates_steel', 'ct_priya_menon'), {
      sokoId: 'SK-P-32016',
      source: 'soko',
      isMaintained: false,
      connectionStatus: 'incoming',
      lastContacted: 'Received today',
      connectionRequestNote: 'Happy to support with mill test certificates for your projects.',
      specialization: 'Mill test certificates, technical submittals, site support',
    }),
    withMeta(supplierContact('sup_al_falah_mep', 'ct_fatima_noor'), {
      sokoId: 'SK-P-33410',
      source: undefined,
      isMaintained: true,
      dateAdded: daysAgoIso(2),
      relationshipType: 'Distributor',
      specialization: 'MEP supplies — cables, conduits and fittings',
    }),
    withMeta(supplierContact('sup_conares', 'ct_vikram_shah'), {
      sokoId: 'SK-P-33872',
      source: undefined,
      isMaintained: true,
      dateAdded: daysAgoIso(21),
      lastContactedAt: daysAgoIso(6),
      sharedVia: 'nfc',
      relationshipType: 'Manufacturer',
    }),
    withMeta(supplierContact('sup_abc_waterproofing', 'ct_sarah_thomas'), {
      isMaintained: false,
      source: 'soko',
      specialization: 'Waterproofing membranes and technical sales',
    }),
    blankContact({
      id: 'net_demo_nadia',
      name: 'Nadia Haddad',
      title: 'Senior Cost Consultant',
      company: 'Meridian Cost Consultancy',
      role: 'contractor',
      category: 'Cost & Commercial Consulting',
      location: 'Dubai, UAE',
      phone: '+971 50 448 2190',
      whatsappNumber: '+971504482190',
      email: 'nadia.haddad@meridian-cc.example',
      relationshipType: 'Consultant',
      isMaintained: true,
      dateAdded: daysAgoIso(45),
      lastContactedAt: daysAgoIso(20),
      source: 'manual',
      notes: 'Met at Big 5. Good benchmark source for structural steel rates.',
      tags: ['Added manually'],
    }),
    blankContact({
      id: 'net_demo_hassan',
      name: 'Hassan Raza',
      title: 'Plant Manager',
      company: 'Desert Rock Precast',
      companyId: 'sup_desert_rock_precast',
      role: 'supplier',
      category: 'Precast Concrete',
      location: 'Al Ain, UAE',
      phone: '+971 3 781 4400',
      whatsappNumber: '',
      email: '',
      relationshipType: 'Manufacturer',
      isMaintained: true,
      dateAdded: daysAgoIso(14),
      source: 'manual',
      tags: ['Added manually'],
    }),
  ];
  return list.filter((c): c is CommunityContact => !!c).map((c) => ({ ...c, tags: [...c.tags, 'Demo'] }));
};

const DEMO_SEED_KEY = 'soko_network_demo_seed_v1';

/** Adds the Step 5 demo records once, without overwriting anything the user already has. */
export const seedNetworkDemo = (list: CommunityContact[]): CommunityContact[] => {
  if (localStorage.getItem(DEMO_SEED_KEY)) return list;
  localStorage.setItem(DEMO_SEED_KEY, '1');
  const ids = new Set(list.map((c) => c.id));
  const seeded = list.map((c) =>
    c.isMaintained && !c.dateAdded ? { ...c, dateAdded: daysAgoIso(60 + (hashId(c.id, 90) % 90)) } : c
  );
  return [...demoRecords().filter((c) => !ids.has(c.id)), ...seeded];
};

export const DEMO_SCAN_ID = 'SK-P-31207';

export const companyLine = (s: BuyerSupplier) => [s.categories[0], supplierLocation(s)].filter(Boolean).join(' · ');
