import React, { useMemo } from 'react';
import {
  Users, ShieldCheck, ShieldAlert, ClipboardCheck, CalendarCheck, CalendarPlus, UserPlus,
  Search, FolderLock, Building2, TrendingUp, Clock, CheckCircle2, Activity, Zap,
  Package, Eye, Inbox, Megaphone, FileText, UserCog, Crown, Contact, LayoutGrid, type LucideIcon,
} from 'lucide-react';
import { SW, VerificationBadge, PlanBadge } from './SupplierShared';
import { DemoNote, fmtDate } from '../marketHub/MarketHubShared';
import { AuditEntry, VendorApprovalStatus } from '../../data/supplierTypes';
import { marketSnapshot } from '../../data/supplierMarket';
import {
  SokoPageHeader, SokoMetricCard, SokoSectionCard, SokoActionButton, SokoStatusIndicator,
  SokoEmptyState, SokoActivityItem, SokoBarChart, SokoSegmentBar, SokoStatTile, SokoSubheading,
  SokoQuickAction, SokoProductRow, SokoLinkAction, type MetricTone, type SokoStatusTone,
} from '../sokoDesignSystem/SokoComponents';

const APPROVAL_TONE: Record<VendorApprovalStatus, SokoStatusTone> = {
  'approved': 'success',
  'conditionally-approved': 'warning',
  'under-review': 'info',
  'not-reviewed': 'neutral',
  'rejected': 'critical',
  'suspended': 'critical',
};

const APPROVAL_LABEL: Record<VendorApprovalStatus, string> = {
  'approved': 'Approved',
  'conditionally-approved': 'Conditional',
  'under-review': 'Under review',
  'not-reviewed': 'Not reviewed',
  'rejected': 'Rejected',
  'suspended': 'Suspended',
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
  product:      { label: 'Products',        icon: Package,       tone: 'blue',  tab: 'sw-products' },
  document:     { label: 'Documents',       icon: FileText,      tone: 'amber', tab: 'sw-documents' },
  team:         { label: 'Team',            icon: UserCog,       tone: 'slate', tab: 'sw-team' },
  plan:         { label: 'Subscription',    icon: Crown,         tone: 'gold',  tab: 'sw-plan' },
  contact:      { label: 'Contacts',        icon: Contact,       tone: 'blue',  tab: 'sw-contacts' },
  visit:        { label: 'Visits',          icon: CalendarCheck, tone: 'amber', tab: 'sw-visits' },
};

