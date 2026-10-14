import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  LayoutDashboard,
  Settings,
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  BadgeCheck,
  ScrollText,
  Database,
  Contact,
  MapPin,
  Package,
  Network,
  CreditCard,
  ArrowLeft,
  Construction,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile, UserRole, CompanyProfileAudit, ModerationReportItem, BackendActivityLog, PlatformStats } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient } from '../lib/supabaseClient';
import { type AdminCompany, type LiveVerificationStatus, VERIFICATION_LABELS } from './admin/companyShared';
import { CompanyDirectory } from './admin/CompanyDirectory';
import { CompanyProfileDrawer } from './admin/CompanyProfileDrawer';
import { VerificationCenter } from './admin/VerificationCenter';
import { VerificationReviewDrawer } from './admin/VerificationReviewDrawer';
import { UsersAccess } from './admin/UsersAccess';
import { DigitalCards } from './admin/DigitalCards';
import { SupplierVisits } from './admin/SupplierVisits';
import { ProductCatalog } from './admin/ProductCatalog';
import { ContactInbox } from './admin/ContactInbox';

interface SuperAdminPortalProps {
  currentUser: UserProfile;
  onNavigateToTab: (tab: string) => void;
  onSelectUserForDemo?: (role: UserRole) => void;
  isDemo?: boolean;
}

const DEMO_STATS: PlatformStats = {
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
};

// Must stay within the column-level SELECT grant on public.companies; select('*') is rejected.
const LIVE_COMPANY_COLUMNS =
  'id, soko_id, kind, legal_name, trading_name, country, emirate, general_email, phone, is_suspended, verification_status, verified_at, created_at, updated_at';

