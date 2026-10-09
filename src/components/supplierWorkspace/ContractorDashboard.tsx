import React, { useEffect, useMemo } from 'react';
import { UserPlus, Search, CalendarPlus, Megaphone, MapPin, Users } from 'lucide-react';
import { SW, VerificationBadge } from './SupplierShared';
import { DemoNote } from '../marketHub/MarketHubShared';
import { SokoChip, SokoKpiCell, SokoQuickActionTile, sokoCard, sokoTokens } from '../sokoDesignSystem/SokoComponents';
import { SokoSparkLine } from '../sokoDesignSystem/SokoCharts';
import { useContractorDashboardData } from './contractorDashboardData';
import {
  VendorPipelinePanel, VendorIntelligencePanel, ActionCenterPanel, CompliancePanel, VisitsPanel,
  MarketHubPanel, RecentActivityPanel, ProductDiscoveryPanel,
} from './ContractorDashboardPanels';

const DAY = 86400000;
const WEEKS = 12;

const greeting = (d: Date) => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 18 ? 'Good afternoon' : 'Good evening');

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

export const ContractorDashboard: React.FC<{ sw: SW }> = ({ sw }) => {
  const { company } = sw;
  const data = useContractorDashboardData(sw);
  const { today, vendors, pendingVendors, complianceDocs, docCount, market, weekly, actions } = data;
  const firstName = sw.user.name.split(' ')[0];

  const quickActions = [
    { label: 'Add vendor', description: 'Register a supplier', icon: UserPlus, tab: 'sw-vendors', shortcut: 'V', show: sw.can('contacts.manage'), primary: true },
    { label: 'Search suppliers', description: 'Products & companies', icon: Search, tab: 'sw-products', shortcut: 'S', show: true },
    { label: 'Schedule visit', description: 'Book a site visit', icon: CalendarPlus, tab: 'sw-visits', shortcut: 'B', show: sw.can('visits.manage') },
    { label: 'Post opportunity', description: 'Publish on Market Hub', icon: Megaphone, tab: 'opportunities', shortcut: 'P', show: true },
  ].filter((a) => a.show);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTypingTarget(e.target)) return;
      const action = quickActions.find((a) => a.shortcut.toLowerCase() === e.key.toLowerCase());
      if (action) {
        e.preventDefault();
        sw.go(action.tab);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const trends = useMemo(() => {
    const weekEnds = Array.from({ length: WEEKS }, (_, i) => today.getTime() - (WEEKS - 1 - i) * 7 * DAY);
    const addedBy = (list: typeof vendors, t: number) => list.filter((v) => new Date(v.addedAt).getTime() <= t).length;
    const approved = vendors.filter((v) => v.approvalStatus === 'approved');
    const scoreAt = (t: number) => {
      const created = complianceDocs.filter((d) => new Date(d.createdAt).getTime() <= t);
      const accepted = created.filter((d) => d.status === 'accepted' && new Date(d.reviewedAt ?? d.createdAt).getTime() <= t).length;
      return created.length ? (accepted / created.length) * 100 : 0;
    };
    const monthAgo = today.getTime() - 30 * DAY;
    const scoreNow = complianceDocs.length ? Math.round((docCount('accepted') / complianceDocs.length) * 100) : null;
    return {
      approved: approved.length,
      approvedSeries: weekEnds.map((t) => addedBy(approved, t)),
      approvedNew: approved.length - addedBy(approved, monthAgo),
      pendingSeries: weekEnds.map((t) => addedBy(pendingVendors, t)),
      pendingNew: pendingVendors.length - addedBy(pendingVendors, monthAgo),
      scoreNow,
      scoreSeries: weekEnds.map(scoreAt),
      scoreDelta: scoreNow === null ? 0 : Math.round(scoreNow - scoreAt(monthAgo)),
    };
  }, [today, vendors, pendingVendors, complianceDocs, docCount]);

  const thisWeekOpps = weekly[weekly.length - 1] ?? 0;
  const location = [company.profile.emirate, company.profile.country].filter(Boolean).join(', ');

  return (
    <div className="space-y-4">
      <section className={`${sokoCard} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.14),transparent_50%)] pointer-events-none" aria-hidden />
        <div className="relative px-6 sm:px-8 pt-7 pb-7 grid lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="min-w-0">
            <p className={sokoTokens.eyebrow}>
              Contractor workspace · {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="mt-4 text-3xl sm:text-[38px] font-semibold text-slate-900 tracking-tight leading-[1.08] text-balance">
              {greeting(today)}, {firstName}.
              <span className="block text-slate-500">
                {actions.length > 0 ? (
                  <>{company.profile.tradingName} has <span className="text-blue-600">{actions.length} {actions.length === 1 ? 'item' : 'items'}</span> needing attention.</>
                ) : (
                  <>{company.profile.tradingName} is all caught up.</>
                )}
              </span>
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <VerificationBadge company={company} />
              {location && <SokoChip icon={MapPin}>{location}</SokoChip>}
              <SokoChip icon={Users}>{sw.members.length} team {sw.members.length === 1 ? 'member' : 'members'}</SokoChip>
              <SokoChip tone="mono">{company.sokoId}</SokoChip>
            </div>
          </div>
          <div className="lg:w-[440px]">
            <p className={sokoTokens.eyebrow}>Quick actions</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickActions.map((a) => (
                <SokoQuickActionTile key={a.label} label={a.label} description={a.description} icon={a.icon} primary={a.primary} shortcut={a.shortcut} onClick={() => sw.go(a.tab)} />
              ))}
            </div>
          </div>
        </div>

        <div aria-label="Key metrics" role="group" className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-100 bg-white divide-y sm:divide-y-0 divide-slate-100 [&>*]:border-slate-100 sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0 lg:[&>*:not(:last-child)]:border-r">
          <SokoKpiCell label="Approved vendors" value={trends.approved}
            delta={trends.approvedNew > 0 ? { label: `+${trends.approvedNew}`, tone: 'up', title: 'added in the last 30 days' } : undefined}
            visual={<SokoSparkLine values={trends.approvedSeries} label="Approved vendors, last 12 weeks" />}
            onClick={() => sw.go('sw-vendors')} />
          <SokoKpiCell label="Pending approval" value={pendingVendors.length}
            delta={trends.pendingNew > 0 ? { label: `+${trends.pendingNew}`, tone: 'warn', title: 'added in the last 30 days' } : undefined}
            visual={<SokoSparkLine tone="amber" values={trends.pendingSeries} label="Vendors pending approval, last 12 weeks" />}
            onClick={() => sw.go('sw-vendors')} />
          <SokoKpiCell label="Compliance score" value={trends.scoreNow === null ? '—' : `${trends.scoreNow}%`}
            delta={trends.scoreDelta !== 0 ? { label: `${trends.scoreDelta > 0 ? '+' : ''}${trends.scoreDelta}`, tone: trends.scoreDelta > 0 ? 'up' : 'down', title: 'points vs 30 days ago' } : undefined}
            visual={<SokoSparkLine tone="green" values={trends.scoreSeries} label="Compliance score, last 12 weeks" />}
            onClick={() => sw.go('sw-documents')} />
          <SokoKpiCell label="Open opportunities" value={market.relevantCount}
            delta={thisWeekOpps > 0 ? { label: `+${thisWeekOpps}`, tone: 'up', title: 'posted this week' } : undefined}
            visual={<SokoSparkLine values={weekly} label="Opportunities posted per week, last 12 weeks" />}
            onClick={() => sw.go('opportunities')} />
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
          <VendorPipelinePanel sw={sw} data={data} />
          <VendorIntelligencePanel sw={sw} data={data} />
        </div>
        <ActionCenterPanel sw={sw} data={data} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CompliancePanel sw={sw} data={data} />
        <VisitsPanel sw={sw} data={data} />
        <div className="md:col-span-2 lg:col-span-1"><MarketHubPanel sw={sw} data={data} /></div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 min-w-0"><RecentActivityPanel sw={sw} data={data} /></div>
        <div className="lg:col-span-5 min-w-0"><ProductDiscoveryPanel sw={sw} data={data} /></div>
      </div>

      <DemoNote>Dashboard metrics are derived from simulated demo data. Vendor approvals and SOKO verification are independent processes.</DemoNote>
    </div>
  );
};
