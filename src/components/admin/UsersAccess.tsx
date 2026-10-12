import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserCheck,
  MailPlus,
  UserX,
  Crown,
  Search,
  X,
  Eye,
  ChevronRight,
  KeyRound,
  UserPlus,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { type AdminCompany, DASH, formatDate, formatDateTime } from './companyShared';
import {
  type AdminUser,
  type CompanyKind,
  type DataSource,
  type MembershipStatus,
  type PermissionDef,
  type RoleDef,
  type UserStatus,
  DEMO_USERS,
  MEMBERSHIP_STATUS_LABELS,
  REFERENCE_PERMISSIONS,
  REFERENCE_ROLES,
  primaryMembershipOf,
  roleLabelOf,
  userStatusOf,
} from './userShared';
import { SourceTag, Unavailable, UserAvatar, UserStatusBadge } from './userBadges';
import { UserProfileDrawer } from './UserProfileDrawer';
import { RolesPermissionsMatrix } from './RolesPermissionsMatrix';
import { UserInvitePanel } from './UserInvitePanel';

type Tab = 'directory' | 'roles' | 'invite';
type LoadState = 'idle' | 'loading' | 'success' | 'error';

interface UsersAccessProps {
  companies: AdminCompany[];
  isLive: boolean;
  /** Changes whenever the portal re-syncs, so this module reloads alongside it. */
  syncToken: number;
}

interface LiveProfileRow {
  id: string;
  full_name: string | null;
  title: string | null;
  phone: string | null;
  location: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface LiveMembershipRow {
  id: string;
  company_id: string;
  company_kind: CompanyKind;
  user_id: string;
  role_key: string;
  status: MembershipStatus;
  created_at: string | null;
  updated_at: string | null;
}

interface LiveRoleRow {
  company_kind: CompanyKind;
  key: string;
  label: string;
  description: string;
  is_admin: boolean;
}

interface LiveData {
  profiles: LiveProfileRow[];
  memberships: LiveMembershipRow[];
  roles: RoleDef[] | null;
  permissions: PermissionDef[] | null;
}

// Every query runs through the signed-in admin's session, so existing RLS decides what is returned.
// Emails, sign-in history and the full admin roster live in auth tables and are deliberately not requested.
async function loadLiveUsers(): Promise<LiveData> {
  const supabase = getSupabaseClient();
  const [profileRes, membershipRes, roleRes, rolePermRes, permRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, title, phone, location, created_at, updated_at').order('created_at', { ascending: false }),
    supabase.from('company_memberships').select('id, company_id, company_kind, user_id, role_key, status, created_at, updated_at'),
    supabase.from('roles').select('company_kind, key, label, description, is_admin'),
    supabase.from('role_permissions').select('company_kind, role_key, permission'),
    supabase.from('permissions').select('key, description'),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (membershipRes.error) throw membershipRes.error;

  const referenceOk = !roleRes.error && !rolePermRes.error && !permRes.error && (roleRes.data?.length ?? 0) > 0;
  let roles: RoleDef[] | null = null;
  let permissions: PermissionDef[] | null = null;
  if (referenceOk) {
    const grants = (rolePermRes.data ?? []) as { company_kind: CompanyKind; role_key: string; permission: string }[];
    roles = ((roleRes.data ?? []) as LiveRoleRow[]).map((r) => ({
      companyKind: r.company_kind,
      key: r.key,
      label: r.label,
      description: r.description,
      isAdmin: r.is_admin,
      permissions: grants.filter((g) => g.company_kind === r.company_kind && g.role_key === r.key).map((g) => g.permission),
    }));
    const order = new Map(REFERENCE_PERMISSIONS.map((p, i) => [p.key, i]));
    permissions = ((permRes.data ?? []) as PermissionDef[]).sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99));
    const roleOrder = new Map(REFERENCE_ROLES.map((r, i) => [`${r.companyKind}:${r.key}`, i]));
    roles.sort((a, b) => (roleOrder.get(`${a.companyKind}:${a.key}`) ?? 99) - (roleOrder.get(`${b.companyKind}:${b.key}`) ?? 99));
  }

  return {
    profiles: (profileRes.data ?? []) as LiveProfileRow[],
    memberships: (membershipRes.data ?? []) as LiveMembershipRow[],
    roles,
    permissions,
  };
}

