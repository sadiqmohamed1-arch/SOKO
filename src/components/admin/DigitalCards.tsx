import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Contact,
  CircleCheck,
  CircleSlash,
  QrCode,
  Eye,
  Flag,
  Search,
  X,
  ChevronRight,
  LayoutDashboard,
  List,
  BarChart3,
  ShieldCheck,
  History,
  AlertTriangle,
  Pencil,
  Share2,
  Gavel,
  Sparkles,
  ShieldQuestion,
  EyeOff,
  Ban,
  RotateCcw,
  Lock,
  Save,
  type LucideIcon,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { type AdminCompany, DASH, formatDate, formatDateTime } from './companyShared';
import {
  type AdminCard,
  type CardActivity,
  type CardActivityKind,
  type CardReport,
  type CardStatus,
  type CardVisibility,
  type ReportStatus,
  CARD_STATUS_LABELS,
  DEMO_ACTIVITY,
  DEMO_CARDS,
  DEMO_TREND,
  ENGAGEMENT_UNAVAILABLE,
  STATUS_UNAVAILABLE,
  VISIBILITY_LABELS,
  openReportsOf,
  visibilityOf,
} from './cardShared';
import { CardAvatar, CardStatusBadge, ReportStatusBadge, VisibilityBadge } from './cardBadges';
import { SourceTag, Unavailable } from './userBadges';
import { DigitalCardDrawer } from './DigitalCardDrawer';

type Tab = 'dashboard' | 'directory' | 'engagement' | 'governance' | 'activity';
type LoadState = 'loading' | 'success' | 'error';

interface DigitalCardsProps {
  companies: AdminCompany[];
  isLive: boolean;
  /** Changes whenever the portal re-syncs, so this module reloads alongside it. */
  syncToken: number;
}

interface LiveCardRow {
  user_id: string;
  display_name: string;
  title: string | null;
  company_label: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  bio: string | null;
  is_public: boolean;
  updated_at: string | null;
}

interface LiveMembershipRow {
  user_id: string;
  company_id: string;
  company_kind: 'supplier' | 'contractor';
}

interface LiveReportRow {
  id: string;
  entity_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  handled_at: string | null;
  resolution: string | null;
}

interface LiveData {
  cards: LiveCardRow[];
  memberships: LiveMembershipRow[];
  /** Null when reports could not be read. */
  reports: LiveReportRow[] | null;
}

// Every query runs under the signed-in admin's session. business_cards has no admin bypass in RLS,
// so only cards that are public, the admin's own, connected or same-company are returned.
async function loadLiveCards(): Promise<LiveData> {
  const supabase = getSupabaseClient();
  const [cardRes, memberRes, reportRes] = await Promise.all([
    supabase
      .from('business_cards')
      .select('user_id, display_name, title, company_label, email, phone, linkedin_url, bio, is_public, updated_at')
      .order('updated_at', { ascending: false }),
    supabase.from('company_memberships').select('user_id, company_id, company_kind').eq('status', 'active'),
    supabase
      .from('content_reports')
      .select('id, entity_id, reason, status, created_at, handled_at, resolution')
      .eq('entity', 'business_card')
      .order('created_at', { ascending: false }),
  ]);
  if (cardRes.error) throw cardRes.error;
  return {
    cards: (cardRes.data ?? []) as LiveCardRow[],
    memberships: memberRes.error ? [] : ((memberRes.data ?? []) as LiveMembershipRow[]),
    reports: reportRes.error ? null : ((reportRes.data ?? []) as LiveReportRow[]),
  };
}

function toReport(r: LiveReportRow): CardReport {
  return { id: r.id, cardId: r.entity_id, reason: r.reason, status: r.status, createdAt: r.created_at, handledAt: r.handled_at, resolution: r.resolution };
}

