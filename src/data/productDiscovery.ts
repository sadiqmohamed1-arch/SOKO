import {
  BUYER_SUPPLIERS,
  BuyerSupplier,
  ExternalLink,
  LOCATION_OPTIONS,
  SupplierStatus,
  SupplierType,
  matchesLocation,
  queryTokens,
} from './buyerSuppliers';
import { VaultDocument, buyerVault } from './supplierVault';

// Display groups over the existing supplier categories, so the supplier taxonomy stays the single source of truth.
export const DISCOVERY_CATEGORIES: { name: string; supplierCategories: string[] }[] = [
  { name: 'Civil & Structural', supplierCategories: ['Steel & Rebar', 'Ready Mix Concrete', 'Precast'] },
  { name: 'Steel & Rebar', supplierCategories: ['Steel & Rebar'] },
  { name: 'Concrete & Precast', supplierCategories: ['Ready Mix Concrete', 'Precast'] },
  { name: 'Construction Chemicals', supplierCategories: ['Construction Chemicals'] },
  { name: 'Waterproofing', supplierCategories: ['Waterproofing'] },
  { name: 'MEP', supplierCategories: ['MEP'] },
  { name: 'Doors & Hardware', supplierCategories: ['Doors'] },
  { name: 'Façade & Glazing', supplierCategories: ['Façade'] },
  { name: 'Finishes & Fit-Out', supplierCategories: ['Finishes'] },
  { name: 'Equipment & Machinery', supplierCategories: ['Equipment'] },
  { name: 'Building Materials', supplierCategories: [] },
];

const supplierCategoriesOf = (names: string[]) =>
  new Set(DISCOVERY_CATEGORIES.filter((c) => names.includes(c.name)).flatMap((c) => c.supplierCategories));

export const discoveryCategoryFor = (supplierCategory: string) =>
  DISCOVERY_CATEGORIES.find((c) => c.supplierCategories.length === 1 && c.supplierCategories[0] === supplierCategory)?.name ??
  supplierCategory;

export const categoryCovers = (selected: string[], categoryName: string) => {
  if (selected.includes(categoryName)) return true;
  const wanted = supplierCategoriesOf(selected);
  return [...supplierCategoriesOf([categoryName])].some((c) => wanted.has(c));
};

export interface ProductType {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  terms: string[];
}

