import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Building2, CheckCircle2, Copy, ExternalLink, Globe, Mail, MapPin, Phone, Plus, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react';
import { CompanyProfile, CompanyMembership } from '../../data/supplierTypes';
import { BUYER_SUPPLIERS, SupplierContact, supplierShareUrl } from '../../data/buyerSuppliers';
import { profileCompletion } from '../../data/supplierStore';
import { updateProfile } from '../../data/supplierService';
import { btnPrimary, btnSecondary, iconBtn, inputCls, labelCls, StatusPill } from '../NetworkShared';
import { DemoNote, Field, SubTabs, fmtDate } from '../marketHub/MarketHubShared';
import { Card, CompanyLogo, Meter, NoPermission, PageHeader, PlanBadge, SW, VerificationBadge } from './SupplierShared';
import { OverviewDialog, CompanyInfoDialog, LocationsDialog, CertificationDialog, ContactDialog } from './ProfileEditors';

type Section = 'overview' | 'information' | 'categories' | 'representatives' | 'certifications' | 'verification' | 'share';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'information', label: 'Company Information' },
  { id: 'categories', label: 'Trade Categories' },
  { id: 'representatives', label: 'Authorized Representatives' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'verification', label: 'Verification' },
  { id: 'share', label: 'Share Profile' },
];

type Dialog = 'overview' | 'information' | 'locations' | 'cert' | { contact?: SupplierContact } | null;