function buildLiveCards(data: LiveData, companies: AdminCompany[]): AdminCard[] {
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const membershipByUser = new Map<string, LiveMembershipRow>();
  for (const m of data.memberships) if (!membershipByUser.has(m.user_id)) membershipByUser.set(m.user_id, m);
  const reportsByCard = new Map<string, CardReport[]>();
  for (const r of data.reports ?? []) reportsByCard.set(r.entity_id, [...(reportsByCard.get(r.entity_id) ?? []), toReport(r)]);

  return data.cards.map((row) => {
    const membership = membershipByUser.get(row.user_id);
    const company = membership ? companyById.get(membership.company_id) : undefined;
    return {
      userId: row.user_id,
      displayName: row.display_name,
      title: row.title,
      companyLabel: row.company_label,
      companyId: membership?.company_id ?? null,
      companyName: company?.companyName ?? null,
      companyKind: membership?.company_kind ?? null,
      sokoId: company?.sokoId ?? null,
      email: row.email,
      phone: row.phone,
      linkedinUrl: row.linkedin_url,
      bio: row.bio,
      isPublic: row.is_public,
      updatedAt: row.updated_at,
      status: null,
      engagement: null,
      products: null,
      socials: null,
      reports: reportsByCard.get(row.user_id) ?? [],
    };
  });
}

