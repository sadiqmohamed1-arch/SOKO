import React, { useMemo } from 'react';
import {
  Users, ShieldCheck, FileWarning, CalendarCheck, UserPlus,
  Search, FolderLock, Building2, TrendingUp, Clock,
  CheckCircle2, AlertTriangle, Activity, Sparkles,
  Package, Eye, ArrowRight, Inbox,
} from 'lucide-react';
import { SW, VerificationBadge, PlanBadge } from './SupplierShared';
import { DemoNote, fmtDate } from '../marketHub/MarketHubShared';
import { VendorApprovalStatus } from '../../data/supplierTypes';
import { marketSnapshot } from '../../data/supplierMarket';
import {
  SokoPageHeader, SokoMetricCard, SokoSectionCard, SokoActionButton,
  SokoStatusIndicator, SokoEmptyState, SokoActivityItem, SokoBarChart,
  SokoLinkAction, type MetricTone, type SokoStatusTone, type SokoActivityItemData,
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
  'under-review': 'Under Review',
  'not-reviewed': 'Not Reviewed',
  'rejected': 'Rejected',
  'suspended': 'Suspended',
};

const visitStatusTone: Record<string, SokoStatusTone> = {
  completed: 'neutral',
  scheduled: 'info',
  cancelled: 'critical',
};

