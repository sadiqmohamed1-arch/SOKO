import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  BUYER_SUPPLIERS,
  BuyerSupplier,
  EMPTY_FILTERS,
  LOCATION_OPTIONS,
  SORT_OPTIONS,
  STATUS_META,
  SupplierFilters,
  SupplierSort,
  applyFilters,
  getSearchSuggestions,
  matchSupplier,
  queryTokens,
  supplierFromShareLink,
} from '../data/buyerSuppliers';
import { SupplierFiltersPanel } from './SupplierFiltersPanel';
import { SupplierResultCard } from './SupplierResultCard';
import { BuyerSupplierProfile, ProfileTab } from './BuyerSupplierProfile';
import { ContactSupplierModal } from './ContactSupplierModal';
import { CommunityContact } from '../types';

interface BuyerSuppliersViewProps {
  onNavigateToTab: (tab: string) => void;
  onStartMessageWith: (supplierId: string, supplierName: string) => void;
  networkContacts: CommunityContact[];
  onUpdateNetworkContacts: (contacts: CommunityContact[]) => void;
}

const SAVED_KEY = 'soko_buyer_saved_suppliers_v1';

const loadSaved = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const lastVerifiedTime = (s: BuyerSupplier) => (s.lastVerified ? new Date(s.lastVerified).getTime() : 0);

