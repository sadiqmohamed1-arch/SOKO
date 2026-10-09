import { useMemo } from 'react';
import { SW } from './SupplierShared';
import { SupplierVisit, VendorApprovalStatus, VendorDocStatus, VendorRecord } from '../../data/supplierTypes';
import { marketSnapshot } from '../../data/supplierMarket';
import { listOpportunities, loadMarketStore } from '../../data/marketHubService';

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const daysFrom = (today: Date, iso: string) => Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(today).getTime()) / DAY);

export const PIPELINE_ORDER: VendorApprovalStatus[] = ['not-reviewed', 'under-review', 'conditionally-approved', 'approved', 'rejected', 'suspended'];
const IN_PROGRESS: VendorApprovalStatus[] = ['not-reviewed', 'under-review', 'conditionally-approved'];
const UPCOMING_VISIT = ['scheduled', 'pending-confirmation'];

export type ActionGroup = 'approvals' | 'compliance' | 'visits';
export type ActionKind = 'vendor-review' | 'doc-review' | 'doc-missing' | 'doc-expiring' | 'visit-confirm' | 'visit-upcoming';

export interface ActionItem {
  id: string;
  kind: ActionKind;
  group: ActionGroup;
  title: string;
  detail: string;
  due: string;
  urgent: boolean;
  sortDays: number;
  tab: string;
}

export interface ExpiringItem {
  id: string;
  supplier: string;
  name: string;
  days: number;
}

export interface VendorProgress {
  vendor: VendorRecord;
  accepted: number;
  requested: number;
}

