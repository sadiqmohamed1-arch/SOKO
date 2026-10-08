import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { companyById, companyUser, effectiveRole, loadSupplierStore, membershipsOfUser, saveSupplierStore, syncDirectory } from './data/supplierStore';
import { ROLE_META, SupplierStore } from './data/supplierTypes';
import { leaveCompany, setTier } from './data/supplierService';
import { marketWorkspaceFor, planToTier, syncMarketPlans } from './data/supplierMarket';
import { SupplierWorkspaceView } from './components/supplierWorkspace/SupplierWorkspaceView';
import { SupplierOnboarding } from './components/supplierWorkspace/SupplierOnboarding';
import { SupplierTab } from './components/supplierWorkspace/SupplierShared';
import { Toast } from './components/NetworkShared';
import { Navbar } from './components/Navbar';
import { BuyerNavbar } from './components/BuyerNavbar';
import { ComingSoonView } from './components/ComingSoonView';
import { BuyerHomeView } from './components/BuyerHomeView';
import { Package, Settings } from 'lucide-react';
import { FeedView } from './components/FeedView';
import { MessagingView } from './components/MessagingView';
import { SupplierSearchView } from './components/SupplierSearchView';
import { BuyerSuppliersView } from './components/BuyerSuppliersView';
import { BuyerProductsView } from './components/BuyerProductsView';
import { BusinessCardView } from './components/BusinessCardView';
import { MarketHubView } from './components/marketHub/MarketHubView';
import { ContactsView } from './components/ContactsView';
import { SUPPLIER_SHARE_PARAM } from './data/buyerSuppliers';
import { CARD_SHARE_PARAM, NetworkTab, seedNetworkDemo } from './data/myNetwork';
import { BuyerNetworkView } from './components/BuyerNetworkView';
import { OfficeKioskView } from './components/OfficeKioskView';
import { JobsView } from './components/JobsView';
import { AnalyticsView } from './components/AnalyticsView';
import { AcademyView } from './components/AcademyView';
import { TeamManagementView } from './components/TeamManagementView';
import { SuperAdminPortal } from './components/SuperAdminPortal';
import { SokoAiSearchView } from './components/SokoAiSearchView';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  CreatePostModal,
  SubmitProposalModal,
  EasyApplyModal,
  SupplierCardModal,
} from './components/Modals';
import {
  INITIAL_CURRENT_USER,
  INITIAL_POSTS,
  INITIAL_CONVERSATIONS,
  INITIAL_SUPPLIERS,
  INITIAL_OPPORTUNITIES,
  INITIAL_COMMUNITY_CONTACTS,
  INITIAL_OFFICE_KIOSK_VISITS,
  INITIAL_JOBS,
  INITIAL_ANALYTICS,
  INITIAL_LEARNING_ITEMS,
  INITIAL_REWARD_VOUCHERS,
  INITIAL_REWARD_TRANSACTIONS,
  INITIAL_REWARD_PROFILE,
  INITIAL_TEAM_MEMBERS,
  INITIAL_TEAM_ACTIVITY,
} from './mockData';
import {
  UserProfile,
  UserRole,
  FeedPost,
  Conversation,
  SupplierItem,
  SupplierReview,
  OpportunityItem,
  CommunityContact,
  OfficeKioskVisit,
  JobListingItem,
  AnalyticsMetric,
  LearningItem,
  RewardVoucherItem,
  RewardTransaction,
  UserRewardProfile,
  CompanyTeamMember,
  TeamActivityLogItem,
  Workspace,
} from './types';

