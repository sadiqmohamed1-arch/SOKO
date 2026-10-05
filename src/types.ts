export type UserRole = 'supplier' | 'buyer' | 'contractor' | 'admin';

export interface PlatformStats {
  totalGrossSourcingValue: string;
  totalProfiles: number;
  verifiedCompaniesCount: number;
  activeTendersCount: number;
  activeTendersValue: string;
  reportedItemsCount: number;
  disputedEscrowsCount: number;
  suppliersCount: number;
  buyersCount: number;
  contractorsCount: number;
  monthlyGrowthRate: string;
  compliancePassRate: string;
}

export interface CompanyProfileAudit {
  id: string;
  companyName: string;
  contactPerson: string;
  role: UserRole;
  email: string;
  phone: string;
  location: string;
  dunsNumber?: string;
  tradeLicenseNo?: string;
  vatTrn?: string;
  isVerified: boolean;
  status: 'active' | 'pending_verification' | 'suspended';
  icvScore: number;
  riskRating: 'low' | 'medium' | 'high';
  rating: number;
  registeredDate: string;
  lastActive: string;
  complianceCertCount: number;
  annualProcureVolume?: string;
  auditNotes?: string;
}

export interface ModerationReportItem {
  id: string;
  targetType: 'post' | 'rfq' | 'proposal' | 'profile';
  targetId: string;
  targetTitle: string;
  reportedBy: string;
  reporterCompany: string;
  reason: string;
  details: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'resolved' | 'dismissed' | 'action_taken';
  actionNote?: string;
}

export interface BackendActivityLog {
  id: string;
  adminName: string;
  action: string;
  entity: string;
  timestamp: string;
  status: 'success' | 'warning' | 'alert';
}

export interface UserProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  role: UserRole;
  avatarUrl: string;
  bannerUrl: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  dunsNumber: string;
  taxId: string;
  verified: boolean;
  bio: string;
  connectionsCount: number;
  rating: number;
  reviewsCount: number;
  certifications: string[];
  capabilities: string[];
  cardTheme: 'procure-blue' | 'industrial-dark' | 'emerald-green' | 'titanium-gold';
  paymentTerms: string;
  warehouseLocations: string[];
  isPremium?: boolean;
  subscriptionPlan?: string;
}

export interface CommentItem {
  id: string;
  author: string;
  company: string;
  role: UserRole;
  avatar: string;
  text: string;
  time: string;
}

export interface PostVideoData {
  videoUrl?: string;
  thumbnailUrl: string;
  duration: string;
  durationSeconds?: number;
  viewsCount: string;
  speakerName?: string;
  speakerTitle?: string;
  speakerAvatar?: string;
  badge?: string;
  subtitles?: { time: number; text: string }[];
  chapters?: { timeSeconds: number; timestamp: string; title: string }[];
}

export interface InfographicTipItem {
  number: number;
  title: string;
  tag: string;
  summary: string;
  details: string;
  formulaOrMetric?: string;
  iconType: 'calculator' | 'shield' | 'split' | 'trending' | 'file-check' | 'calendar' | 'award';
  impactBadge: string;
}

export interface InfographicStakeholderTension {
  id: string;
  role: string;
  quote: string;
  department: string;
  tension: string;
  resolution: string;
  side: 'left' | 'right';
  badgeColor?: string;
}

export interface InfographicCompetencyPillar {
  title: string;
  subtitle: string;
  iconName: string;
  description: string;
}

