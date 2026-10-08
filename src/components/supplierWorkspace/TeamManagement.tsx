import React, { useState } from 'react';
import { Check, Minus, UserPlus, FlaskConical, RotateCcw, Eye } from 'lucide-react';
import { Permission, CONTRACTOR_ROLE_META, CONTRACTOR_ROLES, roleMeta, SUPPLIER_ROLES, CompanyRole, TIER_CONFIG, CompanyMembership } from '../../data/supplierTypes';
import { approveRequest, changeMemberRole, inviteMember, removeMember, simulateInviteAccepted, setPreviewRole } from '../../data/supplierService';
import { ConfirmDialog, StatusPill, btnPrimary, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { ProfileDialog } from '../ProfileDialog';
import { DemoNote, fmtDate } from '../marketHub/MarketHubShared';
import { Card, Meter, PageHeader, SW } from './SupplierShared';
import { TextField } from './ProfileEditors';

const SUPPLIER_PERMISSION_LABELS: [Permission, string][] = [
  ['profile.edit', 'Edit company profile'],
  ['products.manage', 'Manage products'],
  ['documents.view', 'View documents'],
  ['documents.manage', 'Upload & manage documents'],
  ['documents.share', 'Share documents'],
  ['contacts.manage', 'Manage buyer contacts'],
  ['campaigns.manage', 'Create campaigns'],
  ['visits.manage', 'Log visit follow-ups'],
  ['team.manage', 'Manage team'],
  ['plan.manage', 'Change subscription'],
  ['records.delete', 'Delete records'],
];

const CONTRACTOR_PERMISSION_LABELS: [Permission, string][] = [
  ['profile.edit', 'Edit company profile'],
  ['products.manage', 'Manage products'],
  ['documents.view', 'View documents'],
  ['documents.manage', 'Upload & manage documents'],
  ['documents.share', 'Share documents'],
  ['contacts.manage', 'Manage vendors & contacts'],
  ['campaigns.manage', 'Create campaigns'],
  ['visits.manage', 'Manage visits'],
  ['team.manage', 'Manage team & roles'],
  ['plan.manage', 'Change subscription'],
  ['records.delete', 'Delete records'],
];

const isDev = import.meta.env.DEV;

const InviteDialog: React.FC<{ sw: SW; onClose: () => void }> = ({ sw, onClose }) => {
  const isContractor = sw.company.kind === 'contractor';
  const defaultRole: CompanyRole = isContractor ? 'viewer' : 'viewer';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<CompanyRole>(defaultRole);
  const roles = isContractor ? CONTRACTOR_ROLES : SUPPLIER_ROLES;
  return (
    <ProfileDialog
      title="Invite a team member"
      subtitle="They join with their own SOKO account. Their personal network stays private to them."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="button" onClick={() => sw.run(inviteMember(sw.ctx, name, email, role, title), `Invitation sent to ${email} (simulated)`) && onClose()} className={btnPrimary}>Send invitation</button>
        </div>
      }
    >
      <div className="space-y-3">
        <TextField label="Full name" value={name} onChange={setName} required />
        <TextField label="Work email" type="email" value={email} onChange={setEmail} required />
        <TextField label="Job title" value={title} onChange={setTitle} />
        <label className="block">
          <span className={labelCls}>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as CompanyRole)} className={inputCls}>
            {roles.map((r) => <option key={r} value={r}>{roleMeta(r).label}</option>)}
          </select>
        </label>
        <p className="text-xs text-slate-500">{roleMeta(role).description}</p>
        <p className="text-xs text-slate-400">New invitations default to Viewer (least privilege). An admin can assign a higher role after the member joins.</p>
      </div>
    </ProfileDialog>
  );
};

