import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Coins, Lock, ShieldCheck, Users } from 'lucide-react';
import { BUYER_COMPANY_TYPES, BUYER_ROLES, EMIRATES, PROMO_TYPES, SUPPLIER_TYPE_OPTIONS, TRADE_CATEGORIES, promoTypeLabel, subcategoriesOf } from '../../data/marketHubCatalog';
import { EMPTY_BUYER_AUDIENCE, EMPTY_SUPPLIER_AUDIENCE } from '../../data/marketHubAudience';
import { creditAccount, estimateAudience, saveCampaignDraft, submitCampaignForReview } from '../../data/marketHubService';
import { CampaignDraftInput, CampaignKind, InboxItem, PromoType } from '../../data/marketHubTypes';
import { ProfileDialog } from '../ProfileDialog';
import { btnGhost, btnPrimary, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { CampaignCard } from './CampaignInbox';
import { ChipToggle, Field, Hub, fmtDate } from './MarketHubShared';

const STEP_LABELS = ['Campaign Details', 'Target Audience', 'Preview Reach & Credit Cost', 'Review', 'Publish'];

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const example = (kind: CampaignKind): CampaignDraftInput =>
  kind === 'sourcing'
    ? {
        ...blank(kind),
        title: 'Waterproofing membrane required for podium deck',
        category: 'Waterproofing',
        subcategory: 'Waterproofing Membrane',
        itemRequired: 'SBS modified bituminous membrane, 4mm, torch-applied',
        quantity: '3200',
        unit: 'sqm',
        deliveryLocation: 'Dubai',
        description: 'Podium deck and planter areas for a mid-rise residential project. Please quote supply rate, lead time and manufacturer warranty. Approved-brand submittals preferred.',
        requiredDate: inDays(28),
        responseDeadline: inDays(10),
        supplierAudience: { ...EMPTY_SUPPLIER_AUDIENCE, categories: ['Waterproofing'], emirates: ['Dubai', 'Abu Dhabi'] },
      }
    : {
        ...blank(kind),
        title: 'Launch: ProSeal crystalline waterproofing admixture',
        category: 'Construction Chemicals',
        promoType: 'new_product',
        offerHighlight: 'Introductory price and free site trial for the first 20 projects',
        description: 'New crystalline admixture for basements, water tanks and podium slabs. Technical data sheet and site trial available on request.',
        responseDeadline: inDays(30),
        buyerAudience: { ...EMPTY_BUYER_AUDIENCE, categories: ['Waterproofing', 'Construction Chemicals'] },
      };

const blank = (kind: CampaignKind): CampaignDraftInput => ({
  kind,
  title: '',
  category: '',
  subcategory: '',
  description: '',
  itemRequired: '',
  quantity: '',
  unit: '',
  deliveryLocation: 'Dubai',
  requiredDate: '',
  attachmentName: '',
  identity: 'public',
  promoType: kind === 'promotion' ? 'new_product' : undefined,
  offerHighlight: '',
  responseDeadline: '',
  scheduledFor: '',
  supplierAudience: kind === 'sourcing' ? { ...EMPTY_SUPPLIER_AUDIENCE } : undefined,
  buyerAudience: kind === 'promotion' ? { ...EMPTY_BUYER_AUDIENCE } : undefined,
});

const stepOneError = (f: CampaignDraftInput) => {
  if (!f.title.trim()) return 'Add a campaign title.';
  if (f.kind === 'sourcing' && !f.itemRequired?.trim()) return 'Add the material or service required.';
  if (!f.category) return 'Choose a trade category.';
  if (!f.description.trim()) return 'Add a short description.';
  if (!f.responseDeadline) return f.kind === 'sourcing' ? 'Set a response deadline.' : 'Set an offer expiry date.';
  if (f.requiredDate && f.responseDeadline > f.requiredDate) return 'The response deadline must be before the required date.';
  return null;
};

const fileCls =
  'block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-semibold hover:file:bg-slate-200 file:cursor-pointer';

export const CampaignWizard: React.FC<{ hub: Hub; kind: CampaignKind; draft?: { id: string; input: CampaignDraftInput }; onClose: () => void; onDone: (id: string) => void }> = ({
  hub,
  kind,
  draft,
  onClose,
  onDone,
}) => {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<CampaignDraftInput>(draft?.input ?? blank(kind));
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof CampaignDraftInput>(k: K, v: CampaignDraftInput[K]) => setF((p) => ({ ...p, [k]: v, ...(k === 'category' ? { subcategory: '' } : {}) }));
  const setSA = (patch: Partial<NonNullable<CampaignDraftInput['supplierAudience']>>) => setF((p) => ({ ...p, supplierAudience: { ...p.supplierAudience!, ...patch } }));
  const setBA = (patch: Partial<NonNullable<CampaignDraftInput['buyerAudience']>>) => setF((p) => ({ ...p, buyerAudience: { ...p.buyerAudience!, ...patch } }));

  const estimate = useMemo(() => estimateAudience(hub.store, hub.actor, f), [hub.store, hub.actor, f]);
  const account = creditAccount(hub.store, hub.actor);
  const sourcing = kind === 'sourcing';
  const ws = hub.actor.workspace;

  const next = () => {
    if (step === 0) {
      const err = stepOneError(f);
      if (err) return setError(err);
      const cats = sourcing ? f.supplierAudience!.categories : f.buyerAudience!.categories;
      if (!cats.length) {
        if (sourcing) setSA({ categories: [f.category], subcategories: f.subcategory ? [f.subcategory] : [], emirates: f.deliveryLocation ? [f.deliveryLocation] : [] });
        else setBA({ categories: [f.category] });
      }
    }
    if (step === 1) {
      const cats = sourcing ? f.supplierAudience!.categories : f.buyerAudience!.categories;
      if (!cats.includes(f.category)) return setError(`Include ${f.category} in the audience so the campaign stays relevant.`);
      if (!estimate.eligible) return setError('No eligible recipients match. Broaden the audience.');
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const cleaned = (): CampaignDraftInput => ({
    ...f,
    attachmentName: f.attachmentName || undefined,
    scheduledFor: f.scheduledFor || undefined,
    offerHighlight: f.offerHighlight || undefined,
  });

  const saveDraft = () => {
    const r = saveCampaignDraft(hub.store, hub.actor, cleaned(), draft?.id);
    if (hub.run(r, 'Draft saved') && r.ok) onDone(r.value);
  };

  const submit = () => {
    const saved = saveCampaignDraft(hub.store, hub.actor, cleaned(), draft?.id);
    if (!saved.ok) return setError(saved.error);
    const submitted = submitCampaignForReview(saved.store, hub.actor, saved.value);
    if (submitted.ok) hub.run(submitted, 'Submitted for SOKO review. You can launch once it is approved.');
    else hub.run(saved, `Saved as draft. ${submitted.error}`);
    onDone(saved.value);
  };

  const audienceText = sourcing
    ? [f.supplierAudience!.categories.join(', '), f.supplierAudience!.emirates.join(', ') || 'All emirates'].filter(Boolean).join(' suppliers · ')
    : `Buyers following ${f.buyerAudience!.categories.join(', ') || '—'}`;

  const preview: InboxItem = {
    id: 'preview',
    kind,
    title: f.title || 'Campaign title',
    typeLabel: sourcing ? 'Sourcing Requirement' : promoTypeLabel(f.promoType),
    senderDisplay: f.identity === 'confidential' ? 'Confidential Buyer' : ws.companyName ?? ws.displayName,
    category: f.category,
    subcategory: f.subcategory,
    location: sourcing ? f.deliveryLocation ?? 'UAE' : f.buyerAudience!.emirates.join(', ') || 'UAE',
    summary: sourcing ? [f.itemRequired, f.quantity && `${f.quantity} ${f.unit ?? ''}`.trim()].filter(Boolean).join(' · ') : f.offerHighlight || f.description,
    description: f.description,
    date: new Date().toISOString(),
    expiry: f.responseDeadline,
    viewed: true,
    interested: false,
    declined: false,
    saved: false,
    reported: false,
    responded: false,
  };

  return (
    <ProfileDialog
      title={sourcing ? 'Create Sourcing Campaign' : 'Create Promotional Campaign'}
      subtitle={`Step ${step + 1} of ${STEP_LABELS.length} · ${STEP_LABELS[step]}`}
      size="lg"
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <div>
              {step > 0 ? (
                <button type="button" onClick={() => (setError(null), setStep((s) => s - 1))} className={btnGhost}>
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <button type="button" onClick={onClose} className={btnGhost}>
                  Cancel
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <button type="button" onClick={saveDraft} className={btnSecondary}>
                  Save Draft
                </button>
              )}
              {step < STEP_LABELS.length - 1 ? (
                <button type="button" onClick={next} className={btnPrimary}>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={!confirmed} className={btnPrimary}>
                  <ShieldCheck className="w-4 h-4" />
                  Publish for SOKO Review
                </button>
              )}
            </div>
          </div>
        </div>
      }
    >
      <ol className="px-5 pt-4 grid grid-cols-5 gap-1.5" aria-label="Progress">
        {STEP_LABELS.map((l, i) => (
          <li key={l}>
            <div className={`h-1 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <p className={`mt-1 text-[10px] font-semibold leading-tight ${i === step ? 'text-slate-900' : 'text-slate-400'}`}>{l}</p>
          </li>
        ))}
      </ol>

      <div key={step} className="px-5 py-4 animate-[fadeIn_0.2s_ease-out]">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {!draft && (
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-600">
                  {sourcing ? 'Example: waterproofing membrane for Dubai and Abu Dhabi suppliers.' : 'Example: new construction chemical for buyers following Waterproofing and Construction Chemicals.'}
                </p>
                <button type="button" onClick={() => (setF(example(kind)), setError(null))} className={btnGhost}>
                  Use example
                </button>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="cw-title">
                Campaign title
              </label>
              <input
                id="cw-title"
                className={inputCls}
                value={f.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder={sourcing ? 'E.g. Waterproofing Material Requirement' : 'E.g. New crystalline waterproofing admixture'}
              />
            </div>
            {sourcing ? (
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="cw-item">
                  Material / service required
                </label>
                <input id="cw-item" className={inputCls} value={f.itemRequired} onChange={(e) => set('itemRequired', e.target.value)} placeholder="E.g. Torch-applied bituminous membrane, 4 mm" />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="cw-promo">
                  Campaign type
                </label>
                <select id="cw-promo" className={inputCls} value={f.promoType} onChange={(e) => set('promoType', e.target.value as PromoType)}>
                  {PROMO_TYPES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="cw-cat">
                Trade category
              </label>
              <select id="cw-cat" className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">Select</option>
                {TRADE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="cw-sub">
                Subcategory
              </label>
              <select id="cw-sub" className={inputCls} value={f.subcategory} disabled={!f.category} onChange={(e) => set('subcategory', e.target.value)}>
                <option value="">Optional</option>
                {f.category && subcategoriesOf(f.category).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="cw-desc">
                Description
              </label>
              <textarea id="cw-desc" rows={3} className={`${inputCls} py-2`} value={f.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            {sourcing ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls} htmlFor="cw-qty">
                      Quantity
                    </label>
                    <input id="cw-qty" className={inputCls} value={f.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="18,000" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cw-unit">
                      Unit
                    </label>
                    <input id="cw-unit" className={inputCls} value={f.unit} onChange={(e) => set('unit', e.target.value)} placeholder="m²" />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="cw-loc">
                    Delivery location
                  </label>
                  <select id="cw-loc" className={inputCls} value={f.deliveryLocation} onChange={(e) => set('deliveryLocation', e.target.value)}>
                    {EMIRATES.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="cw-req">
                    Required date
                  </label>
                  <input id="cw-req" type="date" className={inputCls} value={f.requiredDate} onChange={(e) => set('requiredDate', e.target.value)} />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="cw-hl">
                  Offer highlight (optional)
                </label>
                <input id="cw-hl" className={inputCls} value={f.offerHighlight} onChange={(e) => set('offerHighlight', e.target.value)} placeholder="E.g. Introductory technical support for first project" />
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="cw-dead">
                {sourcing ? 'Response deadline' : 'Offer valid until'}
              </label>
              <input id="cw-dead" type="date" className={inputCls} value={f.responseDeadline} onChange={(e) => set('responseDeadline', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="cw-file">
                {sourcing ? 'RFQ / specification (optional)' : 'Catalogue or datasheet (optional)'}
              </label>
              <input id="cw-file" type="file" className={fileCls} onChange={(e) => set('attachmentName', e.target.files?.[0]?.name ?? '')} />
              <p className="mt-1 text-[11px] text-slate-400">Prototype: only the file name is kept.</p>
            </div>
            {sourcing && (
              <fieldset className="sm:col-span-2">
                <legend className={labelCls}>Buyer identity visibility</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['public', `Show ${ws.companyName ?? 'company name'}`],
                      ['confidential', 'Confidential Buyer — revealed only when you connect'],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm ${f.identity === id ? 'border-blue-600 bg-blue-50/60' : 'border-slate-200'}`}>
                      <input type="radio" name="cw-identity" className="accent-blue-700" checked={f.identity === id} onChange={() => set('identity', id)} />
                      <span className="font-semibold text-slate-800">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5 md:grid-cols-[1fr_220px]">
            <div className="space-y-4 min-w-0">
              {sourcing ? (
                <>
                  <div>
                    <p className={labelCls}>Supplier category (max 3)</p>
                    <ChipToggle options={TRADE_CATEGORIES} value={f.supplierAudience!.categories} onChange={(v) => setSA({ categories: v, subcategories: f.supplierAudience!.subcategories.filter((s) => v.some((c) => subcategoriesOf(c).includes(s))) })} max={3} />
                  </div>
                  {f.supplierAudience!.categories.length > 0 && (
                    <div>
                      <p className={labelCls}>Subcategory</p>
                      <ChipToggle options={[...new Set(f.supplierAudience!.categories.flatMap(subcategoriesOf))]} value={f.supplierAudience!.subcategories} onChange={(v) => setSA({ subcategories: v })} />
                    </div>
                  )}
                  <div>
                    <p className={labelCls}>Supplier type</p>
                    <ChipToggle options={SUPPLIER_TYPE_OPTIONS} value={f.supplierAudience!.supplierTypes} onChange={(v) => setSA({ supplierTypes: v })} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls} htmlFor="cw-country">
                        Country
                      </label>
                      <select id="cw-country" className={inputCls} defaultValue="AE">
                        <option value="AE">United Arab Emirates</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="cw-kw">
                        Product / capability keywords
                      </label>
                      <input id="cw-kw" className={inputCls} value={f.supplierAudience!.keywords} onChange={(e) => setSA({ keywords: e.target.value })} placeholder="E.g. bituminous, PVC" />
                    </div>
                  </div>
                  <div>
                    <p className={labelCls}>Emirate / city</p>
                    <ChipToggle options={EMIRATES} value={f.supplierAudience!.emirates} onChange={(v) => setSA({ emirates: v })} />
                  </div>
                  <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" className="accent-blue-700" checked={f.supplierAudience!.verifiedOnly} onChange={(e) => setSA({ verifiedOnly: e.target.checked })} />
                    SOKO Verified suppliers only
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <p className={labelCls}>Interested / followed categories (max 3)</p>
                    <ChipToggle options={TRADE_CATEGORIES} value={f.buyerAudience!.categories} onChange={(v) => setBA({ categories: v })} max={3} />
                  </div>
                  <div>
                    <p className={labelCls}>Buyer location</p>
                    <ChipToggle options={EMIRATES} value={f.buyerAudience!.emirates} onChange={(v) => setBA({ emirates: v })} />
                  </div>
                  <div>
                    <p className={labelCls}>Professional role</p>
                    <ChipToggle options={BUYER_ROLES} value={f.buyerAudience!.roles} onChange={(v) => setBA({ roles: v })} />
                  </div>
                  <div>
                    <p className={labelCls}>Company type</p>
                    <ChipToggle options={BUYER_COMPANY_TYPES} value={f.buyerAudience!.companyTypes} onChange={(v) => setBA({ companyTypes: v })} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cw-pi">
                      Product interests
                    </label>
                    <input id="cw-pi" className={inputCls} value={f.buyerAudience!.productInterests} onChange={(e) => setBA({ productInterests: e.target.value })} placeholder="E.g. admixtures, membranes" />
                  </div>
                </>
              )}
            </div>
            <aside className="md:sticky md:top-0 self-start rounded-2xl bg-slate-900 text-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estimated eligible {sourcing ? 'suppliers' : 'buyers'}</p>
              <p key={estimate.eligible} className="mt-1 text-4xl font-semibold tabular-nums animate-[fadeIn_0.25s_ease-out]">
                {estimate.eligible}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-gold-300">
                <Coins className="w-3.5 h-3.5" />
                {estimate.credits} credits to launch
              </p>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400 leading-snug">
                <Lock className="w-3.5 h-3.5 mt-px shrink-0" />
                {sourcing
                  ? 'Calculated live from SOKO supplier profiles. You never see or export the recipient list.'
                  : 'Only buyers who opted in to supplier promotions and follow these categories are counted. No contact details are shared.'}
              </p>
            </aside>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Estimated eligible audience', estimate.eligible, <Users key="u" className="w-4 h-4" />],
                ['Credit cost', estimate.credits, <Coins key="c" className="w-4 h-4" />],
                ['Available credits', account.available, <Coins key="a" className="w-4 h-4" />],
                ['Remaining after launch', account.available - estimate.credits, <Coins key="r" className="w-4 h-4" />],
              ].map(([label, value, icon]) => (
                <div key={String(label)} className="rounded-xl border border-slate-200 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="text-slate-400">{icon}</span>
                    {label}
                  </p>
                  <p className={`mt-1 text-lg font-semibold tabular-nums ${typeof value === 'number' && value < 0 ? 'text-red-700' : 'text-slate-900'}`}>{value}</p>
                </div>
              ))}
            </div>
            <p className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs leading-relaxed text-slate-600">
              The eligible audience is an estimate of SOKO {sourcing ? 'suppliers' : 'buyers'} matching your targeting today. It is not a guarantee of delivery, views or responses. Recipient names and contact
              details are never shown to you.
            </p>
            {account.available < estimate.credits && (
              <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                You have {account.available} credits available. You can still submit for review, but launch will need more credits — see Plans &amp; Credits.
              </p>
            )}
            <div>
              <p className="text-sm text-slate-600 mb-2">How the campaign appears in each recipient's Campaign Inbox:</p>
              <div className="rounded-2xl bg-slate-100 p-4">
                <CampaignCard
                  item={preview}
                  preview
                  actions={
                    <span className="text-[11px] text-slate-500">
                      {sourcing ? 'View Requirement · Interested · Submit Response · Decline' : 'View Offer · View Supplier · Interested · Save'}
                    </span>
                  }
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-xl border border-slate-200 p-4">
              <Field label="Campaign" value={f.title} />
              <Field label="Type" value={sourcing ? 'Sourcing Requirement' : promoTypeLabel(f.promoType)} />
              <Field label="Category" value={[f.category, f.subcategory].filter(Boolean).join(' · ')} />
              {sourcing && <Field label="Item required" value={[f.itemRequired, f.quantity && `${f.quantity} ${f.unit ?? ''}`.trim()].filter(Boolean).join(' · ')} />}
              <Field label="Audience" value={audienceText} />
              <Field label="Location" value={sourcing ? f.deliveryLocation : f.buyerAudience!.emirates.join(', ') || 'All emirates'} />
              <Field label={sourcing ? 'Response deadline' : 'Valid until'} value={fmtDate(f.responseDeadline)} />
              {sourcing && <Field label="Required date" value={f.requiredDate && fmtDate(f.requiredDate)} />}
              <Field label="Sender shown as" value={preview.senderDisplay} />
              <Field label="Estimated audience" value={`${estimate.eligible} eligible`} />
              <Field label="Credit cost" value={`${estimate.credits} credits`} />
              <Field label="Attachment" value={f.attachmentName} />
            </dl>
            <Field label="Description" value={f.description} />
            <div>
              <label className={labelCls} htmlFor="cw-sched">
                Schedule delivery (optional)
              </label>
              <input id="cw-sched" type="date" className={`${inputCls} sm:max-w-xs`} value={f.scheduledFor} onChange={(e) => set('scheduledFor', e.target.value)} />
              <p className="mt-1 text-[11px] text-slate-400">Leave empty to deliver as soon as you launch after approval.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <ol className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-xs text-slate-600">
              <li>1. SOKO reviews the campaign for relevance (simulated in this prototype).</li>
              <li>2. Once approved, you launch it. Credits are deducted only at launch.</li>
              <li>3. Recipients receive it in their Campaign Inbox. No emails or texts are sent.</li>
              <li>4. Delivery, views and responses depend on recipients and are not guaranteed.</li>
            </ol>
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Recipient lists and contact details stay private. Companies are only revealed to you if they choose to respond or share interest.
            </p>
            <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-blue-700" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I confirm this campaign is a genuine, relevant {sourcing ? 'requirement' : 'offer'} for the selected
              audience and follows SOKO campaign guidelines.
            </label>
          </div>
        )}
      </div>
    </ProfileDialog>
  );
};
