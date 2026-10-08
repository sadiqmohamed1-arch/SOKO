import { CompanyContact, CompanyDocument, CompanyProduct, CompanyRecord } from './supplierTypes';
import { documentExpiry } from './supplierStore';

const seedOf = (id: string) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 17);

const wave = (seed: number, i: number, base: number, growth: number) => Math.round(base * (1 + growth * i) * (0.82 + ((seed * (i + 3)) % 37) / 100));

export const weeklySeries = (c: CompanyRecord, weeks = 12) => {
  const seed = seedOf(c.id);
  const base = c.tier === 'premium' ? 180 : 42;
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(Date.now() - (weeks - 1 - i) * 7 * 86400000);
    return {
      week: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      profileViews: wave(seed, i, base, 0.05),
      productViews: wave(seed + 7, i, base * 2.4, 0.06),
      connections: Math.max(0, Math.round(wave(seed + 3, i, c.tier === 'premium' ? 6 : 2, 0.04))),
    };
  });
};

export const supplierKpis = (c: CompanyRecord, products: CompanyProduct[], contacts: CompanyContact[]) => {
  const series = weeklySeries(c, 4);
  return {
    profileViews: series.reduce((n, w) => n + w.profileViews, 0),
    productViews: products.reduce((n, p) => n + p.views, 0),
    connections: contacts.filter((x) => x.kind === 'connection').length,
    incoming: contacts.filter((x) => x.kind === 'incoming').length,
  };
};

export const categoryEngagement = (products: CompanyProduct[]) => {
  const map = new Map<string, { views: number; enquiries: number }>();
  products.forEach((p) => {
    const key = p.collection || p.type;
    const cur = map.get(key) ?? { views: 0, enquiries: 0 };
    map.set(key, { views: cur.views + p.views, enquiries: cur.enquiries + p.enquiries });
  });
  return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.views - a.views).slice(0, 6);
};

export const geographicInterest = (c: CompanyRecord) => {
  const seed = seedOf(c.id);
  const emirates = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Ajman', 'Al Ain'];
  const weights = emirates.map((e, i) => (e === c.profile.emirate ? 40 : 6 + ((seed * (i + 2)) % 19)));
  const total = weights.reduce((a, b) => a + b, 0);
  return emirates.map((name, i) => ({ name, share: Math.round((weights[i] / total) * 100) })).sort((a, b) => b.share - a.share);
};

export const documentCompliance = (docs: CompanyDocument[]) => {
  const live = docs.filter((d) => !d.archived && d.expiry);
  return {
    tracked: live.length,
    valid: live.filter((d) => documentExpiry(d) === 'valid').length,
    reminder: live.filter((d) => documentExpiry(d) === 'reminder').length,
    expired: live.filter((d) => documentExpiry(d) === 'expired').length,
  };
};
