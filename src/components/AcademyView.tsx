import React, { useState } from 'react';
import {
  GraduationCap,
  Radio,
  Video,
  BookOpen,
  Award,
  Flame,
  Plus,
  Search,
  Clock,
  Play,
  Calendar,
  Download,
  CheckCircle,
  CheckCircle2,
  Copy,
  Ticket,
  ChevronRight,
  TrendingUp,
  FileText,
  User,
  ExternalLink,
  Gift,
  Sparkles,
  Trophy,
  Users,
  Building2,
  ShieldCheck,
  X,
  FileCheck,
} from 'lucide-react';
import {
  LearningItem,
  LearningContentType,
  LearningCategory,
  RewardVoucherItem,
  RewardTransaction,
  UserRewardProfile,
  UserProfile,
  CompanyTeamMember,
} from '../types';
import { INITIAL_TEAM_MEMBERS } from '../mockData';
import { AddLearningContentModal } from './AddLearningContentModal';
import { PodcastPlayerModal } from './PodcastPlayerModal';
import { WebinarDetailModal } from './WebinarDetailModal';
import { StudyMaterialDetailModal } from './StudyMaterialDetailModal';
import { VoucherRedeemModal } from './VoucherRedeemModal';

interface AcademyViewProps {
  learningItems: LearningItem[];
  onUpdateLearningItems: React.Dispatch<React.SetStateAction<LearningItem[]>>;
  rewardProfile: UserRewardProfile;
  onUpdateRewardProfile: React.Dispatch<React.SetStateAction<UserRewardProfile>>;
  rewardVouchers: RewardVoucherItem[];
  onUpdateRewardVouchers: React.Dispatch<React.SetStateAction<RewardVoucherItem[]>>;
  rewardTransactions: RewardTransaction[];
  onUpdateRewardTransactions: React.Dispatch<React.SetStateAction<RewardTransaction[]>>;
  currentUser: UserProfile;
}

