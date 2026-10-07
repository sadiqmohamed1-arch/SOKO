import React, { useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Calculator, FolderKanban, Activity, TrendingUp } from 'lucide-react';
import { MARKET_HUB_SNAPSHOT, TRENDING_CATEGORIES } from '../data/buyerHomeFeed';

type Currency = 'AED' | 'USD';
const AED_PER_USD = 3.6725;

const INDICATORS = [
  { id: 'steel', label: 'Steel', detail: 'B500B Rebar, delivered UAE', aed: 2520, unit: 'MT', change: 1.6, period: '7d' },
  { id: 'copper', label: 'Copper', detail: 'Grade A cathode', aed: 35.85, unit: 'kg', change: 2.1, period: '7d' },
  { id: 'fuel', label: 'Fuel', detail: 'Diesel, UAE retail', aed: 11.16, unit: 'gallon', change: -0.4, period: 'MoM' },
  { id: 'freight', label: 'Freight', detail: 'Shanghai → Dubai, 40ft HC', aed: 8625, unit: 'container', change: 4.3, period: '7d' },
];

const formatPrice = (aed: number, currency: Currency) => {
  const value = currency === 'AED' ? aed : aed / AED_PER_USD;
  const digits = value < 100 ? 2 : 0;
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

interface BuyerHomeSidebarProps {
  onNavigate: (tab: string) => void;
}

export const BuyerHomeSidebar: React.FC<BuyerHomeSidebarProps> = ({ onNavigate }) => {
  const [currency, setCurrency] = useState<Currency>('AED');
  const [showEstimator, setShowEstimator] = useState(false);
  const [estimatorItem, setEstimatorItem] = useState(INDICATORS[0].id);
  const [estimatorQty, setEstimatorQty] = useState(20);

  const selected = INDICATORS.find((i) => i.id === estimatorItem) ?? INDICATORS[0];
  const marketHubMax = Math.max(...MARKET_HUB_SNAPSHOT.breakdown.map((b) => b.value));

  return (
    <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-700" />
              Market Pulse
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">UAE construction market indicators</p>
          </div>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
            {(['AED', 'USD'] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                  currency === c ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-800 mb-3">
          Demo Market Data
        </span>

        <ul className="divide-y divide-slate-100">
          {INDICATORS.map((ind) => {
            const up = ind.change >= 0;
            return (
              <li key={ind.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{ind.label}</p>
                  <p className="text-[11px] text-slate-500 truncate">{ind.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatPrice(ind.aed, currency)}
                    <span className="text-[10px] font-normal text-slate-500"> / {ind.unit}</span>
                  </p>
                  <p className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${up ? 'text-emerald-700' : 'text-red-600'}`}>
                    {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {up ? '+' : ''}
                    {ind.change}% ({ind.period})
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-2 pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowEstimator((v) => !v)}
            aria-expanded={showEstimator}
            className="w-full flex items-center justify-between text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              Procurement Cost Estimator
            </span>
            <span>{showEstimator ? 'Hide' : 'Open'}</span>
          </button>
          {showEstimator && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">
                  Item
                  <select
                    value={estimatorItem}
                    onChange={(e) => setEstimatorItem(e.target.value)}
                    className="mt-1 w-full p-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 normal-case"
                  >
                    {INDICATORS.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label} ({i.unit})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] font-semibold text-slate-600 uppercase">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    value={estimatorQty}
                    onChange={(e) => setEstimatorQty(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-1 w-full p-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-md border border-slate-200 text-xs">
                <span className="text-slate-600">Estimated cost</span>
                <span className="font-semibold text-slate-900 tabular-nums">{formatPrice(selected.aed * estimatorQty, currency)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-gold-600" />
          Trending on SOKO
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Change in SOKO network activity vs previous 7 days</p>
        <ul>
          {TRENDING_CATEGORIES.map((cat, idx) => (
            <li key={cat.label}>
              <button
                type="button"
                onClick={() => onNavigate(cat.tab)}
                className="w-full flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg text-left hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <span className="flex items-center gap-2.5 text-sm text-slate-800 group-hover:text-blue-700">
                  <span className="w-4 text-[11px] text-slate-400 tabular-nums">{idx + 1}</span>
                  {cat.label}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700">
                  <ArrowUpRight className="w-3 h-3" />
                  {cat.change}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-slate-900 text-white rounded-xl p-4 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <FolderKanban className="w-3.5 h-3.5" />
          Market Hub
        </h3>
        <p className="mt-2 text-2xl font-semibold leading-tight">{MARKET_HUB_SNAPSHOT.total} new requirements</p>
        <p className="text-xs text-slate-400">matching your categories and interests this week</p>
        <ul className="mt-3 space-y-1.5">
          {MARKET_HUB_SNAPSHOT.breakdown.map((b) => (
            <li key={b.label} className="flex items-center gap-3 text-xs">
              <span className="w-24 text-slate-300 shrink-0">{b.label}</span>
              <span className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <span className="block h-full rounded-full bg-blue-400" style={{ width: `${(b.value / marketHubMax) * 100}%` }} />
              </span>
              <span className="w-4 text-right font-semibold">{b.value}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onNavigate('opportunities')}
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white text-slate-900 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Explore Market Hub
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>
    </aside>
  );
};
