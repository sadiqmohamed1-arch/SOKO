import React, { useMemo, useState } from 'react';
import { FolderTree, Tags, Settings2, GitPullRequestArrow, Copy, Search, ChevronRight } from 'lucide-react';
import { DASH, formatDate } from './companyShared';
import { type AdminProduct, type BrandNode, type CategoryNode, PRODUCT_STATUSES, PRODUCT_STATUS_BAR, PRODUCT_STATUS_LABELS, UNCATEGORISED } from './productShared';
import { ProductStatusBadge, ProductThumb } from './productBadges';
import { RestrictedNote } from './visitBadges';
import { SourceTag } from './userBadges';
import { BarList, DisabledButton, EmptyState, SectionCard } from './catalogUi';

type Source = 'live' | 'demo';

const ProductMiniList: React.FC<{ products: AdminProduct[]; onOpen: (id: string) => void; limit?: number }> = ({ products, onOpen, limit = 6 }) => (
  <ul className="flex flex-col divide-y divide-slate-100">
    {products.slice(0, limit).map((p) => (
      <li key={p.id}>
        <button type="button" onClick={() => onOpen(p.id)} aria-label={`View details for ${p.name}`} className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-50 cursor-pointer">
          <ProductThumb product={p} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-semibold text-slate-900">{p.name}</span>
            <span className="truncate text-[11px] text-slate-500">{p.supplierName ?? 'Supplier not visible'}</span>
          </span>
          <ProductStatusBadge status={p.status} />
        </button>
      </li>
    ))}
    {products.length > limit && <li className="pt-2 text-[11px] text-slate-500">+ {products.length - limit} more</li>}
  </ul>
);

const SelectableRow: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; label: string }> = ({ active, onClick, children, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer ${
      active ? 'border-blue-600 bg-blue-50/60' : 'border-transparent hover:bg-slate-50'
    }`}
  >
    {children}
    <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-blue-700' : 'text-slate-300'}`} aria-hidden="true" />
  </button>
);