interface LiveCompanyRow {
  id: string;
  soko_id: string | null;
  kind: 'supplier' | 'contractor';
  legal_name: string;
  trading_name: string | null;
  country: string | null;
  emirate: string | null;
  general_email: string | null;
  phone: string | null;
  is_suspended: boolean;
  verification_status: LiveVerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface LivePlatformStats {
  companies: number | null;
  suppliers: number | null;
  contractors: number | null;
  verified: number | null;
  pendingVerifications: number | null;
  campaignsPending: number | null;
  openReports: number | null;
  publishedProducts: number | null;
  openContactInquiries: number | null;
}

const LIVE_UNAVAILABLE_SUBJECT: Record<string, string> = {
  moderation: 'Trust & moderation reports',
  audit_logs: 'The audit & security trail',
};

type AdminSection =
  | 'overview'
  | 'companies'
  | 'users'
  | 'verification'
  | 'cards'
  | 'visits'
  | 'products'
  | 'network_intel'
  | 'ai'
  | 'plans'
  | 'moderation'
  | 'audit_logs'
  | 'contact_inbox'
  | 'settings';

// live: reads authorized Supabase data in live mode. demo_only: demo records in demo mode, not yet connected live.
// placeholder: UI-only shell with no data and no actions until its data model and permissions exist.
type ModuleAvailability = 'live' | 'demo_only' | 'placeholder';

interface AdminModule {
  id: AdminSection;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  availability: ModuleAvailability;
  planned?: string[];
}

const ADMIN_NAV_GROUPS: { label: string; modules: AdminModule[] }[] = [
  {
    label: 'Overview',
    modules: [
      {
        id: 'overview',
        label: 'Command Center',
        title: 'Command Center',
        description: 'Network health, verification workload and trust signals across SOKO at a glance.',
        icon: LayoutDashboard,
        availability: 'live',
      },
    ],
  },
  {
    label: 'Network Management',
    modules: [
      {
        id: 'companies',
        label: 'Companies',
        title: 'Companies',
        description: 'Every registered supplier and contractor company with its verification and account status.',
        icon: Building2,
        availability: 'live',
      },
      {
        id: 'users',
        label: 'Users & Access',
        title: 'Users & Access',
        description: 'People on the network, their company memberships and administrative access.',
        icon: Users,
        availability: 'live',
      },
      {
        id: 'verification',
        label: 'Verification Center',
        title: 'Verification Center',
        description: 'Companies awaiting or holding verification. Filter by status and review each profile.',
        icon: BadgeCheck,
        availability: 'live',
      },
      {
        id: 'cards',
        label: 'Digital Business Cards',
        title: 'Digital Business Cards',
        description: 'Digital business cards issued to members, how they are shared and how reported cards are governed.',
        icon: Contact,
        availability: 'live',
      },
      {
        id: 'visits',
        label: 'Supplier Visits',
        title: 'Supplier Visits',
        description: 'Supplier visit requests, schedules, participants and outcomes between suppliers and host companies.',
        icon: MapPin,
        availability: 'live',
      },
    ],
  },
  {
    label: 'Content & Intelligence',
    modules: [
      {
        id: 'products',
        label: 'Products & Categories',
        title: 'Products & Categories',
        description: 'Supplier product listings, the categories and brands they use, and catalog governance.',
        icon: Package,
        availability: 'live',
      },
      {
        id: 'network_intel',
        label: 'Network Intelligence',
        title: 'Network Intelligence',
        description: 'How suppliers and contractors connect, engage and grow across the network.',
        icon: Network,
        availability: 'placeholder',
        planned: [
          'Supplier and contractor connection graph',
          'Engagement by emirate and category',
          'Network growth over time',
        ],
      },
      {
        id: 'ai',
        label: 'AI & Intelligence',
        title: 'AI & Intelligence',
        description: 'Oversight of SOKO AI features, their usage and their safeguards.',
        icon: Sparkles,
        availability: 'placeholder',
        planned: ['SOKO AI usage overview', 'Model and safety configuration', 'AI output review queue'],
      },
    ],
  },
  {
    label: 'Commercial',
    modules: [
      {
        id: 'plans',
        label: 'Plans & Subscriptions',
        title: 'Plans & Subscriptions',
        description: 'Membership plans available to companies and their subscription status.',
        icon: CreditCard,
        availability: 'placeholder',
        planned: ['Plan catalogue and feature tiers', 'Company subscription status', 'Plan change history'],
      },
    ],
  },
  {
    label: 'Governance',
    modules: [
      {
        id: 'contact_inbox',
        label: 'Contact Inbox',
        title: 'Contact Inbox',
        description: 'Public Contact Us inquiries: search, assign, note and close them.',
        icon: Inbox,
        availability: 'live',
      },
      {
        id: 'moderation',
        label: 'Trust & Moderation',
        title: 'Trust & Moderation',
        description: 'Reported profiles, listings, counterfeit claims and misleading content submitted by members.',
        icon: AlertTriangle,
        availability: 'demo_only',
      },
      {
        id: 'audit_logs',
        label: 'Audit & Security',
        title: 'Audit & Security',
        description: 'Administrative ledger of verification changes, suspensions and other admin actions.',
        icon: ScrollText,
        availability: 'demo_only',
      },
    ],
  },
  {
    label: 'System',
    modules: [
      {
        id: 'settings',
        label: 'Platform Configuration',
        title: 'Platform Configuration',
        description: 'Your administrator session and the data source this panel reads from. Configuration controls are not available yet.',
        icon: Settings,
        availability: 'live',
      },
    ],
  },
];

const ADMIN_SECTIONS: AdminModule[] = ADMIN_NAV_GROUPS.flatMap((group) => group.modules);
const ADMIN_SECTION_GROUP: Record<AdminSection, string> = Object.fromEntries(
  ADMIN_NAV_GROUPS.flatMap((group) => group.modules.map((m) => [m.id, group.label])),
) as Record<AdminSection, string>;

function mapLiveCompany(row: LiveCompanyRow): AdminCompany {
  const isVerified = row.verification_status === 'verified';
  return {
    id: row.id,
    companyName: row.trading_name || row.legal_name,
    contactPerson: '',
    role: row.kind,
    email: row.general_email ?? '',
    phone: row.phone ?? '',
    location: [row.emirate, row.country].filter(Boolean).join(', '),
    isVerified,
    status: row.is_suspended ? 'suspended' : isVerified ? 'active' : 'pending_verification',
    icvScore: 0,
    riskRating: 'low',
    rating: 0,
    registeredDate: row.created_at,
    lastActive: row.updated_at ?? row.created_at,
    complianceCertCount: 0,
    liveVerificationStatus: row.verification_status,
    sokoId: row.soko_id,
    legalName: row.legal_name,
    tradingName: row.trading_name,
    emirate: row.emirate,
    country: row.country,
    verifiedAt: row.verified_at,
    updatedAt: row.updated_at,
  };
}

function toCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

// admin_platform_stats() returns a jsonb object of bigint counts keyed by snake_case names.
function parseLiveStats(data: unknown): LivePlatformStats {
  const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    companies: toCount(raw.companies),
    suppliers: toCount(raw.suppliers),
    contractors: toCount(raw.contractors),
    verified: toCount(raw.verified),
    pendingVerifications: toCount(raw.pending_verifications),
    campaignsPending: toCount(raw.campaigns_pending),
    openReports: toCount(raw.open_reports),
    publishedProducts: toCount(raw.published_products),
    openContactInquiries: toCount(raw.open_contact_inquiries),
  };
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'Unknown error';
}

