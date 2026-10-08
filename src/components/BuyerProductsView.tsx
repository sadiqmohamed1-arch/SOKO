import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronRight, Info, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { BUYER_SUPPLIERS, BuyerSupplier, LOCATION_OPTIONS, STATUS_META } from '../data/buyerSuppliers';
import {
  AI_STYLE_EXAMPLE,
  BRANDS,
  DEMO_SAVED_SEARCHES,
  DISCOVERY_CATEGORIES,
  DiscoveryFilters,
  DiscoveryFocus,
  EMPTY_DISCOVERY_FILTERS,
  PRODUCT_SEARCH_SUGGESTIONS,
  PRODUCT_TYPES,
  SAVED_SEARCHES_KEY,
  SavedSearch,
  applyDiscoveryFilters,
  brandSuppliers,
  categoryCovers,
  categorySupplierCount,
  hasSupplierFilters,
  matchBrand,
  matchProductType,
  matchSupplierQuery,
  planQuery,
  productTypeBrands,
  productTypeSuppliers,
} from '../data/productDiscovery';
import { BrandCard, MatchingSupplierCard, ProductTypeCard } from './ProductDiscoveryCards';
import { ProductDiscoveryFilters } from './ProductDiscoveryFilters';
import { BuyerSupplierProfile, ProfileTab } from './BuyerSupplierProfile';
import { ContactSupplierModal } from './ContactSupplierModal';
import { CommunityContact } from '../types';

interface BuyerProductsViewProps {
  onNavigateToTab: (tab: string) => void;
  onStartMessageWith: (supplierId: string, supplierName: string) => void;
  networkContacts: CommunityContact[];
  onUpdateNetworkContacts: (contacts: CommunityContact[]) => void;
}

type ResultTab = 'products' | 'suppliers';

const SAVED_SUPPLIERS_KEY = 'soko_buyer_saved_suppliers_v1';
const BRANDS_PREVIEW = 9;
const AUTOCOMPLETE_LIMIT = 6;

