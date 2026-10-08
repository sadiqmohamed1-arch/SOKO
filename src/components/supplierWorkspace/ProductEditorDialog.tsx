import React, { useRef, useState } from 'react';
import { Check, Lock, Paperclip, Plus, Trash2 } from 'lucide-react';
import { IMG } from '../../data/buyerSuppliers';
import { EMIRATES, TRADE_CATEGORIES, subcategoriesOf } from '../../data/marketHubCatalog';
import { CompanyProduct, TIER_CONFIG } from '../../data/supplierTypes';
import { ProductDraft, saveProduct } from '../../data/supplierService';
import { ProfileDialog } from '../ProfileDialog';
import { btnPrimary, btnSecondary, iconBtn, inputCls, labelCls } from '../NetworkShared';
import { ChipToggle, PremiumBadge } from '../marketHub/MarketHubShared';
import { SW } from './SupplierShared';
import { TextField } from './ProfileEditors';

const GALLERY = Object.values(IMG);
const ATTACHMENT_KINDS: CompanyProduct['attachments'][number]['kind'][] = ['Datasheet', 'Brochure', 'Certificate', 'Technical Document'];

const blank = (sw: SW): ProductDraft => ({
  name: '',
  type: '',
  category: sw.company.profile.categories[0] ?? '',
  subcategory: '',
  brand: sw.company.profile.brands[0] ?? '',
  description: '',
  specs: [{ label: '', value: '' }],
  regions: [sw.company.profile.emirate],
  images: [GALLERY[0]],
  variations: [],
  attachments: [],
  collection: '',
  status: 'active',
});

