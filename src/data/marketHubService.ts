import { DEFAULT_BUYER_PREFS, DEMO_COMPANY_NAMES, buyerCompanyName, PLANS, TRADE_CATEGORIES, UPGRADE_PATHS, WORKSPACES, promoTypeLabel, supplierRecipient } from './marketHubCatalog';
import { RECIPIENT_WEEKLY_CAP, audienceIds, creditsFor } from './marketHubAudience';
import { STORE_VERSION, buildDemoStore } from './marketHubDemo';
import {
  Actor,
  Campaign,
  CampaignDraftInput,
  CampaignEventType,
  CampaignKind,
  CampaignMetrics,
  CampaignResponse,
  InboxItem,
  MarketHubStore,
  MarketOpportunity,
  OpportunityView,
  OwnerCampaignView,
  PlanId,
  ResponseAvailability,
  ServiceResult,
} from './marketHubTypes';

const STORE_KEY = 'soko_market_hub_v1';
const DAY = 86_400_000;
const WEEK = 7 * DAY;
const REPORT_FLAG_THRESHOLD = 3;
const DUPLICATE_WINDOW_DAYS = 14;

const now = () => new Date().toISOString();
const newId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ok = <T,>(store: MarketHubStore, value: T): ServiceResult<T> => ({ ok: true, store, value });
const fail = (error: string): ServiceResult<never> => ({ ok: false, error });
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const loadMarketStore = (): MarketHubStore => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MarketHubStore;
      if (parsed?.version === STORE_VERSION && Array.isArray(parsed.opportunities) && Array.isArray(parsed.campaigns)) return parsed;
    }
  } catch {
    // fall through to demo seed
  }
  return buildDemoStore();
};

export const saveMarketStore = (store: MarketHubStore) => localStorage.setItem(STORE_KEY, JSON.stringify(store));

export const resetMarketStore = () => {
  localStorage.removeItem(STORE_KEY);
  return buildDemoStore();
};

export type AppRole = keyof typeof WORKSPACES;

export const actorFor = (store: MarketHubStore, role: AppRole): Actor => {
  const workspace = WORKSPACES[role];
  // A personal workspace can never carry a company plan, whatever is stored.
  const plan: PlanId =
    workspace.kind === 'personal_buyer' ? 'free_buyer' : workspace.kind === 'soko_admin' ? 'platform' : store.workspacePlans[workspace.id] ?? UPGRADE_PATHS[workspace.kind][0];
  return { workspace, plan, entitlements: PLANS[plan].entitlements };
};

const companyLabel = (wsId: string) =>
  Object.values(WORKSPACES).find((w) => w.id === wsId)?.companyName ?? DEMO_COMPANY_NAMES[wsId] ?? supplierRecipient(wsId)?.companyName ?? buyerCompanyName(wsId) ?? 'SOKO member';

const updateOpp = (store: MarketHubStore, id: string, fn: (o: MarketOpportunity) => MarketOpportunity): MarketHubStore => ({
  ...store,
  opportunities: store.opportunities.map((o) => (o.id === id ? fn(o) : o)),
});

const updateCampaign = (store: MarketHubStore, id: string, fn: (c: Campaign) => Campaign): MarketHubStore => ({
  ...store,
  campaigns: store.campaigns.map((c) => (c.id === id ? fn(c) : c)),
});

/* ---------- Free opportunities ---------- */

export const opportunityView = (o: MarketOpportunity, actor: Actor): OpportunityView => {
  const isMine = o.publisherWorkspaceId === actor.workspace.id;
  const mine = o.interests.find((i) => i.workspaceId === actor.workspace.id);
  const connected = mine?.status === 'connected';
  const identityVisible = isMine || connected || o.identity === 'public';
  const contactVisible = isMine || connected || (o.identity === 'public' && o.contactVisibility === 'members');
  return {
    id: o.id,
    title: o.title,
    type: o.type,
    category: o.category,
    subcategory: o.subcategory,
    location: o.location,
    description: o.description,
    scope: o.scope,
    requiredBy: o.requiredBy,
    responseDeadline: o.responseDeadline,
    urgency: o.urgency,
    attachmentName: o.attachmentName,
    postedAt: o.postedAt,
    status: o.status,
    publisherDisplay: identityVisible ? o.publisherLabel : 'Confidential Buyer',
    isConfidential: o.identity === 'confidential',
    contact: contactVisible ? { name: o.contactName, email: o.contactEmail, phone: o.contactPhone } : null,
    projectName: identityVisible ? o.projectName : undefined,
    interestedCount: (o.demoInterestCount ?? 0) + o.interests.length,
    isMine,
    saved: o.savedBy.includes(actor.workspace.id),
    myInterest: mine ? { status: mine.status, message: mine.message } : undefined,
    interests: isMine ? o.interests : undefined,
  };
};

