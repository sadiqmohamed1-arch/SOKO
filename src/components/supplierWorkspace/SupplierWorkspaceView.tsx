import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SokoBreadcrumb } from '../sokoDesignSystem/SokoBreadcrumb';
import { Info } from 'lucide-react';
import { CommunityContact } from '../../types';
import { can, roleMeta, SessionUser, SupplierResult, SupplierStore } from '../../data/supplierTypes';
import { companyById, documentsOf, effectiveRole, membersOf, membershipFor, productsOf } from '../../data/supplierStore';
import { marketWorkspaceFor } from '../../data/supplierMarket';
import { Toast } from '../NetworkShared';
import { SW, SupplierTab } from './SupplierShared';
import { SupplierDashboard } from './SupplierDashboard';
import { CompanyProfileManager } from './CompanyProfileManager';
import { SupplierProducts } from './SupplierProducts';
import { DocumentCenter } from './DocumentCenter';
import { SupplierContacts } from './SupplierContacts';
import { SupplierVisits } from './SupplierVisits';
import { SupplierInsights } from './SupplierInsights';
import { TeamManagement } from './TeamManagement';
import { SupplierPlans } from './SupplierPlans';
import { CompanySettings } from './CompanySettings';
import { VendorDirectory } from './VendorDirectory';
import { ContractorDashboard } from './ContractorDashboard';
import { ContractorDocumentCenter } from './ContractorDocumentCenter';
import { ContractorIntelligence } from './ContractorIntelligence';
import { ContractorCompanyProfile } from './ContractorCompanyProfile';
import { ProductDiscovery } from './ProductDiscovery';

interface Props {
  tab: SupplierTab;
  store: SupplierStore;
  onStoreChange: (s: SupplierStore) => void;
  user: SessionUser;
  companyId: string;
  onNavigate: (tab: string) => void;
  onLeaveCompany: () => void;
  onStartMessageWith: (userId: string, name: string) => void;
  networkContacts: CommunityContact[];
  onUpdateNetworkContacts: (c: CommunityContact[]) => void;
}

const TAB_LABELS: Record<string, string> = {
  'sw-dashboard': 'Dashboard',
  'sw-profile': 'Company Profile',
  'sw-products': 'Products',
  'sw-documents': 'Documents',
  'sw-contacts': 'Contacts',
  'sw-visits': 'Visits',
  'sw-insights': 'Intelligence',
  'sw-vendors': 'Vendors',
  'sw-team': 'Team',
  'sw-plan': 'Plan',
  'sw-settings': 'Company Settings',
};

/** Page history scoped to one company workspace; it resets when the workspace changes. */
const useWorkspaceHistory = (companyId: string, tab: string) => {
  const [history, setHistory] = useState<{ companyId: string; stack: string[] }>({ companyId, stack: [tab] });
  const backTarget = useRef<string | null>(null);

  useEffect(() => {
    setHistory((h) => {
      if (h.companyId !== companyId) return { companyId, stack: [tab] };
      if (backTarget.current === tab) {
        backTarget.current = null;
        return h;
      }
      if (h.stack[h.stack.length - 1] === tab) return h;
      return { companyId, stack: [...h.stack, tab].slice(-20) };
    });
  }, [companyId, tab]);

  const stack = history.companyId === companyId ? history.stack : [tab];
  const previous = stack.length > 1 ? stack[stack.length - 2] : 'sw-dashboard';

  const back = (navigate: (t: string) => void) => {
    backTarget.current = previous;
    setHistory((h) => ({ companyId, stack: h.stack.length > 1 ? h.stack.slice(0, -1) : ['sw-dashboard'] }));
    navigate(previous);
  };

  return { previous, back };
};

