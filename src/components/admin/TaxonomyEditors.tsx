import React, { useEffect, useMemo, useState } from 'react';
import { FolderPlus, FolderPen, Tag, ImagePlus, X, Save, Merge, Wand2, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { type BrandNode, type CategoryNode, UNCATEGORISED, categoryKey, normaliseBrand } from './productShared';
import { AdminDrawer, FormField, FormSection, NotInSchemaTag, inputClass } from './adminDrawer';
import { RestrictedNote, UiOnlyTag } from './visitBadges';
import { DisabledButton } from './catalogUi';

const EditorFooter: React.FC<{ onClose: () => void; saveLabel: string }> = ({ onClose, saveLabel }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <span className="text-[11px] text-slate-500">Nothing on this form is saved.</span>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
        Cancel
      </button>
      <DisabledButton icon={Save} label={saveLabel} />
    </div>
  </div>
);

// ---------------------------------------------------------------------------------------------------------

interface CategoryEditorProps {
  /** Null when creating a category. */
  category: CategoryNode | null;
  categories: CategoryNode[];
  onClose: () => void;
}

export const CategoryEditorDrawer: React.FC<CategoryEditorProps> = ({ category, categories, onClose }) => {
  const isNew = category === null;
  const [name, setName] = useState(category?.name ?? '');
  const [parent, setParent] = useState('');
  const [description, setDescription] = useState('');
  const suggestedAttributes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of category?.products ?? []) for (const s of p.specs ?? []) counts.set(s.label.trim(), (counts.get(s.label.trim()) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l).slice(0, 8);
  }, [category]);
  const [attributes, setAttributes] = useState<{ id: number; label: string; required: boolean }[]>(() => suggestedAttributes.map((label, id) => ({ id, label, required: false })));
  const [mergeTarget, setMergeTarget] = useState('');

  const others = categories.filter((c) => c.name !== UNCATEGORISED && c.name !== category?.name);
  const key = name.trim() ? categoryKey(name) : '';
  const clashes = key ? others.filter((c) => categoryKey(c.name) === key) : [];
  const exact = others.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());

  return (
    <AdminDrawer
      titleId="category-editor-title"
      title={isNew ? 'Add Category' : `Edit ${category.name}`}
      eyebrow={
        <>
          Category management <UiOnlyTag />
        </>
      }
      icon={isNew ? FolderPlus : FolderPen}
      onClose={onClose}
      footer={<EditorFooter onClose={onClose} saveLabel={isNew ? 'Create Category' : 'Save Category'} />}
    >
      <form className="flex flex-col gap-4 p-5" onSubmit={(e) => e.preventDefault()} aria-labelledby="category-editor-title">
        <RestrictedNote>Categories are currently free text on each listing. Saving, hierarchy and attributes need a managed taxonomy table and an admin function.</RestrictedNote>

        <FormSection title="Category">
          <FormField
            id="ce-name"
            label="Category name"
            required
            hint={
              exact ? (
                <span className="text-rose-700">A category with this name already exists.</span>
              ) : clashes.length > 0 ? (
                <span className="text-amber-700">Looks like {clashes.map((c) => `\u201C${c.name}\u201D`).join(', ')}. Consider merging instead.</span>
              ) : undefined
            }
          >
            <input id="ce-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </FormField>
          <FormField id="ce-parent" label="Parent category" hint="Leave as top level, or nest under an existing category." tag={<NotInSchemaTag />}>
            <select id="ce-parent" value={parent} onChange={(e) => setParent(e.target.value)} className={`${inputClass} cursor-pointer`}>
              <option value="">Top level</option>
              {others.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="ce-desc" label="Description" hint="Shown to suppliers when they classify a listing." tag={<NotInSchemaTag />}>
            <textarea id="ce-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} leading-relaxed`} />
          </FormField>
        </FormSection>

        {!isNew && (
          <FormSection title="Hierarchy" description="Current children, derived from listing subcategories.">
            <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 text-xs">
              <span className="font-semibold text-slate-900">{parent ? `${parent} \u203A ${name || category.name}` : name || category.name}</span>
              {category.subcategories.length === 0 ? (
                <span className="pl-4 text-slate-500">No subcategories</span>
              ) : (
                <ul className="flex flex-col gap-0.5 border-l border-slate-200 pl-4">
                  {category.subcategories.map((s) => (
                    <li key={s.name} className="flex justify-between gap-2 text-slate-700">
                      <span>{s.name}</span>
                      <span className="font-mono text-slate-500">{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormSection>
        )}

        <FormSection title="Category attributes" description={suggestedAttributes.length > 0 ? 'Pre-filled from the specification labels most used in this category.' : 'Specification fields suppliers should complete for listings in this category.'}>
          <div className="flex items-center gap-2">
            <NotInSchemaTag />
          </div>
          <ul className="flex flex-col gap-2">
            {attributes.map((a, i) => (
              <li key={a.id} className="flex items-center gap-2">
                <label htmlFor={`ce-attr-${a.id}`} className="sr-only">
                  Attribute {i + 1}
                </label>
                <input
                  id={`ce-attr-${a.id}`}
                  value={a.label}
                  onChange={(e) => setAttributes((prev) => prev.map((x) => (x.id === a.id ? { ...x, label: e.target.value } : x)))}
                  className={inputClass}
                  placeholder="e.g. Grade"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={a.required}
                    onChange={(e) => setAttributes((prev) => prev.map((x) => (x.id === a.id ? { ...x, required: e.target.checked } : x)))}
                    className="accent-blue-700"
                  />
                  Required
                </label>
                <button type="button" onClick={() => setAttributes((prev) => prev.filter((x) => x.id !== a.id))} aria-label={`Remove attribute ${i + 1}`} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700 cursor-pointer">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setAttributes((prev) => [...prev, { id: Date.now(), label: '', required: false }])}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add attribute
          </button>
        </FormSection>

        {!isNew && (
          <FormSection title="Merge into another category" description={`Re-point all ${category.products.length} listings to the target and retire this category.`}>
            <FormField id="ce-merge" label="Merge target">
              <select id="ce-merge" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className={`${inputClass} cursor-pointer`}>
                <option value="">Select a category</option>
                {others.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.products.length})
                  </option>
                ))}
              </select>
            </FormField>
            {mergeTarget && (
              <p className="text-xs text-slate-600">
                Would move {category.products.length} listings from &ldquo;{category.name}&rdquo; to &ldquo;{mergeTarget}&rdquo;.
              </p>
            )}
            <span className="self-start">
              <DisabledButton icon={Merge} label="Merge Categories" />
            </span>
          </FormSection>
        )}
      </form>
    </AdminDrawer>
  );
};

// ---------------------------------------------------------------------------------------------------------

interface BrandEditorProps {
  brand: BrandNode | null;
  brands: BrandNode[];
  onClose: () => void;
}

export const BrandEditorDrawer: React.FC<BrandEditorProps> = ({ brand, brands, onClose }) => {
  const isNew = brand === null;
  const [name, setName] = useState(brand?.name ?? '');
  const [manufacturer, setManufacturer] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState<{ url: string; name: string } | null>(null);

  useEffect(
    () => () => {
      if (logo) URL.revokeObjectURL(logo.url);
    },
    [logo],
  );

  const key = normaliseBrand(name);
  const duplicates = key ? brands.filter((b) => b.key !== brand?.key && (b.key === key || (key.length >= 4 && (b.key.startsWith(key) || key.startsWith(b.key))))) : [];
  const variantsToNormalise = brand ? brand.variants.filter((v) => v !== name.trim()) : [];
  const affected = brand ? brand.products.filter((p) => p.brand?.trim() !== name.trim()).length : 0;
  const websiteInvalid = website.trim() !== '' && !/^https?:\/\/\S+\.\S+/.test(website.trim());

  return (
    <AdminDrawer
      titleId="brand-editor-title"
      title={isNew ? 'Add Brand' : `Edit ${brand.name}`}
      eyebrow={
        <>
          Brand registry <UiOnlyTag />
        </>
      }
      icon={Tag}
      onClose={onClose}
      footer={<EditorFooter onClose={onClose} saveLabel={isNew ? 'Create Brand' : 'Save Brand'} />}
    >
      <form className="flex flex-col gap-4 p-5" onSubmit={(e) => e.preventDefault()} aria-labelledby="brand-editor-title">
        <RestrictedNote>There is no brand registry table yet; brands are free text on listings. Saving, logos and manufacturer details need a registry and an admin function.</RestrictedNote>

        <FormSection title="Brand">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {logo ? <img src={logo.url} alt={`Logo preview for ${name || 'brand'}`} className="h-full w-full object-contain p-2" /> : <span className="text-xl font-bold text-slate-400">{(name || '?').slice(0, 2).toUpperCase()}</span>}
              </span>
              <label htmlFor="be-logo" className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800">
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                {logo ? 'Replace logo' : 'Upload logo'}
              </label>
              <input
                id="be-logo"
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setLogo({ url: URL.createObjectURL(f), name: f.name });
                }}
              />
              {logo && (
                <button type="button" onClick={() => setLogo(null)} className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-700 cursor-pointer">
                  <X className="h-3 w-3" aria-hidden="true" />
                  Remove
                </button>
              )}
              <NotInSchemaTag />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <FormField id="be-name" label="Brand name" required hint={key ? <span className="font-mono">Normalised key: {key}</span> : undefined}>
                <input id="be-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id="be-mfr" label="Manufacturer" tag={<NotInSchemaTag />}>
                  <input id="be-mfr" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Legal brand owner" className={inputClass} />
                </FormField>
                <FormField id="be-country" label="Country" tag={<NotInSchemaTag />}>
                  <input id="be-country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} />
                </FormField>
              </div>
              <FormField id="be-web" label="Website" tag={<NotInSchemaTag />} hint={websiteInvalid ? <span className="text-rose-700">Use a full https:// address.</span> : undefined}>
                <input id="be-web" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={inputClass} />
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection title="Duplicate detection" description="Existing brands that normalise to the same or an overlapping key.">
          {duplicates.length === 0 ? (
            <p className="text-xs text-emerald-700">{key ? 'No likely duplicates.' : 'Enter a name to check for duplicates.'}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {duplicates.map((d) => (
                <li key={d.key} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                    <span className="truncate font-semibold text-slate-900">{d.name}</span>
                    <span className="text-slate-500">{d.products.length} listings</span>
                  </span>
                  <DisabledButton icon={Merge} label="Merge" />
                </li>
              ))}
            </ul>
          )}
        </FormSection>

        {!isNew && (
          <FormSection title="Brand normalisation" description="Rewrite every spelling of this brand on listings to the canonical name above.">
            {variantsToNormalise.length === 0 ? (
              <p className="text-xs text-slate-500">All {brand.products.length} listings already use &ldquo;{name.trim() || brand.name}&rdquo;.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-1.5">
                  {variantsToNormalise.map((v) => (
                    <li key={v} className="flex flex-wrap items-center gap-2 text-xs">
                      <code className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-slate-700">{v}</code>
                      <span className="text-slate-400" aria-hidden="true">{'\u2192'}</span>
                      <span className="sr-only">becomes</span>
                      <code className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-800">{name.trim() || brand.name}</code>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-600">Would update {affected} listings across {brand.suppliers.length} suppliers.</p>
              </>
            )}
            <span className="self-start">
              <DisabledButton icon={Wand2} label="Normalise Listings" />
            </span>
          </FormSection>
        )}
      </form>
    </AdminDrawer>
  );
};
