import React, { useMemo } from 'react';
import {
  ArrowUpRight, Boxes, CircleAlert, FileWarning, Handshake, Info, Layers, Lightbulb, Network, ShieldCheck,
} from 'lucide-react';
import { marketSnapshot } from '../../data/supplierMarket';
import { VendorApprovalStatus, VendorComplianceDoc, VendorRecord } from '../../data/supplierTypes';
import { fmtDate } from '../marketHub/MarketHubShared';
import {
  SokoEmptyState, SokoKpiCell, SokoPanel, SokoPanelLink, SokoStatusIndicator, SokoStatusTone, sokoCard, sokoTokens,
} from '../sokoDesignSystem/SokoComponents';
import { SW } from './SupplierShared';

const DAY = 86400000;
const EXPIRY_WINDOW_DAYS = 60;
const daysUntil = (iso?: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : undefined);

const APPROVAL_ORDER: VendorApprovalStatus[] = ['approved', 'conditionally-approved', 'under-review', 'not-reviewed', 'rejected', 'suspended'];
const APPROVAL_META: Record<VendorApprovalStatus, { label: string; bar: string; tone: SokoStatusTone }> = {
  'approved': { label: 'Approved', bar: 'bg-emerald-500', tone: 'success' },
  'conditionally-approved': { label: 'Conditional', bar: 'bg-amber-400', tone: 'warning' },
  'under-review': { label: 'Under review', bar: 'bg-blue-500', tone: 'info' },
  'not-reviewed': { label: 'Not reviewed', bar: 'bg-slate-300', tone: 'neutral' },
  'rejected': { label: 'Rejected', bar: 'bg-rose-500', tone: 'critical' },
  'suspended': { label: 'Suspended', bar: 'bg-slate-600', tone: 'critical' },
};

type VendorCompliance = 'action' | 'review' | 'complete' | 'untracked';
const COMPLIANCE_META: Record<VendorCompliance, { label: string; tone: SokoStatusTone }> = {
  action: { label: 'Action needed', tone: 'critical' },
  review: { label: 'In review', tone: 'warning' },
  complete: { label: 'Complete', tone: 'success' },
  untracked: { label: 'No requirements tracked', tone: 'neutral' },
};

const isExpired = (d: VendorComplianceDoc) => { const n = daysUntil(d.expiryDate); return n !== undefined && n < 0; };
const isExpiring = (d: VendorComplianceDoc) => { const n = daysUntil(d.expiryDate); return n !== undefined && n >= 0 && n <= EXPIRY_WINDOW_DAYS; };

const complianceOf = (docs: VendorComplianceDoc[]): VendorCompliance => {
  if (docs.length === 0) return 'untracked';
  if (docs.some((d) => d.status === 'missing' || d.status === 'rejected' || isExpired(d))) return 'action';
  if (docs.some((d) => d.status === 'submitted' || d.status === 'under-review')) return 'review';
  return 'complete';
};

const missingFieldsOf = (v: VendorRecord) => {
  const missing: string[] = [];
  if (!v.contactPerson?.trim()) missing.push('contact person');
  if (!v.contactEmail?.trim()) missing.push('email');
  if (!v.contactPhone?.trim()) missing.push('phone');
  if (!v.location?.trim()) missing.push('location');
  if (!v.tradeCategory?.trim()) missing.push('trade category');
  return missing;
};