export const SupplierWorkspaceView: React.FC<Props> = ({ tab, store, onStoreChange, user, companyId, onNavigate, onLeaveCompany, onStartMessageWith, networkContacts, onUpdateNetworkContacts }) => {
  const [toast, setToast] = useState<string | null>(null);
  const history = useWorkspaceHistory(companyId, tab);
  const company = companyById(store, companyId);
  const membership = membershipFor(store, user.id, companyId);

  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 3200);
  };

  const sw = useMemo<SW | null>(() => {
    if (!company || !membership) return null;
    const role = effectiveRole(store, membership);
    const run = <T,>(r: SupplierResult<T>, success?: string | ((v: T) => string)) => {
      if (!r.ok) {
        notify(r.error);
        return false;
      }
      onStoreChange(r.store);
      if (success) notify(typeof success === 'function' ? success(r.value) : success);
      return true;
    };
    return {
      store,
      user,
      company,
      membership,
      role,
      ctx: { store, user, companyId, role },
      products: productsOf(store, companyId),
      documents: documentsOf(store, companyId),
      members: membersOf(store, companyId),
      premium: company.tier === 'premium',
      marketWorkspace: marketWorkspaceFor(company, role, user),
      can: (p) => can(role, p),
      run,
      setStore: onStoreChange,
      notify,
      go: onNavigate,
    };
  }, [store, company, membership, user, companyId, onStoreChange, onNavigate]);

  if (!sw) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">You no longer have access to this company</h1>
        <p className="mt-2 text-sm text-slate-600">Your personal account is unchanged. Switch back to your personal workspace from the profile menu.</p>
      </div>
    );
  }

  const isAdmin = sw.membership.role === 'supplier_admin' || sw.membership.role === 'contractor_admin';
  const previewing = isAdmin && sw.role !== sw.membership.role;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {sw.company.demo && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] leading-snug text-slate-500">
          <Info className="w-3.5 h-3.5 mt-px shrink-0 text-slate-400" />
          Demo workspace with fictional, simulated activity. Not affiliated with, or endorsed by, any real company of the same name.
        </p>
      )}
      {previewing && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span>
            Previewing the workspace with <strong>{roleMeta(sw.role).label}</strong> permissions.
          </span>
          <button type="button" onClick={() => onNavigate('sw-settings')} className="font-semibold underline underline-offset-2 cursor-pointer">
            Change in Company Settings
          </button>
        </div>
      )}
      {tab !== 'sw-dashboard' && (
        <SokoBreadcrumb
          className="mb-4"
          onBack={() => history.back(onNavigate)}
          backLabel={`Back to ${TAB_LABELS[history.previous] ?? 'Dashboard'}`}
          trail={[
            { label: sw.company.profile.tradingName, onClick: () => onNavigate('sw-dashboard') },
            { label: TAB_LABELS[tab] ?? 'Page' },
          ]}
        />
      )}

      {tab === 'sw-dashboard' && (sw.company.kind === 'contractor' ? <ContractorDashboard sw={sw} /> : <SupplierDashboard sw={sw} />)}
      {tab === 'sw-profile' && (sw.company.kind === 'contractor' ? <ContractorCompanyProfile sw={sw} /> : <CompanyProfileManager sw={sw} networkContacts={networkContacts} onUpdateNetworkContacts={onUpdateNetworkContacts} onStartMessageWith={onStartMessageWith} />)}
      {tab === 'sw-products' && (sw.company.kind === 'contractor' ? <ProductDiscovery sw={sw} onStartMessageWith={onStartMessageWith} /> : <SupplierProducts sw={sw} />)}
      {tab === 'sw-documents' && (sw.company.kind === 'contractor' ? <ContractorDocumentCenter sw={sw} /> : <DocumentCenter sw={sw} />)}
      {tab === 'sw-contacts' && <SupplierContacts sw={sw} onStartMessageWith={onStartMessageWith} />}
      {tab === 'sw-visits' && <SupplierVisits sw={sw} />}
      {tab === 'sw-insights' && (sw.company.kind === 'contractor' ? <ContractorIntelligence sw={sw} /> : <SupplierInsights sw={sw} />)}
      {tab === 'sw-vendors' && <VendorDirectory sw={sw} />}
      {tab === 'sw-team' && <TeamManagement sw={sw} />}
      {tab === 'sw-plan' && <SupplierPlans sw={sw} />}
      {tab === 'sw-settings' && <CompanySettings sw={sw} onLeaveCompany={onLeaveCompany} />}
      <Toast message={toast} />
    </div>
  );
};