export interface PostInfographicData {
  title: string;
  subtitle: string;
  versionBadge: string;
  downloadFilename: string;
  summaryMetric: string;
  imageUrl?: string;
  authorPlaque?: string;
  motto?: string;
  tensions?: InfographicStakeholderTension[];
  pillars?: InfographicCompetencyPillar[];
  tips: InfographicTipItem[];
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole | 'official';
  authorCompany: string;
  authorAvatar: string;
  verified: boolean;
  timestamp: string;
  type: 'general' | 'rfq' | 'surplus' | 'tender' | 'procurement' | 'news' | 'business';
  title?: string;
  content: string;
  categoryTag: string;
  readTime?: string;
  keyTakeaway?: string;
  tags?: string[];
  video?: PostVideoData;
  infographic?: PostInfographicData;
  metrics?: {
    moq?: string;
    targetPrice?: string;
    quantity?: string;
    deadline?: string;
    location?: string;
    specSheetName?: string;
  };
  likes: number;
  userLiked: boolean;
  comments: CommentItem[];
  shares: number;
  bidsCount?: number;
}

export interface QuoteDetails {
  rfqId?: string;
  item: string;
  quantity: string;
  unitPrice: number;
  totalPrice: number;
  leadTimeWeeks: number;
  validityDays: number;
  terms: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  isQuote?: boolean;
  quoteDetails?: QuoteDetails;
}

export interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    company: string;
    role: UserRole;
    avatar: string;
    verified: boolean;
    online: boolean;
    responseTime: string;
    phone: string;
    email: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  rfqSubject?: string;
  messages: MessageItem[];
}

export interface SupplierReview {
  id: string;
  authorName: string;
  authorCompany: string;
  authorRole: string;
  rating: number; // 1 to 5
  date: string;
  comment: string;
  verifiedPO?: string;
  performanceCategory?: 'On-Time Delivery' | 'Material Quality' | 'Pricing & Terms' | 'Overall Performance';
}

export interface SupplierItem {
  id: string;
  name: string;
  company: string;
  role: 'supplier' | 'contractor';
  category: string;
  subcategories: string[];
  location: string;
  rating: number;
  reviewCount: number;
  reviews?: SupplierReview[];
  verified: boolean;
  tier: 'Tier 1 Global' | 'Tier 2 Regional' | 'Certified SME' | 'Specialty Fabricator';
  moq: string;
  leadTimeAvg: string;
  otdRate: number; // On time delivery percentage
  isoCertifications: string[];
  capabilities: string[];
  description: string;
  phone: string;
  email: string;
  duns: string;
  completedContracts: number;
  avatar: string;
  logo?: string;
  banner: string;
  annualCapacity: string;
}

export interface OpportunityProposal {
  id: string;
  opportunityId: string;
  supplierId: string;
  supplierName: string;
  supplierCompany: string;
  supplierAvatar: string;
  supplierRole?: UserRole;
  supplierPhone?: string;
  supplierEmail?: string;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  leadTimeDays: number;
  paymentTerms: string;
  notes: string;
  submittedAt: string;
  status: 'pending' | 'shortlisted' | 'awarded' | 'declined';
  certifications?: string[];
  icvScore?: number;
  warrantyMonths?: number;
  technicalComplianceRate?: number;
  inclusions?: string[];
  exclusions?: string[];
  advancePaymentPct?: number;
  retentionPct?: number;
  creditDays?: number;
  performanceBondPct?: number;
  incoterms?: string;
  scopeCoverageRate?: number;
  normalizedPriceAED?: number;
}

export interface BidTabulationReport {
  rfqNumber: string;
  opportunityTitle: string;
  opportunityBudget: number;
  evaluatedDate: string;
  evaluatorName: string;
  proposalsCount: number;
  recommendedProposalId: string;
  recommendationReason: string;
  executiveSummary: string;
  priceSpreadPct: number;
  fastestLeadDays: number;
  highestIcvScore: number;
  scopeGapAnalysis: {
    criticalExclusions: string[];
    riskAssessment: string;
  };
  paymentTermsImpact: {
    cashFlowRecommendation: string;
    safestTermsVendor: string;
  };
}

