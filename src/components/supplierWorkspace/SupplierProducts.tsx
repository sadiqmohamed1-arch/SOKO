import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { CompanyProduct, TIER_CONFIG } from '../../data/supplierTypes';
import { deleteProduct, setProductStatus } from '../../data/supplierService';
import { ConfirmDialog, StatusPill, btnPrimary, btnSecondary, iconBtn, inputCls } from '../NetworkShared';
import { DemoNote, EmptyState, KpiCard, SubTabs, daysAgo } from '../marketHub/MarketHubShared';
import { Meter, NoPermission, PageHeader, SW, completenessOf, missingOf } from './SupplierShared';
import { ProductEditorDialog } from './ProductEditorDialog';

type Filter = 'all' | 'active' | 'draft' | 'inactive' | 'incomplete';

const STATUS: Record<CompanyProduct['status'], { label: string; tone: 'blue' | 'slate' | 'amber' }> = {
  active: { label: 'Listed', tone: 'blue' },
  draft: { label: 'Draft', tone: 'amber' },
  inactive: { label: 'Deactivated', tone: 'slate' },
};

export const SupplierProducts: React.FC<{ sw: SW }> = ({ sw }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [collection, setCollection] = useState('');
  const [editing, setEditing] = useState<CompanyProduct | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CompanyProduct | null>(null);
  const { products } = sw;
  const manage = sw.can('products.manage');
  const tier = TIER_CONFIG[sw.company.tier];
  const collections = useMemo(() => [...new Set(products.map((p) => p.collection).filter(Boolean))], [products]);

  const list = products.filter((p) => {
    if (filter === 'incomplete' ? completenessOf(p) >= 60 : filter !== 'all' && p.status !== filter) return false;
    if (collection && p.collection !== collection) return false;
    const t = q.trim().toLowerCase();
    return !t || `${p.name} ${p.brand} ${p.category} ${p.type}`.toLowerCase().includes(t);
  });

  const totalViews = products.reduce((n, p) => n + p.views, 0);
  const totalEnquiries = products.reduce((n, p) => n + p.enquiries, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Products & Services"
        title="Your product listings"
        subtitle="Listed products appear on your public profile and in SOKO Product Discovery. Buyers contact you directly — there is no cart or checkout."
        actions={
          manage ? (
            <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
              <Plus className="w-4 h-4" /> Add product
            </button>
          ) : undefined
        }
      />
      {!manage && <div className="mb-4"><NoPermission text="Your role can view products but not edit them." /></div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Listed" value={products.filter((p) => p.status === 'active').length} hint={`of ${tier.listingLimit} on ${tier.label}`} />
        <KpiCard label="Drafts & deactivated" value={products.filter((p) => p.status !== 'active').length} />
        <KpiCard label="Need information" value={products.filter((p) => completenessOf(p) < 60).length} hint="Under 60% complete" />
        {sw.premium ? <KpiCard label="Views · enquiries" value={`${totalViews.toLocaleString()} · ${totalEnquiries}`} hint="Engagement analytics (demo)" /> : <KpiCard label="Product views" value={totalViews.toLocaleString()} hint="Demo data" />}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between mb-4">
        <SubTabs
          tabs={[
            { id: 'all' as Filter, label: 'All', count: products.length },
            { id: 'active' as Filter, label: 'Listed' },
            { id: 'draft' as Filter, label: 'Drafts' },
            { id: 'inactive' as Filter, label: 'Deactivated' },
            { id: 'incomplete' as Filter, label: 'Missing info' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div className="flex gap-2">
          {sw.premium && collections.length > 0 && (
            <select aria-label="Catalogue collection" value={collection} onChange={(e) => setCollection(e.target.value)} className={`${inputCls} w-44`}>
              <option value="">All collections</option>
              {collections.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className={`${inputCls} pl-9`} />
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Package className="w-5 h-5" />} title="No products match" text="Try another filter, or add a new product listing." action={manage ? <button type="button" onClick={() => setEditing('new')} className={btnSecondary}>Add product</button> : undefined} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-3 py-3 font-semibold">Category</th>
                <th className="px-3 py-3 font-semibold">Brand</th>
                <th className="px-3 py-3 font-semibold">Listing Status</th>
                <th className="px-3 py-3 font-semibold w-36">Completeness</th>
                <th className="px-3 py-3 font-semibold text-right">Views</th>
                <th className="px-3 py-3 font-semibold">Last Updated</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((p) => {
                const pct = completenessOf(p);
                const missing = missingOf(p);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images[0]} alt="" className="w-10 h-10 rounded-md object-cover bg-slate-100 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate max-w-[220px]">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[220px]">
                            {p.type}
                            {sw.premium && p.variations.length > 0 && ` · ${p.variations.length} variations`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {p.category}
                      {p.subcategory && <span className="block text-xs text-slate-500">{p.subcategory}</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{p.brand}</td>
                    <td className="px-3 py-3"><StatusPill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</StatusPill></td>
                    <td className="px-3 py-3" title={missing.length ? `Missing: ${missing.join(', ')}` : 'Complete'}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><Meter value={pct} tone={pct >= 80 ? 'green' : pct >= 60 ? 'blue' : 'amber'} /></div>
                        <span className="text-xs tabular-nums text-slate-600 w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-700">{p.views.toLocaleString()}</td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{daysAgo(p.updatedAt)}</td>
                    <td className="px-4 py-3">
                      {manage ? (
                        <div className="flex justify-end gap-1">
                          <button type="button" aria-label="Edit" title="Edit" onClick={() => setEditing(p)} className={iconBtn}><Pencil className="w-4 h-4" /></button>
                          <button
                            type="button"
                            aria-label={p.status === 'active' ? 'Deactivate' : 'Activate'}
                            title={p.status === 'active' ? 'Deactivate' : 'Activate'}
                            onClick={() => sw.run(setProductStatus(sw.ctx, p.id, p.status === 'active' ? 'inactive' : 'active'), p.status === 'active' ? 'Listing deactivated — hidden from buyers' : 'Listing activated')}
                            className={iconBtn}
                          >
                            {p.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {sw.can('records.delete') && (
                            <button type="button" aria-label="Delete" title="Delete" onClick={() => setDeleting(p)} className={iconBtn}><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-slate-400">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3"><DemoNote>View counts are simulated demo data.</DemoNote></div>

      {editing && <ProductEditorDialog sw={sw} product={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete product?"
          message={`"${deleting.name}" will be removed from your profile and Product Discovery. Deactivating keeps it for later instead.`}
          confirmLabel="Delete product"
          onConfirm={() => {
            sw.run(deleteProduct(sw.ctx, deleting.id), 'Product deleted');
            setDeleting(null);
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
};
