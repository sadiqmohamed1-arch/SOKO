export type CompanyKind = 'supplier' | 'contractor';
export type MembershipStatus = 'active' | 'invited' | 'pending_approval' | 'removed';
export type UserStatus = MembershipStatus | 'no_membership';

export interface UserMembership {
  id: string;
  companyId: string;
  companyName: string;
  companyKind: CompanyKind;
  roleKey: string;
  status: MembershipStatus;
  joinedAt: string | null;
  updatedAt: string | null;
}

export interface AdminUser {
  id: string;
  fullName: string;
  title: string | null;
  phone: string | null;
  location: string | null;
  /** Null when the address lives only in auth records that the browser must not read. */
  email: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** Null when no authorized source records activity. */
  lastActivity: string | null;
  memberships: UserMembership[];
  /** Null when the roster cannot be read for other users. */
  isPlatformAdmin: boolean | null;
  /** Null when user-level suspension is not modelled. */
  isSuspended: boolean | null;
}

export interface PermissionDef {
  key: string;
  description: string;
}

export interface RoleDef {
  companyKind: CompanyKind;
  key: string;
  label: string;
  description: string;
  isAdmin: boolean;
  permissions: string[];
}

export type DataSource = 'live' | 'reference' | 'demo';

export const MEMBERSHIP_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  pending_approval: 'Pending Approval',
  removed: 'Removed',
  no_membership: 'No Membership',
};

export const MEMBERSHIP_STATUS_CLASSES: Record<UserStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  invited: 'bg-blue-50 text-blue-700 border-blue-200',
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  removed: 'bg-slate-100 text-slate-600 border-slate-200',
  no_membership: 'bg-white text-slate-500 border-slate-200',
};

const STATUS_PRIORITY: MembershipStatus[] = ['active', 'invited', 'pending_approval', 'removed'];

export function userStatusOf(user: AdminUser): UserStatus {
  for (const status of STATUS_PRIORITY) {
    if (user.memberships.some((m) => m.status === status)) return status;
  }
  return 'no_membership';
}

/** The membership shown in the directory row: the first active one, else the most relevant by status. */
export function primaryMembershipOf(user: AdminUser): UserMembership | null {
  for (const status of STATUS_PRIORITY) {
    const match = user.memberships.find((m) => m.status === status);
    if (match) return match;
  }
  return null;
}

export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase();
}

export function roleLabelOf(roles: RoleDef[], kind: CompanyKind, key: string): string {
  return roles.find((r) => r.companyKind === kind && r.key === key)?.label ?? key.replace(/_/g, ' ');
}

// Mirrors the seeded rows in supabase/migrations/20261011000100_foundation.sql.
// Used only when the live reference tables cannot be read, and labelled as a reference copy.
export const REFERENCE_PERMISSIONS: PermissionDef[] = [
  { key: 'profile.edit', description: 'Edit the company profile' },
  { key: 'products.manage', description: 'Create, edit and publish products' },
  { key: 'documents.view', description: 'View company documents' },
  { key: 'documents.manage', description: 'Upload, edit and version company documents' },
  { key: 'documents.share', description: 'Share documents with other companies' },
  { key: 'contacts.manage', description: 'Manage private contacts and vendor records' },
  { key: 'campaigns.manage', description: 'Create and manage Market Hub campaigns' },
  { key: 'visits.manage', description: 'Schedule and manage visits' },
  { key: 'team.manage', description: 'Invite, approve, re-role and remove members' },
  { key: 'plan.manage', description: 'View and manage the subscription' },
  { key: 'records.delete', description: 'Delete company records' },
  { key: 'vendors.approve', description: 'Approve, reject or suspend vendors and review compliance' },
  { key: 'opportunities.manage', description: 'Post Market Hub opportunities and respond to them' },
];

const ALL_SUPPLIER_ADMIN = ['profile.edit', 'products.manage', 'documents.view', 'documents.manage', 'documents.share', 'contacts.manage', 'campaigns.manage', 'visits.manage', 'team.manage', 'plan.manage', 'records.delete', 'opportunities.manage'];

