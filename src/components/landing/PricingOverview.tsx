import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { PLANS } from '../../data/marketHubCatalog';
import { CONTRACTOR_TIER_CONFIG, TIER_CONFIG } from '../../data/supplierTypes';

type Segment = 'suppliers' | 'contractors';

interface PlanCard {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  features: string[];
  highlighted?: boolean;
}

const formatStorage = (mb: number) => (mb >= 1024 ? `${Math.round(mb / 1024)} GB document storage` : `${mb} MB document storage`);

const isInheritLine = (f: string) => /^All Free .* features$/.test(f);

const unique = (items: string[]) => Array.from(new Set(items));

const personalPlan: PlanCard = {
  name: 'Personal / Buyer',
  tagline: 'Your own SOKO identity and network',
  price: 'Free',
  priceNote: 'For individual professionals',
  features: ['Digital business card', 'Personal network and saved contacts', 'Product discovery', ...PLANS.free_buyer.features],
};

const supplierPlans: PlanCard[] = [
  {
    name: TIER_CONFIG.free.label,
    tagline: TIER_CONFIG.free.tagline,
    price: 'Free',
    priceNote: 'For supplier companies',
    features: unique([
      ...PLANS.free_supplier.features,
      `Up to ${TIER_CONFIG.free.listingLimit} product listings`,
      `Up to ${TIER_CONFIG.free.teamSeats} team members`,
    ]),
  },
  {
    name: TIER_CONFIG.premium.label,
    tagline: TIER_CONFIG.premium.tagline,
    price: 'Coming soon',
    priceNote: 'Pricing not yet published',
    highlighted: true,
    features: unique([
      `Everything in ${TIER_CONFIG.free.label}`,
      ...PLANS.supplier_pro.features.filter((f) => !isInheritLine(f)),
      `Up to ${TIER_CONFIG.premium.listingLimit} product listings`,
      `Up to ${TIER_CONFIG.premium.teamSeats} team members`,
      formatStorage(TIER_CONFIG.premium.storageMb),
    ]),
  },
];

const contractorPlans: PlanCard[] = [
  {
    name: CONTRACTOR_TIER_CONFIG.free.label,
    tagline: CONTRACTOR_TIER_CONFIG.free.tagline,
    price: 'Free',
    priceNote: 'For contractor companies',
    features: unique([...CONTRACTOR_TIER_CONFIG.free.features, ...PLANS.free_contractor.features]),
  },
  {
    name: CONTRACTOR_TIER_CONFIG.premium.label,
    tagline: CONTRACTOR_TIER_CONFIG.premium.tagline,
    price: 'Coming soon',
    priceNote: 'Pricing not yet published',
    highlighted: true,
    features: unique([
      `Everything in ${CONTRACTOR_TIER_CONFIG.free.label}`,
      ...CONTRACTOR_TIER_CONFIG.premium.features,
      ...PLANS.contractor_premium.features.filter((f) => !isInheritLine(f)),
    ]),
  },
];

const PlanColumn: React.FC<{ plan: PlanCard }> = ({ plan }) => (
  <li className={`rounded-xl border p-4 ${plan.highlighted ? 'border-soko-ink' : 'border-soko-line'}`}>
    <div className="flex items-baseline justify-between gap-3">
      <h4 className="font-semibold text-soko-ink">{plan.name}</h4>
      <span className={`shrink-0 text-sm font-semibold ${plan.price === 'Free' ? 'text-soko-blue' : 'text-soko-muted'}`}>{plan.price}</span>
    </div>
    <p className="mt-0.5 text-xs text-soko-muted">{plan.priceNote}</p>
    <ul className="mt-3 flex flex-col gap-1.5">
      {plan.features.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm leading-relaxed text-soko-ink">
          <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-soko-blue" aria-hidden="true" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  </li>
);

export const PlanDetails: React.FC = () => {
  const [segment, setSegment] = useState<Segment>('suppliers');
  const plans = segment === 'suppliers' ? supplierPlans : contractorPlans;

  return (
    <div className="rounded-2xl border border-soko-line bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-soko-muted">Plan features reflect the current product and may change before launch.</p>
        <div role="radiogroup" aria-label="Company type" className="inline-flex rounded-lg border border-soko-line bg-soko-mist p-1">
          {(['suppliers', 'contractors'] as Segment[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={segment === s}
              onClick={() => setSegment(s)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                segment === s ? 'bg-white text-soko-ink shadow-sm' : 'text-soko-muted hover:text-soko-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        <PlanColumn plan={personalPlan} />
        {plans.map((p) => (
          <PlanColumn key={p.name} plan={p} />
        ))}
      </ul>
      <p className="mt-3 text-xs text-soko-muted">Enterprise plans: contact details coming soon.</p>
    </div>
  );
};
