import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  UserRound,
  Building2,
  KeyRound,
  ShieldAlert,
  Settings2,
  UserPlus,
  Repeat,
  UserMinus,
  Ban,
  RotateCcw,
  Crown,
  Lock,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { DASH, formatDate, formatDateTime } from './companyShared';
import {
  type AdminUser,
  type DataSource,
  type PermissionDef,
  type RoleDef,
  roleLabelOf,
  userStatusOf,
} from './userShared';
import { SourceTag, Unavailable, UserAvatar, UserStatusBadge } from './userBadges';

type DrawerSection = 'profile' | 'memberships' | 'roles' | 'activity' | 'admin';

const SECTIONS: { id: DrawerSection; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile & Contact', icon: UserRound },
  { id: 'memberships', label: 'Company Memberships', icon: Building2 },
  { id: 'roles', label: 'Roles & Permissions', icon: KeyRound },
  { id: 'activity', label: 'Activity & Security', icon: ShieldAlert },
  { id: 'admin', label: 'Administration', icon: Settings2 },
];

const AUTH_HIDDEN = 'Stored in authentication records, which are never read from the browser.';

interface UserProfileDrawerProps {
  user: AdminUser;
  isLive: boolean;
  roles: RoleDef[];
  permissions: PermissionDef[];
  rolesSource: DataSource;
  onClose: () => void;
}

