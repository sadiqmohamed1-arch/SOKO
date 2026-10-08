import React, { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight, ChartColumn, CheckCircle2, Circle, Crown, Eye, FileText, Handshake, Megaphone, Package, Plus, Sparkles, Users } from 'lucide-react';
import { profileChecklist, profileCompletion, storageAllocationMb, storageUsedMb } from '../../data/supplierStore';
import { marketSnapshot } from '../../data/supplierMarket';
import { documentCompliance, supplierKpis, weeklySeries } from '../../data/supplierAnalytics';
import { opportunityTypeLabel } from '../../data/marketHubCatalog';
import { btnPrimary, btnSecondary } from '../NetworkShared';
import { DemoNote, daysAgo, fmtDate } from '../marketHub/MarketHubShared';
import { Card, CompanyLogo, Meter, PlanBadge, SW, VerificationBadge, completenessOf, fmtMb } from './SupplierShared';

const Kpi: React.FC<{ label: string; value: React.ReactNode; hint?: string; icon: React.ReactNode; premium?: boolean }> = ({ label, value, hint, icon, premium }) => (
  <div className={`rounded-xl border px-4 py-3 transition-shadow hover:shadow-sm ${premium ? 'border-gold-300/60 bg-gradient-to-br from-white to-gold-50/50' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <span className={premium ? 'text-gold-700' : 'text-slate-400'}>{icon}</span>
    </div>
    <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
    {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
  </div>
);

export const SupplierDashboard: React.FC<{ sw: SW }> = ({ sw }) => {
  const { company, products, documents, store } = sw;
  const contacts = store.contacts.filter((c) => c.companyId === company.id);
  const completion = profileCompletion(company, products);
  const checklist = profileChecklist(company, products);
  const missing = checklist.filter((c) => !c.done);
  const kpis = supplierKpis(company, products, contacts);
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);
  const trend = useMemo(() => weeklySeries(company), [company]);
  const compliance = documentCompliance(documents);
  const used = storageUsedMb(documents);
  const alloc = storageAllocationMb(company);
  const active = products.filter((p) => p.status === 'active');
  const incomplete = products.filter((p) => completenessOf(p) < 60);
  const recent = [...products].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const activity = store.audit.filter((a) => a.companyId === company.id).slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-gold-500/10 blur-2xl" aria-hidden />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <CompanyLogo company={company} size="lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Supplier Workspace · {company.sokoId}</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-semibold leading-tight">Welcome back, {company.profile.tradingName}</h1>
              <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">Manage your company presence, products, market engagement and business opportunities across SOKO.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <VerificationBadge company={company} />
                <PlanBadge premium={sw.premium} />
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-semibold text-slate-200">Profile {completion}% complete</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button type="button" onClick={() => sw.go('sw-profile')} className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors cursor-pointer">
              <Eye className="w-4 h-4" /> Public profile
            </button>
            {sw.can('products.manage') && (
              <button type="button" onClick={() => sw.go('sw-products')} className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition-colors cursor-pointer">
                <Plus className="w-4 h-4" /> Add product
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Profile Views" value={kpis.profileViews.toLocaleString()} hint="Last 4 weeks" icon={<Eye className="w-4 h-4" />} />
        <Kpi label="Product Views" value={kpis.productViews.toLocaleString()} hint={`${active.length} active listings`} icon={<Package className="w-4 h-4" />} />
        <Kpi label="Buyer Connections" value={kpis.connections} hint={kpis.incoming ? `${kpis.incoming} new requests` : 'No pending requests'} icon={<Handshake className="w-4 h-4" />} />
        <Kpi label="Opportunities" value={market.relevantCount} hint="Open in your categories" icon={<Sparkles className="w-4 h-4" />} />
        <Kpi label="Campaign Responses" value={market.inboxCount} hint="Received in your inbox" icon={<Megaphone className="w-4 h-4" />} />
        <Kpi label="Profile Completion" value={`${completion}%`} hint={missing.length ? `${missing.length} items to add` : 'Complete'} icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      {sw.premium && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <Kpi premium label="Campaign Reach" value={market.delivered.toLocaleString()} hint={`${market.activeCampaigns} active campaigns`} icon={<Megaphone className="w-4 h-4" />} />
          <Kpi premium label="Engagement" value={market.viewed.toLocaleString()} hint={`${market.interested} interested buyers`} icon={<Users className="w-4 h-4" />} />
          <Kpi premium label="Document Storage" value={fmtMb(used)} hint={`of ${fmtMb(alloc)} allocated`} icon={<FileText className="w-4 h-4" />} />
          <Kpi premium label="Expiring Documents" value={compliance.reminder + compliance.expired} hint={compliance.expired ? `${compliance.expired} already expired` : 'Within reminder window'} icon={<FileText className="w-4 h-4" />} />
          <div className="col-span-2 md:col-span-2 xl:col-span-1 rounded-xl border border-gold-300/60 bg-gradient-to-br from-white to-gold-50/50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Buyer Interest Trend</p>
            <div className="h-14 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <Tooltip formatter={(v) => [v, 'Product views']} labelFormatter={(_, p) => p?.[0]?.payload?.week ?? ''} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="productViews" stroke="#8a702f" fill="#dfc785" fillOpacity={0.4} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Company Profile Health" action={<button type="button" onClick={() => sw.go('sw-profile')} className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">Manage profile</button>}>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-semibold text-slate-900 tabular-nums">{completion}%</p>
            <VerificationBadge company={company} />
          </div>
          <div className="mt-2">
            <Meter value={completion} tone={completion >= 80 ? 'green' : 'blue'} />
          </div>
          <ul className="mt-4 space-y-2">
            {(missing.length ? missing.slice(0, 4) : checklist.slice(0, 3)).map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-sm">
                {i.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
                <span className={i.done ? 'text-slate-500' : 'text-slate-800'}>{i.label}</span>
              </li>
            ))}
          </ul>
          {missing.length > 4 && <p className="mt-2 text-xs text-slate-500">+{missing.length - 4} more suggestions</p>}
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">Verification is reviewed by SOKO and is independent of your plan.</p>
        </Card>

        <Card
          className="lg:col-span-2"
          title="Market Opportunities for you"
          action={<button type="button" onClick={() => sw.go('opportunities')} className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">Open Market Hub</button>}
        >
          {market.relevant.length === 0 ? (
            <p className="text-sm text-slate-500">No open opportunities right now. New requirements appear here as buyers post them.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {market.relevant.map((o) => (
                <li key={o.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{opportunityTypeLabel(o.type)} · {o.category}</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{o.title}</p>
                    <p className="text-xs text-slate-500">
                      {o.location} · Respond by {fmtDate(o.responseDeadline)} · {o.interestedCount} interested
                    </p>
                  </div>
                  {o.myInterest ? (
                    <span className="shrink-0 text-xs font-semibold text-emerald-700">Interest sent</span>
                  ) : (
                    <button type="button" onClick={() => sw.go('opportunities')} className={`${btnSecondary} shrink-0 !min-h-9 !px-3`}>
                      Express Interest
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Product Overview" action={<button type="button" onClick={() => sw.go('sw-products')} className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">Manage products</button>}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { l: 'Listed', v: active.length },
              { l: 'Drafts / off', v: products.length - active.length },
              { l: 'Need info', v: incomplete.length },
            ].map((x) => (
              <div key={x.l} className="rounded-lg bg-slate-50 py-2">
                <p className="text-lg font-semibold text-slate-900 tabular-nums">{x.v}</p>
                <p className="text-[11px] text-slate-500">{x.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recently updated</p>
          <ul className="mt-2 space-y-2">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <img src={p.images[0]} alt="" className="w-9 h-9 rounded-md object-cover bg-slate-100" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-500">{daysAgo(p.updatedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent Activity">
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">Activity from your team will appear here.</p>
          ) : (
            <ol className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 leading-snug">{a.action}</p>
                    <p className="text-xs text-slate-500">
                      {a.actor} · {daysAgo(a.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {sw.premium ? (
          <Card title="Premium Growth Tools">
            <div className="grid grid-cols-2 gap-2">
              {[
                { t: 'Document Center', s: `${documents.filter((d) => !d.archived).length} documents`, tab: 'sw-documents', i: FileText },
                { t: 'Campaigns', s: `${market.credits.available} credits left`, tab: 'opportunities', i: Megaphone },
                { t: 'Insights', s: 'Trends & interest', tab: 'sw-insights', i: ChartColumn },
                { t: 'Team', s: `${sw.members.filter((m) => m.status === 'active').length} members`, tab: 'sw-team', i: Users },
              ].map((x) => (
                <button key={x.t} type="button" onClick={() => sw.go(x.tab)} className="group text-left rounded-xl border border-slate-200 p-3 hover:border-gold-500 hover:bg-gold-50/40 transition-colors cursor-pointer">
                  <x.i className="w-4 h-4 text-gold-700" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">{x.t}</p>
                  <p className="text-xs text-slate-500">{x.s}</p>
                </button>
              ))}
            </div>
          </Card>
        ) : (
          <Card title="Grow with Premium">
            <p className="text-sm text-slate-600 leading-relaxed">Keep company documents organised with expiry reminders, publish targeted campaigns and see who is interested in your products.</p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {['Private Document Center', 'Supplier Campaigns', 'Buyer Engagement Insights'].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-gold-700" /> {b}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => sw.go('sw-plan')} className={`${btnPrimary} mt-4 w-full !bg-slate-900 hover:!bg-slate-800`}>
              Compare plans <ArrowRight className="w-4 h-4" />
            </button>
          </Card>
        )}
      </div>

      <DemoNote>Views, reach and engagement figures are simulated demo data derived from activity on SOKO.</DemoNote>
    </div>
  );
};