export const listOpportunities = (store: MarketHubStore, actor: Actor) => store.opportunities.map((o) => opportunityView(o, actor));

export interface OpportunityInput {
  title: string;
  type: MarketOpportunity['type'];
  category: string;
  subcategory: string;
  location: string;
  description: string;
  scope?: string;
  requiredBy: string;
  responseDeadline: string;
  urgency: MarketOpportunity['urgency'];
  attachmentName?: string;
  identity: MarketOpportunity['identity'];
  contactVisibility: MarketOpportunity['contactVisibility'];
}

export const postOpportunity = (store: MarketHubStore, actor: Actor, input: OpportunityInput): ServiceResult<string> => {
  if (!actor.entitlements.postOpportunity) return fail('This workspace cannot post opportunities.');
  if (!input.title.trim() || !input.description.trim() || !input.category || !input.location) return fail('Title, category, location and description are required.');
  if (!TRADE_CATEGORIES.includes(input.category)) return fail('Choose a valid trade category.');
  if (input.responseDeadline && input.requiredBy && input.responseDeadline > input.requiredBy) return fail('The response deadline must be on or before the required date.');
  const id = newId('opp');
  const ws = actor.workspace;
  const created: MarketOpportunity = {
    ...input,
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    publisherWorkspaceId: ws.id,
    publisherLabel: ws.companyName ?? ws.personName,
    contactName: ws.personName,
    contactEmail: `${ws.personName.split(' ')[0].toLowerCase()}@${(ws.companyName ?? 'soko-member').toLowerCase().replace(/[^a-z]+/g, '')}.example`,
    contactPhone: '+971 50 000 0000',
    postedAt: now(),
    status: 'open',
    interests: [],
    savedBy: [],
  };
  return ok({ ...store, opportunities: [created, ...store.opportunities] }, id);
};

export const toggleSaveOpportunity = (store: MarketHubStore, actor: Actor, id: string): ServiceResult<boolean> => {
  const o = store.opportunities.find((x) => x.id === id);
  if (!o) return fail('Opportunity not found.');
  const saved = !o.savedBy.includes(actor.workspace.id);
  return ok(updateOpp(store, id, (x) => ({ ...x, savedBy: saved ? [...x.savedBy, actor.workspace.id] : x.savedBy.filter((w) => w !== actor.workspace.id) })), saved);
};

export const expressInterest = (store: MarketHubStore, actor: Actor, id: string, message: string): ServiceResult => {
  const o = store.opportunities.find((x) => x.id === id);
  if (!o) return fail('Opportunity not found.');
  if (!actor.entitlements.expressInterest) return fail('This workspace cannot respond to opportunities.');
  if (o.publisherWorkspaceId === actor.workspace.id) return fail('You published this opportunity.');
  if (o.status !== 'open') return fail('This opportunity is closed.');
  if (o.interests.some((i) => i.workspaceId === actor.workspace.id)) return fail('You have already expressed interest.');
  const entry = { id: newId('int'), workspaceId: actor.workspace.id, companyName: actor.workspace.companyName ?? actor.workspace.personName, message: message.trim(), status: 'interested' as const, at: now() };
  return ok(updateOpp(store, id, (x) => ({ ...x, interests: [...x.interests, entry] })), undefined);
};

export const requestOpportunityConnection = (store: MarketHubStore, actor: Actor, id: string): ServiceResult => {
  const o = store.opportunities.find((x) => x.id === id);
  const mine = o?.interests.find((i) => i.workspaceId === actor.workspace.id);
  if (!o || !mine) return fail('Express interest first.');
  if (!['interested', 'under_review'].includes(mine.status)) return fail('A connection has already been requested.');
  return ok(updateOpp(store, id, (x) => ({ ...x, interests: x.interests.map((i) => (i.id === mine.id ? { ...i, status: 'connection_requested' } : i)) })), undefined);
};

export const reviewInterest = (store: MarketHubStore, actor: Actor, id: string, interestId: string, action: 'review' | 'approve' | 'decline'): ServiceResult => {
  const o = store.opportunities.find((x) => x.id === id);
  if (!o) return fail('Opportunity not found.');
  if (o.publisherWorkspaceId !== actor.workspace.id) return fail('Only the publisher can review interest.');
  const status = { review: 'under_review', approve: 'connected', decline: 'declined' } as const;
  return ok(updateOpp(store, id, (x) => ({ ...x, interests: x.interests.map((i) => (i.id === interestId ? { ...i, status: status[action] } : i)) })), undefined);
};

