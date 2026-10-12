export type ProductStatus = 'draft' | 'published' | 'archived';

export const PRODUCT_STATUSES: ProductStatus[] = ['published', 'draft', 'archived'];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
};

export const PRODUCT_STATUS_CLASSES: Record<ProductStatus, string> = {
  published: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  draft: 'border-amber-200 bg-amber-50 text-amber-700',
  archived: 'border-slate-200 bg-slate-100 text-slate-600',
};

export const PRODUCT_STATUS_BAR: Record<ProductStatus, string> = {
  published: 'bg-emerald-600',
  draft: 'bg-amber-500',
  archived: 'bg-slate-400',
};

export type ReportStatus = 'open' | 'actioned' | 'dismissed';

export interface ProductSpec {
  id: string;
  label: string;
  value: string;
}

export interface ProductReport {
  id: string;
  productId: string;
  reason: string;
  status: ReportStatus;
  resolution: string | null;
  createdAt: string;
  handledAt: string | null;
}

export type ProductEventKind = 'created' | 'status' | 'updated' | 'deleted';

export interface ProductEvent {
  id: string;
  at: string;
  kind: ProductEventKind;
  summary: string;
}

export interface AdminProduct {
  id: string;
  companyId: string;
  supplierName: string | null;
  name: string;
  type: string | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  description: string | null;
  imagePaths: string[];
  /** Displayable URL for the first image. Null when no image exists or it could not be signed. */
  thumbnailUrl: string | null;
  status: ProductStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Null when specifications could not be read for this session. */
  specs: ProductSpec[] | null;
  /** Null when regions could not be read for this session. */
  regions: string[] | null;
  /** Null when the listing history (audit_log) could not be read. */
  history: ProductEvent[] | null;
}

export function productCode(id: string): string {
  return `PRD-${id.replace(/-/g, '').slice(-8).toUpperCase()}`;
}

export const UNCATEGORISED = 'Uncategorised';

// ---------------------------------------------------------------------------
// Listing completeness. Derived only from fields stored on the listing itself;
// this is not an intelligence or ranking score.
// ---------------------------------------------------------------------------

export type QualityIssue = 'description' | 'images' | 'brand' | 'category' | 'specs';

export const QUALITY_ISSUE_LABELS: Record<QualityIssue, string> = {
  description: 'Description missing or too short',
  images: 'No product images',
  brand: 'Brand not set',
  category: 'Category not set',
  specs: 'No technical specifications',
};

export type QualityLevel = 'complete' | 'attention' | 'incomplete';

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  complete: 'Complete',
  attention: 'Needs attention',
  incomplete: 'Incomplete',
};

export const QUALITY_CLASSES: Record<QualityLevel, string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  attention: 'border-amber-200 bg-amber-50 text-amber-700',
  incomplete: 'border-rose-200 bg-rose-50 text-rose-700',
};

const MIN_DESCRIPTION = 40;

export function qualityIssues(p: AdminProduct): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (!p.description || p.description.trim().length < MIN_DESCRIPTION) issues.push('description');
  if (p.imagePaths.length === 0) issues.push('images');
  if (!p.brand?.trim()) issues.push('brand');
  if (!p.category?.trim()) issues.push('category');
  if (p.specs !== null && p.specs.length === 0) issues.push('specs');
  return issues;
}

export function qualityLevel(p: AdminProduct): QualityLevel {
  const n = qualityIssues(p).length;
  return n === 0 ? 'complete' : n <= 2 ? 'attention' : 'incomplete';
}

// ---------------------------------------------------------------------------
// Categories and brands are free-text product fields; there is no managed
// taxonomy or brand table, so both are derived from the visible listings.
// ---------------------------------------------------------------------------

export interface CategoryNode {
  name: string;
  products: AdminProduct[];
  supplierIds: Set<string>;
  subcategories: { name: string; count: number }[];
  byStatus: Record<ProductStatus, number>;
  lastUpdated: string | null;
}

