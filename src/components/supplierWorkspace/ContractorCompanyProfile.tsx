import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Award, Building2, CalendarDays, Camera, ChevronRight, Copy, CreditCard, Eye, EyeOff, FileText, Globe, Handshake, ImagePlus, Lock, Mail,
  MapPin, Megaphone, Pencil, Phone, Plus, Settings, ShieldCheck, Trash2, UserRound, Users,
} from 'lucide-react';
import { normalizeContractorProfile } from '../../data/contractorTaxonomy';
import { CompanyImageDialog } from './CompanyImageDialog';
import { CompanyProfile, CONTRACTOR_TIER_CONFIG, roleMeta } from '../../data/supplierTypes';
import { BUYER_SUPPLIERS, SupplierContact, supplierShareUrl } from '../../data/buyerSuppliers';
import { marketSnapshot } from '../../data/supplierMarket';
import { profileCompletion } from '../../data/supplierStore';
import { updateProfile } from '../../data/supplierService';
import { fmtDate } from '../marketHub/MarketHubShared';
import {
  SokoAvatar, SokoChip, SokoEmptyState, SokoKpiCell, SokoPanel, SokoPanelLink, SokoProgress, SokoStatusIndicator,
  SokoStatusTone, SokoTabs, sokoCard, sokoTokens,
} from '../sokoDesignSystem/SokoComponents';
import { CompanyLogo, SW } from './SupplierShared';
import { OverviewDialog, CompanyInfoDialog, LocationsDialog, CertificationDialog, ContactDialog } from './ProfileEditors';

type Section = 'information' | 'workspace' | 'administration' | 'public';
type Dialog = 'overview' | 'information' | 'locations' | 'cert' | 'logo' | 'cover' | { contact?: SupplierContact } | null;

const VERIFICATION: Record<string, { label: string; tone: SokoStatusTone }> = {
  verified: { label: 'SOKO verified', tone: 'success' },
  pending: { label: 'Verification pending', tone: 'warning' },
  not_submitted: { label: 'Not verified', tone: 'neutral' },
};

const VISIBILITY_LABEL: Record<string, string> = {
  public: 'Public',
  network: 'Connected companies',
  request: 'On request',
};