export const PRODUCT_TYPES: ProductType[] = [
  { id: 'pt_b500b', name: 'B500B Reinforcement Steel', category: 'Steel & Rebar', keywords: ['Rebar', 'Reinforcement Steel', 'Grade B500B'], terms: ['b500b', 'reinforcement steel', 'steel reinforcement', 'reinforcement bar', 'rebar'] },
  { id: 'pt_structural_steel', name: 'Structural Steel Sections', category: 'Steel & Rebar', keywords: ['Heavy Sections', 'HEA / HEB', 'Structural Steel'], terms: ['structural section', 'structural steel', 'heavy section'] },
  { id: 'pt_wpm', name: 'Waterproofing Membranes', category: 'Waterproofing', keywords: ['Membrane', 'Pre-applied Membrane', 'Tanking', 'Roof Waterproofing'], terms: ['membrane', 'tanking', 'roof waterproofing', 'waterproofing system'] },
  { id: 'pt_admixtures', name: 'Concrete Admixtures', category: 'Construction Chemicals', keywords: ['Admixture', 'Superplasticiser'], terms: ['admixture'] },
  { id: 'pt_repair', name: 'Concrete Repair & Injection', category: 'Construction Chemicals', keywords: ['Concrete Repair', 'Injection Resin', 'Crack Injection'], terms: ['concrete repair', 'injection'] },
  { id: 'pt_sealants', name: 'Joint Sealants', category: 'Construction Chemicals', keywords: ['Sealant', 'Waterstop', 'Expansion Joint'], terms: ['sealant', 'waterstop'] },
  { id: 'pt_readymix', name: 'Ready Mix Concrete', category: 'Concrete & Precast', keywords: ['Ready-mix', 'Structural Concrete', 'Self-compacting Concrete'], terms: ['ready mix', 'structural concrete'] },
  { id: 'pt_precast', name: 'Precast Concrete', category: 'Concrete & Precast', keywords: ['Precast', 'Hollow Core Slab', 'Precast Panel'], terms: ['precast', 'hollow core'] },
  { id: 'pt_fire_doors', name: 'Fire-Rated Doors', category: 'Doors & Hardware', keywords: ['Fire Door', 'Fire-rated Steel Door', 'Doorset'], terms: ['fire rated door', 'fire door', 'steel doorset'] },
  { id: 'pt_door_hardware', name: 'Door Hardware & Ironmongery', category: 'Doors & Hardware', keywords: ['Ironmongery', 'Door Closer', 'Panic Exit Device'], terms: ['door hardware', 'ironmongery'] },
  { id: 'pt_facade', name: 'Aluminium Façade Systems', category: 'Façade & Glazing', keywords: ['Curtain Wall', 'Aluminium Window', 'ACP Cladding'], terms: ['aluminium facade', 'curtain wall', 'aluminium window', 'cladding'] },
  { id: 'pt_glazing', name: 'Glazing Units', category: 'Façade & Glazing', keywords: ['Double Glazed Unit', 'DGU', 'Glazing'], terms: ['glazing', 'glazed unit'] },
  { id: 'pt_chw', name: 'Chilled Water Pipes', category: 'MEP', keywords: ['CHW Pipe', 'Pre-insulated Pipe', 'Chilled Water Piping'], terms: ['chilled water', 'chw pipe', 'pre insulated pipe'] },
  { id: 'pt_hvac', name: 'HVAC & Ductwork', category: 'MEP', keywords: ['Ductwork', 'VRF', 'HVAC'], terms: ['hvac', 'ductwork', 'vrf'] },
  { id: 'pt_tile_adhesive', name: 'Tile Adhesives & Grouts', category: 'Finishes & Fit-Out', keywords: ['Tile Adhesive', 'Tile Grout'], terms: ['tile adhesive', 'tile grout'] },
  { id: 'pt_tiles', name: 'Ceramic & Porcelain Tiles', category: 'Finishes & Fit-Out', keywords: ['Ceramic Tiles', 'Porcelain Tiles'], terms: ['ceramic', 'porcelain'] },
  { id: 'pt_equipment', name: 'Construction Equipment Rental', category: 'Equipment & Machinery', keywords: ['Mobile Cranes', 'Earthmoving', 'Access Equipment'], terms: ['equipment rental', 'mobile crane', 'earthmoving'] },
];

const BRAND_META: Record<string, { category: string; relatedAreas: string[]; website?: string }> = {
  Sika: { category: 'Construction Chemicals', relatedAreas: ['Waterproofing', 'Concrete Repair', 'Sealants', 'Adhesives'], website: 'https://www.sika.com' },
  Mapei: { category: 'Construction Chemicals', relatedAreas: ['Tile Adhesives', 'Waterproofing', 'Floor Preparation'], website: 'https://www.mapei.com' },
  Fosroc: { category: 'Construction Chemicals', relatedAreas: ['Admixtures', 'Grouts', 'Waterproofing', 'Flooring'], website: 'https://www.fosroc.com' },
  Henkel: { category: 'Construction Chemicals', relatedAreas: ['Adhesives', 'Sealants'], website: 'https://www.henkel.com' },
  Weber: { category: 'Finishes & Fit-Out', relatedAreas: ['Screeds', 'Tile Adhesives', 'Floor Preparation'] },
  Bitumat: { category: 'Waterproofing', relatedAreas: ['Bituminous Membranes', 'Roof Waterproofing'] },
  Kingspan: { category: 'MEP', relatedAreas: ['Pre-insulated Pipes', 'Insulation'], website: 'https://www.kingspan.com' },
  Daikin: { category: 'MEP', relatedAreas: ['VRF Systems', 'HVAC'], website: 'https://www.daikin.com' },
  Legrand: { category: 'MEP', relatedAreas: ['Cable Management', 'Electrical'], website: 'https://www.legrand.com' },
  'ASSA ABLOY': { category: 'Doors & Hardware', relatedAreas: ['Door Hardware', 'Access Control'], website: 'https://www.assaabloy.com' },
  dormakaba: { category: 'Doors & Hardware', relatedAreas: ['Door Closers', 'Door Hardware'], website: 'https://www.dormakaba.com' },
  'Schüco': { category: 'Façade & Glazing', relatedAreas: ['Curtain Wall', 'Aluminium Windows'], website: 'https://www.schueco.com' },
  Technal: { category: 'Façade & Glazing', relatedAreas: ['Aluminium Windows', 'Façade Systems'], website: 'https://www.technal.com' },
  'Guardian Glass': { category: 'Façade & Glazing', relatedAreas: ['Glazing', 'Coated Glass'], website: 'https://www.guardianglass.com' },
  Liebherr: { category: 'Equipment & Machinery', relatedAreas: ['Cranes', 'Earthmoving'], website: 'https://www.liebherr.com' },
  JCB: { category: 'Equipment & Machinery', relatedAreas: ['Earthmoving', 'Access Equipment'], website: 'https://www.jcb.com' },
  CAT: { category: 'Equipment & Machinery', relatedAreas: ['Earthmoving', 'Heavy Equipment'], website: 'https://www.cat.com' },
};

