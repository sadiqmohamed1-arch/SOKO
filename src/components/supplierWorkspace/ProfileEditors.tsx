import React, { useState } from 'react';
import { CompanyProfile } from '../../data/supplierTypes';
import { SupplierContact, SupplierCertification } from '../../data/buyerSuppliers';
import { EMIRATES, TRADE_CATEGORIES, subcategoriesOf } from '../../data/marketHubCatalog';
import { CONTRACTOR_CLASSIFICATIONS, DISCIPLINE_NAMES, disciplineSubsOf, legacyValues, normalizeContractorProfile } from '../../data/contractorTaxonomy';
import { ProfileDialog } from '../ProfileDialog';
import { btnPrimary, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { ChipToggle } from '../marketHub/MarketHubShared';

export const SUPPLIER_TYPE_OPTIONS = ['Manufacturer', 'Distributor', 'Trader', 'Stockist', 'Subcontractor', 'Service Provider', 'Equipment Supplier', 'Rental Company', 'Specialist Contractor'];
export const MARKET_OPTIONS = ['UAE', 'Saudi Arabia', 'Oman', 'Qatar', 'Bahrain', 'Kuwait', 'Wider GCC', 'Africa', 'South Asia'];

type Save = (patch: Partial<CompanyProfile>, label: string) => boolean;

const Footer: React.FC<{ onClose: () => void; onSave: () => void; label?: string }> = ({ onClose, onSave, label = 'Save changes' }) => (
  <div className="flex justify-end gap-2">
    <button type="button" onClick={onClose} className={btnSecondary}>
      Cancel
    </button>
    <button type="button" onClick={onSave} className={btnPrimary}>
      {label}
    </button>
  </div>
);

export const TextField: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }> = ({ label, value, onChange, type = 'text', placeholder, required }) => (
  <label className="block">
    <span className={labelCls}>
      {label}
      {required && <span className="text-rose-600"> *</span>}
    </span>
    <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
  </label>
);

export const CompanyInfoFields: React.FC<{ value: CompanyProfile; onChange: (p: CompanyProfile) => void }> = ({ value: p, onChange }) => {
  const set = <K extends keyof CompanyProfile>(k: K) => (v: CompanyProfile[K]) => onChange({ ...p, [k]: v });
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <TextField label="Legal company name" value={p.legalName} onChange={set('legalName')} required />
      <TextField label="Trading name" value={p.tradingName} onChange={set('tradingName')} required />
      <TextField label="Trade license number" value={p.licenseNo} onChange={set('licenseNo')} required />
      <TextField label="Issuing authority" value={p.issuingAuthority} onChange={set('issuingAuthority')} />
      <TextField label="License expiry" type="date" value={p.licenseExpiry} onChange={set('licenseExpiry')} />
      <TextField label="Year established" type="number" value={p.established ? String(p.established) : ''} onChange={(v) => set('established')(v ? Number(v) : undefined)} />
      <TextField label="Country" value={p.country} onChange={set('country')} />
      <label className="block">
        <span className={labelCls}>Emirate / city</span>
        <select value={p.emirate} onChange={(e) => set('emirate')(e.target.value)} className={inputCls}>
          {EMIRATES.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2">
        <TextField label="Business address" value={p.address} onChange={set('address')} />
      </div>
      <TextField label="Website" value={p.website} onChange={set('website')} placeholder="https://" />
      <TextField label="General email" type="email" value={p.generalEmail} onChange={set('generalEmail')} />
      <TextField label="Telephone" value={p.phone} onChange={set('phone')} />
    </div>
  );
};

export const CompanyInfoDialog: React.FC<{ profile: CompanyProfile; onSave: Save; onClose: () => void }> = ({ profile, onSave, onClose }) => {
  const [p, setP] = useState(profile);
  return (
    <ProfileDialog title="Company information" subtitle="Updates appear on your Supplier Directory profile." size="lg" onClose={onClose} footer={<Footer onClose={onClose} onSave={() => onSave(p, 'Updated company information') && onClose()} />}>
      <CompanyInfoFields value={p} onChange={setP} />
    </ProfileDialog>
  );
};