export const ContractorCompanyProfile: React.FC<{ sw: SW }> = ({ sw }) => {
  const [section, setSection] = useState<Section>('overview');
  const [dialog, setDialog] = useState<Dialog>(null);
  const { company, products, members } = sw;
  const p = company.profile;
  const editable = sw.can('profile.edit');
  const save = (patch: Partial<CompanyProfile>, label: string) =>
    sw.run(updateProfile(sw.ctx, patch, label), 'Saved — company profile updated');
  const completion = profileCompletion(company, products);
  const directory = BUYER_SUPPLIERS.find((s) => s.id === company.id);

  const editBtn = (d: Dialog) =>
    editable ? (
      <button type="button" onClick={() => setDialog(d)} className={btnSecondary}>
        Edit
      </button>
    ) : undefined;

  const saveContact = (c: SupplierContact) => {
    const exists = p.contacts.some((x) => x.id === c.id);
    if (save({ contacts: exists ? p.contacts.map((x) => (x.id === c.id ? c : x)) : [...p.contacts, c] }, `${exists ? 'Updated' : 'Added'} representative ${c.name}`)) setDialog(null);
  };

  const copyLink = () => {
    if (!directory) return;
    navigator.clipboard?.writeText(supplierShareUrl(directory)).then(
      () => sw.notify('Company profile link copied'),
      () => sw.notify('Copy failed — select the link manually'),
    );
  };

  const companyShareUrl = directory ? supplierShareUrl(directory) : `${window.location.origin}/company/${company.id}`;

  return (
    <div>
      <PageHeader
        eyebrow={`Corporate Profile · ${company.sokoId}`}
        title={p.tradingName}
        subtitle="This is GEC Dubai's corporate identity on SOKO. It is separate from any team member's personal profile and digital business card."
        actions={
          <button type="button" onClick={() => setSection('share')} className={btnPrimary}>
            <ExternalLink className="w-4 h-4" /> Share Company Profile
          </button>
        }
      />
      {!editable && <div className="mb-4"><NoPermission text="Your role can view the company profile but not edit it." /></div>}

      <SubTabs tabs={SECTIONS} value={section} onChange={setSection} />

      <div className="mt-5">
        {section === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2" title="Company Identity" action={editBtn('overview')}>
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
              <p className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{p.description || 'No company description yet.'}</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <Field label="Classification" value={p.types.join(', ')} />
                <Field label="Primary trade category" value={p.categories[0]} />
                <Field label="Headquarters" value={`${p.emirate}, ${p.country}`} />
                <Field label="Established" value={p.established ? String(p.established) : '—'} />
              </div>
            </Card>
            <Card title="Profile Completion">
              <p className="text-3xl font-semibold text-slate-900 tabular-nums">{completion}%</p>
              <div className="mt-2"><Meter value={completion} tone={completion >= 80 ? 'green' : 'blue'} /></div>
              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                Company profile completion is based on corporate information, trade categories, certifications and authorized representatives — not on any individual's personal profile.
              </p>
            </Card>
          </div>
        )}

        {section === 'information' && (
          <Card title="Corporate Information" action={editBtn('information')}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="Legal name" value={p.legalName} />
              <Field label="Trading name" value={p.tradingName} />
              <Field label="Classification" value={p.types.join(', ')} />
              <Field label="Trade license no." value={p.licenseNo || '—'} />
              <Field label="Issuing authority" value={p.issuingAuthority || '—'} />
              <Field label="License expiry" value={fmtDate(p.licenseExpiry || undefined)} />
              <Field label="Country" value={p.country} />
              <Field label="Emirate / city" value={p.emirate} />
              <Field label="Year established" value={p.established ? String(p.established) : '—'} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Authorized Contact Channels</p>
              <div className="grid sm:grid-cols-3 gap-5">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <div><p className="text-[11px] text-slate-500">Website</p><p className="text-sm text-slate-900">{p.website || '—'}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div><p className="text-[11px] text-slate-500">General email</p><p className="text-sm text-slate-900">{p.generalEmail || '—'}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <div><p className="text-[11px] text-slate-500">Telephone</p><p className="text-sm text-slate-900">{p.phone || '—'}</p></div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Registered Address</p>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">{p.address || '—'}</p>
              </div>
            </div>
            <DemoNote>Note: The trade license number shown is demo data. SOKO verification confirms the license has been submitted and reviewed — it does not constitute independent third-party credential authentication.</DemoNote>
          </Card>
        )}

        {section === 'categories' && (
          <Card title="Trade & Sourcing Categories" action={editBtn('locations')}>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Trade Categories</p>
                <div className="flex flex-wrap gap-2">
                  {p.categories.length === 0 && <p className="text-sm text-slate-500">No categories set.</p>}
                  {p.categories.map((c) => (
                    <span key={c} className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-sm text-blue-800 font-medium">{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Subcategories</p>
                <div className="flex flex-wrap gap-2">
                  {p.subcategories.length === 0 && <p className="text-sm text-slate-500">No subcategories set.</p>}
                  {p.subcategories.map((c) => (
                    <span key={c} className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-sm text-slate-700">{c}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Services & Capabilities</p>
              <div className="flex flex-wrap gap-2">
                {p.capabilities.length === 0 && <p className="text-sm text-slate-500">No capabilities listed.</p>}
                {p.capabilities.map((c) => (
                  <span key={c} className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">{c}</span>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-2 gap-5">
              <Field label="Regions served" value={p.regionsServed.join(', ') || '—'} />
              <Field label="Markets served" value={p.marketsServed.join(', ') || '—'} />
            </div>
          </Card>
        )}

        {section === 'representatives' && (
          <div className="space-y-4">
            <Card title="Authorized Company Representatives" action={editable ? <button type="button" onClick={() => setDialog({})} className={btnSecondary}><Plus className="w-4 h-4" /> Nominate representative</button> : undefined}>
              <p className="text-sm text-slate-600 mb-4">
                These are individuals explicitly authorized by GEC Dubai to represent the company publicly on SOKO. Nominating someone here does not depend on their workspace role — a Company Admin is not automatically a public representative.
              </p>
              {p.contacts.length > 0 ? (
                <ul className="grid sm:grid-cols-2 gap-3">
                  {p.contacts.map((c) => (
                    <li key={c.id} className="rounded-xl border border-slate-200 p-3 flex items-start gap-3">
                      <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <UserRound className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.title} · {c.location}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {c.visibility === 'public' ? 'Publicly visible' : c.visibility === 'network' ? 'Connected companies only' : 'Shared on request'}
                        </p>
                      </div>
                      {editable && (
                        <div className="flex gap-1">
                          <button type="button" aria-label="Edit" onClick={() => setDialog({ contact: c })} className={iconBtn}><UserRound className="w-4 h-4" /></button>
                          <button type="button" aria-label="Remove" onClick={() => save({ contacts: p.contacts.filter((x) => x.id !== c.id) }, `Removed representative ${c.name}`)} className={iconBtn}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">No authorized representatives yet</p>
                  <p className="mt-1 text-sm text-slate-500">Nominate team members who are authorized to represent GEC Dubai publicly. This is separate from workspace admin roles.</p>
                </div>
              )}
            </Card>

            <Card title="Workspace Team Members">
              <p className="text-sm text-slate-600 mb-3">
                These are individuals with access to the GEC Dubai workspace. Their membership determines their permissions, not their public representation. Company Admin is an administrative role, not a public identity.
              </p>
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                      <th className="px-5 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Title</th>
                      <th className="px-3 py-2 font-semibold">Role</th>
                      <th className="px-5 py-2 font-semibold">Public Representative?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((m: CompanyMembership) => {
                      const isRep = p.contacts.some((c) => c.name === m.name);
                      return (
                        <tr key={m.id}>
                          <td className="px-5 py-2.5 text-slate-800 font-medium">{m.name}</td>
                          <td className="px-3 py-2.5 text-slate-600">{m.title}</td>
                          <td className="px-3 py-2.5 text-slate-600">{m.role.replace(/_/g, ' ')}</td>
                          <td className="px-5 py-2.5">
                            {isRep ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">Yes — authorized</span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <DemoNote>Team membership controls workspace access. Public representation requires explicit nomination in the Authorized Representatives section above.</DemoNote>
            </Card>
          </div>
        )}

        {section === 'certifications' && (
          <Card title="Corporate Certifications" action={editable ? <button type="button" onClick={() => setDialog('cert')} className={btnSecondary}><Plus className="w-4 h-4" /> Add</button> : undefined}>
            {p.certifications.length > 0 ? (
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
            ) : (
              <p className="text-sm text-slate-500">No corporate certifications listed.</p>
            )}
            <DemoNote>Certificates listed here are self-reported by GEC Dubai. SOKO does not independently verify third-party certifications. Certificate files belong in the private Document Center and are never published automatically. Payment terms and sensitive corporate financial details are not displayed publicly.</DemoNote>
          </Card>
        )}

        {section === 'verification' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="SOKO Company Verification">
              <div className="flex flex-wrap items-center gap-3">
                <VerificationBadge company={company} />
                <span className="text-xs text-slate-500">
                  {company.verification.status === 'verified' && `Verified ${fmtDate(company.verification.reviewedAt)}`}
                  {company.verification.status === 'pending' && `Submitted ${fmtDate(company.verification.submittedAt)}`}
                  {company.verification.status === 'not_submitted' && 'Not yet submitted for verification.'}
                </span>
              </div>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <Field label="Trade license no." value={p.licenseNo || '—'} />
                <Field label="License expiry" value={fmtDate(p.licenseExpiry || undefined)} />
              </div>
              <DemoNote>SOKO verification confirms that a trade license has been submitted and reviewed by SOKO. It is separate from third-party credential authentication (e.g. D-U-N-S, tax IDs). Demo credentials are not represented as independently authenticated.</DemoNote>
            </Card>
            <Card title="Credential Integrity">
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2 text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> SOKO verification is separate from third-party credential verification.</li>
                <li className="flex gap-2 text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Demo credentials (license numbers, IDs) are clearly labeled as demo data.</li>
                <li className="flex gap-2 text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Sensitive corporate details and payment terms are not publicly displayed.</li>
                <li className="flex gap-2 text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Company verification belongs to GEC Dubai, not to any individual admin.</li>
              </ul>
            </Card>
          </div>
        )}

        {section === 'share' && (
          <div className="space-y-4">
            <Card title="Share Company Profile">
              <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">GEC Dubai's public company profile link</p>
                  <p className="text-xs text-slate-500 mt-0.5">This link showcases the company, not any individual person. It remains valid regardless of who holds the Company Admin role.</p>
                  <div className="mt-3 flex gap-2 max-w-xl">
                    <input readOnly value={companyShareUrl} className={`${inputCls} text-xs`} onFocus={(e) => e.currentTarget.select()} />
                    <button type="button" onClick={copyLink} className={btnSecondary}>
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                  </div>
                </div>
                <div className="p-2 rounded-lg border border-slate-200 bg-white w-fit">
                  <QRCodeSVG value={companyShareUrl} size={88} />
                </div>
              </div>
            </Card>
            <Card title="Personal vs. Company Profile">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserRound className="w-4 h-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-900">Personal Digital Business Card</p>
                  </div>
                  <p className="text-xs text-slate-500">Belongs to the individual person (e.g. Mohamed Sadiq). Accessible from Personal Workspace → My Profile → Digital Business Card. Remains available when the person changes employers. Does not inherit company verification.</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-slate-700" />
                    <p className="text-sm font-semibold text-slate-900">Company Profile</p>
                  </div>
                  <p className="text-xs text-slate-500">Belongs to GEC Dubai. Contains corporate information, trade categories, certifications and authorized representatives. Has its own shareable link. Does not depend on the current Company Admin's personal identity.</p>
                </div>
              </div>
              <DemoNote>The company profile link and personal business card link are distinct. Switching to a different Company Admin does not change the company's public profile or its share link.</DemoNote>
            </Card>
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