export const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({ user, isLive, roles, permissions, rolesSource, onClose }) => {
  const [section, setSection] = useState<DrawerSection>('profile');
  const closeRef = useRef<HTMLButtonElement>(null);
  const status = userStatusOf(user);
  const source: DataSource = isLive ? 'live' : 'demo';

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setSection('profile');
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close user profile"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-default"
      />
      <section role="dialog" aria-modal="true" aria-labelledby="user-profile-title" className="relative flex h-full w-full max-w-4xl flex-col bg-slate-50 shadow-2xl">
        <header className="flex items-start gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <UserAvatar name={user.fullName || 'Unnamed user'} size="lg" highlight={user.isPlatformAdmin === true} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              User profile • {isLive ? 'Live record' : 'Demo record'}
            </span>
            <h2 id="user-profile-title" className="truncate text-xl font-bold text-slate-900 text-balance">
              {user.fullName || 'Unnamed user'}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <UserStatusBadge status={status} />
              {user.isPlatformAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-900 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Crown className="h-3 w-3" aria-hidden="true" />
                  Platform Admin
                </span>
              )}
              {user.isSuspended && (
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  Suspended
                </span>
              )}
              <span className="text-[11px] text-slate-500">
                {user.memberships.length} {user.memberships.length === 1 ? 'membership' : 'memberships'}
              </span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close user profile"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav
            aria-label="User profile sections"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4"
          >
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === section;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            {section === 'profile' && (
              <Panel title="Profile & Contact Information" source={source}>
                <FieldGrid>
                  <Field label="Full name" value={user.fullName || null} />
                  <Field label="Job title" value={user.title} />
                  <Field label="Email" value={user.email} unavailableReason={user.email === null ? AUTH_HIDDEN : undefined} />
                  <Field label="Phone" value={user.phone} />
                  <Field label="Location" value={user.location} />
                  <Field label="User ID" value={isLive ? user.id : null} mono unavailableReason={isLive ? undefined : 'Demo records have no account ID'} />
                </FieldGrid>
              </Panel>
            )}

            {section === 'memberships' && (
              <Panel title="Company Memberships" source={source} description="A user can belong to several companies, holding a different role in each.">
                {user.memberships.length === 0 ? (
                  <EmptyNote text={user.isPlatformAdmin ? 'Platform administrators do not need a company membership.' : 'This user has no company memberships.'} />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {user.memberships.map((m) => (
                      <li key={m.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Building2 className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-sm font-semibold text-slate-900">{m.companyName}</span>
                            <span className="text-[11px] capitalize text-slate-500">
                              {m.companyKind} • Joined {formatDate(m.joinedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">{roleLabelOf(roles, m.companyKind, m.roleKey)}</span>
                          <UserStatusBadge status={m.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}

            {section === 'roles' && (
              <Panel title="Roles & Permissions" source={rolesSource} description="Effective permissions come from each active membership's role.">
                {user.isPlatformAdmin && (
                  <div className="flex items-start gap-3 rounded-xl border border-slate-900 bg-slate-900 p-4 text-white">
                    <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    <p className="text-xs leading-relaxed text-slate-200">
                      Holds platform administration, which grants network-wide oversight independent of company roles.
                    </p>
                  </div>
                )}
                {user.memberships.filter((m) => m.status === 'active').length === 0 ? (
                  <EmptyNote text="No active memberships, so no company permissions are in effect." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {user.memberships
                      .filter((m) => m.status === 'active')
                      .map((m) => {
                        const role = roles.find((r) => r.companyKind === m.companyKind && r.key === m.roleKey);
                        return (
                          <div key={m.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900">{m.companyName}</span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                                {role?.isAdmin && <Crown className="h-3 w-3 text-amber-600" aria-hidden="true" />}
                                {role?.label ?? m.roleKey}
                              </span>
                            </div>
                            {role && <p className="text-xs leading-relaxed text-slate-500">{role.description}</p>}
                            <ul className="flex flex-wrap gap-1.5">
                              {permissions.map((p) => {
                                const granted = role?.permissions.includes(p.key) ?? false;
                                return (
                                  <li
                                    key={p.key}
                                    title={p.description}
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] ${
                                      granted ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 line-through'
                                    }`}
                                  >
                                    {granted && <Check className="h-3 w-3" aria-hidden="true" />}
                                    {p.key}
                                    <span className="sr-only">{granted ? ' granted' : ' not granted'}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                  </div>
                )}
              </Panel>
            )}

            {section === 'activity' && (
              <Panel title="Activity & Security" source={source}>
                <FieldGrid>
                  <Field label="Account created" value={formatDateTime(user.createdAt) === DASH ? null : formatDateTime(user.createdAt)} />
                  <Field label="Profile last updated" value={formatDateTime(user.updatedAt) === DASH ? null : formatDateTime(user.updatedAt)} />
                  <Field
                    label="Last activity"
                    value={user.lastActivity ? formatDateTime(user.lastActivity) : null}
                    unavailableReason={isLive ? 'Sign-in activity is held in authentication records.' : undefined}
                  />
                  <Field
                    label="Platform administrator"
                    value={user.isPlatformAdmin === null ? null : user.isPlatformAdmin ? 'Yes' : 'No'}
                    unavailableReason={user.isPlatformAdmin === null ? 'The admin roster is only readable for your own account.' : undefined}
                  />
                  <Field
                    label="Account state"
                    value={user.isSuspended === null ? null : user.isSuspended ? 'Suspended' : 'In good standing'}
                    unavailableReason={user.isSuspended === null ? 'User-level suspension is not modelled yet.' : undefined}
                  />
                  <Field label="Multi-factor authentication" value={null} unavailableReason={AUTH_HIDDEN} />
                </FieldGrid>
              </Panel>
            )}

            {section === 'admin' && (
              <Panel title="Administration" source="ui_only" description="These controls are design previews. No privileged database operations are connected.">
                <div className="grid gap-2 sm:grid-cols-2">
                  <AdminAction icon={UserPlus} label="Invite User" detail="Send a company invitation to a new address." />
                  <AdminAction icon={Repeat} label="Change Role" detail="Move a membership to another company role." />
                  <AdminAction icon={UserMinus} label="Remove Membership" detail="End access to one company workspace." />
                  <AdminAction icon={user.isSuspended ? RotateCcw : Ban} label={user.isSuspended ? 'Restore User' : 'Suspend User'} detail="Block or restore sign-in across the network." tone="danger" />
                  <AdminAction icon={KeyRound} label="Reset Access" detail="Revoke sessions and require a fresh sign-in." />
                  <AdminAction icon={Crown} label="Grant Platform Admin" detail="Add this account to the platform_admins roster." tone="danger" />
                </div>
              </Panel>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const Panel: React.FC<{ title: string; source: DataSource | 'ui_only'; description?: string; children: React.ReactNode }> = ({ title, source, description, children }) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <SourceTag source={source} />
      </div>
      {description && <p className="text-xs leading-relaxed text-slate-500 text-pretty">{description}</p>}
    </div>
    {children}
  </div>
);

const FieldGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <dl className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2">{children}</dl>
);

const Field: React.FC<{ label: string; value: string | null; mono?: boolean; unavailableReason?: string }> = ({ label, value, mono, unavailableReason }) => (
  <div className="flex flex-col gap-1 bg-white px-4 py-3">
    <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
    <dd className={`break-words text-sm ${mono ? 'font-mono text-xs' : ''} ${value ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
      {value ?? (unavailableReason ? <Unavailable reason={unavailableReason} /> : 'Not provided')}
    </dd>
  </div>
);

const EmptyNote: React.FC<{ text: string }> = ({ text }) => (
  <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs text-slate-500">{text}</p>
);

const AdminAction: React.FC<{ icon: LucideIcon; label: string; detail: string; tone?: 'danger' }> = ({ icon: Icon, label, detail, tone }) => (
  <button
    type="button"
    disabled
    aria-disabled="true"
    title="Not connected — UI preview only"
    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left opacity-70 cursor-not-allowed"
  >
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone === 'danger' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-900">{label}</span>
        <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
      </span>
      <span className="text-[11px] leading-snug text-slate-500">{detail}</span>
    </span>
  </button>
);