export const closeOpportunity = (store: MarketHubStore, actor: Actor, id: string): ServiceResult => {
  const o = store.opportunities.find((x) => x.id === id);
  if (!o || o.publisherWorkspaceId !== actor.workspace.id) return fail('Only the publisher can close this opportunity.');
  return ok(updateOpp(store, id, (x) => ({ ...x, status: 'closed' })), undefined);
};

/* ---------- Campaign permissions ---------- */

export const campaignPermission = (actor: Actor, kind: CampaignKind): { allowed: boolean; reason?: string } => {
  const { workspace: ws, entitlements: e } = actor;
  if (ws.kind === 'personal_buyer') return { allowed: false, reason: 'Personal Buyer workspaces cannot publish company campaigns. Switch to an authorised company workspace.' };
  if (ws.kind === 'soko_admin') return { allowed: false, reason: 'SOKO moderators cannot publish campaigns.' };
  if (!['owner', 'campaign_manager'].includes(ws.memberRole)) return { allowed: false, reason: 'Your role in this company does not include campaign publishing.' };
  if (kind === 'sourcing' && ws.kind !== 'contractor') return { allowed: false, reason: 'Sourcing campaigns are for contractor workspaces.' };
  if (kind === 'promotion' && ws.kind !== 'supplier') return { allowed: false, reason: 'Promotional campaigns are for supplier workspaces.' };
  const entitled = kind === 'sourcing' ? e.createSourcingCampaign : e.createPromoCampaign;
  if (!entitled) return { allowed: false, reason: `Your ${PLANS[actor.plan].label} plan does not include ${kind === 'sourcing' ? 'sourcing' : 'promotional'} campaigns.` };
  return { allowed: true };
};

export const campaignKindFor = (actor: Actor): CampaignKind | null =>
  actor.workspace.kind === 'contractor' ? 'sourcing' : actor.workspace.kind === 'supplier' ? 'promotion' : null;

export const estimateAudience = (store: MarketHubStore, actor: Actor, input: CampaignDraftInput) => {
  const ids = audienceIds({ ...input, ownerWorkspaceId: actor.workspace.id }, store.buyerPrefs);
  return { eligible: ids.length, credits: creditsFor(ids.length) };
};

const ownedCampaign = (store: MarketHubStore, actor: Actor, id: string) => {
  const c = store.campaigns.find((x) => x.id === id);
  return c && c.ownerWorkspaceId === actor.workspace.id ? c : undefined;
};

const validateDraft = (input: CampaignDraftInput): string | null => {
  if (!input.title.trim()) return 'Add a campaign title.';
  if (!input.category) return 'Choose a trade category.';
  if (!input.description.trim()) return 'Add a short description.';
  if (!input.responseDeadline) return 'Set a response deadline.';
  if (input.kind === 'sourcing' && (!input.itemRequired?.trim() || !input.deliveryLocation)) return 'Add the material / service required and the delivery location.';
  if (input.kind === 'promotion' && !input.promoType) return 'Choose a promotion type.';
  const audienceCats = input.kind === 'sourcing' ? input.supplierAudience?.categories : input.buyerAudience?.categories;
  if (!audienceCats?.length) return 'Select at least one audience category.';
  if (!audienceCats.includes(input.category)) return 'The audience must include the campaign category, so recipients only get relevant campaigns.';
  if (audienceCats.length > 3) return 'Target at most 3 categories to keep campaigns relevant.';
  return null;
};

export const saveCampaignDraft = (store: MarketHubStore, actor: Actor, input: CampaignDraftInput, id?: string): ServiceResult<string> => {
  const perm = campaignPermission(actor, input.kind);
  if (!perm.allowed) return fail(perm.reason!);
  const { eligible, credits } = estimateAudience(store, actor, input);
  if (id) {
    const existing = ownedCampaign(store, actor, id);
    if (!existing) return fail('Campaign not found in this workspace.');
    if (!['draft', 'rejected'].includes(existing.status)) return fail('Only drafts and rejected campaigns can be edited.');
    return ok(updateCampaign(store, id, (c) => ({ ...c, ...input, status: 'draft', estimatedAudience: eligible, creditsRequired: credits })), id);
  }
  const created: Campaign = {
    ...input,
    id: newId('cmp'),
    ownerWorkspaceId: actor.workspace.id,
    ownerCompany: actor.workspace.companyName ?? actor.workspace.displayName,
    status: 'draft',
    createdAt: now(),
    estimatedAudience: eligible,
    creditsRequired: credits,
    events: [],
    responses: [],
  };
  return ok({ ...store, campaigns: [created, ...store.campaigns] }, created.id);
};