function MainApp() {
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const [viewMode, setViewMode] = useState<'app' | 'landing'>('app');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Navigation
  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has(CARD_SHARE_PARAM)) return 'contacts';
    return params.has(SUPPLIER_SHARE_PARAM) ? 'suppliers' : 'feed';
  });
  const [networkEntry, setNetworkEntry] = useState<{ tab: NetworkTab; nonce: number }>({ tab: 'contacts', nonce: 0 });
  const openNetwork = (tab: NetworkTab) => {
    setNetworkEntry((prev) => ({ tab, nonce: prev.nonce + 1 }));
    setActiveTab('contacts');
  };
  const [sokoAiQuery, setSokoAiQuery] = useState({ text: '', nonce: 0 });
  const [cardMode, setCardMode] = useState<'preview' | 'edit'>('preview');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('personal');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Persisted or In-Memory State
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('procurelink_user');
    return saved ? JSON.parse(saved) : INITIAL_CURRENT_USER;
  });

  const [supplierStore, setSupplierStoreState] = useState<SupplierStore>(loadSupplierStore);
  const updateSupplierStore = useCallback((next: SupplierStore) => {
    syncDirectory(next);
    syncMarketPlans(next.companies);
    saveSupplierStore(next);
    setSupplierStoreState(next);
  }, []);
  useEffect(() => {
    syncMarketPlans(supplierStore.companies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [marketNonce, setMarketNonce] = useState(0);
  const [appToast, setAppToast] = useState<string | null>(null);
  const notifyApp = useCallback((m: string) => {
    setAppToast(m);
    window.setTimeout(() => setAppToast((t) => (t === m ? null : t)), 3200);
  }, []);
  const sessionUser = useMemo(
    () => companyUser({ id: currentUser.id, name: currentUser.name, email: currentUser.email, title: currentUser.title }),
    [currentUser.id, currentUser.name, currentUser.email, currentUser.title],
  );
  const companyMemberships = currentUser.role === 'buyer' ? membershipsOfUser(supplierStore, sessionUser.id) : [];
  const requestedCompanyId = activeWorkspaceId.startsWith('company:') ? activeWorkspaceId.slice(8) : null;
  const activeMembership = companyMemberships.find((m) => m.companyId === requestedCompanyId);
  const activeCompany = activeMembership ? companyById(supplierStore, activeMembership.companyId) : undefined;
  const activeCompanyId = activeCompany?.id ?? null;
  const activeMarketWorkspace = useMemo(
    () => (activeCompany && activeMembership ? marketWorkspaceFor(activeCompany, effectiveRole(supplierStore, activeMembership), sessionUser) : undefined),
    [activeCompany, activeMembership, supplierStore, sessionUser],
  );

  const switchWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
    setActiveTab(id === 'personal' ? 'feed' : 'sw-dashboard');
  };

  useEffect(() => {
    if (requestedCompanyId && !activeCompanyId) {
      setActiveWorkspaceId('personal');
      setActiveTab('feed');
    } else if (!activeCompanyId && activeTab.startsWith('sw-')) {
      setActiveTab('feed');
    } else if (activeCompanyId && activeTab === 'feed') {
      setActiveTab('sw-dashboard');
    }
  }, [requestedCompanyId, activeCompanyId, activeTab]);

  const handleLeaveCompany = () => {
    if (!activeCompanyId) return;
    const name = activeCompany?.profile.tradingName;
    const r = leaveCompany(supplierStore, sessionUser, activeCompanyId);
    if (!r.ok) return notifyApp(r.error);
    updateSupplierStore(r.store);
    switchWorkspace('personal');
    notifyApp(`You left ${name}. Your personal account is unchanged.`);
  };

  const handleCompanyPlanChange = (plan: Parameters<typeof planToTier>[0]) => {
    if (!activeCompany || !activeMembership) return;
    const tier = planToTier(plan);
    if (tier === activeCompany.tier) return;
    const r = setTier({ store: supplierStore, user: sessionUser, companyId: activeCompany.id, role: effectiveRole(supplierStore, activeMembership) }, tier);
    if (r.ok) updateSupplierStore(r.store);
    else {
      syncMarketPlans(supplierStore.companies);
      setMarketNonce((n) => n + 1);
      notifyApp(r.error);
    }
  };

  // Sync authUser to currentUser when authenticated
  useEffect(() => {
    if (authUser) {
      setCurrentUser((prev) => ({
        ...prev,
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        company: authUser.company,
        title: authUser.title,
        phone: authUser.phone,
        avatarUrl: authUser.avatarUrl || prev.avatarUrl,
        location: authUser.location || prev.location,
      }));
      if (authUser.role === 'admin') {
        setActiveTab('admin');
      }
    }
  }, [authUser]);

  const [posts, setPosts] = useState<FeedPost[]>(() => {
    const saved = localStorage.getItem('soko_feed_posts_v4_infographics');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id === 'post_1') {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_POSTS;
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('procurelink_conversations');
    return saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
  });

  const [suppliers, setSuppliers] = useState<SupplierItem[]>(() => {
    const saved = localStorage.getItem('procurelink_suppliers_v2');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(() => {
    const saved = localStorage.getItem('soko_opportunities_v5_marketplace');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 6 && parsed.some((p: OpportunityItem) => p.opportunityType === 'market_deal')) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_OPPORTUNITIES;
  });

  const [contacts, setContacts] = useState<CommunityContact[]>(() => {
    const saved = localStorage.getItem('soko_community_contacts_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50 && parsed.some((c: any) => c.connectionStatus)) {
          return seedNetworkDemo(parsed);
        }
      } catch {}
    }
    return seedNetworkDemo(INITIAL_COMMUNITY_CONTACTS);
  });

  const [officeVisits, setOfficeVisits] = useState<OfficeKioskVisit[]>(() => {
    const saved = localStorage.getItem('soko_office_kiosk_visits');
    return saved ? JSON.parse(saved) : INITIAL_OFFICE_KIOSK_VISITS;
  });

  const [jobs, setJobs] = useState<JobListingItem[]>(() => {
    const saved = localStorage.getItem('soko_gc_jobs_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].gcTier) {
          return parsed;
        }
      } catch {}
    }
    return INITIAL_JOBS;
  });

  useEffect(() => {
    localStorage.setItem('soko_gc_jobs_v3', JSON.stringify(jobs));
  }, [jobs]);

  const [learningItems, setLearningItems] = useState<LearningItem[]>(() => {
    const saved = localStorage.getItem('soko_learning_items_v1');
    return saved ? JSON.parse(saved) : INITIAL_LEARNING_ITEMS;
  });

  const [rewardProfile, setRewardProfile] = useState<UserRewardProfile>(() => {
    const saved = localStorage.getItem('soko_reward_profile_v1');
    return saved ? JSON.parse(saved) : INITIAL_REWARD_PROFILE;
  });

  const [rewardVouchers, setRewardVouchers] = useState<RewardVoucherItem[]>(() => {
    const saved = localStorage.getItem('soko_reward_vouchers_v1');
    return saved ? JSON.parse(saved) : INITIAL_REWARD_VOUCHERS;
  });

  const [rewardTransactions, setRewardTransactions] = useState<RewardTransaction[]>(() => {
    const saved = localStorage.getItem('soko_reward_transactions_v1');
    return saved ? JSON.parse(saved) : INITIAL_REWARD_TRANSACTIONS;
  });

  const [teamMembers, setTeamMembers] = useState<CompanyTeamMember[]>(() => {
    const saved = localStorage.getItem('soko_company_team_members_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 7) return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_TEAM_MEMBERS;
  });

  const [teamActivityLogs, setTeamActivityLogs] = useState<TeamActivityLogItem[]>(() => {
    const saved = localStorage.getItem('soko_company_team_activity_v1');
    return saved ? JSON.parse(saved) : INITIAL_TEAM_ACTIVITY;
  });

  const [analytics, setAnalytics] = useState<AnalyticsMetric>(INITIAL_ANALYTICS);

  const [activeConversationId, setActiveConversationId] = useState<string>(
    INITIAL_CONVERSATIONS[0].id
  );

  // Modals state
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createPostType, setCreatePostType] = useState<'general' | 'rfq' | 'surplus' | 'tender'>('general');
  const [selectedOpportunityForBid, setSelectedOpportunityForBid] = useState<OpportunityItem | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<JobListingItem | null>(null);
  const [selectedSupplierForModal, setSelectedSupplierForModal] = useState<SupplierItem | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('procurelink_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('soko_feed_posts_v4_infographics', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('soko_community_contacts_v5', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('soko_office_kiosk_visits', JSON.stringify(officeVisits));
  }, [officeVisits]);

  useEffect(() => {
    localStorage.setItem('procurelink_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('soko_opportunities_v5_marketplace', JSON.stringify(opportunities));
  }, [opportunities]);

  useEffect(() => {
    localStorage.setItem('procurelink_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('procurelink_suppliers_v2', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('soko_learning_items_v1', JSON.stringify(learningItems));
  }, [learningItems]);

  useEffect(() => {
    localStorage.setItem('soko_reward_profile_v1', JSON.stringify(rewardProfile));
  }, [rewardProfile]);

  useEffect(() => {
    localStorage.setItem('soko_reward_vouchers_v1', JSON.stringify(rewardVouchers));
  }, [rewardVouchers]);

  useEffect(() => {
    localStorage.setItem('soko_reward_transactions_v1', JSON.stringify(rewardTransactions));
  }, [rewardTransactions]);

  useEffect(() => {
    localStorage.setItem('soko_company_team_members_v2', JSON.stringify(teamMembers));
  }, [teamMembers]);

  useEffect(() => {
    localStorage.setItem('soko_company_team_activity_v1', JSON.stringify(teamActivityLogs));
  }, [teamActivityLogs]);

  // Guard against restricted tabs for Buyer role (VMS, Opportunities, Super Admin)
  useEffect(() => {
    if (
      currentUser.role === 'buyer' &&
      (activeTab === 'kiosk' || activeTab === 'admin')
    ) {
      setActiveTab('feed');
    }
  }, [currentUser.role, activeTab]);

  // Handle Persona / Role Switcher
  const handleRoleChange = (role: UserRole) => {
    if (role === 'buyer') {
      setCurrentUser({
        ...INITIAL_CURRENT_USER,
        role: 'buyer',
        name: 'Mohamed Sadiq',
        title: 'Director of Strategic Sourcing & EPC Contracts',
        company: 'GEC Dubai',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        paymentTerms: 'Net 45 upon delivery inspection',
      });
      if (activeTab === 'kiosk' || activeTab === 'admin') {
        setActiveTab('feed');
      }
    } else if (role === 'supplier') {
      setCurrentUser({
        ...INITIAL_CURRENT_USER,
        role: 'supplier',
        name: 'Elena Rostova',
        title: 'VP of Commercial Sales & Operations',
        company: 'Apex Industrial Castings & Alloys',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        paymentTerms: 'Net 30, BABA Certified Melts',
        cardTheme: 'industrial-dark',
        dunsNumber: '11-892-0412',
        capabilities: ['Structural Steel Casting', 'Ultrasonic NDT', 'Hot-Rolled Coils', 'Custom CNC Machining'],
      });
    } else if (role === 'contractor') {
      setCurrentUser({
        ...INITIAL_CURRENT_USER,
        role: 'contractor',
        name: 'Sarah Jenkins',
        title: 'Executive Project Director & General Contractor',
        company: 'Apex Industrial Mechanical GC',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        paymentTerms: 'Progressive milestone payments, Net 30',
        cardTheme: 'emerald-green',
        dunsNumber: '44-019-8821',
        capabilities: ['Turnkey MEP Installation', 'Cleanroom HVAC Engineering', 'Commissioning & FAT'],
      });
    } else if (role === 'admin') {
      setCurrentUser({
        ...INITIAL_CURRENT_USER,
        role: 'admin',
        name: 'Zackary Al-Hassan',
        title: 'Chief Governance & Platform Super Admin',
        company: 'soko.ae Central Operations & Governance',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        location: 'DIFC Gate Precinct, Dubai, UAE',
        email: 'admin@soko.ae',
        phone: '+971 4 200 9999',
        verified: true,
        isPremium: true,
        subscriptionPlan: 'Super Admin Core Governance',
        paymentTerms: 'Platform Escrow Governance',
        cardTheme: 'industrial-dark',
        dunsNumber: 'GOV-SOKO-001',
        capabilities: ['Platform Oversight', 'Entity Verification', 'Incident Moderation', 'Escrow Release Authorization'],
      });
      setActiveTab('admin');
    }
  };

  // Like / Unlike Post
  const handleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newLiked = !p.userLiked;
        return {
          ...p,
          userLiked: newLiked,
          likes: newLiked ? p.likes + 1 : p.likes - 1,
        };
      })
    );
  };

  // Add Comment to Post
  const handleAddComment = (postId: string, text: string) => {
    const newComment = {
      id: `c_${Date.now()}`,
      author: currentUser.name,
      company: currentUser.company,
      role: currentUser.role,
      avatar: currentUser.avatarUrl,
      text,
      time: 'Just now',
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: [...p.comments, newComment],
        };
      })
    );
  };

  // Create Post
  const handleCreatePost = (postData: Partial<FeedPost>) => {
    const newPost: FeedPost = {
      id: `post_${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorCompany: currentUser.company,
      authorAvatar: currentUser.avatarUrl,
      verified: currentUser.verified,
      timestamp: 'Just now',
      type: postData.type || 'general',
      title: postData.title,
      content: postData.content || '',
      categoryTag: postData.categoryTag || 'Raw Materials & Metals',
      metrics: postData.metrics,
      likes: 0,
      userLiked: false,
      comments: [],
      shares: 0,
    };

    setPosts([newPost, ...posts]);
  };

  // Send Message in Active Conversation + Automated Vendor Response Simulation
  const handleSendMessage = (conversationId: string, text: string) => {
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text,
      timestamp: 'Just now',
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          lastMessage: text,
          lastMessageTime: 'Just now',
          messages: [...c.messages, newMsg],
        };
      })
    );

    // Simulate smart procurement reply after 1.5 seconds
    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          const replyText =
            text.toLowerCase().includes('lead time')
              ? `Confirmed: Our current production slot guarantees dispatch in 8-10 business days with full expedited rail tracking.`
              : text.toLowerCase().includes('discount') || text.toLowerCase().includes('price')
              ? `We have reviewed the volume tiers with our commercial controller. For lots exceeding 500 MT, we can offer an additional 3.5% rebate on FOB terms.`
              : `Thank you Marcus. We have recorded your note and our QA engineer will transmit the certified test documentation to your procurement desk shortly.`;

          const vendorReply = {
            id: `msg_reply_${Date.now()}`,
            senderId: c.participant.id,
            senderName: c.participant.name,
            senderRole: c.participant.role,
            text: replyText,
            timestamp: 'Just now',
          };

          return {
            ...c,
            lastMessage: replyText,
            lastMessageTime: 'Just now',
            messages: [...c.messages, vendorReply],
          };
        })
      );
    }, 1500);
  };

  // Accept Quote in Conversation
  const handleAcceptQuote = (conversationId: string, messageId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        const updatedMessages = c.messages.map((m) => {
          if (m.id !== messageId || !m.quoteDetails) return m;
          return {
            ...m,
            quoteDetails: {
              ...m.quoteDetails,
              status: 'accepted' as const,
            },
          };
        });

        // Add system confirmation message
        const confirmationMsg = {
          id: `msg_sys_${Date.now()}`,
          senderId: 'sys',
          senderName: 'SOKO Contract Escrow',
          senderRole: 'buyer' as UserRole,
          text: ' Binding Purchase Order PO-2026-884 generated. Net 30 terms locked, BABA Material Test Certificate requirement filed in compliance audit log.',
          timestamp: 'Just now',
        };

        return {
          ...c,
          lastMessage: 'Quotation Accepted & Binding PO Drafted',
          lastMessageTime: 'Just now',
          messages: [...updatedMessages, confirmationMsg],
        };
      })
    );

    // Update Spend Analytics
    setAnalytics((prev) => ({
      ...prev,
      summary: {
        ...prev.summary,
        totalSpend: prev.summary.totalSpend + 259500,
        costSavings: prev.summary.costSavings + 24000,
      },
    }));
  };

  // Start message with a supplier or buyer
  const handleStartMessageWith = (userId: string, name: string) => {
    const existing = conversations.find(
      (c) => c.participant.id === userId || c.participant.name === name
    );
    if (existing) {
      setActiveConversationId(existing.id);
    } else {
      // Find supplier details or make new thread
      const sup = suppliers.find((s) => s.id === userId || s.name === name);
      const newConv: Conversation = {
        id: `conv_${Date.now()}`,
        participant: {
          id: userId || `part_${Date.now()}`,
          name: name,
          company: sup ? sup.company : 'Commercial Partner',
          role: sup ? sup.role : 'supplier',
          avatar: sup ? sup.avatar : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          verified: true,
          online: true,
          responseTime: '< 15 mins',
          phone: sup ? sup.phone : '+1 (555) 019-2831',
          email: sup ? sup.email : 'rfq@partner.com',
        },
        lastMessage: 'Inquiry initialized via SOKO directory.',
        lastMessageTime: 'Just now',
        unreadCount: 0,
        rfqSubject: 'Commercial Inquiry & Material Specification',
        messages: [
          {
            id: `init_${Date.now()}`,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderRole: currentUser.role,
            text: `Hello ${name}, I am reaching out from ${activeCompany?.profile.tradingName ?? currentUser.company} regarding current procurement opportunities and capacity availability.`,
            timestamp: 'Just now',
          },
        ],
      };
      setConversations([newConv, ...conversations]);
      setActiveConversationId(newConv.id);
    }
    setActiveTab('messages');
  };

  // Submit Bid for Opportunity
  const handleSubmitProposal = (oppId: string, proposalData: any) => {
    setOpportunities((prev) =>
      prev.map((o) => {
        if (o.id !== oppId) return o;
        return {
          ...o,
          proposalsCount: o.proposalsCount + 1,
          myProposalSubmitted: true,
        };
      })
    );

    // Award +200 Reward Points for active tender participation
    setRewardProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + 200,
    }));

    const opp = opportunities.find((o) => o.id === oppId);
    const newTx: RewardTransaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      type: 'rfq_submitted',
      title: `Submitted Tender Bid: ${opp ? opp.title.slice(0, 35) : 'Opportunity'} (+200 Pts)`,
      points: 200,
      timestamp: 'Just now',
      referenceId: oppId,
    };
    setRewardTransactions((prev) => [newTx, ...prev]);
  };

  // Easy Apply for Job
  const handleEasyApply = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          applicantsCount: j.applicantsCount + 1,
          applied: true,
        };
      })
    );

    // Award +50 Reward Points for career development
    setRewardProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + 50,
    }));

    const job = jobs.find((j) => j.id === jobId);
    const newTx: RewardTransaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      type: 'study_complete',
      title: `Application Submitted: ${job ? job.title.slice(0, 35) : 'Role'} (+50 Pts)`,
      points: 50,
      timestamp: 'Just now',
      referenceId: jobId,
    };
    setRewardTransactions((prev) => [newTx, ...prev]);
  };

  // Add Verified Buyer Review for Supplier
  const handleAddSupplierReview = (supplierId: string, review: SupplierReview) => {
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id !== supplierId) return s;
        const existingReviews = s.reviews || [];
        const updatedReviews = [review, ...existingReviews];
        const newReviewCount = s.reviewCount + 1;
        const totalRatingSum = existingReviews.reduce((sum, r) => sum + r.rating, 0) + review.rating;
        const newAverageRating = Number((totalRatingSum / (existingReviews.length + 1)).toFixed(1));

        return {
          ...s,
          rating: newAverageRating,
          reviewCount: newReviewCount,
          reviews: updatedReviews,
        };
      })
    );

    setSelectedSupplierForModal((prev) => {
      if (!prev || prev.id !== supplierId) return prev;
      const existingReviews = prev.reviews || [];
      const updatedReviews = [review, ...existingReviews];
      const newReviewCount = prev.reviewCount + 1;
      const totalRatingSum = existingReviews.reduce((sum, r) => sum + r.rating, 0) + review.rating;
      const newAverageRating = Number((totalRatingSum / (existingReviews.length + 1)).toFixed(1));

      return {
        ...prev,
        rating: newAverageRating,
        reviewCount: newReviewCount,
        reviews: updatedReviews,
      };
    });
  };

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  // Corporate workspaces get appended here once the Buyer joins a Contractor/Developer company.
  const buyerWorkspaces: Workspace[] = [
    { id: 'personal', kind: 'personal', name: currentUser.name, roleLabel: 'Buyer' },
    ...companyMemberships.flatMap((m): Workspace[] => {
      const c = companyById(supplierStore, m.companyId);
      if (!c) return [];
      return [{ id: `company:${c.id}`, kind: 'corporate', name: c.profile.tradingName, roleLabel: `Supplier · ${ROLE_META[m.role].label}${c.tier === 'premium' ? ' · Premium' : ''}` }];
    }),
  ];

  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onEnterApp={() => setViewMode('app')}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalMode}
          onSuccess={() => {
            setViewMode('app');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      {currentUser.role === 'buyer' ? (
        <BuyerNavbar
          activeTab={activeTab}
          setActiveTab={(tab) => (tab === 'contacts' ? openNetwork('contacts') : setActiveTab(tab))}
          currentUser={currentUser}
          conversations={conversations}
          rewardPoints={rewardProfile.totalPoints}
          workspaces={buyerWorkspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSwitchWorkspace={switchWorkspace}
          onOpenSupplierOnboarding={() => setActiveTab('supplier-onboarding')}
          onOpenProfile={() => {
            setCardMode('edit');
            setActiveTab('card');
          }}
          onOpenBusinessCard={() => openNetwork('cards')}
          onSwitchDemoRole={handleRoleChange}
          isAuthenticated={isAuthenticated}
          onLogout={logout}
          onOpenAuthModal={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
        />
      ) : (
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUserRole={handleRoleChange}
        unreadCount={unreadMessagesCount}
        rewardPoints={rewardProfile.totalPoints}
        streakDays={rewardProfile.currentStreakDays}
        onOpenLanding={() => setViewMode('landing')}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
        isAuthenticated={isAuthenticated}
        onLogout={logout}
        onOpenCreateModal={() => {
          setCreatePostType('rfq');
          setCreatePostOpen(true);
        }}
        searchQuery={globalSearch}
        setSearchQuery={setGlobalSearch}
      />
      )}

      {/* Main App View Router */}
      <main className="flex-1 pb-12">
        {activeTab === 'feed' && currentUser.role === 'buyer' && (
          <BuyerHomeView
            currentUser={currentUser}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenBusinessCard={() => openNetwork('cards')}
            onStartMessageWith={handleStartMessageWith}
          />
        )}

        {activeTab === 'feed' && currentUser.role !== 'buyer' && (
          <FeedView
            posts={posts}
            currentUser={currentUser}
            onLikePost={handleLikePost}
            onAddComment={handleAddComment}
            onOpenCreatePost={(type) => {
              setCreatePostType(type || 'general');
              setCreatePostOpen(true);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onStartMessageWith={handleStartMessageWith}
          />
        )}

        {activeTab === 'soko-ai' && (
          <SokoAiSearchView
            key={sokoAiQuery.nonce}
            initialQuery={sokoAiQuery.text}
            currentUser={currentUser}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onStartMessageWith={handleStartMessageWith}
          />
        )}

        {activeTab === 'academy' && (
          <AcademyView
            learningItems={learningItems}
            onUpdateLearningItems={setLearningItems}
            rewardProfile={rewardProfile}
            onUpdateRewardProfile={setRewardProfile}
            rewardVouchers={rewardVouchers}
            onUpdateRewardVouchers={setRewardVouchers}
            rewardTransactions={rewardTransactions}
            onUpdateRewardTransactions={setRewardTransactions}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'suppliers' && currentUser.role === 'buyer' && (
          <BuyerSuppliersView
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onStartMessageWith={handleStartMessageWith}
            networkContacts={contacts}
            onUpdateNetworkContacts={setContacts}
          />
        )}

        {activeTab === 'suppliers' && currentUser.role !== 'buyer' && (
          <SupplierSearchView
            suppliers={suppliers}
            currentUser={currentUser}
            onStartMessageWith={handleStartMessageWith}
            onOpenRFQForSupplier={(sup) => {
              handleStartMessageWith(sup.id, sup.name);
            }}
            onViewSupplierCard={(sup) => setSelectedSupplierForModal(sup)}
          />
        )}

        {activeTab.startsWith('sw-') && activeCompanyId && (
          <SupplierWorkspaceView
            key={activeCompanyId}
            tab={activeTab as SupplierTab}
            store={supplierStore}
            onStoreChange={updateSupplierStore}
            user={sessionUser}
            companyId={activeCompanyId}
            onNavigate={setActiveTab}
            onLeaveCompany={handleLeaveCompany}
            onStartMessageWith={handleStartMessageWith}
            networkContacts={contacts}
            onUpdateNetworkContacts={setContacts}
          />
        )}

        {activeTab === 'supplier-onboarding' && currentUser.role === 'buyer' && (
          <div className="px-4 sm:px-6 py-8">
            <SupplierOnboarding
              store={supplierStore}
              user={sessionUser}
              onStoreChange={updateSupplierStore}
              onOpenWorkspace={(id) => switchWorkspace(`company:${id}`)}
              onCancel={() => setActiveTab(activeCompanyId ? 'sw-dashboard' : 'feed')}
              notify={notifyApp}
            />
          </div>
        )}

        {activeTab === 'opportunities' && (
          <MarketHubView
            key={`${activeMarketWorkspace?.id ?? 'personal'}-${marketNonce}`}
            companyWorkspace={activeMarketWorkspace}
            onPlanChange={activeMarketWorkspace ? handleCompanyPlanChange : undefined}
            currentUser={currentUser}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onAskSokoAi={(q) => {
              setSokoAiQuery({ text: q, nonce: Date.now() });
              setActiveTab('soko-ai');
            }}
            onSwitchRole={handleRoleChange}
          />
        )}

        {activeTab === 'contacts' && currentUser.role === 'buyer' && (
          <BuyerNetworkView
            key={networkEntry.nonce}
            initialTab={networkEntry.tab}
            contacts={contacts}
            onUpdateContacts={setContacts}
            currentUser={currentUser}
            onUpdateUser={(patch) => setCurrentUser((prev) => ({ ...prev, ...patch }))}
            onStartMessageWith={handleStartMessageWith}
          />
        )}

        {activeTab === 'contacts' && currentUser.role !== 'buyer' && (
          <ContactsView
            contacts={contacts}
            onUpdateContacts={setContacts}
            currentUser={currentUser}
            onStartMessageWith={handleStartMessageWith}
            visits={officeVisits}
            onUpdateVisits={setOfficeVisits}
          />
        )}

        {activeTab === 'kiosk' && currentUser.role !== 'buyer' && (
          <OfficeKioskView
            visits={officeVisits}
            onUpdateVisits={setOfficeVisits}
            currentUser={currentUser}
            onStartMessageWith={handleStartMessageWith}
            onAddContactToRolodex={(newC) => {
              if (!newC.name) return;
              const contactObj: CommunityContact = {
                id: `cont_${Date.now()}`,
                name: newC.name || 'Vendor Contact',
                title: newC.title || 'Procurement Representative',
                company: newC.company || 'Partner Enterprise',
                role: newC.role || 'supplier',
                category: newC.category || 'Raw Materials',
                avatarUrl: newC.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                location: newC.location || 'Dubai, UAE',
                phone: newC.phone || '+971 4 000 0000',
                whatsappNumber: newC.whatsappNumber || '',
                email: newC.email || 'contact@company.ae',
                verified: true,
                bio: newC.bio || 'Direct maintained procurement contact from office kiosk meeting.',
                isMaintained: true,
                tags: ['Office Met', 'VMS'],
                notes: newC.notes || 'Met in office via Reception Kiosk.',
                accessStatus: 'direct',
              };
              setContacts((prev) => [contactObj, ...prev]);
            }}
          />
        )}

        {activeTab === 'jobs' && (
          <JobsView
            jobs={jobs}
            currentUser={currentUser}
            onOpenEasyApply={(job) => setSelectedJobForApply(job)}
            onOpenCreateJob={() => {
              setCreatePostType('tender');
              setCreatePostOpen(true);
            }}
            onUpdateJobs={setJobs}
            onStartMessageWith={handleStartMessageWith}
          />
        )}

        {activeTab === 'messages' && (
          <MessagingView
            conversations={conversations}
            activeConversationId={activeConversationId}
            setActiveConversationId={setActiveConversationId}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onAcceptQuote={handleAcceptQuote}
            onViewCard={() => setActiveTab('card')}
          />
        )}

        {activeTab === 'card' && (
          <BusinessCardView
            key={cardMode}
            initialMode={cardMode}
            currentUser={currentUser}
            onUpdateUserProfile={(updated) =>
              setCurrentUser((prev) => ({ ...prev, ...updated }))
            }
          />
        )}

        {activeTab === 'team' && (
          <TeamManagementView
            currentUser={currentUser}
            teamMembers={teamMembers}
            onUpdateTeamMembers={setTeamMembers}
            activityLogs={teamActivityLogs}
            onAddActivityLog={(newLog) => setTeamActivityLogs((prev) => [newLog, ...prev])}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'products' && currentUser.role === 'buyer' && (
          <BuyerProductsView
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onStartMessageWith={handleStartMessageWith}
            networkContacts={contacts}
            onUpdateNetworkContacts={setContacts}
          />
        )}

        {activeTab === 'products' && currentUser.role !== 'buyer' && (
          <ComingSoonView
            icon={Package}
            title="Products"
            description="Browse construction materials, equipment and products from verified suppliers in one place."
          />
        )}

        {activeTab === 'settings' && (
          <ComingSoonView
            icon={Settings}
            title="Account Settings"
            description="Manage your login, password, notification preferences and privacy for your SOKO account."
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView analytics={analytics} currentUser={currentUser} />
        )}

        {activeTab === 'admin' && currentUser.role !== 'buyer' && (
          <SuperAdminPortal
            currentUser={currentUser}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      <Toast message={appToast} />

      {/* Modals */}
      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        currentUser={currentUser}
        initialType={createPostType}
        onSubmitPost={handleCreatePost}
      />

      <SubmitProposalModal
        isOpen={!!selectedOpportunityForBid}
        onClose={() => setSelectedOpportunityForBid(null)}
        opportunity={selectedOpportunityForBid}
        currentUser={currentUser}
        onSubmit={handleSubmitProposal}
      />

      <EasyApplyModal
        isOpen={!!selectedJobForApply}
        onClose={() => setSelectedJobForApply(null)}
        job={selectedJobForApply}
        currentUser={currentUser}
        onSubmitApplication={handleEasyApply}
      />

      <SupplierCardModal
        isOpen={!!selectedSupplierForModal}
        onClose={() => setSelectedSupplierForModal(null)}
        supplier={selectedSupplierForModal}
        currentUser={currentUser}
        onStartMessage={handleStartMessageWith}
        onAddReview={handleAddSupplierReview}
      />

      {/* Global Auth Modal for Login and Registration */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={() => {
          setViewMode('app');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
