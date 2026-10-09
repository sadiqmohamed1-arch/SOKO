import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { Lightbulb, Users, ShieldCheck, CalendarCheck, TrendingUp, FileWarning, Bookmark } from 'lucide-react';
import { marketSnapshot } from '../../data/supplierMarket';
import { companyById, documentsOf } from '../../data/supplierStore';
import { VendorApprovalStatus, VendorRecord } from '../../data/supplierTypes';
import { DemoNote, EmptyState, KpiCard, ProgressRow, fmtDate } from '../marketHub/MarketHubShared';
import { Card, PageHeader, SW } from './SupplierShared';

const axis = { fontSize: 11, fill: '#64748b' };

const APPROVAL_LABELS: Record<VendorApprovalStatus, string> = {
  'not-reviewed': 'Not Reviewed',
  'under-review': 'Under Review',
  'approved': 'Approved',
  'conditionally-approved': 'Conditionally Approved',
  'rejected': 'Rejected',
  'suspended': 'Suspended',
};

const APPROVAL_COLORS: Record<VendorApprovalStatus, string> = {
  'approved': '#059669',
  'under-review': '#2563eb',
  'not-reviewed': '#94a3b8',
  'conditionally-approved': '#d97706',
  'rejected': '#dc2626',
  'suspended': '#7c3aed',
};

const daysUntil = (iso?: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : undefined);