export interface ResponderTierDetail {
  tier: 'Tier 1 Global' | 'Tier 2 Regional' | 'Certified SME' | 'Specialized Niche';
  tierLabel: string;
  badgeColor: string;
  responderCount: number;
  percentageOfTotal: number;
  avgQuotedPrice: number;
  priceVarianceVsBudget: string; // e.g. "+3.8%" or "-9.5%"
  avgLeadTimeDays: number;
  avgIcvScore: number; // e.g. 88%
  complianceRate: number; // e.g. 99%
  otdRate: number; // On-time delivery e.g. 98.4%
  description: string;
  responders: {
    id: string;
    supplierId: string;
    companyName: string;
    contactName: string;
    avatar: string;
    quotedPrice: number;
    currency: string;
    leadTimeDays: number;
    paymentTerms: string;
    complianceTags: string[];
    status: 'shortlisted' | 'pending' | 'awarded' | 'evaluating';
    responseTime: string;
    phone?: string;
    email?: string;
  }[];
}

export interface GranularConversionMetrics {
  totalTargeted: number;
  deliveredCount: number;
  deliveryRate: string; // "97.8%"
  openedCount: number;
  openRate: string; // "80.7%"
  downloadedSpecsCount: number;
  specDownloadRate: string; // "76.1%"
  proposalsCount: number;
  bidConversionRate: string; // "9.9%" of openers / "13.0%" of spec downloaders
  shortlistedCount: number;
  shortlistRate: string; // "28.6%"
  awardedCount: number;
  awardRate: string; // "7.1%"
  benchmarkQuoteConversion: string; // "5.2% GCC Industrial Avg"
  performanceDelta: string; // "+50.0% vs Benchmark"
  conversionVelocity: {
    timeToFirstBid: string; // "38 mins"
    timeToThreeBids: string; // "2.5 hours"
    timeToCompetitiveClustering: string; // "4.2 hours"
  };
}

export interface SupplierEngagementTimeMetrics {
  avgEngagementTimeMinutes: number; // 14.6
  avgTimeOnTechnicalSpecs: number; // 8.4 mins
  avgTimeOnPricingTerms: number; // 4.2 mins
  avgTimeOnInspectionCompliance: number; // 2.0 mins
  industryAvgEngagementTimeMinutes: number; // 8.2
  revisitRate: string; // "68.4%"
  avgSessionsPerBidder: number; // 2.8
  channelTurnaround: {
    channel: string;
    avgMinutes: number;
    displayTurnaround: string;
    shareOfBids: string;
    reliabilityScore: number;
  }[];
  hourlyEngagementDistribution: {
    hour: string;
    opens: number;
    bids: number;
    activityLevel: 'low' | 'moderate' | 'peak';
  }[];
  timeToBidDistribution: {
    range: string;
    percentage: number;
    bidsCount: number;
    description: string;
  }[];
}

export interface CampaignAnalytics {
  totalTargeted: number;
  deliveredCount: number;
  openedCount: number;
  respondedCount: number;
  impressions: number;
  clickThroughRate: string;
  avgResponseTime: string;
  geographicBreakdown: { region: string; percentage: number; suppliers: number }[];
  tierBreakdown: { tier: string; count: number }[];
  dailyActivity: { date: string; opens: number; responses: number }[];
  // Granular Premium Analytics Extensions
  granularConversion?: GranularConversionMetrics;
  engagementTime?: SupplierEngagementTimeMetrics;
  responderTiers?: ResponderTierDetail[];
  priceCompressionSavings?: {
    highestQuote: number;
    winningQuote: number;
    savingsAmount: number;
    savingsPercentage: string;
    currency: string;
  };
}

