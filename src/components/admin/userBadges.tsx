import React from 'react';
import { Lock } from 'lucide-react';
import { type DataSource, type UserStatus, MEMBERSHIP_STATUS_CLASSES, MEMBERSHIP_STATUS_LABELS, userInitials } from './userShared';

export const UserAvatar: React.FC<{ name: string; size?: 'sm' | 'lg'; highlight?: boolean }> = ({ name, size = 'sm', highlight }) => (
  <span
    aria-hidden="true"
    className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
      size === 'lg' ? 'h-14 w-14 text-base' : 'h-9 w-9 text-xs'
    } ${highlight ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-700'}`}
  >
    {userInitials(name)}
  </span>
);

export const UserStatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${MEMBERSHIP_STATUS_CLASSES[status]}`}>
    {MEMBERSHIP_STATUS_LABELS[status]}
  </span>
);

const SOURCE_STYLES: Record<DataSource | 'ui_only', { label: string; className: string }> = {
  live: { label: 'Live data', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  reference: { label: 'Reference copy', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  demo: { label: 'Demo data', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  ui_only: { label: 'UI only', className: 'border-dashed border-slate-300 bg-white text-slate-500' },
};

export const SourceTag: React.FC<{ source: DataSource | 'ui_only' }> = ({ source }) => {
  const style = SOURCE_STYLES[source];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.className}`}>
      {source === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
      {style.label}
    </span>
  );
};

export const Unavailable: React.FC<{ reason: string; label?: string }> = ({ reason, label = 'Unavailable' }) => (
  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400" title={reason}>
    <Lock className="h-3 w-3" aria-hidden="true" />
    {label}
    <span className="sr-only">: {reason}</span>
  </span>
);
