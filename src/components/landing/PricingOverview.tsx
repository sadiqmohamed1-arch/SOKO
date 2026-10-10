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

const Card: React.FC<{ plan: PlanCard; onSelect: () => void }> = ({ plan, onSelect }) => (
  <li className={`flex flex-col rounded-2xl border p-6 sm:p-7 ${plan.highlighted ? 'border-soko-ink bg-soko-ink text-white' : 'border-soko-line bg-white text-soko-ink'}`}>
    <h3 className="text-lg font-semibold">{plan.name}</h3>
    <p className={`mt-1 text-sm leading-relaxed ${plan.highlighted ? 'text-white/70' : 'text-soko-muted'}`}>{plan.tagline}</p>
    <p className="mt-6 font-[Outfit] text-3xl font-bold tracking-tight">{plan.price}</p>
    <p className={`text-sm ${plan.highlighted ? 'text-white/70' : 'text-soko-muted'}`}>{plan.priceNote}</p>

    <ul className="mt-6 flex flex-1 flex-col gap-2.5">
      {plan.features.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed">
          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? 'text-white' : 'text-soko-blue'}`} aria-hidden="true" />
          <span>{f}</span>
        </li>
      ))}
    </ul>

    <button
      type="button"
      onClick={onSelect}
      className={`mt-8 rounded-lg py-3 text-sm font-semibold transition-colors ${
        plan.highlighted ? 'bg-white text-soko-ink hover:bg-white/90' : 'bg-soko-blue text-white hover:bg-soko-blue/90'
      }`}
    >
      {plan.price === 'Free' ? 'Get started free' : 'Join and register interest'}
    </button>
  </li>
);

export const PricingOverview: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  const [segment, setSegment] = useState<Segment>('suppliers');
  const plans = segment === 'suppliers' ? supplierPlans : contractorPlans;

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-20 border-t border-soko-line py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-soko-blue">Pricing</p>
            <h2 id="pricing-heading" className="mt-2 text-4xl font-bold tracking-tight text-soko-ink text-balance">
              Start free. Upgrade when your company needs more.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-soko-muted text-pretty">
              Personal accounts are free. Company workspaces start on a free plan, and Premium pricing will be published before launch.
            </p>
          </div>

          <div role="radiogroup" aria-label="Company type" className="inline-flex w-full rounded-lg border border-soko-line bg-white p-1 sm:w-auto">
            {(['suppliers', 'contractors'] as Segment[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={segment === s}
                onClick={() => setSegment(s)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold capitalize transition-colors sm:flex-none ${
                  segment === s ? 'bg-soko-ink text-white' : 'text-soko-muted hover:text-soko-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          <Card plan={personalPlan} onSelect={onGetStarted} />
          {plans.map((p) => (
            <Card key={p.name} plan={p} onSelect={onGetStarted} />
          ))}
        </ul>

        <p className="mt-6 text-sm text-soko-muted">
          Plan features reflect the current product and may change before launch. Need something larger?{' '}
          <span className="font-medium text-soko-ink">Enterprise plans: contact details coming soon.</span>
        </p>
      </div>
    </section>
  );
};