export interface BrandEntry {
  name: string;
  category: string;
  relatedAreas: string[];
  website?: string;
}

const brandSuppliersRaw = (brand: string) => BUYER_SUPPLIERS.filter((s) => s.brands.includes(brand));

export const BRANDS: BrandEntry[] = Array.from(new Set(BUYER_SUPPLIERS.flatMap((s) => s.brands)))
  .sort((a, b) => a.localeCompare(b))
  .map((name) => {
    const meta = BRAND_META[name];
    if (meta) return { name, ...meta };
    const declaring = brandSuppliersRaw(name);
    return {
      name,
      category: discoveryCategoryFor(declaring[0]?.categories[0] ?? ''),
      relatedAreas: Array.from(new Set(declaring.flatMap((s) => s.capabilities))).slice(0, 4),
    };
  });

export const isOwnBrand = (s: BuyerSupplier, brand: string) =>
  s.types.includes('Manufacturer') && s.name.toLowerCase().startsWith(brand.toLowerCase());

export const brandRelationship = (s: BuyerSupplier, brand: string) =>
  isOwnBrand(s, brand) ? 'Own brand (manufacturer)' : 'Supplier-declared brand · relationship not verified by SOKO';

export interface CatalogueInfo {
  external: ExternalLink[];
  vault: VaultDocument[];
}

export const catalogueInfo = (s: BuyerSupplier): CatalogueInfo => ({
  external: s.externalCatalogues ?? [],
  vault: (buyerVault(s)?.documents ?? []).filter((d) => d.featuredCatalogue || /catalogue/i.test(d.type)),
});

export const hasCatalogue = (s: BuyerSupplier) => {
  const c = catalogueInfo(s);
  return c.external.length > 0 || c.vault.length > 0;
};

const EXTRA_STOP_WORDS = new Set(['find', 'need', 'looking', 'show', 'me', 'a', 'an', 'with', 'near', 'who', 'supply', 'supplie', 'supplier', 'product', 'brand', 'to', 'i']);