export interface OpportunityItem {
  id: string;
  rfqNumber: string;
  title: string;
  issuerName: string;
  issuerCompany: string;
  issuerRole: 'buyer' | 'contractor';
  issuerAvatar: string;
  verified: boolean;
  category: string;
  budgetRange: string;
  estimatedValue: number;
  quantity?: string;
  targetPrice?: string;
  location: string;
  deadline: string;
  daysLeft: number;
  status: 'open' | 'closing-soon' | 'evaluating' | 'awarded';
  description: string;
  specifications: string[];
  proposalsCount: number;
  myProposalSubmitted?: boolean;
  proposals?: OpportunityProposal[];
  paymentTerms: string;
  isPrivateTargeted?: boolean;
  targetedCategory?: string;
  targetedSuppliersCount?: number;
  siteLocation?: string;
  issuingMemberName?: string;
  // Market Deals & Sponsored Campaigns
  opportunityType?: 'market_deal' | 'buyer_campaign';
  campaignCategory?: string;
  dealCategory?: 'machinery' | 'bulk_steel' | 'surplus_material' | 'special_price';
  dealDiscount?: string;
  originalPrice?: string;
  condition?: string;
  imageUrl?: string;
  additionalImages?: string[];
  isSokoAdminPost?: boolean;
  isPremiumCampaign?: boolean;
  campaignPricingPlan?: string;
  campaignAnalytics?: CampaignAnalytics;
  sellerContact?: {
    name: string;
    phone: string;
    whatsapp: string;
    email: string;
    inspectionAvailable: boolean;
    yardLocation: string;
  };
}

export interface CommunityContact {
  id: string;
  name: string;
  title: string;
  company: string;
  role: UserRole;
  category: string;
  avatarUrl: string;
  location: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  website?: string;
  linkedinUrl?: string;
  verified: boolean;
  bio: string;
  isMaintained: boolean; // Maintained in personal rolodex
  tags: string[]; // Custom labels, e.g. 'VIP Buyer', 'MEP Contractor', 'Urgent Sourcing'
  notes?: string;
  accessStatus: 'direct' | 'requested' | 'unlocked';
  lastContacted?: string;
  connectionStatus?: 'connected' | 'pending' | 'incoming' | 'not_connected';
  mutualConnections?: number;
  connectionRequestNote?: string;
  connectedDate?: string;
}

export interface OfficeKioskVisit {
  id: string;
  badgeNumber: string;
  checkInTime: string;
  checkOutTime?: string;
  date: string;
  supplierId?: string;
  supplierName: string;
  supplierCompany: string;
  supplierAvatar: string;
  supplierPhone: string;
  supplierEmail: string;
  buyerHostId: string;
  buyerHostName: string;
  buyerDepartment: string;
  officeLocation: string; // e.g., 'SoKo HQ - Sheikh Zayed Rd', 'Abu Dhabi Procurement Hub', 'JAFZA South Hub'
  purposeOfVisit: 'Sample Demonstration' | 'Contract Negotiation' | 'RFQ Discussion' | 'Vendor Onboarding' | 'Facility Inspection' | 'Commercial Review' | 'Other';
  agendaDiscussion: string; // What to be discussed
  visitorStatus: 'checked-in' | 'in-meeting' | 'completed' | 'scheduled';
  meetingNotes?: string; // Buyer's notes logged
  actionItems?: string[];
  vendorScore?: number; // 1 to 5 rating
  ndaSigned: boolean;
}

export interface JobListingItem {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  workType: 'Remote' | 'Hybrid' | 'On-site';
  employmentType: 'Full-time' | 'Contract / Project' | 'Subcontract Retainer';
  salaryRange: string;
  department: string;
  postedDate: string;
  applicantsCount: number;
  description: string;
  keyResponsibilities: string[];
  requirements: string[];
  certificationsPreferred: string[];
  applied?: boolean;
  gcTier?: string;
  gcProjects?: string[];
  recruiter?: {
    name: string;
    title: string;
    avatar: string;
    mutualConnections: number;
    email?: string;
  };
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  screeningQuestions?: {
    id: string;
    question: string;
    options?: string[];
    defaultAnswer?: string;
  }[];
  appliedMethod?: 'profile' | 'linkedin';
  appliedDate?: string;
  applicationStatus?: 'Applied' | 'Profile Viewed' | 'Shortlisted' | 'Interview Scheduled';
}