const formatCount = (value: number | null | undefined) => (value == null ? '—' : value.toLocaleString());

const SuperAdminDashboard: React.FC<SuperAdminPortalProps> = ({
  currentUser,
  onNavigateToTab,
  isDemo = false,
}) => {
  const { user, isAuthenticated, isPlatformAdmin } = useAuth();
  const isAdmin = currentUser.role === 'admin' || user?.role === 'admin';
  const isLive = isAuthenticated && isPlatformAdmin && !isDemo;

  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'buyer' | 'supplier' | 'contractor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected company for detailed modal/drawer
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(null);
  const [reviewCompany, setReviewCompany] = useState<AdminCompany | null>(null);
  const closeVerificationReview = useCallback(() => setReviewCompany(null), []);
  const [editModalCompany, setEditModalCompany] = useState<CompanyProfileAudit | null>(null);
  const [editIcvScore, setEditIcvScore] = useState<number>(0);
  const [editRiskRating, setEditRiskRating] = useState<'low' | 'medium' | 'high'>('low');
  const [editStatus, setEditStatus] = useState<'active' | 'pending_verification' | 'suspended'>('active');
  const [editAuditNotes, setEditAuditNotes] = useState<string>('');

  // Selected report for action
  const [selectedReport, setSelectedReport] = useState<ModerationReportItem | null>(null);
  const [moderationActionNote, setModerationActionNote] = useState('');

  // Demo-only platform stats; live mode reads admin_platform_stats() into liveStats instead.
  const [stats, setStats] = useState<PlatformStats>(DEMO_STATS);
  const [liveStats, setLiveStats] = useState<LivePlatformStats | null>(null);

  // Companies state
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  // Moderation state
  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  // Activity logs
  const [logs, setLogs] = useState<BackendActivityLog[]>([]);

  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const requestIdRef = useRef(0);

  const [suspendTarget, setSuspendTarget] = useState<AdminCompany | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);
  const [inquiryNotices, setInquiryNotices] = useState<{ id: string; inquiryId: string | null }[]>([]);
  const [focusInquiryId, setFocusInquiryId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Reads through the signed-in user's Supabase session, so RLS and platform_admins checks apply.
  const fetchLiveData = async (requestId: number) => {
    const supabase = getSupabaseClient();
    const [companyRes, statsRes] = await Promise.all([
      supabase.from('companies').select(LIVE_COMPANY_COLUMNS).order('created_at', { ascending: false }),
      supabase.rpc('admin_platform_stats'),
    ]);
    if (companyRes.error) throw companyRes.error;
    if (statsRes.error) throw statsRes.error;
    if (requestId !== requestIdRef.current) return;
    setCompanies(((companyRes.data ?? []) as LiveCompanyRow[]).map(mapLiveCompany));
    setLiveStats(parseLiveStats(statsRes.data));
  };

  const fetchDemoData = async () => {
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
    if (!statsRes.ok && !compRes.ok && !modRes.ok && !logRes.ok) {
      throw new Error('Demo data service is unavailable.');
    }
  };

  const fetchAdminData = async () => {
    const requestId = ++requestIdRef.current;
    setIsRefreshing(true);
    setSyncState('loading');
    setSyncError(null);
    try {
      if (isLive) await fetchLiveData(requestId);
      else await fetchDemoData();
      if (requestId !== requestIdRef.current) return;
      setSyncState('success');
      setLastSyncedAt(new Date());
      if (isLive) {
        const supabase = getSupabaseClient();
        const noticeRes = await supabase
          .from('notifications')
          .select('id, payload')
          .eq('type', 'contact_inquiry.created')
          .is('read_at', null)
          .order('created_at', { ascending: false });
        if (!noticeRes.error) {
          setInquiryNotices(
            (noticeRes.data ?? []).map((row: { id: string; payload: { id?: string } | null }) => ({
              id: row.id,
              inquiryId: typeof row.payload?.id === 'string' ? row.payload.id : null,
            })),
          );
        }
      } else {
        setInquiryNotices([]);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setSyncState('error');
      setSyncError(errorMessage(err));
    } finally {
      if (requestId === requestIdRef.current) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setCompanies([]);
    setReports([]);
    setLogs([]);
    setLiveStats(null);
    setStats(DEMO_STATS);
    fetchAdminData();
  }, [isLive]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  const openSuspendDialog = (company: AdminCompany) => {
    setSuspendTarget(company);
    setSuspendReason('');
    setSuspendError(null);
  };

  // Suspension changes only go through admin_set_company_suspension(p_company, p_suspended, p_reason).
  const handleConfirmSuspension = async () => {
    if (!isLive || !suspendTarget || isSuspending) return;
    const reason = suspendReason.trim();
    if (reason.length < 5) {
      setSuspendError('Enter a reason of at least 5 characters.');
      return;
    }
    const suspend = suspendTarget.status !== 'suspended';
    setIsSuspending(true);
    setSuspendError(null);
    try {
      const { error } = await getSupabaseClient().rpc('admin_set_company_suspension', {
        p_company: suspendTarget.id,
        p_suspended: suspend,
        p_reason: reason,
      });
      if (error) throw error;
      showToast(`${suspendTarget.companyName} ${suspend ? 'suspended' : 'reinstated'}.`);
      setSuspendTarget(null);
      fetchAdminData();
    } catch (err) {
      setSuspendError(errorMessage(err));
    } finally {
      setIsSuspending(false);
    }
  };

  // Toggle company verification (demo only; live verification is not client-writable)
  const handleToggleVerification = async (company: CompanyProfileAudit) => {
    if (isLive) return;
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
    if (!editModalCompany || isLive) return;
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
    if (isLive) return;
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
      `"${c.contactPerson ?? ''}"`,
      c.email ?? '',
      c.phone ?? '',
      c.dunsNumber || '',
      c.vatTrn || '',
      c.isVerified ? 'YES' : 'NO',
      c.status,
      isLive ? '' : c.icvScore,
      isLive ? '' : c.riskRating,
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
      const matchName = (c.companyName ?? '').toLowerCase().includes(q);
      const matchPerson = (c.contactPerson ?? '').toLowerCase().includes(q);
      const matchDuns = c.dunsNumber?.toLowerCase().includes(q);
      const matchEmail = (c.email ?? '').toLowerCase().includes(q);
      const matchSokoId = (c.sokoId ?? '').toLowerCase().includes(q);
      const matchLegalName = (c.legalName ?? '').toLowerCase().includes(q);
      if (!matchName && !matchPerson && !matchDuns && !matchEmail && !matchSokoId && !matchLegalName) return false;
    }
    return true;
  });

  const closeCompanyProfile = useCallback(() => setSelectedCompany(null), []);

  const openDemoMetricsEditor = (comp: AdminCompany) => {
    setEditModalCompany(comp);
    setEditIcvScore(comp.icvScore);
    setEditRiskRating(comp.riskRating);
    setEditStatus(comp.status);
    setEditAuditNotes(comp.auditNotes || '');
  };

  const activeSection = ADMIN_SECTIONS.find((s) => s.id === section) ?? ADMIN_SECTIONS[0];
  const awaitingVerificationCount = companies.filter((c) => c.status === 'pending_verification').length;
  const verifiedCount = companies.filter((c) => c.isVerified && c.status !== 'suspended').length;
  const suspendedCount = companies.filter((c) => c.status === 'suspended').length;
  const moderationCount = isLive
    ? liveStats?.openReports ?? null
    : reports.filter((r) => r.status === 'pending').length;
  const sectionBadges: Partial<Record<AdminSection, number | null>> = {
    companies: companies.length,
    verification: isLive ? liveStats?.pendingVerifications ?? null : awaitingVerificationCount,
    moderation: moderationCount,
    contact_inbox: isLive ? liveStats?.openContactInquiries ?? null : null,
  };
  const recentCompanies = [...companies]
    .sort((a, b) => (Date.parse(b.registeredDate) || 0) - (Date.parse(a.registeredDate) || 0))
    .slice(0, 5);
  const adminInitials =
    (currentUser.name || 'Admin')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'A';

  const goToSection = (id: AdminSection, nextStatusFilter?: typeof statusFilter) => {
    setSection(id);
    setMobileNavOpen(false);
    if (nextStatusFilter) setStatusFilter(nextStatusFilter);
    else if (id === 'verification') setStatusFilter('pending');
    else if (id === 'companies') setStatusFilter('all');
  };

  const renderStatusPill = (comp: AdminCompany) => (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border shrink-0 ${
        comp.status === 'suspended'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : comp.isVerified
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      {comp.status === 'suspended'
        ? 'Suspended'
        : comp.isVerified
        ? 'Verified'
        : isLive
        ? VERIFICATION_LABELS[comp.liveVerificationStatus ?? 'not_submitted']
        : 'Pending'}
    </span>
  );

  const renderSidebar = (collapsed: boolean, onClose?: () => void) => (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center h-16 border-b border-white/10 shrink-0 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-5'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-tight min-w-0">
              <span className="font-['Outfit'] text-base font-extrabold text-white tracking-tight">SOKO</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Admin Panel</span>
            </span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close admin navigation"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav aria-label="Admin Panel sections" className="flex-1 overflow-y-auto py-3 px-3">
        <div className="flex flex-col gap-4">
          {ADMIN_NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.label} className="flex flex-col gap-1">
              {collapsed ? (
                groupIndex > 0 && <div className="mx-2 border-t border-white/10" aria-hidden="true" />
              ) : (
                <h2 className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {group.label}
                </h2>
              )}
              <ul className="flex flex-col gap-0.5" aria-label={collapsed ? group.label : undefined}>
                {group.modules.map((item) => {
                  const Icon = item.icon;
                  const isActive = section === item.id;
                  const badge = sectionBadges[item.id];
                  const tooltip =
                    item.availability === 'placeholder' ? `${item.label} (UI only, not connected)` : item.label;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => goToSection(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        title={collapsed ? tooltip : undefined}
                        className={`w-full flex items-center gap-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                          collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                        } ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        <Icon className="w-4.5 h-4.5 shrink-0" aria-hidden="true" />
                        {collapsed ? (
                          <span className="sr-only">{tooltip}</span>
                        ) : (
                          <>
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {item.availability === 'placeholder' ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'
                                }`}
                              >
                                UI only
                              </span>
                            ) : (
                              badge != null &&
                              badge > 0 && (
                                <span
                                  className={`min-w-5 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono text-center ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
                                  }`}
                                >
                                  {badge}
                                </span>
                              )
                            )}
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className={`border-t border-white/10 shrink-0 flex flex-col gap-2 ${collapsed ? 'p-2 items-center' : 'p-4'}`}>
        <div
          className={`flex items-center gap-2 text-[11px] font-semibold ${collapsed ? 'justify-center' : ''}`}
          title={isLive ? 'Live Supabase data' : 'Demo data'}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {collapsed ? (
            <span className="sr-only">{isLive ? 'Live Supabase data' : 'Demo data'}</span>
          ) : (
            <span className={isLive ? 'text-emerald-300' : 'text-amber-300'}>
              {isLive ? 'Live Supabase data' : 'Demo data only'}
            </span>
          )}
        </div>
        {!onClose && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={`flex items-center gap-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer transition-colors ${
              collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
            }`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-slate-950/60 cursor-pointer"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-slate-950 text-slate-300 shadow-2xl">
            {renderSidebar(false, () => setMobileNavOpen(false))}
          </div>
        </div>
      )}

      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen bg-slate-950 text-slate-300 shrink-0 transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebar(sidebarCollapsed)}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open admin navigation"
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex items-center gap-1.5 text-sm">
                <li className="hidden sm:block">
                  <button
                    type="button"
                    onClick={() => goToSection('overview')}
                    className="text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    SOKO Admin
                  </button>
                </li>
                <li className="hidden sm:block text-slate-300" aria-hidden="true">
                  <ChevronRight className="w-4 h-4" />
                </li>
                {section !== 'overview' && (
                  <>
                    <li className="hidden md:block text-slate-500 font-medium">{ADMIN_SECTION_GROUP[section]}</li>
                    <li className="hidden md:block text-slate-300" aria-hidden="true">
                      <ChevronRight className="w-4 h-4" />
                    </li>
                  </>
                )}
                <li aria-current="page" className="font-bold text-slate-900 truncate">
                  {activeSection.label}
                </li>
              </ol>
            </nav>

            <div className="flex-1" />

            <div className="hidden md:block relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                disabled
                placeholder="Global search coming soon"
                aria-label="Global search (not available yet)"
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 placeholder:text-slate-400 cursor-not-allowed"
              />
            </div>

            <button
              type="button"
              disabled={!isLive}
              aria-label={
                isLive
                  ? `${inquiryNotices.length} unread contact inquiry notification${inquiryNotices.length === 1 ? '' : 's'}`
                  : 'Notifications (not available yet)'
              }
              title={isLive ? 'Open Contact Inbox' : 'Notifications are not available yet'}
              onClick={async () => {
                if (!isLive) return;
                const first = inquiryNotices[0]?.inquiryId ?? null;
                setFocusInquiryId(first);
                goToSection('contact_inbox');
                if (inquiryNotices.length === 0) return;
                try {
                  const supabase = getSupabaseClient();
                  await supabase
                    .from('notifications')
                    .update({ read_at: new Date().toISOString() })
                    .in('id', inquiryNotices.map((n) => n.id));
                  setInquiryNotices([]);
                } catch {
                  /* keep the badge if mark-read fails */
                }
              }}
              className={`relative w-9 h-9 rounded-lg flex items-center justify-center border ${
                isLive
                  ? 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                  : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
              }`}
            >
              <Bell className="w-4 h-4" />
              {isLive && inquiryNotices.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                  {inquiryNotices.length > 9 ? '9+' : inquiryNotices.length}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <span
                  className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  {adminInitials}
                </span>
              )}
              <div className="hidden sm:flex flex-col leading-tight min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate max-w-36">{currentUser.name || 'Administrator'}</span>
                <span className="text-[11px] text-slate-500">{isLive ? 'Platform admin' : 'Demo admin persona'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToTab('feed')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to SOKO</span>
              <span className="sm:hidden sr-only">Back to SOKO</span>
            </button>
          </div>
        </header>

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12 flex flex-col gap-6">
          {/* Page header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-2 ${
                  isLive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isLive ? 'Live Supabase data • Platform admin session' : 'Demo data • Not live platform records'}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight text-balance">{activeSection.title}</h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed text-pretty">{activeSection.description}</p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={fetchAdminData}
                  disabled={isRefreshing}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-70 shadow-xs"
                  title={isLive ? 'Re-query Supabase' : 'Refresh demo data'}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isLive ? 'Sync Live' : 'Refresh Demo'}</span>
                </button>

                <button
                  onClick={handleExportReportCSV}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Governance Dossier</span>
                </button>
              </div>
              <p
                role="status"
                aria-live="polite"
                className={`text-[11px] font-mono min-h-4 ${syncState === 'error' ? 'text-rose-600' : 'text-slate-500'}`}
              >
                {syncState === 'loading' && (isLive ? 'Syncing with Supabase…' : 'Loading demo data…')}
                {syncState === 'success' && lastSyncedAt &&
                  `${isLive ? 'Synced' : 'Demo data loaded'} ${lastSyncedAt.toLocaleTimeString()}${isLive ? ` • ${companies.length} companies` : ''}`}
                {syncState === 'error' && `Sync failed: ${syncError}`}
              </p>
            </div>
          </div>

      {/* 4 Platform-Wide Statistics Cards */}
      {section === 'overview' && (
      <div className="flex flex-col gap-6">
      {isLive ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Enterprise Profiles</span>
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
              {formatCount(liveStats?.verified)} Verified
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCount(liveStats?.companies)} Companies
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span>{formatCount(liveStats?.suppliers)} Suppliers</span>
            <span>•</span>
            <span>{formatCount(liveStats?.contractors)} Contractors</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Verification Queue</span>
            <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
              {formatCount(liveStats?.verified)} Verified
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCount(liveStats?.pendingVerifications)} Pending
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Companies awaiting verification review</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Trust & Moderation</span>
            <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
              (liveStats?.openReports ?? 0) > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'
            }`}>
              {(liveStats?.openReports ?? 0) > 0 ? 'Needs review' : 'Clear'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCount(liveStats?.openReports)} Open reports
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>{formatCount(liveStats?.campaignsPending)} campaigns awaiting review</span>
          </div>
        </div>
      </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Company Profiles Managed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
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

        {/* Card 2: Verification Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Verification Queue</span>
            <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
              {verifiedCount} Verified
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {awaitingVerificationCount} Pending
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Demo companies awaiting verification review</span>
          </div>
        </div>

        {/* Card 3: Trust & Moderation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Trust & Moderation</span>
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section
          aria-labelledby="recent-companies-heading"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col"
        >
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div>
              <h2 id="recent-companies-heading" className="text-sm font-bold text-slate-900">
                Recent company registrations
              </h2>
              <p className="text-xs text-slate-500">Newest enterprise profiles on the platform</p>
            </div>
            <button
              type="button"
              onClick={() => goToSection('companies')}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentCompanies.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {recentCompanies.map((comp) => (
                <li key={comp.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCompany(comp)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 truncate">{comp.companyName}</span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        <span className="capitalize">{comp.role}</span>
                        {' • '}
                        {comp.location || 'Location not set'}
                      </span>
                    </span>
                    {renderStatusPill(comp)}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-xs text-slate-500">
              {syncState === 'loading'
                ? 'Loading company profiles…'
                : syncState === 'error'
                ? 'Company profiles could not be loaded. Use Sync to try again.'
                : 'No company profiles yet.'}
            </p>
          )}
        </section>

        <section
          aria-labelledby="attention-heading"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 id="attention-heading" className="text-sm font-bold text-slate-900">
              Needs attention
            </h2>
            <p className="text-xs text-slate-500">Queues that may require admin action</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {[
              {
                label: 'Awaiting verification',
                value: isLive ? liveStats?.pendingVerifications ?? null : awaitingVerificationCount,
                icon: Clock,
                tone: 'text-amber-700 bg-amber-50',
                onClick: () => goToSection('verification'),
              },
              {
                label: 'Suspended companies',
                value: suspendedCount,
                icon: Ban,
                tone: 'text-rose-700 bg-rose-50',
                onClick: () => goToSection('companies', 'suspended'),
              },
              {
                label: isLive ? 'Open moderation reports' : 'Pending moderation cases',
                value: moderationCount,
                icon: AlertTriangle,
                tone: 'text-blue-700 bg-blue-50',
                onClick: () => goToSection('moderation'),
              },
              {
                label: 'Verified companies',
                value: isLive ? liveStats?.verified ?? null : verifiedCount,
                icon: CheckCircle2,
                tone: 'text-emerald-700 bg-emerald-50',
                onClick: () => goToSection('companies', 'verified'),
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <li key={row.label}>
                  <button
                    type="button"
                    onClick={row.onClick}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${row.tone}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1 text-xs font-semibold text-slate-700">{row.label}</span>
                    <span className="text-sm font-bold font-mono text-slate-900">{formatCount(row.value)}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      </div>
      )}

      {activeSection.availability === 'placeholder' && (
        <section
          aria-labelledby="placeholder-module-heading"
          className="bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm p-6 sm:p-10"
        >
          <div className="flex flex-col items-center text-center gap-3 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Construction className="w-6 h-6" aria-hidden="true" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
              UI only · Not connected
            </span>
            <h3 id="placeholder-module-heading" className="text-lg font-bold text-slate-900 text-balance">
              {activeSection.title} is not available yet
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed text-pretty">
              This module has no data source or admin permissions yet, so it shows no records and offers no
              actions. Nothing here reads from or writes to the database.
            </p>
            {activeSection.planned && activeSection.planned.length > 0 && (
              <div className="w-full mt-2 text-left rounded-xl bg-slate-50 border border-slate-200 p-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Planned scope
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {activeSection.planned.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Administrative Control Hub */}
      {section !== 'overview' && section !== 'settings' && activeSection.availability !== 'placeholder' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {section === 'companies' && (
          <CompanyDirectory
            companies={companies}
            filteredCompanies={filteredCompanies}
            isLive={isLive}
            syncState={syncState}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onViewCompany={setSelectedCompany}
            onToggleSuspension={openSuspendDialog}
            onEditDemoMetrics={openDemoMetricsEditor}
          />
        )}

        {section === 'users' && (
          <UsersAccess companies={companies} isLive={isLive} syncToken={lastSyncedAt?.getTime() ?? 0} />
        )}

        {section === 'cards' && (
          <DigitalCards companies={companies} isLive={isLive} syncToken={lastSyncedAt?.getTime() ?? 0} />
        )}

        {section === 'products' && (
          <ProductCatalog
            companies={companies}
            isLive={isLive}
            publishedTotal={liveStats?.publishedProducts ?? null}
            syncToken={lastSyncedAt?.getTime() ?? 0}
          />
        )}

        {section === 'visits' && (
          <SupplierVisits companies={companies} isLive={isLive} syncToken={lastSyncedAt?.getTime() ?? 0} />
        )}

        {section === 'contact_inbox' && (
          <ContactInbox
            isLive={isLive}
            syncToken={lastSyncedAt?.getTime() ?? 0}
            openCount={liveStats?.openContactInquiries ?? null}
            focusId={focusInquiryId}
          />
        )}

        {/* TAB 1: COMPANY PROFILES & VERIFICATION */}
        {section === 'verification' && (
          <VerificationCenter
            companies={companies}
            isLive={isLive}
            syncState={syncState}
            initialStage={statusFilter === 'pending' ? 'pending' : statusFilter === 'verified' ? 'verified' : 'all'}
            onReview={setReviewCompany}
          />
        )}

        {isLive && activeSection.availability === 'demo_only' && (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Not yet available in live mode</h3>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed text-pretty">
              {LIVE_UNAVAILABLE_SUBJECT[section]} is not connected to Supabase yet. Demo records are hidden here so
              they are never mistaken for live platform data.
            </p>
          </div>
        )}

        {/* TAB 2: MODERATION & INCIDENT LOG */}
        {section === 'moderation' && !isLive && (
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

        {/* TAB 4: SYSTEM AUDIT LOGS */}
        {section === 'audit_logs' && !isLive && (
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
      )}

      {section === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section aria-labelledby="settings-session-heading" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h2 id="settings-session-heading" className="text-sm font-bold text-slate-900">Administrator session</h2>
            </div>
            <dl className="flex flex-col divide-y divide-slate-100 text-xs">
              {[
                { term: 'Name', detail: currentUser.name || '—' },
                { term: 'Email', detail: currentUser.email || '—' },
                { term: 'Access', detail: isLive ? 'Platform admin (granted by SOKO)' : 'Demo persona • no live access' },
                { term: 'Mode', detail: isLive ? 'Live' : 'Demo' },
              ].map((row) => (
                <div key={row.term} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-slate-500 font-medium">{row.term}</dt>
                  <dd className="font-semibold text-slate-900 text-right truncate">{row.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="settings-source-heading" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <h2 id="settings-source-heading" className="text-sm font-bold text-slate-900">Data source</h2>
            </div>
            <dl className="flex flex-col divide-y divide-slate-100 text-xs">
              {[
                { term: 'Source', detail: isLive ? 'Supabase via your signed-in session' : 'Local demo data service' },
                { term: 'Row-level security', detail: isLive ? 'Enforced on every query' : 'Not applicable' },
                { term: 'Last sync', detail: lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : '—' },
                {
                  term: 'Status',
                  detail:
                    syncState === 'error' ? 'Sync failed' : syncState === 'loading' ? 'Syncing…' : syncState === 'success' ? 'Up to date' : 'Idle',
                },
              ].map((row) => (
                <div key={row.term} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-slate-500 font-medium">{row.term}</dt>
                  <dd className="font-semibold text-slate-900 text-right truncate">{row.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="md:col-span-2 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 p-4 leading-relaxed">
            Platform settings can&apos;t be configured from this dashboard yet. Administrator access is managed by SOKO
            outside this interface.
          </p>
        </div>
      )}
        </div>
      </div>

      {reviewCompany && (
        <VerificationReviewDrawer company={reviewCompany} isLive={isLive} onClose={closeVerificationReview} />
      )}

      {selectedCompany && (
        <CompanyProfileDrawer
          company={selectedCompany}
          isLive={isLive}
          onClose={closeCompanyProfile}
          onDemoToggleVerification={(company) => {
            handleToggleVerification(company);
            setSelectedCompany(null);
          }}
          onDemoEditMetrics={(company) => {
            setSelectedCompany(null);
            openDemoMetricsEditor(company);
          }}
        />
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

      {/* MODAL: CONFIRM LIVE SUSPENSION CHANGE */}
      {isLive && suspendTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="suspend-dialog-title"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3
                id="suspend-dialog-title"
                className={`font-bold text-sm flex items-center gap-1.5 ${
                  suspendTarget.status === 'suspended' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                {suspendTarget.status === 'suspended' ? 'Confirm Company Reinstatement' : 'Confirm Company Suspension'}
              </h3>
              <button
                onClick={() => setSuspendTarget(null)}
                disabled={isSuspending}
                aria-label="Close"
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 flex flex-col gap-2">
              <p className="leading-relaxed">
                {suspendTarget.status === 'suspended' ? (
                  <>You are reinstating <strong>{suspendTarget.companyName}</strong> on the live platform.</>
                ) : (
                  <>
                    You are suspending <strong>{suspendTarget.companyName}</strong> on the live platform. Pending
                    invitations are revoked and the company&apos;s team managers are notified.
                  </>
                )}
              </p>
              <label htmlFor="suspend-reason" className="font-bold text-slate-700">
                Reason (recorded in the audit log)
              </label>
              <textarea
                id="suspend-reason"
                rows={3}
                maxLength={1000}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white resize-none text-xs"
              />
              {suspendError && (
                <p role="alert" className="text-rose-700 font-semibold">
                  {suspendError}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSuspendTarget(null)}
                disabled={isSuspending}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuspension}
                disabled={isSuspending || suspendReason.trim().length < 5}
                className={`px-4 py-2 text-white font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  suspendTarget.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSuspending
                  ? 'Saving…'
                  : suspendTarget.status === 'suspended'
                  ? 'Confirm Reinstatement'
                  : 'Confirm Suspension'}
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
        <span className="font-bold text-blue-900 block mb-1">Platform administrator access</span>
        <p className="text-slate-700 leading-relaxed">
          Sign in with an account that has been granted platform administrator access by SOKO. If access was
          granted recently, re-check it below.
        </p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onLogin}
          disabled={isRefreshing}
          className="w-full sm:w-auto px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <ShieldCheck className="w-4 h-4 text-cyan-300" />
          <span>{isRefreshing ? 'Checking access...' : 'Re-check admin access'}</span>
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
  const { user, refreshAccess } = useAuth();
  const isAdmin = props.currentUser.role === 'admin' || user?.role === 'admin';
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Platform admin is granted only in public.platform_admins; this re-reads it for the current session.
  const handleQuickAdminLogin = async () => {
    setIsRefreshing(true);
    await refreshAccess();
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