const RoleSimulator: React.FC<{ sw: SW }> = ({ sw }) => {
  if (!isDev || sw.company.kind !== 'contractor') return null;
  const isRealAdmin = sw.membership.role === 'contractor_admin';
  const previewRole = sw.store.previewRole[sw.company.id];
  const simulating = !!previewRole;

  if (!isRealAdmin && !simulating) return null;

  const roles: CompanyRole[] = CONTRACTOR_ROLES;
  const currentLabel = simulating ? roleMeta(previewRole!).label : roleMeta(sw.membership.role).label;

  return (
    <Card title="Development / Demo Role Simulator" action={<span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">DEV ONLY</span>}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          <span>This simulator temporarily changes the effective permissions for testing. It never modifies your real membership and is excluded from production builds.</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Currently simulating:</span>
          <span className="text-sm font-bold text-slate-900">{currentLabel}</span>
          {simulating && <span className="text-[10px] text-amber-700">(simulated)</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {roles.map((r) => {
            const isActive = simulating ? previewRole === r : !simulating && sw.membership.role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  if (isActive && simulating) {
                    sw.setStore(setPreviewRole(sw.store, sw.company.id, undefined));
                    sw.notify('Role simulator reset to your real role');
                  } else {
                    sw.setStore(setPreviewRole(sw.store, sw.company.id, r));
                    sw.notify(`Simulating as ${roleMeta(r).label}`);
                  }
                }}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors cursor-pointer ${
                  isActive ? 'border-blue-300 bg-blue-50 text-blue-900 font-semibold' : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span>{roleMeta(r).label}</span>
                {isActive && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            );
          })}
        </div>

        {simulating && (
          <button
            type="button"
            onClick={() => {
              sw.setStore(setPreviewRole(sw.store, sw.company.id, undefined));
              sw.notify('Role simulator reset to your real role');
            }}
            className={`${btnSecondary} text-xs w-full`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to authorized role
          </button>
        )}

        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>Your real role:</strong> {roleMeta(sw.membership.role).label}</p>
          <p><strong>Simulated permissions:</strong> {roleMeta(simulating ? previewRole! : sw.membership.role).permissions.length} permissions active</p>
          <p className="text-slate-400">This is a prototype testing tool, not production authentication.</p>
        </div>
      </div>
    </Card>
  );
};

export const TeamManagement: React.FC<{ sw: SW }> = ({ sw }) => {
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<CompanyMembership | null>(null);
  const manage = sw.can('team.manage');
  const active = sw.members.filter((m) => m.status === 'active');
  const invited = sw.members.filter((m) => m.status === 'invited');
  const pending = sw.members.filter((m) => m.status === 'pending_approval');
  const seats = TIER_CONFIG[sw.company.tier].teamSeats;
  const used = active.length + invited.length;
  const isContractor = sw.company.kind === 'contractor';
  const roles = isContractor ? CONTRACTOR_ROLES : SUPPLIER_ROLES;
  const permissionLabels = isContractor ? CONTRACTOR_PERMISSION_LABELS : SUPPLIER_PERMISSION_LABELS;

  const activeAdmins = active.filter((m) => m.role === 'supplier_admin' || m.role === 'contractor_admin');
  const isAdminMember = (m: CompanyMembership) => m.role === 'supplier_admin' || m.role === 'contractor_admin';

  const canChangeRole = (m: CompanyMembership): boolean => {
    if (!manage) return false;
    // Prevent self-demotion when last admin
    if (m.userId === sw.user.id && isAdminMember(m) && activeAdmins.length === 1) return false;
    return true;
  };

  const canRemove = (m: CompanyMembership): boolean => {
    if (!manage) return false;
    if (m.userId === sw.user.id) return false; // can't remove self
    // Prevent removing last admin
    if (isAdminMember(m) && activeAdmins.length === 1) return false;
    return true;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Company menu · Team"
        title="Team & roles"
        subtitle="Everyone uses one personal SOKO account. Company roles decide what they can do inside this workspace."
        actions={manage ? <button type="button" onClick={() => setInviting(true)} className={btnPrimary}><UserPlus className="w-4 h-4" /> Invite member</button> : undefined}
      />

      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-6 min-w-0">
          {pending.length > 0 && (
            <Card title={`Pending access requests (${pending.length})`}>
              <ul className="divide-y divide-slate-100">
                {pending.map((m) => (
                  <li key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{m.name} <span className="font-normal text-slate-500">· {m.email}</span></p>
                      <p className="text-xs text-slate-500">Requested {roleMeta(m.role).label} · {fmtDate(m.at)}</p>
                      {m.note && <p className="mt-1 text-xs text-amber-800 bg-amber-50 rounded-md px-2 py-1 inline-block">{m.note}</p>}
                    </div>
                    {manage && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setRemoving(m)} className={btnSecondary}>Decline</button>
                        <button type="button" onClick={() => sw.run(approveRequest(sw.ctx, m.id), `${m.name} approved`)} className={btnPrimary}>Approve</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title={`Team members (${active.length})`}>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-2 font-semibold">Member</th>
                    <th className="px-3 py-2 font-semibold">Role</th>
                    <th className="px-3 py-2 font-semibold">Since</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...active, ...invited].map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">
                          {m.name} {m.userId === sw.user.id && <span className="text-xs font-normal text-slate-500">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{m.title || '—'} · {m.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        {canChangeRole(m) ? (
                          <select aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => sw.run(changeMemberRole(sw.ctx, m.id, e.target.value as CompanyRole), 'Role updated')} className={`${inputCls} py-1.5`}>
                            {roles.map((r) => <option key={r} value={r}>{roleMeta(r).label}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-700">{roleMeta(m.role).label}</span>
                        )}
                        {m.status === 'invited' && <div className="mt-1"><StatusPill tone="amber">Invitation pending</StatusPill></div>}
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{fmtDate(m.at)}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {manage && m.status === 'invited' && (
                          <button type="button" onClick={() => sw.run(simulateInviteAccepted(sw.ctx, m.id), `${m.name} joined (simulated)`)} className="text-xs font-semibold text-blue-700 hover:underline mr-3 cursor-pointer">Simulate accept</button>
                        )}
                        {canRemove(m) && (
                          <button type="button" onClick={() => setRemoving(m)} className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer">{m.status === 'invited' ? 'Cancel' : 'Remove'}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Role permissions">
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="px-5 py-2 text-left font-semibold">Permission</th>
                    {roles.map((r) => <th key={r} className="px-2 py-2 font-semibold text-center">{roleMeta(r).label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissionLabels.map(([p, label]) => (
                    <tr key={p}>
                      <td className="px-5 py-2 text-slate-700">{label}</td>
                      {roles.map((r) => (
                        <td key={r} className="px-2 py-2 text-center">
                          {roleMeta(r).permissions.includes(p) ? <Check className="w-4 h-4 text-blue-600 mx-auto" aria-label="Allowed" /> : <Minus className="w-4 h-4 text-slate-300 mx-auto" aria-label="Not allowed" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <RoleSimulator sw={sw} />
        </div>

        <aside className="space-y-4">
          <Card title="Team seats">
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{used} <span className="text-sm font-normal text-slate-500">of {seats}</span></p>
            <div className="mt-2"><Meter value={(used / seats) * 100} tone={sw.premium ? 'gold' : 'blue'} /></div>
            <p className="mt-2 text-xs text-slate-500">{sw.premium ? 'Premium includes expanded team access.' : 'Upgrade for up to 25 seats.'}</p>
          </Card>
          <Card title="Your role">
            <p className="text-sm font-semibold text-slate-900">{roleMeta(sw.role).label}</p>
            <p className="mt-1 text-xs text-slate-500">{roleMeta(sw.role).description}</p>
            {sw.role !== sw.membership.role && (
              <p className="mt-2 text-xs text-amber-700 flex items-center gap-1"><Eye className="w-3 h-3" /> Simulated — your real role is {roleMeta(sw.membership.role).label}</p>
            )}
          </Card>
          <DemoNote>Invitations and approvals are simulated. No emails are sent. Duplicate memberships are prevented by checking email and user ID.</DemoNote>
        </aside>
      </div>

      {inviting && <InviteDialog sw={sw} onClose={() => setInviting(false)} />}
      {removing && (
        <ConfirmDialog
          title={removing.status === 'active' ? `Remove ${removing.name}?` : removing.status === 'invited' ? 'Cancel invitation?' : 'Decline request?'}
          message={removing.status === 'active' ? 'They keep their personal SOKO account and personal contacts, but lose access to this company workspace.' : 'They will not get access to this company workspace.'}
          confirmLabel={removing.status === 'active' ? 'Remove' : 'Confirm'}
          onConfirm={() => {
            sw.run(removeMember(sw.ctx, removing.id), 'Team updated');
            setRemoving(null);
          }}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
};
