import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  FolderKanban,
  Tablet,
  GraduationCap,
  Search,
  Filter,
  CheckCircle2,
  Mail,
  Phone,
  Clock,
  Trash2,
  Edit2,
  Download,
  AlertCircle,
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileText,
  Lock,
  Eye,
  Check,
  X,
  ShieldAlert,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  ArrowRight,
  HelpCircle,
  Briefcase,
} from 'lucide-react';
import {
  CompanyTeamMember,
  TeamActivityLogItem,
  CompanyRolePermission,
  UserProfile,
  AccessLevelType,
  RoleAccessConfig,
} from '../types';

interface TeamManagementViewProps {
  currentUser: UserProfile;
  teamMembers: CompanyTeamMember[];
  onUpdateTeamMembers: (members: CompanyTeamMember[]) => void;
  activityLogs: TeamActivityLogItem[];
  onAddActivityLog: (log: TeamActivityLogItem) => void;
  onNavigateToTab?: (tab: string) => void;
}

// Pre-defined role permissions and access restriction policies
export const ROLE_ACCESS_CONFIGS: Record<CompanyRolePermission, RoleAccessConfig> = {
  'Procurement Lead': {
    role: 'Procurement Lead',
    level: 'Commercial Lead',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Commercial sourcing lead with tender issuing, quotation negotiation, and awarding authority.',
    allowedActions: [
      'Create, publish, and blast commercial RFQs to supplier network',
      'Evaluate sealed supplier & subcontractor proposals and unit rates',
      'Award contracts & issue Purchase Orders up to AED 10,000,000',
      'Conduct direct price counter-offers & vendor negotiations',
      'Host vendor meetings via Reception Kiosk',
      'Access procurement spend analytics and savings metrics',
    ],
    restrictedActions: [
      'Cannot invite or remove Enterprise Admin accounts',
      'Cannot edit corporate legal registration (DUNS, TRN, trade license)',
      'Cannot authorize bank escrow releases above AED 10M without Board approval',
    ],
    canIssueRFPs: true,
    canAwardContracts: true,
    canMessageSuppliers: true,
    canHostKioskVisits: true,
    canManageTeam: false,
    canViewFinancials: true,
    maxApprovalLimitAED: 10000000,
  },
  'Project Manager': {
    role: 'Project Manager',
    level: 'Project Level',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Site operations and project delivery lead. Controls site material requirements and technical FAT inspections.',
    allowedActions: [
      'Draft and submit project-level material and equipment RFPs',
      'Log site consignment receipts and verify Material Test Certificates (MTC)',
      'Host supplier technical presentations & mock-up demos via Reception Kiosk',
      'Message assigned bidders for technical specification clarifications',
      'Track milestone progress & FAT delivery schedules',
    ],
    restrictedActions: [
      'Restricted from final commercial tender awards exceeding AED 1,000,000',
      'Cannot view executive-wide profit margins or sensitive billing data',
      'Cannot alter company-wide team member seat allocations',
    ],
    canIssueRFPs: true,
    canAwardContracts: false,
    canMessageSuppliers: true,
    canHostKioskVisits: true,
    canManageTeam: false,
    canViewFinancials: false,
    maxApprovalLimitAED: 1000000,
  },
  'Viewer': {
    role: 'Viewer',
    level: 'Viewer (Read-Only)',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'Restricted read-only observational access for quality inspectors, site supervisors, and auditors.',
    allowedActions: [
      'Inspect published company RFQs, tenders, and job postings',
      'View incoming bid responses and technical comparison matrices',
      'Review reception visitor check-in logs and contractor meetings',
      'Browse maintained procurement rolodex and supplier directory',
      'Read SoKo Academy masterclasses and learning resources',
    ],
    restrictedActions: [
      'PROHIBITED: Cannot create, publish, or edit RFQs or tenders',
      'PROHIBITED: Cannot award bids or sign commercial agreements',
      'PROHIBITED: Cannot send direct messages or initiate vendor negotiations',
      'PROHIBITED: Cannot invite, edit, or remove company team members',
      'PROHIBITED: Confidential corporate cost margins hidden from view',
    ],
    canIssueRFPs: false,
    canAwardContracts: false,
    canMessageSuppliers: false,
    canHostKioskVisits: false,
    canManageTeam: false,
    canViewFinancials: false,
    maxApprovalLimitAED: 0,
  },
  'Admin / Executive': {
    role: 'Admin / Executive',
    level: 'Full Access',
    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    description: 'Full executive governance with complete enterprise workspace control and unlimited financial authorization.',
    allowedActions: [
      'Full administrative access across all modules and projects',
      'Invite, edit roles, and revoke team member workspace access',
      'Unrestricted tender creation, sealed bid opening, and awarding',
      'Authorize milestone escrow disbursement releases',
      'Edit legal trade license, ICV audit scores, and corporate credentials',
      'Export full compliance audit trails and financial reports',
    ],
    restrictedActions: [],
    canIssueRFPs: true,
    canAwardContracts: true,
    canMessageSuppliers: true,
    canHostKioskVisits: true,
    canManageTeam: true,
    canViewFinancials: true,
    maxApprovalLimitAED: 50000000,
  },
  'Senior Estimator': {
    role: 'Senior Estimator',
    level: 'Commercial Lead',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Quantity take-off and pricing analysis specialist.',
    allowedActions: [
      'Prepare tender packages and quantity take-offs',
      'Analyze bidder pricing variances and create side-by-side matrices',
      'Draft RFP requirements for Procurement Lead sign-off',
    ],
    restrictedActions: [
      'Requires Procurement Lead sign-off for final contract awarding',
      'Cannot manage company team members',
    ],
    canIssueRFPs: true,
    canAwardContracts: false,
    canMessageSuppliers: true,
    canHostKioskVisits: false,
    canManageTeam: false,
    canViewFinancials: true,
    maxApprovalLimitAED: 500000,
  },
  'Site Sourcing Manager': {
    role: 'Site Sourcing Manager',
    level: 'Project Level',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    description: 'Site-level procurement and logistics coordination.',
    allowedActions: [
      'Create site material requisitions',
      'Host vendor reception meetings',
      'Inspect incoming materials',
    ],
    restrictedActions: [
      'Cannot award contracts > AED 500,000',
      'Cannot view company-wide margins',
    ],
    canIssueRFPs: true,
    canAwardContracts: false,
    canMessageSuppliers: true,
    canHostKioskVisits: true,
    canManageTeam: false,
    canViewFinancials: false,
    maxApprovalLimitAED: 500000,
  },
  'Contracts Auditor': {
    role: 'Contracts Auditor',
    level: 'Commercial Lead',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    description: 'Legal compliance, UAE ICV audit, and contract risk analyst.',
    allowedActions: [
      'Inspect subcontracts for FIDIC/UAE commercial code compliance',
      'Audit supplier ICV certificates and ISO accreditation',
      'Access legal and escrow audit trails',
    ],
    restrictedActions: [
      'Cannot create commercial tenders without procurement authorization',
      'Cannot manage team members',
    ],
    canIssueRFPs: false,
    canAwardContracts: false,
    canMessageSuppliers: true,
    canHostKioskVisits: false,
    canManageTeam: false,
    canViewFinancials: true,
    maxApprovalLimitAED: 0,
  },
};

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  currentUser,
  teamMembers,
  onUpdateTeamMembers,
  activityLogs,
  onAddActivityLog,
  onNavigateToTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'activity' | 'permissions'>('members');

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Email Invite Form Data
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    title: string;
    department: string;
    roleInCompany: CompanyRolePermission;
    phone: string;
    customApprovalLimit: number;
    customPermissionsOverride: {
      canIssueRFPs: boolean;
      canAwardContracts: boolean;
      canMessageSuppliers: boolean;
      canHostKioskVisits: boolean;
      canViewFinancials: boolean;
    };
  }>({
    name: '',
    email: '',
    title: '',
    department: 'Procurement & Sourcing',
    roleInCompany: 'Procurement Lead',
    phone: '',
    customApprovalLimit: 10000000,
    customPermissionsOverride: {
      canIssueRFPs: true,
      canAwardContracts: true,
      canMessageSuppliers: true,
      canHostKioskVisits: true,
      canViewFinancials: true,
    },
  });

  // Selected Member for Access Inspection / Editing Drawer
  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<CompanyTeamMember | null>(null);
  const [editRoleModalMember, setEditRoleModalMember] = useState<CompanyTeamMember | null>(null);
  const [editRoleChoice, setEditRoleChoice] = useState<CompanyRolePermission>('Procurement Lead');

  // Copy link state
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const departments = [
    'All',
    'Procurement & Sourcing',
    'Site Operations',
    'Estimating & Bidding',
    'Contracts & Legal',
    'Executive Management',
  ];

  const roleFilterOptions = ['All', 'Procurement Lead', 'Project Manager', 'Viewer', 'Admin / Executive'];

  // Handle role change inside the invite form
  const handleRoleSelection = (role: CompanyRolePermission) => {
    const config = ROLE_ACCESS_CONFIGS[role] || ROLE_ACCESS_CONFIGS['Procurement Lead'];
    setFormData((prev) => ({
      ...prev,
      roleInCompany: role,
      customApprovalLimit: config.maxApprovalLimitAED || 0,
      customPermissionsOverride: {
        canIssueRFPs: config.canIssueRFPs,
        canAwardContracts: config.canAwardContracts,
        canMessageSuppliers: config.canMessageSuppliers,
        canHostKioskVisits: config.canHostKioskVisits,
        canViewFinancials: config.canViewFinancials,
      },
    }));
  };

  const filteredMembers = teamMembers.filter((m) => {
    const matchesDept = departmentFilter === 'All' || m.department === departmentFilter;
    const matchesRole = roleFilter === 'All' || m.roleInCompany === roleFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.title.toLowerCase().includes(q) ||
      m.roleInCompany.toLowerCase().includes(q);
    return matchesDept && matchesRole && matchesSearch;
  });

  // Send Invitation via Email handler
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return;

    const chosenRoleConfig = ROLE_ACCESS_CONFIGS[formData.roleInCompany] || ROLE_ACCESS_CONFIGS['Procurement Lead'];
    const assignedName = formData.name.trim() || formData.email.split('@')[0].replace('.', ' ').replace(/^./, (str) => str.toUpperCase());
    const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const inviteUrl = `https://soko.ae/join/${currentUser.company.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'apexmech'}?token=${inviteToken}`;

    const newMember: CompanyTeamMember = {
      id: `tm_${Date.now()}`,
      name: assignedName,
      email: formData.email.trim(),
      title: formData.title.trim() || `${formData.roleInCompany}`,
      department: formData.department,
      roleInCompany: formData.roleInCompany,
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 5000)}?w=150&auto=format&fit=crop&q=80`,
      phone: formData.phone || '+971 4 000 0000',
      status: 'Invited',
      joinedDate: 'Pending Invite',
      lastActive: 'Invitation Sent',
      rfpsCreated: 0,
      visitsHosted: 0,
      academyPoints: 0,
      coursesCompleted: 0,
      accessLevel: chosenRoleConfig.level,
      invitedBy: currentUser.name,
      inviteLink: inviteUrl,
      restrictedAccessDetails: chosenRoleConfig.restrictedActions,
      maxApprovalLimitAED: formData.customApprovalLimit,
    };

    const updated = [newMember, ...teamMembers];
    onUpdateTeamMembers(updated);

    // Record Immutable Audit Log
    const newLog: TeamActivityLogItem = {
      id: `act_${Date.now()}`,
      memberId: 'tm_1',
      memberName: currentUser.name,
      memberAvatar: currentUser.avatarUrl,
      action: `Invited new team member ${newMember.name} (${newMember.email}) via corporate email`,
      category: 'team',
      timestamp: 'Just now',
      details: `Assigned Role: ${newMember.roleInCompany} | Access Level: ${chosenRoleConfig.level} | Approval Limit: AED ${formData.customApprovalLimit.toLocaleString()}`,
    };
    onAddActivityLog(newLog);

    setGeneratedInviteLink(inviteUrl);
    setShowAddModal(false);
    setFormData({
      name: '',
      email: '',
      title: '',
      department: 'Procurement & Sourcing',
      roleInCompany: 'Procurement Lead',
      phone: '',
      customApprovalLimit: 10000000,
      customPermissionsOverride: {
        canIssueRFPs: true,
        canAwardContracts: true,
        canMessageSuppliers: true,
        canHostKioskVisits: true,
        canViewFinancials: true,
      },
    });

    showToast(`✓ Invitation email dispatched to ${newMember.email} with ${newMember.roleInCompany} access permissions!`);
  };

  // Update existing team member's role
  const handleSaveRoleChange = () => {
    if (!editRoleModalMember) return;
    const config = ROLE_ACCESS_CONFIGS[editRoleChoice] || ROLE_ACCESS_CONFIGS['Viewer'];

    const updated = teamMembers.map((m) =>
      m.id === editRoleModalMember.id
        ? {
            ...m,
            roleInCompany: editRoleChoice,
            accessLevel: config.level,
            restrictedAccessDetails: config.restrictedActions,
            maxApprovalLimitAED: config.maxApprovalLimitAED,
          }
        : m
    );
    onUpdateTeamMembers(updated);

    onAddActivityLog({
      id: `act_${Date.now()}`,
      memberId: 'tm_1',
      memberName: currentUser.name,
      memberAvatar: currentUser.avatarUrl,
      action: `Updated role for ${editRoleModalMember.name} to ${editRoleChoice}`,
      category: 'team',
      timestamp: 'Just now',
      details: `New Access Level: ${config.level}`,
    });

    setEditRoleModalMember(null);
    showToast(`✓ Role updated to ${editRoleChoice} for ${editRoleModalMember.name}`);
  };

  const handleRemoveMember = (id: string, name: string) => {
    if (confirm(`Are you sure you want to revoke enterprise workspace access for ${name}?`)) {
      const updated = teamMembers.filter((m) => m.id !== id);
      onUpdateTeamMembers(updated);
      showToast(`Revoked access for ${name}`);
    }
  };

  const copyInviteToClipboard = (url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 2500);
    showToast('Copied workspace invitation link to clipboard!');
  };

  // Aggregated Team Metrics
  const totalRfps = teamMembers.reduce((acc, m) => acc + m.rfpsCreated, 0);
  const totalVisits = teamMembers.reduce((acc, m) => acc + m.visitsHosted, 0);
  const totalCourses = teamMembers.reduce((acc, m) => acc + m.coursesCompleted, 0);
  const totalPoints = teamMembers.reduce((acc, m) => acc + m.academyPoints, 0);

  const activeRoleConfig = ROLE_ACCESS_CONFIGS[formData.roleInCompany] || ROLE_ACCESS_CONFIGS['Procurement Lead'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Company Profile Identity */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  General Contractor Workspace
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Role-Based Access Control (RBAC)
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  License # {currentUser.dunsNumber || '44-019-8821'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentUser.company} — Team & Role Governance
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Invite colleagues via corporate email, assign restricted roles (Procurement Lead, Project Manager, Viewer), and manage financial authorization thresholds.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-stretch lg:self-auto justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4 text-purple-200" />
              <span>Invite Member via Email</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Active Team Seats</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{teamMembers.length} <span className="text-xs text-slate-500 font-normal">/ 15 Seats</span></div>
            <p className="text-[11px] text-slate-500 mt-0.5">Enterprise GC Workspace</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Commercial RFPs Issued</span>
              <FolderKanban className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalRfps}</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Lead & PM Managed Tenders</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Kiosk Vendor Visits</span>
              <Tablet className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalVisits}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Logged via Office VMS</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Access Scopes</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">4 Levels</div>
            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Lead, PM, Viewer, Admin</p>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveSubTab('members')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'members'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Company Members ({teamMembers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('permissions')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'permissions'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Role Permissions & Access Matrix</span>
          </button>

          <button
            onClick={() => setActiveSubTab('activity')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'activity'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Audit Trail & Activity ({activityLogs.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Restricted Permission Tiers Active</span>
        </div>
      </div>

      {/* Sub-Tab 1: Members Roster */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team member by name, corporate email, role, or title..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs text-slate-500 font-medium">Role:</span>
              {roleFilterOptions.map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    roleFilter === role
                      ? 'bg-purple-100 text-purple-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Department Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs text-slate-500 font-medium">Dept:</span>
              {departments.slice(0, 4).map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    departmentFilter === dept
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Team Member / Corporate Email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Access Scope & Limits</th>
                    <th className="py-3 px-4 text-center">RFPs Issued</th>
                    <th className="py-3 px-4 text-center">VMS Visits</th>
                    <th className="py-3 px-4">Status / Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMembers.map((member) => {
                    const config = ROLE_ACCESS_CONFIGS[member.roleInCompany] || ROLE_ACCESS_CONFIGS['Viewer'];

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{member.name}</span>
                                {member.status === 'Invited' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    INVITED
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1 font-mono text-purple-700">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  {member.email}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {member.title} • {member.department}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${config.badgeColor}`}
                          >
                            {member.roleInCompany === 'Procurement Lead' && <Briefcase className="w-3 h-3" />}
                            {member.roleInCompany === 'Project Manager' && <FolderKanban className="w-3 h-3" />}
                            {member.roleInCompany === 'Viewer' && <Eye className="w-3 h-3" />}
                            {member.roleInCompany === 'Admin / Executive' && <ShieldCheck className="w-3 h-3" />}
                            <span>{member.roleInCompany}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block text-xs">
                              {member.accessLevel || config.level}
                            </span>
                            {config.maxApprovalLimitAED && config.maxApprovalLimitAED > 0 ? (
                              <span className="text-[11px] text-emerald-700 font-semibold block">
                                Approval Limit: AED {(member.maxApprovalLimitAED || config.maxApprovalLimitAED).toLocaleString()}
                              </span>
                            ) : member.roleInCompany === 'Viewer' ? (
                              <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                                <Lock className="w-3 h-3 text-slate-400" />
                                Restricted: Read-Only
                              </span>
                            ) : (
                              <span className="text-[11px] text-indigo-700 font-semibold block">
                                Executive Sign-Off
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {member.rfpsCreated}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-100">
                            {member.visitsHosted}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                member.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-400'
                              }`}
                            />
                            <span>{member.lastActive}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedMemberForDetails(member)}
                              className="px-2.5 py-1 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Inspect access permissions & restrictions"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Inspect Access</span>
                            </button>

                            {member.roleInCompany !== 'Admin / Executive' && (
                              <button
                                onClick={() => {
                                  setEditRoleModalMember(member);
                                  setEditRoleChoice(member.roleInCompany);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Change Role & Restrictions"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {member.roleInCompany !== 'Admin / Executive' && (
                              <button
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Revoke Workspace Access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Role Permissions & Access Matrix */}
      {activeSubTab === 'permissions' && (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                  Governance Matrix
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  FIDIC & UAE Commercial Law Compliant
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                General Contractor Role Permissions & Access Levels
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Overview of capability authorizations and restricted boundaries assigned across roles.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite New Role via Email</span>
            </button>
          </div>

          {/* 4 Primary Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Procurement Lead */}
            <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-2xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                  Commercial Lead
                </span>
                <span className="text-xs font-extrabold text-purple-700">Max AED 10M</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <span>Procurement Lead</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full authority to create tenders, negotiate pricing, issue RFQs, evaluate sealed bids, and award subcontractor packages up to AED 10M.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Issue & Award RFPs (≤ AED 10M)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Direct Supplier Messaging</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                  <X className="w-3.5 h-3.5 text-rose-500" />
                  <span>Cannot manage Admin seats</span>
                </div>
              </div>
            </div>

            {/* Project Manager */}
            <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                  Project Level
                </span>
                <span className="text-xs font-extrabold text-blue-700">Max AED 1M</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-600" />
                <span>Project Manager</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Site & execution management. Raises site material RFPs, inspects FAT delivery shipments, and hosts kiosk vendor technical meetings.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Draft Site Project RFPs</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Host Kiosk Technical Reviews</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                  <X className="w-3.5 h-3.5 text-rose-500" />
                  <span>No award authority &gt; AED 1M</span>
                </div>
              </div>
            </div>

            {/* Viewer */}
            <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-2xs space-y-3 relative overflow-hidden bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-800 border border-slate-300">
                  Read-Only
                </span>
                <span className="text-xs font-extrabold text-slate-500">AED 0 Limit</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-600" />
                <span>Viewer</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Restricted observation access for QA auditors, site supervisors, and junior engineers to monitor tenders and visitor logs without mutation rights.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Inspect Tenders & Quotations</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                  <X className="w-3.5 h-3.5 text-rose-500" />
                  <span>Cannot Create or Award RFPs</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                  <X className="w-3.5 h-3.5 text-rose-500" />
                  <span>Cannot Message Suppliers</span>
                </div>
              </div>
            </div>

            {/* Admin / Executive */}
            <div className="bg-white rounded-2xl border border-indigo-300 p-5 shadow-2xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-900 border border-indigo-200">
                  Full Authority
                </span>
                <span className="text-xs font-extrabold text-indigo-700">Unlimited</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Admin / Executive</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete enterprise administration, including user seat management, contract signings, bank escrow disbursements, and company legal profiles.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Manage Team Member Seats</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authorize Escrow Releases</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Financial Audit Dossier</span>
                </div>
              </div>
            </div>
          </div>

          {/* Granular Comparison Table Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Detailed Functional Capabilities & Restrictions Matrix
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Enforced in real-time across SOKO workspace
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="p-3">Platform Capability / Action</th>
                    <th className="p-3 text-center">Admin / Executive</th>
                    <th className="p-3 text-center">Procurement Lead</th>
                    <th className="p-3 text-center">Project Manager</th>
                    <th className="p-3 text-center">Viewer (Read-Only)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">Publish Commercial RFPs / Tenders</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-blue-600 font-semibold">✓ Project Only</td>
                    <td className="p-3 text-center text-rose-500 font-bold">✕ Prohibited</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">Evaluate Received Bids & Quotes</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-blue-600 font-semibold">✓ Technical Only</td>
                    <td className="p-3 text-center text-slate-600">✓ View Only</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">Award Subcontracts & Issue POs</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Unlimited</td>
                    <td className="p-3 text-center text-purple-700 font-bold">✓ Up to AED 10M</td>
                    <td className="p-3 text-center text-amber-700 font-semibold">⚠️ Up to AED 1M</td>
                    <td className="p-3 text-center text-rose-500 font-bold">✕ Prohibited</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">Direct Supplier Messaging & Negotiations</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-blue-600 font-semibold">✓ Assigned Bidders</td>
                    <td className="p-3 text-center text-rose-500 font-bold">✕ Prohibited</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">Host Reception Kiosk Office Meetings</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-rose-500 font-bold">✕ Prohibited</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">View Spend Analytics & Profit Margins</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-rose-500 font-bold">✕ Restricted</td>
                    <td className="p-3 text-center text-rose-500 font-bold">✕ Restricted</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">Invite Colleagues & Assign Roles</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Full</td>
                    <td className="p-3 text-center text-rose-500 font-bold">✕ Prohibited</td>
                    <td className="p-3 text-center text-rose-500 font-bold">✕ Prohibited</td>
                    <td className="p-3 text-center text-rose-500 font-bold">✕ Prohibited</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Team Activity Analytics & Audit */}
      {activeSubTab === 'activity' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Procurement & Sourcing Audit Trail</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every action taken by your company buyers, estimators, and site specialists is immutably logged for audit readiness.
              </p>
            </div>
            <button
              onClick={() => showToast('Exported team audit log (PDF/CSV ready)')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Log</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs">
            {activityLogs.map((log) => {
              const categoryBadge = {
                rfp: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'RFP / TENDER' },
                visit: { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'OFFICE KIOSK' },
                academy: { bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'ACADEMY' },
                team: { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: 'TEAM ACCESS' },
              }[log.category] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: 'GENERAL' };

              return (
                <div key={log.id} className="p-4 flex items-start gap-3.5 hover:bg-slate-50 transition-colors">
                  <img
                    src={log.memberAvatar}
                    alt={log.memberName}
                    className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{log.memberName}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${categoryBadge.bg}`}>
                        {categoryBadge.label}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{log.action}</p>
                    {log.details && (
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">{log.details}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: Invite Team Member via Email */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Invite Team Member via Corporate Email
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign a role with restricted access levels under {currentUser.company}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 pt-4 text-xs">
              {/* Email Address Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. j.khalil@apexmech-gc.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  An official activation invite token will be sent directly to this address.
                </p>
              </div>

              {/* Full Name & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jamil Khalil"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior MEP Project Lead"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Department & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                  >
                    <option value="Procurement & Sourcing">Procurement & Sourcing</option>
                    <option value="Site Operations">Site Operations</option>
                    <option value="Estimating & Bidding">Estimating & Bidding</option>
                    <option value="Contracts & Legal">Contracts & Legal</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+971 50 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* ROLE SELECTION CARDS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Assign Specific Workspace Role & Restricted Access Level <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Procurement Lead */}
                  <div
                    onClick={() => handleRoleSelection('Procurement Lead')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.roleInCompany === 'Procurement Lead'
                        ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-purple-700" />
                        Procurement Lead
                      </span>
                      {formData.roleInCompany === 'Procurement Lead' && (
                        <CheckCircle2 className="w-4 h-4 text-purple-700" />
                      )}
                    </div>
                    <span className="text-[10px] text-purple-700 font-bold block mb-1">
                      Commercial Sourcing Lead
                    </span>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Can issue tenders, evaluate quotes, negotiate, and award subcontracts up to AED 10M.
                    </p>
                  </div>

                  {/* Project Manager */}
                  <div
                    onClick={() => handleRoleSelection('Project Manager')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.roleInCompany === 'Project Manager'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5 text-blue-700" />
                        Project Manager
                      </span>
                      {formData.roleInCompany === 'Project Manager' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-700" />
                      )}
                    </div>
                    <span className="text-[10px] text-blue-700 font-bold block mb-1">
                      Site & Delivery Lead
                    </span>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Can draft site RFPs, inspect materials, and host kiosk visits. Restricted from awards &gt; AED 1M.
                    </p>
                  </div>

                  {/* Viewer */}
                  <div
                    onClick={() => handleRoleSelection('Viewer')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.roleInCompany === 'Viewer'
                        ? 'border-slate-600 bg-slate-100 ring-2 ring-slate-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-slate-700" />
                        Viewer
                      </span>
                      {formData.roleInCompany === 'Viewer' && (
                        <CheckCircle2 className="w-4 h-4 text-slate-700" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-600 font-bold block mb-1">
                      Restricted Read-Only
                    </span>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Observational access to view tenders, quotes, and visitor logs. All mutation actions blocked.
                    </p>
                  </div>
                </div>

                {/* Optional Admin selection pill */}
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleRoleSelection('Admin / Executive')}
                    className={`text-[11px] font-semibold cursor-pointer underline ${
                      formData.roleInCompany === 'Admin / Executive'
                        ? 'text-indigo-700 font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Or assign Full Admin / Executive Rights →
                  </button>
                </div>
              </div>

              {/* LIVE ACCESS LEVEL & RESTRICTION DETAILS BOX */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      Enforced Access Scope: {activeRoleConfig.level}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${activeRoleConfig.badgeColor}`}
                  >
                    {activeRoleConfig.role}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="font-bold text-emerald-800 block mb-1">
                      ✓ Authorized Capabilities:
                    </span>
                    <ul className="space-y-1 text-slate-600">
                      {activeRoleConfig.allowedActions.slice(0, 3).map((act, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-rose-800 block mb-1">
                      🚫 Restricted Boundaries:
                    </span>
                    <ul className="space-y-1 text-slate-600">
                      {activeRoleConfig.restrictedActions.length > 0 ? (
                        activeRoleConfig.restrictedActions.map((res, i) => (
                          <li key={i} className="flex items-start gap-1 text-rose-700">
                            <X className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                            <span>{res}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-emerald-700 font-medium">Unrestricted executive governance</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Financial Signing Authority */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Single Tender Award Limit:</span>
                  <span className="font-extrabold text-slate-900">
                    {activeRoleConfig.maxApprovalLimitAED && activeRoleConfig.maxApprovalLimitAED > 0
                      ? `AED ${activeRoleConfig.maxApprovalLimitAED.toLocaleString()}`
                      : 'None (Read-Only Observer)'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Inspect Access / Permissions Details Drawer */}
      {selectedMemberForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={selectedMemberForDetails.avatarUrl}
                  alt={selectedMemberForDetails.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-100"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedMemberForDetails.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedMemberForDetails.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMemberForDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Role & Level Pill */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Assigned Workspace Role
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedMemberForDetails.roleInCompany}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800">
                  {selectedMemberForDetails.accessLevel || 'Standard Access'}
                </span>
              </div>

              {/* Allowed Capabilities */}
              <div>
                <span className="font-bold text-slate-900 block mb-1.5">
                  Authorized Capabilities:
                </span>
                <ul className="space-y-1.5">
                  {(
                    ROLE_ACCESS_CONFIGS[selectedMemberForDetails.roleInCompany]?.allowedActions || [
                      'Review published tenders',
                    ]
                  ).map((act, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Restricted Capabilities */}
              <div>
                <span className="font-bold text-slate-900 block mb-1.5">
                  Restricted Access Boundaries:
                </span>
                <ul className="space-y-1.5">
                  {(
                    ROLE_ACCESS_CONFIGS[selectedMemberForDetails.roleInCompany]?.restrictedActions || []
                  ).length > 0 ? (
                    ROLE_ACCESS_CONFIGS[selectedMemberForDetails.roleInCompany]?.restrictedActions.map(
                      (res, i) => (
                        <li key={i} className="flex items-center gap-2 text-rose-700 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                          <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{res}</span>
                        </li>
                      )
                    )
                  ) : (
                    <li className="text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                      Unrestricted executive access across all modules
                    </li>
                  )}
                </ul>
              </div>

              {/* If member is in invited state, provide invite link copy */}
              {selectedMemberForDetails.status === 'Invited' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between text-amber-900 font-bold">
                    <span>Pending Colleague Activation</span>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Share this direct join link with {selectedMemberForDetails.name}:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedMemberForDetails.inviteLink || `https://soko.ae/join/apexmech?token=${selectedMemberForDetails.id}`}
                      className="flex-1 bg-white px-2.5 py-1.5 rounded-lg border border-amber-300 font-mono text-[11px] text-slate-700 select-all"
                    />
                    <button
                      onClick={() =>
                        copyInviteToClipboard(
                          selectedMemberForDetails.inviteLink ||
                            `https://soko.ae/join/apexmech?token=${selectedMemberForDetails.id}`
                        )
                      }
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedInviteLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setEditRoleModalMember(selectedMemberForDetails);
                  setEditRoleChoice(selectedMemberForDetails.roleInCompany);
                  setSelectedMemberForDetails(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Change Role & Permissions</span>
              </button>

              <button
                onClick={() => setSelectedMemberForDetails(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Role & Access Level */}
      {editRoleModalMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update Member Role & Restrictions
                </h3>
                <p className="text-xs text-slate-500">
                  Modifying permissions for {editRoleModalMember.name}
                </p>
              </div>
              <button
                onClick={() => setEditRoleModalMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <label className="block font-bold text-slate-700">Select New Role:</label>
              <div className="space-y-2">
                {(['Procurement Lead', 'Project Manager', 'Viewer', 'Admin / Executive'] as CompanyRolePermission[]).map(
                  (role) => (
                    <label
                      key={role}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        editRoleChoice === role
                          ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-100'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editRole"
                        checked={editRoleChoice === role}
                        onChange={() => setEditRoleChoice(role)}
                        className="mt-0.5 accent-purple-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{role}</div>
                        <div className="text-[11px] text-slate-500">
                          {ROLE_ACCESS_CONFIGS[role]?.description}
                        </div>
                      </div>
                    </label>
                  )
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setEditRoleModalMember(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoleChange}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
              >
                Apply Role Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