function buildLiveActivity(data: LiveData, cards: AdminCard[]): CardActivity[] {
  const nameById = new Map(cards.map((c) => [c.userId, c.displayName]));
  const events: CardActivity[] = [];
  for (const c of cards) {
    if (c.updatedAt) events.push({ id: `upd-${c.userId}`, at: c.updatedAt, kind: 'update', cardId: c.userId, cardOwner: c.displayName, summary: 'Card details last updated', actor: c.displayName });
  }
  for (const r of data.reports ?? []) {
    const owner = nameById.get(r.entity_id) ?? 'Card not visible to your session';
    events.push({ id: `rep-${r.id}`, at: r.created_at, kind: 'report', cardId: r.entity_id, cardOwner: owner, summary: 'Card reported by a network member', actor: null });
    if (r.handled_at && r.status !== 'open') {
      events.push({
        id: `dec-${r.id}`,
        at: r.handled_at,
        kind: 'decision',
        cardId: r.entity_id,
        cardOwner: owner,
        summary: r.status === 'actioned' ? 'Report actioned by a platform administrator' : 'Report dismissed by a platform administrator',
        actor: null,
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

const ACTIVITY_META: Record<CardActivityKind, { label: string; icon: LucideIcon; tone: string }> = {
  created: { label: 'Card created', icon: Sparkles, tone: 'bg-blue-50 text-blue-700' },
  update: { label: 'Card update', icon: Pencil, tone: 'bg-slate-100 text-slate-700' },
  share: { label: 'Sharing event', icon: Share2, tone: 'bg-emerald-50 text-emerald-700' },
  report: { label: 'Report filed', icon: Flag, tone: 'bg-amber-50 text-amber-700' },
  decision: { label: 'Admin decision', icon: Gavel, tone: 'bg-slate-900 text-white' },
};

const FilterSelect: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }> = ({
  id,
  label,
  value,
  onChange,
  children,
}) => (
  <>
    <label className="sr-only" htmlFor={id}>
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
    >
      {children}
    </select>
  </>
);

const SectionCard: React.FC<{ title: string; description?: string; source?: React.ReactNode; children: React.ReactNode }> = ({ title, description, source, children }) => (
  <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && <p className="text-xs leading-relaxed text-slate-500 text-pretty">{description}</p>}
      </div>
      {source}
    </header>
    {children}
  </section>
);

const EmptyState: React.FC<{ icon: LucideIcon; title: string; body?: string }> = ({ icon: Icon, title, body }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
    <Icon className="h-6 w-6 text-slate-400" aria-hidden="true" />
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {body && <p className="max-w-md text-xs leading-relaxed text-slate-500 text-pretty">{body}</p>}
  </div>
);

const LockedButton: React.FC<{ icon: LucideIcon; label: string; tone?: 'default' | 'danger' }> = ({ icon: Icon, label, tone = 'default' }) => (
  <button
    type="button"
    disabled
    title="Requires a secure backend workflow"
    className={`inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
      tone === 'danger' ? 'border-rose-100 bg-rose-50/50 text-rose-300' : 'border-slate-200 bg-white text-slate-400'
    }`}
  >
    <Icon className="h-3 w-3" aria-hidden="true" />
    {label}
  </button>
);

const ActivityTimeline: React.FC<{ events: CardActivity[]; onOpenCard?: (id: string) => void; compact?: boolean }> = ({ events, onOpenCard, compact }) => (
  <ol className="flex flex-col">
    {events.map((e, i) => {
      const meta = ACTIVITY_META[e.kind];
      const Icon = meta.icon;
      const isLast = i === events.length - 1;
      return (
        <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
          {!isLast && <span className="absolute left-4 top-8 h-[calc(100%-1.5rem)] w-px bg-slate-200" aria-hidden="true" />}
          <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {onOpenCard && e.cardId ? (
                <button type="button" onClick={() => onOpenCard(e.cardId!)} className="font-semibold text-slate-900 hover:text-blue-700 hover:underline cursor-pointer">
                  {e.cardOwner}
                </button>
              ) : (
                <span className="font-semibold text-slate-900">{e.cardOwner}</span>
              )}
              <span className="text-[11px] text-slate-400">{formatDateTime(e.at)}</span>
            </span>
            <span className="text-xs text-slate-600">{e.summary}</span>
            {!compact && (
              <span className="text-[11px] text-slate-400">
                {meta.label}
                {e.actor ? ` \u2022 by ${e.actor}` : ''}
              </span>
            )}
          </div>
        </li>
      );
    })}
  </ol>
);

export const DigitalCards: React.FC<DigitalCardsProps> = ({ companies, isLive, syncToken }) => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loadState, setLoadState] = useState<LoadState>(isLive ? 'loading' : 'success');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CardStatus>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | CardVisibility>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | CardActivityKind>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeDrawer = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    if (!isLive) {
      setLiveData(null);
      setLoadState('success');
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setLoadError(null);
    loadLiveCards()
      .then((data) => {
        if (cancelled) return;
        setLiveData(data);
        setLoadState('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadState('error');
        setLoadError(err instanceof Error ? err.message : 'Business cards could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [isLive, syncToken]);

  const cards = useMemo<AdminCard[]>(
    () => (isLive ? (liveData ? buildLiveCards(liveData, companies) : []) : DEMO_CARDS),
    [isLive, liveData, companies],
  );
  const activity = useMemo<CardActivity[]>(
    () => (isLive ? (liveData ? buildLiveActivity(liveData, cards) : []) : [...DEMO_ACTIVITY].sort((a, b) => b.at.localeCompare(a.at))),
    [isLive, liveData, cards],
  );
  const allReports = useMemo<CardReport[]>(
    () => (isLive ? (liveData?.reports ?? []).map(toReport) : DEMO_CARDS.flatMap((c) => c.reports)),
    [isLive, liveData],
  );
  const reportsReadable = !isLive || (liveData !== null && liveData.reports !== null);
  const source = isLive ? 'live' : 'demo';
  const isInitialLoad = loadState === 'loading' && cards.length === 0;
  const selectedCard = selectedId ? cards.find((c) => c.userId === selectedId) ?? null : null;
  const cardById = useMemo(() => new Map(cards.map((c) => [c.userId, c])), [cards]);

  const counts = useMemo(() => {
    const engagementTotal = (key: 'qrScans' | 'views') => (isLive ? null : cards.reduce((sum, c) => sum + (c.engagement?.[key] ?? 0), 0));
    const reportedIds = new Set(allReports.filter((r) => r.status === 'open').map((r) => r.cardId));
    return {
      total: cards.length,
      active: isLive ? null : cards.filter((c) => c.status === 'active').length,
      inactive: isLive ? null : cards.filter((c) => c.status === 'inactive' || c.status === 'suspended').length,
      qrScans: engagementTotal('qrScans'),
      views: engagementTotal('views'),
      reported: reportsReadable ? reportedIds.size : null,
    };
  }, [cards, allReports, isLive, reportsReadable]);

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cards) if (c.companyId && c.companyName) map.set(c.companyId, c.companyName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [cards]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return cards.filter((c) => {
      if (companyFilter === 'none' ? c.companyId !== null : companyFilter !== 'all' && c.companyId !== companyFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (visibilityFilter !== 'all' && visibilityOf(c) !== visibilityFilter) return false;
      if (!query) return true;
      return [c.displayName, c.title, c.companyName, c.companyLabel, c.sokoId, c.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    });
  }, [cards, companyFilter, statusFilter, visibilityFilter, searchQuery]);

  const hasActiveFilters = companyFilter !== 'all' || statusFilter !== 'all' || visibilityFilter !== 'all' || searchQuery.trim() !== '';
  const resetFilters = () => {
    setCompanyFilter('all');
    setStatusFilter('all');
    setVisibilityFilter('all');
    setSearchQuery('');
  };

  const kpis: { id: string; label: string; value: number | null; icon: LucideIcon; tone: string; note?: string; onClick?: () => void }[] = [
    { id: 'total', label: 'Total Cards', value: counts.total, icon: Contact, tone: 'bg-blue-50 text-blue-700', note: isLive ? 'Visible to your session under RLS' : undefined, onClick: () => { resetFilters(); setTab('directory'); } },
    { id: 'active', label: 'Active Cards', value: counts.active, icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700', note: isLive ? 'Card status is not modelled' : undefined, onClick: isLive ? undefined : () => { resetFilters(); setStatusFilter('active'); setTab('directory'); } },
    { id: 'inactive', label: 'Inactive Cards', value: counts.inactive, icon: CircleSlash, tone: 'bg-slate-100 text-slate-600', note: isLive ? 'Card status is not modelled' : 'Inactive or suspended' },
    { id: 'scans', label: 'QR Scans', value: counts.qrScans, icon: QrCode, tone: 'bg-sky-50 text-sky-700', note: isLive ? 'No scan tracking source' : undefined },
    { id: 'views', label: 'Profile Views', value: counts.views, icon: Eye, tone: 'bg-indigo-50 text-indigo-700', note: isLive ? 'No view tracking source' : undefined },
    { id: 'reported', label: 'Reported Cards', value: counts.reported, icon: Flag, tone: 'bg-amber-50 text-amber-700', note: reportsReadable ? 'With at least one open report' : 'Reports could not be read', onClick: () => setTab('governance') },
  ];

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'directory', label: 'Card Directory', icon: List },
    { id: 'engagement', label: 'Sharing & Engagement', icon: BarChart3 },
    { id: 'governance', label: 'Card Governance', icon: ShieldCheck },
    { id: 'activity', label: 'Activity History', icon: History },
  ];

  const emptyDirectoryMessage =
    loadState === 'error' && cards.length === 0
      ? 'Business cards could not be loaded. Use Sync to try again.'
      : cards.length === 0
      ? isLive
        ? 'No business cards are visible to your admin session.'
        : 'No digital business cards have been issued yet.'
      : 'No cards match the current filters.';

  const filteredActivity = activityFilter === 'all' ? activity : activity.filter((e) => e.kind === activityFilter);
  const openQueue = allReports.filter((r) => r.status === 'open');
  const closedReports = allReports.filter((r) => r.status !== 'open');

  const engagementTotals = isLive
    ? null
    : cards.reduce(
        (acc, c) => ({
          qrScans: acc.qrScans + (c.engagement?.qrScans ?? 0),
          views: acc.views + (c.engagement?.views ?? 0),
          shares: acc.shares + (c.engagement?.shares ?? 0),
          contactSaves: acc.contactSaves + (c.engagement?.contactSaves ?? 0),
        }),
        { qrScans: 0, views: 0, shares: 0, contactSaves: 0 },
      );
  const trendMax = Math.max(1, ...DEMO_TREND.map((p) => p.views));
  const topCards = isLive ? [] : [...cards].sort((a, b) => (b.engagement?.views ?? 0) - (a.engagement?.views ?? 0)).slice(0, 5);

  const renderReport = (r: CardReport) => {
    const card = cardById.get(r.cardId);
    return (
      <li key={r.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <CardAvatar name={card?.displayName ?? '?'} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              {card ? (
                <button type="button" onClick={() => setSelectedId(card.userId)} className="text-xs font-semibold text-slate-900 hover:text-blue-700 hover:underline cursor-pointer">
                  {card.displayName}
                </button>
              ) : (
                <span className="text-xs font-semibold text-slate-500">Card not visible to your session</span>
              )}
              <ReportStatusBadge status={r.status} />
              <span className="text-[11px] text-slate-400">Filed {formatDate(r.createdAt)}</span>
            </span>
            <p className="text-xs leading-relaxed text-slate-700 text-pretty">{r.reason}</p>
            {r.resolution && <p className="text-[11px] text-slate-500">Resolution: {r.resolution}</p>}
          </div>
        </div>
        {r.status === 'open' && (
          <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
            <LockedButton icon={ShieldQuestion} label="Investigate" />
            <LockedButton icon={X} label="Dismiss" />
            <LockedButton icon={Ban} label="Suspend" tone="danger" />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Contact className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
              Digital business cards <SourceTag source={source} />
            </span>
            <span className="text-sm font-bold text-slate-900">
              {isInitialLoad ? DASH : counts.total.toLocaleString()} {counts.total === 1 ? 'card' : 'cards'} {isLive ? 'visible' : 'issued'} across{' '}
              {companyOptions.length.toLocaleString()} {companyOptions.length === 1 ? 'company' : 'companies'}
            </span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 sm:max-w-sm sm:text-right text-pretty">
          {isLive
            ? 'Cards are read under your admin session. RLS has no admin override, so only public, connected and same-company cards appear.'
            : 'Sign in as a platform administrator to load staging cards. Demo cards are shown for design review.'}
        </p>
      </div>

      {loadState === 'error' && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="leading-relaxed">
            <strong className="font-semibold">Business cards are unavailable.</strong> {loadError}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const unavailable = kpi.value === null;
          const content = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {unavailable && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Unavailable
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={`font-mono text-2xl font-bold leading-none ${unavailable ? 'text-slate-300' : 'text-slate-900'}`}>
                  {unavailable || isInitialLoad ? DASH : kpi.value!.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                {kpi.note && <span className="text-[11px] leading-snug text-slate-400">{kpi.note}</span>}
              </span>
            </>
          );
          if (unavailable || !kpi.onClick) {
            return (
              <div key={kpi.id} className={`flex flex-col gap-3 rounded-xl border p-4 ${unavailable ? 'border-dashed border-slate-200 bg-slate-50/60' : 'border-slate-200 bg-white'}`}>
                {content}
              </div>
            );
          }
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={kpi.onClick}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              {content}
            </button>
          );
        })}
      </div>

      <div role="tablist" aria-label="Digital business card views" className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`cards-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`cards-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`cards-panel-${tab}`} aria-labelledby={`cards-tab-${tab}`}>
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SectionCard title="Recent card activity" description="Latest updates, sharing events and administrator decisions." source={<SourceTag source={source} />}>
                {isInitialLoad ? (
                  <div className="h-40 animate-pulse rounded-lg bg-slate-100" aria-busy="true" aria-label="Loading activity" />
                ) : activity.length === 0 ? (
                  <EmptyState icon={History} title="No card activity recorded" body={isLive ? 'Activity appears here as cards are updated or reported.' : undefined} />
                ) : (
                  <>
                    <ActivityTimeline events={activity.slice(0, 6)} onOpenCard={(id) => cardById.has(id) && setSelectedId(id)} compact />
                    <button type="button" onClick={() => setTab('activity')} className="inline-flex items-center gap-1 self-start text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                      View full history
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </>
                )}
              </SectionCard>
            </div>
            <div className="flex flex-col gap-4 lg:col-span-2">
              <SectionCard title="Visibility mix" source={<SourceTag source={source} />}>
                {cards.length === 0 ? (
                  <p className="text-xs text-slate-500">{isInitialLoad ? 'Loading\u2026' : 'No cards to summarise.'}</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {(['public', 'network'] as CardVisibility[]).map((v) => {
                      const n = cards.filter((c) => visibilityOf(c) === v).length;
                      return (
                        <li key={v} className="flex flex-col gap-1">
                          <span className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-600">{VISIBILITY_LABELS[v]}</span>
                            <span className="font-mono font-bold text-slate-900">{n}</span>
                          </span>
                          <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <span className={`block h-full rounded-full ${v === 'public' ? 'bg-blue-600' : 'bg-slate-400'}`} style={{ width: `${(n / cards.length) * 100}%` }} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>
              <SectionCard title="Needs attention" source={reportsReadable ? <SourceTag source={source} /> : undefined}>
                {!reportsReadable ? (
                  <Unavailable reason="Content reports could not be read for this session." label="Reports unavailable" />
                ) : openQueue.length === 0 ? (
                  <p className="text-xs text-slate-500">No open reports on business cards.</p>
                ) : (
                  <button type="button" onClick={() => setTab('governance')} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left cursor-pointer hover:bg-amber-100/60">
                    <span className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                      <Flag className="h-4 w-4" aria-hidden="true" />
                      {openQueue.length} open {openQueue.length === 1 ? 'report' : 'reports'} awaiting review
                    </span>
                    <ChevronRight className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  </button>
                )}
              </SectionCard>
            </div>
          </div>
        )}

        {tab === 'directory' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative lg:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <label className="sr-only" htmlFor="cards-search">
                  Search cards
                </label>
                <input
                  id="cards-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search owner, designation, company or SOKO ID"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <FilterSelect id="cards-company-filter" label="Filter by company" value={companyFilter} onChange={setCompanyFilter}>
                  <option value="all">All companies</option>
                  {companyOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                  <option value="none">No linked company</option>
                </FilterSelect>
                <FilterSelect id="cards-status-filter" label="Filter by card status" value={statusFilter} onChange={(v) => setStatusFilter(v as 'all' | CardStatus)}>
                  <option value="all">All statuses</option>
                  {!isLive &&
                    (Object.keys(CARD_STATUS_LABELS) as CardStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {CARD_STATUS_LABELS[s]}
                      </option>
                    ))}
                </FilterSelect>
                <FilterSelect id="cards-visibility-filter" label="Filter by visibility" value={visibilityFilter} onChange={(v) => setVisibilityFilter(v as 'all' | CardVisibility)}>
                  <option value="all">All visibility</option>
                  <option value="public">Public</option>
                  <option value="network">Network only</option>
                </FilterSelect>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-900">{filtered.length}</strong> of {cards.length} {cards.length === 1 ? 'card' : 'cards'}
              </span>
              {hasActiveFilters && (
                <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>

            {isInitialLoad ? (
              <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading cards">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Contact} title={emptyDirectoryMessage} />
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-3 py-3">Card Owner</th>
                        <th scope="col" className="px-2.5 py-3">Company</th>
                        <th scope="col" className="hidden px-2.5 py-3 xl:table-cell">Designation</th>
                        <th scope="col" className="px-2.5 py-3">SOKO ID</th>
                        <th scope="col" className="px-2.5 py-3">Card Status</th>
                        <th scope="col" className="px-2.5 py-3">Visibility</th>
                        <th scope="col" className="px-2.5 py-3">Last Updated</th>
                        <th scope="col" className="px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((card) => {
                        const reports = openReportsOf(card);
                        return (
                          <tr key={card.userId} className="transition-colors hover:bg-slate-50">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <CardAvatar name={card.displayName} />
                                <span className="flex min-w-0 flex-col">
                                  <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                                    {card.displayName}
                                    {reports > 0 && <Flag className="h-3 w-3 text-amber-600" aria-label={`${reports} open reports`} />}
                                  </span>
                                  <span className="truncate text-[11px] text-slate-500 xl:hidden">{card.title || DASH}</span>
                                  <span className="hidden truncate text-[11px] text-slate-500 xl:inline">{card.email || DASH}</span>
                                </span>
                              </div>
                            </td>
                            <td className="px-2.5 py-3">
                              {card.companyName ? (
                                <span className="font-medium text-slate-900">{card.companyName}</span>
                              ) : (
                                <span className="text-slate-500">{card.companyLabel ? `${card.companyLabel} (unlinked)` : DASH}</span>
                              )}
                            </td>
                            <td className="hidden px-2.5 py-3 text-slate-600 xl:table-cell">{card.title || DASH}</td>
                            <td className="whitespace-nowrap px-2.5 py-3 font-mono text-[11px] text-slate-600">{card.sokoId || DASH}</td>
                            <td className="px-2.5 py-3">{card.status ? <CardStatusBadge status={card.status} /> : <Unavailable reason={STATUS_UNAVAILABLE} />}</td>
                            <td className="px-2.5 py-3">
                              <VisibilityBadge visibility={visibilityOf(card)} />
                            </td>
                            <td className="whitespace-nowrap px-2.5 py-3 text-slate-600">{formatDate(card.updatedAt)}</td>
                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedId(card.userId)}
                                aria-label={`View card for ${card.displayName}`}
                                className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-700 cursor-pointer"
                              >
                                View card
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="flex flex-col gap-2 md:hidden">
                  {filtered.map((card) => (
                    <li key={card.userId}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(card.userId)}
                        aria-label={`View card for ${card.displayName}`}
                        className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-3">
                          <CardAvatar name={card.displayName} />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-semibold text-slate-900">{card.displayName}</span>
                            <span className="truncate text-[11px] text-slate-500">
                              {card.title || DASH} {'\u2022'} {card.companyName || card.companyLabel || DASH}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          {card.status ? <CardStatusBadge status={card.status} /> : <Unavailable label="Status unavailable" reason={STATUS_UNAVAILABLE} />}
                          <VisibilityBadge visibility={visibilityOf(card)} />
                          <span className="font-mono text-[10px] text-slate-500">{card.sokoId || DASH}</span>
                          <span className="ml-auto text-[11px] text-slate-400">{formatDate(card.updatedAt)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {tab === 'engagement' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'QR scans', icon: QrCode, value: engagementTotals?.qrScans ?? null },
                { label: 'Profile views', icon: Eye, value: engagementTotals?.views ?? null },
                { label: 'Card shares', icon: Share2, value: engagementTotals?.shares ?? null },
                { label: 'Contact saves', icon: Save, value: engagementTotals?.contactSaves ?? null },
              ].map(({ label, icon: Icon, value }) => (
                <div key={label} className={`flex flex-col gap-2 rounded-xl border p-4 ${value === null ? 'border-dashed border-slate-200 bg-slate-50/60' : 'border-slate-200 bg-white'}`}>
                  <span className="flex items-center justify-between">
                    <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    {value === null ? <Unavailable reason={ENGAGEMENT_UNAVAILABLE} /> : <SourceTag source="demo" />}
                  </span>
                  <span className={`font-mono text-2xl font-bold leading-none ${value === null ? 'text-slate-300' : 'text-slate-900'}`}>
                    {value === null ? DASH : value.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{label}</span>
                </div>
              ))}
            </div>

            {isLive ? (
              <SectionCard title="Engagement trends" description="Weekly scans, views and shares across all cards.">
                <EmptyState icon={BarChart3} title="Engagement tracking is not connected" body={`${ENGAGEMENT_UNAVAILABLE} No values are estimated or simulated in live mode.`} />
              </SectionCard>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <SectionCard title="Engagement trends" description="Weekly profile views, with QR scans and shares, over the last eight weeks." source={<SourceTag source="demo" />}>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-blue-600" aria-hidden="true" />Views</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-sky-300" aria-hidden="true" />QR scans</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-slate-900" aria-hidden="true" />Shares</span>
                    </div>
                    <div className="flex h-48 items-end gap-2 sm:gap-3" role="img" aria-label="Bar chart of weekly card engagement in demo data">
                      {DEMO_TREND.map((p) => (
                        <div key={p.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                          <div className="flex h-full w-full items-end justify-center gap-0.5">
                            <span className="w-1/3 rounded-t bg-blue-600" style={{ height: `${(p.views / trendMax) * 100}%` }} title={`${p.views} views`} />
                            <span className="w-1/3 rounded-t bg-sky-300" style={{ height: `${(p.scans / trendMax) * 100}%` }} title={`${p.scans} scans`} />
                            <span className="w-1/3 rounded-t bg-slate-900" style={{ height: `${(p.shares / trendMax) * 100}%` }} title={`${p.shares} shares`} />
                          </div>
                          <span className="text-[10px] font-medium text-slate-400">{p.label}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
                <div className="lg:col-span-2">
                  <SectionCard title="Most viewed cards" source={<SourceTag source="demo" />}>
                    <ol className="flex flex-col gap-2">
                      {topCards.map((c, i) => (
                        <li key={c.userId}>
                          <button type="button" onClick={() => setSelectedId(c.userId)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50 cursor-pointer">
                            <span className="w-4 font-mono text-[11px] font-bold text-slate-400">{i + 1}</span>
                            <CardAvatar name={c.displayName} />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-xs font-semibold text-slate-900">{c.displayName}</span>
                              <span className="truncate text-[11px] text-slate-500">{c.companyName}</span>
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-900">{(c.engagement?.views ?? 0).toLocaleString()}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </SectionCard>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'governance' && (
          <div className="flex flex-col gap-4">
            <SectionCard
              title="Reported card review"
              description="Reports filed by network members against business cards."
              source={reportsReadable ? <SourceTag source={source} /> : undefined}
            >
              {isLive && loadState === 'loading' && !liveData ? (
                <div className="h-24 animate-pulse rounded-lg bg-slate-100" aria-busy="true" aria-label="Loading reports" />
              ) : !reportsReadable ? (
                <EmptyState icon={Flag} title="Reports are unavailable" body="Content reports could not be read for this session." />
              ) : openQueue.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No open reports" body="Business card reports appear here when network members flag a card." />
              ) : (
                <ul className="flex flex-col gap-2">{openQueue.map(renderReport)}</ul>
              )}
              {reportsReadable && closedReports.length > 0 && (
                <details className="group rounded-lg border border-slate-200">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
                    Resolved reports ({closedReports.length})
                  </summary>
                  <ul className="flex flex-col gap-2 border-t border-slate-200 p-3">{closedReports.map(renderReport)}</ul>
                </details>
              )}
            </SectionCard>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard title="Impersonation investigation" description="Structured review when a card may misrepresent a person or company." source={<SourceTag source="ui_only" />}>
                <ol className="flex flex-col gap-2">
                  {[
                    'Compare the card company label with the owner\u2019s verified company membership',
                    'Check the card email domain against the company\u2019s registered domain',
                    'Request identity evidence from the card owner',
                    'Contact the impersonated person or company admin to confirm',
                    'Record the finding and decision in the audit trail',
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[10px] font-bold text-slate-600">{i + 1}</span>
                      <span className="text-xs leading-relaxed text-slate-700">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-1.5">
                  <LockedButton icon={ShieldQuestion} label="Open investigation" />
                  <LockedButton icon={Lock} label="Request evidence" />
                </div>
              </SectionCard>

              <div className="flex flex-col gap-4">
                <SectionCard title="Visibility controls" description="Platform-level overrides for card visibility." source={<SourceTag source="ui_only" />}>
                  <ul className="flex flex-col gap-2">
                    {[
                      { label: 'Hide reported cards from public search while under review', on: true },
                      { label: 'Require verified company membership for public cards', on: false },
                      { label: 'Allow cards to be shared outside the SOKO network', on: true },
                    ].map((row) => (
                      <li key={row.label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                        <span className="text-xs text-slate-700">{row.label}</span>
                        <span
                          role="switch"
                          aria-checked={row.on}
                          aria-disabled="true"
                          aria-label={row.label}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-not-allowed items-center rounded-full opacity-50 ${row.on ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${row.on ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-400">Illustrative settings. No policy is stored or enforced.</p>
                </SectionCard>

                <SectionCard title="Suspension & restoration" description="Lifecycle for removing and reinstating a card." source={<SourceTag source="ui_only" />}>
                  <ol className="flex flex-col gap-2 text-xs">
                    {[
                      { icon: Flag, label: 'Reported', body: 'A member files a report.' },
                      { icon: EyeOff, label: 'Under review', body: 'Card hidden from public search.' },
                      { icon: Ban, label: 'Suspended', body: 'Card hidden network-wide; owner notified.' },
                      { icon: RotateCcw, label: 'Restored', body: 'Issue resolved and card reinstated.' },
                    ].map(({ icon: Icon, label, body }) => (
                      <li key={label} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="font-semibold text-slate-900">{label}</span>
                        <span className="text-slate-500">{body}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap gap-1.5">
                    <LockedButton icon={Ban} label="Suspend card" tone="danger" />
                    <LockedButton icon={RotateCcw} label="Restore card" />
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <SectionCard
            title="Activity history"
            description={isLive ? 'Built from card update times and report records. Individual edit and share events are not logged.' : 'Card updates, sharing events and administrator decisions.'}
            source={<SourceTag source={source} />}
          >
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter activity by type">
              {(['all', 'update', 'share', 'report', 'decision', 'created'] as const).map((k) => {
                const isActive = activityFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActivityFilter(k)}
                    aria-pressed={isActive}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      isActive ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {k === 'all' ? 'All events' : ACTIVITY_META[k].label}
                  </button>
                );
              })}
            </div>
            {isInitialLoad ? (
              <div className="h-40 animate-pulse rounded-lg bg-slate-100" aria-busy="true" aria-label="Loading activity" />
            ) : filteredActivity.length === 0 ? (
              <EmptyState
                icon={History}
                title={activity.length === 0 ? 'No card activity recorded' : 'No events of this type'}
                body={isLive && (activityFilter === 'share' || activityFilter === 'created') ? 'This event type is not recorded by any live source.' : undefined}
              />
            ) : (
              <ActivityTimeline events={filteredActivity} onOpenCard={(id) => cardById.has(id) && setSelectedId(id)} />
            )}
          </SectionCard>
        )}
      </div>

      {selectedCard && <DigitalCardDrawer card={selectedCard} isLive={isLive} onClose={closeDrawer} />}
    </div>
  );
};