export function buildCategories(products: AdminProduct[]): CategoryNode[] {
  const map = new Map<string, { products: AdminProduct[]; subs: Map<string, number> }>();
  for (const p of products) {
    const name = p.category?.trim() || UNCATEGORISED;
    const entry = map.get(name) ?? { products: [] as AdminProduct[], subs: new Map<string, number>() };
    entry.products.push(p);
    const sub = p.subcategory?.trim();
    if (sub) entry.subs.set(sub, (entry.subs.get(sub) ?? 0) + 1);
    map.set(name, entry);
  }
  return [...map.entries()]
    .map(([name, e]) => ({
      name,
      products: e.products,
      supplierIds: new Set(e.products.map((p) => p.companyId)),
      subcategories: [...e.subs.entries()].map(([n, count]) => ({ name: n, count })).sort((a, b) => b.count - a.count),
      byStatus: {
        published: e.products.filter((p) => p.status === 'published').length,
        draft: e.products.filter((p) => p.status === 'draft').length,
        archived: e.products.filter((p) => p.status === 'archived').length,
      },
      lastUpdated: e.products.reduce<string | null>((max, p) => (!max || p.updatedAt > max ? p.updatedAt : max), null),
    }))
    .sort((a, b) => (a.name === UNCATEGORISED ? 1 : b.name === UNCATEGORISED ? -1 : b.products.length - a.products.length));
}

export function normaliseBrand(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/\b(llc|l\.l\.c|ltd|limited|fze|fzco|co|inc|group)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Loose key for spotting category spellings that likely mean the same thing (case, punctuation, plurals, "&"/"and"). */
export function categoryKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/(ies)$/, 'y').replace(/s$/, '') : w))
    .join(' ');
}

export function findSimilarCategories(categories: CategoryNode[]): CategoryNode[][] {
  const groups = new Map<string, CategoryNode[]>();
  for (const c of categories) {
    if (c.name === UNCATEGORISED) continue;
    const key = categoryKey(c.name);
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

export interface BrandNode {
  key: string;
  name: string;
  variants: string[];
  products: AdminProduct[];
  suppliers: { id: string; name: string | null; count: number }[];
  categories: string[];
}

export function buildBrands(products: AdminProduct[]): BrandNode[] {
  const map = new Map<string, AdminProduct[]>();
  for (const p of products) {
    const raw = p.brand?.trim();
    if (!raw) continue;
    const key = normaliseBrand(raw) || raw.toLowerCase();
    map.set(key, [...(map.get(key) ?? []), p]);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const spellings = new Map<string, number>();
      for (const p of list) spellings.set(p.brand!.trim(), (spellings.get(p.brand!.trim()) ?? 0) + 1);
      const variants = [...spellings.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
      const suppliers = new Map<string, { id: string; name: string | null; count: number }>();
      for (const p of list) {
        const s = suppliers.get(p.companyId) ?? { id: p.companyId, name: p.supplierName, count: 0 };
        s.count += 1;
        suppliers.set(p.companyId, s);
      }
      return {
        key,
        name: variants[0],
        variants,
        products: list,
        suppliers: [...suppliers.values()].sort((a, b) => b.count - a.count),
        categories: [...new Set(list.map((p) => p.category?.trim() || UNCATEGORISED))],
      };
    })
    .sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name));
}

export interface DuplicateGroup {
  key: string;
  products: AdminProduct[];
  scope: 'same-supplier' | 'cross-supplier';
}

function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Listings sharing a normalised name. Same-supplier groups are likely duplicates; cross-supplier ones are informational. */
export function findDuplicateProducts(products: AdminProduct[]): DuplicateGroup[] {
  const map = new Map<string, AdminProduct[]>();
  for (const p of products) {
    if (p.status === 'archived') continue;
    const key = `${normaliseName(p.name)}|${p.brand ? normaliseBrand(p.brand) : ''}`;
    map.set(key, [...(map.get(key) ?? []), p]);
  }
  return [...map.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, products: list, scope: new Set(list.map((p) => p.companyId)).size === 1 ? 'same-supplier' : 'cross-supplier' }));
}

// ---------------------------------------------------------------------------
// Demo catalogue (design review only; never shown in live mode)
// ---------------------------------------------------------------------------

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

interface DemoSeed {
  id: string;
  supplier: [string, string];
  name: string;
  type: string;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  description: string | null;
  image: string | null;
  status: ProductStatus;
  createdDays: number;
  updatedDays: number;
  specs: [string, string][];
  regions: string[];
}

const SUPPLIERS = {
  steel: ['comp_4', 'Gulf Steel Mills PJSC'] as [string, string],
  pipe: ['comp_2', 'Apex Industrial Castings & Alloys'] as [string, string],
  mep: ['comp_6', 'Hyperion Modular Substations Ltd'] as [string, string],
  glass: ['comp_7', 'Al-Madar General Trading FZE'] as [string, string],
};

