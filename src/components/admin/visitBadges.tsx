import React from 'react';
import { Lock } from 'lucide-react';
import { type VisitStatus, VISIT_STATUS_CLASSES, VISIT_STATUS_LABELS } from './visitShared';

export const VisitStatusBadge: React.FC<{ status: VisitStatus }> = ({ status }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${VISIT_STATUS_CLASSES[status]}`}>
    {VISIT_STATUS_LABELS[status]}
  </span>
);

export const UiOnlyTag: React.FC = () => (
  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
    <Lock className="h-2.5 w-2.5" aria-hidden="true" />
    UI only
  </span>
);

export const RestrictedNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600 text-pretty">
    <Lock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
    <span>{children}</span>
  </p>
);
