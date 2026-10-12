import React, { useEffect, useMemo, useState } from 'react';
import { PackagePlus, Pencil, Plus, Trash2, ImagePlus, FileUp, X, Save, Send, CircleCheck, Circle } from 'lucide-react';
import { type AdminCompany } from './companyShared';
import { type AdminProduct, type BrandNode, type CategoryNode, type ProductStatus, PRODUCT_STATUSES, PRODUCT_STATUS_LABELS, UNCATEGORISED, normaliseBrand, productCode } from './productShared';
import { PRODUCT_IMPORT } from './importSystem';
import { AdminDrawer, FormField, FormSection, NotInSchemaTag, inputClass } from './adminDrawer';
import { UiOnlyTag, RestrictedNote } from './visitBadges';
import { DisabledButton } from './catalogUi';

interface ProductEditorDrawerProps {
  /** Null when creating a new listing. */
  product: AdminProduct | null;
  companies: AdminCompany[];
  categories: CategoryNode[];
  brands: BrandNode[];
  onClose: () => void;
}

interface SpecRow {
  id: string;
  label: string;
  value: string;
}

interface LocalFile {
  id: string;
  name: string;
  size: number;
  previewUrl: string | null;
}

const UNITS = PRODUCT_IMPORT.fields.find((f) => f.key === 'unit')?.allowed ?? [];
let localId = 0;
const nextId = () => `local-${++localId}`;

const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

