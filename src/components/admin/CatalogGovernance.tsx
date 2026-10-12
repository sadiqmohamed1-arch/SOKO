import React from 'react';
import { Flag, Copy, FileWarning, ClipboardCheck, History, ArrowRightLeft } from 'lucide-react';
import { formatDate, formatDateTime } from './companyShared';
import {
  type AdminProduct,
  type DuplicateGroup,
  type ProductReport,
  type QualityLevel,
  QUALITY_ISSUE_LABELS,
  QUALITY_LABELS,
  productCode,
  qualityIssues,
  qualityLevel,
} from './productShared';
import { ProductThumb, QualityBadge, ReportStatusBadge } from './productBadges';
import { RestrictedNote } from './visitBadges';
import { SourceTag, Unavailable } from './userBadges';
import { BarList, EmptyState, SectionCard } from './catalogUi';

interface CatalogGovernanceProps {
  products: AdminProduct[];
  reports: ProductReport[] | null;
  duplicates: DuplicateGroup[];
  source: 'live' | 'demo';
  isLive: boolean;
  onOpenProduct: (id: string) => void;
}

const QUALITY_BAR: Record<QualityLevel, string> = {
  complete: 'bg-emerald-600',
  attention: 'bg-amber-500',
  incomplete: 'bg-rose-500',
};