const DEMO_SEEDS: DemoSeed[] = [
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a01', supplier: SUPPLIERS.steel, name: 'Universal Beam UB 305x165x40', type: 'Structural section',
    category: 'Structural Steel', subcategory: 'Beams & Columns', brand: 'Emirates Steel',
    description: 'Hot-rolled S355JR universal beam supplied in 12 m lengths with mill certificates. Primer coating available on request for exposed applications.',
    image: '/images/products/steel-beam.png', status: 'published', createdDays: 120, updatedDays: 6,
    specs: [['Grade', 'S355JR'], ['Standard', 'BS EN 10025-2'], ['Length', '12 m'], ['Mass', '40.3 kg/m']], regions: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a02', supplier: SUPPLIERS.steel, name: 'Deformed Rebar B500B 16mm', type: 'Reinforcement',
    category: 'Structural Steel', subcategory: 'Reinforcement', brand: 'Emirates-Steel LLC',
    description: 'High-yield deformed reinforcement bar to BS 4449, bundled in 2-tonne lots with traceable heat numbers.',
    image: null, status: 'published', createdDays: 95, updatedDays: 14,
    specs: [['Grade', 'B500B'], ['Diameter', '16 mm'], ['Standard', 'BS 4449:2005']], regions: ['Dubai', 'Northern Emirates'],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a03', supplier: SUPPLIERS.steel, name: 'Universal Beam UB 305x165x40', type: 'Structural section',
    category: 'Structural Steel', subcategory: 'Beams & Columns', brand: 'Emirates Steel',
    description: 'Duplicate listing created during catalogue import.',
    image: null, status: 'draft', createdDays: 4, updatedDays: 4, specs: [], regions: [],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a04', supplier: SUPPLIERS.pipe, name: 'HDPE Drainage Pipe PE100 SDR17', type: 'Pipe',
    category: 'Pipes & Fittings', subcategory: 'Drainage', brand: 'Polypipe',
    description: 'PE100 solid-wall drainage pipe for gravity and low-pressure applications, supplied in 6 m and 12 m lengths, 110 to 630 mm diameters.',
    image: '/images/products/hdpe-pipe.png', status: 'published', createdDays: 210, updatedDays: 2,
    specs: [['Material', 'PE100'], ['SDR', '17'], ['Diameter range', '110\u2013630 mm'], ['Standard', 'EN 12201']], regions: ['Dubai', 'Abu Dhabi'],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a05', supplier: SUPPLIERS.pipe, name: 'Electrofusion Coupler 160mm', type: 'Fitting',
    category: 'Pipes & Fittings', subcategory: 'Fittings', brand: null,
    description: 'Electrofusion coupler.',
    image: null, status: 'published', createdDays: 60, updatedDays: 31, specs: [], regions: ['Dubai'],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a06', supplier: SUPPLIERS.pipe, name: 'uPVC Pressure Pipe Class D', type: 'Pipe',
    category: 'Pipes & Fittings', subcategory: 'Pressure', brand: 'Polypipe',
    description: 'Discontinued pressure pipe range retained for historical project references.',
    image: null, status: 'archived', createdDays: 400, updatedDays: 90, specs: [['Class', 'D'], ['Material', 'uPVC']], regions: [],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a07', supplier: SUPPLIERS.mep, name: 'Butterfly Valve DN200 PN16', type: 'Valve',
    category: 'MEP', subcategory: 'Valves', brand: 'Tecofi',
    description: 'Wafer-pattern butterfly valve with ductile iron body, EPDM liner and stainless steel disc, suitable for chilled water and HVAC circuits.',
    image: '/images/products/butterfly-valve.png', status: 'published', createdDays: 150, updatedDays: 9,
    specs: [['Size', 'DN200'], ['Pressure rating', 'PN16'], ['Body', 'Ductile iron GGG40'], ['Liner', 'EPDM']], regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Northern Emirates'],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a08', supplier: SUPPLIERS.mep, name: 'Fire Rated Cable 4C 2.5mm', type: 'Cable',
    category: 'MEP', subcategory: 'Electrical', brand: 'Ducab',
    description: 'LSZH fire-resistant cable for life safety circuits, BS 8519 compliant, 100 m drums.',
    image: null, status: 'published', createdDays: 80, updatedDays: 20,
    specs: [['Cores', '4'], ['Cross-section', '2.5 mm\u00b2'], ['Standard', 'BS 8519']], regions: ['Dubai'],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a09', supplier: SUPPLIERS.mep, name: 'Chiller Pump Set', type: 'Pump',
    category: null, subcategory: null, brand: null,
    description: null,
    image: null, status: 'draft', createdDays: 12, updatedDays: 12, specs: [], regions: [],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a10', supplier: SUPPLIERS.glass, name: 'Double Glazed IGU 6-12-6 Low-E', type: 'Glazing unit',
    category: 'Facade & Glazing', subcategory: 'Insulated Glass', brand: 'Guardian Glass',
    description: 'Insulated glass unit with 6 mm low-emissivity outer pane, 12 mm argon-filled cavity and 6 mm clear inner pane. Custom sizes to shop drawings.',
    image: '/images/products/glazing-unit.png', status: 'published', createdDays: 180, updatedDays: 3,
    specs: [['Build-up', '6 / 12 / 6 mm'], ['U-value', '1.6 W/m\u00b2K'], ['Cavity fill', 'Argon'], ['Coating', 'Low-E']], regions: ['Dubai', 'Abu Dhabi'],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a11', supplier: SUPPLIERS.glass, name: 'Aluminium Curtain Wall System CW50', type: 'System',
    category: 'Facade & Glazing', subcategory: 'Curtain Wall', brand: 'Schuco',
    description: 'Stick-system curtain wall with 50 mm face width, thermally broken profiles and concealed drainage.',
    image: null, status: 'published', createdDays: 140, updatedDays: 45,
    specs: [['Face width', '50 mm'], ['Thermal break', 'Polyamide']], regions: ['Dubai'],
  },
  {
    id: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a12', supplier: SUPPLIERS.glass, name: 'Tempered Glass Balustrade Panel', type: 'Glazing panel',
    category: 'Facade & Glazing', subcategory: 'Balustrades', brand: 'Guardian',
    description: 'Toughened laminated balustrade panel for internal and external use.',
    image: null, status: 'draft', createdDays: 8, updatedDays: 1, specs: [['Thickness', '10 + 10 mm']], regions: [],
  },
];