const dueLabel = (days: number) => (days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`);

export const useContractorDashboardData = (sw: SW) => {
  const { company, store } = sw;
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);

  return useMemo(() => {
    const today = new Date();
    const companyName = (id?: string) => store.companies.find((c) => c.id === id)?.profile.tradingName;

    const vendors = store.vendorRecords.filter((v) => v.companyId === company.id);
    const statusCount = (s: VendorApprovalStatus) => vendors.filter((v) => v.approvalStatus === s).length;
    const pendingVendors = vendors.filter((v) => IN_PROGRESS.includes(v.approvalStatus));
    const linkedVendors = vendors.filter((v) => !v.external);

    const complianceDocs = store.vendorComplianceDocs.filter((d) => d.companyId === company.id);
    const docCount = (s: VendorDocStatus) => complianceDocs.filter((d) => d.status === s).length;
    const awaitingDocs = complianceDocs.filter((d) => d.status === 'submitted' || d.status === 'under-review');
    const missingDocs = complianceDocs.filter((d) => d.status === 'missing');
    const complianceVendorCount = new Set(complianceDocs.map((d) => d.vendorId)).size;

    const docTypes = Array.from(
      complianceDocs.reduce((m, d) => {
        const e = m.get(d.documentType) ?? { accepted: 0, total: 0 };
        e.total += 1;
        if (d.status === 'accepted') e.accepted += 1;
        return m.set(d.documentType, e);
      }, new Map<string, { accepted: number; total: number }>())
    ).map(([type, v]) => ({ type, ...v }));

    const vendorProgress: VendorProgress[] = pendingVendors.map((vendor) => {
      const docs = complianceDocs.filter((d) => d.vendorId === vendor.id);
      return { vendor, accepted: docs.filter((d) => d.status === 'accepted').length, requested: docs.length };
    });

    const categories = Array.from(
      vendors.reduce((m, v) => m.set(v.tradeCategory, (m.get(v.tradeCategory) ?? 0) + 1), new Map<string, number>())
    ).sort((a, b) => b[1] - a[1]);
    const singleSource = categories.filter(([, n]) => n === 1).map(([c]) => c);

    const linkedIds = vendors.filter((v) => v.supplierCompanyId).map((v) => v.supplierCompanyId!);
    const seen = new Set<string>();
    const expiring: ExpiringItem[] = [
      ...store.documents
        .filter((d) => linkedIds.includes(d.companyId) && d.expiry && d.shares.some((s) => s.company === company.profile.tradingName))
        .map((d) => ({ id: d.id, supplier: companyName(d.companyId) ?? 'Supplier', name: d.name, days: daysFrom(today, d.expiry!) })),
      ...complianceDocs
        .filter((d) => d.expiryDate && d.status !== 'missing')
        .map((d) => ({ id: d.id, supplier: d.supplierName, name: d.documentType, days: daysFrom(today, d.expiryDate!) })),
    ]
      .filter((e) => e.days <= 30)
      .filter((e) => {
        const key = `${e.supplier}|${e.name}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.days - b.days);

    const visits = store.visits.filter((v) => v.companyId === company.id || v.hostCompanyId === company.id);
    const counterpart = (v: SupplierVisit) => (v.hostCompanyId === company.id ? companyName(v.companyId) ?? v.representative : v.hostCompany);
    const upcomingVisits = visits
      .filter((v) => UPCOMING_VISIT.includes(v.status) && daysFrom(today, v.date) >= 0)
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date < b.date ? -1 : 1));
    const todayVisits = visits.filter((v) => daysFrom(today, v.date) === 0 && v.status !== 'cancelled');
    const monthVisits = visits.filter((v) => {
      const d = new Date(v.date);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    const markedDays = new Set(monthVisits.filter((v) => v.status !== 'cancelled' && v.status !== 'declined').map((v) => v.date.slice(0, 10)));

    const actions: ActionItem[] = [
      ...pendingVendors.map((v) => {
        const waited = Math.max(0, -daysFrom(today, v.addedAt));
        return {
          id: `a-${v.id}`, kind: 'vendor-review' as const, group: 'approvals' as const,
          title: `Review ${v.supplierName}`, detail: `Vendor approval · ${v.tradeCategory}`,
          due: `${waited}d waiting`, urgent: false, sortDays: 30 - waited, tab: 'sw-vendors',
        };
      }),
      ...awaitingDocs.map((d) => ({
        id: `a-${d.id}`, kind: 'doc-review' as const, group: 'compliance' as const,
        title: `Review ${d.documentType}`, detail: `${d.supplierName} · ${d.status === 'submitted' ? 'Submitted' : 'Under review'}`,
        due: 'Review', urgent: false, sortDays: 20, tab: 'sw-documents',
      })),
      ...missingDocs.map((d) => ({
        id: `a-${d.id}`, kind: 'doc-missing' as const, group: 'compliance' as const,
        title: `Follow up ${d.documentType}`, detail: `${d.supplierName} · Not submitted`,
        due: 'Missing', urgent: false, sortDays: 25, tab: 'sw-documents',
      })),
      ...expiring.map((e) => ({
        id: `a-exp-${e.id}`, kind: 'doc-expiring' as const, group: 'compliance' as const,
        title: `${e.name} ${e.days < 0 ? 'expired' : 'expiring'}`, detail: `${e.supplier} · Request renewal`,
        due: e.days < 0 ? 'Expired' : dueLabel(e.days), urgent: e.days <= 7, sortDays: e.days, tab: 'sw-documents',
      })),
      ...upcomingVisits.filter((v) => daysFrom(today, v.date) <= 7).map((v) => {
        const days = daysFrom(today, v.date);
        const needsConfirm = v.status === 'pending-confirmation' && v.hostCompanyId === company.id;
        return {
          id: `a-${v.id}`, kind: needsConfirm ? 'visit-confirm' as const : 'visit-upcoming' as const, group: 'visits' as const,
          title: needsConfirm ? `Confirm visit from ${counterpart(v)}` : `Visit with ${counterpart(v)}`,
          detail: `${v.purpose} · ${v.time}`, due: dueLabel(days), urgent: days <= 1, sortDays: days, tab: 'sw-visits',
        };
      }),
    ].sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.sortDays - b.sortDays);

    const marketStore = loadMarketStore();
    const openOpps = listOpportunities(marketStore, market.actor).filter((o) => o.status === 'open' && !o.isMine);
    const weeks = 12;
    const weekly = Array.from({ length: weeks }, (_, i) => {
      const end = today.getTime() - (weeks - 1 - i) * 7 * DAY;
      const start = end - 7 * DAY;
      return openOpps.filter((o) => {
        const t = new Date(o.postedAt).getTime();
        return t > start && t <= end;
      }).length;
    });

    const contactsCount = store.contacts.filter((c) => c.companyId === company.id).length;
    const newConnections = store.contacts.filter((c) => c.companyId === company.id && new Date(c.at) > new Date(today.getTime() - 30 * DAY)).length;

    const productInfo = (productId: string) => {
      const p = store.products.find((pr) => pr.id === productId);
      return p ? { product: p, supplier: companyName(p.companyId) ?? 'Unknown supplier' } : null;
    };
    const savedProducts = store.savedProducts.filter((s) => s.companyId === company.id).slice(0, 4);
    const recentProducts = store.recentlyViewedProducts.filter((r) => r.companyId === company.id).slice(0, 4);
    const marketProducts = store.products.filter((p) => p.status === 'active' && p.companyId !== company.id);
    const popularCategories = Array.from(
      marketProducts.reduce((m, p) => m.set(p.category, (m.get(p.category) ?? 0) + 1), new Map<string, number>())
    ).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const audit = store.audit.filter((a) => a.companyId === company.id).slice(0, 6);

    const acceptedDocs = docCount('accepted');
    const acceptance = complianceDocs.length ? { accepted: acceptedDocs, total: complianceDocs.length, pct: Math.round((acceptedDocs / complianceDocs.length) * 100) } : null;

    const pendingWaits = pendingVendors
      .map((v) => ({ vendor: v, days: Math.max(0, -daysFrom(today, v.addedAt)) }))
      .sort((a, b) => b.days - a.days);
    const avgPendingWait = pendingWaits.length ? Math.round(pendingWaits.reduce((s, w) => s + w.days, 0) / pendingWaits.length) : null;

    const approved = vendors.filter((v) => v.approvalStatus === 'approved');
    const notApproved = vendors.filter((v) => v.approvalStatus !== 'approved');
    const verificationMatrix = {
      verifiedApproved: approved.filter((v) => v.sokoVerified),
      verifiedNotApproved: notApproved.filter((v) => v.sokoVerified),
      unverifiedApproved: approved.filter((v) => !v.sokoVerified),
      unverifiedNotApproved: notApproved.filter((v) => !v.sokoVerified),
    };
    const verifiedPending = pendingVendors.filter((v) => v.sokoVerified);
    const externalVendors = vendors.filter((v) => v.external);

    const visitStatus = {
      scheduled: visits.filter((v) => v.status === 'scheduled').length,
      pendingConfirmation: visits.filter((v) => v.status === 'pending-confirmation').length,
      checkedIn: visits.filter((v) => v.status === 'checked-in' || v.status === 'in-meeting').length,
      completed: visits.filter((v) => v.status === 'completed').length,
    };

    return {
      today, market, vendors, statusCount, pendingVendors, linkedVendors, vendorProgress, categories, singleSource,
      approved, acceptance, pendingWaits, avgPendingWait, verificationMatrix, verifiedPending, externalVendors, visitStatus,
      complianceDocs, docCount, docTypes, complianceVendorCount, awaitingDocs, missingDocs, expiring,
      visits, upcomingVisits, todayVisits, monthVisits, markedDays, counterpart,
      actions, weekly, contactsCount, newConnections,
      productInfo, savedProducts, recentProducts, marketProducts, popularCategories, audit,
    };
  }, [company, store, market]);
};

export type ContractorDashboardData = ReturnType<typeof useContractorDashboardData>;
