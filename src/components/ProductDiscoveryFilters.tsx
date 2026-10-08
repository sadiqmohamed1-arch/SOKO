import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LOCATION_OPTIONS, STATUS_META, STATUS_ORDER, SUPPLIER_TYPES } from '../data/buyerSuppliers';
import { BRANDS, DISCOVERY_CATEGORIES, DiscoveryFilters, discoverySubcategories } from '../data/productDiscovery';

const COLLAPSED_COUNT = 6;

const Section: React.FC<{ title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, count = 0, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen || count > 0);
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 py-2.5 text-left cursor-pointer group">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-600 group-hover:text-slate-900">
          {title}
          {count > 0 && <span className="ml-1.5 px-1.5 rounded-full bg-blue-50 text-blue-700 normal-case tracking-normal">{count}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-700 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="pb-3 space-y-1">{children}</div>}
    </div>
  );
};

const CheckList: React.FC<{ options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void }> = ({ options, selected, onToggle }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, COLLAPSED_COUNT);
  return (
    <>
      {visible.map((o) => (
        <label key={o.value} className="flex items-start gap-2 py-0.5 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => onToggle(o.value)}
            className="mt-0.5 w-4 h-4 shrink-0 rounded border-slate-300 text-blue-700 focus:ring-blue-500/30"
          />
          <span className="min-w-0">{o.label}</span>
        </label>
      ))}
      {options.length > COLLAPSED_COUNT && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
          {expanded ? 'Show less' : `Show all ${options.length}`}
        </button>
      )}
    </>
  );
};

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
const asOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }));

export const ProductDiscoveryFilters: React.FC<{ filters: DiscoveryFilters; onChange: (next: DiscoveryFilters) => void }> = ({ filters: f, onChange }) => {
  const subcategories = discoverySubcategories(f.categories);
  return (
    <div>
      <Section title="Category" count={f.categories.length} defaultOpen>
        <CheckList
          options={asOptions(DISCOVERY_CATEGORIES.map((c) => c.name))}
          selected={f.categories}
          onToggle={(v) => {
            const categories = toggle(f.categories, v);
            const allowed = discoverySubcategories(categories);
            onChange({ ...f, categories, subcategories: f.subcategories.filter((s) => allowed.includes(s)) });
          }}
        />
      </Section>
      <Section title="Subcategory" count={f.subcategories.length}>
        <CheckList options={asOptions(subcategories)} selected={f.subcategories} onToggle={(v) => onChange({ ...f, subcategories: toggle(f.subcategories, v) })} />
      </Section>
      <Section title="Brand" count={f.brands.length}>
        <CheckList options={asOptions(BRANDS.map((b) => b.name))} selected={f.brands} onToggle={(v) => onChange({ ...f, brands: toggle(f.brands, v) })} />
      </Section>
      <Section title="Location" count={f.locationId !== 'all' ? 1 : 0}>
        {LOCATION_OPTIONS.map((o) => (
          <label key={o.id} className={`flex items-center gap-2 py-0.5 text-sm text-slate-700 cursor-pointer ${o.regions || o.excludeRegions ? 'pl-4' : ''}`}>
            <input
              type="radio"
              name="discovery-location"
              checked={f.locationId === o.id}
              onChange={() => onChange({ ...f, locationId: o.id })}
              className="w-4 h-4 border-slate-300 text-blue-700 focus:ring-blue-500/30"
            />
            {o.label}
          </label>
        ))}
      </Section>
      <Section title="Supplier Type" count={f.types.length}>
        <CheckList options={asOptions(SUPPLIER_TYPES)} selected={f.types} onToggle={(v) => onChange({ ...f, types: toggle(f.types, v as DiscoveryFilters['types'][number]) })} />
      </Section>
      <Section title="SOKO Verification Status" count={f.statuses.length}>
        <CheckList
          options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))}
          selected={f.statuses}
          onToggle={(v) => onChange({ ...f, statuses: toggle(f.statuses, v as DiscoveryFilters['statuses'][number]) })}
        />
      </Section>
      <Section title="Catalogue" count={f.catalogueOnly ? 1 : 0}>
        <label className="flex items-center gap-2 py-0.5 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={f.catalogueOnly}
            onChange={() => onChange({ ...f, catalogueOnly: !f.catalogueOnly })}
            className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500/30"
          />
          Catalogue available
        </label>
      </Section>
    </div>
  );
};
