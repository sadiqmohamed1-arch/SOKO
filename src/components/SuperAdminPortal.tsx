import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Building2,
  Users,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Download,
  Eye,
  Edit3,
  Lock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Clock,
  Sparkles,
  Award,
  AlertCircle,
  X,
  ChevronRight,
  Check,
  Ban,
  Activity,
  Briefcase,
  Layers,
} from 'lucide-react';
import { UserProfile, UserRole, CompanyProfileAudit, ModerationReportItem, BackendActivityLog, PlatformStats } from '../types';
import { useAuth } from '../context/AuthContext';

interface SuperAdminPortalProps {
  currentUser: UserProfile;
  onNavigateToTab: (tab: string) => void;
  onSelectUserForDemo?: (role: UserRole) => void;
}

const SuperAdminDashboard: React.FC<SuperAdminPortalProps> = ({
  currentUser,
  onNavigateToTab,
}) => {
  const { user } = useAuth();
  const isAdmin = currentUser.role === 'admin' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'companies' | 'moderation' | 'escrow' | 'audit_logs'>('companies');
  const [roleFilter, setRoleFilter] = useState<'all' | 'buyer' | 'supplier' | 'contractor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected company for detailed modal/drawer
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfileAudit | null>(null);
  const [editModalCompany, setEditModalCompany] = useState<CompanyProfileAudit | null>(null);
  const [editIcvScore, setEditIcvScore] = useState<number>(0);
  const [editRiskRating, setEditRiskRating] = useState<'low' | 'medium' | 'high'>('low');
  const [editStatus, setEditStatus] = useState<'active' | 'pending_verification' | 'suspended'>('active');
  const [editAuditNotes, setEditAuditNotes] = useState<string>('');

  // Selected report for action
  const [selectedReport, setSelectedReport] = useState<ModerationReportItem | null>(null);
  const [moderationActionNote, setModerationActionNote] = useState('');

  // Platform stats state
  const [stats, setStats] = useState<PlatformStats>({
    totalGrossSourcingValue: 'AED 284.5M',
    totalProfiles: 58,
    verifiedCompaniesCount: 52,
    activeTendersCount: 34,
    activeTendersValue: 'AED 68.2M',
    reportedItemsCount: 3,
    disputedEscrowsCount: 1,
    suppliersCount: 24,
    buyersCount: 18,
    contractorsCount: 16,
    monthlyGrowthRate: '+14.2%',
    compliancePassRate: '98.8%',
  });

  // Companies state
  const [companies, setCompanies] = useState<CompanyProfileAudit[]>([]);
  // Moderation state
  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  // Activity logs
  const [logs, setLogs] = useState<BackendActivityLog[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchAdminData = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, compRes, modRes, logRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/companies'),
        fetch('/api/admin/moderation'),
        fetch('/api/admin/activities'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.stats) setStats(data.stats);
      }
      if (compRes.ok) {
        const data = await compRes.json();
        if (data.companies) setCompanies(data.companies);
      }
      if (modRes.ok) {
        const data = await modRes.json();
        if (data.reports) setReports(data.reports);
      }
      if (logRes.ok) {
        const data = await logRes.json();
        if (data.logs) setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to load admin data from server, using local defaults', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Toggle company verification
  const handleToggleVerification = async (company: CompanyProfileAudit) => {
    const newVerified = !company.isVerified;
    try {
      const res = await fetch('/api/admin/verify-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id, isVerified: newVerified }),
      });
      if (res.ok) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === company.id
              ? { ...c, isVerified: newVerified, status: newVerified ? 'active' : 'pending_verification' }
              : c
          )
        );
        showToast(`${company.companyName} verification ${newVerified ? 'granted' : 'revoked'}.`);
        fetchAdminData();
      }
    } catch {
      showToast('Error updating verification status.');
    }
  };

  // Save company edits
  const handleSaveCompanyEdits = async () => {
    if (!editModalCompany) return;
    try {
      const res = await fetch('/api/admin/update-company-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: editModalCompany.id,
          status: editStatus,
          icvScore: editIcvScore,
          riskRating: editRiskRating,
          auditNotes: editAuditNotes,
        }),
      });
      if (res.ok) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === editModalCompany.id
              ? {
                  ...c,
                  status: editStatus,
                  icvScore: editIcvScore,
                  riskRating: editRiskRating,
                  auditNotes: editAuditNotes,
                }
              : c
          )
        );
        showToast(`Updated profile parameters for ${editModalCompany.companyName}`);
        setEditModalCompany(null);
        fetchAdminData();
      }
    } catch {
      showToast('Error saving profile changes.');
    }
  };

  // Resolve moderation report
  const handleResolveModeration = async (
    reportId: string,
    actionStatus: 'resolved' | 'action_taken' | 'dismissed'
  ) => {
    try {
      const res = await fetch('/api/admin/resolve-moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          status: actionStatus,
          actionNote: moderationActionNote || `Admin resolved with status: ${actionStatus}`,
        }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, status: actionStatus, actionNote: moderationActionNote } : r
          )
        );
        showToast(`Moderation case marked as ${actionStatus.toUpperCase()}`);
        setSelectedReport(null);
        setModerationActionNote('');
        fetchAdminData();
      }
    } catch {
      showToast('Error resolving moderation item.');
    }
  };

  // Export governance report CSV
  const handleExportReportCSV = () => {
    const headers = [
      'Company Name',
      'Role',
      'Contact Person',
      'Email',
      'Phone',
      'DUNS',
      'TRN',
      'Verified',
      'Status',
      'ICV Score (%)',
      'Risk Rating',
      'Annual Sourcing Volume',
    ];
    const rows = companies.map((c) => [
      `"${c.companyName}"`,
      c.role,
      `"${c.contactPerson}"`,
      c.email,
      c.phone,
      c.dunsNumber || '',
      c.vatTrn || '',
      c.isVerified ? 'YES' : 'NO',
      c.status,
      c.icvScore,
      c.riskRating,
      `"${c.annualProcureVolume || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `soko-governance-audit-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Governance report exported as CSV.');
  };

  // Filter companies
  const filteredCompanies = companies.filter((c) => {
    if (roleFilter !== 'all' && c.role !== roleFilter) return false;
    if (statusFilter === 'verified' && !c.isVerified) return false;
    if (statusFilter === 'pending' && c.status !== 'pending_verification') return false;
    if (statusFilter === 'suspended' && c.status !== 'suspended') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.companyName.toLowerCase().includes(q);
      const matchPerson = c.contactPerson.toLowerCase().includes(q);
      const matchDuns = c.dunsNumber?.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      if (!matchName && !matchPerson && !matchDuns && !matchEmail) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Super Admin Top Header */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-blue-900/50 shadow-xl relative overflow-hidden">
        {/* Background ambient pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400 text-slate-950 shadow-xs">
                <ShieldCheck className="w-3 h-3" />
                SOKO Super Admin Central
              </span>
              <span className="text-[11px] text-cyan-300 font-mono font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Core Network Active • DIFC Regulatory Zone
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              B2B Governance, Profile Verification & Compliance Operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Centralized administrative oversight managing all verified suppliers, buyers, and general contractors,
              milestone escrow releases, and platform moderation logs.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={fetchAdminData}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Live</span>
            </button>

            <button
              onClick={handleExportReportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Export Governance Dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Platform-Wide Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Sourcing Volume */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Gross Sourcing Volume</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
              {stats.monthlyGrowthRate} MoM
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalGrossSourcingValue}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Across 34 active mega-contracts</span>
          </div>
        </div>

        {/* Card 2: Company Profiles Managed */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Enterprise Profiles</span>
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
              {stats.compliancePassRate} Verified
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalProfiles} Companies
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span>24 Suppliers</span>
            <span>•</span>
            <span>18 Buyers</span>
            <span>•</span>
            <span>16 GC</span>
          </div>
        </div>

        {/* Card 3: Active Tenders & Escrow */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Milestone Escrow Hold</span>
            <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
              34 Live Tenders
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-900 tracking-tight">
            {stats.activeTendersValue}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-indigo-600" />
            <span>3-stage milestone gated releases</span>
          </div>
        </div>

        {/* Card 4: Moderation & Trust Index */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Moderation Queue</span>
            <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
              stats.reportedItemsCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'
            }`}>
              {stats.reportedItemsCount} Pending
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>99.6%</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Clean Trust Index
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>0 critical security breaches</span>
          </div>
        </div>
      </div>

      {/* Main Administrative Control Hub */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 px-4 sm:px-6 pt-3 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          {[
            { id: 'companies', label: '🏢 Enterprise Profiles & Verification', count: companies.length },
            { id: 'moderation', label: '🛡️ Moderation & Incident Logs', count: reports.filter(r => r.status === 'pending').length },
            { id: 'escrow', label: '🏗️ Sourcing Contracts & Escrow' },
            { id: 'audit_logs', label: '📜 System Audit Trail', count: logs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-800 font-black' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: COMPANY PROFILES & VERIFICATION */}
        {activeTab === 'companies' && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Role filter buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All Profiles' },
                  { id: 'supplier', label: '🏭 Suppliers' },
                  { id: 'buyer', label: '🏢 Buyers' },
                  { id: 'contractor', label: '🏗️ Contractors' },
                ].map((rf) => (
                  <button
                    key={rf.id}
                    onClick={() => setRoleFilter(rf.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      roleFilter === rf.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>

              {/* Status and Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer focus:bg-white"
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="verified">Verified Only</option>
                  <option value="pending">Pending Audit</option>
                  <option value="suspended">Suspended Accounts</option>
                </select>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company, DUNS, TRN..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Companies Table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Company & Lead Executive</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">DUNS / Trade Lic.</th>
                    <th className="py-3 px-3">ICV Score</th>
                    <th className="py-3 px-3">Risk Rating</th>
                    <th className="py-3 px-3">Verification</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map((comp) => (
                    <tr key={comp.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{comp.companyName}</span>
                          {comp.isVerified && (
                            <span title="Verified Enterprise">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{comp.contactPerson}</span>
                          <span>•</span>
                          <span>{comp.location}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          comp.role === 'buyer'
                            ? 'bg-blue-100 text-blue-800'
                            : comp.role === 'supplier'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {comp.role}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        <div>{comp.dunsNumber || 'No DUNS'}</div>
                        <div className="text-[10px] text-slate-400">{comp.tradeLicenseNo || comp.vatTrn || ''}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs ${
                          comp.icvScore >= 75 ? 'text-emerald-700' : comp.icvScore >= 50 ? 'text-amber-700' : 'text-slate-500'
                        }`}>
                          <Award className="w-3.5 h-3.5" />
                          {comp.icvScore}%
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          comp.riskRating === 'low'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : comp.riskRating === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {comp.riskRating}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleVerification(comp)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                            comp.isVerified
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-blue-100 hover:text-blue-800'
                          }`}
                        >
                          {comp.isVerified ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span>Verified</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>Pending</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCompany(comp)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="View Full Compliance Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditModalCompany(comp);
                              setEditIcvScore(comp.icvScore);
                              setEditRiskRating(comp.riskRating);
                              setEditStatus(comp.status);
                              setEditAuditNotes(comp.auditNotes || '');
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer"
                            title="Edit Audit Metrics"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCompanies.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No company profiles match your current filter parameters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MODERATION & INCIDENT LOG */}
        {activeTab === 'moderation' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Incident Reports & Flagged Submissions</h3>
                <p className="text-xs text-slate-500">
                  Review reported tenders, proposals, counterfeit claims, or pricing anomalies submitted by verified participants.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                {reports.filter(r => r.status === 'pending').length} Actions Required
              </span>
            </div>

            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`p-4 rounded-xl border transition-all ${
                    report.status === 'pending'
                      ? 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-300/40'
                      : 'bg-white border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          report.severity === 'critical'
                            ? 'bg-rose-600 text-white'
                            : report.severity === 'high'
                            ? 'bg-amber-500 text-white'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {report.severity} Severity
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {report.targetTitle}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({report.targetType.toUpperCase()})
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Allegation: {report.reason}</span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {report.details}
                      </p>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                        <span>Reported by: <strong className="text-slate-700">{report.reportedBy} ({report.reporterCompany})</strong></span>
                        <span>•</span>
                        <span>{report.timestamp}</span>
                      </div>

                      {report.actionNote && (
                        <div className="mt-2 text-[11px] bg-slate-100 text-slate-800 p-2 rounded-lg border border-slate-200 font-mono">
                          Admin Resolution Note: {report.actionNote}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {report.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleResolveModeration(report.id, 'resolved')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                          >
                            Clear & Dismiss
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setModerationActionNote('');
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                          >
                            Take Down Content
                          </button>
                        </>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 uppercase">
                          {report.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CONTRACT ESCROW & SOURCING OVERSIGHT */}
        {activeTab === 'escrow' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tripartite Sourcing Contracts & Milestone Escrow</h3>
                <p className="text-xs text-slate-500">
                  Real-time milestone gating overseeing multi-tier deliveries between Developers, General Contractors, and Mills.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                AED 68.2M Under Escrow
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contract 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    Package #TR-994: 850 MT Structural Steel
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Phase 2 Active
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Buyer: <strong>Vance Infrastructure Group UAE</strong></div>
                  <div>Supplier: <strong>Apex Industrial Castings & Alloys</strong></div>
                  <div>GC: <strong>Apex Industrial Mechanical GC</strong></div>
                </div>
                {/* Milestone progress bar */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[11px] font-medium text-slate-600">
                    <span>Milestone 2/3: Bill of Lading Verified</span>
                    <span className="font-bold text-blue-700">65% Capital Released</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    onClick={() => showToast('Escrow inspection report downloaded.')}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold cursor-pointer"
                  >
                    View FAT Certificate
                  </button>
                  <button
                    onClick={() => showToast('Super Admin approved milestone 3 release.')}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    Release Next Gate ($420K)
                  </button>
                </div>
              </div>

              {/* Contract 2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    Package #MEP-12: Tunnel Chiller & Substation
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Phase 1 Pre-Fab
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Buyer: <strong>Falcon Heavy Civil Contracting LLC</strong></div>
                  <div>Supplier: <strong>Hyperion Modular Substations Ltd</strong></div>
                  <div>GC: <strong>Emirates Turnkey EPC Contractors</strong></div>
                </div>
                {/* Milestone progress bar */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[11px] font-medium text-slate-600">
                    <span>Milestone 1/3: Factory Acceptance Live Stream</span>
                    <span className="font-bold text-blue-700">25% Capital Released</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    onClick={() => showToast('Escrow inspection report downloaded.')}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold cursor-pointer"
                  >
                    Audit Telemetry
                  </button>
                  <button
                    onClick={() => showToast('Super Admin released pre-fab milestone.')}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    Authorize FAT Sign-Off
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Super Administrator Activity & Audit Trail</h3>
                <p className="text-xs text-slate-500">
                  Immutable administrative ledger recording all profile verification changes, sanctions, and escrow authorizations.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Jurisdiction: UAE Federal Law No. 6 of 2021
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 text-xs hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      log.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.status === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{log.action}</div>
                      <div className="text-slate-500 text-[11px]">
                        Target Entity: <strong className="text-slate-700">{log.entity}</strong> • Admin: <strong>{log.adminName}</strong>
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: VIEW FULL COMPANY COMPLIANCE DOSSIER */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                  Regulatory Compliance Dossier
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-1.5">
                  {selectedCompany.companyName}
                  {selectedCompany.isVerified && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Executive</span>
                <span className="font-bold text-slate-900">{selectedCompany.contactPerson}</span>
                <div className="text-slate-500 text-[11px]">{selectedCompany.email}</div>
                <div className="text-slate-500 text-[11px]">{selectedCompany.phone}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Identifiers</span>
                <div>DUNS: <strong>{selectedCompany.dunsNumber || 'N/A'}</strong></div>
                <div>Trade License: <strong>{selectedCompany.tradeLicenseNo || 'N/A'}</strong></div>
                <div>VAT TRN: <strong>{selectedCompany.vatTrn || 'N/A'}</strong></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">ICV Certified</span>
                <span className="text-base font-black text-blue-900">{selectedCompany.icvScore}%</span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Risk Rating</span>
                <span className="text-base font-black text-emerald-900 uppercase">{selectedCompany.riskRating}</span>
              </div>
              <div className="bg-purple-50/70 p-2.5 rounded-lg border border-purple-200">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Procure Capacity</span>
                <span className="text-base font-black text-purple-900">{selectedCompany.annualProcureVolume || 'AED 50M+'}</span>
              </div>
            </div>

            {selectedCompany.auditNotes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-500 block uppercase mb-0.5">Auditor Field Notes:</span>
                <p className="text-slate-700 leading-relaxed">{selectedCompany.auditNotes}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleToggleVerification(selectedCompany);
                  setSelectedCompany(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                {selectedCompany.isVerified ? 'Revoke Verification' : 'Grant Verified Badge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT AUDIT METRICS */}
      {editModalCompany && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                Edit Audit Parameters: {editModalCompany.companyName}
              </h3>
              <button
                onClick={() => setEditModalCompany(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white"
                >
                  <option value="active">Active (Full B2B Rights)</option>
                  <option value="pending_verification">Pending Audit / Review</option>
                  <option value="suspended">Suspended (Trading Halted)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">In-Country Value (ICV) Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editIcvScore}
                  onChange={(e) => setEditIcvScore(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assessed Risk Tier</label>
                <select
                  value={editRiskRating}
                  onChange={(e) => setEditRiskRating(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white"
                >
                  <option value="low">Low (AAA Prime Grade)</option>
                  <option value="medium">Medium (Standard Milestone Gating)</option>
                  <option value="high">High (Mandatory Escrow + Third-Party FAT)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Admin Audit Notes</label>
                <textarea
                  rows={3}
                  value={editAuditNotes}
                  onChange={(e) => setEditAuditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setEditModalCompany(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompanyEdits}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Save Audit Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAKE DOWN CONTENT */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-rose-700 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Confirm Content Takedown & Sanction
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                You are removing <strong>{selectedReport.targetTitle}</strong> from public circulation across SOKO.ae.
              </p>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Administrative Note / Notification to Offender</label>
                <textarea
                  rows={3}
                  value={moderationActionNote}
                  onChange={(e) => setModerationActionNote(e.target.value)}
                  placeholder="State the regulatory code violation (e.g. Failure to supply audited Material Test Certificate, deceptive pricing)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white resize-none text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveModeration(selectedReport.id, 'action_taken')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Confirm Takedown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SuperAdminRestrictedGate: React.FC<{
  onLogin: () => void;
  isRefreshing: boolean;
  onNavigateToTab: (tab: string) => void;
}> = ({ onLogin, isRefreshing, onNavigateToTab }) => (
  <div className="max-w-4xl mx-auto px-4 py-16">
    <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-lg">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-5 shadow-xs">
        <Lock className="w-8 h-8" />
      </div>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 mb-3">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
        Restricted Enterprise Zone
      </span>
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
        Super Administrator Portal Authorization Required
      </h2>
      <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
        The SOKO Super Admin Portal provides central control over platform-wide supplier, buyer, and
        contractor company verifications, ICV compliance auditing, and incident moderation.
      </p>

      <div className="mt-6 p-4 rounded-xl bg-blue-50/80 border border-blue-200 max-w-md mx-auto text-left text-xs">
        <span className="font-bold text-blue-900 block mb-1">
          🔑 Authenticated Administrator Credentials:
        </span>
        <div className="font-mono text-slate-700 space-y-0.5">
          <div>Email: <span className="font-bold text-blue-700">admin@soko.ae</span></div>
          <div>Password: <span className="font-bold text-blue-700">Password123!</span></div>
          <div>Profile: <span className="text-slate-600">Zackary Al-Hassan (Chief Governance Officer)</span></div>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onLogin}
          disabled={isRefreshing}
          className="w-full sm:w-auto px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <ShieldCheck className="w-4 h-4 text-cyan-300" />
          <span>{isRefreshing ? 'Authenticating...' : 'Sign In as Super Admin (1-Click)'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigateToTab('feed')}
          className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
        >
          Return to Marketplace Feed
        </button>
      </div>
    </div>
  </div>
);

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = (props) => {
  const { user, login } = useAuth();
  const isAdmin = props.currentUser.role === 'admin' || user?.role === 'admin';
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleQuickAdminLogin = async () => {
    setIsRefreshing(true);
    await login({ email: 'admin@soko.ae', password: 'Password123!' });
    setIsRefreshing(false);
  };

  if (!isAdmin) {
    return (
      <SuperAdminRestrictedGate
        onLogin={handleQuickAdminLogin}
        isRefreshing={isRefreshing}
        onNavigateToTab={props.onNavigateToTab}
      />
    );
  }

  return <SuperAdminDashboard {...props} />;
};