const companyInitials = (name: string) =>
  name.replace(/\b(LLC|L\.L\.C\.?|FZE|PJSC)\b/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const ContractorDashboard: React.FC<{ sw: SW }> = ({ sw }) => {
  const { company, store } = sw;
  const vendors = store.vendorRecords.filter((v) => v.companyId === company.id);
  const visits = store.visits.filter((v) => v.companyId === company.id || v.hostCompanyId === company.id);
  const audit = store.audit.filter((a) => a.companyId === company.id).slice(0, 8);
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);

  const approvedVendors = vendors.filter((v) => v.approvalStatus === 'approved');
  const pendingVendors = vendors.filter((v) => ['under-review', 'conditionally-approved', 'not-reviewed'].includes(v.approvalStatus));
  const externalVendors = vendors.filter((v) => v.external);
  const linkedVendors = vendors.filter((v) => !v.external);

  const linkedSupplierIds = vendors.filter((v) => v.supplierCompanyId).map((v) => v.supplierCompanyId!);
  const today = new Date();
  const expiringDocs = store.documents.filter((d) =>
    linkedSupplierIds.includes(d.companyId) &&
    d.expiry &&
    d.shares.some((s) => s.company === company.profile.tradingName) &&
    new Date(d.expiry) < new Date(today.getTime() + 30 * 86400000)
  );

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
  const complianceAlerts = expiringDocs.length + complianceMissing + complianceRejected;

  const savedProducts = store.savedProducts.filter((s) => s.companyId === company.id).slice(0, 4);
  const recentViews = store.recentlyViewedProducts.filter((r) => r.companyId === company.id).slice(0, 4);

  const popularCats = useMemo(() => {
    const catMap = new Map<string, number>();
    store.products.filter((p) => p.status === 'active' && p.companyId !== company.id).forEach((p) => catMap.set(p.category, (catMap.get(p.category) ?? 0) + 1));
    return Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [store.products, company.id]);
  const popularTotal = store.products.filter((p) => p.status === 'active' && p.companyId !== company.id).length;

  const productInfo = (productId: string) => {
    const p = store.products.find((pr) => pr.id === productId);
    if (!p) return null;
    return { product: p, supplier: store.companies.find((c) => c.id === p.companyId)?.profile.tradingName ?? 'Unknown supplier' };
  };

  const primaryActions = [
    { label: 'Add Vendor', description: 'Register a supplier for approval', icon: UserPlus, tab: 'sw-vendors', can: sw.can('contacts.manage') },
    { label: 'Search Suppliers', description: 'Discover products and suppliers', icon: Search, tab: 'sw-products', can: true },
    { label: 'Schedule Visit', description: 'Book a supplier site visit', icon: CalendarPlus, tab: 'sw-visits', can: sw.can('visits.manage') },
    { label: 'Post Opportunity', description: 'Publish a requirement on Market Hub', icon: Megaphone, tab: 'opportunities', can: true },
  ].filter((a) => a.can);

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <SokoPageHeader
        companyName={company.profile.tradingName}
        companyInitials={companyInitials(company.profile.tradingName)}
        logoTone={company.profile.logoTone}
        workspaceLabel={`${company.profile.types.join(' / ')} Workspace · ${company.sokoId}`}
        greeting={greeting}
        userName={sw.user.name}
        dateLabel={dateLabel}
        badges={<><VerificationBadge company={company} /><PlanBadge premium={sw.premium} kind={company.kind} /></>}
      />

      <div className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
          <SokoMetricCard emphasis="primary" label="Total Vendors" value={vendors.length} icon={Users} tone="blue" sublabel={`${approvedVendors.length} approved · ${linkedVendors.length} on SOKO`} onClick={() => sw.go('sw-vendors')} />
          <SokoMetricCard emphasis="primary" label="Pending Vendor Reviews" value={pendingVendors.length} icon={ClipboardCheck} tone={pendingVendors.length > 0 ? 'amber' : 'green'} sublabel={pendingVendors.length > 0 ? 'Awaiting an approval decision' : 'No reviews outstanding'} onClick={() => sw.go('sw-vendors')} />
          <SokoMetricCard emphasis="primary" label="Compliance Alerts" value={complianceAlerts} icon={ShieldAlert} tone={complianceAlerts > 0 ? 'red' : 'green'} sublabel={`${expiringDocs.length} expiring · ${complianceMissing} missing · ${complianceRejected} rejected`} onClick={() => sw.go('sw-documents')} />
        </div>
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
          <SokoMetricCard emphasis="supporting" label="Visits this month" value={thisMonthVisits.length} icon={CalendarCheck} tone="slate" sublabel={`${upcomingVisits.length} upcoming`} onClick={() => sw.go('sw-visits')} />
          <SokoMetricCard emphasis="supporting" label="Market Hub opportunities" value={market.relevantCount} icon={TrendingUp} tone="slate" sublabel={plural(market.responses, 'response')} onClick={() => sw.go('opportunities')} />
          <SokoMetricCard emphasis="supporting" label="New connections" value={newConnections.length} icon={UserPlus} tone="slate" sublabel="Last 30 days" onClick={() => sw.go('sw-contacts')} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <SokoSectionCard title="Vendor Network" subtitle={`${plural(vendors.length, 'vendor')} in your register`} icon={Building2} action={<SokoLinkAction label="View all" onClick={() => sw.go('sw-vendors')} />}>
          {vendors.length === 0 ? (
            <SokoEmptyState icon={Users} title="No vendors yet" description="Add suppliers to your vendor register to start tracking approvals."
              action={sw.can('contacts.manage') ? <SokoActionButton label="Add Vendor" icon={UserPlus} variant="primary" onClick={() => sw.go('sw-vendors')} /> : undefined} />
          ) : (
            <div className="space-y-5">
              <div>
                <SokoSubheading>Composition</SokoSubheading>
                <SokoSegmentBar segments={[
                  { label: 'SOKO-linked', value: linkedVendors.length, tone: 'blue' },
                  { label: 'External', value: externalVendors.length, tone: 'slate' },
                ]} />
              </div>
              {topCategories.length > 0 && (
                <div>
                  <SokoSubheading aside="Share of all vendors">By trade category</SokoSubheading>
                  <SokoBarChart total={vendors.length} unit={vendors.length === 1 ? 'vendor' : 'vendors'} data={topCategories.map(([cat, count]) => ({ label: cat, value: count }))} />
                  {categoriesEqual && <p className="mt-2 text-[11px] text-slate-500">Each category currently has the same number of vendors.</p>}
                </div>
              )}
              <div>
                <SokoSubheading>Recently added</SokoSubheading>
                <ul className="divide-y divide-slate-100">
                  {vendors.slice(0, 3).map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{v.supplierName}</p>
                        <p className="text-[11px] text-slate-500">{v.tradeCategory} · {v.external ? 'External' : 'On SOKO'} · Added {fmtDate(v.addedAt)}</p>
                      </div>
                      <SokoStatusIndicator label={APPROVAL_LABEL[v.approvalStatus]} tone={APPROVAL_TONE[v.approvalStatus]} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </SokoSectionCard>

        <SokoSectionCard title="Compliance Overview" subtitle="Vendor documents and supplier expiries" icon={ShieldCheck} action={<SokoLinkAction label="View all" onClick={() => sw.go('sw-documents')} />}>
          <div className="space-y-5">
            <div>
              <SokoSubheading aside={complianceDocs.length > 0 ? `${plural(complianceDocs.length, 'document')} · ${plural(complianceSuppliers, 'supplier')}` : undefined}>
                Vendor compliance documents
              </SokoSubheading>
              {complianceDocs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <SokoStatTile label="Accepted" value={complianceAccepted} tone="green" />
                  <SokoStatTile label="Awaiting review" value={complianceAwaiting} tone="blue" />
                  <SokoStatTile label="Not submitted" value={complianceMissing} tone="amber" />
                  <SokoStatTile label="Rejected" value={complianceRejected} tone="red" />
                </div>
              ) : (
                <p className="text-xs text-slate-500">No compliance documents have been requested from vendors yet.</p>
              )}
              <p className="mt-2 text-[11px] text-slate-500">Counts are individual documents, not suppliers. Vendor approval is tracked separately in the Vendor Network.</p>
            </div>

            <div>
              <SokoSubheading aside="Next 30 days">Supplier documents expiring</SokoSubheading>
              {expiringDocs.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {expiringDocs.slice(0, 4).map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{d.name}</p>
                        <p className="text-[11px] text-rose-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {fmtDate(d.expiry!)}</p>
                      </div>
                      <SokoStatusIndicator label="Expiring" tone="critical" />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-800">No shared supplier documents expire in the next 30 days.</p>
                </div>
              )}
            </div>
          </div>
        </SokoSectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <SokoSectionCard title="Supplier Visits" subtitle={plural(visits.length, 'visit record')} icon={CalendarCheck} action={<SokoLinkAction label="View all" onClick={() => sw.go('sw-visits')} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <SokoStatTile label="Today" value={todayVisits.length} tone="blue" />
              <SokoStatTile label="Upcoming" value={upcomingVisits.length} />
              <SokoStatTile label="This month" value={thisMonthVisits.length} />
            </div>
            {visits.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {visits.slice(0, 4).map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{v.hostCompany}</p>
                      <p className="text-[11px] text-slate-500 truncate">{v.representative} · {v.purpose} · {fmtDate(v.date)}</p>
                    </div>
                    <SokoStatusIndicator label={v.status} tone={VISIT_TONE[v.status] ?? 'neutral'} />
                  </li>
                ))}
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

        <SokoSectionCard title="Market Hub Activity" subtitle="Opportunities relevant to your workspace" icon={TrendingUp} action={<SokoLinkAction label="Explore" onClick={() => sw.go('opportunities')} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <SokoStatTile label="Relevant opportunities" value={market.relevantCount} tone="blue" />
              <SokoStatTile label="Responses" value={market.responses} />
            </div>
            {market.relevant.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {market.relevant.slice(0, 4).map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => sw.go('opportunities')} className="group w-full flex items-center justify-between gap-3 py-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700 transition-colors">{o.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{o.type} · {o.location}</p>
                      </div>
                      <SokoStatusIndicator label={o.type} tone="info" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <SokoEmptyState icon={Inbox} title="No matching opportunities" description="Check Market Hub for new procurement opportunities." />
            )}
          </div>
        </SokoSectionCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <SokoSectionCard title="Recent Activity" subtitle="Latest actions in this workspace" icon={Activity} className="lg:col-span-2">
          {audit.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {audit.map((a) => {
                const k = ACTIVITY_KIND[a.kind];
                return <SokoActivityItem key={a.id} id={a.id} icon={k.icon} iconTone={k.tone} title={a.action} record={k.label} author={a.actor} timestamp={fmtDate(a.at)} onClick={() => sw.go(k.tab)} />;
              })}
            </div>
          ) : (
            <SokoEmptyState icon={Activity} title="No recent activity" description="Actions taken by your team will appear here." />
          )}
        </SokoSectionCard>

        <SokoSectionCard title="Quick Actions" icon={Zap}>
          <div className="space-y-2">
            {primaryActions.map((a) => (
              <SokoQuickAction key={a.label} label={a.label} description={a.description} icon={a.icon} onClick={() => sw.go(a.tab)} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <SokoSubheading>Also useful</SokoSubheading>
            <div className="flex flex-wrap gap-2">
              <SokoActionButton label="View Visits" icon={CalendarCheck} variant="secondary" onClick={() => sw.go('sw-visits')} />
              <SokoActionButton label="Review Documents" icon={FolderLock} variant="secondary" onClick={() => sw.go('sw-documents')} />
            </div>
          </div>
        </SokoSectionCard>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <SokoSectionCard title="Saved Products" icon={Package} action={<SokoLinkAction label="Discover" onClick={() => sw.go('sw-products')} />}>
          {savedProducts.length > 0 ? (
            <div className="space-y-0.5">
              {savedProducts.map((s) => {
                const info = productInfo(s.productId);
                if (!info) return null;
                return <SokoProductRow key={s.id} name={info.product.name} supplier={info.supplier} category={info.product.category} imageUrl={info.product.images[0]} placeholderIcon={Package} onClick={() => sw.go('sw-products')} />;
              })}
            </div>
          ) : (
            <SokoEmptyState icon={Package} title="No saved products" description="Save products from Product Discovery to compare them later." />
          )}
        </SokoSectionCard>

        <SokoSectionCard title="Recently Viewed" icon={Eye}>
          {recentViews.length > 0 ? (
            <div className="space-y-0.5">
              {recentViews.map((r) => {
                const info = productInfo(r.productId);
                if (!info) return null;
                return <SokoProductRow key={r.id} name={info.product.name} supplier={info.supplier} category={info.product.category} meta={`Viewed ${fmtDate(r.at)}`} imageUrl={info.product.images[0]} placeholderIcon={Package} onClick={() => sw.go('sw-products')} />;
              })}
            </div>
          ) : (
            <SokoEmptyState icon={Eye} title="Nothing viewed yet" description="Products you browse will appear here for quick access." />
          )}
        </SokoSectionCard>

        <SokoSectionCard title="Popular Categories" subtitle="Active listings across SOKO" icon={LayoutGrid} action={<SokoLinkAction label="Browse all" onClick={() => sw.go('sw-products')} />} className="md:col-span-2 lg:col-span-1">
          {popularCats.length > 0 ? (
            <SokoBarChart total={popularTotal} unit="products" data={popularCats.map(([cat, count]) => ({ label: cat, value: count, tone: 'slate' as MetricTone }))} />
          ) : (
            <SokoEmptyState icon={LayoutGrid} title="No categories" description="Product categories will appear here once available." />
          )}
        </SokoSectionCard>
      </div>

      <DemoNote>Dashboard metrics are derived from simulated demo data. Vendor approvals and SOKO verification are independent processes.</DemoNote>
    </div>
  );
};