export interface BuyerCareerProfile {
  id: string;
  name: string;
  title: string;
  headline: string;
  company: string;
  location: string;
  email: string;
  phone: string;
  avatarUrl: string;
  isOpenToWork: boolean;
  profileStrength: number;
  linkedInConnected: boolean;
  linkedInUrl: string;
  linkedInUsername: string;
  linkedInConnections: string;
  linkedInLastSynced: string;
  summary: string;
  yearsOfExperience: number;
  spendUnderManagement: string;
  categoriesHandled: string[];
  skills: string[];
  certifications: string[];
  experienceTimeline: {
    id: string;
    role: string;
    company: string;
    period: string;
    description: string;
  }[];
  education: {
    id: string;
    degree: string;
    institution: string;
    year: string;
  }[];
  resume: {
    fileName: string;
    fileSize: string;
    lastUpdated: string;
    atsScore: number;
  };
  jobPreferences: {
    targetTitles: string[];
    targetLocations: string[];
    workplaceTypes: string[];
    expectedSalary: string;
    noticePeriod: string;
  };
}

export interface BuyerJobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogo: string;
  location: string;
  salaryRange: string;
  appliedDate: string;
  applicationMethod: 'profile' | 'linkedin';
  status: 'Applied' | 'Profile Viewed' | 'Shortlisted' | 'Interview Scheduled';
  statusUpdateDate: string;
  resumeUsed: string;
  screeningAnswers?: Record<string, string>;
  coverNote?: string;
  recruiter: {
    name: string;
    title: string;
    avatar: string;
  };
}

export interface AnalyticsMetric {
  spendByMonth: { month: string; spend: number; savings: number; budget: number }[];
  spendByCategory: { name: string; value: number; color: string }[];
  supplierPerformance: {
    id: string;
    name: string;
    tier: string;
    spend: number;
    otd: number;
    qualityScore: number;
    risk: 'Low' | 'Moderate' | 'Critical';
    activeOrders: number;
  }[];
  rfqFunnel: { stage: string; count: number; amount: string; conversion: string }[];
  summary: {
    totalSpend: number;
    costSavings: number;
    savingsPct: number;
    avgOtdRate: number;
    avgCycleDays: number;
    activeSuppliersCount: number;
    openRfqsCount: number;
    growthPct: number;
  };
}

// ==========================================
// SoKo Academy: Podcasts, Webinars, Study Materials
// ==========================================

export type LearningContentType = 'podcast' | 'webinar' | 'study_material';

export type LearningCategory =
  | 'Roads & Highways'
  | 'Building Construction'
  | 'Infrastructure & Utilities'
  | 'ICV & Compliance'
  | 'FIDIC & Contracts'
  | 'Procurement Strategy'
  | 'Sustainability & ESG';

export interface LearningItem {
  id: string;
  type: LearningContentType;
  title: string;
  category: LearningCategory;
  author: string;
  authorRole: string;
  authorCompany: string;
  authorAvatar: string;
  publishedDate: string;
  duration: string; // e.g., '42 mins', '55 mins', '38-page guide'
  thumbnail: string;
  description: string;
  keyTakeaways: string[];
  rewardPoints: number; // e.g. 75 for podcast, 150 for webinar, 100 for guide
  completed?: boolean;
  completedAt?: string;
  completedByMembers?: {
    memberName: string;
    memberRole: string;
    completedAt: string;
    pointsEarned?: number;
  }[];

  // Podcast specific
  audioUrl?: string;
  episodeNumber?: number;
  season?: number;
  guest?: {
    name: string;
    company: string;
    role: string;
    avatar: string;
  };
  transcriptSummary?: string;

  // Webinar specific
  webinarStatus?: 'upcoming' | 'live' | 'recorded';
  scheduledDate?: string;
  scheduledTime?: string;
  registered?: boolean;
  recordingUrl?: string;
  slidesUrl?: string;
  attendeesCount?: number;

