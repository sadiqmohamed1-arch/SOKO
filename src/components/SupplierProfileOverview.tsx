import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import {
  BuyerSupplier,
  SupplierProduct,
  activeCertifications,
  formatDate,
  intelligenceSignals,
  supplierLocation,
  supplierMarkets,
  supplierTypeLine,
  tradeLicenseLabel,
} from '../data/buyerSuppliers';
import { ContactActions } from './ContactSupplierModal';
import { ExternalSourceBadge, InfoTooltip, INTELLIGENCE_EXPLAINER } from './SupplierTrust';
import { Panel } from './SupplierProfileTabs';
import type { ProfileTab } from './BuyerSupplierProfile';

const PREVIEW_PRODUCTS = 4;
const PREVIEW_CONTACTS = 2;

const LinkButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="group inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
  >
    {children}
    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
  </button>
);

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[11px] text-slate-500">{label}</dt>
    <dd className="mt-0.5 text-sm font-semibold text-slate-900 break-words">{children}</dd>
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0">
    <dt className="text-sm text-slate-500">{label}</dt>
    <dd className="text-sm font-semibold text-slate-900 text-right">{children}</dd>
  </div>
);

const docStatus = (p: SupplierProduct) =>
  p.technicalDatasheet
    ? { label: 'Technical Datasheet Available', cls: 'text-emerald-700' }
    : p.certifications
      ? { label: 'Documentation Available', cls: 'text-emerald-700' }
      : { label: 'Documentation not yet available', cls: 'text-slate-500' };

const intelligenceBand = (score: number) =>
  score >= 80 ? 'Strong information profile' : score >= 60 ? 'Moderate information profile' : 'Limited information profile';

const SIGNAL_LABELS: Record<string, string> = { 'Documentation Completeness': 'Documentation' };

const SIGNAL_TONE: Record<string, string> = { good: 'text-emerald-700', warn: 'text-amber-700', neutral: 'text-slate-600' };

interface OverviewTabProps {
  supplier: BuyerSupplier;
  onOpenTab: (tab: ProfileTab) => void;
  onViewProduct: () => void;
  onRequestContact: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ supplier: s, onOpenTab, onViewProduct, onRequestContact }) => {
  const external = (field: string) => s.externalSourceFields?.includes(field) && <ExternalSourceBadge />;
  const previewProducts = s.products.slice(0, PREVIEW_PRODUCTS);
  const previewContacts = s.contacts.slice(0, PREVIEW_CONTACTS);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div className="lg:col-span-2 space-y-4 min-w-0">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-900">About {s.name}</h3>
          <p className="mt-2 text-sm text-slate-700 leading-relaxed">{s.description}</p>
          <dl className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-3">
            <Fact label="Supplier Type">{supplierTypeLine(s)}</Fact>
            <Fact label="Established">{s.established ?? 'Not provided'}</Fact>
            <Fact label="Headquarters">
              <span className="inline-flex flex-col items-start gap-1">
                {supplierLocation(s)}
                {external('Location')}
              </span>
            </Fact>
            <Fact label="Markets Served">{supplierMarkets(s).join(' \u00b7 ')}</Fact>
            <Fact label="Website">
              {s.website ? (
                <a href={`https://${s.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800">
                  {s.website}
                </a>
              ) : (
                'Not provided'
              )}
            </Fact>
          </dl>
        </section>

        <Panel title="Capabilities">
          {s.capabilities.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {s.capabilities.map((c) => (
                <li key={c} className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Not provided</p>
          )}
        </Panel>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Products</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {s.products.length} {s.products.length === 1 ? 'product' : 'products'} listed on SOKO
              </p>
            </div>
            {s.products.length > 0 && <LinkButton onClick={() => onOpenTab('products')}>View All {s.products.length} Products</LinkButton>}
          </div>
          {previewProducts.length ? (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {previewProducts.map((p) => {
                const status = docStatus(p);
                return (
                  <li key={p.id} className="rounded-lg border border-slate-200 p-3 flex gap-3 hover:border-slate-300 transition-colors">
                    <img src={p.imageUrl} alt="" className="w-16 h-16 rounded-md object-cover shrink-0" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.type}</p>
                      <p className={`text-xs font-semibold mt-1 ${status.cls}`}>{status.label}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {p.intelligenceScore !== undefined ? (
                          <span className="text-xs text-slate-500">
                            Product Intelligence: <span className="font-semibold text-slate-900">{p.intelligenceScore}</span>
                          </span>
                        ) : (
                          <span />
                        )}
                        <button type="button" onClick={onViewProduct} className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                          View Product
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">This supplier has not added products to SOKO yet.</p>
          )}
        </section>

        <Panel title="Brands">
          {s.brands.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {s.brands.map((b) => (
                <li key={b} className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-sm font-semibold text-slate-800">
                  {b}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No brands listed</p>
          )}
        </Panel>
      </div>

      <div className="space-y-4 min-w-0">
        <Panel title="Verification & Documentation">
          <dl>
            <Row label="Trade License">
              <span className={s.tradeLicense.status === 'verified' ? 'text-emerald-700' : s.tradeLicense.status === 'expired' ? 'text-red-700' : ''}>
                {tradeLicenseLabel(s)}
              </span>
            </Row>
            <Row label="Supplier Documentation">{s.documentationPct}% Complete</Row>
            <Row label="Certifications">{activeCertifications(s)} Active</Row>
            <Row label="Last Verification">{formatDate(s.lastVerified)}</Row>
          </dl>
          <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Confidential company documents are never shown to buyers.
          </p>
          <div className="mt-3">
            <LinkButton onClick={() => onOpenTab('documents')}>View Certifications & Documents</LinkButton>
          </div>
        </Panel>

        <Panel title="Key Contacts">
          {previewContacts.length ? (
            <ul className="divide-y divide-slate-100 -my-1">
              {previewContacts.map((c) => (
                <li key={c.id} className="py-3">
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-600">{c.title}</p>
                  <p className="text-xs text-slate-500 mb-2">{s.name}</p>
                  <ContactActions contact={c} onViewContact={() => onOpenTab('contacts')} onRequestContact={onRequestContact} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No representatives shared yet.</p>
          )}
          {s.contacts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <LinkButton onClick={() => onOpenTab('contacts')}>View All Contacts</LinkButton>
            </div>
          )}
        </Panel>

        <section className="relative overflow-hidden bg-white rounded-xl border border-gold-200 p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-gold-500" />
          <p className="text-[11px] font-semibold tracking-wider uppercase text-gold-700 flex items-center gap-1">
            SOKO Supplier Intelligence
            <InfoTooltip text={INTELLIGENCE_EXPLAINER} label="About SOKO Intelligence" align="right" />
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 leading-none">
            {s.intelligenceScore}
            <span className="text-base text-slate-400 font-normal"> / 100</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-gold-700">{intelligenceBand(s.intelligenceScore)}</p>
          <dl className="mt-4 space-y-1.5">
            {intelligenceSignals(s).map((sig) => (
              <div key={sig.label} className="flex items-center justify-between gap-3 text-sm">
                <dt className="text-slate-500">{SIGNAL_LABELS[sig.label] ?? sig.label}</dt>
                <dd className={`font-semibold text-right ${SIGNAL_TONE[sig.tone]}`}>{sig.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <LinkButton onClick={() => onOpenTab('intelligence')}>View Intelligence Details</LinkButton>
          </div>
          <p className="mt-3 text-[11px] leading-snug text-slate-500">
            SOKO Intelligence is an informational signal and does not constitute commercial, technical or legal approval.
          </p>
        </section>
      </div>
    </div>
  );
};
