import { BUYER_SUPPLIERS, BuyerSupplier, SupplierProduct, SupplierType } from './buyerSuppliers';
import { buildSupplierDemo, SUPPLIER_STORE_VERSION } from './supplierDemo';
import { CompanyDocument, CompanyMembership, CompanyProduct, CompanyRecord, CompanyRole, CONTRACTOR_TIER_CONFIG, SessionUser, SupplierStore, SupplierTier, TIER_CONFIG, VendorComplianceDoc } from './supplierTypes';

const STORAGE_KEY = 'soko_supplier_workspace_v1';

export const loadSupplierStore = (): SupplierStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SupplierStore;
      if (parsed?.version === SUPPLIER_STORE_VERSION && Array.isArray(parsed.companies)) return parsed;
    }
  } catch {
    /* fall through to demo seed */
  }
  return buildSupplierDemo(BUYER_SUPPLIERS);
};

export const saveSupplierStore = (store: SupplierStore) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full or unavailable */
  }
};

export const resetSupplierStore = () => {
  localStorage.removeItem(STORAGE_KEY);
  return buildSupplierDemo(BUYER_SUPPLIERS);
};

export const companyById = (store: SupplierStore, id: string) => store.companies.find((c) => c.id === id);
export const productsOf = (store: SupplierStore, companyId: string) => store.products.filter((p) => p.companyId === companyId);
export const documentsOf = (store: SupplierStore, companyId: string) => store.documents.filter((d) => d.companyId === companyId);
export const membersOf = (store: SupplierStore, companyId: string) => store.memberships.filter((m) => m.companyId === companyId);
export const membershipsOfUser = (store: SupplierStore, userId: string) => store.memberships.filter((m) => m.userId === userId && m.status === 'active');
export const membershipFor = (store: SupplierStore, userId: string, companyId: string): CompanyMembership | undefined =>
  store.memberships.find((m) => m.userId === userId && m.companyId === companyId && m.status === 'active');

export const effectiveRole = (store: SupplierStore, membership: CompanyMembership): CompanyRole =>
  membership.role === 'supplier_admin' || membership.role === 'contractor_admin' ? store.previewRole[membership.companyId] ?? membership.role : membership.role;

export const storageAllocationMb = (c: CompanyRecord) =>
  c.storageMb ?? (c.kind === 'contractor' ? CONTRACTOR_TIER_CONFIG[c.tier].storageMb : TIER_CONFIG[c.tier].storageMb);
export const storageUsedMb = (docs: CompanyDocument[]) => Math.round(docs.reduce((n, d) => n + d.sizeMb, 0) * 10) / 10;
export const vendorComplianceDocsOf = (store: SupplierStore, companyId: string) => store.vendorComplianceDocs.filter((d) => d.companyId === companyId);

export const daysUntil = (iso?: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : undefined);

export type ExpiryState = 'none' | 'valid' | 'reminder' | 'expired';
export const documentExpiry = (d: CompanyDocument): ExpiryState => {
  const n = daysUntil(d.expiry);
  if (n === undefined) return 'none';
  if (n < 0) return 'expired';
  if (n <= d.reminderDays) return 'reminder';
  return 'valid';
};

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  section: 'information' | 'products' | 'brands' | 'certifications' | 'contacts' | 'locations' | 'verification' | 'overview';
}

const contractorChecklist = (c: CompanyRecord): ChecklistItem[] => {
  const p = c.profile;
  return [
    { id: 'description', label: 'Company description (80+ characters)', done: p.description.trim().length >= 80, section: 'overview' },
    { id: 'license', label: 'Trade license details', done: !!p.licenseNo && !!p.licenseExpiry, section: 'information' },
    { id: 'contact', label: 'Website, email and telephone', done: !!p.website && !!p.generalEmail && !!p.phone, section: 'information' },
    { id: 'address', label: 'Business address', done: !!p.address, section: 'locations' },
    { id: 'classification', label: 'Business classification', done: p.types.length > 0, section: 'overview' },
    { id: 'disciplines', label: 'Construction disciplines and specialisms', done: p.categories.length > 0 && p.subcategories.length > 0, section: 'overview' },
    { id: 'services', label: 'Services offered', done: p.capabilities.length > 0, section: 'overview' },
    { id: 'locations', label: 'Operating locations', done: p.regionsServed.length > 0, section: 'locations' },
    { id: 'certifications', label: 'Certifications listed', done: p.certifications.length > 0, section: 'certifications' },
    { id: 'contacts', label: 'Authorized representatives', done: p.contacts.length > 0, section: 'contacts' },
    { id: 'verification', label: 'Trade license submitted for verification', done: c.verification.status === 'verified' || c.verification.status === 'pending', section: 'verification' },
  ];
};