function demoHistory(s: DemoSeed): ProductEvent[] {
  const events: ProductEvent[] = [{ id: `${s.id}-c`, at: ago(s.createdDays), kind: 'created', summary: 'Listing created as Draft' }];
  if (s.status !== 'draft') events.push({ id: `${s.id}-p`, at: ago(s.createdDays - 2), kind: 'status', summary: 'Status: Draft \u2192 Published' });
  if (s.status === 'archived') events.push({ id: `${s.id}-a`, at: ago(s.updatedDays), kind: 'status', summary: 'Status: Published \u2192 Archived' });
  else if (s.updatedDays < s.createdDays - 2) events.push({ id: `${s.id}-u`, at: ago(s.updatedDays), kind: 'updated', summary: 'Listing details updated' });
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export const DEMO_PRODUCTS: AdminProduct[] = DEMO_SEEDS.map((s) => ({
  id: s.id,
  companyId: s.supplier[0],
  supplierName: s.supplier[1],
  name: s.name,
  type: s.type,
  category: s.category,
  subcategory: s.subcategory,
  brand: s.brand,
  description: s.description,
  imagePaths: s.image ? [`${s.supplier[0]}/products/${s.image.split('/').pop()}`] : [],
  thumbnailUrl: s.image,
  status: s.status,
  publishedAt: s.status === 'published' ? ago(s.createdDays - 2) : null,
  createdAt: ago(s.createdDays),
  updatedAt: ago(s.updatedDays),
  specs: s.specs.map(([label, value], i) => ({ id: `${s.id}-s${i}`, label, value })),
  regions: s.regions,
  history: demoHistory(s),
})).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const DEMO_REPORTS: ProductReport[] = [
  { id: 'r-1', productId: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a05', reason: 'Listing has no brand or specifications; pricing claims cannot be verified.', status: 'open', resolution: null, createdAt: ago(3), handledAt: null },
  { id: 'r-2', productId: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a11', reason: 'Product appears to use a third-party brand name without authorisation.', status: 'open', resolution: null, createdAt: ago(1), handledAt: null },
  { id: 'r-3', productId: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a04', reason: 'Incorrect SDR rating in the description.', status: 'actioned', resolution: 'Supplier corrected the SDR value.', createdAt: ago(22), handledAt: ago(19) },
  { id: 'r-4', productId: '7a1c0e52-3b4d-4e6f-8a01-0c1d2e3f4a07', reason: 'Suspected duplicate of another supplier listing.', status: 'dismissed', resolution: 'Different manufacturer and model; not a duplicate.', createdAt: ago(40), handledAt: ago(38) },
];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Open',
  actioned: 'Actioned',
  dismissed: 'Dismissed',
};

export const REPORT_STATUS_CLASSES: Record<ReportStatus, string> = {
  open: 'border-rose-200 bg-rose-50 text-rose-700',
  actioned: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  dismissed: 'border-slate-200 bg-slate-100 text-slate-600',
};

export const LIVE_VISIBILITY_NOTE =
  'Products RLS has no platform-admin bypass. Your session sees published listings from public, non-suspended suppliers, plus every listing of companies you are a member of.';
