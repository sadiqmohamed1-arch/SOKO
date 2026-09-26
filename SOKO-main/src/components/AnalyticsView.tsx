import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  ShieldCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  Users,
  FileSpreadsheet,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  CartesianGrid,
} from 'recharts';
import { AnalyticsMetric, UserProfile } from '../types';

interface AnalyticsViewProps {
  analytics: AnalyticsMetric;
  currentUser: UserProfile;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analytics, currentUser }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('6M');
  const [riskFilter, setRiskFilter] = useState('All');

  const filteredSuppliers = analytics.supplierPerformance.filter((s) => {
    if (riskFilter === 'All') return true;
    return s.risk === riskFilter;
  });

  const handleExportCSV = () => {
    const headers = ['Supplier Name', 'Tier', 'Annual Spend ($)', 'On-Time Delivery (%)', 'Quality Score (%)', 'Risk Level', 'Active Orders'];
    const rows = analytics.supplierPerformance.map((s) => [
      `"${s.name}"`,
      `"${s.tier}"`,
      s.spend,
      s.otd,
      s.qualityScore,
      `"${s.risk}"`,
      s.activeOrders,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ProcureLink_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <BarChart3 className="w-4 h-4" />
            Executive Procurement Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Procurement Performance & Growth Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time analytics on spend under management, cost-out yield, supplier lead times, and on-time fulfillment rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 rounded-lg p-1 flex text-xs font-bold">
            {['1M', '3M', '6M', 'YTD'].map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                  selectedTimeframe === tf ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            id="export-analytics-btn"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Spend Under Mgmt
            </span>
            <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              ${(analytics.summary.totalSpend / 1000000).toFixed(2)}M
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{analytics.summary.growthPct}% vs prior year</span>
            </div>
          </div>
        </div>

        {/* Cost Savings Realized */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Negotiated Savings
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              ${analytics.summary.costSavings.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Average <strong className="text-emerald-700">{analytics.summary.savingsPct}%</strong> cost out
            </div>
          </div>
        </div>

        {/* Supplier On-Time Delivery */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Supplier OTD Rate
            </span>
            <span className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {analytics.summary.avgOtdRate}%
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Target SLA: 95.0% (Exceeding benchmark)
            </div>
          </div>
        </div>

        {/* RFQ Cycle Time */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Avg RFQ Cycle
            </span>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {analytics.summary.avgCycleDays} Days
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1">
              33% faster turnaround
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spend & Cost Savings Trend */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Procurement Spend vs. Target Budget
              </h3>
              <p className="text-xs text-slate-500">
                Monthly actual spend compared to allocated budget and negotiated savings
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-slate-600 font-medium">Actual Spend</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-medium">Cost Savings</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.spendByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="savingsColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val / 1000}k`}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <Tooltip
                  formatter={(val: any) => [
                    `$${Number(val || 0).toLocaleString()}`,
                    'Amount',
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, color: '#fff', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="spend" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#spendColor)" name="Actual Spend" />
                <Area type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#savingsColor)" name="Cost Savings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Spend Distribution */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Spend by Category</h3>
            <p className="text-xs text-slate-500">Distribution across primary industrial trades</p>
          </div>

          <div className="h-56 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.spendByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {analytics.spendByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [
                    `$${Number(val || 0).toLocaleString()}`,
                    'Spend',
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, color: '#fff', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {analytics.spendByCategory.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-700 truncate max-w-[150px]">{cat.name}</span>
                </div>
                <span className="font-bold text-slate-900">
                  ${(cat.value / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RFQ Conversion Funnel Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Sourcing & Bidding Conversion Funnel
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Tracking the full contract award cycle from initial RFQ publication to final supplier execution
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {analytics.rfqFunnel.map((stage, idx) => (
            <div
              key={stage.stage}
              className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Stage 0{idx + 1}</span>
                <span className="font-bold text-blue-700">{stage.conversion} Conversion</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{stage.stage}</h4>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stage.count}</span>
                <span className="text-xs font-semibold text-slate-600">{stage.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supplier Performance & Risk Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Supplier Performance & Risk Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Evaluations across active contracts, delivery SLAs, and quality audits
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Risk Filter:</span>
            {['All', 'Low', 'Moderate'].map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  riskFilter === risk
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Supplier Entity</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Annual Spend</th>
                <th className="py-3 px-4">On-Time Delivery</th>
                <th className="py-3 px-4">Quality Acceptance</th>
                <th className="py-3 px-4">Risk Rating</th>
                <th className="py-3 px-4">Active Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{sup.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {sup.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    ${(sup.spend / 1000).toFixed(0)}k
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                      <span>{sup.otd}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {sup.qualityScore}%
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sup.risk === 'Low'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {sup.risk} Risk
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-blue-700">
                    {sup.activeOrders} Orders
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