const plural = (n: number, word: string) =>
  `${n} ${n === 1 ? word : /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`}`;

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="flex flex-col gap-1 min-w-0">
    <dt className="text-xs text-slate-500 truncate">{label}</dt>
    <dd className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</dd>
  </div>
);

const SourceNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
    <Info className="w-3 h-3 mt-0.5 shrink-0" aria-hidden />
    <span>{children}</span>
  </p>
);

const SubHeading: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
  <div className="flex items-center justify-between gap-2 mb-2.5">
    <h3 className={sokoTokens.eyebrow}>{children}</h3>
    {aside}
  </div>
);

interface Insight {
  id: string;
  severity: SokoStatusTone;
  title: string;
  why: string;
  action: string;
  tab: string;
}

export const ContractorIntelligence: React.FC<{ sw: SW }> = ({ sw }) => {
  const { store, company } = sw;
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);

  const data = useMemo(() => {
    const vendors = store.vendorRecords.filter((v) => v.companyId === company.id);
    const linked = vendors.filter((v) => v.supplierCompanyId);
    const external = vendors.filter((v) => !v.supplierCompanyId);
    const sokoVerified = vendors.filter((v) => v.sokoVerified);

    const approval = Object.fromEntries(APPROVAL_ORDER.map((s) => [s, 0])) as Record<VendorApprovalStatus, number>;
    vendors.forEach((v) => { approval[v.approvalStatus]++; });
    const requiringReview = approval['not-reviewed'] + approval['under-review'] + approval['conditionally-approved'];

    const categoryCounts = new Map<string, number>();
    vendors.forEach((v) => { if (v.tradeCategory) categoryCounts.set(v.tradeCategory, (categoryCounts.get(v.tradeCategory) ?? 0) + 1); });
    const categories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const singleSource = categories.filter(([, n]) => n === 1).map(([c]) => c);

    const incomplete = vendors.map((v) => ({ vendor: v, missing: missingFieldsOf(v) })).filter((x) => x.missing.length > 0);

    const docs = store.vendorComplianceDocs.filter((d) => d.companyId === company.id);
    const awaitingReview = docs.filter((d) => d.status === 'submitted' || d.status === 'under-review');
    const missingDocs = docs.filter((d) => d.status === 'missing');
    const rejectedDocs = docs.filter((d) => d.status === 'rejected');
    const expiredDocs = docs.filter(isExpired);
    const expiringDocs = docs.filter(isExpiring).sort((a, b) => (daysUntil(a.expiryDate) ?? 0) - (daysUntil(b.expiryDate) ?? 0));
    const complianceIssues = missingDocs.length + expiredDocs.filter((d) => d.status !== 'missing').length + rejectedDocs.length;

    const vendorCompliance = vendors.map((v) => {
      const vDocs = docs.filter((d) => d.vendorId === v.id);
      return {
        vendor: v,
        docs: vDocs,
        status: complianceOf(vDocs),
        missing: vDocs.filter((d) => d.status === 'missing').length,
        pending: vDocs.filter((d) => d.status === 'submitted' || d.status === 'under-review').length,
        expiring: vDocs.filter(isExpiring).length,
      };
    });
    const complianceRank: Record<VendorCompliance, number> = { action: 0, review: 1, untracked: 2, complete: 3 };
    vendorCompliance.sort((a, b) => complianceRank[a.status] - complianceRank[b.status] || a.vendor.supplierName.localeCompare(b.vendor.supplierName));

    const visits = store.visits.filter((v) => v.companyId === company.id || v.hostCompanyId === company.id);
    const upcoming = visits.filter((v) => (v.status === 'scheduled' || v.status === 'pending-confirmation') && new Date(v.date).getTime() >= Date.now() - DAY);
    const pendingConfirmation = visits.filter((v) => v.status === 'pending-confirmation');
    const completed = visits.filter((v) => v.status === 'completed');
    const recentVisits = [...visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    const openTasks = store.visitTasks.filter((t) => t.companyId === company.id && t.side === 'contractor' && t.status !== 'completed');
    const contacts = store.contacts.filter((c) => c.companyId === company.id);
    const contactCompanies = new Set(contacts.map((c) => c.company)).size;
    const linkedNoContact = linked.filter((v) => !contacts.some((c) => c.sourceCompanyId === v.supplierCompanyId || c.company === v.supplierName));

    const linkedIds = new Set(linked.map((v) => v.supplierCompanyId!));
    const linkedProducts = store.products.filter((p) => p.status === 'active' && linkedIds.has(p.companyId));
    const productCategoryCounts = new Map<string, number>();
    linkedProducts.forEach((p) => productCategoryCounts.set(p.category, (productCategoryCounts.get(p.category) ?? 0) + 1));
    const productCategories = [...productCategoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    const suppliersWithProducts = new Set(linkedProducts.map((p) => p.companyId));
    const linkedWithoutProducts = linked.filter((v) => !suppliersWithProducts.has(v.supplierCompanyId!));
    const tradeWithoutProducts = categories
      .map(([cat]) => cat)
      .filter((cat) => !linked.some((v) => v.tradeCategory === cat && suppliersWithProducts.has(v.supplierCompanyId!)));
    const savedProducts = store.savedProducts.filter((s) => s.companyId === company.id).length;

    return {
      vendors, linked, external, sokoVerified, approval, requiringReview, categories, singleSource, incomplete,
      docs, awaitingReview, missingDocs, rejectedDocs, expiredDocs, expiringDocs, complianceIssues, vendorCompliance,
      visits, upcoming, pendingConfirmation, completed, recentVisits, openTasks, contacts, contactCompanies, linkedNoContact,
      linkedProducts, productCategories, linkedWithoutProducts, tradeWithoutProducts, savedProducts,
    };
  }, [store, company.id]);

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    if (data.missingDocs.length > 0) {
      const vendorCount = new Set(data.missingDocs.map((d) => d.vendorId)).size;
      list.push({ id: 'missing', severity: 'critical', title: `Request ${plural(data.missingDocs.length, 'missing document')}`, why: `${plural(vendorCount, 'vendor')} ${vendorCount === 1 ? 'has' : 'have'} required documents marked Missing in the compliance register.`, action: 'Open compliance reviews', tab: 'sw-documents' });
    }
    if (data.expiredDocs.length > 0) {
      list.push({ id: 'expired', severity: 'critical', title: `Renew ${plural(data.expiredDocs.length, 'expired document')}`, why: 'Expiry date on these compliance records is in the past.', action: 'Open compliance reviews', tab: 'sw-documents' });
    }
    if (data.awaitingReview.length > 0) {
      list.push({ id: 'review-docs', severity: 'warning', title: `Review ${plural(data.awaitingReview.length, 'submitted document')}`, why: 'Documents are Submitted or Under Review and need a GEC reviewer decision.', action: 'Open review queue', tab: 'sw-documents' });
    }
    if (data.requiringReview > 0) {
      list.push({ id: 'vendors', severity: 'warning', title: `Complete approval for ${plural(data.requiringReview, 'vendor')}`, why: 'Internal approval is Not Reviewed, Under Review or Conditionally Approved.', action: 'Open vendor directory', tab: 'sw-vendors' });
    }
    if (data.expiringDocs.length > 0) {
      list.push({ id: 'expiring', severity: 'warning', title: `${plural(data.expiringDocs.length, 'document')} expire within ${EXPIRY_WINDOW_DAYS} days`, why: `Earliest expiry: ${data.expiringDocs[0].documentType} for ${data.expiringDocs[0].supplierName} on ${fmtDate(data.expiringDocs[0].expiryDate!)}.`, action: 'Plan renewals', tab: 'sw-documents' });
    }
    if (data.pendingConfirmation.length > 0) {
      list.push({ id: 'visits', severity: 'info', title: `Confirm ${plural(data.pendingConfirmation.length, 'supplier visit')}`, why: 'Visit requests are still Pending Confirmation.', action: 'Open visits', tab: 'sw-visits' });
    }
    if (data.openTasks.length > 0) {
      list.push({ id: 'tasks', severity: 'info', title: `Close ${plural(data.openTasks.length, 'visit follow-up')}`, why: 'Follow-up tasks assigned to your side after supplier visits are not completed.', action: 'Open visits', tab: 'sw-visits' });
    }
    if (data.incomplete.length > 0) {
      list.push({ id: 'incomplete', severity: 'info', title: `Complete ${plural(data.incomplete.length, 'vendor record')}`, why: 'These vendor records are missing a contact person, email, phone, location or trade category.', action: 'Open vendor directory', tab: 'sw-vendors' });
    }
    if (data.singleSource.length > 0) {
      list.push({ id: 'single', severity: 'neutral', title: `Single-source categories: ${data.singleSource.slice(0, 3).join(', ')}${data.singleSource.length > 3 ? ` +${data.singleSource.length - 3}` : ''}`, why: 'Only one vendor in your register covers each of these trade categories.', action: 'Discover suppliers', tab: 'sw-products' });
    }
    return list;
  }, [data]);

  const vendorCount = data.vendors.length;
  const linkedShare = vendorCount ? Math.round((data.linked.length / vendorCount) * 100) : 0;
  const maxCategory = data.categories[0]?.[1] ?? 1;
  const maxProductCategory = data.productCategories[0]?.[1] ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={sokoTokens.eyebrow}>Contractor workspace · Intelligence</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 text-balance">Contractor Intelligence</h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-2xl text-pretty">
            What needs attention across {company.profile.tradingName}&apos;s vendor network, calculated from your vendor register, compliance records, visits, contacts and linked supplier catalogues.
          </p>
        </div>
      </header>

      <section aria-label="Intelligence overview" className={`${sokoCard} grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-slate-100 overflow-hidden`}>
        {[
          <SokoKpiCell key="total" label="Total vendors" value={vendorCount} detail={`${plural(data.categories.length, 'trade category')}`} onClick={() => sw.go('sw-vendors')} />,
          <SokoKpiCell key="linked" label="SOKO-linked" value={data.linked.length} detail={`${linkedShare}% of register`} onClick={() => sw.go('sw-vendors')} hint="Vendors connected to a company on SOKO. External vendors exist only in your register." />,
          <SokoKpiCell key="approved" label="GEC approved" value={data.approval.approved} detail={`${data.approval['conditionally-approved']} conditional`} onClick={() => sw.go('sw-vendors')} hint="Your internal vendor approval. This is separate from SOKO verification." />,
          <SokoKpiCell key="review" label="Requiring review" value={data.requiringReview} detail="Not reviewed, in review or conditional" delta={data.requiringReview > 0 ? { label: 'Open', tone: 'warn' } : undefined} onClick={() => sw.go('sw-vendors')} />,
          <SokoKpiCell key="issues" label="Document issues" value={data.complianceIssues} detail={`${data.missingDocs.length} missing · ${data.expiredDocs.length} expired`} delta={data.complianceIssues > 0 ? { label: 'Action', tone: 'down' } : undefined} onClick={() => sw.go('sw-documents')} hint="Compliance records that are Missing, Rejected or past their expiry date." />,
          <SokoKpiCell key="activity" label="Supplier visits" value={data.upcoming.length} detail={`Upcoming · ${data.completed.length} completed`} onClick={() => sw.go('sw-visits')} hint="Scheduled or pending visits from today onward, from shared visit records." />,
        ].map((cell) => <div key={cell.key} className="bg-white">{cell}</div>)}
      </section>

      <section aria-labelledby="ci-actions" className={`${sokoCard} overflow-hidden`}>
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0"><Lightbulb className="w-4 h-4" aria-hidden /></span>
            <div>
              <h2 id="ci-actions" className="text-[15px] font-semibold text-slate-900 leading-tight">Actionable insights</h2>
              <p className="mt-1 text-xs text-slate-500">Rule-based priorities from your current records. Each shows why it appears.</p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-500 tabular-nums whitespace-nowrap">{plural(insights.length, 'item')}</span>
        </header>
        {insights.length > 0 ? (
          <ol className="divide-y divide-slate-100">
            {insights.map((ins) => (
              <li key={ins.id}>
                <button type="button" onClick={() => sw.go(ins.tab)}
                  className={`${sokoTokens.focus} focus-visible:ring-offset-0 group w-full text-left flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer`}>
                  <span className="sm:w-28 shrink-0">
                    <SokoStatusIndicator tone={ins.severity} label={ins.severity === 'critical' ? 'High' : ins.severity === 'warning' ? 'Medium' : ins.severity === 'info' ? 'Routine' : 'Consider'} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{ins.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500 leading-relaxed"><span className="font-medium text-slate-600">Why: </span>{ins.why}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 whitespace-nowrap group-hover:underline">
                    {ins.action}<ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <SokoEmptyState icon={ShieldCheck} title="Nothing needs attention" description="Vendor approvals, compliance documents, visits and follow-ups are all up to date." />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SokoPanel title="Vendor network" subtitle="Register composition and approval" icon={Network} action={<SokoPanelLink label="Vendor directory" onClick={() => sw.go('sw-vendors')} />}>
          {vendorCount === 0 ? (
            <SokoEmptyState icon={Network} title="No vendors yet" description="Add vendors to your register to see network intelligence." />
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <SubHeading aside={<span className="text-xs text-slate-500 tabular-nums">{plural(data.sokoVerified.length, 'SOKO-verified')}</span>}>SOKO-linked vs external</SubHeading>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100" role="img" aria-label={`${data.linked.length} SOKO-linked, ${data.external.length} external`}>
                  <div className="bg-blue-600" style={{ width: `${linkedShare}%` }} />
                  <div className="bg-slate-300" style={{ width: `${100 - linkedShare}%` }} />
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" />SOKO-linked {data.linked.length}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" />External {data.external.length}</span>
                </div>
              </div>

              <div>
                <SubHeading>GEC internal approval</SubHeading>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100" role="img" aria-label={APPROVAL_ORDER.map((s) => `${APPROVAL_META[s].label} ${data.approval[s]}`).join(', ')}>
                  {APPROVAL_ORDER.filter((s) => data.approval[s] > 0).map((s) => (
                    <div key={s} className={APPROVAL_META[s].bar} style={{ width: `${(data.approval[s] / vendorCount) * 100}%` }} />
                  ))}
                </div>
                <ul className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs text-slate-600">
                  {APPROVAL_ORDER.map((s) => (
                    <li key={s} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 min-w-0"><span className={`w-2 h-2 rounded-full shrink-0 ${APPROVAL_META[s].bar}`} /><span className="truncate">{APPROVAL_META[s].label}</span></span>
                      <span className="font-semibold text-slate-900 tabular-nums">{data.approval[s]}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <SubHeading aside={data.singleSource.length > 0 ? <span className="text-xs text-amber-700">{data.singleSource.length} single-source</span> : undefined}>Trade category coverage</SubHeading>
                <ul className="flex flex-col gap-2">
                  {data.categories.map(([cat, n]) => (
                    <li key={cat} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs">
                      <span className="flex items-center gap-1.5 min-w-0 text-slate-700">
                        <span className="truncate">{cat}</span>
                        {n === 1 && <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-medium text-amber-800">Single source</span>}
                      </span>
                      <span className="tabular-nums text-slate-500"><span className="font-semibold text-slate-900">{n}</span> · {Math.round((n / vendorCount) * 100)}%</span>
                      <span className="col-span-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${(n / maxCategory) * 100}%` }} /></span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <SubHeading>Incomplete vendor records</SubHeading>
                {data.incomplete.length === 0 ? (
                  <p className="text-xs text-slate-500">All vendor records have a contact person, email, phone, location and trade category.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {data.incomplete.slice(0, 5).map(({ vendor, missing }) => (
                      <li key={vendor.id}>
                        <button type="button" onClick={() => sw.go('sw-vendors')} className={`${sokoTokens.focus} focus-visible:ring-offset-0 w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 cursor-pointer`}>
                          <span className="text-xs font-medium text-slate-800 truncate">{vendor.supplierName}</span>
                          <span className="text-[11px] text-slate-500 truncate">Missing {missing.join(', ')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <SourceNote>Source: your vendor register. SOKO verification is set by SOKO; approval is GEC&apos;s own decision.</SourceNote>
        </SokoPanel>

        <SokoPanel title="Compliance" subtitle="Required documents from your vendor register" icon={FileWarning} action={<SokoPanelLink label="Compliance reviews" onClick={() => sw.go('sw-documents')} />}>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Awaiting review" value={data.awaitingReview.length} tone={data.awaitingReview.length ? 'text-amber-700' : undefined} />
            <Stat label="Missing" value={data.missingDocs.length} tone={data.missingDocs.length ? 'text-rose-700' : undefined} />
            <Stat label={`Expiring ${EXPIRY_WINDOW_DAYS}d`} value={data.expiringDocs.length} tone={data.expiringDocs.length ? 'text-amber-700' : undefined} />
            <Stat label="Expired" value={data.expiredDocs.length} tone={data.expiredDocs.length ? 'text-rose-700' : undefined} />
          </dl>

          {data.expiringDocs.length > 0 && (
            <div className="mt-5">
              <SubHeading>Next expiries</SubHeading>
              <ul className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-100">
                {data.expiringDocs.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <span className="min-w-0"><span className="block font-medium text-slate-800 truncate">{d.documentType}</span><span className="block text-slate-500 truncate">{d.supplierName}</span></span>
                    <span className="text-right shrink-0"><span className="block font-semibold text-amber-800 tabular-nums">{daysUntil(d.expiryDate)}d</span><span className="block text-slate-400">{fmtDate(d.expiryDate!)}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <SubHeading>Vendor compliance status</SubHeading>
            {data.vendorCompliance.length === 0 ? (
              <p className="text-xs text-slate-500">No vendors to assess.</p>
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full min-w-[520px] text-xs">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50/60 text-left text-[11px] font-medium text-slate-500">
                      <th scope="col" className="px-5 py-2 font-medium">Vendor</th>
                      <th scope="col" className="px-2 py-2 font-medium">SOKO</th>
                      <th scope="col" className="px-2 py-2 font-medium">GEC approval</th>
                      <th scope="col" className="px-2 py-2 font-medium">Documents</th>
                      <th scope="col" className="px-5 py-2 font-medium sr-only">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.vendorCompliance.slice(0, 8).map((vc) => (
                      <tr key={vc.vendor.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-2.5 max-w-[180px]">
                          <span className="block font-medium text-slate-800 truncate">{vc.vendor.supplierName}</span>
                          <span className="block text-slate-500 truncate">
                            {vc.docs.length === 0 ? vc.vendor.tradeCategory : [vc.missing && `${vc.missing} missing`, vc.pending && `${vc.pending} in review`, vc.expiring && `${vc.expiring} expiring`].filter(Boolean).join(' · ') || `${vc.docs.length} on file`}
                          </span>
                        </td>
                        <td className="px-2 py-2.5"><SokoStatusIndicator tone={vc.vendor.sokoVerified ? 'info' : 'neutral'} label={vc.vendor.sokoVerified ? 'Verified' : vc.vendor.supplierCompanyId ? 'Unverified' : 'External'} /></td>
                        <td className="px-2 py-2.5"><SokoStatusIndicator tone={APPROVAL_META[vc.vendor.approvalStatus].tone} label={APPROVAL_META[vc.vendor.approvalStatus].label} /></td>
                        <td className="px-2 py-2.5"><SokoStatusIndicator tone={COMPLIANCE_META[vc.status].tone} label={COMPLIANCE_META[vc.status].label} /></td>
                        <td className="px-5 py-2.5 text-right">
                          <button type="button" onClick={() => sw.go(vc.docs.length ? 'sw-documents' : 'sw-vendors')} aria-label={`Open ${vc.docs.length ? 'compliance documents' : 'vendor record'} for ${vc.vendor.supplierName}`}
                            className={`${sokoTokens.focus} inline-flex w-7 h-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-700 cursor-pointer`}>
                            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.vendorCompliance.length > 8 && (
              <button type="button" onClick={() => sw.go('sw-documents')} className={`${sokoTokens.focus} mt-3 text-xs font-semibold text-blue-700 hover:underline cursor-pointer`}>
                View all {data.vendorCompliance.length} vendors
              </button>
            )}
          </div>
          <SourceNote>Source: compliance records in Documents. Document review status is separate from vendor approval and SOKO verification.</SourceNote>
        </SokoPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SokoPanel title="Supplier engagement" subtitle="Visits, contacts and Market Hub responses" icon={Handshake} action={<SokoPanelLink label="Visits" onClick={() => sw.go('sw-visits')} />}>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Upcoming visits" value={data.upcoming.length} tone="text-blue-700" />
            <Stat label="Pending confirm." value={data.pendingConfirmation.length} tone={data.pendingConfirmation.length ? 'text-amber-700' : undefined} />
            <Stat label="Open follow-ups" value={data.openTasks.length} tone={data.openTasks.length ? 'text-amber-700' : undefined} />
            <Stat label="Saved contacts" value={data.contacts.length} />
          </dl>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => sw.go('sw-contacts')} className={`${sokoTokens.focus} rounded-xl border border-slate-100 p-3 text-left hover:border-slate-200 hover:bg-slate-50/60 cursor-pointer`}>
              <span className="block text-xs text-slate-500">Contact relationships</span>
              <span className="mt-1 block text-sm font-medium text-slate-900">{plural(data.contactCompanies, 'company')} with saved contacts</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {data.linkedNoContact.length > 0 ? `${plural(data.linkedNoContact.length, 'linked vendor')} without a saved contact` : 'Every linked vendor has a saved contact'}
              </span>
            </button>
            <button type="button" onClick={() => sw.go('opportunities')} className={`${sokoTokens.focus} rounded-xl border border-slate-100 p-3 text-left hover:border-slate-200 hover:bg-slate-50/60 cursor-pointer`}>
              <span className="block text-xs text-slate-500">Market Hub</span>
              <span className="mt-1 block text-sm font-medium text-slate-900">{plural(market.responses, 'supplier response')}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{plural(market.activeCampaigns, 'active campaign')} · {market.relevantCount} relevant to you</span>
            </button>
          </div>

          <div className="mt-5">
            <SubHeading>Recent visit interactions</SubHeading>
            {data.recentVisits.length === 0 ? (
              <p className="text-xs text-slate-500">No supplier visits recorded yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-100">
                {data.recentVisits.map((v) => {
                  const counterpart = v.hostCompanyId === company.id ? v.representative : v.hostCompany;
                  const tone: SokoStatusTone = v.status === 'completed' ? 'success' : v.status === 'pending-confirmation' ? 'warning' : v.status === 'scheduled' ? 'info' : 'neutral';
                  return (
                    <li key={v.id}>
                      <button type="button" onClick={() => sw.go('sw-visits')} className={`${sokoTokens.focus} focus-visible:ring-offset-0 w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 cursor-pointer`}>
                        <span className="min-w-0"><span className="block text-xs font-medium text-slate-800 truncate">{counterpart}</span><span className="block text-[11px] text-slate-500">{fmtDate(v.date)}</span></span>
                        <SokoStatusIndicator tone={tone} label={v.status.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <SourceNote>Source: shared visit records, follow-up tasks, your saved contacts and Market Hub. Supplier-private notes and personal contacts are not included.</SourceNote>
        </SokoPanel>

        <SokoPanel title="Products and capabilities" subtitle="Active catalogue items from SOKO-linked vendors" icon={Boxes} action={<SokoPanelLink label="Product discovery" onClick={() => sw.go('sw-products')} />}>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Products available" value={data.linkedProducts.length} />
            <Stat label="Product categories" value={data.productCategories.length} />
            <Stat label="Linked, no catalogue" value={data.linkedWithoutProducts.length} tone={data.linkedWithoutProducts.length ? 'text-amber-700' : undefined} />
            <Stat label="Saved products" value={data.savedProducts} />
          </dl>

          <div className="mt-5">
            <SubHeading>Product categories represented</SubHeading>
            {data.productCategories.length === 0 ? (
              <p className="text-xs text-slate-500">Your SOKO-linked vendors have no active products published yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.productCategories.slice(0, 6).map(([cat, n]) => (
                  <li key={cat} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs">
                    <span className="truncate text-slate-700">{cat}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{n}</span>
                    <span className="col-span-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${(n / maxProductCategory) * 100}%` }} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5">
            <SubHeading>Coverage gaps</SubHeading>
            {data.tradeWithoutProducts.length === 0 ? (
              <p className="text-xs text-slate-500">Every trade category in your register has at least one linked vendor with an active catalogue.</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-slate-500 leading-relaxed">Trade categories in your register with no linked vendor publishing products on SOKO:</p>
                <ul className="flex flex-wrap gap-1.5">
                  {data.tradeWithoutProducts.map((cat) => (
                    <li key={cat}><span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700"><Layers className="w-3 h-3 text-slate-400" aria-hidden />{cat}</span></li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <SourceNote>Source: active products from vendors linked to SOKO. External vendors have no SOKO catalogue.</SourceNote>
        </SokoPanel>
      </div>

      <section aria-label="Unavailable intelligence" className={`${sokoCard} flex items-start gap-3 p-4 sm:p-5`}>
        <CircleAlert className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" aria-hidden />
        <div className="text-xs text-slate-500 leading-relaxed">
          <p className="font-medium text-slate-700">Not available from current records</p>
          <p className="mt-0.5">Supplier performance ratings, financial strength, market share and historical trends are not shown because SOKO does not hold that data for your workspace. Metrics above reflect current records only.</p>
        </div>
      </section>
    </div>
  );
};
