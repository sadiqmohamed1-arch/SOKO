import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ClipboardList,
  Image as ImageIcon,
  ListTree,
  Building2,
  FileBadge,
  History,
  Gauge,
  ShieldAlert,
  ClipboardCheck,
  Flag,
  EyeOff,
  RotateCcw,
  Package,
  Pencil,
  ArrowRightLeft,
  Plus,
  Trash2,
  CircleCheck,
  CircleAlert,
  type LucideIcon,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { type AdminCompany, DASH, VERIFICATION_TONE_CLASSES, formatDate, formatDateTime, verificationOf } from './companyShared';
import {
  type AdminProduct,
  type ProductEventKind,
  type ProductReport,
  QUALITY_ISSUE_LABELS,
  productCode,
  qualityIssues,
  qualityLevel,
} from './productShared';
import { ProductStatusBadge, ProductThumb, QualityBadge, ReportStatusBadge } from './productBadges';
import { RestrictedNote } from './visitBadges';
import { SourceTag, Unavailable } from './userBadges';
import { DisabledAction } from './catalogUi';

type DrawerSection = 'overview' | 'media' | 'specs' | 'supplier' | 'documents' | 'history' | 'intelligence' | 'governance';

const SECTIONS: { id: DrawerSection; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Product Overview', icon: ClipboardList },
  { id: 'media', label: 'Images & Media', icon: ImageIcon },
  { id: 'specs', label: 'Technical Specifications', icon: ListTree },
  { id: 'supplier', label: 'Supplier Information', icon: Building2 },
  { id: 'documents', label: 'Certifications & Documents', icon: FileBadge },
  { id: 'history', label: 'Listing History', icon: History },
  { id: 'intelligence', label: 'Intelligence Score', icon: Gauge },
  { id: 'governance', label: 'Governance & Moderation', icon: ShieldAlert },
];

const EVENT_META: Record<ProductEventKind, { icon: LucideIcon; tone: string }> = {
  created: { icon: Plus, tone: 'bg-blue-50 text-blue-700' },
  status: { icon: ArrowRightLeft, tone: 'bg-slate-100 text-slate-700' },
  updated: { icon: Pencil, tone: 'bg-slate-100 text-slate-600' },
  deleted: { icon: Trash2, tone: 'bg-rose-50 text-rose-700' },
};

interface ProductDetailsDrawerProps {
  product: AdminProduct;
  supplier: AdminCompany | undefined;
  /** Null when content reports could not be read. */
  reports: ProductReport[] | null;
  isLive: boolean;
  onClose: () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-44 sm:shrink-0">{label}</dt>
    <dd className="min-w-0 break-words text-sm text-slate-900">{children}</dd>
  </div>
);

const Panel: React.FC<{ title: string; source?: React.ReactNode; children: React.ReactNode }> = ({ title, source, children }) => (
  <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <header className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {source}
    </header>
    {children}
  </section>
);

const EmptyNote: React.FC<{ icon: LucideIcon; title: string; body: string }> = ({ icon: Icon, title, body }) => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
    <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="max-w-sm text-xs leading-relaxed text-slate-500 text-pretty">{body}</p>
  </div>
);

type SignedImages = { state: 'idle' | 'loading' | 'ready' | 'error'; urls: (string | null)[] };

// company-media is private. Published product images are readable by anyone; draft and archived
// images only by members of the owning company, so signing is attempted and failures are shown per image.
function useProductImages(product: AdminProduct, isLive: boolean): SignedImages {
  const [result, setResult] = useState<SignedImages>({ state: 'idle', urls: [] });
  useEffect(() => {
    if (!isLive) {
      setResult({ state: 'ready', urls: product.imagePaths.map((_, i) => (i === 0 ? product.thumbnailUrl : null)) });
      return;
    }
    if (product.imagePaths.length === 0) {
      setResult({ state: 'ready', urls: [] });
      return;
    }
    let cancelled = false;
    setResult({ state: 'loading', urls: [] });
    getSupabaseClient()
      .storage.from('company-media')
      .createSignedUrls(product.imagePaths, 600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setResult({ state: 'error', urls: [] });
        else setResult({ state: 'ready', urls: product.imagePaths.map((path) => data.find((d) => d.path === path)?.signedUrl ?? null) });
      });
    return () => {
      cancelled = true;
    };
  }, [product.id, product.imagePaths, product.thumbnailUrl, isLive]);
  return result;
}