export const ProductEditorDialog: React.FC<{ sw: SW; product?: CompanyProduct; onClose: () => void }> = ({ sw, product, onClose }) => {
  const [d, setD] = useState<ProductDraft>(product ? { ...product } : blank(sw));
  const [variations, setVariations] = useState(product?.variations.join(', ') ?? '');
  const [kind, setKind] = useState<CompanyProduct['attachments'][number]['kind']>('Datasheet');
  const fileRef = useRef<HTMLInputElement>(null);
  const tier = TIER_CONFIG[sw.company.tier];
  const premium = sw.premium;
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  const toggleImage = (url: string) => {
    if (d.images.includes(url)) return set('images', d.images.filter((i) => i !== url));
    if (!premium) return set('images', [url]);
    if (d.images.length >= tier.imageLimit) return sw.notify(`Up to ${tier.imageLimit} images per product.`);
    set('images', [...d.images, url]);
  };

  const submit = (status: CompanyProduct['status']) => {
    const draft = { ...d, status, variations: premium ? variations.split(',').map((v) => v.trim()).filter(Boolean) : [] };
    if (sw.run(saveProduct(sw.ctx, draft), status === 'draft' ? 'Saved as draft' : product ? 'Product updated — visible in Product Discovery' : 'Product listed — visible in Product Discovery')) onClose();
  };

  return (
    <ProfileDialog
      title={product ? 'Edit product' : 'Add product or service'}
      subtitle="Active listings appear on your public profile and in SOKO Product Discovery. There is no cart or checkout — buyers contact you directly."
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="button" onClick={() => submit('draft')} className={btnSecondary}>Save as draft</button>
          <button type="button" onClick={() => submit('active')} className={btnPrimary}>{product?.status === 'active' ? 'Save changes' : 'Publish listing'}</button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Product or service name" value={d.name} onChange={(v) => set('name', v)} required />
          <TextField label="Product type" value={d.type} onChange={(v) => set('type', v)} placeholder="e.g. Waterproofing Membrane" />
          <label className="block">
            <span className={labelCls}>Category *</span>
            <select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value, subcategory: '' })} className={inputCls}>
              <option value="">Select…</option>
              {TRADE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Subcategory</span>
            <select value={d.subcategory} onChange={(e) => set('subcategory', e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {subcategoriesOf(d.category).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Brand</span>
            <input list="sw-brands" value={d.brand} onChange={(e) => set('brand', e.target.value)} className={inputCls} />
            <datalist id="sw-brands">{sw.company.profile.brands.map((b) => <option key={b} value={b} />)}</datalist>
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Short description</span>
          <textarea rows={3} value={d.description} onChange={(e) => set('description', e.target.value)} className={`${inputCls} py-2`} />
        </label>

        <div>
          <div className="flex items-center justify-between">
            <p className={labelCls}>Specifications ({d.specs.length}/{tier.specLimit})</p>
            <button type="button" disabled={d.specs.length >= tier.specLimit} onClick={() => set('specs', [...d.specs, { label: '', value: '' }])} className="text-xs font-semibold text-blue-700 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed">
              + Add row
            </button>
          </div>
          <div className="space-y-2">
            {d.specs.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                <input aria-label="Specification" value={s.label} placeholder="e.g. Thickness" onChange={(e) => set('specs', d.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={inputCls} />
                <input aria-label="Value" value={s.value} placeholder="e.g. 1.2 mm" onChange={(e) => set('specs', d.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={inputCls} />
                <button type="button" aria-label="Remove row" onClick={() => set('specs', d.specs.filter((_, j) => j !== i))} className={iconBtn}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          {!premium && <p className="mt-1 text-[11px] text-slate-500">Supplier Free includes up to {tier.specLimit} specifications. Premium allows detailed technical specs.</p>}
        </div>

        <div>
          <p className={labelCls}>Availability / regions</p>
          <ChipToggle options={EMIRATES} value={d.regions} onChange={(v) => set('regions', v)} />
        </div>

        <div>
          <p className={labelCls}>{premium ? `Images (up to ${tier.imageLimit})` : 'Image (1 on Supplier Free)'}</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {GALLERY.map((url) => {
              const on = d.images.includes(url);
              return (
                <button key={url} type="button" onClick={() => toggleImage(url)} className={`relative aspect-square rounded-lg overflow-hidden ring-2 transition cursor-pointer ${on ? 'ring-blue-600' : 'ring-transparent hover:ring-slate-300'}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {on && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center"><Check className="w-3 h-3" /></span>}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Demo image library. Image upload is simulated in this prototype.</p>
        </div>

        <div className={`rounded-xl border p-4 ${premium ? 'border-gold-300/70 bg-gold-50/30' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Rich catalogue</p>
            {premium ? <PremiumBadge /> : <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Lock className="w-3.5 h-3.5" /> Supplier Premium</span>}
          </div>
          {premium ? (
            <div className="mt-3 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <TextField label="Catalogue collection" value={d.collection} onChange={(v) => set('collection', v)} placeholder="e.g. Reinforcement" />
                <TextField label="Variations (comma separated)" value={variations} onChange={setVariations} placeholder="10 mm, 12 mm, 16 mm" />
              </div>
              <div>
                <p className={labelCls}>Technical documents, brochures & certificates</p>
                <ul className="space-y-1.5">
                  {d.attachments.map((a, i) => (
                    <li key={`${a.name}-${i}`} className="flex items-center gap-2 text-sm">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <span className="flex-1 truncate">{a.name}</span>
                      <span className="text-xs text-slate-500">{a.kind}</span>
                      <button type="button" aria-label="Remove" onClick={() => set('attachments', d.attachments.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={`${inputCls} max-w-[200px]`}>
                    {ATTACHMENT_KINDS.map((k) => <option key={k}>{k}</option>)}
                  </select>
                  <button type="button" onClick={() => fileRef.current?.click()} className={btnSecondary}><Plus className="w-4 h-4" /> Attach file</button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) set('attachments', [...d.attachments, { name: f.name, kind }]);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Add multiple images, detailed specifications, variations, datasheets, brochures and certificate attachments, and organise products into catalogue collections.</p>
          )}
        </div>
      </div>
    </ProfileDialog>
  );
};