export const profileChecklist = (c: CompanyRecord, products: CompanyProduct[]): ChecklistItem[] => {
  if (c.kind === 'contractor') return contractorChecklist(c);
  const p = c.profile;
  return [
    { id: 'description', label: 'Company description (80+ characters)', done: p.description.trim().length >= 80, section: 'overview' },
    { id: 'license', label: 'Trade license details', done: !!p.licenseNo && !!p.licenseExpiry, section: 'information' },
    { id: 'contact', label: 'Website, email and telephone', done: !!p.website && !!p.generalEmail && !!p.phone, section: 'information' },
    { id: 'address', label: 'Business address', done: !!p.address, section: 'locations' },
    { id: 'categories', label: 'Trade categories and subcategories', done: p.categories.length > 0 && p.subcategories.length > 0, section: 'overview' },
    { id: 'products', label: 'At least 3 active products', done: products.filter((x) => x.status === 'active').length >= 3, section: 'products' },
    { id: 'brands', label: 'Brands represented', done: p.brands.length > 0, section: 'brands' },
    { id: 'certifications', label: 'Certifications listed', done: p.certifications.length > 0, section: 'certifications' },
    { id: 'contacts', label: 'Key contacts published', done: p.contacts.length > 0, section: 'contacts' },
    { id: 'markets', label: 'Regions and markets served', done: p.regionsServed.length > 0, section: 'locations' },
    { id: 'verification', label: 'Trade license submitted for verification', done: c.verification.status === 'verified' || c.verification.status === 'pending', section: 'verification' },
  ];
};

export const profileCompletion = (c: CompanyRecord, products: CompanyProduct[]) => {
  const list = profileChecklist(c, products);
  return Math.round((list.filter((i) => i.done).length / list.length) * 100);
};

const TYPE_MAP: Record<string, SupplierType> = {
  Manufacturer: 'Manufacturer',
  Distributor: 'Distributor',
  Trader: 'Trader',
  Stockist: 'Distributor',
  Subcontractor: 'Subcontractor',
  'Service Provider': 'Service Provider',
  'Equipment Supplier': 'Service Provider',
  'Rental Company': 'Service Provider',
  'Specialist Contractor': 'Subcontractor',
  'Authorized Dealer': 'Authorized Dealer',
};

const toDirectoryProduct = (p: CompanyProduct, prev?: SupplierProduct): SupplierProduct => ({
  id: p.id,
  name: p.name,
  type: p.type,
  category: p.category,
  brand: p.brand,
  technicalDatasheet: prev?.technicalDatasheet ?? p.attachments.some((a) => a.kind === 'Datasheet'),
  certifications: prev?.certifications ?? p.attachments.some((a) => a.kind === 'Certificate'),
  intelligenceScore: p.intelligenceScore,
  imageUrl: p.images[0] ?? '',
});

const directoryStatus = (c: CompanyRecord): BuyerSupplier['status'] =>
  c.verification.status === 'verified' ? 'verified' : c.verification.status === 'pending' ? 'pending' : 'listed';