export const CatalogGovernance: React.FC<CatalogGovernanceProps> = ({ products, reports, duplicates, source, isLive, onOpenProduct }) => {
  const byId = new Map(products.map((p) => [p.id, p]));
  const openReports = reports?.filter((r) => r.status === 'open') ?? [];
  const resolvedReports = reports?.filter((r) => r.status !== 'open') ?? [];
  const missing = products
    .filter((p) => p.status !== 'archived')
    .map((p) => ({ product: p, issues: qualityIssues(p) }))
    .filter((m) => m.issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length);
  const levels: QualityLevel[] = ['complete', 'attention', 'incomplete'];
  const qualityRows = levels.map((l) => ({ key: l, label: QUALITY_LABELS[l], value: products.filter((p) => p.status !== 'archived' && qualityLevel(p) === l).length, bar: QUALITY_BAR[l] }));
  const issueRows = (Object.keys(QUALITY_ISSUE_LABELS) as (keyof typeof QUALITY_ISSUE_LABELS)[])
    .map((k) => ({ key: k, label: QUALITY_ISSUE_LABELS[k], value: missing.filter((m) => m.issues.includes(k)).length, bar: 'bg-slate-700' }))
    .filter((r) => r.value > 0);
  const archivedEvents = products
    .flatMap((p) => (p.history ?? []).filter((e) => e.kind === 'status' || e.kind === 'deleted').map((e) => ({ ...e, product: p })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const ProductLine: React.FC<{ product: AdminProduct | undefined; productId: string; trailing?: React.ReactNode }> = ({ product, productId, trailing }) =>
    product ? (
      <button type="button" onClick={() => onOpenProduct(product.id)} aria-label={`View details for ${product.name}`} className="flex w-full items-center gap-3 text-left hover:opacity-80 cursor-pointer">
        <ProductThumb product={product} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-semibold text-slate-900">{product.name}</span>
          <span className="truncate text-[11px] text-slate-500">{product.supplierName ?? 'Supplier not visible'}</span>
        </span>
        {trailing}
      </button>
    ) : (
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
          <Flag className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-mono text-xs font-semibold text-slate-700">{productCode(productId)}</span>
          <span className="text-[11px] text-slate-500">Listing not readable by your session (draft, archived or private supplier)</span>
        </span>
      </span>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Reported Listings" description="Open user reports on product listings." source={reports ? <SourceTag source={source} /> : undefined}>
          {reports === null ? (
            <Unavailable label="Reports unavailable" reason="content_reports could not be read for this session." />
          ) : openReports.length === 0 ? (
            <EmptyState icon={Flag} title="No open reports" compact />
          ) : (
            <ul className="flex flex-col gap-3">
              {openReports.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
                  <ProductLine product={byId.get(r.productId)} productId={r.productId} trailing={<ReportStatusBadge status={r.status} />} />
                  <p className="text-xs leading-relaxed text-slate-700 text-pretty">{r.reason}</p>
                  <span className="text-[11px] text-slate-400">Reported {formatDateTime(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Duplicate Products" description="Active listings sharing the same normalised name and brand." source={<SourceTag source={source} />}>
          {duplicates.length === 0 ? (
            <EmptyState icon={Copy} title="No duplicates detected" compact />
          ) : (
            <ul className="flex flex-col gap-3">
              {duplicates.map((g) => (
                <li key={g.key} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
                  <span
                    className={`self-start rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      g.scope === 'same-supplier' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {g.scope === 'same-supplier' ? 'Likely duplicate \u2022 same supplier' : 'Same product \u2022 different suppliers'}
                  </span>
                  <ul className="flex flex-col gap-2">
                    {g.products.map((p) => (
                      <li key={p.id}>
                        <ProductLine product={p} productId={p.id} trailing={<span className="whitespace-nowrap text-[11px] text-slate-500">{formatDate(p.updatedAt)}</span>} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard title="Missing Product Information" description="Active listings with at least one completeness gap." source={<SourceTag source={source} />}>
            {missing.length === 0 ? (
              <EmptyState icon={FileWarning} title="All active listings are complete" compact />
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {missing.map(({ product, issues }) => (
                  <li key={product.id} className="flex flex-col gap-1.5 py-2.5">
                    <ProductLine product={product} productId={product.id} trailing={<QualityBadge level={qualityLevel(product)} />} />
                    <span className="flex flex-wrap gap-1.5 pl-13">
                      {issues.map((i) => (
                        <span key={i} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {QUALITY_ISSUE_LABELS[i]}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SectionCard title="Product Quality Review" description="Completeness across active listings." source={<SourceTag source={source} />}>
            <BarList rows={qualityRows} emptyText="No listings." />
            {issueRows.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Most common gaps</h4>
                <BarList rows={issueRows} emptyText="" />
              </div>
            )}
          </SectionCard>
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
            <ClipboardCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            Completeness is derived from listing fields only. No review status is stored for products yet.
          </p>
        </div>
      </div>

      <SectionCard title="Moderation History" description="Resolved reports and listing status changes." source={<SourceTag source={source} />}>
        {isLive && <RestrictedNote>Status changes come from audit_log for listings your session can read. Resolved reports are platform-wide.</RestrictedNote>}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Resolved reports</h4>
            {reports === null ? (
              <Unavailable reason="content_reports could not be read for this session." />
            ) : resolvedReports.length === 0 ? (
              <p className="text-xs text-slate-500">No resolved reports.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {resolvedReports.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-3">
                    <ProductLine product={byId.get(r.productId)} productId={r.productId} trailing={<ReportStatusBadge status={r.status} />} />
                    {r.resolution && <p className="text-xs text-slate-600">{r.resolution}</p>}
                    <span className="text-[11px] text-slate-400">Handled {r.handledAt ? formatDateTime(r.handledAt) : '\u2014'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status changes</h4>
            {archivedEvents.length === 0 ? (
              <p className="text-xs text-slate-500">{products.some((p) => p.history === null) ? 'The audit log could not be read.' : 'No status changes recorded.'}</p>
            ) : (
              <ol className="flex flex-col divide-y divide-slate-100">
                {archivedEvents.map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      {e.kind === 'deleted' ? <History className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <button type="button" onClick={() => onOpenProduct(e.product.id)} className="truncate text-left text-xs font-semibold text-slate-900 hover:text-blue-700 cursor-pointer">
                        {e.product.name}
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {e.summary} {'\u2022'} {formatDateTime(e.at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
