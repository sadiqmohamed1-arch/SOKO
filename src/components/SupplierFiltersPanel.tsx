import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  FILTER_FACETS,
  INTELLIGENCE_THRESHOLDS,
  LOCATION_OPTIONS,
  STATUS_META,
  STATUS_ORDER,
  SUPPLIER_TYPES,
  SupplierFilters,
  subcategoriesFor,
} from '../data/buyerSuppliers';
import { INTELLIGENCE_EXPLAINER } from './SupplierTrust';

interface SupplierFiltersPanelProps {
  filters: SupplierFilters;
  onChange: (next: SupplierFilters) => void;
}

const COLLAPSED_COUNT = 6;

const Section: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; count?: number }> = ({
  title,
  children,
  defaultOpen = false,
  count = 0,
}) => {
  const [open, setOpen] = useState(defaultOpen || count > 0);
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 py-2.5 text-left cursor-pointer group"
      >
        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-600 group-hover:text-slate-900 flex items-center gap-1 min-w-0">
          {title}
          {count > 0 && <span className="ml-1 px-1.5 rounded-full bg-blue-50 text-blue-700 normal-case tracking-normal">{count}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-700 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="pb-3 space-y-1">{children}</div>}
    </div>
  );
};

const CheckList: React.FC<{
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}> = ({ options, selected, onToggle }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, COLLAPSED_COUNT);
  return (
    <>
      {visible.map((o) => (
        <label key={o.value} className="flex items-start gap-2 py-0.5 text-sm text-slate-700 cursor-pointer hover:text-slate-900 break-words">
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

export const SupplierFiltersPanel: React.FC<SupplierFiltersPanelProps> = ({ filters: f, onChange }) => {
  const subcategories = subcategoriesFor(f.categories);
  return (
    <div>
      <Section title="Category" count={f.categories.length} defaultOpen>
        <CheckList
          options={asOptions(FILTER_FACETS.categories)}
          selected={f.categories}
          onToggle={(v) => {
            const categories = toggle(f.categories, v);
            const allowed = subcategoriesFor(categories);
            onChange({ ...f, categories, subcategories: f.subcategories.filter((s) => allowed.includes(s)) });
          }}
        />
      </Section>
      <Section title="Subcategory" count={f.subcategories.length}>
        {subcategories.length === 0 && <p className="text-xs text-slate-400">No subcategories available</p>}
        <CheckList options={asOptions(subcategories)} selected={f.subcategories} onToggle={(v) => onChange({ ...f, subcategories: toggle(f.subcategories, v) })} />
      </Section>
      <Section title="Location" count={f.locationId !== 'all' ? 1 : 0}>
        {LOCATION_OPTIONS.map((o) => (
          <label key={o.id} className={`flex items-center gap-2 py-0.5 text-sm text-slate-700 cursor-pointer ${o.regions || o.excludeRegions ? 'pl-4' : ''}`}>
            <input
              type="radio"
              name="supplier-location"
              checked={f.locationId === o.id}
              onChange={() => onChange({ ...f, locationId: o.id })}
              className="w-4 h-4 border-slate-300 text-blue-700 focus:ring-blue-500/30"
            />
            {o.label}
          </label>
        ))}
      </Section>
      <Section title="Verification Status" count={f.statuses.length}>
        <CheckList
          options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))}
          selected={f.statuses}
          onToggle={(v) => onChange({ ...f, statuses: toggle(f.statuses, v as SupplierFilters['statuses'][number]) })}
        />
      </Section>
      <Section title="Supplier Type" count={f.types.length}>
        <CheckList
          options={asOptions(SUPPLIER_TYPES)}
          selected={f.types}
          onToggle={(v) => onChange({ ...f, types: toggle(f.types, v as SupplierFilters['types'][number]) })}
        />
      </Section>
      <Section title="Brands / Products" count={f.brands.length}>
        <CheckList options={asOptions(FILTER_FACETS.brands)} selected={f.brands} onToggle={(v) => onChange({ ...f, brands: toggle(f.brands, v) })} />
      </Section>
      <Section title="Certifications" count={f.certifications.length}>
        <CheckList
          options={asOptions(FILTER_FACETS.certifications)}
          selected={f.certifications}
          onToggle={(v) => onChange({ ...f, certifications: toggle(f.certifications, v) })}
        />
      </Section>
      <Section
        count={f.minIntelligence ? 1 : 0}
        title="SOKO Intelligence"
      >
        {INTELLIGENCE_THRESHOLDS.map((t) => (
          <label key={t} className="flex items-center gap-2 py-0.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="supplier-intelligence"
              checked={f.minIntelligence === t}
              onChange={() => onChange({ ...f, minIntelligence: t })}
              className="w-4 h-4 border-slate-300 text-blue-700 focus:ring-blue-500/30"
            />
            {t === 0 ? 'Any' : `${t}+`}
          </label>
        ))}
        <p className="pt-2 text-[11px] leading-snug text-slate-500 [&_span]:text-slate-700 [&_span]:font-semibold">{INTELLIGENCE_EXPLAINER}</p>
      </Section>
    </div>
  );
};
