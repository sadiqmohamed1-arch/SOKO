import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Copy, ExternalLink, Pencil, Plus, Tag, Trash2, Upload, UserRound } from 'lucide-react';
import { CommunityContact } from '../../types';
import { BUYER_SUPPLIERS, SupplierContact, supplierShareUrl } from '../../data/buyerSuppliers';
import { CompanyProfile } from '../../data/supplierTypes';
import { profileChecklist, profileCompletion } from '../../data/supplierStore';
import { simulateVerificationReview, updateProfile } from '../../data/supplierService';
import { BuyerSupplierProfile } from '../BuyerSupplierProfile';
import { btnPrimary, btnSecondary, iconBtn, inputCls, StatusPill } from '../NetworkShared';
import { DemoNote, Field, SubTabs, fmtDate } from '../marketHub/MarketHubShared';
import { Card, CompanyLogo, Meter, NoPermission, PageHeader, PlanBadge, SW, VerificationBadge } from './SupplierShared';
import { CertificationDialog, CompanyInfoDialog, ContactDialog, LocationsDialog, OverviewDialog } from './ProfileEditors';
import { VerificationUpload } from './VerificationUpload';

type Section = 'overview' | 'information' | 'products' | 'brands' | 'certifications' | 'contacts' | 'locations' | 'verification' | 'preview';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'information', label: 'Company Information' },
  { id: 'products', label: 'Products & Services' },
  { id: 'brands', label: 'Brands' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'contacts', label: 'Key Contacts' },
  { id: 'locations', label: 'Locations & Markets' },
  { id: 'verification', label: 'Verification' },
  { id: 'preview', label: 'Public Profile Preview' },
];

type Dialog = 'overview' | 'information' | 'locations' | 'cert' | { contact?: SupplierContact } | null;

interface Props {
  sw: SW;
  networkContacts: CommunityContact[];
  onUpdateNetworkContacts: (c: CommunityContact[]) => void;
  onStartMessageWith: (userId: string, name: string) => void;
}

