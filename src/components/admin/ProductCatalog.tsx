import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Package,
  PackageCheck,
  FilePen,
  Hourglass,
  FolderTree,
  Flag,
  LayoutDashboard,
  List,
  Tags,
  ShieldAlert,
  Search,
  X,
  AlertTriangle,
  ChevronRight,
  Copy,
  FileWarning,
  type LucideIcon,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { type AdminCompany, DASH, VERIFICATION_TONE_CLASSES, formatDate, verificationOf } from './companyShared';
import {
  type AdminProduct,
  type ProductEvent,
  type ProductReport,
  type ProductStatus,
  type ReportStatus,
  DEMO_PRODUCTS,
  DEMO_REPORTS,
  LIVE_VISIBILITY_NOTE,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_BAR,
  PRODUCT_STATUS_LABELS,
  UNCATEGORISED,
  buildBrands,
  buildCategories,
  findDuplicateProducts,
  productCode,
  qualityIssues,
  qualityLevel,
} from './productShared';
import { ProductStatusBadge, ProductThumb, QualityBadge } from './productBadges';
import { RestrictedNote } from './visitBadges';
import { SourceTag } from './userBadges';
import { BarList, EmptyState, FilterSelect, SectionCard } from './catalogUi';
import { BrandManagement, CategoryManagement } from './CatalogTaxonomy';
import { CatalogGovernance } from './CatalogGovernance';
import { ProductDetailsDrawer } from './ProductDetailsDrawer';
import { ProductEditorDrawer } from './ProductEditorDrawer';
import { BrandEditorDrawer, CategoryEditorDrawer } from './TaxonomyEditors';
import { ManagementToolbar } from './ManagementToolbar';
import { ImportWizard } from './ImportWizard';
import { type ImportContext, type ImportModuleConfig, BRAND_IMPORT, CATEGORY_IMPORT, PRODUCT_IMPORT, downloadCsv, normaliseKey } from './importSystem';

type Editor = { kind: 'product'; id: string | null } | { kind: 'category'; name: string | null } | { kind: 'brand'; key: string | null };

const PAGE_SIZE = 10;

const exportDate = () => new Date().toISOString().slice(0, 10);

type Tab = 'dashboard' | 'directory' | 'categories' | 'brands' | 'governance';
type LoadState = 'loading' | 'success' | 'error';

interface ProductCatalogProps {
  companies: AdminCompany[];
  isLive: boolean;
  /** Platform-wide published count from admin_platform_stats(); null when unavailable. */
  publishedTotal: number | null;
  /** Changes whenever the portal re-syncs, so this module reloads alongside it. */
  syncToken: number;
}

