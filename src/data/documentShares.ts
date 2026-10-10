import type { CompanyDocument, DocumentShare } from './supplierTypes';

export interface ShareTarget {
  id: string;
  profile: { tradingName: string };
}

/**
 * Shares created after company IDs were introduced match on ID only, so a rename
 * or a same-named company can never inherit access. Older saved shares without an
 * ID fall back to the trading name they were created with.
 */
export const shareIsFor = (share: DocumentShare, target: ShareTarget) =>
  share.companyId ? share.companyId === target.id : share.company === target.profile.tradingName;

export const findValidShare = (doc: CompanyDocument, target: ShareTarget) =>
  doc.shares.find((s) => shareIsFor(s, target) && new Date(s.until) > new Date());

export const findShareFor = (doc: CompanyDocument, target: ShareTarget) => doc.shares.find((s) => shareIsFor(s, target));

export const isShareExpired = (doc: CompanyDocument, target: ShareTarget) => {
  const share = findShareFor(doc, target);
  return !!share && new Date(share.until) <= new Date();
};
