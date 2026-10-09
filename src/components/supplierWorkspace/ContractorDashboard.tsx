import React, { useMemo, useState } from 'react';
import {
  Users, ShieldCheck, ClipboardCheck, CalendarCheck, CalendarPlus, UserPlus,
  Search, FolderLock, Building2, TrendingUp, Clock, Activity, Zap, FileWarning, FileSearch, FileX2,
  Package, Inbox, Megaphone, FileText, UserCog, Crown, Contact, ListChecks, Network, type LucideIcon,
} from 'lucide-react';
import { SW, VerificationBadge, PlanBadge } from './SupplierShared';
import { DemoNote, fmtDate } from '../marketHub/MarketHubShared';
import { AuditEntry, VendorApprovalStatus } from '../../data/supplierTypes';
import { marketSnapshot } from '../../data/supplierMarket';
import {
  SokoWorkspaceHeader, SokoMetricCard, SokoSectionCard, SokoActionButton, SokoStatusIndicator,
  SokoEmptyState, SokoTimelineItem, SokoBarChart, SokoSegmentBar, SokoStatTile, SokoSubheading,
  SokoQuickAction, SokoProductRow, SokoLinkAction, SokoActionRow, SokoTabs,
  type MetricTone, type SokoStatusTone,
} from '../sokoDesignSystem/SokoComponents';

const APPROVAL_ORDER: VendorApprovalStatus[] = ['approved', 'conditionally-approved', 'under-review', 'not-reviewed', 'rejected', 'suspended'];

const APPROVAL_META: Record<VendorApprovalStatus, { label: string; status: SokoStatusTone; tone: MetricTone }> = {
  'approved':               { label: 'Approved',     status: 'success',  tone: 'green' },
  'conditionally-approved': { label: 'Conditional',  status: 'warning',  tone: 'amber' },
  'under-review':           { label: 'Under review', status: 'info',     tone: 'blue' },
  'not-reviewed':           { label: 'Not reviewed', status: 'neutral',  tone: 'slate' },
  'rejected':               { label: 'Rejected',     status: 'critical', tone: 'red' },
  'suspended':              { label: 'Suspended',    status: 'critical', tone: 'red' },
};

const VISIT_TONE: Record<string, SokoStatusTone> = {
  completed: 'neutral',
  scheduled: 'info',
  requested: 'warning',
  cancelled: 'critical',
};

const ACTIVITY_KIND: Record<AuditEntry['kind'], { label: string; icon: LucideIcon; tone: MetricTone; tab: string }> = {
  profile:      { label: 'Company profile', icon: Building2,     tone: 'blue',  tab: 'sw-profile' },
  verification: { label: 'Verification',    icon: ShieldCheck,   tone: 'green', tab: 'sw-profile' },
  product:      { label: 'Products',        icon: Package,       tone: 'sky',   tab: 'sw-products' },
  document:     { label: 'Documents',       icon: FileText,      tone: 'amber', tab: 'sw-documents' },
  team:         { label: 'Team',            icon: UserCog,       tone: 'slate', tab: 'sw-team' },
  plan:         { label: 'Subscription',    icon: Crown,         tone: 'gold',  tab: 'sw-plan' },
  contact:      { label: 'Contacts',        icon: Contact,       tone: 'blue',  tab: 'sw-contacts' },
  visit:        { label: 'Visits',          icon: CalendarCheck, tone: 'sky',   tab: 'sw-visits' },
};

type DiscoveryTab = 'saved' | 'recent' | 'categories';

