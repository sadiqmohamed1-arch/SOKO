import React, { useState } from 'react';
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
import { InfoTooltip, INTELLIGENCE_EXPLAINER } from './SupplierTrust';

interface SupplierFiltersPanelProps {
  filters: SupplierFilters;
  onChange: (next: SupplierFilters) => void;
}

const COLLAPSED_COUNT = 6;

const Section: React.FC<{ title: React.ReactNode; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset className="py-4 border-b border-slate-100 last:border-b-0">
    <legend className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 mb-2 flex items-center gap-1">{title}</legend>
    <div className="space-y-1">{children}</div>
  </fieldset>
);

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
        <label key={o.value} className="flex items-center gap-2 py-0.5 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => onToggle(o.value)}
            className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500/30"
          />
          {o.label}
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
      <Section title="Category">
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
      <Section title="Subcategory">
        <CheckList options={asOptions(subcategories)} selected={f.subcategories} onToggle={(v) => onChange({ ...f, subcategories: toggle(f.subcategories, v) })} />
      </Section>
      <Section title="Location">
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
      <Section title="Verification Status">
        <CheckList
          options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))}
          selected={f.statuses}
          onToggle={(v) => onChange({ ...f, statuses: toggle(f.statuses, v as SupplierFilters['statuses'][number]) })}
        />
      </Section>
      <Section title="Products / Brands">
        <CheckList options={asOptions(FILTER_FACETS.brands)} selected={f.brands} onToggle={(v) => onChange({ ...f, brands: toggle(f.brands, v) })} />
      </Section>
      <Section title="Certifications">
        <CheckList
          options={asOptions(FILTER_FACETS.certifications)}
          selected={f.certifications}
          onToggle={(v) => onChange({ ...f, certifications: toggle(f.certifications, v) })}
        />
      </Section>
      <Section title="Supplier Type">
        <CheckList
          options={asOptions(SUPPLIER_TYPES)}
          selected={f.types}
          onToggle={(v) => onChange({ ...f, types: toggle(f.types, v as SupplierFilters['types'][number]) })}
        />
      </Section>
      <Section
        title={
          <>
            SOKO Intelligence <InfoTooltip text={INTELLIGENCE_EXPLAINER} label="About SOKO Intelligence" align="left" />
          </>
        }
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
      </Section>
    </div>
  );
};