export const CompanyProfileManager: React.FC<Props> = ({ sw, networkContacts, onUpdateNetworkContacts, onStartMessageWith }) => {
  const [section, setSection] = useState<Section>('overview');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [brand, setBrand] = useState('');
  const { company, products } = sw;
  const p = company.profile;
  const editable = sw.can('profile.edit');
  const save = (patch: Partial<CompanyProfile>, label: string) => sw.run(updateProfile(sw.ctx, patch, label), 'Saved — your Supplier Directory profile is updated');
  const completion = profileCompletion(company, products);
  const directory = BUYER_SUPPLIERS.find((s) => s.id === company.id);

  const editBtn = (d: Dialog) =>
    editable ? (
      <button type="button" onClick={() => setDialog(d)} className={btnSecondary}>
        <Pencil className="w-4 h-4" /> Edit
      </button>
    ) : undefined;

  const addBrand = () => {
    const b = brand.trim();
    if (!b) return;
    if (p.brands.some((x) => x.toLowerCase() === b.toLowerCase())) return sw.notify('That brand is already listed.');
    if (save({ brands: [...p.brands, b] }, `Added brand ${b}`)) setBrand('');
  };

  const saveContact = (c: SupplierContact) => {
    const exists = p.contacts.some((x) => x.id === c.id);
    if (save({ contacts: exists ? p.contacts.map((x) => (x.id === c.id ? c : x)) : [...p.contacts, c] }, `${exists ? 'Updated' : 'Added'} key contact ${c.name}`)) setDialog(null);
  };

  const copyLink = () => {
    if (!directory) return;
    navigator.clipboard?.writeText(supplierShareUrl(directory)).then(
      () => sw.notify('Profile link copied'),
      () => sw.notify('Copy failed — select the link manually'),
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow={`Company Profile · ${company.sokoId}`}
        title={p.tradingName}
        subtitle="This is the single SOKO profile buyers see in the Supplier Directory. Private documents and internal data are never shown here."
        actions={
          <button type="button" onClick={() => setSection('preview')} className={btnPrimary}>
            <ExternalLink className="w-4 h-4" /> Preview public profile
          </button>
        }
      />
      {!editable && <div className="mb-4"><NoPermission text="Your role can view the company profile but not edit it." /></div>}

      <SubTabs tabs={SECTIONS} value={section} onChange={setSection} />

      <div className="mt-5">
        {section === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2" title="Overview" action={editBtn('overview')}>
              <div className="flex items-start gap-4">
                <CompanyLogo company={company} size="lg" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-slate-900">{p.tradingName}</p>
                  <p className="text-sm text-slate-500">{[p.descriptor, p.types.join(' · ')].filter(Boolean).join(' — ')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <VerificationBadge company={company} />
                    <PlanBadge premium={sw.premium} />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{p.description || 'No description yet.'}</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <Field label="Primary category" value={p.categories[0]} />
                <Field label="Additional categories" value={p.categories.slice(1).join(', ') || undefined} />
                <Field label="Subcategories" value={p.subcategories.join(', ') || undefined} />
                <Field label="Products / services" value={p.capabilities.join(', ') || undefined} />
              </div>
            </Card>
            <Card title="Profile completion">
              <p className="text-3xl font-semibold text-slate-900 tabular-nums">{completion}%</p>
              <div className="mt-2">
                <Meter value={completion} tone={completion >= 80 ? 'green' : 'blue'} />
              </div>
              <ul className="mt-4 space-y-1.5">
                {profileChecklist(company, products).map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => setSection(i.section === 'overview' ? 'overview' : i.section)}
                      className={`w-full text-left text-sm flex items-center gap-2 cursor-pointer hover:text-blue-700 ${i.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${i.done ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {i.label}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {section === 'information' && (
          <Card title="Company Information" action={editBtn('information')}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="Legal name" value={p.legalName} />
              <Field label="Trading name" value={p.tradingName} />
              <Field label="Supplier type" value={p.types.join(', ')} />
              <Field label="Trade license no." value={p.licenseNo || '—'} />
              <Field label="Issuing authority" value={p.issuingAuthority || '—'} />
              <Field label="License expiry" value={fmtDate(p.licenseExpiry || undefined)} />
              <Field label="Country" value={p.country} />
              <Field label="Emirate / city" value={p.emirate} />
              <Field label="Year established" value={p.established ? String(p.established) : '—'} />
              <Field label="Website" value={p.website || '—'} />
              <Field label="General email" value={p.generalEmail || '—'} />
              <Field label="Telephone" value={p.phone || '—'} />
            </div>
          </Card>
        )}

        {section === 'products' && (
          <Card title="Products & Services" action={<button type="button" onClick={() => sw.go('sw-products')} className={btnSecondary}>Manage products</button>}>
            <p className="text-sm text-slate-600">
              {products.filter((x) => x.status === 'active').length} active listings appear on your public profile and in Product Discovery. Drafts and deactivated products stay private.
            </p>
            <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.filter((x) => x.status === 'active').slice(0, 6).map((x) => (
                <li key={x.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
                  <img src={x.images[0]} alt="" className="w-10 h-10 rounded-md object-cover bg-slate-100" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{x.name}</p>
                    <p className="text-xs text-slate-500 truncate">{x.brand} · {x.type}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {section === 'brands' && (
          <Card title="Brands represented">
            <div className="flex flex-wrap gap-2">
              {p.brands.length === 0 && <p className="text-sm text-slate-500">No brands added yet.</p>}
              {p.brands.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full border border-slate-200 bg-slate-50 text-sm text-slate-800">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {b}
                  {editable && (
                    <button type="button" aria-label={`Remove ${b}`} onClick={() => save({ brands: p.brands.filter((x) => x !== b) }, `Removed brand ${b}`)} className="w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center cursor-pointer">
                      <Trash2 className="w-3 h-3 text-slate-500" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {editable && (
              <div className="mt-4 flex gap-2 max-w-md">
                <input value={brand} onChange={(e) => setBrand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBrand()} placeholder="Add a brand, e.g. Fosroc" className={inputCls} />
                <button type="button" onClick={addBrand} className={btnSecondary}>
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            )}
          </Card>
        )}

        {section === 'certifications' && (
          <Card title="Certifications" action={editable ? <button type="button" onClick={() => setDialog('cert')} className={btnSecondary}><Plus className="w-4 h-4" /> Add</button> : undefined}>
            {p.certifications.length === 0 ? (
              <p className="text-sm text-slate-500">No certifications listed.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {p.certifications.map((c, i) => (
                  <li key={`${c.name}-${i}`} className="py-3 flex items-center gap-3">
                    <Award className="w-5 h-5 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.issuer}{c.validUntil ? ` · Valid until ${fmtDate(c.validUntil)}` : ''}</p>
                    </div>
                    <StatusPill tone={c.status === 'active' ? 'blue' : c.status === 'pending' ? 'amber' : 'slate'}>{c.status === 'active' ? 'Active' : c.status === 'pending' ? 'Under review' : 'Expired'}</StatusPill>
                    {editable && (
                      <button type="button" aria-label="Remove" onClick={() => save({ certifications: p.certifications.filter((_, j) => j !== i) }, `Removed certification ${c.name}`)} className={iconBtn}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">Certificate files belong in the private Document Center and are never published automatically.</p>
          </Card>
        )}

        {section === 'contacts' && (
          <Card title="Key Contacts" action={editable ? <button type="button" onClick={() => setDialog({})} className={btnSecondary}><Plus className="w-4 h-4" /> Add contact</button> : undefined}>
            <ul className="grid sm:grid-cols-2 gap-3">
              {p.contacts.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-200 p-3 flex items-start gap-3">
                  <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <UserRound className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.title} · {c.location}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{c.visibility === 'public' ? 'Visible to everyone' : c.visibility === 'network' ? 'Connected buyers only' : 'Shared on request'}</p>
                  </div>
                  {editable && (
                    <div className="flex gap-1">
                      <button type="button" aria-label="Edit" onClick={() => setDialog({ contact: c })} className={iconBtn}><Pencil className="w-4 h-4" /></button>
                      <button type="button" aria-label="Remove" onClick={() => save({ contacts: p.contacts.filter((x) => x.id !== c.id) }, `Removed key contact ${c.name}`)} className={iconBtn}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </li>
              ))}
              {p.contacts.length === 0 && <p className="text-sm text-slate-500">No key contacts published.</p>}
            </ul>
          </Card>
        )}

        {section === 'locations' && (
          <Card title="Locations & Markets Served" action={editBtn('locations')}>
            <div className="grid sm:grid-cols-3 gap-5">
              <Field label="Headquarters" value={`${p.emirate}, ${p.country}`} />
              <Field label="Address" value={p.address || '—'} />
              <Field label="Regions served" value={p.regionsServed.join(', ') || '—'} />
              <Field label="Markets served" value={p.marketsServed.join(', ') || '—'} />
            </div>
          </Card>
        )}

        {section === 'verification' && <VerificationSection sw={sw} />}

        {section === 'preview' && directory && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-[1fr_auto] gap-4 rounded-2xl border border-slate-200 bg-white p-5 items-center">
              <div>
                <p className="text-sm font-semibold text-slate-900">Your public SOKO profile</p>
                <p className="text-xs text-slate-500 mt-0.5">Supplier ID {company.sokoId}. This is exactly what buyers see in the Supplier Directory.</p>
                <div className="mt-3 flex gap-2 max-w-xl">
                  <input readOnly value={supplierShareUrl(directory)} className={`${inputCls} text-xs`} onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" onClick={copyLink} className={btnSecondary}>
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                </div>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 bg-white w-fit">
                <QRCodeSVG value={supplierShareUrl(directory)} size={88} />
              </div>
            </div>
            <BuyerSupplierProfile
              supplier={directory}
              matchQuery=""
              initialTab="overview"
              saved={false}
              networkContacts={networkContacts}
              onUpdateNetworkContacts={onUpdateNetworkContacts}
              onBack={() => setSection('overview')}
              onToggleSave={() => sw.notify('Preview only — buyers can save your profile')}
              onContact={() => onStartMessageWith(company.id, p.tradingName)}
              onOpenSupplier={() => undefined}
              onRequestContact={() => sw.notify('Preview only — buyers can request contact details')}
              onNotify={sw.notify}
            />
          </div>
        )}
      </div>

      {dialog === 'overview' && <OverviewDialog profile={p} onSave={save} onClose={() => setDialog(null)} />}
      {dialog === 'information' && <CompanyInfoDialog profile={p} onSave={save} onClose={() => setDialog(null)} />}
      {dialog === 'locations' && <LocationsDialog profile={p} onSave={save} onClose={() => setDialog(null)} />}
      {dialog === 'cert' && <CertificationDialog onClose={() => setDialog(null)} onSave={(c) => save({ certifications: [...p.certifications, c] }, `Added certification ${c.name}`) && setDialog(null)} />}
      {dialog && typeof dialog === 'object' && (
        <ContactDialog contact={dialog.contact} defaults={{ location: p.emirate, category: p.categories[0] ?? '' }} onSave={saveContact} onClose={() => setDialog(null)} />
      )}
    </div>
  );
};

const VerificationSection: React.FC<{ sw: SW }> = ({ sw }) => {
  const v = sw.company.verification;
  const [uploading, setUploading] = useState(false);
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2" title="SOKO Verification">
        <div className="flex flex-wrap items-center gap-3">
          <VerificationBadge company={sw.company} />
          <span className="text-xs text-slate-500">
            {v.status === 'verified' && `Verified ${fmtDate(v.reviewedAt)}`}
            {v.status === 'pending' && `Submitted ${fmtDate(v.submittedAt)} · usually reviewed within 2 business days`}
            {v.status === 'rejected' && v.note}
            {v.status === 'not_submitted' && 'Upload your trade license to start verification.'}
          </span>
        </div>
        <div className="mt-4 grid sm:grid-cols-3 gap-4">
          <Field label="Trade license no." value={sw.company.profile.licenseNo || '—'} />
          <Field label="License expiry" value={fmtDate(sw.company.profile.licenseExpiry || undefined)} />
          <Field label="Submitted file" value={v.licenseFile ?? '—'} />
        </div>
        {sw.can('profile.edit') ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setUploading(true)} className={v.status === 'verified' ? btnSecondary : btnPrimary}>
              <Upload className="w-4 h-4" /> {v.status === 'not_submitted' ? 'Upload trade license' : 'Upload renewed license'}
            </button>
          </div>
        ) : (
          <div className="mt-4"><NoPermission text="Only users who can edit the profile can submit verification documents." /></div>
        )}
        {uploading && <VerificationUpload sw={sw} onClose={() => setUploading(false)} />}
      </Card>
      <Card title="How verification works">
        <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
          <li>Upload your current trade license.</li>
          <li>SOKO checks it against the issuing authority.</li>
          <li>Your profile shows the SOKO Verified badge.</li>
        </ol>
        <p className="mt-4 text-xs text-slate-500 leading-relaxed">Verification is free and works the same on every plan. Upgrading never affects verification.</p>
        {v.status === 'pending' && (
          <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Demo: simulate SOKO review</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => sw.run(simulateVerificationReview(sw.ctx, true), 'Verification approved (simulated)')} className={btnSecondary}>Approve</button>
              <button type="button" onClick={() => sw.run(simulateVerificationReview(sw.ctx, false), 'Verification returned (simulated)')} className={btnSecondary}>Return</button>
            </div>
          </div>
        )}
        <div className="mt-4"><DemoNote>Review outcomes in this prototype are simulated.</DemoNote></div>
      </Card>
    </div>
  );
};
