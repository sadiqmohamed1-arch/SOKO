import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  IdCard,
  UserRound,
  Building2,
  AtSign,
  Package,
  QrCode,
  BarChart3,
  Settings2,
  Eye,
  EyeOff,
  Ban,
  RotateCcw,
  ShieldQuestion,
  Flag,
  Lock,
  Share2,
  Link2,
  Download,
  type LucideIcon,
} from 'lucide-react';
import { DASH, formatDate, formatDateTime } from './companyShared';
import { type AdminCard, ENGAGEMENT_UNAVAILABLE, STATUS_UNAVAILABLE, openReportsOf, visibilityOf } from './cardShared';
import { CardAvatar, CardStatusBadge, DigitalCardPreview, ReportStatusBadge, VisibilityBadge } from './cardBadges';
import { SourceTag, Unavailable } from './userBadges';

type DrawerSection = 'preview' | 'personal' | 'company' | 'contact' | 'products' | 'qr' | 'analytics' | 'admin';

const SECTIONS: { id: DrawerSection; label: string; icon: LucideIcon }[] = [
  { id: 'preview', label: 'Card Preview', icon: IdCard },
  { id: 'personal', label: 'Personal & Professional', icon: UserRound },
  { id: 'company', label: 'Company Association', icon: Building2 },
  { id: 'contact', label: 'Contact & Social', icon: AtSign },
  { id: 'products', label: 'Products & Services', icon: Package },
  { id: 'qr', label: 'QR Code & Sharing', icon: QrCode },
  { id: 'analytics', label: 'Engagement Analytics', icon: BarChart3 },
  { id: 'admin', label: 'Administration', icon: Settings2 },
];

interface DigitalCardDrawerProps {
  card: AdminCard;
  isLive: boolean;
  onClose: () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-40 sm:shrink-0">{label}</dt>
    <dd className="min-w-0 break-words text-sm text-slate-900">{children}</dd>
  </div>
);

const Panel: React.FC<{ title: string; source?: React.ReactNode; children: React.ReactNode }> = ({ title, source, children }) => (
  <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <header className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {source}
    </header>
    {children}
  </section>
);

const EmptyNote: React.FC<{ icon: LucideIcon; title: string; body: string }> = ({ icon: Icon, title, body }) => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
    <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="max-w-sm text-xs leading-relaxed text-slate-500 text-pretty">{body}</p>
  </div>
);

const DisabledAction: React.FC<{ icon: LucideIcon; label: string; description: string; tone?: 'default' | 'danger' }> = ({
  icon: Icon,
  label,
  description,
  tone = 'default',
}) => (
  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-white text-slate-600'}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-xs font-semibold text-slate-900">{label}</span>
      <span className="text-[11px] leading-relaxed text-slate-500">{description}</span>
    </div>
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="Requires a secure backend workflow"
      className="inline-flex shrink-0 cursor-not-allowed items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-400"
    >
      <Lock className="h-3 w-3" aria-hidden="true" />
      {label}
    </button>
  </div>
);