export const TaxonomyFields: React.FC<{ value: CompanyProfile; onChange: (p: CompanyProfile) => void; hideTypes?: boolean }> = ({ value: p, onChange, hideTypes }) => {
  const subs = Array.from(new Set(p.categories.flatMap(subcategoriesOf)));
  return (
    <div className="space-y-4">
      {!hideTypes && (
        <div>
          <p className={labelCls}>Supplier type</p>
          <ChipToggle options={SUPPLIER_TYPE_OPTIONS} value={p.types} onChange={(types) => onChange({ ...p, types })} />
        </div>
      )}
      <div>
        <p className={labelCls}>Trade categories (first selected is your primary category)</p>
        <ChipToggle options={TRADE_CATEGORIES} value={p.categories} onChange={(categories) => onChange({ ...p, categories, subcategories: p.subcategories.filter((s) => categories.flatMap(subcategoriesOf).includes(s)) })} />
      </div>
      {subs.length > 0 && (
        <div>
          <p className={labelCls}>Subcategories</p>
          <ChipToggle options={subs} value={p.subcategories} onChange={(subcategories) => onChange({ ...p, subcategories })} />
        </div>
      )}
    </div>
  );
};

export const ContractorTaxonomyFields: React.FC<{ value: CompanyProfile; onChange: (p: CompanyProfile) => void }> = ({ value: p, onChange }) => {
  const classificationOptions = [...CONTRACTOR_CLASSIFICATIONS, ...legacyValues(p.types, CONTRACTOR_CLASSIFICATIONS)];
  const disciplineOptions = [...DISCIPLINE_NAMES, ...legacyValues(p.categories, DISCIPLINE_NAMES)];
  const standardSubs = Array.from(new Set(p.categories.flatMap(disciplineSubsOf)));
  const subOptions = [...standardSubs, ...legacyValues(p.subcategories, standardSubs)];
  const setDisciplines = (categories: string[]) => {
    const removed = p.categories.filter((c) => !categories.includes(c)).flatMap(disciplineSubsOf);
    onChange({ ...p, categories, subcategories: p.subcategories.filter((s) => !removed.includes(s)) });
  };
  return (
    <div className="space-y-4">
      <div>
        <p className={labelCls}>Business classification (select all that apply)</p>
        <ChipToggle options={classificationOptions} value={p.types} onChange={(types) => onChange({ ...p, types })} />
      </div>
      <div>
        <p className={labelCls}>Construction disciplines (first selected is your primary discipline)</p>
        <ChipToggle options={disciplineOptions} value={p.categories} onChange={setDisciplines} />
        <p className="mt-1.5 text-[11px] text-slate-500">Disciplines describe work your company carries out. They do not list you as a materials supplier.</p>
      </div>
      {subOptions.length > 0 && (
        <div>
          <p className={labelCls}>Specialisms</p>
          <ChipToggle options={subOptions} value={p.subcategories} onChange={(subcategories) => onChange({ ...p, subcategories })} />
        </div>
      )}
    </div>
  );
};

export const OverviewDialog: React.FC<{ profile: CompanyProfile; onSave: Save; onClose: () => void; contractor?: boolean }> = ({ profile, onSave, onClose, contractor }) => {
  const [p, setP] = useState(() => (contractor ? normalizeContractorProfile(profile) : profile));
  const [caps, setCaps] = useState(profile.capabilities.join(', '));
  if (contractor)
    return (
      <ProfileDialog
        title="Overview & construction disciplines"
        size="lg"
        onClose={onClose}
        footer={<Footer onClose={onClose} onSave={() => onSave({ ...p, capabilities: caps.split(',').map((c) => c.trim()).filter(Boolean) }, 'Updated company overview') && onClose()} />}
      >
        <div className="space-y-4">
          <label className="block">
            <span className={labelCls}>Company description</span>
            <textarea rows={4} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} className={`${inputCls} py-2`} />
            <span className="text-[11px] text-slate-500">{p.description.length} characters · 80+ recommended</span>
          </label>
          <ContractorTaxonomyFields value={p} onChange={setP} />
          <TextField label="Services offered (comma separated, e.g. Turnkey Construction, Design-Build)" value={caps} onChange={setCaps} />
        </div>
      </ProfileDialog>
    );
  return (
    <ProfileDialog
      title="Overview & trade categories"
      size="lg"
      onClose={onClose}
      footer={<Footer onClose={onClose} onSave={() => onSave({ ...p, capabilities: caps.split(',').map((c) => c.trim()).filter(Boolean) }, 'Updated company overview') && onClose()} />}
    >
      <div className="space-y-4">
        <label className="block">
          <span className={labelCls}>Company description</span>
          <textarea rows={4} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} className={`${inputCls} py-2`} />
          <span className="text-[11px] text-slate-500">{p.description.length} characters · 80+ recommended</span>
        </label>
        <TextField label="Short descriptor (e.g. Specialist Supplier)" value={p.descriptor ?? ''} onChange={(descriptor) => setP({ ...p, descriptor })} />
        <TaxonomyFields value={p} onChange={setP} />
        <TextField label="Products / services offered (comma separated)" value={caps} onChange={setCaps} />
      </div>
    </ProfileDialog>
  );
};

