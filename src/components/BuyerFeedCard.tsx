import React, { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  MapPin,
  MessageSquare,
  FileText,
  ShieldCheck,
  Lightbulb,
  Newspaper,
  ArrowRight,
  FolderKanban,
  Package,
  Info,
  Sparkles,
  Activity,
} from 'lucide-react';
import { BuyerFeedItem, FeedProductRef, FeedSupplierRef, SPONSORED_FORMAT_LABELS } from '../data/buyerHomeFeed';

interface FeedCardProps {
  item: BuyerFeedItem;
  reasons: string[];
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onNavigate: (tab: string) => void;
  onContact: (supplierId: string, supplierName: string) => void;
}

const PRODUCT_INTELLIGENCE_INFO =
  'Based on documentation completeness, supplier verification, product information and SOKO network activity.';

const KindLabel: React.FC<{ icon: React.ElementType; label: string; tone: string }> = ({ icon: Icon, label, tone }) => (
  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase ${tone}`}>
    <Icon className="w-3.5 h-3.5" />
    {label}
  </span>
);

const SupplierLine: React.FC<{ supplier: FeedSupplierRef; onClick: () => void }> = ({ supplier, onClick }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-3 text-left group cursor-pointer min-w-0">
    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-semibold shrink-0">
      {supplier.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-1 truncate">
        {supplier.name}
        {supplier.verified && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
      </p>
      <p className="text-xs text-slate-500 flex items-center gap-2">
        {supplier.verified && <span>SOKO Verified Supplier</span>}
        <span className="inline-flex items-center gap-0.5">
          <MapPin className="w-3 h-3" />
          {supplier.location}
        </span>
      </p>
    </div>
  </button>
);

const Field: React.FC<{ label: React.ReactNode; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-[11px] text-slate-500">{label}</dt>
    <dd className="text-sm font-semibold text-slate-900 truncate">{value}</dd>
  </div>
);

const IntelligenceScoreField: React.FC<{ score: number }> = ({ score }) => (
  <Field
    label={
      <span className="inline-flex items-center gap-1">
        Product Intelligence
        <span className="relative group/info inline-flex">
          <Info className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help" tabIndex={0} aria-label={PRODUCT_INTELLIGENCE_INFO} />
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-1.5 w-56 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg opacity-0 group-hover/info:opacity-100 group-focus-within/info:opacity-100 transition-opacity z-20"
          >
            {PRODUCT_INTELLIGENCE_INFO}
          </span>
        </span>
      </span>
    }
    value={
      <span>
        {score}
        <span className="text-slate-400 font-normal"> / 100</span>
      </span>
    }
  />
);

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'ghost' }> = ({
  onClick,
  children,
  variant = 'ghost',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
      variant === 'primary'
        ? 'bg-blue-700 text-white hover:bg-blue-800'
        : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
    }`}
  >
    {children}
  </button>
);

