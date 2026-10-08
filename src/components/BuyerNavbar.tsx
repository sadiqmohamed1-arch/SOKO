import React, { useEffect, useRef, useState } from 'react';
import {
  Home,
  Sparkles,
  Users,
  Package,
  Contact,
  FolderKanban,
  MessageSquare,
  GraduationCap,
  Bell,
  ChevronDown,
  UserCircle2,
  CreditCard,
  Settings,
  LogOut,
  LogIn,
  Check,
  Building2,
  Award,
  LayoutDashboard,
  FolderLock,
  CalendarCheck,
  ChartColumn,
  UsersRound,
  Crown,
  PlusCircle,
} from 'lucide-react';
import { SokoLogo } from './SokoLogo';
import { Conversation, UserProfile, UserRole, Workspace } from '../types';
import { DemoAccount } from '../data/supplierTypes';

interface BuyerNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile;
  conversations: Conversation[];
  rewardPoints?: number;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSwitchWorkspace: (workspaceId: string) => void;
  onOpenProfile: () => void;
  onOpenBusinessCard: () => void;
  onSwitchDemoRole: (role: UserRole) => void;
  demoAccounts?: DemoAccount[];
  activeDemoAccountId?: string;
  onSwitchDemoAccount?: (account: DemoAccount) => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  onOpenAuthModal?: (mode: 'login' | 'signup') => void;
  onOpenSupplierOnboarding?: () => void;
}

type OpenMenu = 'none' | 'notifications' | 'profile';

const NAV_ITEMS = [
  { id: 'feed', label: 'Home', icon: Home },
  { id: 'soko-ai', label: 'SOKO AI', icon: Sparkles },
  { id: 'suppliers', label: 'Suppliers', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'contacts', label: 'My Network', icon: Contact },
  { id: 'opportunities', label: 'Market Hub', icon: FolderKanban },
  { id: 'messages', label: 'Messaging', icon: MessageSquare },
];

const SUPPLIER_NAV_ITEMS = [
  { id: 'sw-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sw-profile', label: 'Company Profile', icon: Building2 },
  { id: 'sw-products', label: 'Products', icon: Package },
  { id: 'sw-documents', label: 'Documents', icon: FolderLock },
  { id: 'opportunities', label: 'Market Hub', icon: FolderKanban },
  { id: 'sw-contacts', label: 'Contacts', icon: Contact },
  { id: 'sw-visits', label: 'Visits', icon: CalendarCheck },
  { id: 'sw-insights', label: 'Insights', icon: ChartColumn },
];

const CONTRACTOR_NAV_ITEMS = [
  { id: 'sw-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sw-vendors', label: 'Vendors', icon: Users },
  { id: 'sw-products', label: 'Products', icon: Package },
  { id: 'sw-documents', label: 'Documents', icon: FolderLock },
  { id: 'sw-visits', label: 'Visits', icon: CalendarCheck },
  { id: 'sw-contacts', label: 'Contacts', icon: Contact },
  { id: 'opportunities', label: 'Market Hub', icon: FolderKanban },
  { id: 'sw-insights', label: 'Intelligence', icon: ChartColumn },
];

const COMPANY_MENU = [
  { id: 'sw-team', label: 'Team', icon: UsersRound },
  { id: 'sw-plan', label: 'Subscription', icon: Crown },
  { id: 'sw-settings', label: 'Workspace Settings', icon: Settings },
];

