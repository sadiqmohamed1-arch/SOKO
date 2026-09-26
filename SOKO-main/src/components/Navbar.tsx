import React, { useState, useRef, useEffect } from 'react';
import { SokoLogo } from './SokoLogo';
import {
  Building2,
  Home,
  Users,
  Users2,
  Briefcase,
  FolderKanban,
  MessageSquare,
  CreditCard,
  BarChart3,
  Contact,
  Tablet,
  GraduationCap,
  Award,
  Flame,
  Globe,
  LogOut,
  LogIn,
  KeyRound,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile;
  setCurrentUserRole: (role: UserRole) => void;
  unreadCount: number;
  rewardPoints?: number;
  streakDays?: number;
  onOpenCreateModal?: () => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onOpenLanding?: () => void;
  onOpenAuthModal?: (mode: 'login' | 'signup') => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUserRole,
  unreadCount,
  rewardPoints,
  streakDays,
  onOpenLanding,
  onOpenAuthModal,
  isAuthenticated,
  onLogout,
}) => {
  const isContractor = currentUser.role === 'contractor';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const navItems = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'contacts', label: 'My Network', icon: Contact },
    { id: 'kiosk', label: 'VMS', icon: Tablet },
    { id: 'opportunities', label: 'Opportunities', icon: FolderKanban },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'messages', label: 'Messaging', icon: MessageSquare, badge: unreadCount },
    ...(isContractor ? [{ id: 'team', label: 'Company Team', icon: Users2 }] : []),
    { id: 'admin', label: 'Super Admin', icon: ShieldCheck },
  ];

  const roleColors: Record<UserRole, { bg: string; text: string; border: string; label: string }> = {
    buyer: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Buyer (Enterprise)' },
    supplier: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Supplier (Tier-1)' },
    contractor: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'General Contractor' },
    admin: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', label: 'Super Admin' },
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-3">
        {/* Left: Brand Logo & Landing Page Link */}
        <div className="flex items-center gap-2">
          <button
            id="brand-logo-btn"
            onClick={() => setActiveTab('feed')}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <SokoLogo size="md" className="shadow-xs" />
            <div className="hidden sm:flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center leading-none">
                SOKO<span className="text-blue-600">.ae</span>
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                Source & Konnect Better
              </span>
            </div>
          </button>

          {onOpenLanding && (
            <button
              onClick={onOpenLanding}
              className="ml-1 sm:ml-2 px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="View Public SOKO.ae Landing Page"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Landing Page</span>
            </button>
          )}
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700 stroke-[2.2]' : 'text-slate-500'}`} />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-white">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="hidden lg:inline mt-1">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-700 rounded-t-full hidden lg:block" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Rewards, Role Persona & Auth Status */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Rewards Quick Status Pill - Only for individual profiles (buyer/supplier) */}
          {!isContractor ? (
            <button
              id="nav-rewards-pill"
              onClick={() => setActiveTab('academy')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs group"
              title="SoKo Rewards: View Balance & Vouchers"
            >
              <Award className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span>{rewardPoints ?? 720} Pts</span>
              <span className="hidden xl:inline text-amber-700 font-medium">• Day {streakDays ?? 4} 🔥</span>
            </button>
          ) : (
            <button
              id="nav-contractor-company-badge"
              onClick={() => setActiveTab('team')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs group"
              title="Apex Industrial Mechanical GC - Company Team & Activity Analytics"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span className="font-semibold truncate max-w-[120px]">Apex GC</span>
              <span className="px-1.5 py-0.2 bg-purple-200/80 text-purple-800 rounded text-[10px] font-mono">Company</span>
            </button>
          )}

          {/* Role Persona Switcher & Profile Avatar Dropdown */}
          <div ref={dropdownRef} className="flex items-center gap-1.5 relative">
            <select
              id="role-persona-select"
              value={currentUser.role}
              onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
              className={`text-xs font-semibold px-2 py-1.5 rounded-md border cursor-pointer focus:outline-hidden transition-colors ${
                roleColors[currentUser.role].bg
              } ${roleColors[currentUser.role].text} ${roleColors[currentUser.role].border}`}
              title="Switch Perspective"
            >
              <option value="buyer">Buyer (Enterprise)</option>
              <option value="supplier">Supplier (Tier-1)</option>
              <option value="contractor">General Contractor</option>
              <option value="admin">🛡️ Super Admin</option>
            </select>

            {/* User Profile Avatar Button */}
            <button
              id="user-profile-avatar-btn"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              className={`relative rounded-full ring-2 transition-all p-0.5 cursor-pointer shrink-0 ${
                isDropdownOpen
                  ? 'ring-blue-600 shadow-xs'
                  : activeTab === 'card'
                  ? 'ring-blue-500'
                  : 'ring-slate-200 hover:ring-blue-400'
              }`}
              title="View Profile & Digital Business Card"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Dropdown Menu when clicked on img */}
            {isDropdownOpen && (
              <div
                id="user-profile-dropdown"
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-3 px-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800"
              >
                {/* User Identity Header */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-2.5">
                  <div className="relative shrink-0">
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-2xs"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm truncate">{currentUser.name}</span>
                      {currentUser.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{currentUser.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.company}</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleColors[currentUser.role].bg} ${roleColors[currentUser.role].text} ${roleColors[currentUser.role].border}`}>
                        {roleColors[currentUser.role].label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action: Digital Business Card (nav-btn-card) */}
                <div>
                  <button
                    id="nav-btn-card"
                    onClick={() => {
                      setActiveTab('card');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                      activeTab === 'card'
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs ring-1 ring-blue-300'
                        : 'bg-gradient-to-r from-blue-50/70 to-indigo-50/50 hover:from-blue-100/70 hover:to-indigo-100/60 border-blue-200/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        activeTab === 'card'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-600 text-white shadow-xs group-hover:scale-105'
                      }`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">Digital Business Card</span>
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-600 text-white rounded">
                            vCard
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          View, share NFC/QR vCard & profile
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                  </button>
                </div>

                {/* Super Admin Portal Action */}
                <div className="mt-1.5">
                  <button
                    id="nav-btn-super-admin"
                    onClick={() => {
                      setActiveTab('admin');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                      activeTab === 'admin'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-300'
                        : 'bg-gradient-to-r from-amber-50/60 to-orange-50/40 hover:from-amber-100/70 hover:to-orange-100/60 border-amber-200/70 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-black">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">Super Admin Portal</span>
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-400 text-slate-950 rounded">
                            Governance
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Manage profiles, verification & moderation
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                  </button>
                </div>

                {/* Dropdown Footer: Sign Out / Sign In */}
                {(isAuthenticated || onOpenAuthModal) && (
                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-end">
                    {isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => {
                          onLogout?.();
                          setIsDropdownOpen(false);
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenAuthModal?.('login');
                          setIsDropdownOpen(false);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* JWT Auth Indicator & Log Out */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
                title="Authenticated via JSON Web Token"
              >
                <KeyRound className="w-2.5 h-2.5 text-emerald-600" />
                JWT
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Log Out of SOKO.ae"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