const SaveButton: React.FC<{ saved: boolean; onClick: () => void }> = ({ saved, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={saved}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
      saved ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
    }`}
  >
    {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
    {saved ? 'Saved' : 'Save'}
  </button>
);

const ProductFacts: React.FC<{ product: FeedProductRef }> = ({ product }) => (
  <dl className="mt-2 grid grid-cols-3 gap-3">
    <Field label="Documentation" value={product.technicalDocs ? 'TDS Available' : 'Pending'} />
    <Field label="Certification" value={product.certification ? 'Available' : 'Pending'} />
    {product.intelligenceScore !== undefined && <IntelligenceScoreField score={product.intelligenceScore} />}
  </dl>
);

const CardShell: React.FC<{
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
  dark?: boolean;
}> = ({ children, footer, className = 'bg-white border-slate-200', dark = false }) => (
  <article className={`rounded-xl border p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-md ${className}`}>
    {children}
    <p className={`mt-3 pt-3 border-t text-[11px] ${dark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-400'}`}>
      {footer}
    </p>
  </article>
);

const organicFooter = (postedAt: string, reasons: string[]) => (
  <>
    {postedAt} · Curated by SOKO
    {reasons.length > 0 && <span> · Why you're seeing this: {reasons[0]}</span>}
  </>
);

export const BuyerFeedCard: React.FC<FeedCardProps> = ({ item, reasons, isSaved, onToggleSave, onNavigate, onContact }) => {
  const [expanded, setExpanded] = useState(false);
  const save = () => onToggleSave(item.id);

  switch (item.kind) {
    case 'supplier-activity':
      return (
        <CardShell footer={organicFooter(item.postedAt, reasons)}>
          <KindLabel icon={Sparkles} label="New on SOKO" tone="text-blue-700" />
          <div className="mt-3">
            <SupplierLine supplier={item.supplier} onClick={() => onNavigate('suppliers')} />
          </div>
          <p className="mt-2 text-sm text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900">{item.supplier.name}</span> {item.summary}
          </p>
          <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm font-semibold text-slate-900">{item.product.name}</p>
            <p className="text-xs text-slate-500">{item.product.type}</p>
            <dl className="mt-2 grid grid-cols-3 gap-3">
              <Field label="Brand" value={item.product.brand} />
              <Field label="Category" value={item.product.category} />
              <Field label="Technical Documents" value={item.product.technicalDocs ? 'Available' : 'Not yet'} />
            </dl>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ActionButton variant="primary" onClick={() => onNavigate('products')}>View Product</ActionButton>
            <ActionButton onClick={() => onNavigate('suppliers')}>View Supplier</ActionButton>
            <SaveButton saved={isSaved} onClick={save} />
            <button
              type="button"
              onClick={() => onContact(item.supplier.id, item.supplier.name)}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Contact
            </button>
          </div>
        </CardShell>
      );

    case 'product':
      return (
        <CardShell footer={organicFooter(item.postedAt, reasons)}>
          <KindLabel icon={Package} label="Product Discovery" tone="text-blue-700" />
          <div className="mt-3 flex flex-col sm:flex-row gap-4">
            {item.product.imageUrl && (
              <img
                src={item.product.imageUrl}
                alt={item.product.name}
                className="w-full sm:w-40 h-32 sm:h-28 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-slate-900 leading-tight">{item.product.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.product.type}</p>
              <button
                type="button"
                onClick={() => onNavigate('suppliers')}
                className="mt-2 text-xs text-slate-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
              >
                Supplier: <span className="font-semibold">{item.supplier.name}</span>
                {item.supplier.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
              <ProductFacts product={item.product} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton variant="primary" onClick={() => onNavigate('products')}>View Product</ActionButton>
            <ActionButton onClick={() => onNavigate('suppliers')}>View Supplier</ActionButton>
            <SaveButton saved={isSaved} onClick={save} />
          </div>
        </CardShell>
      );

    case 'sponsored':
      return (
        <CardShell
          footer={
            <>
              Sponsored by {item.sponsor.name} · Reviewed and approved by SOKO · Paid placement never affects verification
              or intelligence scores
            </>
          }
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-slate-500">
              <span className="px-1.5 py-0.5 rounded border border-slate-300 text-slate-600">Sponsored</span>
              {SPONSORED_FORMAT_LABELS[item.format]}
            </span>
          </div>
          <p className="mt-3 text-base font-semibold text-slate-900 leading-tight">{item.product.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{item.product.type}</p>
          <button
            type="button"
            onClick={() => onNavigate('suppliers')}
            className="mt-2 text-xs text-slate-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
          >
            <span className="font-semibold">{item.sponsor.name}</span>
            {item.sponsor.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
          <ProductFacts product={item.product} />
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton variant="primary" onClick={() => onNavigate('products')}>View Product</ActionButton>
            <ActionButton onClick={() => onNavigate('suppliers')}>View Supplier</ActionButton>
          </div>
        </CardShell>
      );

    case 'market-hub': {
      const urgencyTone =
        item.urgency === 'High' ? 'text-red-700 bg-red-50' : item.urgency === 'Medium' ? 'text-amber-800 bg-amber-50' : 'text-slate-700 bg-slate-100';
      return (
        <CardShell footer={organicFooter(item.postedAt, reasons)}>
          <div className="flex items-center justify-between gap-2">
            <KindLabel icon={FolderKanban} label="Market Hub Requirement" tone="text-slate-700" />
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${urgencyTone}`}>{item.urgency} urgency</span>
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900 leading-tight">{item.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {item.location}
            </span>
            <span>{item.projectType}</span>
          </p>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Approximate Scope" value={item.scope} />
            <Field label="Required" value={item.requiredBy} />
            <Field label="Buyer" value={item.buyerName} />
            <Field label="Interest" value={`${item.interestedCount} suppliers`} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton variant="primary" onClick={() => onNavigate('opportunities')}>View Requirement</ActionButton>
            <SaveButton saved={isSaved} onClick={save} />
          </div>
        </CardShell>
      );
    }

    case 'verification':
      return (
        <CardShell footer={organicFooter(item.postedAt, reasons)}>
          <KindLabel icon={ShieldCheck} label="Supplier Intelligence" tone="text-emerald-700" />
          <div className="mt-3">
            <SupplierLine supplier={item.supplier} onClick={() => onNavigate('suppliers')} />
          </div>
          <p className="mt-3 text-sm text-slate-700">Supplier profile verification updated.</p>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Field
              label="Trade License"
              value={<span className={item.tradeLicense === 'Verified' ? 'text-emerald-700' : 'text-amber-700'}>{item.tradeLicense}</span>}
            />
            <Field label="Supplier Documentation" value={`${item.documentationPct}% Complete`} />
            <Field label="Certifications" value={`${item.activeCertifications} Active`} />
            <Field label="Last Verified" value={item.lastVerified} />
          </dl>
          <div className="mt-3">
            <ActionButton variant="primary" onClick={() => onNavigate('suppliers')}>View Supplier</ActionButton>
          </div>
        </CardShell>
      );

    case 'insight': {
      const isProprietary = item.label === 'SOKO Insight';
      const icon = item.label === 'Market Signal' ? Activity : item.label === 'New on SOKO' ? Sparkles : Lightbulb;
      const max = item.breakdown ? Math.max(...item.breakdown.map((b) => b.value)) : 1;
      return (
        <CardShell
          footer={organicFooter(item.postedAt, reasons)}
          dark={isProprietary}
          className={
            isProprietary
              ? 'bg-slate-900 border-gold-500/40 text-white relative overflow-hidden'
              : 'bg-white border-slate-200 relative overflow-hidden'
          }
        >
          {isProprietary && <div className="absolute inset-x-0 top-0 h-1 bg-gold-500" />}
          <KindLabel icon={icon} label={item.label} tone={isProprietary ? 'text-gold-300' : 'text-gold-700'} />
          <p className={`mt-2 text-base font-semibold leading-tight ${isProprietary ? 'text-white' : 'text-slate-900'}`}>
            {item.headline}
          </p>
          <p className={`mt-1.5 text-sm leading-relaxed ${isProprietary ? 'text-slate-300' : 'text-slate-600'}`}>{item.body}</p>

          {item.stats && (
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {item.stats.map((s) => (
                <div key={s.label} className={`rounded-lg p-2.5 ${isProprietary ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <dd className={`text-lg font-semibold leading-tight ${isProprietary ? 'text-gold-300' : 'text-slate-900'}`}>{s.value}</dd>
                  <dt className={`text-[11px] ${isProprietary ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</dt>
                </div>
              ))}
            </dl>
          )}

          {item.breakdown && (
            <div className="mt-3">
              <p className={`text-[11px] mb-2 ${isProprietary ? 'text-slate-400' : 'text-slate-500'}`}>Top activity</p>
              <ul className="space-y-1.5">
                {item.breakdown.map((b) => (
                  <li key={b.label} className="flex items-center gap-3 text-xs">
                    <span className={`w-24 shrink-0 ${isProprietary ? 'text-slate-300' : 'text-slate-600'}`}>{b.label}</span>
                    <span className={`flex-1 h-1.5 rounded-full overflow-hidden ${isProprietary ? 'bg-white/10' : 'bg-slate-100'}`}>
                      <span className="block h-full rounded-full bg-gold-500" style={{ width: `${(b.value / max) * 100}%` }} />
                    </span>
                    <span className={`w-6 text-right font-semibold ${isProprietary ? 'text-white' : 'text-slate-900'}`}>{b.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate(item.ctaTab)}
            className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isProprietary ? 'bg-gold-500 text-slate-900 hover:bg-gold-300' : 'bg-blue-700 text-white hover:bg-blue-800'
            }`}
          >
            {item.ctaLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </CardShell>
      );
    }

    case 'editorial':
      return (
        <CardShell footer={organicFooter(item.postedAt, reasons)}>
          <KindLabel icon={Newspaper} label={`SOKO Editorial · ${item.label}`} tone="text-slate-600" />
          <p className="mt-2 text-base font-semibold text-slate-900 leading-tight">{item.headline}</p>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{item.summary}</p>
          {expanded && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.details}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {item.external ? 'Source:' : 'By'} <span className="font-semibold text-slate-700">{item.source}</span>
              <span>· {item.publishedAt}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500">Demo content</span>
            </p>
            <div className="flex gap-2">
              <SaveButton saved={isSaved} onClick={save} />
              <ActionButton onClick={() => setExpanded((v) => !v)}>{expanded ? 'Show Less' : 'Read More'}</ActionButton>
            </div>
          </div>
        </CardShell>
      );
  }
};
