import React from 'react';
import { UserPlus, Search, CalendarPlus, Megaphone, Building2, Hash } from 'lucide-react';
import { SW, VerificationBadge, PlanBadge } from './SupplierShared';
import { DemoNote } from '../marketHub/MarketHubShared';
import { SokoChip, SokoKpiCell, SokoQuickActionTile, sokoCard, sokoTokens } from '../sokoDesignSystem/SokoComponents';
import { SokoSegmentBar, SokoSparkColumns } from '../sokoDesignSystem/SokoCharts';
import { useContractorDashboardData } from './contractorDashboardData';
import {
  VendorPipelinePanel, VendorIntelligencePanel, ActionCenterPanel, CompliancePanel, VisitsPanel,
  MarketHubPanel, RecentActivityPanel, ProductDiscoveryPanel,
} from './ContractorDashboardPanels';

const companyInitials = (name: string) =>
  name.replace(/\b(LLC|L\.L\.C\.?|FZE|PJSC)\b/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

const greeting = (d: Date) => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 18 ? 'Good afternoon' : 'Good evening');

export const ContractorDashboard: React.FC<{ sw: SW }> = ({ sw }) => {
  const { company } = sw;
  const data = useContractorDashboardData(sw);
  const { today, vendors, linkedVendors, pendingVendors, expiring, missingDocs, upcomingVisits, monthVisits, market, weekly, contactsCount, newConnections } = data;
  const firstName = sw.user.name.split(' ')[0];

  const quickActions = [
    { label: 'Add Vendor', description: 'Register a supplier', icon: UserPlus, tab: 'sw-vendors', show: sw.can('contacts.manage'), primary: true },
    { label: 'Search Suppliers', description: 'Browse SOKO products', icon: Search, tab: 'sw-products', show: true },
    { label: 'Schedule Visit', description: 'Book a site visit', icon: CalendarPlus, tab: 'sw-visits', show: sw.can('visits.manage') },
    { label: 'Post Opportunity', description: 'Publish to Market Hub', icon: Megaphone, tab: 'opportunities', show: true },
  ].filter((a) => a.show);

  const visitDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return data.visits.filter((v) => new Date(v.date).toDateString() === d.toDateString() && v.status !== 'cancelled').length;
  });

  return (
    <div className="space-y-4">
      <section className={`${sokoCard} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.10),transparent_55%)] pointer-events-none" aria-hidden />
        <div className="relative p-5 sm:p-6 grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="flex items-start gap-4 min-w-0">
            <span className={`w-14 h-14 rounded-2xl ${company.profile.logoTone} text-white text-lg font-semibold flex items-center justify-center shrink-0 shadow-sm`}>
              {companyInitials(company.profile.tradingName)}
            </span>
            <div className="min-w-0">
              <p className={sokoTokens.eyebrow}>{greeting(today)}, {firstName} · {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <h1 className="mt-1 text-2xl sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight truncate">{company.profile.tradingName}</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <VerificationBadge company={company} />
                <PlanBadge premium={sw.premium} kind={company.kind} />
                <SokoChip icon={Building2}>{company.profile.types.join(' / ')}</SokoChip>
                <SokoChip icon={Hash} tone="mono">{company.sokoId}</SokoChip>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:w-[440px]">
            {quickActions.map((a) => (
              <SokoQuickActionTile key={a.label} label={a.label} description={a.description} icon={a.icon} primary={a.primary} onClick={() => sw.go(a.tab)} />
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Key metrics" className={`${sokoCard} overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 divide-y sm:divide-y-0 divide-slate-100 [&>*]:border-slate-100 sm:[&>*]:border-b xl:[&>*]:border-b-0 xl:[&>*:not(:last-child)]:border-r`}>
        <SokoKpiCell label="Total vendors" value={vendors.length} detail={`${linkedVendors.length} on SOKO · ${vendors.length - linkedVendors.length} external`}
          visual={<SokoSegmentBar height="h-1.5" segments={[{ label: 'On SOKO', value: linkedVendors.length, tone: 'blue' }, { label: 'External', value: vendors.length - linkedVendors.length, tone: 'blueSoft' }]} />}
          onClick={() => sw.go('sw-vendors')} />
        <SokoKpiCell label="Pending reviews" value={<span className={pendingVendors.length ? 'text-amber-600' : undefined}>{pendingVendors.length}</span>} detail="Internal vendor approvals" onClick={() => sw.go('sw-vendors')} />
        <SokoKpiCell label="Expiring documents" value={<span className={expiring.length ? 'text-rose-600' : undefined}>{expiring.length}</span>} detail={`Next 30 days · ${missingDocs.length} not submitted`} onClick={() => sw.go('sw-documents')} />
        <SokoKpiCell label="Visits" value={upcomingVisits.length} detail={`Upcoming · ${monthVisits.length} this month`} visual={<SokoSparkColumns values={visitDays} label="Visits per day, next 7 days" />} onClick={() => sw.go('sw-visits')} />
        <SokoKpiCell label="Market Hub" value={market.relevantCount} detail="Relevant opportunities" visual={<SokoSparkColumns values={weekly} label="Opportunities posted per week, last 12 weeks" />} onClick={() => sw.go('opportunities')} />
        <SokoKpiCell label="Connections" value={contactsCount} detail={`${newConnections} new in 30 days`} onClick={() => sw.go('sw-contacts')} />
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><VendorPipelinePanel sw={sw} data={data} /></div>
        <ActionCenterPanel sw={sw} data={data} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><VendorIntelligencePanel sw={sw} data={data} /></div>
        <CompliancePanel sw={sw} data={data} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <VisitsPanel sw={sw} data={data} />
        <MarketHubPanel sw={sw} data={data} />
        <div className="md:col-span-2 lg:col-span-1"><RecentActivityPanel sw={sw} data={data} /></div>
      </div>

      <ProductDiscoveryPanel sw={sw} data={data} />

      <DemoNote>Dashboard metrics are derived from simulated demo data. Vendor approvals and SOKO verification are independent processes.</DemoNote>
    </div>
  );
};