export const CategoryManagement: React.FC<{ categories: CategoryNode[]; source: Source; isLive: boolean; loading: boolean; onOpenProduct: (id: string) => void }> = ({
  categories,
  source,
  isLive,
  loading,
  onOpenProduct,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const current = categories.find((c) => c.name === selected) ?? categories[0] ?? null;
  const usage = categories.map((c) => ({ key: c.name, label: c.name, value: c.products.length, bar: c.name === UNCATEGORISED ? 'bg-slate-400' : 'bg-blue-600' }));

  return (
    <div className="flex flex-col gap-4">
      <RestrictedNote>
        Categories are free-text fields on each product; there is no managed category table. The directory below is derived from {isLive ? 'the listings your session can read' : 'the demo listings'}.
      </RestrictedNote>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SectionCard title="Product Category Directory" description="Parent categories with their subcategories." source={<SourceTag source={source} />}>
            {loading ? (
              <div className="h-48 animate-pulse rounded-lg bg-slate-100" aria-busy="true" aria-label="Loading categories" />
            ) : categories.length === 0 ? (
              <EmptyState icon={FolderTree} title="No categories" body="Categories appear once listings with a category are visible." compact />
            ) : (
              <ul className="flex flex-col gap-1">
                {categories.map((c) => (
                  <li key={c.name}>
                    <SelectableRow active={current?.name === c.name} onClick={() => setSelected(c.name)} label={`Show details for ${c.name}`}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <FolderTree className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={`truncate text-xs font-semibold ${c.name === UNCATEGORISED ? 'italic text-slate-500' : 'text-slate-900'}`}>{c.name}</span>
                        <span className="truncate text-[11px] text-slate-500">
                          {c.subcategories.length > 0 ? c.subcategories.map((s) => s.name).join(', ') : 'No subcategories'}
                        </span>
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900">{c.products.length}</span>
                    </SelectableRow>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-3">
          <SectionCard
            title={current ? `Category Details: ${current.name}` : 'Category Details'}
            source={<DisabledButton icon={Settings2} label="Manage Category" />}
          >
            {!current ? (
              <EmptyState icon={FolderTree} title="Select a category" compact />
            ) : (
              <div className="flex flex-col gap-4">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Listings', current.products.length],
                    ['Suppliers', current.supplierIds.size],
                    ['Subcategories', current.subcategories.length],
                    ['Last updated', current.lastUpdated ? formatDate(current.lastUpdated) : DASH],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex flex-col gap-0.5 rounded-lg border border-slate-200 p-3">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                      <dd className="font-mono text-sm font-bold text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Subcategories</h4>
                    <BarList rows={current.subcategories.map((s) => ({ key: s.name, label: s.name, value: s.count, bar: 'bg-slate-700' }))} emptyText="No subcategories recorded." />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Listing status</h4>
                    <BarList
                      rows={PRODUCT_STATUSES.map((s) => ({ key: s, label: PRODUCT_STATUS_LABELS[s], value: current.byStatus[s], bar: PRODUCT_STATUS_BAR[s] })).filter((r) => r.value > 0)}
                      emptyText="No listings."
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Listings</h4>
                  <ProductMiniList products={current.products} onOpen={onOpenProduct} limit={5} />
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Category Usage Statistics" description="Listings per parent category." source={<SourceTag source={source} />}>
          <BarList rows={usage} emptyText={loading ? 'Loading\u2026' : 'No listings to analyse.'} />
        </SectionCard>
        <SectionCard title="Proposed Category Changes" description="Supplier or admin proposals to add, rename or merge categories." source={<SourceTag source="ui_only" />}>
          <EmptyState
            icon={GitPullRequestArrow}
            title="No change workflow yet"
            body="Category proposals need a taxonomy table and a review function. Until then, categories change only when suppliers edit their own listings."
            compact
          />
        </SectionCard>
      </div>
    </div>
  );
};

export const BrandManagement: React.FC<{ brands: BrandNode[]; unbrandedCount: number; source: Source; isLive: boolean; loading: boolean; onOpenProduct: (id: string) => void }> = ({
  brands,
  unbrandedCount,
  source,
  isLive,
  loading,
  onOpenProduct,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? brands.filter((b) => b.variants.some((v) => v.toLowerCase().includes(q))) : brands;
  }, [brands, query]);
  const current = brands.find((b) => b.key === selected) ?? visible[0] ?? null;
  const duplicates = brands.filter((b) => b.variants.length > 1);

  return (
    <div className="flex flex-col gap-4">
      <RestrictedNote>
        Brands are free-text fields on each product; there is no brand registry. Brands are grouped by a normalised name (case, punctuation and suffixes such as LLC are ignored), derived from {isLive ? 'the listings your session can read' : 'the demo listings'}.
      </RestrictedNote>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SectionCard title="Brand Directory" description={`${brands.length} brands${unbrandedCount > 0 ? ` \u2022 ${unbrandedCount} listings without a brand` : ''}`} source={<SourceTag source={source} />}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <label htmlFor="brand-search" className="sr-only">
                Search brands
              </label>
              <input
                id="brand-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brands"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>
            {loading ? (
              <div className="h-48 animate-pulse rounded-lg bg-slate-100" aria-busy="true" aria-label="Loading brands" />
            ) : visible.length === 0 ? (
              <EmptyState icon={Tags} title={brands.length === 0 ? 'No brands recorded' : 'No brands match'} compact />
            ) : (
              <ul className="flex flex-col gap-1">
                {visible.map((b) => (
                  <li key={b.key}>
                    <SelectableRow active={current?.key === b.key} onClick={() => setSelected(b.key)} label={`Show details for ${b.name}`}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">{b.name.slice(0, 2).toUpperCase()}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-900">
                          {b.name}
                          {b.variants.length > 1 && <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 text-[10px] font-semibold text-amber-700">{b.variants.length} spellings</span>}
                        </span>
                        <span className="truncate text-[11px] text-slate-500">
                          {b.suppliers.length} {b.suppliers.length === 1 ? 'supplier' : 'suppliers'}
                        </span>
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900">{b.products.length}</span>
                    </SelectableRow>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-3">
          <SectionCard title={current ? `Brand Details: ${current.name}` : 'Brand Details'} source={<DisabledButton icon={Settings2} label="Manage Brand" />}>
            {!current ? (
              <EmptyState icon={Tags} title="Select a brand" compact />
            ) : (
              <div className="flex flex-col gap-4">
                <dl className="flex flex-col">
                  <div className="flex flex-col gap-1 border-b border-slate-100 py-2.5 sm:flex-row sm:gap-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-36">Spellings in use</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {current.variants.map((v) => (
                        <span key={v} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {v}
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-36">Categories</dt>
                    <dd className="text-xs text-slate-900">{current.categories.join(', ')}</dd>
                  </div>
                </dl>
                <div className="flex flex-col gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Associated Suppliers</h4>
                  <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {current.suppliers.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                        <span className="truncate font-medium text-slate-900">{s.name ?? 'Supplier not visible'}</span>
                        <span className="whitespace-nowrap text-slate-500">
                          {s.count} {s.count === 1 ? 'listing' : 'listings'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Associated Products</h4>
                  <ProductMiniList products={current.products} onOpen={onOpenProduct} />
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Duplicate Brand Review" description="Brands entered with more than one spelling. Merging needs a brand registry and admin function." source={<SourceTag source={source} />}>
        {duplicates.length === 0 ? (
          <EmptyState icon={Copy} title="No duplicate spellings detected" compact />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {duplicates.map((b) => (
              <li key={b.key} className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{b.name}</span>
                  <span className="text-[11px] text-slate-500">{b.products.length} listings</span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {b.variants.map((v) => (
                    <span key={v} className="rounded-full border border-amber-200 bg-white px-2 py-0.5 font-mono text-[11px] text-amber-800">
                      {v}
                    </span>
                  ))}
                </span>
                <span className="self-start">
                  <DisabledButton icon={Copy} label="Merge Brands" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
};