export const submitCampaignForReview = (store: MarketHubStore, actor: Actor, id: string): ServiceResult => {
  const c = ownedCampaign(store, actor, id);
  if (!c) return fail('Campaign not found in this workspace.');
  const perm = campaignPermission(actor, c.kind);
  if (!perm.allowed) return fail(perm.reason!);
  if (!['draft', 'rejected'].includes(c.status)) return fail('This campaign has already been submitted.');
  const invalid = validateDraft(c);
  if (invalid) return fail(invalid);
  const since = Date.now() - DUPLICATE_WINDOW_DAYS * DAY;
  const duplicate = store.campaigns.find(
    (x) =>
      x.id !== c.id &&
      x.ownerWorkspaceId === c.ownerWorkspaceId &&
      ['pending_review', 'approved', 'scheduled', 'active'].includes(x.status) &&
      x.category === c.category &&
      (norm(x.title) === norm(c.title) || norm(x.itemRequired ?? '') === norm(c.itemRequired ?? '__')) &&
      new Date(x.submittedAt ?? x.createdAt).getTime() > since
  );
  if (duplicate) return fail(`A similar campaign ("${duplicate.title}") is already running. Duplicate campaigns are restricted for ${DUPLICATE_WINDOW_DAYS} days.`);
  const { eligible, credits } = estimateAudience(store, actor, c);
  if (!eligible) return fail('No eligible recipients match this audience.');
  return ok(updateCampaign(store, id, (x) => ({ ...x, status: 'pending_review', submittedAt: now(), estimatedAudience: eligible, creditsRequired: credits, reviewNote: undefined })), undefined);
};

export const launchesInLast7Days = (store: MarketHubStore, wsId: string) =>
  store.campaigns.filter((c) => c.ownerWorkspaceId === wsId && c.launchedAt && Date.now() - new Date(c.launchedAt).getTime() < WEEK).length;

export const launchCampaign = (store: MarketHubStore, actor: Actor, id: string): ServiceResult<{ delivered: number; capped: number; scheduled: boolean }> => {
  const c = ownedCampaign(store, actor, id);
  if (!c) return fail('Campaign not found in this workspace.');
  const perm = campaignPermission(actor, c.kind);
  if (!perm.allowed) return fail(perm.reason!);
  if (c.status === 'pending_review') return fail('This campaign is waiting for SOKO review.');
  const scheduledStart = c.status === 'scheduled';
  if (c.status !== 'approved' && !scheduledStart) return fail('Only campaigns approved by SOKO can be launched.');
  const scheduleLater = !scheduledStart && !!c.scheduledFor && new Date(c.scheduledFor).getTime() > Date.now();
  if (scheduleLater) return ok(updateCampaign(store, id, (x) => ({ ...x, status: 'scheduled' })), { delivered: 0, capped: 0, scheduled: true });
  if (launchesInLast7Days(store, actor.workspace.id) >= actor.entitlements.maxLaunchesPer7Days)
    return fail(`Frequency limit reached: your plan allows ${actor.entitlements.maxLaunchesPer7Days} campaign launches per 7 days.`);

  const eligible = audienceIds(c, store.buyerPrefs);
  const cap = RECIPIENT_WEEKLY_CAP[c.kind];
  const recentLoad = new Map<string, number>();
  store.campaigns
    .filter((x) => x.kind === c.kind && x.launchedAt && Date.now() - new Date(x.launchedAt).getTime() < WEEK)
    .forEach((x) => x.recipientIds?.forEach((r) => recentLoad.set(r, (recentLoad.get(r) ?? 0) + 1)));
  const recipients = eligible.filter((r) => (recentLoad.get(r) ?? 0) < cap);
  const capped = eligible.length - recipients.length;
  const credits = creditsFor(recipients.length);
  const account = store.credits[actor.workspace.id] ?? { available: 0, used: 0 };
  if (!recipients.length) return fail('No recipients can receive this campaign right now.');
  if (account.available < credits) return fail(`Not enough campaign credits: ${credits} required, ${account.available} available.`);

  const next = updateCampaign(store, id, (x) => ({
    ...x,
    status: 'active',
    launchedAt: now(),
    estimatedAudience: eligible.length,
    recipientIds: recipients,
    delivered: recipients.length,
    frequencyCapped: capped,
    creditsUsed: credits,
  }));
  return ok({ ...next, credits: { ...next.credits, [actor.workspace.id]: { available: account.available - credits, used: account.used + credits } } }, { delivered: recipients.length, capped, scheduled: false });
};

