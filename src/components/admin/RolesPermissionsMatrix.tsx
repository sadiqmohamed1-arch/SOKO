import React, { useMemo } from 'react';
import { Check, Minus, Crown, Info } from 'lucide-react';
import { type CompanyKind, type DataSource, type PermissionDef, type RoleDef, PLATFORM_ADMIN_EXAMPLE } from './userShared';
import { SourceTag } from './userBadges';

interface RolesPermissionsMatrixProps {
  roles: RoleDef[];
  permissions: PermissionDef[];
  source: DataSource;
  isLoading: boolean;
  memberCounts: Map<string, number> | null;
}

const KIND_GROUPS: { kind: CompanyKind; label: string; tone: string }[] = [
  { kind: 'supplier', label: 'Supplier roles', tone: 'bg-blue-50 text-blue-800' },
  { kind: 'contractor', label: 'Contractor roles', tone: 'bg-slate-100 text-slate-800' },
];

export const RolesPermissionsMatrix: React.FC<RolesPermissionsMatrixProps> = ({ roles, permissions, source, isLoading, memberCounts }) => {
  const grouped = useMemo(
    () => KIND_GROUPS.map((group) => ({ ...group, roles: roles.filter((r) => r.companyKind === group.kind) })),
    [roles],
  );
  const orderedRoles = grouped.flatMap((g) => g.roles);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading roles and permissions">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Company role permissions</h3>
            <SourceTag source={source} />
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-slate-500 text-pretty">
            {source === 'live'
              ? 'Read from the roles, role_permissions and permissions reference tables in staging. This is the exact set the database enforces.'
              : 'Supabase reference tables are not loaded in this session. Showing a copy of the seeded role definitions for illustration only.'}
          </p>
        </div>
        <span className="text-xs text-slate-500 sm:text-right">
          {orderedRoles.length} roles • {permissions.length} permissions
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] border-collapse text-left text-xs">
          <caption className="sr-only">Permissions granted to each company role</caption>
          <thead>
            <tr className="border-b border-slate-200">
              <th scope="col" rowSpan={2} className="sticky left-0 z-10 w-64 bg-white px-4 py-3 align-bottom text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Permission
              </th>
              {grouped.map((group) => (
                <th key={group.kind} scope="colgroup" colSpan={group.roles.length} className={`border-l border-slate-200 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide ${group.tone}`}>
                  {group.label}
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              {grouped.map((group) =>
                group.roles.map((role, index) => (
                  <th
                    key={`${role.companyKind}-${role.key}`}
                    scope="col"
                    className={`px-2 py-3 text-center align-bottom ${index === 0 ? 'border-l border-slate-200' : ''}`}
                    title={role.description}
                  >
                    <span className="flex flex-col items-center gap-1">
                      {role.isAdmin && <Crown className="h-3.5 w-3.5 text-amber-600" aria-label="Company administrator role" />}
                      <span className="text-[11px] font-semibold leading-tight text-slate-900 text-balance">{role.label}</span>
                      {memberCounts && (
                        <span className="font-mono text-[10px] font-medium text-slate-500">
                          {(memberCounts.get(`${role.companyKind}:${role.key}`) ?? 0).toLocaleString()} active
                        </span>
                      )}
                    </span>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {permissions.map((permission) => (
              <tr key={permission.key} className="hover:bg-slate-50">
                <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2.5 font-normal">
                  <span className="flex flex-col gap-0.5">
                    <span className="font-mono text-[11px] font-semibold text-slate-900">{permission.key}</span>
                    <span className="text-[11px] leading-snug text-slate-500">{permission.description}</span>
                  </span>
                </th>
                {grouped.map((group) =>
                  group.roles.map((role, index) => {
                    const granted = role.permissions.includes(permission.key);
                    return (
                      <td
                        key={`${role.companyKind}-${role.key}`}
                        className={`px-2 py-2.5 text-center ${index === 0 ? 'border-l border-slate-200' : ''}`}
                      >
                        {granted ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">{`${role.label} has ${permission.key}`}</span>
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">{`${role.label} does not have ${permission.key}`}</span>
                          </span>
                        )}
                      </td>
                    );
                  }),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Platform Administrator</h3>
            <SourceTag source="ui_only" />
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-slate-500 text-pretty">
            Platform administration is granted by the platform_admins roster rather than a stored permission list. These
            capabilities describe what the existing admin functions check for, and are shown as an illustration.
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_ADMIN_EXAMPLE.map((item) => (
            <li key={item.key} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-900 text-white">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-900">{item.label}</span>
                <span className="font-mono text-[10px] text-slate-500">{item.key}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Permissions are read-only here. Role definitions change only through reviewed database migrations.
      </p>
    </div>
  );
};