const readJson = <T,>(key: string, fallback: T, valid: (v: unknown) => v is T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isSavedSearchArray = (v: unknown): v is SavedSearch[] =>
  Array.isArray(v) && v.every((x) => x && typeof x.id === 'string' && typeof x.label === 'string' && typeof x.query === 'string');

const PRODUCT_BRANDS = new Map(PRODUCT_TYPES.map((pt) => [pt.id, productTypeBrands(pt)]));
const AUTOCOMPLETE_TERMS = Array.from(new Set([...PRODUCT_TYPES.flatMap((pt) => [pt.name, ...pt.keywords]), ...BRANDS.map((b) => b.name)]));

const sameFocus = (a?: DiscoveryFocus | null, b?: DiscoveryFocus | null) => (!a && !b) || (!!a && !!b && a.kind === b.kind && a.id === b.id);

const focusLabel = (f: DiscoveryFocus) => (f.kind === 'product' ? PRODUCT_TYPES.find((p) => p.id === f.id)?.name : f.id) ?? f.id;

export const BuyerProductsView: React.FC<BuyerProductsViewProps> = ({ onNavigateToTab, onStartMessageWith, networkContacts, onUpdateNetworkContacts }) => {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<ResultTab>('products');
  const [focus, setFocus] = useState<DiscoveryFocus | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => readJson(SAVED_SUPPLIERS_KEY, [], isStringArray));
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => readJson(SAVED_SEARCHES_KEY, DEMO_SAVED_SEARCHES, isSavedSearchArray));
  const [selected, setSelected] = useState<{ id: string; tab: ProfileTab } | null>(null);
  const [contactFor, setContactFor] = useState<BuyerSupplier | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(SAVED_SUPPLIERS_KEY, JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(savedSearches));
  }, [savedSearches]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [selected?.id]);

  const plan = useMemo(() => planQuery(query), [query]);
  const pool = useMemo(() => BUYER_SUPPLIERS.filter((s) => applyDiscoveryFilters(s, filters)), [filters]);
  const supplierFiltered = hasSupplierFilters(filters);

  const productResults = useMemo(() => {
    const rows = PRODUCT_TYPES.map((pt) => {
      const brands = PRODUCT_BRANDS.get(pt.id) ?? [];
      return { pt, brands, reason: matchProductType(pt, plan, brands), suppliers: productTypeSuppliers(pt, pool) };
    }).filter(
      (r) =>
        r.reason !== null &&
        (!filters.categories.length || categoryCovers(filters.categories, r.pt.category)) &&
        (!filters.brands.length || r.brands.some((b) => filters.brands.includes(b))) &&
        (!supplierFiltered || r.suppliers.length > 0)
    );
    return query ? rows.sort((a, b) => b.suppliers.length - a.suppliers.length) : rows;
  }, [plan, pool, filters, supplierFiltered, query]);

  const brandResults = useMemo(() => {
    const linked = new Map<string, string>();
    if (query) productResults.forEach((r) => r.brands.forEach((b) => !linked.has(b) && linked.set(b, `Linked to ${r.pt.name}`)));
    return BRANDS.map((b) => ({ brand: b, reason: matchBrand(b, plan) ?? linked.get(b.name) ?? null, suppliers: brandSuppliers(b.name, pool) }))
      .filter(
        (r) =>
          r.reason !== null &&
          (!filters.categories.length || categoryCovers(filters.categories, r.brand.category)) &&
          (!filters.brands.length || filters.brands.includes(r.brand.name)) &&
          (!supplierFiltered || r.suppliers.length > 0)
      )
      .sort((a, b) => b.suppliers.length - a.suppliers.length || a.brand.name.localeCompare(b.brand.name));
  }, [plan, pool, filters, supplierFiltered, query, productResults]);

  const supplierResults = useMemo(() => {
    if (focus?.kind === 'product') {
      const pt = PRODUCT_TYPES.find((p) => p.id === focus.id);
      return pt ? productTypeSuppliers(pt, pool) : [];
    }
    if (focus?.kind === 'brand') return brandSuppliers(focus.id, pool);
    return pool
      .map((s) => matchSupplierQuery(s, plan))
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.score - a.score || a.supplier.name.localeCompare(b.supplier.name));
  }, [focus, pool, plan]);

  const autocomplete = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    return AUTOCOMPLETE_TERMS.filter((t) => t.toLowerCase().includes(q) && t.toLowerCase() !== q).slice(0, AUTOCOMPLETE_LIMIT);
  }, [input]);

  const runSearch = (q: string, nextFocus: DiscoveryFocus | null = null, nextTab: ResultTab = 'products') => {
    setInput(q);
    setQuery(q.trim());
    setFocus(nextFocus);
    setTab(nextTab);
    setAutocompleteOpen(false);
  };

  const showSuppliersFor = (nextFocus: DiscoveryFocus) => {
    setFocus(nextFocus);
    setTab('suppliers');
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const findSaved = (q: string, f: DiscoveryFocus | null) =>
    savedSearches.find((s) => (f ? sameFocus(s.focus, f) : !s.focus && s.query.toLowerCase() === q.toLowerCase()));

  const toggleSavedSearch = (label: string, q: string, f: DiscoveryFocus | null) => {
    const existing = findSaved(q, f);
    if (existing) {
      setSavedSearches((prev) => prev.filter((s) => s.id !== existing.id));
      setToast(`Removed "${existing.label}" from My Saved Searches`);
      return;
    }
    const entry: SavedSearch = { id: `ss_${Date.now()}`, label, query: q, ...(f ? { focus: f } : {}), savedAt: new Date().toISOString().slice(0, 10) };
    setSavedSearches((prev) => [entry, ...prev]);
    setToast(`Saved "${label}" to My Saved Searches`);
  };

  const removeSavedSearch = (s: SavedSearch) => {
    setSavedSearches((prev) => prev.filter((x) => x.id !== s.id));
    setToast(`Removed "${s.label}" from My Saved Searches`);
  };

  const toggleSaveSupplier = (s: BuyerSupplier) => {
    const isSaved = savedIds.includes(s.id);
    setSavedIds((prev) => (isSaved ? prev.filter((x) => x !== s.id) : [...prev, s.id]));
    setToast(isSaved ? `Removed ${s.name} from My Saved Suppliers` : `Saved ${s.name} to My Saved Suppliers`);
  };

  const toggleCategory = (name: string) =>
    setFilters((f) => ({ ...f, categories: f.categories.includes(name) ? f.categories.filter((c) => c !== name) : [...f.categories, name], subcategories: [] }));

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...filters.categories.map((v) => ({ key: `c-${v}`, label: v, remove: () => setFilters({ ...filters, categories: filters.categories.filter((x) => x !== v), subcategories: [] }) })),
    ...filters.subcategories.map((v) => ({ key: `sc-${v}`, label: v, remove: () => setFilters({ ...filters, subcategories: filters.subcategories.filter((x) => x !== v) }) })),
    ...filters.brands.map((v) => ({ key: `b-${v}`, label: v, remove: () => setFilters({ ...filters, brands: filters.brands.filter((x) => x !== v) }) })),
    ...(filters.locationId !== 'all'
      ? [{ key: 'loc', label: LOCATION_OPTIONS.find((o) => o.id === filters.locationId)?.label ?? '', remove: () => setFilters({ ...filters, locationId: 'all' }) }]
      : []),
    ...filters.types.map((v) => ({ key: `t-${v}`, label: v, remove: () => setFilters({ ...filters, types: filters.types.filter((x) => x !== v) }) })),
    ...filters.statuses.map((v) => ({ key: `s-${v}`, label: STATUS_META[v].label, remove: () => setFilters({ ...filters, statuses: filters.statuses.filter((x) => x !== v) }) })),
    ...(filters.catalogueOnly ? [{ key: 'cat', label: 'Catalogue available', remove: () => setFilters({ ...filters, catalogueOnly: false }) }] : []),
  ];

  const clearFilters = () => setFilters(EMPTY_DISCOVERY_FILTERS);
  const clearAll = () => {
    clearFilters();
    runSearch('');
  };

  const selectedSupplier = selected && BUYER_SUPPLIERS.find((s) => s.id === selected.id);

  const contactModal = contactFor && (
    <ContactSupplierModal
      supplier={contactFor}
      onClose={() => setContactFor(null)}
      onViewContact={() => onNavigateToTab('contacts')}
      onRequestContact={() => onStartMessageWith(contactFor.id, contactFor.name)}
      onViewAllContacts={() => {
        setSelected({ id: contactFor.id, tab: 'contacts' });
        setContactFor(null);
      }}
    />
  );

  const toastEl = toast && (
    <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm shadow-lg">
      {toast}
    </div>
  );

  if (selectedSupplier) {
    return (
      <>
        <BuyerSupplierProfile
          key={selectedSupplier.id + selected!.tab}
          supplier={selectedSupplier}
          matchQuery={query}
          initialTab={selected!.tab}
          saved={savedIds.includes(selectedSupplier.id)}
          networkContacts={networkContacts}
          onUpdateNetworkContacts={onUpdateNetworkContacts}
          onBack={() => setSelected(null)}
          onToggleSave={() => toggleSaveSupplier(selectedSupplier)}
          onContact={() => setContactFor(selectedSupplier)}
          onOpenSupplier={(id) => setSelected({ id, tab: 'overview' })}
          onRequestContact={() => onStartMessageWith(selectedSupplier.id, selectedSupplier.name)}
          onNotify={setToast}
        />
        {contactModal}
        {toastEl}
      </>
    );
  }

  const browsing = !query && !focus;
  const currentSaved = query || focus ? findSaved(query, focus) : undefined;
  const visibleBrands = browsing && !showAllBrands ? brandResults.slice(0, BRANDS_PREVIEW) : brandResults;
  const filterCount = chips.length;

  const filtersPanel = <ProductDiscoveryFilters filters={filters} onChange={setFilters} />;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6 bg-white rounded-xl border border-slate-200 px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-[11px] font-semibold tracking-wider text-slate-500">PRODUCTS</p>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight mt-1">Discover Construction Products</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Search construction materials, brands and product categories to find relevant suppliers across the SOKO network.
        </p>
        <form
          className="mt-4 flex gap-2"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(input);
          }}
        >
          <div className="relative flex-1">
            <label htmlFor="product-search" className="sr-only">
              Search products and brands
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="product-search"
              type="search"
              autoComplete="off"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setAutocompleteOpen(true);
                if (!e.target.value) runSearch('');
              }}
              onFocus={() => setAutocompleteOpen(true)}
              onBlur={() => setAutocompleteOpen(false)}
              onKeyDown={(e) => e.key === 'Escape' && setAutocompleteOpen(false)}
              placeholder="Search product, material, brand, specification or category..."
              className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
            />
            {autocompleteOpen && autocomplete.length > 0 && (
              <ul role="listbox" className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg py-1 animate-[fadeIn_0.15s_ease-out]">
                {autocomplete.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        runSearch(t);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 hover:text-blue-700 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit" className="px-5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer">
            Search
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">Try:</span>
          {PRODUCT_SEARCH_SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => runSearch(q)}
              className="px-2.5 py-1 rounded-full border border-slate-200 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-gold-600" />
            Ask in your own words
          </span>
          <button type="button" onClick={() => runSearch(AI_STYLE_EXAMPLE)} className="text-left text-blue-700 hover:text-blue-800 hover:underline cursor-pointer">
            &ldquo;{AI_STYLE_EXAMPLE}&rdquo;
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('soko-ai')}
            className="sm:ml-auto inline-flex items-center gap-0.5 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Open SOKO AI
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {savedSearches.length > 0 && (
        <section aria-label="My Saved Searches" className="mb-6 flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-500 mr-1">My Saved Searches</h2>
          {savedSearches.map((s) => (
            <span key={s.id} className="inline-flex items-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-blue-300 transition-colors">
              <button type="button" onClick={() => runSearch(s.query, s.focus ?? null, s.focus ? 'suppliers' : 'products')} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 hover:text-blue-700 cursor-pointer">
                <BookmarkCheck className="w-3.5 h-3.5 text-blue-700" />
                {s.label}
              </button>
              <button type="button" onClick={() => removeSavedSearch(s)} aria-label={`Remove saved search ${s.label}`} className="p-1 mr-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </section>
      )}

      <div className="flex w-full items-start gap-6">
        <aside className="hidden lg:block w-[260px] xl:w-[272px] shrink-0 bg-white rounded-xl border border-slate-200 px-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto overflow-x-hidden">
          <div className="flex items-center justify-between pt-3.5 pb-1.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Filters{filterCount > 0 && <span className="text-blue-700"> ({filterCount})</span>}
            </h2>
            {filterCount > 0 && (
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                Clear All
              </button>
            )}
          </div>
          {filtersPanel}
        </aside>

        <section ref={resultsRef} className="flex-1 min-w-0 w-full scroll-mt-20" aria-label="Discovery results">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200">
            <div role="tablist" aria-label="Result type" className="flex gap-1">
              {(
                [
                  { id: 'products', label: 'Products & Brands', count: productResults.length + brandResults.length },
                  { id: 'suppliers', label: 'Matching Suppliers', count: supplierResults.length },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 sm:px-4 py-2.5 -mb-px border-b-2 text-sm font-semibold transition-colors cursor-pointer ${
                    tab === t.id ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[11px] ${tab === t.id ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pb-2">
              {(query || focus) && (
                <button
                  type="button"
                  onClick={() => toggleSavedSearch(focus ? focusLabel(focus) : query, query || (focus ? focusLabel(focus) : ''), focus)}
                  aria-pressed={!!currentSaved}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {currentSaved ? <BookmarkCheck className="w-4 h-4 text-blue-700" /> : <Bookmark className="w-4 h-4" />}
                  {currentSaved ? 'Search Saved' : 'Save Search'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters{filterCount ? ` (${filterCount})` : ''}
              </button>
            </div>
          </div>

          <div className="mt-3 mb-4 space-y-1">
            {query && (
              <p className="text-sm text-slate-700">
                Results for <span className="font-semibold text-slate-900">&ldquo;{query}&rdquo;</span>
                {plan.synonyms.length > 0 && <span className="text-slate-500"> · Also searched: {plan.synonyms.join(', ')}</span>}
              </p>
            )}
            <p className="text-xs text-slate-400">Results are ordered by relevance. A supplier&rsquo;s plan does not affect discovery or ranking, and no results are paid placements.</p>
          </div>

          {(chips.length > 0 || (tab === 'suppliers' && focus)) && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {tab === 'suppliers' && focus && (
                <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {focus.kind === 'product' ? 'Product' : 'Brand'}: {focusLabel(focus)}
                  <button type="button" onClick={() => setFocus(null)} aria-label="Show all matching suppliers" className="p-0.5 rounded-full hover:bg-white/20 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {chips.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-800">
                  {c.label}
                  <button type="button" onClick={c.remove} aria-label={`Remove ${c.label}`} className="p-0.5 rounded-full hover:bg-blue-100 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-slate-500 hover:text-slate-800 ml-1 cursor-pointer">
                Clear All
              </button>
            </div>
          )}

          {tab === 'products' ? (
            <div className="space-y-8">
              {browsing && (
                <section aria-labelledby="browse-categories">
                  <h2 id="browse-categories" className="text-base font-semibold text-slate-900 mb-3">Browse by Category</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                    {DISCOVERY_CATEGORIES.map((c) => {
                      const count = categorySupplierCount(c.name);
                      const active = filters.categories.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => toggleCategory(c.name)}
                          aria-pressed={active}
                          className={`text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                            active ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`block text-sm font-semibold ${active ? 'text-blue-800' : 'text-slate-900'}`}>{c.name}</span>
                          <span className="block text-xs text-slate-500 mt-0.5">{count ? `${count} ${count === 1 ? 'supplier' : 'suppliers'}` : 'No suppliers listed yet'}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <section aria-labelledby="product-types">
                <h2 id="product-types" className="text-base font-semibold text-slate-900 mb-3">
                  Product Types <span className="text-sm font-normal text-slate-500">({productResults.length})</span>
                </h2>
                {productResults.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 px-4 py-6 text-center">No product types match this search.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {productResults.map(({ pt, brands, reason, suppliers }) => {
                      const f: DiscoveryFocus = { kind: 'product', id: pt.id };
                      return (
                        <ProductTypeCard
                          key={pt.id}
                          product={pt}
                          reason={reason || undefined}
                          brands={brands}
                          supplierCount={suppliers.length}
                          saved={!!findSaved(pt.name, f)}
                          onViewSuppliers={() => showSuppliersFor(f)}
                          onToggleSaveSearch={() => toggleSavedSearch(pt.name, pt.name, f)}
                          onOpenBrand={(b) => showSuppliersFor({ kind: 'brand', id: b })}
                        />
                      );
                    })}
                  </div>
                )}
              </section>

              <section aria-labelledby="brands">
                <h2 id="brands" className="text-base font-semibold text-slate-900 mb-3">
                  Brands <span className="text-sm font-normal text-slate-500">({brandResults.length})</span>
                </h2>
                {brandResults.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 px-4 py-6 text-center">No brands match this search.</p>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {visibleBrands.map(({ brand, reason, suppliers }) => (
                        <BrandCard
                          key={brand.name}
                          brand={brand}
                          reason={reason || undefined}
                          supplierCount={suppliers.length}
                          onFindSuppliers={() => showSuppliersFor({ kind: 'brand', id: brand.name })}
                        />
                      ))}
                    </div>
                    {browsing && brandResults.length > BRANDS_PREVIEW && (
                      <button type="button" onClick={() => setShowAllBrands((v) => !v)} className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                        {showAllBrands ? 'Show fewer brands' : `Show all ${brandResults.length} brands`}
                      </button>
                    )}
                  </>
                )}
              </section>

              {query && productResults.length === 0 && brandResults.length === 0 && supplierResults.length > 0 && (
                <button type="button" onClick={() => setTab('suppliers')} className="text-sm font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                  See {supplierResults.length} matching {supplierResults.length === 1 ? 'supplier' : 'suppliers'}
                </button>
              )}
            </div>
          ) : supplierResults.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-900">No suppliers match your search</p>
              <p className="text-sm text-slate-500 mt-1">Try a broader term such as a category or brand, or remove some filters.</p>
              <button type="button" onClick={clearAll} className="mt-4 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {supplierResults.map(({ supplier, reasons }) => (
                <MatchingSupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  reasons={reasons}
                  focusBrand={focus?.kind === 'brand' ? focus.id : undefined}
                  saved={savedIds.includes(supplier.id)}
                  onView={() => setSelected({ id: supplier.id, tab: 'overview' })}
                  onContact={() => setContactFor(supplier)}
                  onViewCatalogue={() => setSelected({ id: supplier.id, tab: 'documents' })}
                  onToggleSave={() => toggleSaveSupplier(supplier)}
                />
              ))}
            </div>
          )}

          <p className="mt-8 flex items-start gap-2 rounded-lg border border-slate-200 border-l-4 border-l-gold-500 bg-white px-4 py-3 text-xs text-slate-600 leading-relaxed">
            <Info className="w-4 h-4 shrink-0 text-slate-400 mt-px" />
            <span>
              <span className="font-semibold text-slate-800">Demo data.</span> Product types, brand links and catalogues on this page are derived from sample supplier profiles in this prototype.
              Brands and capabilities are declared by suppliers; only suppliers marked SOKO Verified have been reviewed by SOKO. Brand listings do not imply authorised distributor status.
            </span>
          </p>
        </section>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-slate-900/40 cursor-default" />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white flex flex-col shadow-xl animate-[slideUp_0.2s_ease-out]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Filters{filterCount > 0 && ` (${filterCount})`}</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close" className="p-1 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4">{filtersPanel}</div>
            <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
              <button type="button" onClick={clearFilters} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer">
                Clear All
              </button>
              <button type="button" onClick={() => setDrawerOpen(false)} className="flex-1 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-semibold cursor-pointer">
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
      {contactModal}
      {toastEl}
    </div>
  );
};