export const closeCampaign = (store: MarketHubStore, actor: Actor, id: string): ServiceResult => {
  const c = ownedCampaign(store, actor, id);
  if (!c) return fail('Campaign not found in this workspace.');
  if (c.status !== 'active' && c.status !== 'paused') return fail('Only active or paused campaigns can be closed.');
  return ok(updateCampaign(store, id, (x) => ({ ...x, status: 'completed', closedAt: now() })), undefined);
};

export const setCampaignPaused = (store: MarketHubStore, actor: Actor, id: string, paused: boolean): ServiceResult => {
  const c = ownedCampaign(store, actor, id);
  if (!c) return fail('Campaign not found in this workspace.');
  if (c.status !== (paused ? 'active' : 'paused')) return fail(paused ? 'Only active campaigns can be paused.' : 'Only paused campaigns can be resumed.');
  return ok(updateCampaign(store, id, (x) => ({ ...x, status: paused ? 'paused' : 'active' })), undefined);
};

export const deleteDraft = (store: MarketHubStore, actor: Actor, id: string): ServiceResult => {
  const c = ownedCampaign(store, actor, id);
  if (!c || c.status !== 'draft') return fail('Only your own drafts can be discarded.');
  return ok({ ...store, campaigns: store.campaigns.filter((x) => x.id !== id) }, undefined);
};

export const draftInputOf = (c: CampaignDraftInput): CampaignDraftInput => ({
  kind: c.kind,
  title: c.title,
  category: c.category,
  subcategory: c.subcategory,
  description: c.description,
  itemRequired: c.itemRequired,
  quantity: c.quantity,
  unit: c.unit,
  deliveryLocation: c.deliveryLocation,
  requiredDate: c.requiredDate,
  attachmentName: c.attachmentName,
  identity: c.identity,
  promoType: c.promoType,
  offerHighlight: c.offerHighlight,
  responseDeadline: c.responseDeadline,
  scheduledFor: c.scheduledFor,
  supplierAudience: c.supplierAudience,
  buyerAudience: c.buyerAudience,
});

export const duplicateCampaign = (store: MarketHubStore, actor: Actor, id: string): ServiceResult<string> => {
  const c = ownedCampaign(store, actor, id);
  if (!c) return fail('Campaign not found in this workspace.');
  const deadline = new Date(Math.max(Date.now() + 14 * DAY, new Date(c.responseDeadline).getTime())).toISOString().slice(0, 10);
  return saveCampaignDraft(store, actor, { ...draftInputOf(c), title: `${c.title} (copy)`, responseDeadline: deadline, scheduledFor: undefined });
};

/* ---------- Owner response management ---------- */

export const updateResponse = (store: MarketHubStore, actor: Actor, id: string, responseId: string, action: 'shortlist' | 'connect'): ServiceResult => {
  const c = ownedCampaign(store, actor, id);
  if (!c) return fail('Campaign not found in this workspace.');
  if (!c.responses.some((r) => r.id === responseId)) return fail('Response not found.');
  return ok(
    updateCampaign(store, id, (x) => ({
      ...x,
      responses: x.responses.map((r) => (r.id !== responseId ? r : action === 'shortlist' ? { ...r, shortlisted: !r.shortlisted } : { ...r, connectRequested: true })),
    })),
    undefined
  );
};

const uniqueCount = (c: Campaign, type: CampaignEventType) => new Set(c.events.filter((e) => e.type === type).map((e) => e.recipientId)).size;

export const campaignMetrics = (c: Campaign): CampaignMetrics => {
  const b = c.demoBaseline;
  // A non-zero demo baseline is a labelled snapshot that stands in for the simulated delivery count.
  const delivered = b?.delivered ? b.delivered : c.delivered ?? 0;
  const responded = c.responses.length;
  const start = c.launchedAt ? new Date(c.launchedAt).getTime() : null;
  const end = c.closedAt ? new Date(c.closedAt).getTime() : Date.now();
  return {
    eligible: c.estimatedAudience,
    delivered,
    viewed: uniqueCount(c, 'view') + (b?.viewed ?? 0),
    clicked: uniqueCount(c, 'click') + (b?.clicked ?? 0),
    interested: uniqueCount(c, 'interested') + (b?.interested ?? 0),
    responded,
    declined: uniqueCount(c, 'declined') + (b?.declined ?? 0),
    shortlisted: c.responses.filter((r) => r.shortlisted).length,
    reports: uniqueCount(c, 'report'),
    responseRate: delivered ? Math.round((responded / delivered) * 100) : 0,
    durationDays: start ? Math.max(1, Math.round((end - start) / DAY)) : 0,
    creditsUsed: c.creditsUsed ?? 0,
    includesDemoValues: !!b || c.responses.some((r) => r.demo),
  };
};