  // Study material specific
  documentFormat?: 'PDF Document' | 'Excel Financial Model' | 'Masterclass Module' | 'Interactive Deck';
  pageCount?: number;
  fileSize?: string;
  downloadUrl?: string;
  curriculum?: { title: string; duration: string; completed?: boolean }[];
}

// ==========================================
// SoKo Rewards & Voucher Loyalty System
// ==========================================

export type RewardTier = 'Bronze Member' | 'Silver Sourcing Pro' | 'Gold Procurement Leader' | 'Platinum Industry Fellow';

export interface RewardTransaction {
  id: string;
  userId: string;
  type:
    | 'daily_login'
    | 'podcast_listen'
    | 'webinar_attend'
    | 'study_complete'
    | 'rfq_submitted'
    | 'voucher_redeem'
    | 'streak_bonus'
    | 'content_publish';
  title: string;
  points: number; // positive for earn, negative for redeem
  timestamp: string;
  referenceId?: string;
}

export interface RewardVoucherItem {
  id: string;
  code: string;
  title: string;
  description: string;
  voucherType: 'course_voucher' | 'material_voucher' | 'certification_voucher' | 'consultation_voucher';
  discountValue: string; // e.g. "AED 500 OFF", "AED 250 Credit", "100% Free Pass"
  pointsRequired: number;
  validUntil: string;
  category: string;
  terms: string;
  isRedeemed?: boolean;
  redeemedAt?: string;
  partnerCompany?: string;
  badge?: string;
}

export interface UserRewardProfile {
  totalPoints: number;
  currentStreakDays: number;
  lastLoginDate: string;
  dailyRewardClaimedToday: boolean;
  tier: RewardTier;
  completedItemsCount: number;
  vouchersRedeemedCount: number;
}

// ==========================================
// General Contractor Company Profile & Team Management
// ==========================================

export type CompanyRolePermission =
  | 'Admin / Executive'
  | 'Procurement Lead'
  | 'Project Manager'
  | 'Viewer'
  | 'Senior Estimator'
  | 'Site Sourcing Manager'
  | 'Contracts Auditor';

export type AccessLevelType =
  | 'Full Access'
  | 'Commercial Lead'
  | 'Project Level'
  | 'Viewer (Read-Only)';

export interface RoleAccessConfig {
  role: CompanyRolePermission;
  level: AccessLevelType;
  badgeColor: string;
  description: string;
  allowedActions: string[];
  restrictedActions: string[];
  canIssueRFPs: boolean;
  canAwardContracts: boolean;
  canMessageSuppliers: boolean;
  canHostKioskVisits: boolean;
  canManageTeam: boolean;
  canViewFinancials: boolean;
  maxApprovalLimitAED?: number;
}

export interface CompanyTeamMember {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  roleInCompany: CompanyRolePermission;
  avatarUrl: string;
  phone: string;
  status: 'Active' | 'Invited';
  joinedDate: string;
  lastActive: string;
  rfpsCreated: number;
  visitsHosted: number;
  academyPoints: number;
  coursesCompleted: number;
  accessLevel?: AccessLevelType;
  invitedBy?: string;
  inviteLink?: string;
  restrictedAccessDetails?: string[];
  maxApprovalLimitAED?: number;
}

export interface TeamActivityLogItem {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  action: string;
  category: 'rfp' | 'visit' | 'academy' | 'team';
  timestamp: string;
  details?: string;
}

export interface CompanyJobApplicant {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  candidateAvatar: string;
  currentTitle: string;
  currentCompany: string;
  experienceYears: number;
  expectedSalary: string;
  phone: string;
  email: string;
  location: string;
  status: 'Reviewing' | 'Shortlisted' | 'Interview' | 'Offered' | 'Declined';
  appliedDate: string;
  matchScore: number;
  skills: string[];
  summary: string;
}