const companyInitials = (name: string) =>
  name.replace(/\b(LLC|L\.L\.C\.?|FZE|PJSC)\b/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const ContractorDashboard: React.FC<{ sw: SW }> = ({ sw }) => {
  const { company, store } = sw;
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTab>('saved');
  const vendors = store.vendorRecords.filter((v) => v.companyId === company.id);
  const visits = store.visits.filter((v) => v.companyId === company.id || v.hostCompanyId === company.id);
  const audit = store.audit.filter((a) => a.companyId === company.id).slice(0, 8);
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);

  const approvedVendors = vendors.filter((v) => v.approvalStatus === 'approved');
  const pendingVendors = vendors.filter((v) => ['under-review', 'conditionally-approved', 'not-reviewed'].includes(v.approvalStatus));
  const externalVendors = vendors.filter((v) => v.external);
  const linkedVendors = vendors.filter((v) => !v.external);
  const approvalCount = (s: VendorApprovalStatus) => vendors.filter((v) => v.approvalStatus === s).length;

  const linkedSupplierIds = vendors.filter((v) => v.supplierCompanyId).map((v) => v.supplierCompanyId!);
  const today = new Date();
  const expiringDocs = store.documents
    .filter((d) =>
      linkedSupplierIds.includes(d.companyId) &&
      d.expiry &&
      d.shares.some((s) => s.company === company.profile.tradingName) &&
      new Date(d.expiry) < new Date(today.getTime() + 30 * 86400000)
    )
    .sort((a, b) => (a.expiry! < b.expiry! ? -1 : 1));

  const now = new Date();
  const thisMonthVisits = visits.filter((v) => {
    const d = new Date(v.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const todayVisits = visits.filter((v) => v.date === now.toISOString().slice(0, 10));
  const upcomingVisits = visits.filter((v) => v.status === 'scheduled');

  const newConnections = store.contacts.filter((c) => c.companyId === company.id && new Date(c.at) > new Date(today.getTime() - 30 * 86400000));

  const categoryMap = new Map<string, number>();
  vendors.forEach((v) => categoryMap.set(v.tradeCategory, (categoryMap.get(v.tradeCategory) || 0) + 1));
  const topCategories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const categoriesEqual = topCategories.length > 1 && topCategories.every(([, n]) => n === topCategories[0][1]);

  const side = company.kind === 'contractor' ? 'contractor' : 'supplier';
  const pendingFollowUps = store.visitTasks.filter((t) => t.companyId === company.id && t.side === side && t.status !== 'completed');

  const complianceDocs = store.vendorComplianceDocs.filter((d) => d.companyId === company.id);
  const complianceAccepted = complianceDocs.filter((d) => d.status === 'accepted').length;
  const complianceAwaiting = complianceDocs.filter((d) => d.status === 'under-review' || d.status === 'submitted').length;
  const complianceMissing = complianceDocs.filter((d) => d.status === 'missing').length;
  const complianceRejected = complianceDocs.filter((d) => d.status === 'rejected').length;
  const complianceSuppliers = new Set(complianceDocs.map((d) => d.vendorId)).size;

  const savedProducts = store.savedProducts.filter((s) => s.companyId === company.id).slice(0, 4);
  const recentViews = store.recentlyViewedProducts.filter((r) => r.companyId === company.id).slice(0, 4);

  const activeMarketProducts = useMemo(
    () => store.products.filter((p) => p.status === 'active' && p.companyId !== company.id),
    [store.products, company.id]
  );
  const popularCats = useMemo(() => {
    const catMap = new Map<string, number>();
    activeMarketProducts.forEach((p) => catMap.set(p.category, (catMap.get(p.category) ?? 0) + 1));
    return Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [activeMarketProducts]);

  const productInfo = (productId: string) => {
    const p = store.products.find((pr) => pr.id === productId);
    if (!p) return null;
    return { product: p, supplier: store.companies.find((c) => c.id === p.companyId)?.profile.tradingName ?? 'Unknown supplier' };
  };

  const canAddVendor = sw.can('contacts.manage');
  const quickActions = [
    { label: 'Add Vendor', description: 'Register a supplier for approval', icon: UserPlus, tab: 'sw-vendors', can: canAddVendor },
    { label: 'Search Suppliers', description: 'Discover products and suppliers', icon: Search, tab: 'sw-products', can: true },
    { label: 'Schedule Visit', description: 'Book a supplier site visit', icon: CalendarPlus, tab: 'sw-visits', can: sw.can('visits.manage') },
    { label: 'Post Opportunity', description: 'Publish a requirement on Market Hub', icon: Megaphone, tab: 'opportunities', can: true },
  ].filter((a) => a.can);

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const renderProduct = (key: string, productId: string, meta?: string) => {
    const info = productInfo(productId);
    if (!info) return null;
    return <SokoProductRow key={key} name={info.product.name} supplier={info.supplier} category={info.product.category} meta={meta} imageUrl={info.product.images[0]} placeholderIcon={Package} onClick={() => sw.go('sw-products')} />;
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <SokoWorkspaceHeader
        companyName={company.profile.tradingName}
        companyInitials={companyInitials(company.profile.tradingName)}
        logoTone={company.profile.logoTone}
        workspaceType={company.profile.types.join(' / ')}
        workspaceId={company.sokoId}
        greeting={greeting}
        userName={sw.user.name}
        dateLabel={dateLabel}
        badges={<><VerificationBadge company={company} /><PlanBadge premium={sw.premium} kind={company.kind} /></>}
        actions={<>
          <SokoActionButton label="Search Suppliers" icon={Search} variant="secondary" onClick={() => sw.go('sw-products')} />
          {canAddVendor && <SokoActionButton label="Add Vendor" icon={UserPlus} variant="primary" onClick={() => sw.go('sw-vendors')} />}
        </>}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SokoMetricCard
          label="Total Vendors" value={vendors.length} icon={Users} tone="blue"
          sublabel={`${approvedVendors.length} approved in your register`}
          footer={<SokoSegmentBar size="sm" segments={[{ label: 'On SOKO', value: linkedVendors.length, tone: 'blue' }, { label: 'External', value: externalVendors.length, tone: 'slate' }]} />}
          onClick={() => sw.go('sw-vendors')}
        />
        <SokoMetricCard
          label="Pending Vendor Reviews" value={pendingVendors.length} icon={ClipboardCheck} tone="amber"
          sublabel={pendingVendors.length > 0 ? 'Awaiting an approval decision' : 'No reviews outstanding'}
          footer={<SokoSegmentBar size="sm" segments={[
            { label: 'Under review', value: approvalCount('under-review'), tone: 'blue' },
            { label: 'Conditional', value: approvalCount('conditionally-approved'), tone: 'amber' },
            { label: 'Not reviewed', value: approvalCount('not-reviewed'), tone: 'slate' },
          ]} />}
          onClick={() => sw.go('sw-vendors')}
        />
        <SokoMetricCard
          label="Expiring Compliance Documents" value={expiringDocs.length} icon={FileWarning} tone={expiringDocs.length > 0 ? 'red' : 'green'}
          sublabel="Shared supplier documents, next 30 days"
          footer={
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {expiringDocs.length > 0 ? <>Next: <span className="font-medium text-slate-800 truncate">{expiringDocs[0].name}</span> · {fmtDate(expiringDocs[0].expiry!)}</> : 'Nothing expiring soon'}
            </p>
          }
          onClick={() => sw.go('sw-documents')}
        />
        <div className="sm:col-span-2 lg:col-span-3 grid sm:grid-cols-3 gap-4">
          <SokoMetricCard emphasis="supporting" label="Visits this month" value={thisMonthVisits.length} icon={CalendarCheck} tone="sky" sublabel={`${upcomingVisits.length} upcoming`} onClick={() => sw.go('sw-visits')} />
          <SokoMetricCard emphasis="supporting" label="Market Hub opportunities" value={market.relevantCount} icon={TrendingUp} tone="blue" sublabel={plural(market.responses, 'response')} onClick={() => sw.go('opportunities')} />
          <SokoMetricCard emphasis="supporting" label="New connections" value={newConnections.length} icon={UserPlus} tone="green" sublabel="Last 30 days" onClick={() => sw.go('sw-contacts')} />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 sm:gap-5">
        <SokoSectionCard title="Vendor Intelligence" subtitle={`${plural(vendors.length, 'vendor')} in your register`} icon={Network} className="lg:col-span-8" action={<SokoLinkAction label="Vendor register" onClick={() => sw.go('sw-vendors')} />}>
          {vendors.length === 0 ? (
            <SokoEmptyState icon={Users} title="No vendors yet" description="Add suppliers to your vendor register to start tracking approvals."
              action={canAddVendor ? <SokoActionButton label="Add Vendor" icon={UserPlus} variant="primary" onClick={() => sw.go('sw-vendors')} /> : undefined} />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <SokoStatTile label="Total vendors" value={vendors.length} />
                <SokoStatTile label="SOKO-linked" value={linkedVendors.length} tone="blue" />
                <SokoStatTile label="External" value={externalVendors.length} />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <SokoSubheading aside="Internal approval">Approval pipeline</SokoSubheading>
                  <SokoSegmentBar legend="list" segments={APPROVAL_ORDER.map((s) => ({ label: APPROVAL_META[s].label, value: approvalCount(s), tone: APPROVAL_META[s].tone }))} />
                </div>
                <div>
                  <SokoSubheading aside="Share of all vendors">By trade category</SokoSubheading>
                  <SokoBarChart total={vendors.length} unit={vendors.length === 1 ? 'vendor' : 'vendors'} data={topCategories.map(([cat, count]) => ({ label: cat, value: count }))} />
                  {categoriesEqual && <p className="mt-2 text-[11px] text-slate-500">Each category currently has the same number of vendors.</p>}
                </div>
              </div>
              <div>
                <SokoSubheading>Recently added</SokoSubheading>
                <ul className="grid sm:grid-cols-3 gap-2">
                  {vendors.slice(0, 3).map((v) => (
                    <li key={v.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{v.supplierName}</p>
                        <SokoStatusIndicator label={APPROVAL_META[v.approvalStatus].label} tone={APPROVAL_META[v.approvalStatus].status} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 truncate">{v.tradeCategory} · {v.external ? 'External' : 'On SOKO'}</p>
                      <p className="text-[11px] text-slate-400">Added {fmtDate(v.addedAt)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </SokoSectionCard>

        <SokoSectionCard title="Action Center" subtitle="Items waiting on your team" icon={ListChecks} className="lg:col-span-4">
          <div className="space-y-4">
            <div>
              <SokoSubheading>Vendors</SokoSubheading>
              <SokoActionRow label="Vendor reviews" description="Approval decisions outstanding" count={pendingVendors.length} icon={ClipboardCheck} tone="amber" onClick={() => sw.go('sw-vendors')} />
            </div>
            <div className="pt-3 border-t border-slate-100">
              <SokoSubheading aside={complianceDocs.length > 0 ? `${plural(complianceDocs.length, 'document')} · ${plural(complianceSuppliers, 'supplier')}` : undefined}>Documents</SokoSubheading>
              <SokoActionRow label="Document reviews" description="Submitted, awaiting your review" count={complianceAwaiting} icon={FileSearch} tone="blue" onClick={() => sw.go('sw-documents')} />
              <SokoActionRow label="Missing documents" description="Requested, not yet submitted" count={complianceMissing} icon={FileX2} tone="amber" onClick={() => sw.go('sw-documents')} />
              <SokoActionRow label="Expiring documents" description="Shared documents, next 30 days" count={expiringDocs.length} icon={FileWarning} tone="red" onClick={() => sw.go('sw-documents')} />
              <p className="mt-1 text-[11px] text-slate-500">{complianceAccepted} accepted · {complianceRejected} rejected. Counts are documents, not suppliers.</p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <SokoSubheading>Visits</SokoSubheading>
              <SokoActionRow label="Upcoming visits" description="Scheduled supplier visits" count={upcomingVisits.length} icon={CalendarCheck} tone="sky" onClick={() => sw.go('sw-visits')} />
            </div>
          </div>
        </SokoSectionCard>

        <SokoSectionCard title="Supplier Visits" subtitle={plural(visits.length, 'visit record')} icon={CalendarCheck} className="lg:col-span-5" action={<SokoLinkAction label="View all" onClick={() => sw.go('sw-visits')} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <SokoStatTile label="Today" value={todayVisits.length} tone="sky" />
              <SokoStatTile label="Upcoming" value={upcomingVisits.length} />
              <SokoStatTile label="This month" value={thisMonthVisits.length} />
            </div>
            {visits.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {visits.slice(0, 4).map((v) => {
                  const d = new Date(v.date);
                  return (
                    <li key={v.id} className="flex items-center gap-3 py-2.5">
                      <div className="w-11 shrink-0 rounded-lg bg-slate-50 border border-slate-100 text-center py-1">
                        <p className="text-[10px] font-semibold uppercase text-slate-500 leading-none">{d.toLocaleDateString('en-GB', { month: 'short' })}</p>
                        <p className="text-base font-semibold text-slate-900 leading-tight tabular-nums">{d.getDate()}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{v.hostCompany}</p>
                        <p className="text-[11px] text-slate-500 truncate">{v.representative} · {v.purpose}</p>
                      </div>
                      <SokoStatusIndicator label={v.status} tone={VISIT_TONE[v.status] ?? 'neutral'} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <SokoEmptyState icon={CalendarCheck} title="No visits scheduled" description="Schedule supplier site visits to track performance." />
            )}
            {pendingFollowUps.length > 0 && (
              <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                <Clock className="w-3.5 h-3.5 shrink-0" /> {plural(pendingFollowUps.length, 'follow-up task')} pending
              </p>
            )}
          </div>
        </SokoSectionCard>

        <SokoSectionCard title="Market Hub Activity" subtitle="Opportunities relevant to you" icon={TrendingUp} className="lg:col-span-4" action={<SokoLinkAction label="Explore" onClick={() => sw.go('opportunities')} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <SokoStatTile label="Relevant" value={market.relevantCount} tone="blue" />
              <SokoStatTile label="Responses" value={market.responses} />
            </div>
            {market.relevant.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {market.relevant.slice(0, 4).map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => sw.go('opportunities')} className="group w-full py-2.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700 transition-colors">{o.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 truncate"><span className="font-medium text-blue-600">{o.type}</span> · {o.location}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <SokoEmptyState icon={Inbox} title="No matching opportunities" description="Check Market Hub for new procurement opportunities." />
            )}
          </div>
        </SokoSectionCard>

        <SokoSectionCard title="Quick Actions" icon={Zap} className="lg:col-span-3">
          <div className="space-y-2">
            {quickActions.map((a) => (
              <SokoQuickAction key={a.label} label={a.label} description={a.description} icon={a.icon} onClick={() => sw.go(a.tab)} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
            <SokoActionButton label="Visits" icon={CalendarCheck} variant="ghost" fullWidth onClick={() => sw.go('sw-visits')} />
            <SokoActionButton label="Documents" icon={FolderLock} variant="ghost" fullWidth onClick={() => sw.go('sw-documents')} />
          </div>
        </SokoSectionCard>

        <SokoSectionCard title="Recent Activity" subtitle="Latest actions in this workspace" icon={Activity} className="lg:col-span-7">
          {audit.length > 0 ? (
            <ol>
              {audit.map((a, i) => {
                const k = ACTIVITY_KIND[a.kind];
                return <SokoTimelineItem key={a.id} icon={k.icon} tone={k.tone} title={a.action} record={k.label} author={a.actor} timestamp={fmtDate(a.at)} last={i === audit.length - 1} onClick={() => sw.go(k.tab)} />;
              })}
            </ol>
          ) : (
            <SokoEmptyState icon={Activity} title="No recent activity" description="Actions taken by your team will appear here." />
          )}
        </SokoSectionCard>

        <SokoSectionCard title="Product Discovery" subtitle="Construction products across SOKO" icon={Package} className="lg:col-span-5" action={<SokoLinkAction label="Discover" onClick={() => sw.go('sw-products')} />}>
          <SokoTabs<DiscoveryTab>
            label="Product lists"
            active={discoveryTab}
            onChange={setDiscoveryTab}
            tabs={[
              { id: 'saved', label: 'Saved', count: savedProducts.length },
              { id: 'recent', label: 'Recently viewed', count: recentViews.length },
              { id: 'categories', label: 'Popular' },
            ]}
          />
          <div className="mt-3" role="tabpanel">
            {discoveryTab === 'saved' && (savedProducts.length > 0
              ? <div className="space-y-0.5">{savedProducts.map((s) => renderProduct(s.id, s.productId))}</div>
              : <SokoEmptyState icon={Package} title="No saved products" description="Save products from Product Discovery to compare them later." />)}
            {discoveryTab === 'recent' && (recentViews.length > 0
              ? <div className="space-y-0.5">{recentViews.map((r) => renderProduct(r.id, r.productId, `Viewed ${fmtDate(r.at)}`))}</div>
              : <SokoEmptyState icon={Package} title="Nothing viewed yet" description="Products you browse will appear here for quick access." />)}
            {discoveryTab === 'categories' && (popularCats.length > 0
              ? <div className="pt-1"><SokoBarChart total={activeMarketProducts.length} unit="products" data={popularCats.map(([cat, count]) => ({ label: cat, value: count, tone: 'sky' as MetricTone }))} /></div>
              : <SokoEmptyState icon={Package} title="No categories" description="Product categories will appear here once available." />)}
          </div>
        </SokoSectionCard>
      </div>

      <DemoNote>Dashboard metrics are derived from simulated demo data. Vendor approvals and SOKO verification are independent processes.</DemoNote>
    </div>
  );
};