export const ProductDetailsDrawer: React.FC<ProductDetailsDrawerProps> = ({ product, supplier, reports, isLive, onClose }) => {
  const [section, setSection] = useState<DrawerSection>('overview');
  const closeRef = useRef<HTMLButtonElement>(null);
  const source = isLive ? 'live' : 'demo';
  const code = productCode(product.id);
  const images = useProductImages(product, isLive);
  const issues = qualityIssues(product);
  const level = qualityLevel(product);
  const verification = supplier ? verificationOf(supplier, isLive) : null;
  const openReports = reports?.filter((r) => r.status === 'open') ?? [];

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setSection('overview');
  }, [product.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close product details" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-default" />
      <section role="dialog" aria-modal="true" aria-labelledby="product-details-title" className="relative flex h-full w-full max-w-4xl flex-col bg-slate-50 shadow-2xl">
        <header className="flex items-start gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <ProductThumb product={product} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Product listing {'\u2022'} {isLive ? 'Live record' : 'Demo record'}
            </span>
            <h2 id="product-details-title" className="truncate text-xl font-bold text-slate-900 text-balance">
              {product.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-slate-600">{code}</span>
              <ProductStatusBadge status={product.status} />
              <QualityBadge level={level} />
              {openReports.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  <Flag className="h-3 w-3" aria-hidden="true" />
                  {openReports.length} open {openReports.length === 1 ? 'report' : 'reports'}
                </span>
              )}
              <span className="text-[11px] text-slate-500">{product.supplierName ?? 'Supplier not visible'}</span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label="Product detail sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:w-60 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                    active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            {section === 'overview' && (
              <>
                <Panel title="Product Overview" source={<SourceTag source={source} />}>
                  <dl>
                    <Field label="Product ID">
                      <span className="font-mono text-xs">{code}</span>
                      <span className="block font-mono text-[11px] text-slate-400">{product.id}</span>
                    </Field>
                    <Field label="Product type">{product.type || DASH}</Field>
                    <Field label="Category">{product.category || <span className="text-slate-500">Not set</span>}</Field>
                    <Field label="Subcategory">{product.subcategory || DASH}</Field>
                    <Field label="Brand">{product.brand || <span className="text-slate-500">Not set</span>}</Field>
                    <Field label="Listing status">
                      <ProductStatusBadge status={product.status} />
                    </Field>
                    <Field label="Published">{product.publishedAt ? formatDateTime(product.publishedAt) : DASH}</Field>
                    <Field label="Service regions">
                      {product.regions === null ? (
                        <Unavailable reason="Product regions could not be read for this session." />
                      ) : product.regions.length === 0 ? (
                        <span className="text-slate-500">No regions listed</span>
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {product.regions.map((r) => (
                            <span key={r} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {r}
                            </span>
                          ))}
                        </span>
                      )}
                    </Field>
                    <Field label="Description">
                      {product.description ? <span className="leading-relaxed text-pretty">{product.description}</span> : <span className="text-slate-500">No description provided</span>}
                    </Field>
                  </dl>
                </Panel>
                <Panel title="Listing completeness" source={<SourceTag source={source} />}>
                  <p className="text-xs leading-relaxed text-slate-500">Checked against the fields stored on this listing. This is a completeness check, not a ranking score.</p>
                  <ul className="flex flex-col gap-1.5">
                    {(Object.keys(QUALITY_ISSUE_LABELS) as (keyof typeof QUALITY_ISSUE_LABELS)[]).map((k) => {
                      const missing = issues.includes(k);
                      const unknown = k === 'specs' && product.specs === null;
                      return (
                        <li key={k} className="flex items-center gap-2 text-xs">
                          {unknown ? (
                            <CircleAlert className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          ) : missing ? (
                            <CircleAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                          ) : (
                            <CircleCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                          )}
                          <span className={missing ? 'font-medium text-slate-900' : 'text-slate-500'}>
                            {unknown ? 'Specifications could not be read' : missing ? QUALITY_ISSUE_LABELS[k] : QUALITY_ISSUE_LABELS[k].replace(/ (missing or too short|not set)$/, ' provided').replace(/^No (.*)$/, '$1 provided')}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              </>
            )}

            {section === 'media' && (
              <Panel title="Images & Media" source={<SourceTag source={source} />}>
                {product.imagePaths.length === 0 ? (
                  <EmptyNote icon={ImageIcon} title="No images uploaded" body="The supplier has not attached any product images to this listing." />
                ) : (
                  <>
                    {images.state === 'error' && <RestrictedNote>Signed image URLs could not be created for this session. Storage paths are listed instead.</RestrictedNote>}
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {product.imagePaths.map((path, i) => {
                        const url = images.urls[i] ?? null;
                        return (
                          <li key={path} className="flex flex-col gap-1.5">
                            <span className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                              {images.state === 'loading' ? (
                                <span className="h-full w-full animate-pulse bg-slate-200" aria-label="Loading image" />
                              ) : url ? (
                                <img src={url} alt={`${product.name} image ${i + 1}`} className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex flex-col items-center gap-1 px-2 text-center text-[11px] text-slate-500">
                                  <Package className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                  Not viewable by your session
                                </span>
                              )}
                            </span>
                            <span className="truncate font-mono text-[10px] text-slate-400" title={path}>
                              {path.split('/').pop()}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[11px] text-slate-400">
                      {product.imagePaths.length} of 12 allowed images {'\u2022'} Stored in company-media/{'{company}'}/products
                    </p>
                  </>
                )}
              </Panel>
            )}

            {section === 'specs' && (
              <Panel title="Technical Specifications" source={product.specs ? <SourceTag source={source} /> : undefined}>
                {product.specs === null ? (
                  <Unavailable label="Specifications unavailable" reason="product_specs could not be read for this session." />
                ) : product.specs.length === 0 ? (
                  <EmptyNote icon={ListTree} title="No specifications listed" body="The supplier has not added any technical specifications to this listing." />
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th scope="col" className="px-3 py-2">Attribute</th>
                          <th scope="col" className="px-3 py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {product.specs.map((s) => (
                          <tr key={s.id}>
                            <td className="px-3 py-2 font-medium text-slate-600">{s.label}</td>
                            <td className="px-3 py-2 text-slate-900">{s.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            )}

            {section === 'supplier' && (
              <Panel title="Supplier Information" source={supplier ? <SourceTag source={source} /> : undefined}>
                {!supplier ? (
                  <EmptyNote icon={Building2} title="Supplier profile not visible" body="This supplier's company record is not readable by your session. Only the listing itself was returned." />
                ) : (
                  <dl>
                    <Field label="Company">{supplier.companyName}</Field>
                    <Field label="SOKO ID">{supplier.sokoId ? <span className="font-mono text-xs">{supplier.sokoId}</span> : DASH}</Field>
                    <Field label="Verification">
                      {verification && <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${VERIFICATION_TONE_CLASSES[verification.tone]}`}>{verification.label}</span>}
                    </Field>
                    <Field label="Location">{[supplier.emirate, supplier.country].filter(Boolean).join(', ') || supplier.location || DASH}</Field>
                    <Field label="Registered">{formatDate(supplier.registeredDate)}</Field>
                  </dl>
                )}
              </Panel>
            )}

            {section === 'documents' && (
              <Panel title="Certifications & Documents" source={<SourceTag source="ui_only" />}>
                <EmptyNote
                  icon={FileBadge}
                  title="Not linked to products"
                  body="Company documents are stored per company and are not associated with individual product listings in the current schema. Product-level certificates (e.g. test reports, conformity certificates) need a product-document link before they can be shown here."
                />
              </Panel>
            )}

            {section === 'history' && (
              <Panel title="Listing History" source={product.history ? <SourceTag source={source} /> : undefined}>
                {product.history === null ? (
                  <>
                    <RestrictedNote>The audit log could not be read, so only timestamps stored on the listing are shown.</RestrictedNote>
                    <dl>
                      <Field label="Created">{formatDateTime(product.createdAt)}</Field>
                      <Field label="Last updated">{formatDateTime(product.updatedAt)}</Field>
                      <Field label="Published">{product.publishedAt ? formatDateTime(product.publishedAt) : DASH}</Field>
                    </dl>
                  </>
                ) : product.history.length === 0 ? (
                  <EmptyNote icon={History} title="No audit entries" body="No changes to this listing have been recorded in the audit log." />
                ) : (
                  <ol className="flex flex-col">
                    {product.history.map((e, i, list) => {
                      const meta = EVENT_META[e.kind];
                      const Icon = meta.icon;
                      return (
                        <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                          {i < list.length - 1 && <span className="absolute left-4 top-8 h-[calc(100%-1.5rem)] w-px bg-slate-200" aria-hidden="true" />}
                          <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5 pt-1">
                            <span className="text-xs font-semibold text-slate-900">{e.summary}</span>
                            <span className="text-[11px] text-slate-400">
                              {formatDateTime(e.at)} {'\u2022'} Audit log
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Panel>
            )}

            {section === 'intelligence' && (
              <Panel title="Intelligence Score" source={<SourceTag source="ui_only" />}>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
                  <Gauge className="h-6 w-6 text-slate-400" aria-hidden="true" />
                  <p className="font-mono text-3xl font-bold text-slate-300">{DASH}</p>
                  <p className="text-sm font-semibold text-slate-700">Score unavailable</p>
                  <p className="max-w-sm text-xs leading-relaxed text-slate-500 text-pretty">
                    No product intelligence score is computed in the current schema. Engagement metrics are aggregated per supplier company, not per listing, and raw product views are never readable by clients.
                  </p>
                </div>
              </Panel>
            )}

            {section === 'governance' && (
              <>
                <Panel title="Reports on this listing" source={reports ? <SourceTag source={source} /> : undefined}>
                  {reports === null ? (
                    <Unavailable label="Reports unavailable" reason="content_reports could not be read for this session." />
                  ) : reports.length === 0 ? (
                    <EmptyNote icon={Flag} title="No reports" body="No user has reported this listing." />
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {reports.map((r) => (
                        <li key={r.id} className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-3">
                          <span className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <ReportStatusBadge status={r.status} />
                            Reported {formatDateTime(r.createdAt)}
                            {r.handledAt && <span>{'\u2022'} Handled {formatDate(r.handledAt)}</span>}
                          </span>
                          <p className="text-sm leading-relaxed text-slate-800 text-pretty">{r.reason}</p>
                          {r.resolution && <p className="text-xs text-slate-500">Resolution: {r.resolution}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel title="Audit information" source={<SourceTag source={source} />}>
                  <dl>
                    <Field label="Created">{formatDateTime(product.createdAt)}</Field>
                    <Field label="Last updated">{formatDateTime(product.updatedAt)}</Field>
                    <Field label="Audit entries">{product.history === null ? <Unavailable reason="The audit log could not be read for this listing." /> : `${product.history.length} recorded`}</Field>
                  </dl>
                </Panel>
                <Panel title="Administrative actions" source={<SourceTag source="ui_only" />}>
                  <RestrictedNote>
                    Listings can only be changed by members of the supplier company with <span className="font-mono">products.manage</span>. There is no platform-admin moderation function for products yet, so these controls stay disabled.
                  </RestrictedNote>
                  <div className="flex flex-col gap-2">
                    <DisabledAction icon={ClipboardCheck} label="Review Product" description="Record a platform review of this listing's accuracy and completeness." />
                    <DisabledAction icon={Flag} label="Flag Product" description="Flag the listing for supplier follow-up without hiding it." />
                    <DisabledAction icon={EyeOff} label="Hide Listing" description="Remove the listing from public search and supplier profiles." tone="danger" />
                    <DisabledAction icon={RotateCcw} label="Restore Listing" description="Return a hidden listing to public visibility." />
                  </div>
                </Panel>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