export const LocationsDialog: React.FC<{ profile: CompanyProfile; onSave: Save; onClose: () => void }> = ({ profile, onSave, onClose }) => {
  const [p, setP] = useState(profile);
  return (
    <ProfileDialog title="Locations & markets served" onClose={onClose} footer={<Footer onClose={onClose} onSave={() => onSave(p, 'Updated locations and markets') && onClose()} />}>
      <div className="space-y-4">
        <TextField label="Business address" value={p.address} onChange={(address) => setP({ ...p, address })} />
        <div>
          <p className={labelCls}>Regions served</p>
          <ChipToggle options={EMIRATES} value={p.regionsServed} onChange={(regionsServed) => setP({ ...p, regionsServed })} />
        </div>
        <div>
          <p className={labelCls}>Markets served</p>
          <ChipToggle options={MARKET_OPTIONS} value={p.marketsServed} onChange={(marketsServed) => setP({ ...p, marketsServed })} />
        </div>
      </div>
    </ProfileDialog>
  );
};

const EMPTY_CONTACT: SupplierContact = { id: '', name: '', title: '', category: '', location: '', phone: '', email: '', visibility: 'network' };

export const ContactDialog: React.FC<{ contact?: SupplierContact; defaults: Partial<SupplierContact>; onSave: (c: SupplierContact) => void; onClose: () => void }> = ({ contact, defaults, onSave, onClose }) => {
  const [c, setC] = useState<SupplierContact>(contact ?? { ...EMPTY_CONTACT, ...defaults, id: `ct_${Date.now().toString(36)}` });
  const set = (k: keyof SupplierContact) => (v: string) => setC({ ...c, [k]: v });
  return (
    <ProfileDialog title={contact ? 'Edit key contact' : 'Add key contact'} subtitle="Key contacts are shown on your public profile according to their visibility." onClose={onClose} footer={<Footer onClose={onClose} onSave={() => c.name.trim() && c.title.trim() && onSave(c)} label="Save contact" />}>
      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Full name" value={c.name} onChange={set('name')} required />
        <TextField label="Job title" value={c.title} onChange={set('title')} required />
        <TextField label="Responsible for (category)" value={c.category} onChange={set('category')} />
        <TextField label="Location" value={c.location} onChange={set('location')} />
        <TextField label="Business email" value={c.email ?? ''} onChange={set('email')} />
        <TextField label="Business phone" value={c.phone ?? ''} onChange={set('phone')} />
        <label className="block sm:col-span-2">
          <span className={labelCls}>Contact details visible to</span>
          <select value={c.visibility} onChange={(e) => setC({ ...c, visibility: e.target.value as SupplierContact['visibility'] })} className={inputCls}>
            <option value="public">Everyone on SOKO</option>
            <option value="network">Connected buyers only</option>
            <option value="on-request">On request – details shared after approval</option>
          </select>
        </label>
      </div>
    </ProfileDialog>
  );
};

export const CertificationDialog: React.FC<{ onSave: (c: SupplierCertification) => void; onClose: () => void }> = ({ onSave, onClose }) => {
  const [c, setC] = useState<SupplierCertification>({ name: '', issuer: '', status: 'pending', validUntil: '' });
  return (
    <ProfileDialog title="Add certification" subtitle="Listed certifications are reviewed by SOKO before they show as active." onClose={onClose} footer={<Footer onClose={onClose} onSave={() => c.name.trim() && c.issuer.trim() && onSave({ ...c, validUntil: c.validUntil || undefined })} label="Add certification" />}>
      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Certification" value={c.name} onChange={(name) => setC({ ...c, name })} placeholder="ISO 9001:2015" required />
        <TextField label="Issued by" value={c.issuer} onChange={(issuer) => setC({ ...c, issuer })} placeholder="Bureau Veritas" required />
        <TextField label="Valid until" type="date" value={c.validUntil ?? ''} onChange={(validUntil) => setC({ ...c, validUntil })} />
      </div>
    </ProfileDialog>
  );
};