const applyCompany = (store: SupplierStore, c: CompanyRecord) => {
  const p = c.profile;
  const products = productsOf(store, c.id);
  let entry = BUYER_SUPPLIERS.find((s) => s.id === c.id);
  if (!entry) {
    entry = {
      id: c.id,
      name: p.tradingName,
      logoTone: p.logoTone,
      status: 'listed',
      types: [],
      categories: [],
      subcategories: [],
      capabilities: [],
      brands: [],
      countryCode: 'AE',
      country: p.country,
      headquarters: p.emirate,
      regionsServed: [],
      description: '',
      tradeLicense: { status: 'not-submitted' },
      companyInfoVerified: false,
      documentationPct: 0,
      profileCompletenessPct: 0,
      certifications: [],
      technicalDocuments: [],
      products: [],
      contacts: [],
      intelligenceScore: 50,
      networkActivity: 'Low',
      updatedDaysAgo: 0,
    };
    BUYER_SUPPLIERS.push(entry);
  }
  const prevProducts = new Map(entry.products.map((x) => [x.id, x]));
  const types = [...new Set(p.types.map((t) => TYPE_MAP[t]).filter(Boolean))];
  Object.assign(entry, {
    sokoId: c.sokoId,
    plan: c.tier === 'premium' ? 'pro' : 'free',
    name: p.tradingName,
    logoTone: p.logoTone,
    status: directoryStatus(c),
    types: types.length ? types : ['Service Provider'],
    descriptor: p.descriptor || undefined,
    categories: [...p.categories],
    subcategories: [...p.subcategories],
    capabilities: [...p.capabilities],
    brands: [...p.brands],
    country: p.country,
    headquarters: p.emirate,
    regionsServed: [...p.regionsServed],
    marketsServed: [...p.marketsServed],
    description: p.description,
    established: p.established,
    website: p.website || undefined,
    generalEmail: p.generalEmail || undefined,
    tradeLicense: {
      status: c.verification.status === 'verified' ? 'verified' : c.verification.status === 'pending' ? 'pending' : 'not-submitted',
      expiry: p.licenseExpiry || undefined,
    },
    companyInfoVerified: c.verification.status === 'verified',
    profileCompletenessPct: profileCompletion(c, products),
    certifications: p.certifications.map((x) => ({ ...x })),
    contacts: p.contacts.map((x) => ({ ...x })),
    products: products.filter((x) => x.status === 'active').map((x) => toDirectoryProduct(x, prevProducts.get(x.id))),
    updatedDaysAgo: Math.max(0, Math.floor((Date.now() - new Date(c.updatedAt).getTime()) / 86400000)),
  } satisfies Partial<BuyerSupplier>);
};

export const syncDirectory = (store: SupplierStore) => {
  store.companies.forEach((c) => applyCompany(store, c));
};

export const findDuplicateCompanies = (store: SupplierStore, name: string, licenseNo: string) => {
  const norm = (s: string) => s.toLowerCase().replace(/\b(llc|l\.l\.c|fze|pjsc|co|company|trading|est)\b/g, '').replace(/[^a-z0-9]/g, '');
  const n = norm(name);
  const lic = licenseNo.trim().toLowerCase();
  const fromStore = store.companies
    .filter((c) => (n.length > 3 && norm(c.profile.tradingName) === n) || (n.length > 3 && norm(c.profile.legalName) === n) || (!!lic && c.profile.licenseNo.toLowerCase() === lic))
    .map((c) => ({ id: c.id, name: c.profile.tradingName, reason: lic && c.profile.licenseNo.toLowerCase() === lic ? 'Trade license number already registered' : 'Company name already on SOKO' }));
  const fromDirectory = BUYER_SUPPLIERS.filter((s) => n.length > 3 && norm(s.name) === n && !fromStore.some((x) => x.id === s.id)).map((s) => ({
    id: s.id,
    name: s.name,
    reason: 'Company name already listed in the Supplier Directory',
  }));
  return [...fromStore, ...fromDirectory];
};

export const searchCompanies = (store: SupplierStore, q: string) => {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  return BUYER_SUPPLIERS.filter((s) => s.name.toLowerCase().includes(t) || (s.sokoId ?? '').toLowerCase().includes(t))
    .slice(0, 6)
    .map((s) => ({ id: s.id, name: s.name, location: s.headquarters, sokoId: s.sokoId, managed: store.companies.some((c) => c.id === s.id) }));
};

export const companyUser = (u: { id: string; name: string; email?: string; title?: string }): SessionUser => ({
  id: u.id,
  name: u.name,
  email: u.email ?? '',
  title: u.title ?? '',
});

syncDirectory(loadSupplierStore());