export const REFERENCE_ROLES: RoleDef[] = [
  { companyKind: 'supplier', key: 'supplier_admin', label: 'Supplier Admin', description: 'Full control of the company workspace, team, plan and records.', isAdmin: true, permissions: ALL_SUPPLIER_ADMIN },
  { companyKind: 'supplier', key: 'sales_manager', label: 'Sales Manager', description: 'Manages profile, products, buyer relationships, campaigns and document sharing.', isAdmin: false, permissions: ['profile.edit', 'products.manage', 'documents.view', 'documents.share', 'contacts.manage', 'campaigns.manage', 'visits.manage', 'opportunities.manage'] },
  { companyKind: 'supplier', key: 'sales_rep', label: 'Sales Representative', description: 'Handles authorised buyer interactions and visits.', isAdmin: false, permissions: ['documents.view', 'contacts.manage', 'visits.manage', 'opportunities.manage'] },
  { companyKind: 'supplier', key: 'technical_manager', label: 'Technical Manager', description: 'Maintains product information and technical documents.', isAdmin: false, permissions: ['products.manage', 'documents.view', 'documents.manage'] },
  { companyKind: 'supplier', key: 'viewer', label: 'Viewer', description: 'Read-only access to the company workspace.', isAdmin: false, permissions: [] },
  { companyKind: 'contractor', key: 'contractor_admin', label: 'Company Admin', description: 'Full company administration, membership management and vendor oversight.', isAdmin: true, permissions: [...ALL_SUPPLIER_ADMIN, 'vendors.approve'] },
  { companyKind: 'contractor', key: 'procurement_manager', label: 'Procurement Manager', description: 'Vendor registration, reviews, approvals, sourcing, contacts and visits.', isAdmin: false, permissions: ['profile.edit', 'products.manage', 'documents.view', 'documents.share', 'contacts.manage', 'campaigns.manage', 'visits.manage', 'vendors.approve', 'opportunities.manage'] },
  { companyKind: 'contractor', key: 'procurement_officer', label: 'Buyer / Procurement', description: 'Vendor records, sourcing opportunities and contacts. No approval authority.', isAdmin: false, permissions: ['documents.view', 'contacts.manage', 'visits.manage', 'opportunities.manage'] },
  { companyKind: 'contractor', key: 'project_manager', label: 'Project Manager', description: 'Project-related visits and vendor interactions.', isAdmin: false, permissions: ['documents.view', 'visits.manage', 'opportunities.manage'] },
  { companyKind: 'contractor', key: 'viewer', label: 'Viewer', description: 'Read-only access to permitted company information.', isAdmin: false, permissions: [] },
];

/** UI-only illustration. Platform administration is a roster, not a permission set stored per key. */
export const PLATFORM_ADMIN_EXAMPLE: { key: string; label: string }[] = [
  { key: 'platform.companies', label: 'View every company and its records' },
  { key: 'platform.verification', label: 'Approve or reject verification submissions' },
  { key: 'platform.suspension', label: 'Suspend and restore companies' },
  { key: 'platform.moderation', label: 'Resolve content reports and campaigns' },
  { key: 'platform.stats', label: 'Read platform-wide statistics' },
];

const daysAgo = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3600_000).toISOString();