interface LiveProductRow {
  id: string;
  company_id: string;
  name: string;
  type: string | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  description: string | null;
  image_paths: string[] | null;
  status: ProductStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LiveSpecRow {
  id: string;
  product_id: string;
  label: string;
  value: string;
  position: number;
}

interface LiveRegionRow {
  product_id: string;
  region: string;
}

interface LiveReportRow {
  id: string;
  entity_id: string;
  reason: string;
  status: ReportStatus;
  resolution: string | null;
  created_at: string;
  handled_at: string | null;
}

interface LiveAuditRow {
  entity_id: string;
  action: string;
  diff: { values?: Record<string, unknown>; changed?: Record<string, { from: unknown; to: unknown }> } | null;
  at: string;
}

interface LiveData {
  products: LiveProductRow[];
  specs: LiveSpecRow[] | null;
  regions: LiveRegionRow[] | null;
  audit: LiveAuditRow[] | null;
  reports: LiveReportRow[] | null;
  thumbnails: Map<string, string> | null;
}

const ID_CHUNK = 150;
const SIGN_CHUNK = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Reads run under the signed-in admin's session. products RLS has no admin bypass (published listings of
// public suppliers plus the admin's own companies). Specs and regions inherit that visibility. content_reports
// and audit_log are readable by platform admins; reporter identity is never requested.
async function loadLiveCatalog(): Promise<LiveData> {
  const supabase = getSupabaseClient();
  const productRes = await supabase
    .from('products')
    .select('id, company_id, name, type, category, subcategory, brand, description, image_paths, status, published_at, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (productRes.error) throw productRes.error;
  const products = (productRes.data ?? []) as LiveProductRow[];

  const reportsPromise = supabase
    .from('content_reports')
    .select('id, entity_id, reason, status, resolution, created_at, handled_at')
    .eq('entity', 'product')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => (error ? null : ((data ?? []) as LiveReportRow[])));

  if (products.length === 0) {
    return { products, specs: [], regions: [], audit: [], reports: await reportsPromise, thumbnails: new Map() };
  }

  const groups = chunk(products.map((p) => p.id), ID_CHUNK);
  const readAll = async <T,>(run: (ids: string[]) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[] | null> => {
    const results = await Promise.all(groups.map(run));
    if (results.some((r) => r.error)) return null;
    return results.flatMap((r) => (r.data ?? []) as T[]);
  };

  const firstImages = products.filter((p) => (p.image_paths ?? []).length > 0).map((p) => ({ id: p.id, path: p.image_paths![0] }));
  const thumbnailsPromise = (async () => {
    if (firstImages.length === 0) return new Map<string, string>();
    const results = await Promise.all(chunk(firstImages, SIGN_CHUNK).map((batch) => supabase.storage.from('company-media').createSignedUrls(batch.map((b) => b.path), 3600)));
    if (results.some((r) => r.error)) return null;
    const byPath = new Map<string, string>();
    for (const r of results) for (const d of r.data ?? []) if (d.path && d.signedUrl) byPath.set(d.path, d.signedUrl);
    return new Map(firstImages.filter((f) => byPath.has(f.path)).map((f) => [f.id, byPath.get(f.path)!]));
  })().catch(() => null);

  const [specs, regions, audit, reports, thumbnails] = await Promise.all([
    readAll<LiveSpecRow>((ids) => supabase.from('product_specs').select('id, product_id, label, value, position').in('product_id', ids).order('position')),
    readAll<LiveRegionRow>((ids) => supabase.from('product_regions').select('product_id, region').in('product_id', ids)),
    readAll<LiveAuditRow>((ids) => supabase.from('audit_log').select('entity_id, action, diff, at').eq('entity', 'products').in('entity_id', ids).order('at', { ascending: false })),
    reportsPromise,
    thumbnailsPromise,
  ]);
  return { products, specs, regions, audit, reports, thumbnails };
}

const statusLabel = (s: unknown) => PRODUCT_STATUS_LABELS[s as ProductStatus] ?? String(s);

function auditToEvents(rows: LiveAuditRow[]): Map<string, ProductEvent[]> {
  const byProduct = new Map<string, ProductEvent[]>();
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.entity_id}|${r.action}|${r.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const changed = r.diff?.changed ?? {};
    let event: Omit<ProductEvent, 'id' | 'at'>;
    if (r.action === 'insert') {
      const initial = r.diff?.values?.status;
      event = { kind: 'created', summary: initial ? `Listing created as ${statusLabel(initial)}` : 'Listing created' };
    } else if (r.action === 'delete') {
      event = { kind: 'deleted', summary: 'Listing deleted' };
    } else if (changed.status) {
      event = { kind: 'status', summary: `Status: ${statusLabel(changed.status.from)} \u2192 ${statusLabel(changed.status.to)}` };
    } else {
      const fields = Object.keys(changed).filter((f) => f !== 'published_at');
      event = { kind: 'updated', summary: fields.length > 0 ? `Updated ${fields.join(', ').replace(/_/g, ' ')}` : 'Listing details updated' };
    }
    const list = byProduct.get(r.entity_id) ?? [];
    list.push({ ...event, id: `${key}|${list.length}`, at: r.at });
    byProduct.set(r.entity_id, list);
  }
  return byProduct;
}

function buildLiveProducts(data: LiveData, companies: AdminCompany[]): AdminProduct[] {
  const nameById = new Map(companies.map((c) => [c.id, c.companyName]));
  const specsBy = new Map<string, LiveSpecRow[]>();
  for (const s of data.specs ?? []) specsBy.set(s.product_id, [...(specsBy.get(s.product_id) ?? []), s]);
  const regionsBy = new Map<string, string[]>();
  for (const r of data.regions ?? []) regionsBy.set(r.product_id, [...(regionsBy.get(r.product_id) ?? []), r.region]);
  const events = data.audit ? auditToEvents(data.audit) : null;

  return data.products.map((p) => ({
    id: p.id,
    companyId: p.company_id,
    supplierName: nameById.get(p.company_id) ?? null,
    name: p.name,
    type: p.type,
    category: p.category,
    subcategory: p.subcategory,
    brand: p.brand,
    description: p.description,
    imagePaths: p.image_paths ?? [],
    thumbnailUrl: data.thumbnails?.get(p.id) ?? null,
    status: p.status,
    publishedAt: p.published_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    specs: data.specs ? (specsBy.get(p.id) ?? []).sort((a, b) => a.position - b.position).map((s) => ({ id: s.id, label: s.label, value: s.value })) : null,
    regions: data.regions ? regionsBy.get(p.id) ?? [] : null,
    history: events ? (events.get(p.id) ?? []).sort((a, b) => b.at.localeCompare(a.at)) : null,
  }));
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ companies, isLive, publishedTotal, syncToken }) => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loadState, setLoadState] = useState<LoadState>(isLive ? 'loading' : 'success');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const [page, setPage] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [wizard, setWizard] = useState<ImportModuleConfig | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const closeWizard = useCallback(() => setWizard(null), []);
  const closeEditor = useCallback(() => setEditor(null), []);

  useEffect(() => {
    setPage(0);
  }, [supplierFilter, categoryFilter, brandFilter, statusFilter, searchQuery]);

  useEffect(() => {
    if (!isLive) {
      setLiveData(null);
      setLoadState('success');
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setLoadError(null);
    loadLiveCatalog()
      .then((data) => {
        if (cancelled) return;
        setLiveData(data);
        setLoadState('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadState('error');
        setLoadError(err instanceof Error ? err.message : 'Products could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [isLive, syncToken]);

  const products = useMemo<AdminProduct[]>(() => (isLive ? (liveData ? buildLiveProducts(liveData, companies) : []) : DEMO_PRODUCTS), [isLive, liveData, companies]);
  const reports = useMemo<ProductReport[] | null>(() => {
    if (!isLive) return DEMO_REPORTS;
    if (!liveData?.reports) return liveData ? null : [];
    return liveData.reports.map((r) => ({ id: r.id, productId: r.entity_id, reason: r.reason, status: r.status, resolution: r.resolution, createdAt: r.created_at, handledAt: r.handled_at }));
  }, [isLive, liveData]);
  const source = isLive ? 'live' : 'demo';
  const isInitialLoad = loadState === 'loading' && products.length === 0;
  const loadFailed = loadState === 'error' && products.length === 0;
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  const categories = useMemo(() => buildCategories(products), [products]);
  const brands = useMemo(() => buildBrands(products), [products]);
  const duplicates = useMemo(() => findDuplicateProducts(products), [products]);
  const reportsByProduct = useMemo(() => {
    const map = new Map<string, ProductReport[]>();
    for (const r of reports ?? []) map.set(r.productId, [...(map.get(r.productId) ?? []), r]);
    return map;
  }, [reports]);
  const openReportedIds = useMemo(() => new Set((reports ?? []).filter((r) => r.status === 'open').map((r) => r.productId)), [reports]);
  const missingCount = products.filter((p) => p.status !== 'archived' && qualityIssues(p).length > 0).length;

  const counts = useMemo(
    () => ({
      total: products.length,
      published: products.filter((p) => p.status === 'published').length,
      draft: products.filter((p) => p.status === 'draft').length,
      categories: categories.filter((c) => c.name !== UNCATEGORISED).length,
    }),
    [products, categories],
  );

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) map.set(p.companyId, p.supplierName ?? `Supplier ${p.companyId.slice(0, 8)}`);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (supplierFilter !== 'all' && p.companyId !== supplierFilter) return false;
      if (categoryFilter !== 'all' && (p.category?.trim() || UNCATEGORISED) !== categoryFilter) return false;
      if (brandFilter !== 'all' && !brands.find((b) => b.key === brandFilter)?.products.includes(p)) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!query) return true;
      return [p.name, p.brand, p.category, p.subcategory, p.supplierName, productCode(p.id)].filter(Boolean).some((s) => String(s).toLowerCase().includes(query));
    });
  }, [products, brands, supplierFilter, categoryFilter, brandFilter, statusFilter, searchQuery]);

  const hasActiveFilters = supplierFilter !== 'all' || categoryFilter !== 'all' || brandFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';
  const resetFilters = () => {
    setSupplierFilter('all');
    setCategoryFilter('all');
    setBrandFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };
  const openDirectory = (status: 'all' | ProductStatus = 'all') => {
    resetFilters();
    setStatusFilter(status);
    setTab('directory');
  };

  const openReportCount = reports === null ? null : openReportedIds.size;
  const publishedValue = isLive ? publishedTotal : counts.published;

  type Kpi = { id: string; label: string; value: number | null; icon: LucideIcon; tone: string; note?: string; unavailableReason?: string; onClick?: () => void };
  const kpis: Kpi[] = [
    { id: 'total', label: 'Total Products', value: counts.total, icon: Package, tone: 'bg-blue-50 text-blue-700', note: isLive ? 'Visible to your session' : undefined, onClick: () => openDirectory() },
    {
      id: 'published',
      label: 'Published Products',
      value: publishedValue,
      icon: PackageCheck,
      tone: 'bg-emerald-50 text-emerald-700',
      note: isLive ? 'Platform-wide' : undefined,
      unavailableReason: 'admin_platform_stats did not return a count',
      onClick: () => openDirectory('published'),
    },
    { id: 'draft', label: 'Draft Products', value: counts.draft, icon: FilePen, tone: 'bg-amber-50 text-amber-700', note: isLive ? 'Your companies only' : undefined, onClick: () => openDirectory('draft') },
    { id: 'pending', label: 'Pending Review', value: null, icon: Hourglass, tone: 'bg-slate-100 text-slate-600', unavailableReason: 'No listing review state in schema' },
    { id: 'categories', label: 'Product Categories', value: counts.categories, icon: FolderTree, tone: 'bg-indigo-50 text-indigo-700', note: 'Derived from listings', onClick: () => setTab('categories') },
    {
      id: 'reported',
      label: 'Reported Products',
      value: openReportCount,
      icon: Flag,
      tone: 'bg-rose-50 text-rose-700',
      note: isLive ? 'Open reports, platform-wide' : 'Open reports',
      unavailableReason: 'content_reports could not be read',
      onClick: () => setTab('governance'),
    },
  ];

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'directory', label: 'Product Directory', icon: List },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'brands', label: 'Brands', icon: Tags },
    { id: 'governance', label: 'Catalog Governance', icon: ShieldAlert },
  ];

  const emptyDirectoryMessage = loadFailed
    ? 'Products could not be loaded. Use Sync to try again.'
    : products.length === 0
    ? isLive
      ? 'No product listings are visible to your admin session.'
      : 'No product listings have been created yet.'
    : 'No products match the current filters.';

  const statusRows = PRODUCT_STATUSES.map((s) => ({ key: s, label: PRODUCT_STATUS_LABELS[s], value: products.filter((p) => p.status === s).length, bar: PRODUCT_STATUS_BAR[s] })).filter((r) => r.value > 0);
  const categoryRows = categories.slice(0, 6).map((c) => ({ key: c.name, label: c.name, value: c.products.length, bar: c.name === UNCATEGORISED ? 'bg-slate-400' : 'bg-blue-600' }));
  const recent = products.slice(0, 6);
  const emptyText = isInitialLoad ? 'Loading\u2026' : 'No listings to analyse.';
  const selectedProduct = selectedId ? products.find((p) => p.id === selectedId) ?? null : null;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const pageAllSelected = pageRows.length > 0 && pageRows.every((p) => selectedProducts.has(p.id));
  const pageSomeSelected = pageRows.some((p) => selectedProducts.has(p.id));
  const allMatchingSelected = filtered.length > 0 && filtered.every((p) => selectedProducts.has(p.id));
  const toggleIn = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const togglePage = () =>
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      for (const p of pageRows) {
        if (pageAllSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });

  const supplierRef = useCallback((companyId: string, fallback: string | null) => companyById.get(companyId)?.sokoId || companyById.get(companyId)?.companyName || fallback || '', [companyById]);

  const importContexts = useMemo<Record<'products' | 'categories' | 'brands', ImportContext>>(() => {
    const supplier = new Map<string, string>();
    for (const c of companies) {
      supplier.set(normaliseKey(c.companyName), c.companyName);
      if (c.sokoId) supplier.set(normaliseKey(c.sokoId), c.companyName);
    }
    const category = new Map(categories.filter((c) => c.name !== UNCATEGORISED).map((c) => [normaliseKey(c.name), c.name]));
    const brand = new Map(brands.map((b) => [b.key, b.name]));
    const references = { supplier, category, brand };

    const productKeys = new Map<string, string>();
    for (const p of products) {
      const label = `${productCode(p.id)} ${p.name}`;
      productKeys.set(`code:${normaliseKey(productCode(p.id))}`, label);
      const c = companyById.get(p.companyId);
      for (const s of [c?.companyName, c?.sokoId, p.supplierName]) if (s) productKeys.set(`name:${normaliseKey(s)}|${normaliseKey(p.name)}`, label);
    }
    return {
      products: { references, existing: productKeys },
      categories: { references, existing: new Map(categories.filter((c) => c.name !== UNCATEGORISED).map((c) => [`name:|${normaliseKey(c.name)}`, c.name])) },
      brands: { references, existing: new Map(brands.map((b) => [`brand:${b.key}`, b.name])) },
    };
  }, [companies, categories, brands, products, companyById]);

  const referenceNote = isLive
    ? 'Suppliers are checked against the companies loaded in this portal; categories and brands against the listings your session can read. A real import would re-check everything server-side.'
    : 'Suppliers, categories and brands are checked against the demo dataset. A real import would re-check everything server-side.';

  const exportProducts = (list: AdminProduct[], suffix: string) =>
    downloadCsv(`soko-products-${suffix}-${exportDate()}.csv`, [
      PRODUCT_IMPORT.fields.map((f) => f.label),
      ...list.map((p) => {
        const row: Record<string, string> = {
          product_code: productCode(p.id),
          name: p.name,
          supplier: supplierRef(p.companyId, p.supplierName),
          brand: p.brand ?? '',
          category: p.category ?? '',
          subcategory: p.subcategory ?? '',
          type: p.type ?? '',
          description: p.description ?? '',
          regions: (p.regions ?? []).join('; '),
          specs: (p.specs ?? []).map((s) => `${s.label}: ${s.value}`).join('; '),
          status: p.status,
        };
        return PRODUCT_IMPORT.fields.map((f) => row[f.key] ?? '');
      }),
    ]);
  const exportCategories = (list: typeof categories, suffix: string) =>
    downloadCsv(`soko-categories-${suffix}-${exportDate()}.csv`, [
      [...CATEGORY_IMPORT.fields.map((f) => f.label), 'Listings', 'Subcategories'],
      ...list.filter((c) => c.name !== UNCATEGORISED).map((c) => [c.name, '', '', '', String(c.products.length), c.subcategories.map((s) => s.name).join('; ')]),
    ]);
  const exportBrands = (list: typeof brands, suffix: string) =>
    downloadCsv(`soko-brands-${suffix}-${exportDate()}.csv`, [
      [...BRAND_IMPORT.fields.map((f) => f.label), 'Listings'],
      ...list.map((b) => [b.name, '', '', '', b.variants.filter((v) => v !== b.name).join('; '), String(b.products.length)]),
    ]);

  const editorProduct = editor?.kind === 'product' && editor.id ? products.find((p) => p.id === editor.id) ?? null : null;

  const alerts: { id: string; label: string; value: number | null; icon: LucideIcon; tone: string }[] = [
    { id: 'reports', label: 'Listings with open reports', value: openReportCount, icon: Flag, tone: 'text-rose-600' },
    { id: 'duplicates', label: 'Possible duplicate groups', value: duplicates.length, icon: Copy, tone: 'text-amber-600' },
    { id: 'missing', label: 'Active listings missing information', value: missingCount, icon: FileWarning, tone: 'text-slate-600' },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Package className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
              Products & catalog <SourceTag source={source} />
            </span>
            <span className="text-sm font-bold text-slate-900">
              {isInitialLoad ? DASH : counts.total.toLocaleString()} {counts.total === 1 ? 'listing' : 'listings'} {isLive ? 'visible' : 'in catalog'}
            </span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 sm:max-w-lg sm:text-right text-pretty">
          {isLive ? LIVE_VISIBILITY_NOTE : 'Sign in as a platform administrator to load staging listings. Demo listings are shown for design review.'}
        </p>
      </div>

      {loadState === 'error' && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="leading-relaxed">
            <strong className="font-semibold">Products are unavailable.</strong> {loadError}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const unavailable = kpi.value === null || (loadFailed && kpi.id !== 'published' && kpi.id !== 'reported');
          const content = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {unavailable && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unavailable</span>
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={`font-mono text-2xl font-bold leading-none ${unavailable ? 'text-slate-300' : 'text-slate-900'}`}>
                  {unavailable || (isInitialLoad && kpi.id !== 'published') ? DASH : kpi.value!.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                <span className="text-[11px] leading-snug text-slate-400">{unavailable && kpi.value === null ? kpi.unavailableReason : kpi.note}</span>
              </span>
            </>
          );
          if (unavailable || !kpi.onClick) {
            return (
              <div key={kpi.id} className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
                {content}
              </div>
            );
          }
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={kpi.onClick}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              {content}
            </button>
          );
        })}
      </div>

      <div role="tablist" aria-label="Product catalog views" className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`products-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`products-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`products-panel-${tab}`} aria-labelledby={`products-tab-${tab}`}>
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SectionCard title="Recently updated listings" description="Latest changes across the catalog." source={<SourceTag source={source} />}>
                {isInitialLoad ? (
                  <div className="h-48 animate-pulse rounded-lg bg-slate-100" aria-busy="true" aria-label="Loading products" />
                ) : recent.length === 0 ? (
                  <EmptyState icon={Package} title={emptyDirectoryMessage} compact />
                ) : (
                  <>
                    <ul className="flex flex-col divide-y divide-slate-100">
                      {recent.map((p) => (
                        <li key={p.id}>
                          <button type="button" onClick={() => setSelectedId(p.id)} aria-label={`View details for ${p.name}`} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer">
                            <ProductThumb product={p} />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="truncate text-xs font-semibold text-slate-900">{p.name}</span>
                              <span className="truncate text-[11px] text-slate-500">
                                {p.supplierName ?? 'Supplier not visible'} {'\u2022'} {p.category || UNCATEGORISED}
                              </span>
                            </span>
                            <span className="hidden text-[11px] text-slate-400 sm:inline">{formatDate(p.updatedAt)}</span>
                            <ProductStatusBadge status={p.status} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => openDirectory()} className="inline-flex items-center gap-1 self-start text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                      View all products
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </>
                )}
              </SectionCard>
            </div>
            <div className="flex flex-col gap-4 lg:col-span-2">
              <SectionCard title="Governance alerts" source={<SourceTag source={source} />}>
                <ul className="flex flex-col divide-y divide-slate-100">
                  {alerts.map((a) => {
                    const Icon = a.icon;
                    return (
                      <li key={a.id}>
                        <button type="button" onClick={() => setTab('governance')} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer">
                          <Icon className={`h-4 w-4 shrink-0 ${a.tone}`} aria-hidden="true" />
                          <span className="flex-1 text-xs font-medium text-slate-700">{a.label}</span>
                          <span className="font-mono text-sm font-bold text-slate-900">{a.value === null || isInitialLoad ? DASH : a.value}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
              <SectionCard title="Listing status" source={<SourceTag source={source} />}>
                <BarList rows={statusRows} emptyText={emptyText} />
              </SectionCard>
              <SectionCard title="Top categories" source={<SourceTag source={source} />}>
                <BarList rows={categoryRows} emptyText={emptyText} />
              </SectionCard>
            </div>
          </div>
        )}

        {tab === 'directory' && (
          <div className="flex flex-col gap-4">
            <ManagementToolbar
              config={PRODUCT_IMPORT}
              onAddNew={() => setEditor({ kind: 'product', id: null })}
              onImport={() => setWizard(PRODUCT_IMPORT)}
              onExport={() => exportProducts(filtered, hasActiveFilters ? 'filtered' : 'all')}
              exportCount={filtered.length}
              selectedCount={selectedProducts.size}
              onExportSelected={() => exportProducts(products.filter((p) => selectedProducts.has(p.id)), 'selected')}
              onClearSelection={() => setSelectedProducts(new Set())}
            />
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative lg:w-72 lg:shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <label className="sr-only" htmlFor="products-search">
                  Search products
                </label>
                <input
                  id="products-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search product, brand, supplier or ID"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
                <FilterSelect id="products-supplier-filter" label="Filter by supplier" value={supplierFilter} onChange={setSupplierFilter}>
                  <option value="all">All suppliers</option>
                  {supplierOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect id="products-category-filter" label="Filter by category" value={categoryFilter} onChange={setCategoryFilter}>
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect id="products-brand-filter" label="Filter by brand" value={brandFilter} onChange={setBrandFilter}>
                  <option value="all">All brands</option>
                  {brands.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.name}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect id="products-status-filter" label="Filter by listing status" value={statusFilter} onChange={(v) => setStatusFilter(v as 'all' | ProductStatus)}>
                  <option value="all">All statuses</option>
                  {PRODUCT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PRODUCT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-900">{filtered.length}</strong> of {products.length} {products.length === 1 ? 'listing' : 'listings'}
              </span>
              {hasActiveFilters && (
                <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>

            {isInitialLoad ? (
              <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading products">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Package} title={emptyDirectoryMessage} />
            ) : (
              <>
                {pageAllSelected && filtered.length > pageRows.length && (
                  <div className="hidden items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 md:flex">
                    {allMatchingSelected ? (
                      <>
                        All <strong className="font-semibold">{filtered.length}</strong> matching listings are selected.
                        <button type="button" onClick={() => setSelectedProducts(new Set())} className="font-semibold text-blue-700 underline-offset-2 hover:underline cursor-pointer">
                          Clear selection
                        </button>
                      </>
                    ) : (
                      <>
                        All {pageRows.length} listings on this page are selected.
                        <button
                          type="button"
                          onClick={() => setSelectedProducts((prev) => new Set([...prev, ...filtered.map((p) => p.id)]))}
                          className="font-semibold text-blue-700 underline-offset-2 hover:underline cursor-pointer"
                        >
                          Select all {filtered.length} matching listings
                        </button>
                      </>
                    )}
                  </div>
                )}
                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="w-10 py-3 pl-3">
                          <input
                            type="checkbox"
                            checked={pageAllSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = !pageAllSelected && pageSomeSelected;
                            }}
                            onChange={togglePage}
                            aria-label="Select all listings on this page"
                            className="h-4 w-4 accent-blue-700 cursor-pointer"
                          />
                        </th>
                        <th scope="col" className="px-3 py-3">Product</th>
                        <th scope="col" className="px-2.5 py-3">Supplier Company</th>
                        <th scope="col" className="hidden px-2.5 py-3 lg:table-cell">Brand</th>
                        <th scope="col" className="px-2.5 py-3">Category</th>
                        <th scope="col" className="px-2.5 py-3">Status</th>
                        <th scope="col" className="px-2.5 py-3">Verification / Quality</th>
                        <th scope="col" className="hidden px-2.5 py-3 xl:table-cell">Last Updated</th>
                        <th scope="col" className="px-3 py-3 text-right">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageRows.map((p) => {
                        const supplier = companyById.get(p.companyId);
                        const v = supplier ? verificationOf(supplier, isLive) : null;
                        const reported = openReportedIds.has(p.id);
                        const checked = selectedProducts.has(p.id);
                        return (
                          <tr key={p.id} className={`transition-colors ${checked ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                            <td className="py-2.5 pl-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setSelectedProducts((prev) => toggleIn(prev, p.id))}
                                aria-label={`Select ${p.name}`}
                                className="h-4 w-4 accent-blue-700 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="flex items-center gap-3">
                                <ProductThumb product={p} />
                                <span className="flex min-w-0 flex-col">
                                  <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                                    <span className="line-clamp-1">{p.name}</span>
                                    {reported && <Flag className="h-3 w-3 shrink-0 text-rose-600" aria-label="Has open reports" />}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400">{productCode(p.id)}</span>
                                </span>
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 font-medium text-slate-900">{p.supplierName ?? <span className="font-normal text-slate-500">Not visible</span>}</td>
                            <td className="hidden px-2.5 py-2.5 lg:table-cell">{p.brand || <span className="text-slate-400">{DASH}</span>}</td>
                            <td className="px-2.5 py-2.5">
                              <span className="flex flex-col">
                                <span className={p.category ? 'text-slate-900' : 'italic text-slate-400'}>{p.category || UNCATEGORISED}</span>
                                {p.subcategory && <span className="text-[11px] text-slate-500">{p.subcategory}</span>}
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5">
                              <ProductStatusBadge status={p.status} />
                            </td>
                            <td className="px-2.5 py-2.5">
                              <span className="flex flex-col items-start gap-1">
                                {v ? (
                                  <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${VERIFICATION_TONE_CLASSES[v.tone]}`}>Supplier: {v.label}</span>
                                ) : (
                                  <span className="text-[11px] text-slate-400">Supplier not visible</span>
                                )}
                                <QualityBadge level={qualityLevel(p)} />
                              </span>
                            </td>
                            <td className="hidden whitespace-nowrap px-2.5 py-2.5 text-slate-600 xl:table-cell">{formatDate(p.updatedAt)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedId(p.id)}
                                  aria-label={`View details for ${p.name}`}
                                  className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-700 cursor-pointer"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditor({ kind: 'product', id: p.id })}
                                  aria-label={`Edit ${p.name}`}
                                  className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-700 cursor-pointer"
                                >
                                  Edit
                                </button>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 && (
                  <nav aria-label="Product directory pages" className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      Page {safePage + 1} of {pageCount}
                    </span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        disabled={safePage === 0}
                        onClick={() => setPage(safePage - 1)}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 enabled:hover:bg-slate-50 enabled:cursor-pointer disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= pageCount - 1}
                        onClick={() => setPage(safePage + 1)}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 enabled:hover:bg-slate-50 enabled:cursor-pointer disabled:opacity-40"
                      >
                        Next
                      </button>
                    </span>
                  </nav>
                )}

                <ul className="flex flex-col gap-2 md:hidden">
                  {pageRows.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        aria-label={`View details for ${p.name}`}
                        className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-300 cursor-pointer"
                      >
                        <ProductThumb product={p} />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                          <span className="text-xs text-slate-500">
                            {p.supplierName ?? 'Supplier not visible'} {'\u2022'} {p.category || UNCATEGORISED}
                          </span>
                          <span className="flex flex-wrap gap-1.5">
                            <ProductStatusBadge status={p.status} />
                            <QualityBadge level={qualityLevel(p)} />
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {tab === 'categories' && (
          <div className="flex flex-col gap-4">
            <ManagementToolbar
              config={CATEGORY_IMPORT}
              onAddNew={() => setEditor({ kind: 'category', name: null })}
              onImport={() => setWizard(CATEGORY_IMPORT)}
              onExport={() => exportCategories(categories, 'all')}
              exportCount={categories.filter((c) => c.name !== UNCATEGORISED).length}
              selectedCount={selectedCategories.size}
              onExportSelected={() => exportCategories(categories.filter((c) => selectedCategories.has(c.name)), 'selected')}
              onClearSelection={() => setSelectedCategories(new Set())}
            />
            <CategoryManagement
              categories={categories}
              source={source}
              isLive={isLive}
              loading={isInitialLoad}
              onOpenProduct={setSelectedId}
              selected={selectedCategories}
              onToggle={(name) => setSelectedCategories((prev) => toggleIn(prev, name))}
              onEdit={(name) => setEditor({ kind: 'category', name })}
            />
          </div>
        )}

        {tab === 'brands' && (
          <div className="flex flex-col gap-4">
            <ManagementToolbar
              config={BRAND_IMPORT}
              onAddNew={() => setEditor({ kind: 'brand', key: null })}
              onImport={() => setWizard(BRAND_IMPORT)}
              onExport={() => exportBrands(brands, 'all')}
              exportCount={brands.length}
              selectedCount={selectedBrands.size}
              onExportSelected={() => exportBrands(brands.filter((b) => selectedBrands.has(b.key)), 'selected')}
              onClearSelection={() => setSelectedBrands(new Set())}
            />
            <BrandManagement
              brands={brands}
              unbrandedCount={products.filter((p) => !p.brand?.trim()).length}
              source={source}
              isLive={isLive}
              loading={isInitialLoad}
              onOpenProduct={setSelectedId}
              selected={selectedBrands}
              onToggle={(key) => setSelectedBrands((prev) => toggleIn(prev, key))}
              onEdit={(key) => setEditor({ kind: 'brand', key })}
            />
          </div>
        )}

        {tab === 'governance' && (
          <div className="flex flex-col gap-4">
            {isLive && <RestrictedNote>{LIVE_VISIBILITY_NOTE} Reports are read platform-wide; reporter identities are never requested.</RestrictedNote>}
            <CatalogGovernance products={products} reports={reports} duplicates={duplicates} source={source} isLive={isLive} onOpenProduct={setSelectedId} />
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductDetailsDrawer
          product={selectedProduct}
          supplier={companyById.get(selectedProduct.companyId)}
          reports={reports === null ? null : reportsByProduct.get(selectedProduct.id) ?? []}
          isLive={isLive}
          onClose={closeDrawer}
        />
      )}

      {editor?.kind === 'product' && (
        <ProductEditorDrawer key={editor.id ?? 'new'} product={editorProduct} companies={companies} categories={categories} brands={brands} onClose={closeEditor} />
      )}
      {editor?.kind === 'category' && (
        <CategoryEditorDrawer key={editor.name ?? 'new'} category={editor.name ? categories.find((c) => c.name === editor.name) ?? null : null} categories={categories} onClose={closeEditor} />
      )}
      {editor?.kind === 'brand' && (
        <BrandEditorDrawer key={editor.key ?? 'new'} brand={editor.key ? brands.find((b) => b.key === editor.key) ?? null : null} brands={brands} onClose={closeEditor} />
      )}
      {wizard && (
        <ImportWizard
          key={wizard.id}
          config={wizard}
          context={importContexts[wizard.id as 'products' | 'categories' | 'brands']}
          referenceNote={referenceNote}
          onClose={closeWizard}
        />
      )}
    </div>
  );
};
