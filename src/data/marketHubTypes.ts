export type WorkspaceKind = 'personal_buyer' | 'contractor' | 'supplier' | 'soko_admin';
export type MemberRole = 'owner' | 'campaign_manager' | 'member' | 'platform_admin';
export type PlanId = 'free_buyer' | 'free_supplier' | 'supplier_pro' | 'free_contractor' | 'contractor_premium' | 'enterprise' | 'platform';

export interface BuyerPreferences {
  emirate: string;
  role: string;
  companyType: string;
  followedCategories: string[];
  interestedCategories: string[];
  promoOptIn: boolean;
  mutedSenders: string[];
}

export interface SupplierRecipientProfile {
  categories: string[];
  subcategories: string[];
  types: string[];
  emirate: string;
  verified: boolean;
  keywords: string;
}

export interface MarketWorkspace {
  id: string;
  kind: WorkspaceKind;
  displayName: string;
  personName: string;
  companyName?: string;
  memberRole: MemberRole;
  emirate: string;
  supplierProfile?: SupplierRecipientProfile;
}

export interface Entitlements {
  postOpportunity: boolean;
  expressInterest: boolean;
  receiveSourcing: boolean;
  receivePromotions: boolean;
  createSourcingCampaign: boolean;
  createPromoCampaign: boolean;
  campaignAnalytics: boolean;
  monthlyCredits: number;
  maxLaunchesPer7Days: number;
  multipleCampaignUsers: boolean;
  approvalWorkflow: boolean;
  moderate: boolean;
}

export interface Actor {
  workspace: MarketWorkspace;
  plan: PlanId;
  entitlements: Entitlements;
}

export type OpportunityType =
  | 'material'
  | 'subcontracting'
  | 'manpower'
  | 'equipment_rental'
  | 'specialist_service'
  | 'project'
  | 'supply_availability'
  | 'surplus'
  | 'distribution'
  | 'manufacturing'
  | 'partnership';

export type OpportunityGroup = 'requirements' | 'supply' | 'projects';
export type Urgency = 'standard' | 'high' | 'urgent';
export type InterestStatus = 'interested' | 'under_review' | 'connection_requested' | 'connected' | 'declined';

export interface OpportunityInterest {
  id: string;
  workspaceId: string;
  companyName: string;
  message: string;
  status: InterestStatus;
  at: string;
}

export interface MarketOpportunity {
  id: string;
  title: string;
  type: OpportunityType;
  category: string;
  subcategory: string;
  location: string;
  description: string;
  scope?: string;
  requiredBy: string;
  responseDeadline: string;
  urgency: Urgency;
  attachmentName?: string;
  identity: 'public' | 'confidential';
  contactVisibility: 'on_connection' | 'members';
  publisherWorkspaceId: string;
  publisherLabel: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  projectName?: string;
  postedAt: string;
  status: 'open' | 'closed';
  interests: OpportunityInterest[];
  savedBy: string[];
  demoInterestCount?: number;
}

export interface OpportunityView {
  id: string;
  title: string;
  type: OpportunityType;
  category: string;
  subcategory: string;
  location: string;
  description: string;
  scope?: string;
  requiredBy: string;
  responseDeadline: string;
  urgency: Urgency;
  attachmentName?: string;
  postedAt: string;
  status: 'open' | 'closed';
  publisherDisplay: string;
  isConfidential: boolean;
  contact: { name: string; email?: string; phone?: string } | null;
  projectName?: string;
  interestedCount: number;
  isMine: boolean;
  saved: boolean;
  myInterest?: { status: InterestStatus; message: string };
  interests?: OpportunityInterest[];
}

export type CampaignKind = 'sourcing' | 'promotion';
export type CampaignStatus = 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'active' | 'paused' | 'completed' | 'rejected' | 'suspended';
export type PromoType =
  | 'new_product'
  | 'special_offer'
  | 'stock_availability'
  | 'catalogue'
  | 'technical_solution'
  | 'manufacturing_capability'
  | 'distribution_opportunity'
  | 'service_promotion';