const companyInitials = (name: string) =>
  name.replace(/\b(LLC|L\.L\.C\.?|FZE|PJSC)\b/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export const ContractorDashboard: React.FC<{ sw: SW }> = ({ sw }) => {
  const { company, store, members } = sw;
  const vendors = store.vendorRecords.filter((v) => v.companyId === company.id);
  const visits = store.visits.filter((v) => v.companyId === company.id || v.hostCompanyId === company.id);
  const audit = store.audit.filter((a) => a.companyId === company.id).slice(0, 8);
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);

  const approvedVendors = vendors.filter((v) => v.approvalStatus === 'approved');
  const pendingVendors = vendors.filter((v) => ['under-review', 'conditionally-approved', 'not-reviewed'].includes(v.approvalStatus));
  const externalVendors = vendors.filter((v) => v.external);

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

  // Vendor category breakdown for bar chart
  const categoryMap = new Map<string, number>();
  vendors.forEach((v) => categoryMap.set(v.tradeCategory, (categoryMap.get(v.tradeCategory) || 0) + 1));
  const topCategories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const side = company.kind === 'contractor' ? 'contractor' : 'supplier';
  const pendingFollowUps = store.visitTasks.filter((t) => t.companyId === company.id && t.side === side && t.status !== 'completed');

  // Vendor compliance docs
  const complianceDocs = store.vendorComplianceDocs.filter((d) => d.companyId === company.id);
  const complianceAccepted = complianceDocs.filter((d) => d.status === 'accepted').length;
  const compliancePending = complianceDocs.filter((d) => ['under-review', 'submitted'].includes(d.status)).length;
  const complianceRejected = complianceDocs.filter((d) => d.status === 'rejected').length;
  const complianceMissing = complianceDocs.filter((d) => d.status === 'missing').length;

  // Saved products
  const savedProducts = store.savedProducts.filter((s) => s.companyId === company.id);
  const recentViews = store.recentlyViewedProducts.filter((r) => r.companyId === company.id).slice(0, 5);

  // Popular categories from all active products
  const popularCats = useMemo(() => {
    const products = store.products.filter((p) => p.status === 'active' && p.companyId !== company.id);
    const catMap = new Map<string, number>();
    products.forEach((p) => catMap.set(p.category, (catMap.get(p.category) ?? 0) + 1));
    return Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [store.products, company.id]);

  // Activity feed items
  const activityItems: SokoActivityItemData[] = audit.map((a) => {
    const tone: MetricTone = a.action.toLowerCase().includes('reject') ? 'red'
      : a.action.toLowerCase().includes('approve') ? 'green'
      : a.action.toLowerCase().includes('visit') ? 'amber'
      : 'blue';
    const icon = a.action.toLowerCase().includes('visit') ? CalendarCheck
      : a.action.toLowerCase().includes('reject') ? AlertTriangle
      : a.action.toLowerCase().includes('approve') ? CheckCircle2
      : Activity;
    return {
      id: a.id,
      icon,
      iconTone: tone,
      title: a.action,
      detail: a.actor,
      timestamp: fmtDate(a.at),
    };
  });

  const quickActions = [
    { label: 'Add Vendor', icon: UserPlus, tab: 'sw-vendors', can: sw.can('contacts.manage') },
    { label: 'Search Suppliers', icon: Search, tab: 'sw-products', can: true },
    { label: 'View Visits', icon: CalendarCheck, tab: 'sw-visits', can: true },
    { label: 'Review Documents', icon: FolderLock, tab: 'sw-documents', can: true },
  ].filter((a) => a.can);

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      {/* Section A — Workspace Identity Header */}
      <SokoPageHeader
        companyName={company.profile.tradingName}
        companyInitials={companyInitials(company.profile.tradingName)}
        logoTone={company.profile.logoTone}
        greeting={greeting}
        userName={sw.user.name}
        dateLabel={dateLabel}
        verificationBadge={<VerificationBadge company={company} />}
        planBadge={<PlanBadge premium={sw.premium} />}
      />

      {/* Section B — KPI Cards (6 metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <SokoMetricCard label="Total Vendors" value={vendors.length} icon={Users} tone="blue" sublabel={`${externalVendors.length} external`} onClick={() => sw.go('sw-vendors')} />
        <SokoMetricCard label="Approved" value={approvedVendors.length} icon={ShieldCheck} tone="green" sublabel={`${pendingVendors.length} pending`} onClick={() => sw.go('sw-vendors')} />
        <SokoMetricCard label="Expiring Docs" value={expiringDocs.length} icon={FileWarning} tone={expiringDocs.length > 0 ? 'red' : 'green'} sublabel="next 30 days" onClick={() => sw.go('sw-documents')} />
        <SokoMetricCard label="Visits This Month" value={thisMonthVisits.length} icon={CalendarCheck} tone="amber" sublabel={`${upcomingVisits.length} upcoming`} onClick={() => sw.go('sw-visits')} />
        <SokoMetricCard label="Market Opportunities" value={market.relevantCount} icon={TrendingUp} tone="purple" sublabel={`${market.responses} responses`} onClick={() => sw.go('opportunities')} />
        <SokoMetricCard label="New Connections" value={newConnections.length} icon={UserPlus} tone="gold" sublabel="last 30 days" onClick={() => sw.go('sw-contacts')} />
      </div>

      {/* Section C — Vendor Network + D — Compliance Overview */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Section C — Vendor Network */}
        <SokoSectionCard
          title="Vendor Network"
          icon={Building2}
          action={<SokoLinkAction label="View all" onClick={() => sw.go('sw-vendors')} />}
        >
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-900 tabular-nums">{vendors.length}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Total</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-xl font-bold text-emerald-700 tabular-nums">{approvedVendors.length}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Approved</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-center">
                <p className="text-xl font-bold text-amber-700 tabular-nums">{pendingVendors.length}</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Pending</p>
              </div>
            </div>

            {/* Bar chart by category */}
            {topCategories.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">By Category</p>
                <SokoBarChart
                  data={topCategories.map(([cat, count]) => ({ label: cat, value: count, tone: 'blue' as MetricTone }))}
                />
              </div>
            )}

            {/* Recently added vendors */}
            {vendors.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Recently Added</p>
                <div className="space-y-1">
                  {vendors.slice(0, 3).map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-slate-700 truncate">{v.supplierName}</span>
                      <SokoStatusIndicator label={APPROVAL_LABEL[v.approvalStatus]} tone={APPROVAL_TONE[v.approvalStatus]} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vendors.length === 0 && (
              <SokoEmptyState
                icon={Users}
                title="No vendors yet"
                description="Add suppliers to your vendor register to start tracking approvals."
                action={<SokoActionButton label="Add Vendor" icon={UserPlus} variant="primary" onClick={() => sw.go('sw-vendors')} />}
              />
            )}
          </div>
        </SokoSectionCard>

        {/* Section D — Compliance Overview */}
        <SokoSectionCard
          title="Compliance Overview"
          icon={ShieldCheck}
          action={<SokoLinkAction label="View all" onClick={() => sw.go('sw-documents')} />}
        >
          <div className="space-y-4">
            {/* Compliance summary */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-xl font-bold text-emerald-700 tabular-nums">{complianceAccepted}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Accepted</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-xl font-bold text-blue-700 tabular-nums">{compliancePending}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Pending</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-center">
                <p className="text-xl font-bold text-amber-700 tabular-nums">{complianceMissing}</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Missing</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-center">
                <p className="text-xl font-bold text-rose-700 tabular-nums">{complianceRejected}</p>
                <p className="text-[11px] text-rose-600 mt-0.5">Rejected</p>
              </div>
            </div>

            {/* Expiring documents */}
            {expiringDocs.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Expiring Soon (30 days)</p>
                <div className="space-y-1.5">
                  {expiringDocs.slice(0, 4).map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 truncate font-medium">{d.name}</p>
                        <p className="text-[11px] text-rose-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Expires {fmtDate(d.expiry!)}
                        </p>
                      </div>
                      <SokoStatusIndicator label="Expiring" tone="critical" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-700">No documents expiring in the next 30 days.</p>
              </div>
            )}
          </div>
        </SokoSectionCard>
      </div>

      {/* Section E — Supplier Visits + F — Market Hub Activity */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Section E — Supplier Visits */}
        <SokoSectionCard
          title="Supplier Visits"
          icon={CalendarCheck}
          action={<SokoLinkAction label="View all" onClick={() => sw.go('sw-visits')} />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-xl font-bold text-blue-700 tabular-nums">{todayVisits.length}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Today</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-700 tabular-nums">{upcomingVisits.length}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Upcoming</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-xl font-bold text-emerald-700 tabular-nums">{thisMonthVisits.length}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">This Month</p>
              </div>
            </div>

            {visits.length > 0 ? (
              <div className="space-y-1">
                {visits.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate font-medium">{v.hostCompany}</p>
                      <p className="text-[11px] text-slate-400">{v.representative} · {v.purpose}</p>
                    </div>
                    <SokoStatusIndicator label={v.status} tone={visitStatusTone[v.status] ?? 'neutral'} />
                  </div>
                ))}
              </div>
            ) : (
              <SokoEmptyState
                icon={CalendarCheck}
                title="No visits scheduled"
                description="Schedule supplier site visits to track performance."
              />
            )}

            {pendingFollowUps.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 font-medium">{pendingFollowUps.length} follow-up task(s) pending</p>
              </div>
            )}
          </div>
        </SokoSectionCard>

        {/* Section F — Market Hub Activity */}
        <SokoSectionCard
          title="Market Hub Activity"
          icon={TrendingUp}
          action={<SokoLinkAction label="Explore" onClick={() => sw.go('opportunities')} />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-xl font-bold text-blue-700 tabular-nums">{market.relevantCount}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Opportunities</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-700 tabular-nums">{market.responses}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Responses</p>
              </div>
            </div>

            {market.relevant.length > 0 ? (
              <div className="space-y-1">
                {market.relevant.slice(0, 4).map((o) => (
                  <div key={o.id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate font-medium">{o.title}</p>
                      <p className="text-[11px] text-slate-400">{o.type} · {o.location}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            ) : (
              <SokoEmptyState
                icon={Inbox}
                title="No matching opportunities"
                description="Check Market Hub for new procurement opportunities."
              />
            )}
          </div>
        </SokoSectionCard>
      </div>

      {/* Section G — Recent Activity + H — Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Section G — Recent Activity (spans 2 cols) */}
        <div className="lg:col-span-2">
          <SokoSectionCard
            title="Recent Activity"
            icon={Activity}
          >
            {activityItems.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {activityItems.map((item) => (
                  <SokoActivityItem key={item.id} {...item} />
                ))}
              </div>
            ) : (
              <SokoEmptyState
                icon={Activity}
                title="No recent activity"
                description="Actions taken by your team will appear here."
              />
            )}
          </SokoSectionCard>
        </div>

        {/* Section H — Quick Actions */}
        <SokoSectionCard
          title="Quick Actions"
          icon={Sparkles}
        >
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => sw.go(a.tab)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center">{a.label}</span>
                </button>
              );
            })}
          </div>
        </SokoSectionCard>
      </div>

      {/* Product Discovery row */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Saved Products */}
        <SokoSectionCard
          title="Saved Products"
          icon={Package}
          action={<SokoLinkAction label="Discover" onClick={() => sw.go('sw-products')} />}
        >
          {savedProducts.length > 0 ? (
            <div className="space-y-1">
              {savedProducts.slice(0, 4).map((s) => {
                const p = store.products.find((pr) => pr.id === s.productId);
                if (!p) return null;
                const supplier = store.companies.find((c) => c.id === p.companyId);
                return (
                  <div key={s.id} className="py-2 border-b border-slate-50 last:border-0">
                    <p className="text-sm text-slate-800 truncate font-medium">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{supplier?.profile.tradingName ?? 'Unknown'} · {p.category}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <SokoEmptyState
              icon={Package}
              title="No saved products"
              description="Discover and save products from the Product Discovery page."
            />
          )}
        </SokoSectionCard>

        {/* Recently Viewed */}
        <SokoSectionCard
          title="Recently Viewed"
          icon={Eye}
        >
          {recentViews.length > 0 ? (
            <div className="space-y-1">
              {recentViews.map((r) => {
                const p = store.products.find((pr) => pr.id === r.productId);
                if (!p) return null;
                const supplier = store.companies.find((c) => c.id === p.companyId);
                return (
                  <div key={r.id} className="py-2 border-b border-slate-50 last:border-0">
                    <p className="text-sm text-slate-800 truncate font-medium">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{supplier?.profile.tradingName ?? 'Unknown'} · {fmtDate(r.at)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <SokoEmptyState
              icon={Eye}
              title="No recently viewed"
              description="Products you browse will appear here for quick access."
            />
          )}
        </SokoSectionCard>

        {/* Popular Categories */}
        <SokoSectionCard
          title="Popular Categories"
          icon={TrendingUp}
          action={<SokoLinkAction label="Browse all" onClick={() => sw.go('sw-products')} />}
        >
          {popularCats.length > 0 ? (
            <div className="space-y-1">
              {popularCats.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-700">{cat}</span>
                  <span className="text-xs font-semibold text-slate-900 tabular-nums">{count} products</span>
                </div>
              ))}
            </div>
          ) : (
            <SokoEmptyState
              icon={TrendingUp}
              title="No categories"
              description="Product categories will appear here once available."
            />
          )}
        </SokoSectionCard>
      </div>

      <div className="mt-2">
        <DemoNote>Dashboard metrics are derived from simulated demo data. Vendor approvals and SOKO verification are independent processes.</DemoNote>
      </div>
    </div>
  );
};