export const BuyerSuppliersView: React.FC<BuyerSuppliersViewProps> = ({ onNavigateToTab, onStartMessageWith, networkContacts, onUpdateNetworkContacts }) => {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SupplierFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SupplierSort>('relevant');
  const [savedOnly, setSavedOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(loadSaved);
  const [selected, setSelected] = useState<{ id: string; query: string; tab: ProfileTab } | null>(() => {
    const shared = supplierFromShareLink();
    return shared ? { id: shared.id, query: '', tab: 'overview' } : null;
  });
  const [contactFor, setContactFor] = useState<BuyerSupplier | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const suggestions = useMemo(() => getSearchSuggestions(), []);

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [selected?.id]);

  const toggleSave = (s: BuyerSupplier) => {
    const isSaved = savedIds.includes(s.id);
    setSavedIds((prev) => (isSaved ? prev.filter((x) => x !== s.id) : [...prev, s.id]));
    setToast(isSaved ? `Removed ${s.name} from My Saved Suppliers` : `Saved ${s.name} to My Saved Suppliers`);
  };

  const results = useMemo(() => {
    const tokens = queryTokens(query);
    const matched = BUYER_SUPPLIERS.filter((s) => applyFilters(s, filters) && (!savedOnly || savedIds.includes(s.id)))
      .map((s) => ({ supplier: s, match: matchSupplier(s, tokens) }))
      .filter((r): r is { supplier: BuyerSupplier; match: NonNullable<typeof r.match> } => r.match !== null);
    const byIntelligence = (a: (typeof matched)[number], b: (typeof matched)[number]) =>
      b.supplier.intelligenceScore - a.supplier.intelligenceScore;
    return matched.sort((a, b) => {
      if (sort === 'intelligence') return byIntelligence(a, b);
      if (sort === 'recently-verified') return lastVerifiedTime(b.supplier) - lastVerifiedTime(a.supplier) || byIntelligence(a, b);
      if (sort === 'recently-updated') return a.supplier.updatedDaysAgo - b.supplier.updatedDaysAgo;
      return b.match.score - a.match.score || byIntelligence(a, b);
    });
  }, [query, filters, sort, savedOnly, savedIds]);

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...filters.categories.map((v) => ({ key: `c-${v}`, label: v, remove: () => setFilters({ ...filters, categories: filters.categories.filter((x) => x !== v) }) })),
    ...filters.subcategories.map((v) => ({ key: `sc-${v}`, label: v, remove: () => setFilters({ ...filters, subcategories: filters.subcategories.filter((x) => x !== v) }) })),
    ...(filters.locationId !== 'all'
      ? [{ key: 'loc', label: LOCATION_OPTIONS.find((o) => o.id === filters.locationId)?.label ?? '', remove: () => setFilters({ ...filters, locationId: 'all' }) }]
      : []),
    ...filters.statuses.map((v) => ({ key: `s-${v}`, label: STATUS_META[v].label, remove: () => setFilters({ ...filters, statuses: filters.statuses.filter((x) => x !== v) }) })),
    ...filters.brands.map((v) => ({ key: `b-${v}`, label: v, remove: () => setFilters({ ...filters, brands: filters.brands.filter((x) => x !== v) }) })),
    ...filters.certifications.map((v) => ({ key: `ce-${v}`, label: v, remove: () => setFilters({ ...filters, certifications: filters.certifications.filter((x) => x !== v) }) })),
    ...filters.types.map((v) => ({ key: `t-${v}`, label: v, remove: () => setFilters({ ...filters, types: filters.types.filter((x) => x !== v) }) })),
    ...(filters.minIntelligence
      ? [{ key: 'int', label: `Intelligence ${filters.minIntelligence}+`, remove: () => setFilters({ ...filters, minIntelligence: 0 }) }]
      : []),
    ...(savedOnly ? [{ key: 'saved', label: 'My Saved Suppliers', remove: () => setSavedOnly(false) }] : []),
  ];
  const filterCount = chips.length - (savedOnly ? 1 : 0);

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSavedOnly(false);
    setInput('');
    setQuery('');
  };

  const runSearch = (q: string) => {
    setInput(q);
    setQuery(q.trim());
  };

  const title = query
    ? `Results for "${query}"`
    : savedOnly
      ? 'My Saved Suppliers'
      : filters.categories.length === 1
        ? `${filters.categories[0]} Suppliers`
        : 'All Suppliers';

  const selectedSupplier = selected && BUYER_SUPPLIERS.find((s) => s.id === selected.id);

  const contactModal = contactFor && (
    <ContactSupplierModal
      supplier={contactFor}
      onClose={() => setContactFor(null)}
      onViewContact={() => onNavigateToTab('contacts')}
      onRequestContact={() => onStartMessageWith(contactFor.id, contactFor.name)}
      onViewAllContacts={() => {
        setSelected({ id: contactFor.id, query: selected?.query ?? query, tab: 'contacts' });
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
          matchQuery={selected!.query}
          initialTab={selected!.tab}
          saved={savedIds.includes(selectedSupplier.id)}
          networkContacts={networkContacts}
          onUpdateNetworkContacts={onUpdateNetworkContacts}
          onBack={() => setSelected(null)}
          onToggleSave={() => toggleSave(selectedSupplier)}
          onContact={() => setContactFor(selectedSupplier)}
          onOpenSupplier={(id) => setSelected({ id, query: '', tab: 'overview' })}
          onRequestContact={() => onStartMessageWith(selectedSupplier.id, selectedSupplier.name)}
          onNotify={setToast}
        />
        {contactModal}
        {toastEl}
      </>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6 bg-white rounded-xl border border-slate-200 px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-[11px] font-semibold tracking-wider text-slate-500">SUPPLIERS</p>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight mt-1">Discover Construction Suppliers</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Search and evaluate suppliers, products, capabilities and verification information across the SOKO network.
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(input);
          }}
          role="search"
        >
          <label className="relative flex-1">
            <span className="sr-only">Search suppliers</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (!e.target.value) setQuery('');
              }}
              placeholder="Search supplier, product, brand, category or capability..."
              className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </label>
          <button type="submit" className="px-5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer">
            Search
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">Try:</span>
          {suggestions.map(({ query: q }) => (
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
      </header>

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
          <SupplierFiltersPanel filters={filters} onChange={setFilters} />
        </aside>

        <section className="flex-1 min-w-0 w-full" aria-label="Supplier results">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="min-w-0 flex items-baseline flex-wrap gap-x-3 gap-y-0.5">
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">{title}</h2>
              <p className="text-sm text-slate-500 whitespace-nowrap">
                {results.length} {results.length === 1 ? 'supplier' : 'suppliers'} found
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters{filterCount ? ` (${filterCount})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setSavedOnly((v) => !v)}
                aria-pressed={savedOnly}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                  savedOnly ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline">Saved</span> ({savedIds.length})
              </button>
              <label className="flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap">
                <span className="hidden sm:inline">Sort:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SupplierSort)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <p className="mt-1.5 mb-4 text-xs text-slate-400">
            Results are ordered by relevance and available SOKO information. No paid placements are included in these results.
          </p>

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
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

          {results.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-900">No suppliers match your search</p>
              <p className="text-sm text-slate-500 mt-1">Try a broader term such as a category or brand, or remove some filters.</p>
              <button type="button" onClick={clearAll} className="mt-4 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(({ supplier, match }) => (
                <SupplierResultCard
                  key={supplier.id}
                  supplier={supplier}
                  relevantProducts={match.relevantProducts}
                  saved={savedIds.includes(supplier.id)}
                  onView={() => setSelected({ id: supplier.id, query, tab: 'overview' })}
                  onViewProducts={() => setSelected({ id: supplier.id, query, tab: 'products' })}
                  onToggleSave={() => toggleSave(supplier)}
                  onContact={() => setContactFor(supplier)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-slate-900/40 cursor-default" />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Filters{filterCount > 0 && ` (${filterCount})`}</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close" className="p-1 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4">
              <SupplierFiltersPanel filters={filters} onChange={setFilters} />
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
              <button type="button" onClick={clearFilters} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer">
                Clear All
              </button>
              <button type="button" onClick={() => setDrawerOpen(false)} className="flex-1 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-semibold cursor-pointer">
                Show {results.length} suppliers
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