const tokensOf = (text: string) => queryTokens(text).filter((t) => !EXTRA_STOP_WORDS.has(t));
const plain = (text: string) =>
  ` ${text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

const SYNONYMS: [string, string][] = [
  ['rebar', 'reinforcement steel'],
  ['reinforcement steel', 'rebar'],
  ['steel reinforcement', 'reinforcement steel'],
  ['fire door', 'fire rated door'],
  ['fire doors', 'fire rated doors'],
  ['readymix', 'ready mix'],
  ['rmc', 'ready mix concrete'],
  ['chw', 'chilled water'],
  ['ironmongery', 'door hardware'],
  ['door hardware', 'ironmongery'],
  ['tanking', 'waterproofing'],
  ['curtain wall', 'facade'],
];

export interface QueryPlan {
  variants: string[][];
  synonyms: string[];
}

export function planQuery(query: string): QueryPlan {
  const base = plain(query);
  const variants = [tokensOf(base)];
  const synonyms: string[] = [];
  for (const [from, to] of SYNONYMS) {
    if (!base.includes(` ${from} `)) continue;
    variants.push(tokensOf(base.replace(` ${from} `, ` ${to} `)));
    synonyms.push(`${from} → ${to}`);
  }
  return { variants: variants.filter((v) => v.length), synonyms };
}

type ReasonKind = 'name' | 'category' | 'brand' | 'capability' | 'product' | 'catalogue';

interface Field {
  kind: ReasonKind;
  label: string;
  words: string[];
}

const KIND_WEIGHT: Record<ReasonKind, number> = { name: 40, category: 30, brand: 25, capability: 20, product: 15, catalogue: 10 };

const reasonText = (f: Field) =>
  ({
    name: 'Matched: Supplier name',
    category: `Matched: ${f.label} category`,
    brand: `Matched: ${f.label} brand`,
    capability: `Matched: ${f.label} capability`,
    product: `Matched: ${f.label} product listing`,
    catalogue: 'Matched: Catalogue keyword',
  })[f.kind];

const fieldsOf = (s: BuyerSupplier): Field[] => {
  const field = (kind: ReasonKind, label: string, text = label) => ({ kind, label, words: tokensOf(text) });
  const cat = catalogueInfo(s);
  return [
    field('name', s.name),
    ...s.categories.map((c) => field('category', c)),
    ...s.subcategories.map((c) => field('category', c)),
    ...s.brands.map((b) => field('brand', b)),
    ...s.capabilities.map((c) => field('capability', c)),
    ...s.products.map((p) => field('product', p.name, `${p.name} ${p.type}`)),
    ...cat.external.map((l) => field('catalogue', l.label)),
    ...cat.vault.map((d) => field('catalogue', d.name)),
  ];
};

const hit = (words: string[], token: string) => words.some((w) => w.startsWith(token));

export interface SupplierDiscoveryMatch {
  supplier: BuyerSupplier;
  score: number;
  reasons: string[];
}

const MAX_REASONS = 3;

const rankReasons = (scored: { field: Field; hits: number }[]) =>
  Array.from(
    new Set(
      scored
        .sort((a, b) => b.hits - a.hits || KIND_WEIGHT[b.field.kind] - KIND_WEIGHT[a.field.kind])
        .map((x) => reasonText(x.field))
    )
  ).slice(0, MAX_REASONS);

export function matchSupplierQuery(s: BuyerSupplier, plan: QueryPlan): SupplierDiscoveryMatch | null {
  if (!plan.variants.length) return { supplier: s, score: 0, reasons: [] };
  const fields = fieldsOf(s);
  let best = -1;
  const scored: { field: Field; hits: number }[] = [];
  for (const tokens of plan.variants) {
    const perToken = tokens.map((t) => fields.filter((f) => hit(f.words, t)));
    if (perToken.some((m) => !m.length)) continue;
    best = Math.max(best, perToken.reduce((sum, m) => sum + Math.max(...m.map((f) => KIND_WEIGHT[f.kind])), 0));
    for (const f of fields) {
      const hits = tokens.filter((t) => hit(f.words, t)).length;
      if (hits) scored.push({ field: f, hits });
    }
  }
  return best < 0 ? null : { supplier: s, score: best, reasons: rankReasons(scored) };
}

const phraseHit = (f: Field, term: string) => {
  const tokens = tokensOf(term);
  return tokens.length > 0 && tokens.every((t) => hit(f.words, t));
};

export function productTypeSuppliers(pt: ProductType, pool: BuyerSupplier[] = BUYER_SUPPLIERS): SupplierDiscoveryMatch[] {
  return pool
    .map((s) => {
      const matched = fieldsOf(s).filter((f) => f.kind !== 'name' && pt.terms.some((term) => phraseHit(f, term)));
      if (!matched.length) return null;
      return {
        supplier: s,
        score: matched.reduce((sum, f) => sum + KIND_WEIGHT[f.kind], 0),
        reasons: rankReasons(matched.map((field) => ({ field, hits: 1 }))),
      };
    })
    .filter((m): m is SupplierDiscoveryMatch => m !== null)
    .sort((a, b) => b.score - a.score || a.supplier.name.localeCompare(b.supplier.name));
}

export const productTypeBrands = (pt: ProductType) =>
  Array.from(
    new Set(
      productTypeSuppliers(pt).flatMap(({ supplier }) =>
        supplier.products.filter((p) => pt.terms.some((term) => phraseHit({ kind: 'product', label: p.name, words: tokensOf(`${p.name} ${p.type}`) }, term)))
          .map((p) => p.brand)
          .filter((b) => b !== 'Unbranded')
      )
    )
  ).sort((a, b) => a.localeCompare(b));

export function brandSuppliers(brand: string, pool: BuyerSupplier[] = BUYER_SUPPLIERS): SupplierDiscoveryMatch[] {
  return pool
    .filter((s) => s.brands.includes(brand) || s.products.some((p) => p.brand === brand))
    .map((s) => ({ supplier: s, score: 25, reasons: [`Matched: ${brand} brand`] }))
    .sort((a, b) => a.supplier.name.localeCompare(b.supplier.name));
}

const allHit = (tokens: string[], text: string) => {
  const words = tokensOf(text);
  return tokens.every((t) => hit(words, t));
};

export function matchProductType(pt: ProductType, plan: QueryPlan, brands: string[]): string | null {
  if (!plan.variants.length) return '';
  for (const tokens of plan.variants) {
    if (allHit(tokens, pt.name)) return 'Matched: Product name';
    const keyword = pt.keywords.find((k) => allHit(tokens, k));
    if (keyword) return `Matched: ${keyword} keyword`;
    if (allHit(tokens, `${pt.name} ${pt.keywords.join(' ')} ${pt.category}`)) return 'Matched: Product keywords';
    const brand = brands.find((b) => allHit(tokens, b));
    if (brand) return `Matched: ${brand} brand`;
  }
  return null;
}

export function matchBrand(b: BrandEntry, plan: QueryPlan): string | null {
  if (!plan.variants.length) return '';
  for (const tokens of plan.variants) {
    if (allHit(tokens, b.name)) return 'Matched: Brand name';
    const area = b.relatedAreas.find((a) => allHit(tokens, a));
    if (area) return `Matched: ${area} area`;
  }
  return null;
}

export interface DiscoveryFilters {
  categories: string[];
  subcategories: string[];
  brands: string[];
  locationId: string;
  types: SupplierType[];
  statuses: SupplierStatus[];
  catalogueOnly: boolean;
}

export const EMPTY_DISCOVERY_FILTERS: DiscoveryFilters = {
  categories: [],
  subcategories: [],
  brands: [],
  locationId: 'all',
  types: [],
  statuses: [],
  catalogueOnly: false,
};

export const discoverySubcategories = (categories: string[]) => {
  const wanted = supplierCategoriesOf(categories);
  return Array.from(
    new Set(BUYER_SUPPLIERS.filter((s) => !categories.length || s.categories.some((c) => wanted.has(c))).flatMap((s) => s.subcategories))
  ).sort((a, b) => a.localeCompare(b));
};

export const hasSupplierFilters = (f: DiscoveryFilters) =>
  f.subcategories.length > 0 || f.locationId !== 'all' || f.types.length > 0 || f.statuses.length > 0 || f.catalogueOnly;

export const applyDiscoveryFilters = (s: BuyerSupplier, f: DiscoveryFilters) => {
  const location = LOCATION_OPTIONS.find((o) => o.id === f.locationId) ?? LOCATION_OPTIONS[0];
  const wanted = supplierCategoriesOf(f.categories);
  return (
    (!f.categories.length || s.categories.some((c) => wanted.has(c))) &&
    (!f.subcategories.length || s.subcategories.some((c) => f.subcategories.includes(c))) &&
    (!f.brands.length || s.brands.some((b) => f.brands.includes(b))) &&
    matchesLocation(s, location) &&
    (!f.types.length || s.types.some((t) => f.types.includes(t))) &&
    (!f.statuses.length || f.statuses.includes(s.status)) &&
    (!f.catalogueOnly || hasCatalogue(s))
  );
};

export const categorySupplierCount = (name: string) => {
  const wanted = supplierCategoriesOf([name]);
  return BUYER_SUPPLIERS.filter((s) => s.categories.some((c) => wanted.has(c))).length;
};

export const PRODUCT_SEARCH_SUGGESTIONS = [
  'Waterproofing membrane',
  'B500B Rebar',
  'Fire-rated steel doors',
  'Ready-mix concrete',
  'Sika',
  'Chilled water pipes',
  'Aluminium façade',
  'Precast concrete',
];

export const AI_STYLE_EXAMPLE = 'Find suppliers for B500B reinforcement steel in UAE';

export type DiscoveryFocus = { kind: 'product' | 'brand'; id: string };

export interface SavedSearch {
  id: string;
  label: string;
  query: string;
  focus?: DiscoveryFocus;
  savedAt: string;
}

export const SAVED_SEARCHES_KEY = 'soko_buyer_saved_searches_v1';

export const DEMO_SAVED_SEARCHES: SavedSearch[] = [
  { id: 'ss_demo_wpm', label: 'Waterproofing Membranes', query: 'Waterproofing Membranes', focus: { kind: 'product', id: 'pt_wpm' }, savedAt: '2026-09-18' },
  { id: 'ss_demo_fire', label: 'Fire Rated Doors', query: 'Fire Rated Doors', focus: { kind: 'product', id: 'pt_fire_doors' }, savedAt: '2026-09-22' },
  { id: 'ss_demo_b500b', label: 'B500B Rebar', query: 'B500B Rebar', savedAt: '2026-09-25' },
];
