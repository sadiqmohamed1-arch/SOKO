import React, { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Lightbulb } from 'lucide-react';
import { marketSnapshot } from '../../data/supplierMarket';
import { categoryEngagement, documentCompliance, geographicInterest, supplierKpis, weeklySeries } from '../../data/supplierAnalytics';
import { profileCompletion } from '../../data/supplierStore';
import { DemoNote, KpiCard, ProgressRow } from '../marketHub/MarketHubShared';
import { Card, PageHeader, PremiumGate, SW, completenessOf } from './SupplierShared';

const axis = { fontSize: 11, fill: '#64748b' };

export const SupplierInsights: React.FC<{ sw: SW }> = ({ sw }) => {
  const contacts = sw.store.contacts.filter((c) => c.companyId === sw.company.id);
  const kpis = supplierKpis(sw.company, sw.products, contacts);
  const series = useMemo(() => weeklySeries(sw.company, 12), [sw.company]);
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);
  const completion = profileCompletion(sw.company, sw.products);
  const topProducts = [...sw.products].filter((p) => p.status === 'active').sort((a, b) => b.views - a.views).slice(0, 5);

  const basics = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard label="Profile views (30 days)" value={kpis.profileViews.toLocaleString()} />
      <KpiCard label="Product views" value={kpis.productViews.toLocaleString()} />
      <KpiCard label="Buyer connections" value={kpis.connections} />
      <KpiCard label="Profile completion" value={`${completion}%`} />
    </div>
  );

  if (!sw.premium) {
    return (
      <div>
        <PageHeader eyebrow="Insights" title="Company insights" subtitle="See how buyers discover and engage with your company." />
        {basics}
        <Card className="mt-6" title="Most viewed products">
          <div className="space-y-3">
            {topProducts.map((p) => <ProgressRow key={p.id} label={p.name} value={p.views} of={Math.max(1, topProducts[0]?.views ?? 1)} />)}
            {topProducts.length === 0 && <p className="text-sm text-slate-500">Activate products to start collecting views.</p>}
          </div>
        </Card>
        <div className="mt-6">
          <PremiumGate
            title="Understand exactly where your buyers come from"
            text="Supplier Premium unlocks buyer interest trends, category engagement, campaign performance, geographic interest and document compliance insights."
            benefits={['Weekly buyer interest trends', 'Product & category engagement', 'Campaign performance', 'Geographic interest', 'Document compliance', 'Recommended actions']}
            canUpgrade={sw.can('plan.manage')}
            onUpgrade={() => sw.go('sw-plan')}
          />
        </div>
        <div className="mt-4"><DemoNote>All insights are demo data generated for this prototype.</DemoNote></div>
      </div>
    );
  }

  const cats = categoryEngagement(sw.products);
  const geo = geographicInterest(sw.company);
  const compliance = documentCompliance(sw.documents);
  const incomplete = sw.products.filter((p) => completenessOf(p) < 80).length;
  const recs = [
    compliance.expired + compliance.reminder > 0 && `Renew ${compliance.expired + compliance.reminder} document${compliance.expired + compliance.reminder > 1 ? 's' : ''} that ${compliance.expired ? 'have expired or ' : ''}expire soon to stay prequalification-ready.`,
    incomplete > 0 && `Complete ${incomplete} product listing${incomplete > 1 ? 's' : ''} — complete listings get noticeably more views.`,
    market.relevantCount > 0 && `${market.relevantCount} open Market Hub opportunit${market.relevantCount > 1 ? 'ies match' : 'y matches'} your categories.`,
    geo[1] && `Interest from ${geo[1].name} is growing — consider a targeted campaign there.`,
    kpis.incoming > 0 && `Respond to ${kpis.incoming} incoming buyer request${kpis.incoming > 1 ? 's' : ''}.`,
  ].filter(Boolean) as string[];

  return (
    <div>
      <PageHeader eyebrow="Insights · Supplier Premium" title="Company insights" subtitle="Buyer engagement, market reach and compliance in one place." />
      {basics}

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Buyer interest trend · 12 weeks">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="insProd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient>
                  <linearGradient id="insProf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c8a951" stopOpacity={0.3} /><stop offset="100%" stopColor="#c8a951" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tick={axis} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="productViews" name="Product views" stroke="#2563eb" fill="url(#insProd)" strokeWidth={2} />
                <Area type="monotone" dataKey="profileViews" name="Profile views" stroke="#8a702f" fill="url(#insProf)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Recommended actions">
          <ul className="space-y-3">
            {recs.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-slate-700"><Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />{r}</li>
            ))}
            {recs.length === 0 && <li className="text-sm text-slate-500">You are on top of everything.</li>}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        <Card title="Product interest">
          <div className="space-y-3">
            {topProducts.map((p) => <ProgressRow key={p.id} label={`${p.name} · ${p.enquiries} enquiries`} value={p.views} of={Math.max(1, topProducts[0]?.views ?? 1)} />)}
          </div>
        </Card>
        <Card title="Category engagement">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={axis} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="views" name="Views" fill="#2563eb" radius={[0, 4, 4, 0]} />
                <Bar dataKey="enquiries" name="Enquiries" fill="#c8a951" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <Card title="Campaign performance">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Campaigns', market.campaigns.length],
              ['Active', market.activeCampaigns],
              ['Delivered', market.delivered],
              ['Viewed', market.viewed],
              ['Interested', market.interested],
              ['Responses', market.responses],
            ].map(([k, v]) => (
              <div key={k as string}><dt className="text-xs text-slate-500">{k}</dt><dd className="text-lg font-semibold text-slate-900 tabular-nums">{v}</dd></div>
            ))}
          </dl>
          <button type="button" onClick={() => sw.go('opportunities')} className="mt-3 text-sm font-semibold text-blue-700 hover:underline cursor-pointer">Open Campaign Center</button>
        </Card>
        <Card title="Geographic interest">
          <div className="space-y-3">{geo.map((g) => <ProgressRow key={g.name} label={`${g.name} · ${g.share}%`} value={g.share} of={100} tone="slate" />)}</div>
        </Card>
        <Card title="Document compliance">
          <div className="space-y-3">
            <ProgressRow label={`Valid · ${compliance.valid}`} value={compliance.valid} of={Math.max(1, compliance.tracked)} tone="green" />
            <ProgressRow label={`Expiring soon · ${compliance.reminder}`} value={compliance.reminder} of={Math.max(1, compliance.tracked)} tone="gold" />
            <ProgressRow label={`Expired · ${compliance.expired}`} value={compliance.expired} of={Math.max(1, compliance.tracked)} tone="slate" />
          </div>
          <p className="mt-3 text-xs text-slate-500">{compliance.tracked} documents with expiry dates tracked.</p>
          <p className="mt-1 text-xs text-slate-500">Opportunity engagement: {market.myInterests} expressions of interest sent.</p>
        </Card>
      </div>
      <div className="mt-4"><DemoNote>All insights are demo data generated for this prototype.</DemoNote></div>
    </div>
  );
};