export const AcademyView: React.FC<AcademyViewProps> = ({
  learningItems,
  onUpdateLearningItems,
  rewardProfile,
  onUpdateRewardProfile,
  rewardVouchers,
  onUpdateRewardVouchers,
  rewardTransactions,
  onUpdateRewardTransactions,
  currentUser,
}) => {
  const isContractor = currentUser.role === 'contractor';

  // Navigation & Filter states
  const [activeSection, setActiveSection] = useState<'all' | 'podcasts' | 'webinars' | 'study_materials' | 'rewards' | 'leaderboard'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [webinarFilter, setWebinarFilter] = useState<'all' | 'upcoming' | 'recorded'>('all');
  const [voucherFilter, setVoucherFilter] = useState<'all' | 'course_voucher' | 'material_voucher' | 'wallet'>('all');

  // Contractor Team Leaderboard & Buyer Course Action Recording State
  const [leaderboardMembers, setLeaderboardMembers] = useState<CompanyTeamMember[]>(() => {
    const saved = localStorage.getItem('soko_company_team_members_v1');
    return saved ? JSON.parse(saved) : INITIAL_TEAM_MEMBERS;
  });

  const [recordedBuyerActions, setRecordedBuyerActions] = useState<
    Array<{
      id: string;
      memberId: string;
      memberName: string;
      memberRole: string;
      memberAvatar: string;
      courseId: string;
      courseTitle: string;
      courseType: string;
      completedAt: string;
      score: string;
      pointsEarned: number;
      verificationNote: string;
    }>
  >([
    {
      id: 'cba_1',
      memberId: 'tm_2',
      memberName: 'Tarek Mansour',
      memberRole: 'Director of Sourcing & Pre-qualification',
      memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      courseId: 'item_sm_1',
      courseTitle: 'ASTM A615 vs BS 4449 Rebar Specifications Comparison Guide',
      courseType: 'study_material',
      completedAt: 'Today at 09:30 AM',
      score: '96%',
      pointsEarned: 100,
      verificationNote: 'Passed module assessment on yield strength tolerances & material test certification.',
    },
    {
      id: 'cba_2',
      memberId: 'tm_3',
      memberName: 'Omar Qasim',
      memberRole: 'Lead Civil & Earthworks Estimator',
      memberAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      courseId: 'item_sm_2',
      courseTitle: 'FIDIC Red Book Subcontract Administration & IPC Claims',
      courseType: 'study_material',
      completedAt: 'Yesterday at 04:15 PM',
      score: '94%',
      pointsEarned: 150,
      verificationNote: 'Completed Clause 14 milestone payment certification case study.',
    },
    {
      id: 'cba_3',
      memberId: 'tm_4',
      memberName: 'Laila Al-Husseini',
      memberRole: 'Senior MEP Subcontracts Specialist',
      memberAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      courseId: 'item_web_1',
      courseTitle: 'Procurement Masterclass: Cleanroom HVAC & Chiller Sourcing',
      courseType: 'webinar',
      completedAt: '2 days ago',
      score: '98%',
      pointsEarned: 150,
      verificationNote: 'Attended full session and completed FAT checklist protocol.',
    },
    {
      id: 'cba_4',
      memberId: 'tm_1',
      memberName: 'Sarah Jenkins',
      memberRole: 'Executive Project Director & General Contractor',
      memberAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      courseId: 'item_pod_1',
      courseTitle: 'The SOKO Supply Chain Podcast: Supply Chain Resilience in Mega Projects',
      courseType: 'podcast',
      completedAt: '3 days ago',
      score: '100%',
      pointsEarned: 75,
      verificationNote: 'Verified listening completion and executive summary submission.',
    },
    {
      id: 'cba_5',
      memberId: 'tm_5',
      memberName: 'Karim Farouq',
      memberRole: 'Senior QA/QC Materials Engineer',
      memberAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      courseId: 'item_sm_3',
      courseTitle: 'UAE In-Country Value (ICV) Formula & Supply Chain Verification Toolkit',
      courseType: 'study_material',
      completedAt: '4 days ago',
      score: '95%',
      pointsEarned: 100,
      verificationNote: 'Verified Tier-1 local supplier ICV auditing and MoIAT certification rules.',
    },
  ]);

  const [showRecordActionModal, setShowRecordActionModal] = useState(false);
  const [recordActionForm, setRecordActionForm] = useState({
    memberId: 'tm_2',
    courseId: 'item_sm_1',
    score: '95%',
    verificationNote: 'Completed syllabus modules and passed final technical assessment.',
  });

  // Modals state
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [selectedPodcast, setSelectedPodcast] = useState<LearningItem | null>(null);
  const [selectedWebinar, setSelectedWebinar] = useState<LearningItem | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<LearningItem | null>(null);
  const [selectedVoucherForRedeem, setSelectedVoucherForRedeem] = useState<RewardVoucherItem | null>(null);

  // Toast / notification state
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationMessage(msg);
    setTimeout(() => setNotificationMessage(null), 3500);
  };

  // Claim Daily Login Reward handler
  const handleClaimDailyReward = () => {
    if (rewardProfile.dailyRewardClaimedToday) return;

    const streak = rewardProfile.currentStreakDays;
    const isMilestone = streak % 7 === 0;
    const earnedPoints = isMilestone ? 100 : 35;

    // Update profile
    onUpdateRewardProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + earnedPoints,
      dailyRewardClaimedToday: true,
    }));

    // Record transaction
    const newTx: RewardTransaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      type: isMilestone ? 'streak_bonus' : 'daily_login',
      title: isMilestone
        ? `Day ${streak} Login Milestone Achieved! 🔥 (+100 Pts)`
        : `Daily Platform Login Bonus (Day ${streak} Streak) (+35 Pts)`,
      points: earnedPoints,
      timestamp: 'Just now',
    };
    onUpdateRewardTransactions((prev) => [newTx, ...prev]);

    showToast(`Claimed +${earnedPoints} Reward Points for today's login!`);
  };

  // Add Learning Content handler (by SoKo team / user)
  const handleAddLearningItem = (newItem: LearningItem) => {
    onUpdateLearningItems((prev) => [newItem, ...prev]);

    // Award bonus points for publishing content
    const authorBonus = 50;
    onUpdateRewardProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + authorBonus,
    }));

    const newTx: RewardTransaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      type: 'content_publish',
      title: `Published Learning Content: ${newItem.title.slice(0, 45)}... (+50 Pts)`,
      points: authorBonus,
      timestamp: 'Just now',
      referenceId: newItem.id,
    };
    onUpdateRewardTransactions((prev) => [newTx, ...prev]);

    showToast(`Published successfully! You earned +${authorBonus} points for contributing.`);
  };

  // Podcast completion handler
  const handleCompletePodcast = (podcastId: string, points: number) => {
    onUpdateLearningItems((prev) =>
      prev.map((item) =>
        item.id === podcastId ? { ...item, completed: true, completedAt: 'Just now' } : item
      )
    );

    onUpdateRewardProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + points,
      completedItemsCount: prev.completedItemsCount + 1,
    }));

    const podcast = learningItems.find((i) => i.id === podcastId);
    const newTx: RewardTransaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      type: 'podcast_listen',
      title: `Completed Podcast: ${podcast ? podcast.title.slice(0, 40) : 'Episode'} (+${points} Pts)`,
      points,
      timestamp: 'Just now',
      referenceId: podcastId,
    };
    onUpdateRewardTransactions((prev) => [newTx, ...prev]);

    showToast(`Podcast finished! Awarded +${points} reward points.`);
  };

  // Webinar register handler
  const handleRegisterWebinar = (webinarId: string, points: number) => {
    onUpdateLearningItems((prev) =>
      prev.map((item) =>
        item.id === webinarId
          ? { ...item, registered: true, attendeesCount: (item.attendeesCount || 0) + 1 }
          : item
      )
    );

    onUpdateRewardProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + points,
    }));

    const web = learningItems.find((i) => i.id === webinarId);
    const newTx: RewardTransaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      type: 'webinar_attend',
      title: `Registered for Live Webinar: ${web ? web.title.slice(0, 40) : 'Session'} (+${points} Pts)`,
      points,
      timestamp: 'Just now',
      referenceId: webinarId,
    };
    onUpdateRewardTransactions((prev) => [newTx, ...prev]);

    showToast(`Seat reserved! Calendar invite ready and +${points} points awarded.`);
  };

  // Webinar watch / complete handler
  const handleCompleteWebinar = (webinarId: string, points: number) => {
    onUpdateLearningItems((prev) =>
      prev.map((item) =>
        item.id === webinarId ? { ...item, completed: true, completedAt: 'Just now' } : item
      )
    );

    onUpdateRewardProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + points,
      completedItemsCount: prev.completedItemsCount + 1,
    }));

    const web = learningItems.find((i) => i.id === webinarId);
    const newTx: RewardTransaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      type: 'webinar_attend',
      title: `Watched Recorded Masterclass: ${web ? web.title.slice(0, 40) : 'Session'} (+${points} Pts)`,
      points,
      timestamp: 'Just now',
      referenceId: webinarId,
    };
    onUpdateRewardTransactions((prev) => [newTx, ...prev]);

    showToast(`Masterclass watched! +${points} reward points added to wallet.`);
  };

  // Study material complete handler
  const handleCompleteStudyMaterial = (materialId: string, points: number) => {
    onUpdateLearningItems((prev) =>
      prev.map((item) =>
        item.id === materialId ? { ...item, completed: true, completedAt: 'Just now' } : item
      )
    );

    onUpdateRewardProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + points,
      completedItemsCount: prev.completedItemsCount + 1,
    }));

    const mat = learningItems.find((i) => i.id === materialId);
    const newTx: RewardTransaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      type: 'study_complete',
      title: `Completed Study Guide: ${mat ? mat.title.slice(0, 40) : 'Toolkit'} (+${points} Pts)`,
      points,
      timestamp: 'Just now',
      referenceId: materialId,
    };
    onUpdateRewardTransactions((prev) => [newTx, ...prev]);

    showToast(`Course completed! +${points} points added to your balance.`);
  };

  // Voucher redeem handler
  const handleConfirmRedeemVoucher = (voucherId: string) => {
    const voucher = rewardVouchers.find((v) => v.id === voucherId);
    if (!voucher || rewardProfile.totalPoints < voucher.pointsRequired) return;

    // Deduct points
    onUpdateRewardProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints - voucher.pointsRequired,
      vouchersRedeemedCount: prev.vouchersRedeemedCount + 1,
    }));

    // Mark voucher redeemed
    onUpdateRewardVouchers((prev) =>
      prev.map((v) =>
        v.id === voucherId ? { ...v, isRedeemed: true, redeemedAt: 'Just now' } : v
      )
    );

    // Ledger transaction
    const newTx: RewardTransaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      type: 'voucher_redeem',
      title: `Redeemed Voucher: ${voucher.title} (-${voucher.pointsRequired} Pts)`,
      points: -voucher.pointsRequired,
      timestamp: 'Just now',
      referenceId: voucher.id,
    };
    onUpdateRewardTransactions((prev) => [newTx, ...prev]);

    showToast(`Voucher redeemed! Code ${voucher.code} is now active in your wallet.`);
  };

  // Copy code helper
  const handleCopyCode = (voucher: RewardVoucherItem) => {
    navigator.clipboard?.writeText(voucher.code);
    setCopiedCodeId(voucher.id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Contractor: Record Buyer Course Completion Handler
  const handleRecordBuyerAction = (e: React.FormEvent) => {
    e.preventDefault();
    const member = leaderboardMembers.find((m) => m.id === recordActionForm.memberId);
    const course = learningItems.find((c) => c.id === recordActionForm.courseId);
    if (!member || !course) return;

    const earnedPoints = course.rewardPoints || 100;

    // 1. Update Learning Item with completedByMembers
    onUpdateLearningItems((prev) =>
      prev.map((item) => {
        if (item.id !== course.id) return item;
        const existingMembers = item.completedByMembers || [];
        const alreadyIn = existingMembers.some((m) => m.memberName === member.name);
        if (alreadyIn) return item;

        return {
          ...item,
          completedByMembers: [
            ...existingMembers,
            {
              memberName: member.name,
              memberRole: member.title,
              completedAt: 'Just now',
              pointsEarned: earnedPoints,
            },
          ],
        };
      })
    );

    // 2. Add to recordedBuyerActions
    const newAction = {
      id: `cba_${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      memberRole: member.title,
      memberAvatar: member.avatarUrl,
      courseId: course.id,
      courseTitle: course.title,
      courseType: course.type,
      completedAt: 'Just now',
      score: recordActionForm.score || '95%',
      pointsEarned: earnedPoints,
      verificationNote: recordActionForm.verificationNote || 'Verified module syllabus completion and assessment pass.',
    };
    setRecordedBuyerActions((prev) => [newAction, ...prev]);

    // 3. Update leaderboard
    const updatedLeaderboard = leaderboardMembers.map((m) => {
      if (m.id !== member.id) return m;
      return {
        ...m,
        academyPoints: (m.academyPoints || 0) + earnedPoints,
        coursesCompleted: (m.coursesCompleted || 0) + 1,
        lastActive: 'Just now',
      };
    });
    setLeaderboardMembers(updatedLeaderboard);
    localStorage.setItem('soko_company_team_members_v1', JSON.stringify(updatedLeaderboard));

    setShowRecordActionModal(false);
    showToast(`Recorded course completion for ${member.name}! +${earnedPoints} pts credited to team leaderboard.`);
  };

  // Filtering items
  const filteredItems = learningItems.filter((item) => {
    // Type section
    if (activeSection === 'podcasts' && item.type !== 'podcast') return false;
    if (activeSection === 'webinars' && item.type !== 'webinar') return false;
    if (activeSection === 'study_materials' && item.type !== 'study_material') return false;

    // Webinar subfilter
    if (activeSection === 'webinars') {
      if (webinarFilter === 'upcoming' && item.webinarStatus !== 'upcoming') return false;
      if (webinarFilter === 'recorded' && item.webinarStatus !== 'recorded') return false;
    }

    // Category
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchAuthor = item.author.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAuthor && !matchCat) return false;
    }

    return true;
  });

  const categories: (string | LearningCategory)[] = [
    'All',
    'Roads & Highways',
    'Building Construction',
    'Infrastructure & Utilities',
    'ICV & Compliance',
    'FIDIC & Contracts',
    'Procurement Strategy',
    'Sustainability & ESG',
  ];

  const podcastsList = learningItems.filter((i) => i.type === 'podcast');
  const webinarsList = learningItems.filter((i) => i.type === 'webinar');
  const studyMaterialsList = learningItems.filter((i) => i.type === 'study_material');
  const redeemedVouchers = rewardVouchers.filter((v) => v.isRedeemed);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {notificationMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-bounce">
          <Award className="w-4 h-4 text-amber-400" />
          <span>{notificationMessage}</span>
        </div>
      )}

      {/* Hero Banner: SoKo Academy & Rewards Hub */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            {isContractor ? (
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                {currentUser.company} — Enterprise Academy & Upskilling Hub
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <GraduationCap className="w-4 h-4" />
                SoKo Knowledge Hub & Member Rewards
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {isContractor
                ? 'Procurement Academy, Masterclasses & Team Certification Hub'
                : 'Procurement Academy, Podcasts, Webinars & Reward Vouchers'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isContractor
                ? 'Curated technical masterclasses, standard FIDIC & ASTM toolkits, and certified procurement courses. Track buyer actions, record employee course completions, and foster competitive knowledge upskilling on your team leaderboard.'
                : 'Curated masterclasses, audio intelligence, and technical toolkits for UAE infrastructure procurement directors, highway contractors, and material suppliers. Earn reward points every time you log in and learn—redeemable for course vouchers and testing discounts.'}
            </p>

            <div className="flex items-center gap-4 pt-1 flex-wrap text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-blue-400" />
                {podcastsList.length} Podcasts
              </span>
              <span className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-purple-400" />
                {webinarsList.length} Webinars
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                {studyMaterialsList.length} Technical Guides
              </span>
              {isContractor ? (
                <span className="flex items-center gap-1.5 text-purple-300">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  {leaderboardMembers.length} Active Team Learners
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  {rewardVouchers.length} Redeemable Vouchers
                </span>
              )}
            </div>
          </div>

          {/* Right Action / Contributor Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {isContractor ? (
              <>
                <button
                  onClick={() => setShowRecordActionModal(true)}
                  className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 group"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>+ Record Buyer Course Action</span>
                </button>

                <button
                  onClick={() => setActiveSection('leaderboard')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-purple-300 hover:text-purple-200 border border-purple-500/30 font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-purple-400" />
                  <span>Company Leaderboard ({leaderboardMembers.length})</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAddContentModal(true)}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                  <span>+ Add Content (SoKo Team)</span>
                </button>

                <button
                  onClick={() => setActiveSection('rewards')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span>Rewards Store & Wallet</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Streak / Competency Hub: Conditional based on profile persona */}
      {!isContractor ? (
        /* Individual Buyer & Supplier Profile: Streak & Rewards Widget */
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Streak Info */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shrink-0">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {rewardProfile.currentStreakDays}-Day Login Streak Active!
                  </h3>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    {rewardProfile.tier}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Log in daily to stack streak multipliers and earn up to +100 bonus points on Day 7.
                </p>
              </div>
            </div>

            {/* Center: 7-Day Visual Streak Bar */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isPastOrCurrent = day <= rewardProfile.currentStreakDays;
                const isToday = day === rewardProfile.currentStreakDays;
                const isMilestone = day === 7;

                return (
                  <div
                    key={day}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center min-w-[42px] transition-all border ${
                      isToday
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40'
                        : isPastOrCurrent
                        ? 'bg-slate-100 border-slate-300 text-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase block">
                      D{day}
                    </span>
                    <div className="my-0.5">
                      {isPastOrCurrent ? (
                        <CheckCircle className={`w-3.5 h-3.5 ${isToday ? 'text-amber-600' : 'text-emerald-600'}`} />
                      ) : (
                        <span className="text-[9px] font-mono">
                          {isMilestone ? '★' : '•'}
                        </span>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold ${isMilestone ? 'text-amber-700' : 'text-slate-600'}`}>
                      {isMilestone ? '+100' : '+35'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right: Claim Action Button */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Total Balance
                </span>
                <span className="text-base font-black text-slate-900 flex items-center justify-end gap-1">
                  <Award className="w-4 h-4 text-amber-500" />
                  {rewardProfile.totalPoints} Pts
                </span>
              </div>

              <button
                onClick={handleClaimDailyReward}
                disabled={rewardProfile.dailyRewardClaimedToday}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  rewardProfile.dailyRewardClaimedToday
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-default'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md active:scale-95'
                }`}
              >
                {rewardProfile.dailyRewardClaimedToday ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Claimed for Today
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Claim Today's Bonus (+35 Pts)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* General Contractor Profile: Team Competency Hub & Leaderboard Preview (Points Not Needed for Contractor) */
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Trophy className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {currentUser.company} — Team Learning Competency Hub
                  </h3>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-300">
                    Leaderboard Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track individual buyer certifications, record course completions, and foster company upskilling benchmarks.
                </p>
              </div>
            </div>

            {/* Quick KPI stats */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Team Pts</span>
                <span className="text-sm font-black text-slate-900">
                  {leaderboardMembers.reduce((sum, m) => sum + (m.academyPoints || 0), 0)} Pts
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Certifications</span>
                <span className="text-sm font-black text-purple-700">
                  {leaderboardMembers.reduce((sum, m) => sum + (m.coursesCompleted || 0), 0)} Done
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Team Learners</span>
                <span className="text-sm font-black text-slate-900">
                  {leaderboardMembers.length} Staff
                </span>
              </div>

              <button
                onClick={() => setShowRecordActionModal(true)}
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Buyer Action</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Section Navigation Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Resources ({learningItems.length})
          </button>

          <button
            onClick={() => setActiveSection('podcasts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'podcasts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Podcasts ({podcastsList.length})
          </button>

          <button
            onClick={() => setActiveSection('webinars')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'webinars'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Webinars ({webinarsList.length})
          </button>

          <button
            onClick={() => setActiveSection('study_materials')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'study_materials'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Study Materials ({studyMaterialsList.length})
          </button>

          {isContractor ? (
            <button
              onClick={() => setActiveSection('leaderboard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'leaderboard'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Team Leaderboard & Course Activity ({leaderboardMembers.length})
            </button>
          ) : (
            <button
              onClick={() => setActiveSection('rewards')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'rewards'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-amber-500" />
              Rewards & Vouchers ({rewardVouchers.length})
            </button>
          )}
        </div>

        {/* Global Search inside Academy */}
        {activeSection !== 'rewards' && activeSection !== 'leaderboard' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search episodes, guides..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Category Pills (Visible when not in rewards or leaderboard tab) */}
      {activeSection !== 'rewards' && activeSection !== 'leaderboard' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Webinar subfilters */}
      {activeSection === 'webinars' && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Webinar Type:</span>
          <button
            onClick={() => setWebinarFilter('all')}
            className={`px-2.5 py-1 rounded-md cursor-pointer ${
              webinarFilter === 'all' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Webinars
          </button>
          <button
            onClick={() => setWebinarFilter('upcoming')}
            className={`px-2.5 py-1 rounded-md cursor-pointer ${
              webinarFilter === 'upcoming' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Upcoming Live
          </button>
          <button
            onClick={() => setWebinarFilter('recorded')}
            className={`px-2.5 py-1 rounded-md cursor-pointer ${
              webinarFilter === 'recorded' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Recorded On-Demand
          </button>
        </div>
      )}

      {/* SECTION: REWARDS & VOUCHERS CATALOG */}
      {activeSection === 'rewards' && (
        <div className="space-y-6">
          {/* Rewards Overview Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Reward Points
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-500" />
                {rewardProfile.totalPoints}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                Ready to redeem for course discounts
              </span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Current Login Streak
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-500" />
                {rewardProfile.currentStreakDays} Days
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {7 - (rewardProfile.currentStreakDays % 7)} days to next milestone (+100 pts)
              </span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Completed Learning Modules
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                {rewardProfile.completedItemsCount} Modules
              </div>
              <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
                Across podcasts, webinars & guides
              </span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Active Vouchers in Wallet
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <Ticket className="w-6 h-6 text-purple-600" />
                {redeemedVouchers.length} Vouchers
              </div>
              <span className="text-[11px] text-purple-600 font-semibold mt-1 block">
                Unlocked & ready for use
              </span>
            </div>
          </div>

          {/* Vouchers Filter Bar */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVoucherFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  voucherFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Vouchers ({rewardVouchers.length})
              </button>
              <button
                onClick={() => setVoucherFilter('course_voucher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  voucherFilter === 'course_voucher'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Course & Training Vouchers
              </button>
              <button
                onClick={() => setVoucherFilter('material_voucher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  voucherFilter === 'material_voucher'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Material & Lab Credits
              </button>
              <button
                onClick={() => setVoucherFilter('wallet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  voucherFilter === 'wallet'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Ticket className="w-3.5 h-3.5 text-amber-500" />
                My Redeemed Vouchers ({redeemedVouchers.length})
              </button>
            </div>
          </div>

          {/* Vouchers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rewardVouchers
              .filter((v) => {
                if (voucherFilter === 'wallet') return v.isRedeemed;
                if (voucherFilter === 'course_voucher') return v.voucherType === 'course_voucher' || v.voucherType === 'certification_voucher';
                if (voucherFilter === 'material_voucher') return v.voucherType === 'material_voucher' || v.voucherType === 'consultation_voucher';
                return true;
              })
              .map((voucher) => {
                const canAfford = rewardProfile.totalPoints >= voucher.pointsRequired;

                return (
                  <div
                    key={voucher.id}
                    className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-xs transition-all hover:shadow-md relative overflow-hidden ${
                      voucher.isRedeemed ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Top Tag & Discount Badge */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {voucher.category}
                        </span>
                        <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                          {voucher.discountValue}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {voucher.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {voucher.description}
                      </p>

                      <div className="pt-2 text-xs text-slate-500 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Partner:</span>
                          <span className="font-semibold text-slate-700">{voucher.partnerCompany}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Expires:</span>
                          <span className="font-mono text-slate-600">{voucher.validUntil}</span>
                        </div>
                      </div>

                      {/* Display Code if Redeemed */}
                      {voucher.isRedeemed && (
                        <div className="p-3 bg-slate-900 rounded-xl text-white text-center space-y-1 mt-2">
                          <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block">
                            Active Voucher Code
                          </span>
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono font-bold text-xs tracking-wider">
                              {voucher.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(voucher)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                              title="Copy code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {copiedCodeId === voucher.id && (
                            <span className="text-[10px] text-emerald-400 block">
                              Copied to clipboard!
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action & Points Cost */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>{voucher.pointsRequired} Pts</span>
                      </div>

                      {voucher.isRedeemed ? (
                        <button
                          onClick={() => handleCopyCode(voucher)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedCodeId === voucher.id ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedVoucherForRedeem(voucher)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            canAfford
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {canAfford ? 'Redeem Voucher' : 'View Requirements'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Points Ledger Activity History */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Recent Points Activity & Ledger History
              </h3>
              <span className="text-xs text-slate-500">
                Last updated just now
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {rewardTransactions.slice(0, 8).map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.points > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {tx.title}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {tx.timestamp}
                      </span>
                    </div>
                  </div>

                  <span className={`font-mono font-bold text-sm shrink-0 ${
                    tx.points > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {tx.points > 0 ? `+${tx.points}` : tx.points} Pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: COMPANY TEAM LEADERBOARD & RECORDED BUYER ACTIONS (For General Contractor) */}
      {activeSection === 'leaderboard' && (
        <div className="space-y-6">
          {/* Leaderboard Header Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-purple-600" />
                  {currentUser.company} — Corporate Upskilling
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  FIDIC · ASTM · UAE ICV Certified
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                <span>Team Learning Leaderboard & Course Records</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Leaderboard ranking of company buyers, estimators, and subcontract managers based on verified Academy certifications, masterclasses, and technical standard completions. Every action is recorded into the corporate compliance ledger.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRecordActionModal(true)}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all hover:shadow-md"
              >
                <FileCheck className="w-4 h-4 text-purple-200" />
                <span>+ Record Buyer Course Action</span>
              </button>
            </div>
          </div>

          {/* Top 3 Podium Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboardMembers
              .slice()
              .sort((a, b) => (b.academyPoints || 0) - (a.academyPoints || 0))
              .slice(0, 3)
              .map((member, idx) => {
                const medals = [
                  { label: '🥇 1st Place (Gold)', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', ring: 'ring-amber-400' },
                  { label: '🥈 2nd Place (Silver)', bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-800', ring: 'ring-slate-400' },
                  { label: '🥉 3rd Place (Bronze)', bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-800', ring: 'ring-amber-300' },
                ];
                const medal = medals[idx];

                return (
                  <div
                    key={member.id}
                    className={`rounded-2xl border p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between ${medal.bg} ${medal.border}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${medal.text} border ${medal.border} bg-white`}>
                          {medal.label}
                        </span>
                        <span className="font-mono text-xs font-bold text-purple-700">
                          {member.academyPoints} Pts
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className={`w-12 h-12 rounded-full object-cover ring-2 ${medal.ring}`}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">{member.name}</h4>
                          <p className="text-xs text-slate-600 line-clamp-1">{member.title}</p>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{member.department}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold">{member.coursesCompleted} Courses Completed</span>
                      <button
                        onClick={() => {
                          setRecordActionForm((prev) => ({ ...prev, memberId: member.id }));
                          setShowRecordActionModal(true);
                        }}
                        className="text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <span>+ Record</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Full Leaderboard Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">All Company Learners & Points Standings</h3>
                <p className="text-xs text-slate-500">Updated in real-time as buyers conclude courses & guides</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                {leaderboardMembers.length} Employees Enrolled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Buyer / Team Member</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-center">Courses Completed</th>
                    <th className="py-3 px-4 text-center">Total Points</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboardMembers
                    .slice()
                    .sort((a, b) => (b.academyPoints || 0) - (a.academyPoints || 0))
                    .map((member, index) => {
                      return (
                        <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {index === 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs ring-1 ring-amber-300">
                                1
                              </span>
                            ) : index === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold text-xs ring-1 ring-slate-300">
                                2
                              </span>
                            ) : index === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs ring-1 ring-amber-200">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-500 pl-2">#{index + 1}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.avatarUrl}
                                alt={member.name}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                              />
                              <div>
                                <span className="font-bold text-slate-900 block">{member.name}</span>
                                <span className="text-[11px] text-slate-500">{member.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">{member.title}</span>
                            <span className="text-[11px] text-slate-500">{member.department} • {member.roleInCompany}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              <GraduationCap className="w-3.5 h-3.5" />
                              {member.coursesCompleted} Completed
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-black text-sm text-purple-700">
                              {member.academyPoints} Pts
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setRecordActionForm((prev) => ({ ...prev, memberId: member.id }));
                                setShowRecordActionModal(true);
                              }}
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              + Record Course
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recorded Buyer Actions Audit Trail */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-purple-600" />
                  <span>Recorded Buyer Course Actions & Verification Log</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Every time a buyer in the contracting company completes a module or exam, their action is certified and logged here.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {recordedBuyerActions.length} Actions Logged
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recordedBuyerActions.map((action) => (
                <div
                  key={action.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={action.memberAvatar}
                          alt={action.memberName}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{action.memberName}</span>
                          <span className="text-[10px] text-slate-500 block">{action.memberRole}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[10px]">
                        Grade: {action.score}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="line-clamp-1">{action.courseTitle}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed italic bg-white p-2 rounded-lg border border-slate-200/80">
                        "{action.verificationNote}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <span className="font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {action.completedAt}
                    </span>
                    <span className="font-bold text-purple-700">
                      +{action.pointsEarned} Leaderboard Points
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: ACADEMY LEARNING ITEMS GRID (Podcasts, Webinars, Study Materials) */}
      {activeSection !== 'rewards' && activeSection !== 'leaderboard' && (
        <div className="space-y-6">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                No learning resources found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No resources match your active search or category filters. Try resetting filters or publish new content.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setWebinarFilter('all');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const isPodcast = item.type === 'podcast';
                const isWebinar = item.type === 'webinar';
                const isMaterial = item.type === 'study_material';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    {/* Thumbnail & Badges */}
                    <div>
                      <div className="relative h-48 overflow-hidden bg-slate-100">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

                        {/* Top Tag Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs ${
                            isPodcast ? 'bg-blue-600' : isWebinar ? 'bg-purple-600' : 'bg-emerald-600'
                          }`}>
                            {isPodcast ? '🎙️ Podcast' : isWebinar ? '🎥 Webinar' : '📚 Study Guide'}
                          </span>

                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-xs flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            +{item.rewardPoints} Pts
                          </span>
                        </div>

                        {/* Bottom Time & Category */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                          <span className="text-[11px] font-semibold bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-mono bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.duration}
                          </span>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{item.publishedDate}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">{item.authorCompany}</span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                          {item.title}
                        </h3>

                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {item.description}
                        </p>

                        {/* Instructor / Host Snippet */}
                        <div className="pt-2 flex items-center gap-2.5 border-t border-slate-100">
                          <img
                            src={item.authorAvatar}
                            alt={item.author}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              {item.author}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {item.authorRole}
                            </span>
                          </div>
                        </div>

                        {/* Contractor: Display which company buyers completed this course */}
                        {isContractor && item.completedByMembers && item.completedByMembers.length > 0 && (
                          <div className="mt-2.5 p-2 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between text-xs text-purple-900">
                            <span className="font-semibold flex items-center gap-1.5 truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              Completed by {item.completedByMembers.map((m) => m.memberName.split(' ')[0]).join(', ')}
                            </span>
                            <span className="text-[10px] text-purple-700 font-mono bg-purple-100/80 px-1.5 py-0.5 rounded shrink-0">
                              {item.completedByMembers.length} buyer{item.completedByMembers.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-5 pt-0">
                      {isPodcast && (
                        <button
                          onClick={() => setSelectedPodcast(item)}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{item.completed ? 'Replay Podcast (Completed)' : 'Listen & Earn +75 Pts'}</span>
                        </button>
                      )}

                      {isWebinar && (
                        <button
                          onClick={() => setSelectedWebinar(item)}
                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>
                            {item.webinarStatus === 'upcoming'
                              ? item.registered
                                ? 'View Registered Seat'
                                : 'Register Free (+150 Pts)'
                              : item.completed
                              ? 'Watch Recording (Completed)'
                              : 'Watch & Earn +150 Pts'}
                          </span>
                        </button>
                      )}

                      {isMaterial && (
                        <button
                          onClick={() => setSelectedMaterial(item)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{item.completed ? 'Review Toolkit (Completed)' : 'Study & Earn +100 Pts'}</span>
                        </button>
                      )}

                      {/* Contractor Action: Record Completion for a Buyer in the company */}
                      {isContractor && (
                        <button
                          onClick={() => {
                            setRecordActionForm((prev) => ({ ...prev, courseId: item.id }));
                            setShowRecordActionModal(true);
                          }}
                          className="mt-2 w-full py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>Record Buyer Completion</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddLearningContentModal
        isOpen={showAddContentModal}
        onClose={() => setShowAddContentModal(false)}
        currentUser={currentUser}
        onAddContent={handleAddLearningItem}
      />

      <PodcastPlayerModal
        isOpen={!!selectedPodcast}
        onClose={() => setSelectedPodcast(null)}
        podcast={selectedPodcast}
        onComplete={handleCompletePodcast}
      />

      <WebinarDetailModal
        isOpen={!!selectedWebinar}
        onClose={() => setSelectedWebinar(null)}
        webinar={selectedWebinar}
        onRegister={handleRegisterWebinar}
        onComplete={handleCompleteWebinar}
      />

      <StudyMaterialDetailModal
        isOpen={!!selectedMaterial}
        onClose={() => setSelectedMaterial(null)}
        material={selectedMaterial}
        onComplete={handleCompleteStudyMaterial}
      />

      <VoucherRedeemModal
        isOpen={!!selectedVoucherForRedeem}
        onClose={() => setSelectedVoucherForRedeem(null)}
        voucher={selectedVoucherForRedeem}
        rewardProfile={rewardProfile}
        onConfirmRedeem={handleConfirmRedeemVoucher}
      />

      {/* Contractor: Record Buyer Course Completion Modal */}
      {showRecordActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Buyer Course Completion</h3>
                  <p className="text-[11px] text-slate-500">Log employee training & credit leaderboard points</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecordActionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordBuyerAction} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Buyer / Team Member *</label>
                <select
                  value={recordActionForm.memberId}
                  onChange={(e) => setRecordActionForm({ ...recordActionForm, memberId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
                  required
                >
                  {leaderboardMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.title} ({m.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Course / Learning Material *</label>
                <select
                  value={recordActionForm.courseId}
                  onChange={(e) => setRecordActionForm({ ...recordActionForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
                  required
                >
                  {learningItems.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.type === 'podcast' ? 'Podcast' : c.type === 'webinar' ? 'Webinar' : 'Guide'}] {c.title} (+{c.rewardPoints} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assessment Score / Result</label>
                  <input
                    type="text"
                    value={recordActionForm.score}
                    onChange={(e) => setRecordActionForm({ ...recordActionForm, score: e.target.value })}
                    placeholder="e.g. 96% or Pass"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Credited Pts</label>
                  <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg font-bold text-purple-900 flex items-center justify-between">
                    <span>Leaderboard Points</span>
                    <span className="text-purple-700">
                      +{learningItems.find((c) => c.id === recordActionForm.courseId)?.rewardPoints || 100}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Verification Note / Certificate Ref</label>
                <textarea
                  rows={2}
                  value={recordActionForm.verificationNote}
                  onChange={(e) => setRecordActionForm({ ...recordActionForm, verificationNote: e.target.value })}
                  placeholder="e.g. Passed module assessment on yield strength tolerances & material test certification."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRecordActionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Credit Leaderboard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