function demoMembership(
  id: string,
  companyName: string,
  companyKind: CompanyKind,
  roleKey: string,
  status: MembershipStatus,
  joinedDaysAgo: number,
): UserMembership {
  return {
    id,
    companyId: `demo-${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    companyName,
    companyKind,
    roleKey,
    status,
    joinedAt: daysAgo(joinedDaysAgo),
    updatedAt: daysAgo(Math.max(0, joinedDaysAgo - 3)),
  };
}

export const DEMO_USERS: AdminUser[] = [
  {
    id: 'demo-u1', fullName: 'Zackary Al-Hassan', title: 'Platform Operations Lead', phone: '+971 4 555 0101', location: 'Dubai, UAE',
    email: 'zackary@soko.example', createdAt: daysAgo(420), updatedAt: daysAgo(2), lastActivity: daysAgo(0, 1),
    memberships: [], isPlatformAdmin: true, isSuspended: false,
  },
  {
    id: 'demo-u2', fullName: 'Layla Haddad', title: 'Managing Director', phone: '+971 4 555 0142', location: 'Dubai, UAE',
    email: 'layla@gulfsteel.example', createdAt: daysAgo(310), updatedAt: daysAgo(5), lastActivity: daysAgo(0, 4),
    memberships: [
      demoMembership('demo-m1', 'Gulf Steel Trading', 'supplier', 'supplier_admin', 'active', 310),
      demoMembership('demo-m2', 'Al Noor Contracting', 'contractor', 'viewer', 'active', 120),
    ],
    isPlatformAdmin: false, isSuspended: false,
  },
  {
    id: 'demo-u3', fullName: 'Omar Siddiqui', title: 'Head of Procurement', phone: '+971 2 555 0177', location: 'Abu Dhabi, UAE',
    email: 'omar@alnoor.example', createdAt: daysAgo(280), updatedAt: daysAgo(9), lastActivity: daysAgo(1, 2),
    memberships: [demoMembership('demo-m3', 'Al Noor Contracting', 'contractor', 'procurement_manager', 'active', 280)],
    isPlatformAdmin: false, isSuspended: false,
  },
  {
    id: 'demo-u4', fullName: 'Priya Raman', title: 'Sales Manager', phone: '+971 6 555 0190', location: 'Sharjah, UAE',
    email: 'priya@desertcables.example', createdAt: daysAgo(190), updatedAt: daysAgo(12), lastActivity: daysAgo(3),
    memberships: [
      demoMembership('demo-m4', 'Desert Cables LLC', 'supplier', 'sales_manager', 'active', 190),
      demoMembership('demo-m5', 'Gulf Steel Trading', 'supplier', 'sales_rep', 'invited', 2),
    ],
    isPlatformAdmin: false, isSuspended: false,
  },
  {
    id: 'demo-u5', fullName: 'Daniel Okafor', title: 'Project Manager', phone: null, location: 'Dubai, UAE',
    email: 'daniel@meridianbuild.example', createdAt: daysAgo(6), updatedAt: daysAgo(6), lastActivity: null,
    memberships: [demoMembership('demo-m6', 'Meridian Build Group', 'contractor', 'project_manager', 'invited', 6)],
    isPlatformAdmin: false, isSuspended: false,
  },
  {
    id: 'demo-u6', fullName: 'Fatima Al-Mansoori', title: 'Technical Manager', phone: '+971 4 555 0133', location: 'Dubai, UAE',
    email: 'fatima@desertcables.example', createdAt: daysAgo(150), updatedAt: daysAgo(30), lastActivity: daysAgo(41),
    memberships: [demoMembership('demo-m7', 'Desert Cables LLC', 'supplier', 'technical_manager', 'active', 150)],
    isPlatformAdmin: false, isSuspended: true,
  },
  {
    id: 'demo-u7', fullName: 'Hamid Rezaei', title: 'Procurement Officer', phone: '+971 2 555 0118', location: 'Abu Dhabi, UAE',
    email: 'hamid@meridianbuild.example', createdAt: daysAgo(4), updatedAt: daysAgo(4), lastActivity: daysAgo(4),
    memberships: [demoMembership('demo-m8', 'Meridian Build Group', 'contractor', 'procurement_officer', 'pending_approval', 4)],
    isPlatformAdmin: false, isSuspended: false,
  },
  {
    id: 'demo-u8', fullName: 'Sara Lindqvist', title: 'Company Administrator', phone: '+971 4 555 0164', location: 'Dubai, UAE',
    email: 'sara@meridianbuild.example', createdAt: daysAgo(240), updatedAt: daysAgo(1), lastActivity: daysAgo(0, 7),
    memberships: [
      demoMembership('demo-m9', 'Meridian Build Group', 'contractor', 'contractor_admin', 'active', 240),
      demoMembership('demo-m10', 'Al Noor Contracting', 'contractor', 'project_manager', 'removed', 200),
    ],
    isPlatformAdmin: false, isSuspended: false,
  },
  {
    id: 'demo-u9', fullName: 'Karim Nasser', title: 'Platform Support', phone: null, location: 'Dubai, UAE',
    email: 'karim@soko.example', createdAt: daysAgo(90), updatedAt: daysAgo(8), lastActivity: daysAgo(0, 22),
    memberships: [], isPlatformAdmin: true, isSuspended: false,
  },
];
