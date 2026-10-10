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
  LayoutGrid,
  Search,
  Award,
  LayoutDashboard,
  FolderLock,
  CalendarCheck,
  ChartColumn,
  UsersRound,
  Crown,
  PlusCircle,
  CheckCheck,
  FileText,
  Handshake,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { SokoLogo, SokoLockup } from './SokoLogo';
import { Conversation, UserProfile, Workspace } from '../types';
import { NotificationFilter, SokoNotification } from '../data/notificationStore';

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
  isAuthenticated?: boolean;
  onLogout?: () => void;
  onOpenAuthModal?: (mode: 'login' | 'signup') => void;
  onOpenCompanyOnboarding?: (intent: CompanyOnboardingIntent) => void;
  notifications: SokoNotification[];
  unreadNotificationCount: number;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: (filter: NotificationFilter) => void;
}

type OpenMenu = 'none' | 'notifications' | 'profile' | 'sections';

export type CompanyOnboardingIntent = 'join' | 'supplier' | 'contractor';

const COMPANY_ONBOARDING_OPTIONS: { intent: CompanyOnboardingIntent; label: string }[] = [
  { intent: 'join', label: 'Join an Existing Company' },
  { intent: 'supplier', label: 'Register a Supplier Company' },
  { intent: 'contractor', label: 'Register a Contractor / Developer Company' },
];

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
  { id: 'sw-profile', label: 'Company Profile', icon: Building2 },
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

const NOTIF_FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'messages', label: 'Messages' },
  { id: 'market_hub', label: 'Market Hub' },
  { id: 'visits', label: 'Visits' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'documents', label: 'Documents' },
];

const NOTIF_EVENT_ICON: Record<SokoNotification['eventType'], typeof Bell> = {
  message: MessageSquare,
  market_hub_interest: Handshake,
  market_hub_update: FolderKanban,
  visit_request: CalendarCheck,
  visit_confirmation: Check,
  vendor_review: ShieldCheck,
  document_shared: FileText,
  compliance_expiry: Clock,
  team_invite: UsersRound,
  team_change: UsersRound,
};

const NOTIF_EVENT_FILTER: Record<SokoNotification['eventType'], NotificationFilter> = {
  message: 'messages',
  market_hub_interest: 'market_hub',
  market_hub_update: 'market_hub',
  visit_request: 'visits',
  visit_confirmation: 'visits',
  vendor_review: 'vendors',
  document_shared: 'documents',
  compliance_expiry: 'documents',
  team_invite: 'all',
  team_change: 'all',
};

const fmtRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

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
  isAuthenticated,
  onLogout,
  onOpenAuthModal,
  onOpenCompanyOnboarding,
  notifications,
  unreadNotificationCount,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) => {
  const [openMenu, setOpenMenu] = useState<OpenMenu>('none');
  const [companyOptionsOpen, setCompanyOptionsOpen] = useState(false);
  useEffect(() => {
    if (openMenu !== 'profile') setCompanyOptionsOpen(false);
  }, [openMenu]);
  const [notifFilter, setNotifFilter] = useState<NotificationFilter>('all');
  const [tip, setTip] = useState<{ label: string; x: number; y: number } | null>(null);
  const showTip = (label: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, x: r.left + r.width / 2, y: r.bottom + 6 });
  };
  const hideTip = () => setTip(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const personalWorkspace = workspaces.find((w) => w.kind === 'personal');
  const corporateWorkspaces = workspaces.filter((w) => w.kind === 'corporate');
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? personalWorkspace;
  const companyMode = activeWorkspace?.kind === 'corporate';
  const isContractor = companyMode && activeWorkspace?.roleLabel?.startsWith('Contractor');
  const navItems = companyMode ? (isContractor ? CONTRACTOR_NAV_ITEMS : SUPPLIER_NAV_ITEMS) : NAV_ITEMS;

  const unreadConversations = conversations.filter((c) => c.unreadCount > 0);
  const unreadTotal = unreadConversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const totalUnreadBadge = unreadTotal + unreadNotificationCount;

  const filteredNotifications = notifFilter === 'all'
    ? notifications
    : notifications.filter((n) => NOTIF_EVENT_FILTER[n.eventType] === notifFilter);

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
          <SokoLogo size="md" className="lg:hidden" />
          <SokoLockup className="hidden lg:block h-7" />
        </button>

        <nav aria-label="Workspace navigation" className={`flex items-center gap-0.5 sm:gap-1 overflow-x-auto ${companyMode ? 'lg:hidden' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = item.id === 'messages' ? unreadTotal : 0;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                onMouseEnter={showTip(item.label)}
                onMouseLeave={hideTip}
                onFocus={showTip(item.label)}
                onBlur={hideTip}
                className={`relative flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 items-center justify-center px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition-all duration-200 cursor-pointer shrink-0 ${
                  isActive ? 'text-blue-700 font-semibold bg-blue-50' : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-100'
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
                <span className={`hidden ${companyMode ? '' : 'lg:inline'} mt-1 whitespace-nowrap`}>{item.label}</span>
                {isActive && !companyMode && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full bg-blue-700 hidden lg:block" />}
              </button>
            );
          })}
        </nav>

        {tip && (
          <div
            role="tooltip"
            className={`fixed z-50 -translate-x-1/2 pointer-events-none px-2 py-1 rounded-md bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-lg lg:hidden`}
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.label}
          </div>
        )}

        <div ref={rightRef} className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
          {companyMode && (
            <>
              <button
                type="button"
                onClick={() => toggle('sections')}
                aria-expanded={openMenu === 'sections'}
                aria-label="Show all workspace sections"
                className={`lg:hidden inline-flex items-center gap-1.5 p-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${openMenu === 'sections' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <LayoutGrid className="w-5 h-5" />
                <span className="hidden sm:inline">Menu</span>
              </button>
              {openMenu === 'sections' && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl p-2 z-50" role="menu">
                  <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace sections</p>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        onClick={() => go(() => setActiveTab(item.id))}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                id="nav-btn-soko-ai"
                onClick={() => setActiveTab('soko-ai')}
                aria-label="Search with SOKO AI"
                className={`flex items-center gap-2 p-2 2xl:pl-3 2xl:pr-4 2xl:w-56 rounded-xl border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeTab === 'soko-ai' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-white'}`}
              >
                <Search className="w-5 h-5 2xl:w-4 2xl:h-4 shrink-0" />
                <span className="hidden 2xl:inline flex-1 text-left text-xs truncate">Search or ask SOKO AI</span>
                <Sparkles className="hidden 2xl:inline w-3.5 h-3.5 text-blue-500 shrink-0" />
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
            aria-label="Notifications"
            className={`relative p-2 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              openMenu === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-5 h-5" />
            {totalUnreadBadge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full ring-2 ring-white">{totalUnreadBadge}</span>
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
            {companyMode && activeWorkspace && (
              <>
                <span className="hidden md:flex items-center gap-2 pl-1">
                  {activeWorkspace.logoUrl ? (
                    <img src={activeWorkspace.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                  ) : (
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center"><Building2 className="w-3.5 h-3.5" /></span>
                  )}
                  <span className="flex flex-col items-start leading-tight text-left">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Workspace</span>
                    <span className="text-xs font-semibold text-slate-900 max-w-[110px] truncate">{activeWorkspace.name}</span>
                  </span>
                </span>
                <span aria-hidden className="hidden md:block w-px h-7 bg-slate-200 mx-1" />
              </>
            )}
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-white" />
            <div className={`hidden ${companyMode ? 'lg:flex' : 'md:flex'} flex-col items-start leading-tight text-left`}>
              <span className="text-xs font-semibold text-slate-900 max-w-[120px] truncate">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500 max-w-[120px] truncate">{companyMode ? activeWorkspace?.roleLabel : 'Personal Workspace'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openMenu === 'profile' ? 'rotate-180' : ''}`} />
          </button>

          {openMenu === 'notifications' && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Notifications</span>
                <div className="flex items-center gap-2">
                  {totalUnreadBadge > 0 && <span className="text-xs text-slate-500">{totalUnreadBadge} unread</span>}
                  {totalUnreadBadge > 0 && (
                    <button type="button" onClick={() => onMarkAllNotificationsRead(notifFilter)} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="px-2 py-1.5 border-b border-slate-100 flex gap-1 flex-wrap">
                {NOTIF_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setNotifFilter(f.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      notifFilter === f.id ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {filteredNotifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications in this category.</p>
              ) : (
                <ul className="max-h-96 overflow-y-auto">
                  {filteredNotifications.slice(0, 20).map((n) => {
                    const Icon = NOTIF_EVENT_ICON[n.eventType] ?? Bell;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => { onMarkNotificationRead(n.id); go(() => setActiveTab(n.route)); }}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${n.read ? 'opacity-60' : ''}`}
                        >
                          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${n.read ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-900 truncate">
                              <span className="font-semibold">{n.title}</span>
                            </p>
                            <p className="text-xs text-slate-500 truncate">{n.description}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{fmtRelative(n.createdAt)}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="px-4 py-2 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 text-center">Prototype notification feed. Real-time delivery requires backend integration.</p>
              </div>
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

              {onOpenCompanyOnboarding && (
                <div className="mt-1">
                  <button
                    type="button"
                    aria-expanded={companyOptionsOpen}
                    aria-controls="company-onboarding-options"
                    onClick={() => setCompanyOptionsOpen((o) => !o)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span className="flex-1 text-left">Join or Register a Company</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${companyOptionsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {companyOptionsOpen && (
                    <ul id="company-onboarding-options" className="flex flex-col pl-7">
                      {COMPANY_ONBOARDING_OPTIONS.map((option) => (
                        <li key={option.intent}>
                          <button
                            type="button"
                            onClick={() => go(() => onOpenCompanyOnboarding(option.intent))}
                            className="w-full px-2 py-1.5 rounded-lg text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
            </div>
          )}
        </div>
      </div>
      {companyMode && (
        <div className="hidden lg:block border-t border-slate-100">
          <nav aria-label="Workspace sections" className="max-w-7xl mx-auto px-4 sm:px-6 h-11 flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative h-full inline-flex items-center gap-2 px-3 text-[13px] whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                    isActive ? 'text-slate-900 font-semibold' : 'text-slate-500 font-medium hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                  {isActive && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-full bg-blue-600" />}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