const ChipInput: React.FC<{ id: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }> = ({ id, values, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        <button type="button" onClick={add} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
          Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2 pr-1 text-[11px] font-medium text-slate-700">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer">
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const ProductEditorDrawer: React.FC<ProductEditorDrawerProps> = ({ product, companies, categories, brands, onClose }) => {
  const isNew = product === null;
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [type, setType] = useState(product?.type ?? '');
  const [supplierId, setSupplierId] = useState(product?.companyId ?? '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? '');
  const [specs, setSpecs] = useState<SpecRow[]>(() => (product?.specs ?? []).map((s) => ({ id: s.id, label: s.label, value: s.value })));
  const [unit, setUnit] = useState('');
  const [origin, setOrigin] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>(product?.regions ?? []);
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? 'draft');
  const [visibility, setVisibility] = useState<'public' | 'invited'>('public');
  const [images, setImages] = useState<LocalFile[]>([]);
  const [documents, setDocuments] = useState<LocalFile[]>([]);

  useEffect(() => () => images.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl)), [images]);

  const supplierOptions = useMemo(() => {
    const list = companies.map((c) => ({ id: c.id, label: c.sokoId ? `${c.companyName} (${c.sokoId})` : c.companyName }));
    if (product && !list.some((c) => c.id === product.companyId)) list.unshift({ id: product.companyId, label: product.supplierName ?? 'Current supplier (not visible)' });
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [companies, product]);
  const categoryOptions = categories.filter((c) => c.name !== UNCATEGORISED);
  const subcategoryOptions = categories.find((c) => c.name === category)?.subcategories ?? [];
  const brandMatch = brand.trim() ? brands.find((b) => b.key === normaliseBrand(brand)) : undefined;
  const brandIsVariant = brandMatch && brandMatch.name !== brand.trim();

  const checklist = [
    { label: 'Product name', done: name.trim().length > 0 },
    { label: 'Supplier company', done: supplierId !== '' },
    { label: 'Main category', done: category !== '' },
    { label: 'Description', done: description.trim().length >= 40 },
    { label: 'At least one image', done: images.length > 0 || (product?.imagePaths.length ?? 0) > 0 },
    { label: 'Technical specifications', done: specs.some((s) => s.label.trim() && s.value.trim()) },
  ];
  const requiredMissing = checklist.slice(0, 3).filter((c) => !c.done).length;

  const addFiles = (files: FileList | null, kind: 'image' | 'doc') => {
    if (!files) return;
    const next = [...files].map((f) => ({ id: nextId(), name: f.name, size: f.size, previewUrl: kind === 'image' ? URL.createObjectURL(f) : null }));
    if (kind === 'image') setImages((prev) => [...prev, ...next]);
    else setDocuments((prev) => [...prev, ...next]);
  };

  const footer = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] text-slate-500">
        {requiredMissing > 0 ? `${requiredMissing} required field(s) missing.` : 'Required fields complete.'} Nothing on this form is saved.
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
          Cancel
        </button>
        <DisabledButton icon={Save} label="Save Draft" />
        <DisabledButton icon={Send} label="Submit for Review" />
      </div>
    </div>
  );

  return (
    <AdminDrawer
      titleId="product-editor-title"
      title={isNew ? 'Add New Product' : `Edit ${product.name}`}
      eyebrow={
        <>
          {isNew ? 'New listing' : <span className="font-mono">{productCode(product.id)}</span>} <UiOnlyTag />
        </>
      }
      icon={isNew ? PackagePlus : Pencil}
      onClose={onClose}
      footer={footer}
      width="max-w-4xl"
    >
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
        <form className="flex flex-col gap-4 lg:col-span-2" onSubmit={(e) => e.preventDefault()} aria-labelledby="product-editor-title">
          <RestrictedNote>
            This form is a workflow prototype. Values stay in this browser tab; image and document files are previewed locally and never uploaded.
          </RestrictedNote>

          <FormSection title="Product details">
            <FormField id="pe-name" label="Product name" required>
              <input id="pe-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Structural Steel I-Beam IPE 300" className={inputClass} />
            </FormField>
            <FormField id="pe-desc" label="Description" hint={`${description.trim().length} characters. Aim for at least 40 so buyers can compare listings.`}>
              <textarea id="pe-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} leading-relaxed`} />
            </FormField>
            <FormField id="pe-type" label="Product type">
              <input id="pe-type" value={type} onChange={(e) => setType(e.target.value)} placeholder="material, equipment, service…" className={inputClass} />
            </FormField>
          </FormSection>

          <FormSection title="Supplier & brand">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="pe-supplier" label="Supplier company" required>
                <select id="pe-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">Select a supplier</option>
                  {supplierOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                id="pe-brand"
                label="Brand"
                hint={
                  brandIsVariant ? (
                    <span className="text-amber-700">Matches registry brand &ldquo;{brandMatch.name}&rdquo;. Use the canonical spelling.</span>
                  ) : brand.trim() && !brandMatch ? (
                    'New brand. It will need approval in Brands.'
                  ) : undefined
                }
              >
                <input id="pe-brand" list="pe-brand-options" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} />
                <datalist id="pe-brand-options">
                  {brands.map((b) => (
                    <option key={b.key} value={b.name} />
                  ))}
                </datalist>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Classification">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="pe-category" label="Main category" required>
                <select
                  id="pe-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory('');
                  }}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">Select a category</option>
                  {categoryOptions.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {category && !categoryOptions.some((c) => c.name === category) && <option value={category}>{category}</option>}
                </select>
              </FormField>
              <FormField id="pe-sub" label="Subcategory">
                <input id="pe-sub" list="pe-sub-options" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} disabled={!category} className={`${inputClass} disabled:bg-slate-50`} />
                <datalist id="pe-sub-options">
                  {subcategoryOptions.map((s) => (
                    <option key={s.name} value={s.name} />
                  ))}
                </datalist>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Product images" description="JPG or PNG, at least 800 px on the long edge. The first image is the listing thumbnail.">
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {product?.thumbnailUrl && (
                <li className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <img src={product.thumbnailUrl} alt={`Current image of ${product.name}`} className="h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">Current</span>
                </li>
              )}
              {images.map((img) => (
                <li key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {img.previewUrl && <img src={img.previewUrl} alt={`Preview of ${img.name}`} className="h-full w-full object-cover" />}
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((p) => p.id !== img.id))}
                    aria-label={`Remove ${img.name}`}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-700 shadow-xs hover:text-rose-700 cursor-pointer"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
              <li>
                <label htmlFor="pe-images" className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-[11px] font-semibold text-slate-500 hover:border-slate-400 hover:bg-slate-50">
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  Add images
                </label>
                <input id="pe-images" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files, 'image')} />
              </li>
            </ul>
          </FormSection>

          <FormSection title="Technical specifications">
            {specs.length === 0 && <p className="text-xs text-slate-500">No specifications yet.</p>}
            <ul className="flex flex-col gap-2">
              {specs.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2">
                  <label htmlFor={`pe-spec-l-${s.id}`} className="sr-only">
                    Specification {i + 1} label
                  </label>
                  <input
                    id={`pe-spec-l-${s.id}`}
                    value={s.label}
                    onChange={(e) => setSpecs((prev) => prev.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))}
                    placeholder="Label, e.g. Grade"
                    className={`${inputClass} w-2/5`}
                  />
                  <label htmlFor={`pe-spec-v-${s.id}`} className="sr-only">
                    Specification {i + 1} value
                  </label>
                  <input
                    id={`pe-spec-v-${s.id}`}
                    value={s.value}
                    onChange={(e) => setSpecs((prev) => prev.map((x) => (x.id === s.id ? { ...x, value: e.target.value } : x)))}
                    placeholder="Value, e.g. S355"
                    className={inputClass}
                  />
                  <button type="button" onClick={() => setSpecs((prev) => prev.filter((x) => x.id !== s.id))} aria-label={`Remove specification ${i + 1}`} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700 cursor-pointer">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setSpecs((prev) => [...prev, { id: nextId(), label: '', value: '' }])}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add specification
            </button>
          </FormSection>

          <FormSection title="Trade details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="pe-unit" label="Unit of measurement" tag={<NotInSchemaTag />}>
                <select id="pe-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">Select a unit</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="pe-origin" label="Country of origin" tag={<NotInSchemaTag />}>
                <input id="pe-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. United Arab Emirates" className={inputClass} />
              </FormField>
            </div>
            <FormField id="pe-certs" label="Certifications" tag={<NotInSchemaTag />}>
              <ChipInput id="pe-certs" values={certifications} onChange={setCertifications} placeholder="e.g. ISO 9001, then press Enter" />
            </FormField>
            <FormField id="pe-docs" label="Supporting documents" tag={<NotInSchemaTag />} hint="Datasheets, test certificates or approvals. PDF up to 10 MB each.">
              <label htmlFor="pe-docs" className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-4 text-xs font-semibold text-slate-500 hover:border-slate-400 hover:bg-slate-50">
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Attach documents
              </label>
              <input id="pe-docs" type="file" accept=".pdf,.doc,.docx,.xlsx" multiple className="sr-only" onChange={(e) => addFiles(e.target.files, 'doc')} />
              {documents.length > 0 && (
                <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                      <span className="truncate font-medium text-slate-900">{d.name}</span>
                      <span className="flex items-center gap-2 text-slate-500">
                        {formatBytes(d.size)}
                        <button type="button" onClick={() => setDocuments((prev) => prev.filter((x) => x.id !== d.id))} aria-label={`Remove ${d.name}`} className="text-slate-400 hover:text-rose-700 cursor-pointer">
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </FormField>
          </FormSection>

          <FormSection title="Visibility & status">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-xs font-semibold text-slate-700">Listing status</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PRODUCT_STATUSES.map((s) => (
                  <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${status === s ? 'border-blue-600 bg-blue-50/60 text-blue-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    <input type="radio" name="pe-status" value={s} checked={status === s} onChange={() => setStatus(s)} className="accent-blue-700" />
                    {PRODUCT_STATUS_LABELS[s]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="pe-visibility" label="Listing visibility" tag={<NotInSchemaTag />}>
                <select id="pe-visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'invited')} className={`${inputClass} cursor-pointer`}>
                  <option value="public">All verified buyers</option>
                  <option value="invited">Invited buyers only</option>
                </select>
              </FormField>
              <FormField id="pe-regions" label="Service regions">
                <ChipInput id="pe-regions" values={regions} onChange={setRegions} placeholder="e.g. Dubai, then press Enter" />
              </FormField>
            </div>
          </FormSection>
        </form>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start" aria-label="Listing readiness">
          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900">Listing readiness</h3>
            <ul className="flex flex-col gap-2">
              {checklist.map((c, i) => (
                <li key={c.label} className="flex items-center gap-2 text-xs">
                  {c.done ? <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />}
                  <span className={c.done ? 'text-slate-900' : 'text-slate-500'}>
                    {c.label}
                    {i < 3 && <span className="text-rose-600"> *</span>}
                  </span>
                  <span className="sr-only">{c.done ? 'complete' : 'incomplete'}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs leading-relaxed text-slate-600">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              Review workflow <UiOnlyTag />
            </h3>
            <p className="text-pretty">
              <strong className="font-semibold text-slate-900">Save Draft</strong> would store the listing as a draft for the supplier.{' '}
              <strong className="font-semibold text-slate-900">Submit for Review</strong> would queue it for catalog governance before publishing. Both need an authorized admin function.
            </p>
          </section>
        </aside>
      </div>
    </AdminDrawer>
  );
};
