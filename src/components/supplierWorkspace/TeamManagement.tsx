import React, { useState } from 'react';
import { Check, Minus, UserPlus } from 'lucide-react';
import { Permission, CONTRACTOR_ROLE_META, CONTRACTOR_ROLES, roleMeta, SUPPLIER_ROLES, CompanyRole, TIER_CONFIG } from '../../data/supplierTypes';
import { approveRequest, changeMemberRole, inviteMember, removeMember, simulateInviteAccepted } from '../../data/supplierService';
import { ConfirmDialog, StatusPill, btnPrimary, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { ProfileDialog } from '../ProfileDialog';
import { DemoNote, fmtDate } from '../marketHub/MarketHubShared';
import { Card, Meter, PageHeader, SW } from './SupplierShared';
import { TextField } from './ProfileEditors';
import { CompanyMembership } from '../../data/supplierTypes';

const PERMISSION_LABELS: [Permission, string][] = [
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

const InviteDialog: React.FC<{ sw: SW; onClose: () => void }> = ({ sw, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<CompanyRole>('sales_rep');
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
            {(sw.company.kind === 'contractor' ? CONTRACTOR_ROLES : SUPPLIER_ROLES).map((r) => <option key={r} value={r}>{roleMeta(r).label}</option>)}
          </select>
        </label>
        <p className="text-xs text-slate-500">{roleMeta(role).description}</p>
      </div>
    </ProfileDialog>
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
                        {manage ? (
                          <select aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => sw.run(changeMemberRole(sw.ctx, m.id, e.target.value as CompanyRole), 'Role updated')} className={`${inputCls} py-1.5`}>
                            {(sw.company.kind === 'contractor' ? CONTRACTOR_ROLES : SUPPLIER_ROLES).map((r) => <option key={r} value={r}>{roleMeta(r).label}</option>)}
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
                        {manage && m.userId !== sw.user.id && (
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
                    {SUPPLIER_ROLES.map((r) => <th key={r} className="px-2 py-2 font-semibold text-center">{roleMeta(r).label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_LABELS.map(([p, label]) => (
                    <tr key={p}>
                      <td className="px-5 py-2 text-slate-700">{label}</td>
                      {(sw.company.kind === 'contractor' ? CONTRACTOR_ROLES : SUPPLIER_ROLES).map((r) => (
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
        </div>

        <aside className="space-y-4">
          <Card title="Team seats">
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{used} <span className="text-sm font-normal text-slate-500">of {seats}</span></p>
            <div className="mt-2"><Meter value={(used / seats) * 100} tone={sw.premium ? 'gold' : 'blue'} /></div>
            <p className="mt-2 text-xs text-slate-500">{sw.premium ? 'Supplier Premium includes expanded team access.' : 'Upgrade to Supplier Premium for up to 25 seats.'}</p>
          </Card>
          <Card title="Your role">
            <p className="text-sm font-semibold text-slate-900">{roleMeta(sw.role).label}</p>
            <p className="mt-1 text-xs text-slate-500">{roleMeta(sw.role).description}</p>
          </Card>
          <DemoNote>Invitations and approvals are simulated. No emails are sent.</DemoNote>
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
