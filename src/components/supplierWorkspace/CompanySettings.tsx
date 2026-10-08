import React, { useState } from 'react';
import { Eye, History, LogOut, RotateCcw } from 'lucide-react';
import { CONTRACTOR_ROLE_META, CONTRACTOR_ROLES, roleMeta, SUPPLIER_ROLES, CompanyRole } from '../../data/supplierTypes';
import { setPreviewRole } from '../../data/supplierService';
import { resetSupplierStore } from '../../data/supplierStore';
import { ConfirmDialog, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { DemoNote, Field, daysAgo } from '../marketHub/MarketHubShared';
import { Card, PageHeader, SW } from './SupplierShared';

export const CompanySettings: React.FC<{ sw: SW; onLeaveCompany: () => void }> = ({ sw, onLeaveCompany }) => {
  const [confirm, setConfirm] = useState<'leave' | 'reset' | null>(null);
  const realAdmin = sw.membership.role === 'supplier_admin' || sw.membership.role === 'contractor_admin';
  const preview = sw.store.previewRole[sw.company.id];
  const audit = sw.store.audit.filter((a) => a.companyId === sw.company.id).slice(0, 12);
  const p = sw.company.profile;

  return (
    <div>
      <PageHeader eyebrow="Company menu · Settings" title="Workspace settings" subtitle="Company workspace details, role preview and your membership." />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Company workspace">
          <div className="grid grid-cols-2 gap-4">
            <Field label="SOKO Supplier ID" value={sw.company.sokoId} />
            <Field label="Trading name" value={p.tradingName} />
            <Field label="Legal name" value={p.legalName} />
            <Field label="Trade license" value={p.licenseNo} />
            <Field label="Emirate" value={p.emirate} />
            <Field label="Your role" value={roleMeta(sw.membership.role).label} />
          </div>
        </Card>

        {realAdmin && (
          <Card title="Preview as another role">
            <p className="text-sm text-slate-600">See exactly what a colleague with a different role can do. Your own role does not change.</p>
            <label className="block mt-3">
              <span className={labelCls}>Preview role</span>
              <select
                value={preview ?? ''}
                onChange={(e) => {
                  const role = (e.target.value || undefined) as CompanyRole | undefined;
                  sw.setStore(setPreviewRole(sw.store, sw.company.id, role));
                  sw.notify(role ? `Previewing as ${roleMeta(role).label}` : 'Back to your own role');
                }}
                className={inputCls}
              >
                <option value="">No preview ({sw.company.kind === 'contractor' ? 'Company Admin' : 'Supplier Admin'})</option>
                {(sw.company.kind === 'contractor' ? CONTRACTOR_ROLES : SUPPLIER_ROLES).filter((r) => r !== (sw.company.kind === 'contractor' ? 'contractor_admin' : 'supplier_admin')).map((r) => <option key={r} value={r}>{roleMeta(r).label}</option>)}
              </select>
            </label>
            {preview && <p className="mt-2 text-xs text-slate-500 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {roleMeta(preview).description}</p>}
          </Card>
        )}

        <Card title="Recent workspace activity">
          <ul className="space-y-2.5">
            {audit.map((a) => (
              <li key={a.id} className="flex gap-2 text-sm">
                <History className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                <span className="flex-1 text-slate-700">{a.action} <span className="text-slate-400">· {a.actor}</span></span>
                <span className="text-xs text-slate-400 whitespace-nowrap">{daysAgo(a.at)}</span>
              </li>
            ))}
            {audit.length === 0 && <li className="text-sm text-slate-500">No activity yet.</li>}
          </ul>
        </Card>

        <Card title="Membership">
          <p className="text-sm text-slate-600">Leaving removes your access to this company workspace. Your personal SOKO account, personal network and messages stay exactly as they are.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setConfirm('leave')} className={`${btnSecondary} text-rose-700`}><LogOut className="w-4 h-4" /> Leave company</button>
            <button type="button" onClick={() => setConfirm('reset')} className={btnSecondary}><RotateCcw className="w-4 h-4" /> Reset supplier demo data</button>
          </div>
        </Card>
      </div>
      <div className="mt-4"><DemoNote>ABC Waterproofing LLC and Emirates Steel Industries are simulated demo workspaces.</DemoNote></div>

      {confirm === 'leave' && (
        <ConfirmDialog title={`Leave ${p.tradingName}?`} message="You will return to your personal workspace. An admin can invite you again later." confirmLabel="Leave company" onConfirm={() => { setConfirm(null); onLeaveCompany(); }} onClose={() => setConfirm(null)} />
      )}
      {confirm === 'reset' && (
        <ConfirmDialog
          title="Reset supplier demo data?"
          message="All supplier workspace changes (profiles, products, documents, team, registered companies) return to the original demo. The page will reload."
          confirmLabel="Reset"
          onConfirm={() => {
            resetSupplierStore();
            window.location.reload();
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
};
