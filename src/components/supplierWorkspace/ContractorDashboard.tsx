import React, { useMemo } from 'react';
import {
  ShieldCheck, Users, FileWarning, CalendarCheck,
  UserPlus, FolderLock, Search,
} from 'lucide-react';
import { SW, VerificationBadge, CompanyLogo, Card, PageHeader } from './SupplierShared';
import { KpiCard, DemoNote, Field, fmtDate } from '../marketHub/MarketHubShared';
import { StatusPill, btnPrimary, btnGhost } from '../NetworkShared';
import { VendorApprovalStatus } from '../../data/supplierTypes';
import { marketSnapshot } from '../../data/supplierMarket';

const APPROVAL_LABELS: Record<VendorApprovalStatus, string> = {
  'not-reviewed': 'Not Reviewed',
  'under-review': 'Under Review',
  'approved': 'Approved',
  'conditionally-approved': 'Conditionally Approved',
  'rejected': 'Rejected',
  'suspended': 'Suspended',
};

export const ContractorDashboard: React.FC<{ sw: SW }> = ({ sw }) => {
  const { company, store, members } = sw;
  const vendors = store.vendorRecords.filter((v) => v.companyId === company.id);
  const visits = store.visits.filter((v) => v.companyId === company.id || v.hostCompanyId === company.id);
  const audit = store.audit.filter((a) => a.companyId === company.id).slice(0, 8);
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);

  const approvedVendors = vendors.filter((v) => v.approvalStatus === 'approved');
  const pendingVendors = vendors.filter((v) => v.approvalStatus === 'under-review' || v.approvalStatus === 'conditionally-approved' || v.approvalStatus === 'not-reviewed');
  const externalVendors = vendors.filter((v) => v.external);

  // Expiring documents from linked suppliers
  const linkedSupplierIds = vendors.filter((v) => v.supplierCompanyId).map((v) => v.supplierCompanyId!);
  const today = new Date();
  const expiringDocs = store.documents.filter((d) =>
    linkedSupplierIds.includes(d.companyId) &&
    d.expiry &&
    d.shares.some((s) => s.company === company.profile.tradingName) &&
    new Date(d.expiry) < new Date(today.getTime() + 30 * 86400000)
  );

  // Visit stats
  const now = new Date();
  const thisMonthVisits = visits.filter((v) => {
    const d = new Date(v.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const todayVisits = visits.filter((v) => v.date === now.toISOString().slice(0, 10));
  const upcomingVisits = visits.filter((v) => v.status === 'scheduled');
  const completedVisits = visits.filter((v) => v.status === 'completed');

  // New connections (contacts added in last 30 days)
  const newConnections = store.contacts.filter((c) => c.companyId === company.id && new Date(c.at) > new Date(today.getTime() - 30 * 86400000));

  // Category breakdown
  const categoryMap = new Map<string, number>();
  vendors.forEach((v) => {
    categoryMap.set(v.tradeCategory, (categoryMap.get(v.tradeCategory) || 0) + 1);
  });
  const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Pending follow-ups
  const side = company.kind === 'contractor' ? 'contractor' : 'supplier';
  const pendingFollowUps = store.visitTasks.filter((t) => t.companyId === company.id && t.side === side && t.status !== 'completed');

  const quickActions = [
    { label: 'Add Vendor', icon: UserPlus, tab: 'sw-vendors', can: sw.can('contacts.manage') },
    { label: 'Search Suppliers', icon: Search, tab: 'sw-products', can: true },
    { label: 'View Visits', icon: CalendarCheck, tab: 'sw-visits', can: true },
    { label: 'Review Documents', icon: FolderLock, tab: 'sw-documents', can: true },
  ].filter((a) => a.can);

  return (
    <div>
      <PageHeader eyebrow="Contractor Workspace" title={`${company.profile.tradingName} — Supplier Intelligence Overview`} subtitle="Manage your supplier network, monitor visits, track compliance and discover market opportunities." />

      {/* Hero */}
      <div className="rounded-2xl bg-slate-900 text-white p-5 mb-6 flex items-center gap-4">
        <CompanyLogo company={company} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold">{company.profile.tradingName}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">{company.sokoId}</span>
            <VerificationBadge company={company} />
          </div>
          <p className="text-xs text-slate-400 mt-1">{company.profile.types.join(' · ')} · {company.profile.emirate}</p>
          <p className="text-xs text-slate-400">{company.profile.description.slice(0, 120)}…</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Total Vendors" value={vendors.length} />
        <KpiCard label="Approved" value={approvedVendors.length} />
        <KpiCard label="Pending Reviews" value={pendingVendors.length} />
        <KpiCard label="Expiring Docs" value={expiringDocs.length} />
        <KpiCard label="Visits This Month" value={thisMonthVisits.length} />
        <KpiCard label="New Connections" value={newConnections.length} />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Vendor Network Overview */}
        <Card title="Vendor Network" action={<button type="button" onClick={() => sw.go('sw-vendors')} className="text-xs text-blue-700 font-semibold hover:underline">View all</button>}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-lg font-bold text-slate-900">{vendors.length}</p>
                <p className="text-[10px] text-slate-500">Total</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2">
                <p className="text-lg font-bold text-emerald-700">{approvedVendors.length}</p>
                <p className="text-[10px] text-emerald-600">Approved</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2">
                <p className="text-lg font-bold text-amber-700">{pendingVendors.length}</p>
                <p className="text-[10px] text-amber-600">Pending</p>
              </div>
            </div>
            {categories.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5">By Category</p>
                {categories.map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-700">{cat}</span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            )}
            {vendors.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Recently Added</p>
                {vendors.slice(0, 3).map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-700 truncate">{v.supplierName}</span>
                    <span className="text-slate-400 text-[10px]">{fmtDate(v.addedAt)}</span>
                  </div>
                ))}
              </div>
            )}
            {vendors.length === 0 && <p className="text-xs text-slate-500">No vendors yet. Add suppliers to your register.</p>}
          </div>
        </Card>

        {/* Supplier Visits */}
        <Card title="Supplier Visits" action={<button type="button" onClick={() => sw.go('sw-visits')} className="text-xs text-blue-700 font-semibold hover:underline">View all</button>}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-blue-50 p-2">
                <p className="text-lg font-bold text-blue-700">{todayVisits.length}</p>
                <p className="text-[10px] text-blue-600">Today</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-lg font-bold text-slate-700">{upcomingVisits.length}</p>
                <p className="text-[10px] text-slate-500">Upcoming</p>
              </div>
            </div>
            {visits.slice(0, 4).map((v) => (
              <div key={v.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-slate-800 truncate font-medium">{v.hostCompany}</p>
                  <p className="text-[10px] text-slate-400">{v.representative} · {v.purpose}</p>
                </div>
                <StatusPill tone={v.status === 'completed' ? 'slate' : 'blue'}>{v.status}</StatusPill>
              </div>
            ))}
            {visits.length === 0 && <p className="text-xs text-slate-500">No visits scheduled.</p>}
            {pendingFollowUps.length > 0 && (
              <p className="text-xs text-amber-700 font-semibold pt-1">{pendingFollowUps.length} follow-up task(s) pending</p>
            )}
          </div>
        </Card>

        {/* Document Compliance */}
        <Card title="Document Compliance" action={<button type="button" onClick={() => sw.go('sw-documents')} className="text-xs text-blue-700 font-semibold hover:underline">View all</button>}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-rose-50 p-2">
                <p className="text-lg font-bold text-rose-700">{expiringDocs.length}</p>
                <p className="text-[10px] text-rose-600">Expiring</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-lg font-bold text-slate-700">{externalVendors.length}</p>
                <p className="text-[10px] text-slate-500">External Vendors</p>
              </div>
            </div>
            {expiringDocs.length > 0 ? (
              expiringDocs.slice(0, 4).map((d) => (
                <div key={d.id} className="text-xs py-1.5 border-b border-slate-50 last:border-0">
                  <p className="text-slate-800 truncate">{d.name}</p>
                  <p className="text-[10px] text-rose-500">Expires {fmtDate(d.expiry!)}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No expiring documents from linked suppliers.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Market Hub + Recent Activity + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Market Hub */}
        <Card title="Market Hub" action={<button type="button" onClick={() => sw.go('opportunities')} className="text-xs text-blue-700 font-semibold hover:underline">Explore</button>}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-blue-50 p-2">
                <p className="text-lg font-bold text-blue-700">{market.relevantCount}</p>
                <p className="text-[10px] text-blue-600">Opportunities</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-lg font-bold text-slate-700">{market.responses}</p>
                <p className="text-[10px] text-slate-500">Responses</p>
              </div>
            </div>
            {market.relevant.slice(0, 3).map((o) => (
              <div key={o.id} className="text-xs py-1.5 border-b border-slate-50 last:border-0">
                <p className="text-slate-800 truncate font-medium">{o.title}</p>
                <p className="text-[10px] text-slate-400">{o.type} · {o.location}</p>
              </div>
            ))}
            {market.relevant.length === 0 && <p className="text-xs text-slate-500">No matching opportunities.</p>}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity">
          <div className="space-y-2">
            {audit.map((a) => (
              <div key={a.id} className="text-xs py-1.5 border-b border-slate-50 last:border-0">
                <p className="text-slate-800">{a.action}</p>
                <p className="text-[10px] text-slate-400">{a.actor} · {fmtDate(a.at)}</p>
              </div>
            ))}
            {audit.length === 0 && <p className="text-xs text-slate-500">No recent activity.</p>}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button key={a.label} type="button" onClick={() => sw.go(a.tab)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                  <Icon className="w-5 h-5 text-blue-700" />
                  <span className="text-xs font-semibold text-slate-700 text-center">{a.label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <DemoNote>Dashboard metrics are derived from simulated demo data. Vendor approvals and SOKO verification are independent processes.</DemoNote>
      </div>
    </div>
  );
};
