import React, { useEffect } from 'react';
import { UserPlus, Search, CalendarPlus, Megaphone, MapPin, Users } from 'lucide-react';
import { SW, VerificationBadge } from './SupplierShared';
import { DemoNote } from '../marketHub/MarketHubShared';
import { SokoChip, SokoKpiCell, SokoProgress, SokoQuickActionTile, sokoCard, sokoTokens } from '../sokoDesignSystem/SokoComponents';
import { useContractorDashboardData } from './contractorDashboardData';
import {
  VendorPipelinePanel, VendorIntelligencePanel, ActionCenterPanel, CompliancePanel, VisitsPanel,
  MarketHubPanel, RecentActivityPanel, ProductDiscoveryPanel,
} from './ContractorDashboardPanels';

const greeting = (d: Date) => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 18 ? 'Good afternoon' : 'Good evening');

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

export const ContractorDashboard: React.FC<{ sw: SW }> = ({ sw }) => {
  const { company } = sw;
  const data = useContractorDashboardData(sw);
  const { today, vendors, approved, pendingVendors, pendingWaits, acceptance, market, actions } = data;
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

  const location = [company.profile.emirate, company.profile.country].filter(Boolean).join(', ');
  const oldestWait = pendingWaits[0];

  return (
    <div className="flex flex-col gap-4">
      <section className={`${sokoCard} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_50%)] pointer-events-none" aria-hidden />
        <div className="relative px-5 sm:px-7 pt-6 pb-6 grid lg:grid-cols-[minmax(0,1fr)_440px] gap-6 lg:gap-8 items-start">
          <div className="min-w-0">
            <p className={sokoTokens.eyebrow}>
              Contractor workspace · {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="mt-3 text-[28px] sm:text-[34px] font-semibold text-slate-900 tracking-tight leading-[1.1] text-balance">
              {greeting(today)}, {firstName}.
              <span className="block text-slate-500">
                {actions.length > 0 ? (
                  <>{company.profile.tradingName} has <span className="text-blue-600">{actions.length} {actions.length === 1 ? 'item' : 'items'}</span> needing attention.</>
                ) : (
                  <>{company.profile.tradingName} is all caught up.</>
                )}
              </span>
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <VerificationBadge company={company} />
              {location && <SokoChip icon={MapPin}>{location}</SokoChip>}
              <SokoChip icon={Users}>{sw.members.length} team {sw.members.length === 1 ? 'member' : 'members'}</SokoChip>
              <SokoChip tone="mono">{company.sokoId}</SokoChip>
            </div>
          </div>
          <div className="min-w-0">
            <p className={sokoTokens.eyebrow}>Quick actions</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickActions.map((a) => (
                <SokoQuickActionTile key={a.label} label={a.label} description={a.description} icon={a.icon} primary={a.primary} shortcut={a.shortcut} onClick={() => sw.go(a.tab)} />
              ))}
            </div>
          </div>
        </div>

        <div aria-label="Key metrics" role="group" className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-100 bg-white divide-y sm:divide-y-0 divide-slate-100 [&>*]:border-slate-100 sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0 lg:[&>*:not(:last-child)]:border-r">
          <SokoKpiCell label="GEC-approved vendors" value={approved.length}
            detail={`of ${vendors.length} in your vendor register`}
            visual={vendors.length > 0 ? <SokoProgress value={approved.length / vendors.length} className="w-full" /> : undefined}
            hint="Vendors your team has approved internally. This is separate from SOKO verification, which is issued by the platform."
            onClick={() => sw.go('sw-vendors')} />
          <SokoKpiCell label="Pending approval" value={pendingVendors.length}
            detail={oldestWait ? `Oldest waiting ${oldestWait.days} ${oldestWait.days === 1 ? 'day' : 'days'}` : 'No vendors awaiting a decision'}
            hint="Vendors that are not reviewed, under review or conditionally approved in your internal approval process."
            onClick={() => sw.go('sw-vendors')} />
          <SokoKpiCell label="Document acceptance" value={acceptance ? `${acceptance.pct}%` : '—'}
            detail={acceptance ? `${acceptance.accepted} of ${acceptance.total} requested documents accepted` : 'No documents requested yet'}
            visual={acceptance ? <SokoProgress value={acceptance.accepted / acceptance.total} tone="green" className="w-full" /> : undefined}
            hint="Accepted documents divided by all documents requested from vendors. This is an acceptance rate, not a validated compliance score."
            onClick={() => sw.go('sw-documents')} />
          <SokoKpiCell label="Open opportunities" value={market.relevantCount}
            detail="Relevant to your trades on Market Hub"
            hint="Open Market Hub opportunities that match this workspace's trade categories."
            onClick={() => sw.go('opportunities')} />
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
          <VendorPipelinePanel sw={sw} data={data} />
          <VendorIntelligencePanel sw={sw} data={data} />
        </div>
        <div className="relative min-w-0 min-h-[24rem]">
          <ActionCenterPanel sw={sw} data={data} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        <CompliancePanel sw={sw} data={data} />
        <VisitsPanel sw={sw} data={data} />
        <div className="md:col-span-2 lg:col-span-1 min-w-0 flex"><MarketHubPanel sw={sw} data={data} /></div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-6 min-w-0 flex"><RecentActivityPanel sw={sw} data={data} /></div>
        <div className="lg:col-span-6 min-w-0 flex"><ProductDiscoveryPanel sw={sw} data={data} /></div>
      </div>

      <DemoNote>Dashboard metrics are derived from simulated demo data. GEC vendor approvals and SOKO verification are independent processes.</DemoNote>
    </div>
  );
};