export const ContractorIntelligence: React.FC<{ sw: SW }> = ({ sw }) => {
  const { store, company } = sw;
  const vendors = store.vendorRecords.filter((v) => v.companyId === company.id);
  const visits = store.visits.filter((v) => v.companyId === company.id || v.hostCompanyId === company.id);
  const audit = store.audit.filter((a) => a.companyId === company.id);
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);

  // Vendor Network Overview
  const linkedVendors = vendors.filter((v) => v.supplierCompanyId);
  const externalVendors = vendors.filter((v) => v.external);
  const now = new Date();
  const newThisMonth = vendors.filter((v) => new Date(v.addedAt).getMonth() === now.getMonth() && new Date(v.addedAt).getFullYear() === now.getFullYear());
  const categoryMap = new Map<string, number>();
  vendors.forEach((v) => categoryMap.set(v.tradeCategory, (categoryMap.get(v.tradeCategory) ?? 0) + 1));
  const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);
  const locationMap = new Map<string, number>();
  vendors.forEach((v) => locationMap.set(v.location, (locationMap.get(v.location) ?? 0) + 1));
  const locations = Array.from(locationMap.entries()).sort((a, b) => b[1] - a[1]);

  // Vendor Approval Intelligence
  const approvalCounts: Record<VendorApprovalStatus, number> = {
    'approved': 0, 'under-review': 0, 'not-reviewed': 0, 'conditionally-approved': 0, 'rejected': 0, 'suspended': 0,
  };
  vendors.forEach((v) => { approvalCounts[v.approvalStatus]++; });
  const pendingEvaluations = approvalCounts['under-review'] + approvalCounts['not-reviewed'] + approvalCounts['conditionally-approved'];

  // Vendor Compliance — only documents GEC owns or is authorized to access
  const linkedSupplierIds = linkedVendors.map((v) => v.supplierCompanyId!);
  const accessibleDocs = store.documents.filter((d) =>
    !d.archived && (
      d.companyId === company.id ||
      (linkedSupplierIds.includes(d.companyId) && d.shares.some((s) => s.company === company.profile.tradingName)) ||
      (linkedSupplierIds.includes(d.companyId) && d.visibility === 'public')
    )
  );
  const docsValid = accessibleDocs.filter((d) => {
    const days = daysUntil(d.expiry);
    return days === undefined || days > 90;
  });
  const docsExpiring30 = accessibleDocs.filter((d) => { const n = daysUntil(d.expiry); return n !== undefined && n >= 0 && n <= 30; });
  const docsExpiring60 = accessibleDocs.filter((d) => { const n = daysUntil(d.expiry); return n !== undefined && n > 30 && n <= 60; });
  const docsExpiring90 = accessibleDocs.filter((d) => { const n = daysUntil(d.expiry); return n !== undefined && n > 60 && n <= 90; });
  const docsExpired = accessibleDocs.filter((d) => { const n = daysUntil(d.expiry); return n !== undefined && n < 0; });
  const docsExpiringSoon = [...docsExpiring30, ...docsExpiring60, ...docsExpiring90];

  // Compliance by vendor
  const vendorCompliance = linkedVendors.map((v) => {
    const supplier = companyById(store, v.supplierCompanyId!);
    const vDocs = accessibleDocs.filter((d) => d.companyId === v.supplierCompanyId);
    const expired = vDocs.filter((d) => { const n = daysUntil(d.expiry); return n !== undefined && n < 0; }).length;
    const expiring = vDocs.filter((d) => { const n = daysUntil(d.expiry); return n !== undefined && n >= 0 && n <= 90; }).length;
    const total = vDocs.length;
    return { vendor: v, supplierName: supplier?.profile.tradingName ?? v.supplierName, total, expired, expiring, status: expired > 0 ? 'expired' : expiring > 0 ? 'expiring' : total > 0 ? 'valid' : 'none' };
  });

  // Supplier Visit Intelligence
  const upcomingVisits = visits.filter((v) => v.status === 'scheduled' || v.status === 'pending-confirmation');
  const completedVisits = visits.filter((v) => v.status === 'completed');
  const pendingConfirmations = visits.filter((v) => v.status === 'pending-confirmation');
  const visitByCategory = new Map<string, number>();
  visits.forEach((v) => {
    const vendor = vendors.find((vd) => vd.supplierName === v.hostCompany || vd.supplierName === v.representative);
    const cat = vendor?.tradeCategory ?? 'Other';
    visitByCategory.set(cat, (visitByCategory.get(cat) ?? 0) + 1);
  });
  const visitCategories = Array.from(visitByCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const repeatVisits = visits.filter((v) => {
    const sameVendor = visits.filter((x) => x.hostCompany === v.hostCompany && x.status === 'completed');
    return sameVendor.length > 1 && v.id === sameVendor[0]?.id;
  });
  const pendingFollowUps = store.visitTasks.filter((t) => t.companyId === company.id && t.side === 'contractor' && t.status !== 'completed');

  // Sourcing Intelligence
  const savedProducts = store.savedProducts.filter((s) => s.companyId === company.id);
  const savedProductsWithData = savedProducts.map((s) => {
    const p = store.products.find((pr) => pr.id === s.productId);
    const supplier = p ? companyById(store, p.companyId) : undefined;
    return { saved: s, product: p, supplierName: supplier?.profile.tradingName, category: p?.category };
  }).filter((x) => x.product);
  const savedCategories = new Map<string, number>();
  savedProductsWithData.forEach((s) => { if (s.category) savedCategories.set(s.category, (savedCategories.get(s.category) ?? 0) + 1); });
  const coverageGaps = categories.filter(([cat, count]) => count <= 1).map(([cat]) => cat);

  // Recommended Actions — generated from actual data only
  const recs: { icon: React.FC<{ className?: string }>; text: string; action?: string }[] = [];
  if (approvalCounts['under-review'] > 0 || approvalCounts['not-reviewed'] > 0) {
    recs.push({ icon: Users, text: `${approvalCounts['under-review'] + approvalCounts['not-reviewed']} vendor${approvalCounts['under-review'] + approvalCounts['not-reviewed'] > 1 ? 's' : ''} awaiting approval review.`, action: 'sw-vendors' });
  }
  if (pendingConfirmations.length > 0) {
    recs.push({ icon: CalendarCheck, text: `${pendingConfirmations.length} supplier visit${pendingConfirmations.length > 1 ? 's' : ''} pending confirmation.`, action: 'sw-visits' });
  }
  if (docsExpiringSoon.length > 0 || docsExpired.length > 0) {
    recs.push({ icon: FileWarning, text: `${docsExpired.length} expired and ${docsExpiringSoon.length} expiring compliance document${docsExpiringSoon.length + docsExpired.length > 1 ? 's' : ''} need attention.`, action: 'sw-documents' });
  }
  if (market.responses > 0) {
    recs.push({ icon: TrendingUp, text: `${market.responses} supplier response${market.responses > 1 ? 's' : ''} from Market Hub opportunities.`, action: 'opportunities' });
  }
  if (coverageGaps.length > 0) {
    recs.push({ icon: Bookmark, text: `Limited supplier coverage in: ${coverageGaps.slice(0, 3).join(', ')}. Consider discovering more suppliers.`, action: 'sw-products' });
  }
  if (pendingFollowUps.length > 0) {
    recs.push({ icon: CalendarCheck, text: `${pendingFollowUps.length} visit follow-up task${pendingFollowUps.length > 1 ? 's' : ''} still pending.`, action: 'sw-visits' });
  }

  const approvalChartData = (Object.keys(approvalCounts) as VendorApprovalStatus[])
    .filter((k) => approvalCounts[k] > 0)
    .map((k) => ({ name: APPROVAL_LABELS[k], value: approvalCounts[k], color: APPROVAL_COLORS[k] }));

  return (
    <div>
      <PageHeader eyebrow="Intelligence" title="Contractor Intelligence" subtitle="Vendor network, compliance, visits and sourcing insights for your contractor workspace." />

      {/* Vendor Network Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Vendors" value={vendors.length} />
        <KpiCard label="SOKO-Linked" value={linkedVendors.length} />
        <KpiCard label="External" value={externalVendors.length} />
        <KpiCard label="New This Month" value={newThisMonth.length} />
      </div>

      {/* Vendor Network + Approval */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card title="Vendors by Trade Category">
          {categories.length > 0 ? (
            <div className="space-y-3">
              {categories.map(([cat, count]) => (
                <ProgressRow key={cat} label={`${cat} · ${count}`} value={count} of={Math.max(1, vendors.length)} tone="blue" />
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No vendors registered yet.</p>}
        </Card>

        <Card title="Vendors by Location">
          {locations.length > 0 ? (
            <div className="space-y-3">
              {locations.map(([loc, count]) => (
                <ProgressRow key={loc} label={`${loc} · ${count}`} value={count} of={Math.max(1, vendors.length)} tone="slate" />
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No vendor locations recorded.</p>}
        </Card>

        <Card title="Vendor Approval Status">
          {vendors.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={approvalChartData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={axis} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Vendors" radius={[0, 4, 4, 0]}>
                      {approvalChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 p-1.5"><p className="text-sm font-bold text-emerald-700">{approvalCounts['approved']}</p><p className="text-[9px] text-emerald-600">Approved</p></div>
                <div className="rounded-lg bg-amber-50 p-1.5"><p className="text-sm font-bold text-amber-700">{pendingEvaluations}</p><p className="text-[9px] text-amber-600">Pending</p></div>
                <div className="rounded-lg bg-rose-50 p-1.5"><p className="text-sm font-bold text-rose-700">{approvalCounts['rejected'] + approvalCounts['suspended']}</p><p className="text-[9px] text-rose-600">Rejected/Suspended</p></div>
              </div>
            </>
          ) : <p className="text-sm text-slate-500">No vendors to analyze.</p>}
        </Card>
      </div>

      {/* Vendor Compliance */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card title="Compliance Summary" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-slate-500">Documents tracked</dt><dd className="text-lg font-semibold text-slate-900 tabular-nums">{accessibleDocs.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Valid</dt><dd className="text-lg font-semibold text-emerald-700 tabular-nums">{docsValid.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Expiring (30d)</dt><dd className="text-lg font-semibold text-amber-700 tabular-nums">{docsExpiring30.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Expiring (60d)</dt><dd className="text-lg font-semibold text-amber-600 tabular-nums">{docsExpiring60.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Expiring (90d)</dt><dd className="text-lg font-semibold text-amber-500 tabular-nums">{docsExpiring90.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Expired</dt><dd className="text-lg font-semibold text-rose-700 tabular-nums">{docsExpired.length}</dd></div>
          </div>
          {accessibleDocs.length === 0 && <p className="mt-3 text-sm text-slate-500">No authorized compliance documents yet. Shared supplier documents will appear here.</p>}
        </Card>

        <Card title="Compliance by Vendor" className="lg:col-span-2">
          {vendorCompliance.length > 0 ? (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-2 font-semibold">Supplier</th>
                    <th className="px-3 py-2 font-semibold text-center">Docs</th>
                    <th className="px-3 py-2 font-semibold text-center">Expiring</th>
                    <th className="px-3 py-2 font-semibold text-center">Expired</th>
                    <th className="px-5 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorCompliance.map((vc) => (
                    <tr key={vc.vendor.id}>
                      <td className="px-5 py-2.5 text-slate-800 font-medium">{vc.supplierName}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600 tabular-nums">{vc.total}</td>
                      <td className="px-3 py-2.5 text-center text-amber-700 tabular-nums">{vc.expiring}</td>
                      <td className="px-3 py-2.5 text-center text-rose-700 tabular-nums">{vc.expired}</td>
                      <td className="px-5 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          vc.status === 'valid' ? 'bg-emerald-50 text-emerald-700' :
                          vc.status === 'expiring' ? 'bg-amber-50 text-amber-700' :
                          vc.status === 'expired' ? 'bg-rose-50 text-rose-700' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {vc.status === 'valid' ? 'Compliant' : vc.status === 'expiring' ? 'Action Needed' : vc.status === 'expired' ? 'Non-Compliant' : 'No Docs'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-500">No linked suppliers with shared documents.</p>}
        </Card>
      </div>

      {/* Visit Intelligence + Sourcing */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card title="Visit Intelligence">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-slate-500">Total Visits</dt><dd className="text-lg font-semibold text-slate-900 tabular-nums">{visits.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Upcoming</dt><dd className="text-lg font-semibold text-blue-700 tabular-nums">{upcomingVisits.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Completed</dt><dd className="text-lg font-semibold text-emerald-700 tabular-nums">{completedVisits.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Pending Confirm.</dt><dd className="text-lg font-semibold text-amber-700 tabular-nums">{pendingConfirmations.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Repeat Visits</dt><dd className="text-lg font-semibold text-slate-900 tabular-nums">{repeatVisits.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Follow-up Tasks</dt><dd className="text-lg font-semibold text-amber-700 tabular-nums">{pendingFollowUps.length}</dd></div>
          </div>
          {visitCategories.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5">By Category</p>
              <div className="space-y-1.5">
                {visitCategories.map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{cat}</span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {visits.length === 0 && <p className="mt-2 text-sm text-slate-500">No visits recorded.</p>}
          <button type="button" onClick={() => sw.go('sw-visits')} className="mt-3 text-sm font-semibold text-blue-700 hover:underline cursor-pointer">View all visits</button>
        </Card>

        <Card title="Sourcing Intelligence">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-slate-500">Market Hub Opportunities</dt><dd className="text-lg font-semibold text-slate-900 tabular-nums">{market.relevantCount}</dd></div>
            <div><dt className="text-xs text-slate-500">Supplier Responses</dt><dd className="text-lg font-semibold text-blue-700 tabular-nums">{market.responses}</dd></div>
            <div><dt className="text-xs text-slate-500">Saved Products</dt><dd className="text-lg font-semibold text-slate-900 tabular-nums">{savedProducts.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Active Campaigns</dt><dd className="text-lg font-semibold text-slate-900 tabular-nums">{market.activeCampaigns}</dd></div>
          </div>
          {savedCategories.size > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Saved by Category</p>
              <div className="space-y-1.5">
                {Array.from(savedCategories.entries()).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{cat}</span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {coverageGaps.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-semibold uppercase text-amber-600 mb-1.5">Limited Coverage</p>
              <div className="flex flex-wrap gap-1.5">
                {coverageGaps.map((cat) => <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{cat}</span>)}
              </div>
            </div>
          )}
          <button type="button" onClick={() => sw.go('sw-products')} className="mt-3 text-sm font-semibold text-blue-700 hover:underline cursor-pointer">Discover products</button>
        </Card>

        <Card title="Recommended Actions">
          {recs.length > 0 ? (
            <ul className="space-y-3">
              {recs.map((r, i) => {
                const Icon = r.icon;
                return (
                  <li key={i}>
                    <button type="button" onClick={() => r.action && sw.go(r.action)} className="flex gap-2 text-sm text-slate-700 text-left w-full hover:text-slate-900 cursor-pointer">
                      <Icon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{r.text}{r.action && <span className="text-blue-600 font-semibold ml-1">Go →</span>}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> All vendor reviews, visits and compliance documents are up to date.
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card title="Recent Workspace Activity">
        <div className="space-y-2">
          {audit.slice(0, 6).map((a) => (
            <div key={a.id} className="text-xs py-1.5 border-b border-slate-50 last:border-0">
              <p className="text-slate-800">{a.action}</p>
              <p className="text-[10px] text-slate-400">{a.actor} · {fmtDate(a.at)}</p>
            </div>
          ))}
          {audit.length === 0 && <p className="text-sm text-slate-500">No recent activity.</p>}
        </div>
      </Card>

      <div className="mt-4">
        <DemoNote>Contractor Intelligence metrics are derived from your vendor register, authorized documents, shared visits and Market Hub records. No supplier-private data is exposed.</DemoNote>
      </div>
    </div>
  );
};
