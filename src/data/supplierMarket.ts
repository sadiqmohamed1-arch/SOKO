import { actorForWorkspace, creditAccount, inboxFor, listOpportunities, loadMarketStore, ownerCampaigns, saveMarketStore } from './marketHubService';
import { PLANS, UPGRADE_PATHS } from './marketHubCatalog';
import { CampaignMetrics, MarketWorkspace, PlanId } from './marketHubTypes';
import { CompanyRecord, CompanyRole, SessionUser, SupplierTier } from './supplierTypes';

export const marketWorkspaceId = (companyId: string) => `ws_${companyId}`;

const MEMBER_ROLE: Record<CompanyRole, MarketWorkspace['memberRole']> = {
  supplier_admin: 'owner',
  sales_manager: 'campaign_manager',
  sales_rep: 'member',
  technical_manager: 'member',
  viewer: 'member',
  contractor_admin: 'owner',
  procurement_manager: 'campaign_manager',
  procurement_officer: 'member',
  project_manager: 'member',
};

export const marketWorkspaceFor = (c: CompanyRecord, role: CompanyRole, user: SessionUser): MarketWorkspace => ({
  id: marketWorkspaceId(c.id),
  kind: c.kind === 'contractor' ? 'contractor' : 'supplier',
  displayName: c.profile.tradingName,
  personName: user.name,
  companyName: c.profile.tradingName,
  memberRole: MEMBER_ROLE[role],
  emirate: c.profile.emirate,
  supplierProfile: {
    categories: c.profile.categories,
    subcategories: c.profile.subcategories,
    types: c.profile.types,
    emirate: c.profile.emirate,
    verified: c.verification.status === 'verified',
    keywords: [...c.profile.brands, ...c.profile.capabilities].join(' ').toLowerCase(),
  },
});

type CompanyKind = CompanyRecord['kind'];

export const tierToPlan = (tier: SupplierTier, kind: CompanyKind = 'supplier'): PlanId =>
  kind === 'contractor' ? (tier === 'premium' ? 'contractor_premium' : 'free_contractor') : tier === 'premium' ? 'supplier_pro' : 'free_supplier';
export const planToTier = (plan: PlanId): SupplierTier => (plan === 'free_supplier' || plan === 'free_contractor' ? 'free' : 'premium');

const planFamily = (kind: CompanyKind) => UPGRADE_PATHS[kind === 'contractor' ? 'contractor' : 'supplier'];

export interface PlanCorrection {
  companyId: string;
  from: PlanId;
  to: PlanId;
}

/**
 * Keeps each company's Market Hub plan aligned with its own subscription tier and company type.
 * A plan that belongs to the other company type (e.g. a supplier plan on a contractor) is replaced
 * with the equivalent plan for the correct type and returned so the caller can record it.
 */
export const syncMarketPlans = (companies: CompanyRecord[]): PlanCorrection[] => {
  const store = loadMarketStore();
  let changed = false;
  const corrections: PlanCorrection[] = [];
  const workspacePlans = { ...store.workspacePlans };
  const credits = { ...store.credits };
  companies.forEach((c) => {
    const id = marketWorkspaceId(c.id);
    const current = workspacePlans[id];
    const wrongFamily = !!current && !planFamily(c.kind).includes(current);
    if (!current || wrongFamily || planToTier(current) !== c.tier) {
      const plan = tierToPlan(c.tier, c.kind);
      if (current && wrongFamily) corrections.push({ companyId: c.id, from: current, to: plan });
      workspacePlans[id] = plan;
      const account = credits[id] ?? { available: 0, used: 0 };
      credits[id] = { ...account, available: Math.max(account.available, PLANS[plan].entitlements.monthlyCredits) };
      changed = true;
    }
  });
  if (changed) saveMarketStore({ ...store, workspacePlans, credits });
  return corrections;
};

export const marketSnapshot = (workspace: MarketWorkspace) => {
  const store = loadMarketStore();
  const actor = actorForWorkspace(store, workspace);
  const cats = new Set(workspace.supplierProfile?.categories ?? []);
  const opportunities = listOpportunities(store, actor).filter((o) => o.status === 'open' && !o.isMine);
  const relevant = opportunities.filter((o) => cats.has(o.category));
  const campaigns = ownerCampaigns(store, actor);
  const inbox = inboxFor(store, actor);
  const sum = (k: keyof CampaignMetrics) => campaigns.reduce((n, c) => n + (Number(c.metrics[k]) || 0), 0);
  return {
    actor,
    relevant: (relevant.length ? relevant : opportunities).slice(0, 4),
    relevantCount: relevant.length,
    myInterests: opportunities.filter((o) => o.myInterest).length + listOpportunities(store, actor).filter((o) => o.myInterest && o.status === 'closed').length,
    campaigns,
    activeCampaigns: campaigns.filter((c) => c.campaign.status === 'active').length,
    delivered: sum('delivered'),
    viewed: sum('viewed'),
    responses: campaigns.reduce((n, c) => n + (c.campaign.kind === 'sourcing' ? c.metrics.responded : c.disclosedInterests.length + c.metrics.interested), 0),
    interested: sum('interested'),
    inboxCount: inbox.length,
    inboxUnread: inbox.filter((i) => !i.viewed).length,
    credits: creditAccount(store, actor),
  };
};
