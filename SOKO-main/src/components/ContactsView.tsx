import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  MessageCircle,
  Share2,
  Bookmark,
  BookmarkCheck,
  Download,
  Plus,
  Tag,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  Building2,
  X,
  Copy,
  Check,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Sparkles,
  Clock,
  Lock,
  Unlock,
  Inbox,
  AlertCircle,
  MessageSquare,
  Send,
} from 'lucide-react';
import { CommunityContact, UserProfile, UserRole, OfficeKioskVisit } from '../types';
import { ContractorNetworkDashboard } from './ContractorNetworkDashboard';
import { INITIAL_COMMUNITY_CONTACTS } from '../mockData';

interface ContactsViewProps {
  contacts: CommunityContact[];
  onUpdateContacts: (contacts: CommunityContact[]) => void;
  currentUser: UserProfile;
  onStartMessageWith: (userId: string, name: string) => void;
  visits?: OfficeKioskVisit[];
  onUpdateVisits?: (visits: OfficeKioskVisit[]) => void;
}

const StandardContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  onUpdateContacts,
  currentUser,
  onStartMessageWith,
  visits = [],
  onUpdateVisits,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'connections' | 'invitations'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('All');

  // Connection flow modals and toast
  const [connectModalContact, setConnectModalContact] = useState<CommunityContact | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [sharingContact, setSharingContact] = useState<CommunityContact | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedVCard, setCopiedVCard] = useState(false);
  const [editingNotesContactId, setEditingNotesContactId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newTagInput, setNewTagInput] = useState<{ contactId: string; tag: string } | null>(null);

  // New contact form
  const [newContact, setNewContact] = useState({
    name: '',
    title: '',
    company: '',
    role: 'supplier' as UserRole,
    category: 'Raw Materials & Metals',
    location: 'Dubai, UAE',
    phone: '',
    whatsappNumber: '',
    email: '',
    bio: '',
    tags: 'VIP Buyer',
    notes: '',
  });

  // Helper to determine accurate connection status
  const getContactStatus = (contact: CommunityContact): 'connected' | 'pending' | 'incoming' | 'not_connected' => {
    if (contact.connectionStatus) return contact.connectionStatus;
    if (contact.isMaintained && contact.accessStatus === 'direct') return 'connected';
    if (contact.accessStatus === 'requested') return 'pending';
    return 'not_connected';
  };

  // Backfill from INITIAL_COMMUNITY_CONTACTS if stored contacts lack connectionStatus, incoming requests, or full 50 contacts
  useEffect(() => {
    const hasStatus = contacts.some((c) => c.connectionStatus);
    const hasIncoming = contacts.some((c) => c.connectionStatus === 'incoming');
    const hasFull50 = contacts.length >= 50;
    if (!hasStatus || !hasIncoming || !hasFull50) {
      const merged = INITIAL_COMMUNITY_CONTACTS.map((initC) => {
        const existing = contacts.find((c) => c.id === initC.id);
        if (existing) {
          return {
            ...initC,
            ...existing,
            connectionStatus: existing.connectionStatus || initC.connectionStatus,
            mutualConnections: existing.mutualConnections || initC.mutualConnections,
            connectionRequestNote: existing.connectionRequestNote || initC.connectionRequestNote,
            connectedDate: existing.connectedDate || initC.connectedDate,
          };
        }
        return initC;
      });
      // also preserve any user-created contacts that weren't in initial
      const userAdded = contacts.filter((c) => !INITIAL_COMMUNITY_CONTACTS.some((i) => i.id === c.id));
      onUpdateContacts([...merged, ...userAdded]);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Send connection request
  const handleSendConnectionRequest = (contactId: string, noteText: string = '') => {
    const targetContact = contacts.find((c) => c.id === contactId);
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        return {
          ...c,
          connectionStatus: 'pending' as const,
          connectionRequestNote:
            noteText ||
            `Hi ${c.name}, I would like to connect on SoKo.ae regarding GCC procurement and contracting opportunities.`,
          lastContacted: 'Request sent just now',
        };
      }
      return c;
    });
    onUpdateContacts(updated);
    setConnectModalContact(null);
    setCustomNote('');
    showToast(
      `Connection request sent to ${targetContact ? targetContact.name : 'member'}. Direct contact details will unlock once accepted.`
    );
  };

  // Accept incoming connection request
  const handleAcceptConnection = (contactId: string) => {
    const targetContact = contacts.find((c) => c.id === contactId);
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        return {
          ...c,
          connectionStatus: 'connected' as const,
          isMaintained: true,
          accessStatus: 'direct' as const,
          connectedDate: 'Connected just now',
          lastContacted: 'Connected just now',
        };
      }
      return c;
    });
    onUpdateContacts(updated);
    showToast(`Accepted! ${targetContact ? targetContact.name : 'Member'} is now in your network. Direct phone, email, WhatsApp, and vCard export unlocked.`);
  };

  // Decline incoming connection request
  const handleDeclineConnection = (contactId: string) => {
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        return {
          ...c,
          connectionStatus: 'not_connected' as const,
        };
      }
      return c;
    });
    onUpdateContacts(updated);
    showToast('Invitation declined.');
  };

  // Withdraw sent request
  const handleWithdrawRequest = (contactId: string) => {
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        return {
          ...c,
          connectionStatus: 'not_connected' as const,
        };
      }
      return c;
    });
    onUpdateContacts(updated);
    showToast('Connection request withdrawn.');
  };

  // Counts
  const sokoNetworkContacts = contacts.filter((c) => {
    const s = getContactStatus(c);
    return s === 'not_connected' || s === 'pending';
  });
  const connectedContacts = contacts.filter((c) => getContactStatus(c) === 'connected');
  const incomingInvitations = contacts.filter((c) => getContactStatus(c) === 'incoming');

  // Filter contacts by active tab, role, and search query
  const filteredContacts = contacts.filter((contact) => {
    const status = getContactStatus(contact);

    // Tab filtering
    if (activeTab === 'connections') {
      if (status !== 'connected') return false;
    } else if (activeTab === 'invitations') {
      if (status !== 'incoming') return false;
    } else if (activeTab === 'search') {
      // In SoKo Network, show contacts waiting for connection
      if (status === 'connected') return false;
    }

    // Role filter
    if (selectedRole !== 'All' && contact.role !== selectedRole) {
      return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = contact.name.toLowerCase().includes(q);
      const matchCompany = contact.company.toLowerCase().includes(q);
      const matchTitle = contact.title.toLowerCase().includes(q);
      const matchLocation = contact.location.toLowerCase().includes(q);
      const matchCategory = contact.category?.toLowerCase().includes(q);
      const matchTags = contact.tags?.some((t) => t.toLowerCase().includes(q));
      const matchPhone = status === 'connected' && contact.phone.includes(q);
      if (!matchName && !matchCompany && !matchTitle && !matchLocation && !matchCategory && !matchTags && !matchPhone) {
        return false;
      }
    }
    return true;
  });

  // Toggle maintained status
  const handleToggleMaintained = (contactId: string) => {
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        return { ...c, isMaintained: !c.isMaintained };
      }
      return c;
    });
    onUpdateContacts(updated);
  };

  // Add tag to contact
  const handleAddTag = (contactId: string, tag: string) => {
    if (!tag.trim()) return;
    const cleanTag = tag.trim();
    const updated = contacts.map((c) => {
      if (c.id === contactId && !c.tags.includes(cleanTag)) {
        return { ...c, tags: [...c.tags, cleanTag] };
      }
      return c;
    });
    onUpdateContacts(updated);
    setNewTagInput(null);
  };

  // Remove tag from contact
  const handleRemoveTag = (contactId: string, tagToRemove: string) => {
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        return { ...c, tags: c.tags.filter((t) => t !== tagToRemove) };
      }
      return c;
    });
    onUpdateContacts(updated);
  };

  // Save notes
  const handleSaveNotes = (contactId: string) => {
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        return { ...c, notes: tempNotes };
      }
      return c;
    });
    onUpdateContacts(updated);
    setEditingNotesContactId(null);
  };

  // Generate and download .vcf (vCard 3.0) file to save directly in phone!
  const handleDownloadVCard = (contact: CommunityContact) => {
    const vCardContent = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name}`,
      `N:${contact.name.split(' ').slice(1).join(' ') || ''};${contact.name.split(' ')[0]};;;`,
      `ORG:${contact.company}`,
      `TITLE:${contact.title}`,
      `TEL;TYPE=CELL,VOICE:${contact.phone}`,
      `EMAIL;TYPE=WORK,INTERNET:${contact.email}`,
      `ADR;TYPE=WORK:;;${contact.location};;;;`,
      `URL:${contact.website || 'https://soko.ae'}`,
      `NOTE:SoKo.ae B2B Procurement Member | Labels: ${contact.tags.join(', ')} | ${contact.notes || ''}`,
      'END:VCARD',
    ].join('\r\n');

    const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${contact.name.replace(/\s+/g, '_')}_SoKo.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`vCard for ${contact.name} downloaded. Ready to import to your phone.`);
  };

  // Create new contact
  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.company) return;

    const created: CommunityContact = {
      id: `cont_${Date.now()}`,
      name: newContact.name,
      title: newContact.title || 'Procurement Executive',
      company: newContact.company,
      role: newContact.role,
      category: newContact.category,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      location: newContact.location,
      phone: newContact.phone || '+971 4 000 0000',
      whatsappNumber: newContact.whatsappNumber || newContact.phone.replace(/[^0-9]/g, ''),
      email: newContact.email || 'contact@company.com',
      verified: true,
      bio: newContact.bio || 'Direct maintained procurement contact on SoKo.ae',
      isMaintained: true,
      tags: newContact.tags
        ? newContact.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : ['Maintained'],
      notes: newContact.notes,
      accessStatus: 'direct',
      connectionStatus: 'connected',
      connectedDate: 'Connected just now',
      lastContacted: 'Just added',
    };

    onUpdateContacts([created, ...contacts]);
    setShowAddContactModal(false);
    setNewContact({
      name: '',
      title: '',
      company: '',
      role: 'supplier',
      category: 'Raw Materials & Metals',
      location: 'Dubai, UAE',
      phone: '',
      whatsappNumber: '',
      email: '',
      bio: '',
      tags: 'VIP Buyer',
      notes: '',
    });
    showToast(`Added ${created.name} directly to your connected network.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-4 h-4" />
            Verified Procurement Network
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Network & Connections
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Connect with verified GCC buyers, suppliers, and contractors. Like LinkedIn, only accepted connections can view direct contact details, download vCards directly to phone, launch WhatsApp chats, or initiate direct calls.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
          <button
            onClick={() => setShowAddContactModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Direct Contact
          </button>
        </div>
      </div>

      {/* Pending Invitations Alert Banner (visible on Connections / Search tabs if invitations exist) */}
      {incomingInvitations.length > 0 && activeTab !== 'invitations' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900">
                  {incomingInvitations.length} Pending Connection {incomingInvitations.length === 1 ? 'Invitation' : 'Invitations'}
                </h4>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {incomingInvitations[0].name} ({incomingInvitations[0].company}) sent you a connection request.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleAcceptConnection(incomingInvitations[0].id)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              View All ({incomingInvitations.length})
            </button>
          </div>
        </div>
      )}

      {/* Search & SoKo Network Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search Input (Full Width - Label Filter Chips removed per request) */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'connections'
                ? 'Search within your connected network by name, company, or title...'
                : 'Search 50 GCC contacts across the SoKo network to send connection requests...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Below Search Bar: SoKo Network & My Network Switcher + Role Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>SoKo Network</span>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {sokoNetworkContacts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('connections')}
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'connections'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>My Network</span>
              <span className="bg-slate-200 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {connectedContacts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('invitations')}
              className={`relative px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'invitations'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-4 h-4 text-slate-500" />
              <span>Invitations</span>
              {incomingInvitations.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {incomingInvitations.length}
                </span>
              )}
            </button>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium text-[11px] mr-0.5">Filter:</span>
            {['All', 'buyer', 'supplier', 'contractor'].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-2.5 py-1 rounded-lg capitalize font-semibold cursor-pointer transition-all ${
                  selectedRole === role
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role === 'All' ? 'All Roles' : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Context Helper Banner */}
      {activeTab === 'connections' && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-950">
                My Connected Network ({connectedContacts.length} 1st-Degree Connections)
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                All connection requests accepted. Direct phone, email, WhatsApp chat, direct calling, and phone vCard exports (.vcf) are fully active.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('search')}
            className="text-emerald-800 hover:text-emerald-950 font-bold underline shrink-0 cursor-pointer text-xs"
          >
            + Connect with {sokoNetworkContacts.length} SoKo Network Contacts &rarr;
          </button>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                SoKo Network Directory — {sokoNetworkContacts.length} Verified GCC Contacts Available
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Showing Connect option only. Once accepted, contacts move to <strong>My Network</strong> where direct phone, work email, WhatsApp, calling, and phone vCard export unlock.
              </p>
            </div>
          </div>
          {connectedContacts.length > 0 && (
            <button
              onClick={() => setActiveTab('connections')}
              className="text-blue-700 hover:text-blue-800 font-bold underline shrink-0 cursor-pointer text-xs"
            >
              View My Network ({connectedContacts.length}) &rarr;
            </button>
          )}
        </div>
      )}

      {/* Contact Cards Grid */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === 'connections'
                ? 'No accepted connections found'
                : activeTab === 'invitations'
                ? 'No pending invitations'
                : 'No contacts match your search'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {activeTab === 'connections'
                ? "You don't have any accepted connections matching this query. Search the SoKo network to send connection requests to GCC procurement leaders."
                : activeTab === 'invitations'
                ? 'You have responded to all incoming invitations. Search the directory to discover more partners.'
                : 'Try adjusting your search keywords, role filters, or labels.'}
            </p>
          </div>
          {activeTab === 'connections' && (
            <button
              onClick={() => {
                setActiveTab('search');
                setSelectedRole('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
              Search All SoKo Network Members
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => {
            const status = getContactStatus(contact);
            const isConnected = status === 'connected';
            const isPending = status === 'pending';
            const isIncoming = status === 'incoming';
            const cleanPhone = (contact.whatsappNumber || contact.phone).replace(/[^0-9]/g, '');

            return (
              <div
                key={contact.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all relative flex flex-col justify-between ${
                  isConnected
                    ? 'border-blue-200 ring-1 ring-blue-50 hover:shadow-sm'
                    : isIncoming
                    ? 'border-blue-300 ring-2 ring-blue-100 bg-blue-50/20'
                    : isPending
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Row: Avatar, Info, Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={contact.avatarUrl}
                          alt={contact.name}
                          className="w-14 h-14 rounded-xl object-cover ring-1 ring-slate-200"
                        />
                        {contact.verified && (
                          <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full ring-2 ring-white">
                            <ShieldCheck className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors truncate">
                            {contact.name}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md capitalize shrink-0 ${
                              contact.role === 'buyer'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : contact.role === 'supplier'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {contact.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">{contact.title}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mt-1 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{contact.company}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{contact.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Connection Degree & Bookmark Status */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {isConnected && (
                        <button
                          onClick={() => handleToggleMaintained(contact.id)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            contact.isMaintained
                              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700'
                          }`}
                          title={contact.isMaintained ? 'Maintained in rolodex' : 'Maintain contact'}
                        >
                          <BookmarkCheck className={`w-3.5 h-3.5 ${contact.isMaintained ? 'fill-blue-600 text-blue-600' : 'text-slate-400'}`} />
                        </button>
                      )}

                      {/* Connection pill */}
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <UserCheck className="w-3 h-3 text-blue-600" />
                          1st Degree
                        </span>
                      ) : isIncoming ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Inbox className="w-3 h-3 text-amber-700" />
                          Invitation
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          2nd Degree
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {contact.bio}
                  </p>

                  {/* Mutual Connections */}
                  {contact.mutualConnections && (
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{contact.mutualConnections} mutual connections in GCC</span>
                    </div>
                  )}

                  {/* Incoming Invitation Message Bubble */}
                  {isIncoming && contact.connectionRequestNote && (
                    <div className="mt-3 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-950 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        Personal Note from {contact.name.split(' ')[0]}:
                      </div>
                      <p className="italic text-[11px] leading-relaxed">
                        &ldquo;{contact.connectionRequestNote}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Custom Labels / Tags */}
                  <div className="mt-3 flex items-center flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                      >
                        #{tag}
                        {isConnected && (
                          <button
                            onClick={() => handleRemoveTag(contact.id, tag)}
                            className="hover:text-red-600 ml-0.5 cursor-pointer text-slate-400"
                            title="Remove tag"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}

                    {/* Add Tag Inline Button (only for connected contacts) */}
                    {isConnected && (
                      newTagInput?.contactId === contact.id ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="New label..."
                            value={newTagInput.tag}
                            onChange={(e) =>
                              setNewTagInput({ contactId: contact.id, tag: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddTag(contact.id, newTagInput.tag);
                              }
                            }}
                            className="text-[11px] px-2 py-0.5 bg-white border border-blue-400 rounded-md focus:outline-hidden w-24"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddTag(contact.id, newTagInput.tag)}
                            className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-md cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setNewTagInput(null)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setNewTagInput({ contactId: contact.id, tag: '' })}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          Label
                        </button>
                      )
                    )}
                  </div>

                  {/* Private Personal Notes (Only for connected/maintained) */}
                  {isConnected && (
                    <div className="mt-3 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-900">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                          Private Rolodex Note:
                        </span>
                        {editingNotesContactId !== contact.id ? (
                          <button
                            onClick={() => {
                              setEditingNotesContactId(contact.id);
                              setTempNotes(contact.notes || '');
                            }}
                            className="text-[10px] text-amber-800 underline font-semibold hover:text-amber-950 cursor-pointer"
                          >
                            {contact.notes ? 'Edit' : '+ Add Note'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveNotes(contact.id)}
                            className="text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded-md font-bold cursor-pointer"
                          >
                            Save
                          </button>
                        )}
                      </div>

                      {editingNotesContactId === contact.id ? (
                        <textarea
                          rows={2}
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="e.g. Met at summit, prefers email, supplies ASTM rebar..."
                          className="w-full text-xs p-1.5 bg-white border border-amber-300 rounded-md focus:outline-hidden"
                          autoFocus
                        />
                      ) : (
                        <p className="text-[11px] text-amber-900/90 italic">
                          {contact.notes || 'No private notes yet. Click edit to log meeting context or follow-up notes.'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Direct Contact Numbers & Channels (VISIBLE ONLY IF CONNECTED) */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
                    {isConnected ? (
                      <>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" /> Direct Phone:
                          </span>
                          <a
                            href={`tel:${contact.phone}`}
                            className="font-bold text-slate-800 hover:text-blue-600 transition-colors"
                          >
                            {contact.phone}
                          </a>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-blue-600" /> Work Email:
                          </span>
                          <a
                            href={`mailto:${contact.email}`}
                            className="font-medium text-slate-800 hover:text-blue-600 transition-colors truncate max-w-[200px]"
                          >
                            {contact.email}
                          </a>
                        </div>
                      </>
                    ) : (
                      /* SEALED / LOCKED STATE FOR UNCONNECTED CONTACTS */
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[11px] flex items-center gap-1 text-slate-500">
                            <Lock className="w-3 h-3 text-amber-600" /> Direct Phone:
                          </span>
                          <span className="font-mono text-slate-400 select-none tracking-wider text-[11px]">
                            +971 50 ••••••••
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[11px] flex items-center gap-1 text-slate-500">
                            <Lock className="w-3 h-3 text-amber-600" /> Work Email:
                          </span>
                          <span className="font-mono text-slate-400 select-none text-[11px]">
                            ••••••••@{contact.company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'network'}.ae
                          </span>
                        </div>
                        <div className="pt-1 border-t border-slate-200/60 flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Direct contact details sealed until connection is accepted.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Area: Changes based on connection status */}
                {isConnected ? (
                  /* 1. CONNECTED STATE: Full actions (Save in Phone, WhatsApp, Call, Share, Message) */
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      {/* Save to Phone (.vcf) */}
                      <button
                        onClick={() => handleDownloadVCard(contact)}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 text-[10px] font-bold transition-all cursor-pointer shadow-2xs group"
                        title="Download .vcf contact file to import into iOS / Android contacts"
                      >
                        <Download className="w-4 h-4 mb-0.5 text-blue-600 group-hover:scale-110 transition-transform" />
                        <span>Save in Phone</span>
                      </button>

                      {/* Direct WhatsApp */}
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `Hello ${contact.name}, I am connecting with you from the SoKo.ae B2B Procurement Network regarding your profile with ${contact.company}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold transition-all cursor-pointer shadow-2xs group"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 mb-0.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Make Call */}
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold transition-all cursor-pointer shadow-2xs group"
                        title="Call directly"
                      >
                        <Phone className="w-4 h-4 mb-0.5 text-slate-600 group-hover:scale-110 transition-transform" />
                        <span>Call</span>
                      </a>

                      {/* Share Contact */}
                      <button
                        onClick={() => {
                          setSharingContact(contact);
                          setCopiedLink(false);
                          setCopiedVCard(false);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 text-slate-700 text-[10px] font-bold transition-all cursor-pointer shadow-2xs group"
                        title="Share contact on WhatsApp, email or social platforms"
                      >
                        <Share2 className="w-4 h-4 mb-0.5 text-purple-600 group-hover:scale-110 transition-transform" />
                        <span>Share</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onStartMessageWith(contact.id, contact.name)}
                      className="w-full py-1.5 px-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-slate-700 hover:text-blue-700 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Message on SoKo</span>
                    </button>
                  </div>
                ) : isIncoming ? (
                  /* 2. INCOMING INVITATION STATE: Accept or Decline */
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] text-slate-600 font-medium text-center">
                      Accept connection to add to your network and unlock communication channels.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptConnection(contact.id)}
                        className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Connection</span>
                      </button>
                      <button
                        onClick={() => handleDeclineConnection(contact.id)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                ) : isPending ? (
                  /* 3. PENDING SENT REQUEST STATE: Awaiting accept, withdraw, simulate accept */
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                      <span className="text-amber-800 font-semibold flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        Request Sent • Awaiting Acceptance
                      </span>
                      <button
                        onClick={() => handleWithdrawRequest(contact.id)}
                        className="text-[11px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
                      >
                        Withdraw
                      </button>
                    </div>
                    {/* Simulated acceptance test button */}
                    <button
                      onClick={() => handleAcceptConnection(contact.id)}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      title="Accept connection and move contact to My Network"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Connection & Move to My Network</span>
                    </button>
                  </div>
                ) : (
                  /* 4. SOKO NETWORK CONTACT: Connect option ONLY */
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleSendConnectionRequest(contact.id)}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Connect</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Send Connection Request Modal (LinkedIn-style personal note) */}
      {connectModalContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                Connect with {connectModalContact.name}
              </h3>
              <button
                onClick={() => setConnectModalContact(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Card Summary */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <img
                src={connectModalContact.avatarUrl}
                alt={connectModalContact.name}
                className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">{connectModalContact.name}</h4>
                <p className="text-xs text-slate-600 truncate">{connectModalContact.title}</p>
                <p className="text-xs font-semibold text-blue-600 truncate">{connectModalContact.company}</p>
              </div>
            </div>

            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Like LinkedIn, once <strong>{connectModalContact.name}</strong> accepts your request, their direct phone, email, WhatsApp, and phone vCard export will unlock in your network.
              </span>
            </div>

            {/* Optional Personal Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Add a personalized invitation note (Recommended):
              </label>
              <textarea
                rows={3}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Write a brief introduction or context..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConnectModalContact(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendConnectionRequest(connectModalContact.id, customNote)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Connection Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Contact Modal */}
      {sharingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-600" />
                Share Contact Card
              </h3>
              <button
                onClick={() => setSharingContact(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <img
                src={sharingContact.avatarUrl}
                alt={sharingContact.name}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-900">{sharingContact.name}</h4>
                <p className="text-xs text-slate-600">{sharingContact.title}</p>
                <p className="text-xs font-semibold text-blue-600">{sharingContact.company}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Share {sharingContact.name}&apos;s verified procurement business card directly through your preferred channel:
            </p>

            <div className="space-y-2">
              {/* WhatsApp Share */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Check out verified procurement contact ${sharingContact.name} (${sharingContact.title} at ${sharingContact.company}) on SoKo.ae: Phone: ${sharingContact.phone}, Email: ${sharingContact.email}. Profile: ${sharingContact.website || 'https://soko.ae'}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                Share via WhatsApp
              </a>

              {/* Email Share */}
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  `SoKo.ae Contact: ${sharingContact.name} - ${sharingContact.company}`
                )}&body=${encodeURIComponent(
                  `Hi,\n\nI am sharing the verified procurement contact details for ${sharingContact.name} (${sharingContact.title} at ${sharingContact.company}).\n\nPhone: ${sharingContact.phone}\nEmail: ${sharingContact.email}\nLocation: ${sharingContact.location}\nLabels: ${sharingContact.tags.join(', ')}\n\nView on SoKo.ae: ${sharingContact.website || 'https://soko.ae'}`
                )}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                Share via Email
              </a>

              {/* Copy Direct Card Link */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://soko.ae/contact/${sharingContact.id}?name=${encodeURIComponent(sharingContact.name)}`
                  );
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                {copiedLink ? 'Link Copied to Clipboard!' : 'Copy Digital Card Link'}
              </button>

              {/* Download vCard from modal */}
              <button
                onClick={() => {
                  handleDownloadVCard(sharingContact);
                  setCopiedVCard(true);
                  setTimeout(() => setCopiedVCard(false), 2000);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-blue-200"
              >
                <Download className="w-4 h-4" />
                {copiedVCard ? 'Downloaded .vcf file!' : 'Download .vcf (Save to Phone)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Contact to Rolodex Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Add Direct Contact to Connected Network
              </h3>
              <button
                onClick={() => setShowAddContactModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="e.g. Tariq Al-Mansoor"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    placeholder="e.g. Dubai Holding Procurement"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={newContact.title}
                    onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                    placeholder="e.g. Head of MEP Sourcing"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Type</label>
                  <select
                    value={newContact.role}
                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value as UserRole })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="supplier">Supplier</option>
                    <option value="contractor">General Contractor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={newContact.category}
                    onChange={(e) => setNewContact({ ...newContact, category: e.target.value })}
                    placeholder="e.g. Raw Materials"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newContact.location}
                    onChange={(e) => setNewContact({ ...newContact, location: e.target.value })}
                    placeholder="e.g. Dubai, UAE"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="+971 50 123 4567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="contact@company.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tags / Labels (comma separated)</label>
                <input
                  type="text"
                  value={newContact.tags}
                  onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                  placeholder="e.g. VIP Buyer, MEP Procurement, Urgent"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Professional Bio</label>
                <textarea
                  rows={2}
                  value={newContact.bio}
                  onChange={(e) => setNewContact({ ...newContact, bio: e.target.value })}
                  placeholder="Short background on their procurement scope..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Private Meeting / Context Notes</label>
                <textarea
                  rows={2}
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  placeholder="e.g. Met at ADIPEC, pre-approved for ASTM rebar..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Save to My Network
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const ContactsView: React.FC<ContactsViewProps> = (props) => {
  if (props.currentUser.role === 'contractor') {
    return (
      <ContractorNetworkDashboard
        visits={props.visits || []}
        onUpdateVisits={props.onUpdateVisits}
        currentUser={props.currentUser}
        onStartMessageWith={props.onStartMessageWith}
        contacts={props.contacts}
        onUpdateContacts={props.onUpdateContacts}
      />
    );
  }
  return <StandardContactsView {...props} />;
};