const ownerView = (c: Campaign): OwnerCampaignView => {
  const { recipientIds: _r, events, ...campaign } = c;
  const disclosedInterests = events
    .filter((e) => e.type === 'interested' && e.shareIdentity)
    .map((e) => ({ companyName: supplierRecipient(e.recipientId)?.companyName ?? companyLabel(e.recipientId), personName: '', at: e.at }));
  return { campaign, metrics: campaignMetrics(c), disclosedInterests };
};

export const ownerCampaigns = (store: MarketHubStore, actor: Actor): OwnerCampaignView[] =>
  store.campaigns.filter((c) => c.ownerWorkspaceId === actor.workspace.id).map(ownerView);

/* ---------- Recipient side ---------- */

const isRecipient = (c: Campaign, actor: Actor) => !!c.recipientIds?.includes(actor.workspace.id);

const hiddenForRecipient = (store: MarketHubStore, c: Campaign, wsId: string) => {
  if (c.kind !== 'promotion') return false;
  const prefs = store.buyerPrefs[wsId];
  return !prefs?.promoOptIn || prefs.mutedSenders.includes(c.ownerWorkspaceId);
};

export const inboxFor = (store: MarketHubStore, actor: Actor): InboxItem[] => {
  const ws = actor.workspace.id;
  return store.campaigns
    .filter((c) => ['active', 'completed'].includes(c.status) && isRecipient(c, actor) && !hiddenForRecipient(store, c, ws))
    .filter((c) => (c.kind === 'sourcing' ? actor.entitlements.receiveSourcing : actor.entitlements.receivePromotions))
    .map((c) => {
      const has = (t: CampaignEventType) => c.events.some((e) => e.recipientId === ws && e.type === t);
      const interested = has('interested');
      const savedCount = c.events.filter((e) => e.recipientId === ws && e.type === 'saved').length;
      return {
        id: c.id,
        kind: c.kind,
        title: c.title,
        typeLabel: c.kind === 'sourcing' ? 'Sourcing Requirement' : promoTypeLabel(c.promoType),
        senderDisplay: c.identity === 'confidential' ? 'Confidential Buyer' : c.ownerCompany,
        senderSupplierId: c.kind === 'promotion' ? supplierRecipient(c.ownerWorkspaceId)?.supplierId : undefined,
        category: c.category,
        subcategory: c.subcategory,
        location: c.deliveryLocation ?? (c.buyerAudience?.emirates.join(', ') || 'UAE'),
        summary: c.kind === 'sourcing' ? [c.itemRequired, c.quantity && `${c.quantity} ${c.unit ?? ''}`.trim()].filter(Boolean).join(' · ') : c.offerHighlight ?? c.description,
        description: c.description,
        quantity: c.quantity,
        unit: c.unit,
        requiredDate: c.requiredDate,
        attachmentName: c.attachmentName,
        offerHighlight: c.offerHighlight,
        date: c.launchedAt ?? c.createdAt,
        expiry: c.responseDeadline,
        viewed: has('view'),
        interested,
        declined: has('declined'),
        saved: savedCount % 2 === 1,
        reported: has('report'),
        responded: c.responses.some((r) => r.responderId === ws),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
};

export const recordRecipientEvent = (
  store: MarketHubStore,
  actor: Actor,
  id: string,
  type: CampaignEventType,
  extra?: { shareIdentity?: boolean; reason?: string }
): ServiceResult => {
  const c = store.campaigns.find((x) => x.id === id);
  if (!c || !isRecipient(c, actor)) return fail('This campaign was not delivered to your workspace.');
  const ws = actor.workspace.id;
  const already = c.events.some((e) => e.recipientId === ws && e.type === type);
  if (type !== 'saved' && already) return ok(store, undefined);
  if (type === 'interested' && c.events.some((e) => e.recipientId === ws && e.type === 'declined')) return fail('You declined this campaign.');
  if (type === 'declined' && c.responses.some((r) => r.responderId === ws)) return fail('You already responded to this campaign.');
  let next = updateCampaign(store, id, (x) => ({ ...x, events: [...x.events, { recipientId: ws, type, at: now(), ...extra }] }));
  if (type === 'report') {
    const reports = uniqueCount(next.campaigns.find((x) => x.id === id)!, 'report');
    if (reports >= REPORT_FLAG_THRESHOLD && c.status === 'active') next = updateCampaign(next, id, (x) => ({ ...x, reviewNote: 'Flagged for SOKO review after recipient reports.' }));
  }
  return ok(next, undefined);
};

export interface ResponseInput {
  message: string;
  availability: ResponseAvailability;
  leadTime: string;
  quotationName?: string;
  techDocName?: string;
}

export const submitCampaignResponse = (store: MarketHubStore, actor: Actor, id: string, input: ResponseInput): ServiceResult => {
  const c = store.campaigns.find((x) => x.id === id);
  if (!c || !isRecipient(c, actor)) return fail('This campaign was not delivered to your workspace.');
  if (c.kind !== 'sourcing') return fail('Responses are only for sourcing requirements.');
  if (c.status !== 'active') return fail('This campaign is no longer accepting responses.');
  if (c.responses.some((r) => r.responderId === actor.workspace.id)) return fail('You have already responded.');
  if (!input.message.trim() || !input.leadTime.trim()) return fail('Add a short message and an approximate lead time.');
  const profile = supplierRecipient(actor.workspace.id);
  const created: CampaignResponse = {
    id: newId('rsp'),
    responderId: actor.workspace.id,
    companyName: actor.workspace.companyName ?? actor.workspace.displayName,
    category: profile?.categories.find((x) => x === c.category) ?? profile?.categories[0] ?? c.category,
    location: profile?.emirate ?? actor.workspace.emirate,
    verified: !!profile?.verified,
    ...input,
    message: input.message.trim(),
    at: now(),
    shortlisted: false,
    connectRequested: false,
  };
  return ok(updateCampaign(store, id, (x) => ({ ...x, responses: [...x.responses, created] })), undefined);
};

export const myResponse = (store: MarketHubStore, actor: Actor, id: string) => {
  const r = store.campaigns.find((x) => x.id === id)?.responses.find((x) => x.responderId === actor.workspace.id);
  return r ? { status: r.shortlisted ? 'Shortlisted' : 'Submitted', at: r.at, connectRequested: r.connectRequested } : null;
};

export const promoPrefs = (store: MarketHubStore, actor: Actor) => store.buyerPrefs[actor.workspace.id];

export const muteSender = (store: MarketHubStore, actor: Actor, campaignId: string): ServiceResult<string> => {
  const c = store.campaigns.find((x) => x.id === campaignId);
  const prefs = store.buyerPrefs[actor.workspace.id];
  if (!c || !prefs || !isRecipient(c, actor)) return fail('Not available for this workspace.');
  const mutedSenders = Array.from(new Set([...prefs.mutedSenders, c.ownerWorkspaceId]));
  return ok({ ...store, buyerPrefs: { ...store.buyerPrefs, [actor.workspace.id]: { ...prefs, mutedSenders } } }, c.ownerCompany);
};

export const setPromoOptIn = (store: MarketHubStore, actor: Actor, optIn: boolean): ServiceResult => {
  const prefs = store.buyerPrefs[actor.workspace.id] ?? DEFAULT_BUYER_PREFS[actor.workspace.id];
  if (!prefs) return fail('Promotion preferences are not available for this workspace.');
  return ok({ ...store, buyerPrefs: { ...store.buyerPrefs, [actor.workspace.id]: { ...prefs, promoOptIn: optIn } } }, undefined);
};

export const unmuteAll = (store: MarketHubStore, actor: Actor): ServiceResult => {
  const prefs = store.buyerPrefs[actor.workspace.id];
  if (!prefs) return fail('Not available for this workspace.');
  return ok({ ...store, buyerPrefs: { ...store.buyerPrefs, [actor.workspace.id]: { ...prefs, mutedSenders: [] } } }, undefined);
};

export const mutedSenderNames = (store: MarketHubStore, actor: Actor) => (store.buyerPrefs[actor.workspace.id]?.mutedSenders ?? []).map(companyLabel);

/* ---------- Plans & credits ---------- */

export const creditAccount = (store: MarketHubStore, actor: Actor) => store.credits[actor.workspace.id] ?? { available: 0, used: 0 };

export const activateDemoPlan = (store: MarketHubStore, actor: Actor, plan: PlanId): ServiceResult => {
  const ws = actor.workspace;
  if (!UPGRADE_PATHS[ws.kind].includes(plan)) return fail('This plan is not available for this workspace.');
  if (ws.memberRole !== 'owner' && ws.memberRole !== 'campaign_manager') return fail('Only company owners can change the plan.');
  const account = creditAccount(store, actor);
  const monthly = PLANS[plan].entitlements.monthlyCredits;
  return ok(
    {
      ...store,
      workspacePlans: { ...store.workspacePlans, [ws.id]: plan },
      credits: { ...store.credits, [ws.id]: { ...account, available: Math.max(account.available, monthly) } },
    },
    undefined
  );
};

/* ---------- Moderation ---------- */

export interface ModerationItem {
  campaign: Omit<Campaign, 'recipientIds' | 'events'>;
  metrics: CampaignMetrics;
  reports: { reason: string; at: string }[];
  relevance: { ok: boolean; notes: string[] };
}

const relevanceCheck = (c: Campaign) => {
  const notes: string[] = [];
  const cats = c.kind === 'sourcing' ? c.supplierAudience?.categories ?? [] : c.buyerAudience?.categories ?? [];
  if (!cats.includes(c.category)) notes.push('Audience does not include the campaign category.');
  if (cats.length > 3) notes.push(`Targets ${cats.length} categories (max 3).`);
  if (c.description.trim().length < 40) notes.push('Description is too short to be specific.');
  if (/best price|everything|cheapest|!!/i.test(`${c.title} ${c.description}`)) notes.push('Generic promotional wording.');
  return { ok: notes.length === 0, notes };
};

export const moderationQueue = (store: MarketHubStore, actor: Actor): ModerationItem[] => {
  if (!actor.entitlements.moderate) return [];
  return store.campaigns
    .filter((c) => c.status !== 'draft')
    .map((c) => {
      const { recipientIds: _r, events, ...campaign } = c;
      return {
        campaign,
        metrics: campaignMetrics(c),
        reports: events.filter((e) => e.type === 'report').map((e) => ({ reason: e.reason ?? 'No reason given', at: e.at })),
        relevance: relevanceCheck(c),
      };
    });
};

export const moderateCampaign = (store: MarketHubStore, actor: Actor, id: string, action: 'approve' | 'reject' | 'suspend', note: string): ServiceResult => {
  if (!actor.entitlements.moderate) return fail('Only SOKO administrators can moderate campaigns.');
  const c = store.campaigns.find((x) => x.id === id);
  if (!c) return fail('Campaign not found.');
  if ((action === 'approve' || action === 'reject') && c.status !== 'pending_review') return fail('Only campaigns pending review can be approved or rejected.');
  if (action === 'suspend' && !['approved', 'scheduled', 'active', 'paused'].includes(c.status)) return fail('Only approved, scheduled or active campaigns can be suspended.');
  if (action === 'reject' && !note.trim()) return fail('Add a reason so the company can fix the campaign.');
  const status = { approve: 'approved', reject: 'rejected', suspend: 'suspended' } as const;
  return ok(updateCampaign(store, id, (x) => ({ ...x, status: status[action], reviewedAt: now(), reviewNote: note.trim() || undefined })), undefined);
};

/* ---------- Market signals ---------- */

export interface MarketSignal {
  category: string;
  opportunities: number;
  campaigns: number;
  recent: number;
  trend: 'up' | 'steady' | 'down';
}

export const marketSignals = (store: MarketHubStore): MarketSignal[] => {
  const t = Date.now();
  const age = (iso: string) => (t - new Date(iso).getTime()) / DAY;
  const rows = TRADE_CATEGORIES.map((category) => {
    const opps = store.opportunities.filter((o) => o.category === category && o.status === 'open');
    const camps = store.campaigns.filter((c) => c.category === category && c.status === 'active');
    const dates = [...opps.map((o) => o.postedAt), ...camps.map((c) => c.launchedAt ?? c.createdAt)];
    const recent = dates.filter((d) => age(d) <= 7).length;
    const prior = dates.filter((d) => age(d) > 7 && age(d) <= 14).length;
    return { category, opportunities: opps.length, campaigns: camps.length, recent, trend: recent > prior ? 'up' : recent < prior ? 'down' : 'steady' } as MarketSignal;
  });
  return rows.filter((r) => r.opportunities + r.campaigns > 0).sort((a, b) => b.recent - a.recent || b.opportunities + b.campaigns - (a.opportunities + a.campaigns)).slice(0, 5);
};
