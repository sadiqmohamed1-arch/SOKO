import { BUYER_POOL, BuyerRecipient, SUPPLIER_POOL, SupplierRecipient } from './marketHubCatalog';
import { BuyerAudienceFilter, BuyerPreferences, Campaign, CampaignKind, SupplierAudienceFilter } from './marketHubTypes';

export const EMPTY_SUPPLIER_AUDIENCE: SupplierAudienceFilter = { categories: [], subcategories: [], supplierTypes: [], emirates: [], verifiedOnly: false, keywords: '' };
export const EMPTY_BUYER_AUDIENCE: BuyerAudienceFilter = { categories: [], emirates: [], roles: [], companyTypes: [], productInterests: '' };

const tokens = (q: string) =>
  q
    .toLowerCase()
    .split(/[^a-z0-9&]+/)
    .filter((t) => t.length > 2);

const overlaps = (a: string[], b: string[]) => a.some((x) => b.includes(x));

export const matchSupplierAudience = (f: SupplierAudienceFilter, excludeId?: string): SupplierRecipient[] => {
  if (!f.categories.length) return [];
  const kw = tokens(f.keywords);
  return SUPPLIER_POOL.filter(
    (s) =>
      s.id !== excludeId &&
      overlaps(s.categories, f.categories) &&
      (!f.subcategories.length || overlaps(s.subcategories, f.subcategories)) &&
      (!f.supplierTypes.length || overlaps(s.types, f.supplierTypes)) &&
      (!f.emirates.length || f.emirates.includes(s.emirate)) &&
      (!f.verifiedOnly || s.verified) &&
      (!kw.length || kw.some((t) => s.keywords.includes(t) || s.companyName.toLowerCase().includes(t)))
  );
};

export const buyerRecipients = (prefs: Record<string, BuyerPreferences>): BuyerRecipient[] => [
  ...Object.entries(prefs).map(([id, p]) => ({ id, ...p })),
  ...BUYER_POOL,
];

export const matchBuyerAudience = (f: BuyerAudienceFilter, prefs: Record<string, BuyerPreferences>, senderId: string): BuyerRecipient[] => {
  if (!f.categories.length) return [];
  const kw = tokens(f.productInterests);
  return buyerRecipients(prefs).filter((b) => {
    const interests = [...b.followedCategories, ...b.interestedCategories];
    return (
      b.promoOptIn &&
      !b.mutedSenders.includes(senderId) &&
      overlaps(interests, f.categories) &&
      (!f.emirates.length || f.emirates.includes(b.emirate)) &&
      (!f.roles.length || f.roles.includes(b.role)) &&
      (!f.companyTypes.length || f.companyTypes.includes(b.companyType)) &&
      (!kw.length || kw.some((t) => interests.join(' ').toLowerCase().includes(t)))
    );
  });
};

export const audienceIds = (c: Pick<Campaign, 'kind' | 'supplierAudience' | 'buyerAudience' | 'ownerWorkspaceId'>, prefs: Record<string, BuyerPreferences>): string[] =>
  c.kind === 'sourcing'
    ? matchSupplierAudience(c.supplierAudience ?? EMPTY_SUPPLIER_AUDIENCE, c.ownerWorkspaceId).map((s) => s.id)
    : matchBuyerAudience(c.buyerAudience ?? EMPTY_BUYER_AUDIENCE, prefs, c.ownerWorkspaceId).map((b) => b.id);

export const creditsFor = (audience: number) => (audience === 0 ? 0 : Math.max(5, Math.ceil(audience / 5)));

export const RECIPIENT_WEEKLY_CAP: Record<CampaignKind, number> = { sourcing: 8, promotion: 2 };