export interface SupplierAudienceFilter {
  categories: string[];
  subcategories: string[];
  supplierTypes: string[];
  emirates: string[];
  verifiedOnly: boolean;
  keywords: string;
}

export interface BuyerAudienceFilter {
  categories: string[];
  emirates: string[];
  roles: string[];
  companyTypes: string[];
  productInterests: string;
}

export type CampaignEventType = 'view' | 'click' | 'interested' | 'declined' | 'saved' | 'report';

export interface CampaignEvent {
  recipientId: string;
  type: CampaignEventType;
  at: string;
  shareIdentity?: boolean;
  reason?: string;
}

export type ResponseAvailability = 'available' | 'on_order' | 'partial' | 'alternative';

export interface CampaignResponse {
  id: string;
  responderId: string;
  companyName: string;
  category: string;
  location: string;
  verified: boolean;
  message: string;
  availability: ResponseAvailability;
  leadTime: string;
  quotationName?: string;
  techDocName?: string;
  at: string;
  shortlisted: boolean;
  connectRequested: boolean;
  demo?: boolean;
}

export interface DemoBaseline {
  delivered: number;
  viewed: number;
  clicked: number;
  interested: number;
  declined: number;
}

export interface CampaignDraftInput {
  kind: CampaignKind;
  title: string;
  category: string;
  subcategory: string;
  description: string;
  itemRequired?: string;
  quantity?: string;
  unit?: string;
  deliveryLocation?: string;
  requiredDate?: string;
  attachmentName?: string;
  identity: 'public' | 'confidential';
  promoType?: PromoType;
  offerHighlight?: string;
  responseDeadline: string;
  scheduledFor?: string;
  supplierAudience?: SupplierAudienceFilter;
  buyerAudience?: BuyerAudienceFilter;
}

export interface Campaign extends CampaignDraftInput {
  id: string;
  ownerWorkspaceId: string;
  ownerCompany: string;
  status: CampaignStatus;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  launchedAt?: string;
  closedAt?: string;
  estimatedAudience: number;
  creditsRequired: number;
  creditsUsed?: number;
  recipientIds?: string[];
  delivered?: number;
  frequencyCapped?: number;
  demoBaseline?: DemoBaseline;
  events: CampaignEvent[];
  responses: CampaignResponse[];
}

export interface CampaignMetrics {
  eligible: number;
  delivered: number;
  viewed: number;
  clicked: number;
  interested: number;
  responded: number;
  declined: number;
  shortlisted: number;
  reports: number;
  responseRate: number;
  durationDays: number;
  creditsUsed: number;
  includesDemoValues: boolean;
}

export interface OwnerCampaignView {
  campaign: Omit<Campaign, 'recipientIds' | 'events'>;
  metrics: CampaignMetrics;
  disclosedInterests: { companyName: string; personName: string; at: string }[];
}

export interface InboxItem {
  id: string;
  kind: CampaignKind;
  title: string;
  typeLabel: string;
  senderDisplay: string;
  senderSupplierId?: string;
  category: string;
  subcategory: string;
  location: string;
  summary: string;
  description: string;
  quantity?: string;
  unit?: string;
  requiredDate?: string;
  attachmentName?: string;
  offerHighlight?: string;
  date: string;
  expiry: string;
  viewed: boolean;
  interested: boolean;
  declined: boolean;
  saved: boolean;
  reported: boolean;
  responded: boolean;
}

export interface CreditAccount {
  available: number;
  used: number;
}

export interface MarketHubStore {
  version: number;
  opportunities: MarketOpportunity[];
  campaigns: Campaign[];
  workspacePlans: Record<string, PlanId>;
  credits: Record<string, CreditAccount>;
  buyerPrefs: Record<string, BuyerPreferences>;
  mutedBySupplier: Record<string, string[]>;
}

export type ServiceResult<T = void> = { ok: true; store: MarketHubStore; value: T } | { ok: false; error: string };