function buildLiveUsers(data: LiveData, companies: AdminCompany[]): AdminUser[] {
  const names = new Map(companies.map((c) => [c.id, c.companyName]));
  const byUser = new Map<string, LiveMembershipRow[]>();
  for (const m of data.memberships) {
    const list = byUser.get(m.user_id) ?? [];
    list.push(m);
    byUser.set(m.user_id, list);
  }
  return data.profiles.map((p) => ({
    id: p.id,
    fullName: p.full_name?.trim() || '',
    title: p.title,
    phone: p.phone,
    location: p.location,
    email: null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    lastActivity: null,
    isPlatformAdmin: null,
    isSuspended: null,
    memberships: (byUser.get(p.id) ?? []).map((m) => ({
      id: m.id,
      companyId: m.company_id,
      companyName: names.get(m.company_id) ?? 'Unknown company',
      companyKind: m.company_kind,
      roleKey: m.role_key,
      status: m.status,
      joinedAt: m.created_at,
      updatedAt: m.updated_at,
    })),
  }));
}

interface SummaryCard {
  id: string;
  label: string;
  value: number | null;
  icon: LucideIcon;
  tone: string;
  status?: UserStatus;
  note?: string;
}

export const UsersAccess: React.FC<UsersAccessProps> = ({ companies, isLive, syncToken }) => {
  const [tab, setTab] = useState<Tab>('directory');
  const [loadState, setLoadState] = useState<LoadState>(isLive ? 'loading' : 'success');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const closeDrawer = useCallback(() => setSelectedUser(null), []);

  useEffect(() => {
    if (!isLive) {
      setLiveData(null);
      setLoadState('success');
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setLoadError(null);
    loadLiveUsers()
      .then((data) => {
        if (cancelled) return;
        setLiveData(data);
        setLoadState('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadState('error');
        setLoadError(err instanceof Error ? err.message : 'User records could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [isLive, syncToken]);

  const users = useMemo<AdminUser[]>(
    () => (isLive ? (liveData ? buildLiveUsers(liveData, companies) : []) : DEMO_USERS),
    [isLive, liveData, companies],
  );
  const roles = (isLive && liveData?.roles) || REFERENCE_ROLES;
  const permissions = (isLive && liveData?.permissions) || REFERENCE_PERMISSIONS;
  const rolesSource: DataSource = isLive && liveData?.roles ? 'live' : 'reference';
  const userSource: DataSource = isLive ? 'live' : 'demo';
  const isInitialLoad = loadState === 'loading' && users.length === 0;

  const counts = useMemo(() => {
    const byStatus = (status: MembershipStatus) => users.filter((u) => u.memberships.some((m) => m.status === status)).length;
    return {
      total: users.length,
      active: byStatus('active'),
      invited: byStatus('invited'),
      suspended: isLive ? null : users.filter((u) => u.isSuspended).length,
      admins: isLive ? null : users.filter((u) => u.isPlatformAdmin).length,
    };
  }, [users, isLive]);

  const roleMemberCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) for (const m of u.memberships) if (m.status === 'active') map.set(`${m.companyKind}:${m.roleKey}`, (map.get(`${m.companyKind}:${m.roleKey}`) ?? 0) + 1);
    return map;
  }, [users]);

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) for (const m of u.memberships) map.set(m.companyId, m.companyName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [users]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (companyFilter !== 'all' && !u.memberships.some((m) => m.companyId === companyFilter)) return false;
      if (roleFilter !== 'all' && !u.memberships.some((m) => `${m.companyKind}:${m.roleKey}` === roleFilter)) return false;
      if (statusFilter !== 'all' && userStatusOf(u) !== statusFilter) return false;
      if (!query) return true;
      return [u.fullName, u.email, u.title, ...u.memberships.map((m) => m.companyName)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    });
  }, [users, companyFilter, roleFilter, statusFilter, searchQuery]);

  const hasActiveFilters = companyFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';
  const resetFilters = () => {
    setCompanyFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const cards: SummaryCard[] = [
    { id: 'total', label: 'Total Users', value: counts.total, icon: Users, tone: 'bg-blue-50 text-blue-700' },
    { id: 'active', label: 'Active Users', value: counts.active, icon: UserCheck, tone: 'bg-emerald-50 text-emerald-700', status: 'active', note: 'At least one active membership' },
    { id: 'invited', label: 'Invited Users', value: counts.invited, icon: MailPlus, tone: 'bg-sky-50 text-sky-700', status: 'invited', note: isLive ? 'Registered accounts with an open invite' : undefined },
    { id: 'suspended', label: 'Suspended Users', value: counts.suspended, icon: UserX, tone: 'bg-rose-50 text-rose-700', note: isLive ? 'User-level suspension is not modelled' : undefined },
    { id: 'admins', label: 'Platform Administrators', value: counts.admins, icon: Crown, tone: 'bg-slate-900 text-white', note: isLive ? 'Roster is readable only for your own account' : undefined },
  ];

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'directory', label: 'User Directory', icon: Users },
    { id: 'roles', label: 'Roles & Permissions', icon: KeyRound },
    { id: 'invite', label: 'Invite User', icon: UserPlus },
  ];

  const emptyMessage =
    loadState === 'error' && users.length === 0
      ? 'User records could not be loaded. Use Sync to try again.'
      : users.length === 0
      ? 'No user accounts are registered yet.'
      : 'No users match the current filters.';

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
              Network accounts <SourceTag source={userSource} />
            </span>
            <span className="text-sm font-bold text-slate-900">
              {isInitialLoad ? DASH : counts.total.toLocaleString()} {counts.total === 1 ? 'user' : 'users'} across{' '}
              {companyOptions.length.toLocaleString()} {companyOptions.length === 1 ? 'company' : 'companies'}
            </span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 sm:max-w-sm sm:text-right text-pretty">
          {isLive
            ? 'Profiles and memberships are read under your admin session. Emails and sign-in history are never fetched from the browser.'
            : 'Sign in as a platform administrator to load staging users. Demo accounts are shown for design review.'}
        </p>
      </div>

      {loadState === 'error' && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="leading-relaxed">
            <strong className="font-semibold">User records are unavailable.</strong> {loadError}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          const unavailable = card.value === null;
          const isActive = Boolean(card.status) && statusFilter === card.status;
          const content = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {unavailable && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Unavailable
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={`font-mono text-2xl font-bold leading-none ${unavailable ? 'text-slate-300' : 'text-slate-900'}`}>
                  {unavailable || isInitialLoad ? DASH : card.value!.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                {card.note && <span className="text-[11px] leading-snug text-slate-400">{card.note}</span>}
              </span>
            </>
          );
          if (unavailable || !card.status) {
            return (
              <div
                key={card.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 ${unavailable ? 'border-dashed border-slate-200 bg-slate-50/60' : 'border-slate-200 bg-white'}`}
              >
                {content}
              </div>
            );
          }
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setTab('directory');
                setStatusFilter(isActive ? 'all' : (card.status as UserStatus));
              }}
              aria-pressed={isActive}
              className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                isActive ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {content}
            </button>
          );
        })}
      </div>

      <div role="tablist" aria-label="Users and access views" className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`users-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`users-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`users-panel-${tab}`} aria-labelledby={`users-tab-${tab}`}>
        {tab === 'roles' && (
          <RolesPermissionsMatrix
            roles={roles}
            permissions={permissions}
            source={rolesSource}
            isLoading={isLive && loadState === 'loading' && !liveData}
            memberCounts={users.length ? roleMemberCounts : null}
          />
        )}

        {tab === 'invite' && <UserInvitePanel companies={companies} roles={roles} />}

        {tab === 'directory' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative lg:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <label className="sr-only" htmlFor="users-search">
                  Search users
                </label>
                <input
                  id="users-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isLive ? 'Search name, title or company' : 'Search name, email or company'}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <FilterSelect id="users-company-filter" label="Filter by company" value={companyFilter} onChange={setCompanyFilter}>
                  <option value="all">All companies</option>
                  {companyOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect id="users-role-filter" label="Filter by role" value={roleFilter} onChange={setRoleFilter}>
                  <option value="all">All roles</option>
                  {(['supplier', 'contractor'] as const).map((kind) => (
                    <optgroup key={kind} label={kind === 'supplier' ? 'Supplier roles' : 'Contractor roles'}>
                      {roles
                        .filter((r) => r.companyKind === kind)
                        .map((r) => (
                          <option key={`${kind}:${r.key}`} value={`${kind}:${r.key}`}>
                            {r.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </FilterSelect>
                <FilterSelect id="users-status-filter" label="Filter by membership status" value={statusFilter} onChange={(v) => setStatusFilter(v as 'all' | UserStatus)}>
                  <option value="all">All statuses</option>
                  {(Object.keys(MEMBERSHIP_STATUS_LABELS) as UserStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {MEMBERSHIP_STATUS_LABELS[s]}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-900">{filtered.length}</strong> of {users.length} {users.length === 1 ? 'user' : 'users'}
              </span>
              {hasActiveFilters && (
                <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>

            {isInitialLoad ? (
              <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading users">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
                <Users className="h-6 w-6 text-slate-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3">User Name</th>
                        <th scope="col" className="px-3 py-3">Email</th>
                        <th scope="col" className="px-3 py-3">Company</th>
                        <th scope="col" className="px-3 py-3">Company Type</th>
                        <th scope="col" className="px-3 py-3">Assigned Role</th>
                        <th scope="col" className="px-3 py-3">Membership Status</th>
                        <th scope="col" className="px-3 py-3">Last Activity</th>
                        <th scope="col" className="px-4 py-3 text-right">View Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((user) => {
                        const primary = primaryMembershipOf(user);
                        const extra = user.memberships.length - 1;
                        const name = user.fullName || 'Unnamed user';
                        return (
                          <tr key={user.id} className="transition-colors hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <UserAvatar name={name} highlight={user.isPlatformAdmin === true} />
                                <span className="flex min-w-0 flex-col">
                                  <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                                    {name}
                                    {user.isPlatformAdmin && <Crown className="h-3 w-3 text-amber-600" aria-label="Platform administrator" />}
                                  </span>
                                  <span className="truncate text-[11px] text-slate-500">{user.title || DASH}</span>
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-600">{user.email ?? <Unavailable label="Protected" reason="Emails are stored in authentication records and are not read from the browser." />}</td>
                            <td className="px-3 py-3">
                              {primary ? (
                                <span className="flex flex-col">
                                  <span className="font-medium text-slate-900">{primary.companyName}</span>
                                  {extra > 0 && <span className="text-[11px] text-blue-700">+{extra} more {extra === 1 ? 'company' : 'companies'}</span>}
                                </span>
                              ) : (
                                <span className="text-slate-400">{user.isPlatformAdmin ? 'Platform team' : DASH}</span>
                              )}
                            </td>
                            <td className="px-3 py-3 capitalize text-slate-600">{primary?.companyKind ?? DASH}</td>
                            <td className="px-3 py-3">
                              {primary ? (
                                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">{roleLabelOf(roles, primary.companyKind, primary.roleKey)}</span>
                              ) : user.isPlatformAdmin ? (
                                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">Platform Admin</span>
                              ) : (
                                <span className="text-slate-400">{DASH}</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <UserStatusBadge status={userStatusOf(user)} />
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {user.lastActivity ? formatDateTime(user.lastActivity) : isLive ? <Unavailable reason="Sign-in activity is held in authentication records." /> : <span className="text-slate-400">Never</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUser(user)}
                                  aria-label={`View profile for ${name}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                  View Profile
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="flex flex-col gap-2 md:hidden">
                  {filtered.map((user) => {
                    const primary = primaryMembershipOf(user);
                    const name = user.fullName || 'Unnamed user';
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 cursor-pointer"
                        >
                          <UserAvatar name={name} highlight={user.isPlatformAdmin === true} />
                          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <span className="truncate text-sm font-semibold text-slate-900">{name}</span>
                            <span className="flex flex-wrap items-center gap-1.5">
                              <UserStatusBadge status={userStatusOf(user)} />
                              {primary && (
                                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">{roleLabelOf(roles, primary.companyKind, primary.roleKey)}</span>
                              )}
                            </span>
                            <span className="truncate text-[11px] text-slate-500">
                              {primary ? primary.companyName : user.isPlatformAdmin ? 'Platform team' : 'No company'}
                              {user.memberships.length > 1 ? ` • +${user.memberships.length - 1} more` : ''}
                              {user.createdAt ? ` • Joined ${formatDate(user.createdAt)}` : ''}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {selectedUser && (
        <UserProfileDrawer
          user={selectedUser}
          isLive={isLive}
          roles={roles}
          permissions={permissions}
          rolesSource={rolesSource}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
};

const FilterSelect: React.FC<{ id: string; label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }> = ({
  id,
  label,
  value,
  onChange,
  children,
}) => (
  <>
    <label className="sr-only" htmlFor={id}>
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-600"
    >
      {children}
    </select>
  </>
);