const btn = `${sokoTokens.focus} inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`;
const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
const btnSecondary = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const iconBtn = `${sokoTokens.focus} w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const InfoRow: React.FC<{ label: string; value?: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex flex-col gap-1 min-w-0">
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className={`text-sm text-slate-900 break-words ${mono ? 'font-mono text-[13px]' : ''}`}>{value || <span className="text-slate-400">Not provided</span>}</dd>
  </div>
);

const TagList: React.FC<{ items: string[]; empty: string; tone?: 'neutral' | 'blue' }> = ({ items, empty, tone = 'neutral' }) =>
  items.length === 0 ? (
    <p className="text-sm text-slate-400">{empty}</p>
  ) : (
    <ul className="flex flex-wrap gap-2">
      {items.map((c) => <li key={c}><SokoChip tone={tone}>{c}</SokoChip></li>)}
    </ul>
  );

const AdminRow: React.FC<{ icon: React.ElementType; title: string; description: string; meta?: React.ReactNode; onClick?: () => void; locked?: string }> = ({
  icon: Icon, title, description, meta, onClick, locked,
}) => {
  const body = (
    <>
      <span className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{title}</span>
          {meta}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500 leading-relaxed">{locked ?? description}</span>
      </span>
      {onClick ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" /> : <Lock className="w-4 h-4 text-slate-300 shrink-0" aria-label="No access" />}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`${sokoTokens.focus} w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer`}>{body}</button>
  ) : (
    <div className="w-full flex items-center gap-3 px-5 py-3.5">{body}</div>
  );
};

export const ContractorCompanyProfile: React.FC<{ sw: SW }> = ({ sw }) => {
  const [section, setSection] = useState<Section>('information');
  const [dialog, setDialog] = useState<Dialog>(null);
  const { company, products, members, store } = sw;
  const p = useMemo(() => normalizeContractorProfile(company.profile), [company.profile]);
  const editable = sw.can('profile.edit');
  const canViewDocs = sw.can('documents.view');
  const save = (patch: Partial<CompanyProfile>, label: string) =>
    sw.run(updateProfile(sw.ctx, patch, label), 'Saved — company profile updated');
  const completion = profileCompletion(company, products);
  const verification = VERIFICATION[company.verification.status] ?? VERIFICATION.not_submitted;
  const plan = CONTRACTOR_TIER_CONFIG[company.tier];
  const location = [p.emirate, p.country].filter(Boolean).join(', ');

  const directory = BUYER_SUPPLIERS.find((s) => s.id === company.id);
  const companyShareUrl = directory ? supplierShareUrl(directory) : `${window.location.origin}/company/${company.id}`;

  const market = useMemo(() => marketSnapshot(sw.marketWorkspace), [sw.marketWorkspace]);
  const summary = useMemo(() => {
    const vendors = store.vendorRecords.filter((v) => v.companyId === company.id);
    const visits = store.visits.filter((v) => v.companyId === company.id || v.hostCompanyId === company.id);
    const upcoming = visits.filter((v) => v.status === 'scheduled' || v.status === 'pending-confirmation').length;
    const contacts = store.contacts.filter((c) => c.companyId === company.id);
    const activeMembers = members.filter((m) => m.status === 'active');
    const docs = sw.documents.filter((d) => !d.archived);
    return {
      vendors: vendors.length,
      approved: vendors.filter((v) => v.approvalStatus === 'approved').length,
      visits: visits.length,
      upcoming,
      contacts: contacts.length,
      contactCompanies: new Set(contacts.map((c) => c.company)).size,
      activeMembers,
      pendingMembers: members.length - activeMembers.length,
      docs: docs.length,
      publicDocs: docs.filter((d) => d.visibility === 'public'),
    };
  }, [store, company.id, members, sw.documents]);

  const publicReps = p.contacts.filter((c) => c.visibility === 'public');
  const activeCerts = p.certifications.filter((c) => c.status === 'active');

  const saveContact = (c: SupplierContact) => {
    const exists = p.contacts.some((x) => x.id === c.id);
    if (save({ contacts: exists ? p.contacts.map((x) => (x.id === c.id ? c : x)) : [...p.contacts, c] }, `${exists ? 'Updated' : 'Added'} representative ${c.name}`)) setDialog(null);
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(companyShareUrl).then(
      () => sw.notify('Company profile link copied'),
      () => sw.notify('Copy failed — select the link manually'),
    );
  };

  const editLink = (d: Dialog, label = 'Edit') => (editable ? <SokoPanelLink label={label} onClick={() => setDialog(d)} /> : undefined);

  const tabs = [
    { id: 'information' as const, label: 'Company information' },
    { id: 'workspace' as const, label: 'Workspace' },
    { id: 'administration' as const, label: 'Administration' },
    { id: 'public' as const, label: 'Public profile' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={sokoTokens.eyebrow}>Contractor workspace · Company</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 text-balance">Company Profile</h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-2xl text-pretty">
            {p.tradingName}&apos;s identity on SOKO as a business entity. It is separate from any team member&apos;s personal profile or digital business card.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSection('public')} className={btnSecondary}>
            <Eye className="w-4 h-4" /> Preview public profile
          </button>
          {editable && (
            <button type="button" onClick={() => setDialog('overview')} className={btnPrimary}>
              <Pencil className="w-4 h-4" /> Edit company
            </button>
          )}
        </div>
      </header>

      <section aria-label="Company identity" className={`${sokoCard} overflow-hidden`}>
        {p.coverUrl && (
          <div className="relative h-24 sm:h-32 lg:h-36 w-full bg-slate-100">
            <img src={p.coverUrl} alt={`${p.tradingName} cover`} className="w-full h-full object-cover" />
            {editable && (
              <button type="button" onClick={() => setDialog('cover')} className={`${btnSecondary} absolute top-3 right-3 h-8 bg-white/95 shadow-sm`}>
                <Camera className="w-4 h-4" /> Edit cover
              </button>
            )}
          </div>
        )}
        <div className="p-5 sm:p-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative shrink-0">
              <CompanyLogo company={company} size="lg" />
              {editable && (
                <button
                  type="button"
                  onClick={() => setDialog('logo')}
                  aria-label={p.logoUrl ? 'Change company logo' : 'Upload company logo'}
                  title={p.logoUrl ? 'Change company logo' : 'Upload company logo'}
                  className={`${sokoTokens.focus} absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm flex items-center justify-center hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer`}
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="min-w-0 flex flex-col gap-2">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 text-balance">{p.tradingName}</h2>
                {p.legalName && p.legalName !== p.tradingName && <p className="text-sm text-slate-500">{p.legalName}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {p.types.map((t) => <SokoChip key={t} tone="blue">{t}</SokoChip>)}
                <SokoChip tone="mono">{company.sokoId}</SokoChip>
                {location && <SokoChip icon={MapPin}>{location}</SokoChip>}
                <SokoStatusIndicator label={verification.label} tone={verification.tone} />
              </div>
              {company.verification.status === 'verified' && company.verification.reviewedAt && (
                <p className="text-xs text-slate-500">Company verification reviewed by SOKO on {fmtDate(company.verification.reviewedAt)}. This applies to {p.tradingName}, not to any individual member.</p>
              )}
              {editable && !p.coverUrl && (
                <button type="button" onClick={() => setDialog('cover')} className={`${sokoTokens.focus} self-start inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer`}>
                  <ImagePlus className="w-3.5 h-3.5" /> Add cover image (optional)
                </button>
              )}
            </div>
          </div>
          <div className="lg:w-56 shrink-0 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-xs text-slate-500">Profile completion</p>
              <p className="text-sm font-semibold text-slate-900 tabular-nums">{completion}%</p>
            </div>
            <SokoProgress value={completion} tone={completion >= 80 ? 'green' : 'blue'} className="mt-2 w-full" />
            <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">Based on company details, classification, disciplines, services, locations, certifications and representatives. Logo and cover are optional.</p>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 sm:px-6 py-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className={sokoTokens.eyebrow}>About</p>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line text-pretty">{p.description || 'No company description yet.'}</p>
          </div>
          <div>
            <p className={sokoTokens.eyebrow}>Business activities</p>
            <div className="mt-2"><TagList items={p.capabilities} empty="No business activities listed." /></div>
          </div>
        </div>
      </section>

      <SokoTabs tabs={tabs} active={section} onChange={setSection} label="Company profile sections" variant="underline" />

      {section === 'information' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SokoPanel title="Registered business details" subtitle="Private — visible to workspace members only" icon={Building2} action={editLink('information')}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Legal name" value={p.legalName} />
              <InfoRow label="Trading name" value={p.tradingName} />
              <InfoRow label="Trade license no." value={p.licenseNo} mono />
              <InfoRow label="Issuing authority" value={p.issuingAuthority} />
              <InfoRow label="License expiry" value={p.licenseExpiry ? fmtDate(p.licenseExpiry) : undefined} />
              <InfoRow label="Year established" value={p.established ? String(p.established) : undefined} />
            </dl>
            {company.demo && (
              <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">License details in this demo workspace are fictional. SOKO verification confirms a license was submitted and reviewed; it is not third-party credential authentication.</p>
            )}
          </SokoPanel>

          <SokoPanel title="Official contact channels" subtitle="Company channels — not personal contact details" icon={Globe} action={editLink('information')}>
            <ul className="flex flex-col divide-y divide-slate-100 -my-2">
              {[
                { icon: Globe, label: 'Website', value: p.website },
                { icon: Mail, label: 'General email', value: p.generalEmail },
                { icon: Phone, label: 'Telephone', value: p.phone },
                { icon: MapPin, label: 'Registered address', value: p.address },
              ].map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-start gap-3 py-2.5">
                  <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm text-slate-900 break-words">{value || <span className="text-slate-400">Not provided</span>}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SokoPanel>

          <SokoPanel title="Construction disciplines & services" subtitle="Work the company carries out — not materials it supplies" icon={Handshake} action={editLink('overview')}>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-2">Business classification</p>
                <TagList items={p.types} empty="No classification set." tone="blue" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Construction disciplines</p>
                <TagList items={p.categories} empty="No disciplines set." tone="blue" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Specialisms</p>
                <TagList items={p.subcategories} empty="No specialisms set." />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Services offered</p>
                <TagList items={p.capabilities} empty="No services listed." />
              </div>
            </div>
          </SokoPanel>

          <SokoPanel title="Operating locations" icon={MapPin} action={editLink('locations')}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Headquarters" value={location} />
              <InfoRow label="Regions served" value={p.regionsServed.join(', ')} />
              <InfoRow label="Markets served" value={p.marketsServed.join(', ')} />
            </dl>
          </SokoPanel>

          <SokoPanel
            title="Certifications"
            subtitle="Self-reported by the company"
            icon={Award}
            action={editable ? <SokoPanelLink label="Add" onClick={() => setDialog('cert')} /> : undefined}
          >
            {p.certifications.length === 0 ? (
              <SokoEmptyState icon={Award} title="No certifications listed" description="Certificate files are stored privately in the Document Center." />
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100 -my-2">
                {p.certifications.map((c, i) => (
                  <li key={`${c.name}-${i}`} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.issuer}{c.validUntil ? ` · Valid until ${fmtDate(c.validUntil)}` : ''}</p>
                    </div>
                    <SokoStatusIndicator label={c.status === 'active' ? 'Active' : c.status === 'pending' ? 'Under review' : 'Expired'} tone={c.status === 'active' ? 'success' : c.status === 'pending' ? 'warning' : 'neutral'} />
                    {editable && (
                      <button type="button" aria-label={`Remove ${c.name}`} onClick={() => save({ certifications: p.certifications.filter((_, j) => j !== i) }, `Removed certification ${c.name}`)} className={iconBtn}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SokoPanel>

          <SokoPanel
            title="Authorized representatives"
            subtitle="Explicitly nominated — not based on workspace role"
            icon={UserRound}
            action={editable ? <SokoPanelLink label="Nominate" onClick={() => setDialog({})} /> : undefined}
          >
            {p.contacts.length === 0 ? (
              <SokoEmptyState icon={Users} title="No representatives nominated" description="Nominate people authorized to represent the company publicly. A Company Admin is not a representative by default." />
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100 -my-2">
                {p.contacts.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <SokoAvatar name={c.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 truncate">{[c.title, c.location].filter(Boolean).join(' · ')}</p>
                    </div>
                    <SokoStatusIndicator label={VISIBILITY_LABEL[c.visibility] ?? c.visibility} tone={c.visibility === 'public' ? 'info' : 'neutral'} />
                    {editable && (
                      <div className="flex">
                        <button type="button" aria-label={`Edit ${c.name}`} onClick={() => setDialog({ contact: c })} className={iconBtn}><Pencil className="w-4 h-4" /></button>
                        <button type="button" aria-label={`Remove ${c.name}`} onClick={() => save({ contacts: p.contacts.filter((x) => x.id !== c.id) }, `Removed representative ${c.name}`)} className={iconBtn}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SokoPanel>

          <SokoPanel
            title="Company documents"
            subtitle={canViewDocs ? `${plural(summary.docs, 'active document')} · ${summary.publicDocs.length} public` : undefined}
            icon={FileText}
            action={canViewDocs ? <SokoPanelLink label="Open Document Center" onClick={() => sw.go('sw-documents')} /> : undefined}
            className="lg:col-span-2"
          >
            {canViewDocs ? (
              <p className="text-sm text-slate-600 leading-relaxed">
                Company documents and certificate files are managed in the Document Center. Only documents marked public appear on the public profile; private documents and vendor compliance reviews are never published.
              </p>
            ) : (
              <p className="text-sm text-slate-500">Your role does not include access to company documents.</p>
            )}
          </SokoPanel>
        </div>
      )}

      {section === 'workspace' && (
        <div className="flex flex-col gap-6">
          <section aria-label="Workspace summary" className={`${sokoCard} grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-slate-100 overflow-hidden`}>
            {[
              <SokoKpiCell key="vendors" label="Vendor register" value={summary.vendors} detail={`${summary.approved} approved`} onClick={() => sw.go('sw-vendors')} />,
              <SokoKpiCell key="team" label="Team members" value={summary.activeMembers.length} detail={summary.pendingMembers ? `${summary.pendingMembers} pending` : 'All active'} onClick={() => sw.go('sw-team')} />,
              <SokoKpiCell key="contacts" label="Saved contacts" value={summary.contacts} detail={plural(summary.contactCompanies, 'company')} onClick={() => sw.go('sw-contacts')} />,
              <SokoKpiCell key="visits" label="Supplier visits" value={summary.visits} detail={`${summary.upcoming} upcoming`} onClick={() => sw.go('sw-visits')} />,
              <SokoKpiCell key="market" label="Market Hub" value={market.campaigns.length} detail={`${market.myInterests} interests expressed`} hint="Opportunities published by the company and interests expressed on others' opportunities." />,
              <SokoKpiCell key="docs" label="Company documents" value={canViewDocs ? summary.docs : '—'} detail={canViewDocs ? `${summary.publicDocs.length} public` : 'No access'} onClick={canViewDocs ? () => sw.go('sw-documents') : undefined} />,
            ].map((cell) => <div key={cell.key} className="bg-white">{cell}</div>)}
          </section>

          <SokoPanel
            title="Team members"
            subtitle="Informational — membership and roles are managed in Team & Roles"
            icon={Users}
            action={<SokoPanelLink label={sw.can('team.manage') ? 'Manage in Team & Roles' : 'View Team & Roles'} onClick={() => sw.go('sw-team')} />}
            flush
          >
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {members.map((m) => {
                const isRep = p.contacts.some((c) => c.name === m.name);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <SokoAvatar name={m.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{m.name}{m.userId === sw.user.id && <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span>}</p>
                      <p className="text-xs text-slate-500 truncate">{m.title}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      {isRep && <SokoStatusIndicator label="Representative" tone="info" />}
                      {m.status !== 'active' && <SokoStatusIndicator label={m.status === 'invited' ? 'Invited' : 'Pending approval'} tone="warning" />}
                    </div>
                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{roleMeta(m.role).label}</span>
                  </li>
                );
              })}
            </ul>
          </SokoPanel>
        </div>
      )}

      {section === 'administration' && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <SokoPanel title="Company administration" subtitle={`Your role: ${roleMeta(sw.role).label}`} icon={Settings} flush>
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              <AdminRow
                icon={Users}
                title="Team & Roles"
                description="Invite members, assign company roles and approve access requests."
                locked={sw.can('team.manage') ? undefined : 'View members. Only a Company Admin can change roles or invite.'}
                onClick={() => sw.go('sw-team')}
              />
              <AdminRow icon={Settings} title="Workspace settings" description="Workspace preferences, role preview and leaving the company." onClick={() => sw.go('sw-settings')} />
              <AdminRow
                icon={CreditCard}
                title="Subscription & plan"
                description={plan.tagline}
                meta={<SokoStatusIndicator label={plan.label} tone={company.tier === 'premium' ? 'info' : 'neutral'} />}
                locked={sw.can('plan.manage') ? undefined : `${plan.tagline} Only a Company Admin can change the plan.`}
                onClick={() => sw.go('sw-plan')}
              />
              <AdminRow
                icon={Pencil}
                title="Edit company profile"
                description="Update identity, registered details, categories and locations."
                locked={editable ? undefined : 'Your role can view the company profile but not edit it.'}
                onClick={editable ? () => setDialog('overview') : undefined}
              />
            </div>
          </SokoPanel>

          <SokoPanel title="Company vs personal identity" icon={ShieldCheck}>
            <ul className="flex flex-col gap-3 text-sm text-slate-600 leading-relaxed">
              <li className="flex gap-2.5"><Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />{p.tradingName} owns this profile, its verification and its share link. They stay the same when admins change.</li>
              <li className="flex gap-2.5"><UserRound className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />Members keep their own personal profiles and business cards in their Personal Workspace. Personal details are never published as company information.</li>
              <li className="flex gap-2.5"><Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />Permissions come from each member&apos;s company role. A company must always keep at least one Company Admin.</li>
            </ul>
          </SokoPanel>
        </div>
      )}

      {section === 'public' && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section aria-label="Public profile preview" className={`${sokoCard} overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <p className={sokoTokens.eyebrow}>Public preview</p>
              <SokoStatusIndicator label="As others see it" tone="info" />
            </div>
            {p.coverUrl && (
              <div className="h-24 sm:h-32 w-full bg-slate-100">
                <img src={p.coverUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <CompanyLogo company={company} size="lg" />
                <div className="min-w-0 flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{p.tradingName}</h2>
                  <div className="flex flex-wrap gap-2">
                    {p.types.map((t) => <SokoChip key={t} tone="blue">{t}</SokoChip>)}
                    {location && <SokoChip icon={MapPin}>{location}</SokoChip>}
                    <SokoStatusIndicator label={verification.label} tone={verification.tone} />
                  </div>
                </div>
              </div>
              {p.description && <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{p.description}</p>}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500 mb-2">Construction disciplines</p>
                  <TagList items={p.categories} empty="None listed." tone="blue" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Services</p>
                  <TagList items={p.capabilities} empty="None listed." />
                </div>
              </div>
              <dl className="grid gap-4 sm:grid-cols-3 border-t border-slate-100 pt-4">
                <InfoRow label="Website" value={p.website} />
                <InfoRow label="General email" value={p.generalEmail} />
                <InfoRow label="Telephone" value={p.phone} />
              </dl>
              {activeCerts.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500 mb-2">Certifications (self-reported)</p>
                  <TagList items={activeCerts.map((c) => c.name)} empty="" />
                </div>
              )}
              {summary.publicDocs.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500 mb-2">Public documents</p>
                  <TagList items={summary.publicDocs.map((d) => d.name)} empty="" />
                </div>
              )}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500 mb-2">Company representatives</p>
                {publicReps.length === 0 ? (
                  <p className="text-sm text-slate-400">No publicly visible representatives.</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {publicReps.map((c) => (
                      <li key={c.id} className="flex items-center gap-3">
                        <SokoAvatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                          <p className="text-xs text-slate-500 truncate">{c.title}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <SokoPanel title="Share company profile" subtitle="Links to the company, not a person" icon={Megaphone}>
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl border border-slate-200 bg-white shrink-0">
                  <QRCodeSVG value={companyShareUrl} size={80} />
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <label htmlFor="company-share-url" className="text-xs text-slate-500">Public profile link</label>
                  <input
                    id="company-share-url"
                    readOnly
                    value={companyShareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className={`${sokoTokens.focus} w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-mono`}
                  />
                  <button type="button" onClick={copyLink} className={`${btnSecondary} self-start`}>
                    <Copy className="w-4 h-4" /> Copy link
                  </button>
                </div>
              </div>
            </SokoPanel>

            <SokoPanel title="Never shown publicly" icon={EyeOff}>
              <ul className="flex flex-col gap-2 text-sm text-slate-600">
                {[
                  'Trade license number, issuing authority and expiry',
                  'Vendor register, vendor notes and approval statuses',
                  'Vendor compliance reviews and private documents',
                  'Team members, roles and personal contact details',
                  'Supplier visits, saved contacts and subscription plan',
                  'Representatives not marked public',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5"><Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />{item}</li>
                ))}
              </ul>
            </SokoPanel>

            <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
              <CalendarDays className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Profile last updated {fmtDate(company.updatedAt)}.
            </p>
          </div>
        </div>
      )}

      {dialog === 'overview' && <OverviewDialog contractor profile={company.profile} onSave={save} onClose={() => setDialog(null)} />}
      {(dialog === 'logo' || dialog === 'cover') && (
        <CompanyImageDialog
          kind={dialog}
          current={dialog === 'logo' ? p.logoUrl : p.coverUrl}
          fallback={dialog === 'logo' ? <CompanyLogo company={{ ...company, profile: { ...company.profile, logoUrl: undefined } }} size="lg" /> : <p className="text-xs text-slate-400">No cover — the standard company header is used.</p>}
          onSave={(url) =>
            save(
              dialog === 'logo' ? { logoUrl: url } : { coverUrl: url },
              `${url ? 'Updated' : 'Removed'} company ${dialog === 'logo' ? 'logo' : 'cover image'}`,
            )
          }
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'information' && <CompanyInfoDialog profile={p} onSave={save} onClose={() => setDialog(null)} />}
      {dialog === 'locations' && <LocationsDialog profile={p} onSave={save} onClose={() => setDialog(null)} />}
      {dialog === 'cert' && <CertificationDialog onClose={() => setDialog(null)} onSave={(c) => save({ certifications: [...p.certifications, c] }, `Added certification ${c.name}`) && setDialog(null)} />}
      {dialog && typeof dialog === 'object' && (
        <ContactDialog contact={dialog.contact} defaults={{ location: p.emirate, category: p.categories[0] ?? '' }} onSave={saveContact} onClose={() => setDialog(null)} />
      )}
    </div>
  );
};
