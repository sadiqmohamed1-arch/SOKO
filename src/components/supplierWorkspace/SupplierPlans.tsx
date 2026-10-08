import React, { useMemo, useState } from 'react';
import { Check, Crown, ShieldCheck } from 'lucide-react';
import { TIER_CONFIG, SupplierTier } from '../../data/supplierTypes';
import { setTier } from '../../data/supplierService';
import { storageAllocationMb, storageUsedMb } from '../../data/supplierStore';
import { marketSnapshot } from '../../data/supplierMarket';
import { ConfirmDialog, btnPrimary, btnSecondary } from '../NetworkShared';
import { DemoNote } from '../marketHub/MarketHubShared';
import { Card, Meter, PageHeader, SW, fmtMb } from './SupplierShared';

const FREE_FEATURES = ['Verified company profile', 'Supplier Directory listing', 'Up to 25 basic product listings', 'Respond to Market Hub opportunities', 'Buyer connection requests', 'Basic insights', 'Up to 3 team seats'];
const PREMIUM_FEATURES = ['Private Document Center', 'Advanced Product Catalogues', 'Document Expiry Tracking', 'Supplier Campaigns', 'Campaign Analytics', 'Buyer Engagement Insights', 'Expanded Team Access (25 seats)'];

export const SupplierPlans: React.FC<{ sw: SW }> = ({ sw }) => {
  const [target, setTarget] = useState<SupplierTier | null>(null);
  const canChange = sw.can('plan.manage');
  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);
  const used = storageUsedMb(sw.documents);
  const alloc = storageAllocationMb(sw.company);
  const tier = sw.company.tier;

  const plan = (t: SupplierTier, features: string[]) => {
    const current = tier === t;
    const premium = t === 'premium';
    return (
      <div className={`relative rounded-2xl border p-6 flex flex-col ${premium ? 'border-[#c8a951] bg-gradient-to-b from-[#fbf7ea] to-white' : 'border-slate-200 bg-white'}`}>
        {current && <span className="absolute top-4 right-4 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-900 text-white">Current plan</span>}
        <p className={`text-sm font-semibold flex items-center gap-1.5 ${premium ? 'text-[#8a702f]' : 'text-slate-700'}`}>{premium && <Crown className="w-4 h-4" />}{TIER_CONFIG[t].label}</p>
        <p className="mt-2 text-lg font-semibold text-slate-900 leading-snug">{TIER_CONFIG[t].tagline}</p>
        <ul className="mt-5 space-y-2 flex-1">
          {features.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-slate-700"><Check className={`w-4 h-4 mt-0.5 shrink-0 ${premium ? 'text-[#8a702f]' : 'text-blue-600'}`} />{f}</li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-slate-500">Storage: {TIER_CONFIG[t].storageMb ? fmtMb(TIER_CONFIG[t].storageMb) : 'Verification documents only'}</p>
        {!current && (
          <button type="button" disabled={!canChange} onClick={() => setTarget(t)} className={`mt-4 ${premium ? btnPrimary : btnSecondary} justify-center`}>
            {premium ? 'Upgrade to Premium (demo)' : 'Switch to Free (demo)'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader eyebrow="Company menu · Subscription" title="Plan & subscription" subtitle="Your plan controls tools and capacity. It never changes your verification status." />
      {!canChange && <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Only Supplier Admins can change the company plan.</p>}

      <div className="grid md:grid-cols-2 gap-6">
        {plan('free', FREE_FEATURES)}
        {plan('premium', PREMIUM_FEATURES)}
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-6">
        <Card title="Document storage">
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">{fmtMb(used)}</p>
          <p className="text-xs text-slate-500">of {alloc ? fmtMb(alloc) : 'no private storage on Free'}</p>
          {alloc > 0 && <div className="mt-2"><Meter value={(used / alloc) * 100} tone="gold" /></div>}
        </Card>
        <Card title="Campaign credits">
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">{market.credits.available}</p>
          <p className="text-xs text-slate-500">available · {market.credits.used} used</p>
          {!sw.premium && <p className="mt-2 text-xs text-slate-500">Campaigns are included with Supplier Premium.</p>}
        </Card>
        <Card title="Verification">
          <p className="text-sm text-slate-700 flex gap-2"><ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />Verification is reviewed separately by SOKO and is independent of your plan. Upgrading never verifies a company and downgrading never removes verification.</p>
        </Card>
      </div>

      <div className="mt-4"><DemoNote>Plan changes are simulated. No payment is taken.</DemoNote></div>

      {target && (
        <ConfirmDialog
          title={target === 'premium' ? 'Upgrade to Supplier Premium?' : 'Switch to Supplier Free?'}
          message={target === 'premium' ? 'This is a demo upgrade. Premium tools unlock immediately and campaign credits are added.' : 'Premium tools will be locked. Your documents are kept but hidden until you upgrade again.'}
          confirmLabel={target === 'premium' ? 'Upgrade' : 'Switch to Free'}
          onConfirm={() => {
            sw.run(setTier(sw.ctx, target), `Plan changed to ${TIER_CONFIG[target].label} (simulated)`);
            setTarget(null);
          }}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
};