export const DigitalCardDrawer: React.FC<DigitalCardDrawerProps> = ({ card, isLive, onClose }) => {
  const [section, setSection] = useState<DrawerSection>('preview');
  const closeRef = useRef<HTMLButtonElement>(null);
  const source = isLive ? 'live' : 'demo';
  const openReports = openReportsOf(card);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setSection('preview');
  }, [card.userId]);

  const engagementRows = card.engagement
    ? [
        { label: 'QR scans', value: card.engagement.qrScans },
        { label: 'Profile views', value: card.engagement.views },
        { label: 'Card shares', value: card.engagement.shares },
        { label: 'Contact saves', value: card.engagement.contactSaves },
      ]
    : null;
  const maxEngagement = engagementRows ? Math.max(1, ...engagementRows.map((r) => r.value)) : 1;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close digital card profile"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-default"
      />
      <section role="dialog" aria-modal="true" aria-labelledby="card-profile-title" className="relative flex h-full w-full max-w-4xl flex-col bg-slate-50 shadow-2xl">
        <header className="flex items-start gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <CardAvatar name={card.displayName} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Digital business card {'\u2022'} {isLive ? 'Live record' : 'Demo record'}
            </span>
            <h2 id="card-profile-title" className="truncate text-xl font-bold text-slate-900 text-balance">
              {card.displayName}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {card.status ? <CardStatusBadge status={card.status} /> : <Unavailable label="Status unavailable" reason={STATUS_UNAVAILABLE} />}
              <VisibilityBadge visibility={visibilityOf(card)} />
              {openReports > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  <Flag className="h-3 w-3" aria-hidden="true" />
                  {openReports} open {openReports === 1 ? 'report' : 'reports'}
                </span>
              )}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close digital card profile"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav
            aria-label="Digital card sections"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:w-60 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4"
          >
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === section;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {section === 'preview' && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-8">
                  <DigitalCardPreview card={card} isDemo={!isLive} />
                </div>
                <p className="text-center text-[11px] leading-relaxed text-slate-500 text-pretty">
                  Profile photos and company logos are not stored for cards yet, so initials are shown in their place.
                </p>
              </div>
            )}

            {section === 'personal' && (
              <Panel title="Personal & Professional Information" source={<SourceTag source={source} />}>
                <dl>
                  <Field label="Display name">{card.displayName}</Field>
                  <Field label="Designation">{card.title || DASH}</Field>
                  <Field label="Biography">
                    {card.bio ? <span className="leading-relaxed">{card.bio}</span> : <span className="text-slate-400">{DASH}</span>}
                  </Field>
                  <Field label="Last updated">{formatDateTime(card.updatedAt)}</Field>
                  <Field label="Card owner ID">
                    <span className="font-mono text-xs text-slate-600">{card.userId}</span>
                  </Field>
                </dl>
              </Panel>
            )}

            {section === 'company' && (
              <Panel title="Company Association" source={<SourceTag source={source} />}>
                <dl>
                  <Field label="Linked company">
                    {card.companyName ?? <span className="text-slate-400">No active membership readable</span>}
                  </Field>
                  <Field label="Company type">
                    <span className="capitalize">{card.companyKind ?? DASH}</span>
                  </Field>
                  <Field label="SOKO ID">
                    <span className="font-mono text-xs">{card.sokoId || DASH}</span>
                  </Field>
                  <Field label="Label on card">{card.companyLabel || DASH}</Field>
                </dl>
                {card.companyName && card.companyLabel && card.companyLabel.trim().toLowerCase() !== card.companyName.trim().toLowerCase() && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                    The company label typed on this card does not match the owner&apos;s linked company. Review for possible misrepresentation.
                  </p>
                )}
              </Panel>
            )}

            {section === 'contact' && (
              <Panel title="Contact & Social Channels" source={<SourceTag source={source} />}>
                <dl>
                  <Field label="Email">{card.email || DASH}</Field>
                  <Field label="Phone">{card.phone || DASH}</Field>
                  <Field label="LinkedIn">
                    {card.linkedinUrl ? <span className="break-all text-blue-700">{card.linkedinUrl}</span> : DASH}
                  </Field>
                  <Field label="Other channels">
                    {card.socials ? (
                      <ul className="flex flex-col gap-1">
                        {card.socials.map((s) => (
                          <li key={s.label} className="flex items-center gap-2 text-xs">
                            <span className="w-16 font-semibold text-slate-600">{s.label}</span>
                            <span className="text-slate-900">{s.url}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Unavailable reason="Cards store LinkedIn only. Additional social channels are not modelled." label="Not modelled" />
                    )}
                  </Field>
                </dl>
              </Panel>
            )}

            {section === 'products' && (
              <Panel title="Products & Services" source={card.products ? <SourceTag source={source} /> : <SourceTag source="ui_only" />}>
                {card.products === null ? (
                  <EmptyNote
                    icon={Package}
                    title="Not linked to cards yet"
                    body="Cards do not reference catalogue items. Products are managed on the company profile in Product & Catalog Oversight."
                  />
                ) : card.products.length === 0 ? (
                  <EmptyNote icon={Package} title="No products featured" body="This card owner has not featured any products or services." />
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {card.products.map((p) => (
                      <li key={p} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800">
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}

            {section === 'qr' && (
              <div className="flex flex-col gap-4">
                <Panel title="QR Code & Sharing" source={<SourceTag source="ui_only" />}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-36 w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
                      <QrCode className="h-10 w-10" aria-hidden="true" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide">QR placeholder</span>
                    </div>
                    <div className="flex flex-col gap-2 text-xs leading-relaxed text-slate-600">
                      <p className="text-pretty">
                        Card QR codes and share links are not generated yet. When they exist, each code will resolve to this card&apos;s
                        public page and respect its visibility setting.
                      </p>
                      <p>
                        Current visibility: <VisibilityBadge visibility={visibilityOf(card)} />
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { icon: Link2, label: 'Copy share link' },
                      { icon: Download, label: 'Download QR' },
                      { icon: Share2, label: 'Regenerate code' },
                    ].map(({ icon: Icon, label }) => (
                      <button
                        key={label}
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400"
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                </Panel>
              </div>
            )}

            {section === 'analytics' && (
              <Panel title="Engagement Analytics" source={engagementRows ? <SourceTag source={source} /> : undefined}>
                {engagementRows ? (
                  <ul className="flex flex-col gap-3">
                    {engagementRows.map((row) => (
                      <li key={row.label} className="flex flex-col gap-1">
                        <span className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-600">{row.label}</span>
                          <span className="font-mono font-bold text-slate-900">{row.value.toLocaleString()}</span>
                        </span>
                        <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <span className="block h-full rounded-full bg-blue-600" style={{ width: `${(row.value / maxEngagement) * 100}%` }} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyNote icon={BarChart3} title="Engagement is unavailable" body={ENGAGEMENT_UNAVAILABLE} />
                )}
              </Panel>
            )}

            {section === 'admin' && (
              <div className="flex flex-col gap-4">
                <Panel title="Reports on this card" source={<SourceTag source={source} />}>
                  {card.reports.length === 0 ? (
                    <p className="text-xs text-slate-500">No reports have been filed against this card.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {card.reports.map((r) => (
                        <li key={r.id} className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-3">
                          <span className="flex items-center justify-between gap-2">
                            <ReportStatusBadge status={r.status} />
                            <span className="text-[11px] text-slate-500">{formatDate(r.createdAt)}</span>
                          </span>
                          <p className="text-xs leading-relaxed text-slate-800">{r.reason}</p>
                          {r.resolution && <p className="text-[11px] text-slate-500">Resolution: {r.resolution}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel title="Administrative actions" source={<SourceTag source="ui_only" />}>
                  <p className="text-xs leading-relaxed text-slate-500">
                    These controls are disabled until audited backend workflows exist. Nothing here writes to the database.
                  </p>
                  <div className="flex flex-col gap-2">
                    <DisabledAction
                      icon={card.isPublic ? EyeOff : Eye}
                      label={card.isPublic ? 'Restrict visibility' : 'Make public'}
                      description="Override the owner's visibility setting with a recorded reason."
                    />
                    <DisabledAction icon={ShieldQuestion} label="Open investigation" description="Start an impersonation review and request identity evidence from the owner." />
                    <DisabledAction icon={Ban} label="Suspend card" description="Hide the card network-wide and notify the owner with the reason." tone="danger" />
                    <DisabledAction icon={RotateCcw} label="Restore card" description="Reinstate a suspended card after the issue is resolved." />
                  </div>
                </Panel>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