export const BuyerNavbar: React.FC<BuyerNavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  conversations,
  rewardPoints,
  workspaces,
  activeWorkspaceId,
  onSwitchWorkspace,
  onOpenProfile,
  onOpenBusinessCard,
  onSwitchDemoRole,
  demoAccounts,
  activeDemoAccountId,
  onSwitchDemoAccount,
  isAuthenticated,
  onLogout,
  onOpenAuthModal,
  onOpenSupplierOnboarding,
}) => {
  const [openMenu, setOpenMenu] = useState<OpenMenu>('none');
  const rightRef = useRef<HTMLDivElement>(null);

  const personalWorkspace = workspaces.find((w) => w.kind === 'personal');
  const corporateWorkspaces = workspaces.filter((w) => w.kind === 'corporate');
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? personalWorkspace;
  const companyMode = activeWorkspace?.kind === 'corporate';
  const isContractor = companyMode && activeWorkspace?.roleLabel?.startsWith('Contractor');
  const navItems = companyMode ? (isContractor ? CONTRACTOR_NAV_ITEMS : SUPPLIER_NAV_ITEMS) : NAV_ITEMS;

  const unreadConversations = conversations.filter((c) => c.unreadCount > 0);
  const unreadTotal = unreadConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  useEffect(() => {
    if (openMenu === 'none') return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rightRef.current && !rightRef.current.contains(e.target as Node)) setOpenMenu('none');
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu('none');
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openMenu]);

  const toggle = (menu: OpenMenu) => setOpenMenu((prev) => (prev === menu ? 'none' : menu));
  const go = (action: () => void) => {
    action();
    setOpenMenu('none');
  };

  const workspaceRow = (ws: Workspace) => {
    const isActive = ws.id === activeWorkspace?.id;
    return (
      <button
        key={ws.id}
        type="button"
        onClick={() => go(() => onSwitchWorkspace(ws.id))}
        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors cursor-pointer ${
          isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
        }`}
      >
        {ws.kind === 'personal' ? (
          <img src={currentUser.avatarUrl} alt={ws.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
        ) : ws.logoUrl ? (
          <img src={ws.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{ws.name}</p>
          <p className="text-xs text-slate-500 truncate">{ws.roleLabel}</p>
        </div>
        {isActive && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-3">
        <button
          id="brand-logo-btn"
          onClick={() => setActiveTab(companyMode ? 'sw-dashboard' : 'feed')}
          className="flex items-center shrink-0 cursor-pointer"
          title={companyMode ? 'Company dashboard' : 'Home'}
        >
          <SokoLogo size="md" className="shadow-xs" />
        </button>

        <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = item.id === 'messages' ? unreadTotal : 0;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`relative flex flex-col items-center justify-center px-2 sm:px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0 ${
                  isActive ? 'text-blue-700 font-semibold' : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700 stroke-[2.2]' : 'text-slate-500'}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full ring-2 ring-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span className={`hidden ${companyMode ? 'xl:inline' : 'lg:inline'} mt-1 whitespace-nowrap`}>{item.label}</span>
                {isActive && <span className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full bg-blue-700 hidden ${companyMode ? 'xl:block' : 'lg:block'}`} />}
              </button>
            );
          })}
        </nav>

        <div ref={rightRef} className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
          {companyMode && (
            <>
              <button
                id="nav-btn-soko-ai"
                onClick={() => setActiveTab('soko-ai')}
                title="SOKO AI"
                className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTab === 'soko-ai' ? 'bg-violet-50 text-violet-700' : 'text-violet-600 hover:bg-violet-50'}`}
              >
                <Sparkles className="w-5 h-5" />
              </button>
              <button
                id="nav-btn-messages"
                onClick={() => setActiveTab('messages')}
                title="Messaging"
                className={`relative p-2 rounded-lg transition-colors cursor-pointer ${activeTab === 'messages' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <MessageSquare className="w-5 h-5" />
                {unreadTotal > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full ring-2 ring-white">{unreadTotal}</span>
                )}
              </button>
            </>
          )}
          {!companyMode && (
          <button
            id="nav-btn-academy"
            onClick={() => setActiveTab('academy')}
            title="SOKO Academy"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'academy'
                ? 'bg-amber-100 border-amber-400 text-amber-950'
                : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <span className="hidden xl:inline">SOKO Academy</span>
            <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-amber-700">
              <Award className="w-3 h-3" />
              {rewardPoints ?? 720}
            </span>
          </button>
          )}

          <button
            id="nav-btn-notifications"
            onClick={() => toggle('notifications')}
            aria-expanded={openMenu === 'notifications'}
            title="Notifications"
            className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
              openMenu === 'notifications' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadConversations.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
            )}
          </button>

          <button
            id="user-profile-avatar-btn"
            onClick={() => toggle('profile')}
            aria-expanded={openMenu === 'profile'}
            aria-haspopup="true"
            className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl border transition-colors cursor-pointer ${
              openMenu === 'profile' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
            <div className="hidden md:flex flex-col items-start leading-tight text-left">
              <span className="text-xs font-semibold text-slate-900 max-w-[120px] truncate">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500 max-w-[120px] truncate">{companyMode ? activeWorkspace?.roleLabel : 'Buyer'}</span>
              <span className="text-[10px] text-blue-700 max-w-[120px] truncate">
                {activeWorkspace?.kind === 'corporate' ? activeWorkspace.name : 'Personal Workspace'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openMenu === 'profile' ? 'rotate-180' : ''}`} />
          </button>

          {openMenu === 'notifications' && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Notifications</span>
                {unreadTotal > 0 && <span className="text-xs text-slate-500">{unreadTotal} unread</span>}
              </div>
              {unreadConversations.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto">
                  {unreadConversations.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => go(() => setActiveTab('messages'))}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <img src={c.participant.avatar} alt={c.participant.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-900 truncate">
                            <span className="font-semibold">{c.participant.name}</span> sent you a message
                          </p>
                          <p className="text-xs text-slate-500 truncate">{c.lastMessage}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{c.lastMessageTime}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {openMenu === 'profile' && (
            <div
              id="user-profile-dropdown"
              className="absolute right-0 top-full mt-2 w-72 max-h-[calc(100vh-5rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="px-2 pt-1 pb-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Current context</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {activeWorkspace?.kind === 'corporate' ? activeWorkspace.name : 'Personal Workspace'}
                </span>
              </div>
              <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400">PERSONAL</p>
              {personalWorkspace && workspaceRow(personalWorkspace)}

              {corporateWorkspaces.length > 0 && (
                <>
                  <p className="px-2 pt-3 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400">WORKSPACES</p>
                  {corporateWorkspaces.map(workspaceRow)}
                </>
              )}

              {onOpenSupplierOnboarding && (
                <button
                  type="button"
                  onClick={() => go(onOpenSupplierOnboarding)}
                  className="mt-1 w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Register or join a supplier company
                </button>
              )}

              {companyMode && (
                <>
                  <div className="my-2 border-t border-slate-100" />
                  <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400">COMPANY</p>
                  {COMPANY_MENU.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => go(() => setActiveTab(item.id))}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors cursor-pointer ${activeTab === item.id ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
                      >
                        <Icon className={`w-4 h-4 ${item.id === 'sw-plan' ? 'text-[#8a702f]' : 'text-slate-500'}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}

              <div className="my-2 border-t border-slate-100" />

              {[
                { label: 'My Profile', icon: UserCircle2, action: onOpenProfile },
                { label: 'My Digital Business Card', icon: CreditCard, action: onOpenBusinessCard },
                { label: 'Account Settings', icon: Settings, action: () => setActiveTab('settings') },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => go(item.action)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-slate-500" />
                    {item.label}
                  </button>
                );
              })}

              <div className="my-2 border-t border-slate-100" />

              {isAuthenticated || !onOpenAuthModal ? (
                <button
                  type="button"
                  onClick={() => go(() => onLogout?.())}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(() => onOpenAuthModal('login'))}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}

              {demoAccounts && onSwitchDemoAccount && (
                <div className="mt-2 pt-2 border-t border-dashed border-slate-200 px-2 pb-1">
                  <p className="text-[10px] text-slate-400 mb-1.5">Demo: switch account (admin only)</p>
                  <div className="flex flex-col gap-1">
                    {demoAccounts.map((acct) => (
                      <button
                        key={acct.id}
                        type="button"
                        onClick={() => go(() => onSwitchDemoAccount(acct))}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${activeDemoAccountId === acct.id ? 'bg-blue-50 ring-1 ring-blue-200 text-blue-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <img src={acct.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{acct.label}</p>
                          <p className="text-[10px] text-slate-400 truncate">{acct.description}</p>
                        </div>
                        {activeDemoAccountId === acct.id && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">Legacy role preview</span>
                    <select
                      id="role-persona-select"
                      value={currentUser.role}
                      onChange={(e) => go(() => onSwitchDemoRole(e.target.value as UserRole))}
                      className="text-[11px] px-1.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer focus:outline-hidden"
                    >
                      <option value="buyer">Buyer</option>
                      <option value="supplier">Supplier</option>
                      <option value="contractor">Contractor</option>
                      <option value="admin">Super Admin</option>
                    </select>
                  </div>
                </div>
              )}
              {(!demoAccounts || !onSwitchDemoAccount) && (
                <div className="mt-2 pt-2 border-t border-dashed border-slate-200 px-2 pb-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">Demo: preview portal</span>
                  <select
                    id="role-persona-select"
                    value={currentUser.role}
                    onChange={(e) => go(() => onSwitchDemoRole(e.target.value as UserRole))}
                    className="text-[11px] px-1.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer focus:outline-hidden"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="supplier">Supplier</option>
                    <option value="contractor">Contractor</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
