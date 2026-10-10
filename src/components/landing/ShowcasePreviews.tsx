import React from 'react';
import { BadgeCheck, Building2, CalendarCheck, FileText, Lightbulb, Package, QrCode, Search, Share2, ShieldCheck, Store } from 'lucide-react';
import type { SolutionId } from './solutions';

const Panel: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, children, className = '' }) => (
  <div className={`rounded-xl border border-soko-line bg-white p-3.5 ${className}`}>
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-soko-muted">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {title}
    </p>
    <div className="mt-2.5">{children}</div>
  </div>
);

const Initials: React.FC<{ text: string; dark?: boolean }> = ({ text, dark }) => (
  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${dark ? 'bg-soko-ink text-white' : 'bg-soko-mist text-soko-ink'}`}>
    {text}
  </span>
);

const Chip: React.FC<{ children: React.ReactNode; tone?: 'blue' | 'ink' | 'line' }> = ({ children, tone = 'line' }) => {
  const tones = {
    blue: 'bg-soko-blue text-white',
    ink: 'bg-soko-ink text-white',
    line: 'border border-soko-line text-soko-muted',
  };
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>{children}</span>;
};

const ProfessionalsPreview: React.FC = () => (
  <div className="grid gap-3 sm:grid-cols-[1.1fr_1fr]">
    <div className="flex flex-col justify-between rounded-xl bg-soko-ink p-4 text-white sm:row-span-2">
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-bold">LH</span>
        <QrCode className="h-9 w-9 text-white/70" aria-hidden="true" />
      </div>
      <div className="mt-6">
        <p className="font-[Outfit] text-lg font-semibold">Layla H.</p>
        <p className="text-sm text-white/70">Procurement Lead · Example Contracting</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold">Registered on SOKO</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Share card
          </span>
        </div>
      </div>
    </div>
    <Panel title="Saved contacts" icon={BadgeCheck}>
      <ul className="flex flex-col gap-2">
        {[['OK', 'Omar K.', 'Sample Supplies Co.'], ['PR', 'Priya R.', 'Example Consultants']].map(([i, n, c]) => (
          <li key={n} className="flex items-center gap-2">
            <Initials text={i} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-soko-ink">{n}</span>
              <span className="block truncate text-[11px] text-soko-muted">{c}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
    <Panel title="Product discovery" icon={Search}>
      <div className="flex items-center gap-2 rounded-lg bg-soko-mist px-2.5 py-2 text-[11px] text-soko-muted">
        <Search className="h-3.5 w-3.5" aria-hidden="true" /> Waterproofing membrane
      </div>
      <p className="mt-2 truncate text-xs font-semibold text-soko-ink">3 sample suppliers listed</p>
    </Panel>
  </div>
);

const SuppliersPreview: React.FC = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-3 rounded-xl border border-soko-line bg-white p-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-soko-ink text-white">
        <Store className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-[Outfit] text-base font-semibold text-soko-ink">Sample Supplies Co.</p>
        <p className="truncate text-xs text-soko-muted">Building materials · Dubai</p>
      </div>
      <Chip>Registered on SOKO</Chip>
    </div>
    <Panel title="Product listings" icon={Package}>
      <ul className="grid grid-cols-3 gap-2">
        {['Steel rebar', 'Ready-mix', 'Block work'].map((p) => (
          <li key={p} className="rounded-lg bg-soko-mist p-2">
            <span className="flex h-8 items-center justify-center rounded-md bg-white text-soko-muted">
              <Package className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="mt-1.5 block truncate text-[11px] font-semibold text-soko-ink">{p}</span>
          </li>
        ))}
      </ul>
    </Panel>
    <div className="grid gap-3 sm:grid-cols-2">
      <Panel title="Supplier visits" icon={CalendarCheck}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-soko-ink">Example Contracting</span>
          <Chip tone="blue">Requested</Chip>
        </div>
      </Panel>
      <Panel title="Market Hub" icon={Store}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-soko-ink">Company listed</span>
          <Chip>Discoverable</Chip>
        </div>
      </Panel>
    </div>
  </div>
);

const ContractorsPreview: React.FC = () => (
  <div className="flex flex-col gap-3">
    <Panel title="Vendor directory" icon={Building2}>
      <ul className="flex flex-col divide-y divide-soko-line">
        {[
          ['SS', 'Sample Supplies Co.', 'Building materials', <Chip key="a" tone="ink">Approved vendor</Chip>],
          ['EM', 'Example MEP Trading', 'MEP', <Chip key="b" tone="blue">SOKO Verified</Chip>],
          ['DF', 'Demo Facades LLC', 'Facades', <Chip key="c">Under review</Chip>],
        ].map(([i, n, c, chip]) => (
          <li key={n as string} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
            <Initials text={i as string} dark />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-soko-ink">{n}</span>
              <span className="block truncate text-[11px] text-soko-muted">{c}</span>
            </span>
            {chip}
          </li>
        ))}
      </ul>
    </Panel>
    <div className="grid gap-3 sm:grid-cols-2">
      <Panel title="Documents" icon={FileText}>
        <ul className="flex flex-col gap-1.5 text-[11px]">
          <li className="flex items-center justify-between gap-2"><span className="text-soko-ink">Trade licence</span><ShieldCheck className="h-3.5 w-3.5 text-soko-blue" aria-label="On file" /></li>
          <li className="flex items-center justify-between gap-2"><span className="text-soko-ink">Insurance</span><Chip>Renewal due</Chip></li>
        </ul>
      </Panel>
      <Panel title="Supplier intelligence" icon={Lightbulb}>
        <p className="text-xs font-semibold leading-relaxed text-soko-ink">1 vendor has a document due for renewal.</p>
      </Panel>
    </div>
  </div>
);

export const SHOWCASE_PREVIEWS: Record<SolutionId, React.FC> = {
  professionals: ProfessionalsPreview,
  suppliers: SuppliersPreview,
  contractors: ContractorsPreview,
};
